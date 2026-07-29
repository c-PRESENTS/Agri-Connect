import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./runtime/static";
import { createServer } from "http";
import { setupAuth, registerAuthRoutes } from "./auth";
import { registerOtpRoutes } from "./otp/routes";
import { paymentRuntimeConfig } from "./payments/config";
import { capabilityMonitor } from "./payments/capability-monitor";
import { providerActivationService } from "./payments/provider-activation-service";
import { paymentMaintenanceService } from "./payments/maintenance-service";
import { registerCurrencyRoutes } from "./currency/routes";

const app = express();
const httpServer = createServer(app);

// PostgreSQL bigint monetary columns are represented as native BigInt values
// by Drizzle. JSON has no BigInt primitive, so expose them as lossless decimal
// strings across every API response instead of allowing res.json() to crash.
app.set("json replacer", (_key: string, value: unknown) =>
  typeof value === "bigint" ? value.toString() : value,
);

void paymentRuntimeConfig;
capabilityMonitor.start(paymentRuntimeConfig.reconciliationIntervalMinutes);
providerActivationService.start(paymentRuntimeConfig.providerReviewIntervalMinutes);
paymentMaintenanceService.start(paymentRuntimeConfig.maintenanceIntervalHours);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

const isProd = process.env.NODE_ENV === "production";
// Disabled by default so local feature work is unaffected. Enable explicitly
// in staging/production after choosing limits appropriate to deployed traffic.
const enableApiRateLimit = process.env.ENABLE_API_RATE_LIMIT === "true";
const apiRateLimitWindowMs = Number(process.env.API_RATE_LIMIT_WINDOW_MS ?? (isProd ? 15 * 60 * 1000 : 60 * 1000));
const apiRateLimitMax = Number(process.env.API_RATE_LIMIT_MAX ?? (isProd ? 100 : 5000));

app.use(helmet({
  // Google and payment-provider popup SDKs communicate with their opener by
  // postMessage. Apply the popup-compatible policy consistently in development
  // and production so localhost does not inherit the browser's stricter
  // same-origin opener behavior.
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  // In development Vite injects inline scripts for HMR and React Fast Refresh.
  // Those are blocked by a strict CSP, which breaks the dev experience.
  // The built production output has no inline scripts, so the policy is safe
  // to enforce only in production.
  contentSecurityPolicy: isProd
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "https://accounts.google.com",
            "https://apis.google.com",
            "https://js.stripe.com",
            "https://www.paypal.com",
            "https://www.paypalobjects.com",
            "https://checkout.razorpay.com",
          ],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: [
            "'self'",
            "https://api.sendgrid.com",
            "https://rest.nexmo.com",
            "https://accounts.google.com",
            "https://api.stripe.com",
            "https://checkout.stripe.com",
            "https://www.paypal.com",
            "https://api-m.paypal.com",
            "https://api-m.sandbox.paypal.com",
            "https://api.razorpay.com",
          ],
          frameSrc: [
            "https://accounts.google.com",
            "https://js.stripe.com",
            "https://checkout.stripe.com",
            "https://www.paypal.com",
            "https://checkout.razorpay.com",
            "https://api.razorpay.com",
          ],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      }
    : false,
}));

const apiLimiter = rateLimit({
  windowMs: apiRateLimitWindowMs,
  max: apiRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Try again later." },
});

const paymentLimiter = rateLimit({
  windowMs: Number(process.env.PAYMENT_RATE_LIMIT_WINDOW_MS ?? 60_000),
  max: Number(process.env.PAYMENT_RATE_LIMIT_MAX ?? (isProd ? 60 : 1000)),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many payment requests. Please try again shortly." },
});

const paymentWebhookLimiter = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.PAYMENT_WEBHOOK_RATE_LIMIT_MAX ?? 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Webhook request rate exceeded" },
});

if (enableApiRateLimit) {
  // Authentication and OTP routes intentionally remain outside this optional
  // foundation; their existing protections are owned by the frozen auth area.
  app.use([
    "/api/products",
    "/api/categories",
    "/api/farmers",
    "/api/search",
    "/api/support",
    "/api/cart",
    "/api/orders",
    "/api/dashboard",
    "/api/logistics",
  ], apiLimiter);
}

if (isProd || process.env.PAYMENT_RATE_LIMIT_ENABLED === "true") {
  app.use("/api/payments", paymentLimiter);
}

app.all(
  ["/api/stripe/webhook", "/api/paypal/webhook", "/api/razorpay/webhook"],
  (_req, res) =>
    res.status(410).json({
      error: "Legacy payment webhook URL is retired; use /api/webhooks/payments/:provider",
    }),
);
app.post(
  [
    "/api/stripe/create-checkout-session",
    "/api/paypal/orders/:orderId",
    "/api/paypal/orders/:paypalOrderId/capture",
    "/api/razorpay/orders/:orderId",
    "/api/razorpay/verify",
  ],
  (_req, res) =>
    res.status(410).json({
      error: "Legacy payment creation is retired; use the protected checkout flow",
    }),
);

app.use(
  "/api/webhooks/payments/:provider",
  paymentWebhookLimiter,
  (req, res, next) => {
    const limits: Record<string, string> = {
      stripe: "512kb",
      paypal: "512kb",
      razorpay: "256kb",
      mock: "64kb",
    };
    const limit = limits[req.params.provider];
    if (!limit) return res.status(404).json({ error: "Unknown payment provider" });
    if (!req.is("application/json")) {
      return res.status(415).json({ error: "Payment webhooks require application/json" });
    }
    return express.raw({ type: "application/json", limit })(req, res, (error) => {
      if (error) return next(error);
      req.rawBody = req.body;
      next();
    });
  },
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Responses can contain addresses, support messages, and other personal
      // data. Keep request logs operational rather than recording payloads.
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  // Auth must be set up before routes are registered.
  await setupAuth(app);
  registerAuthRoutes(app);
  registerOtpRoutes(app);
  registerCurrencyRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/config", (_req, res) => {
    res.json({
      googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    });
  });

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const validationError = err?.name === "ZodError";
    const status = validationError ? 400 : Number(err?.status || err?.statusCode || 500);
    const message =
      validationError
        ? "Request validation failed"
        : status >= 500
          ? "Internal Server Error"
          : (err?.message || "Request failed");
    console.error("[api] request failed", {
      status,
      errorCode: typeof err?.code === "string" ? err.code : err?.name ?? "unknown_error",
    });
    if (!res.headersSent) res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./runtime/vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      ...(process.platform === "win32" ? {} : { reusePort: true }),
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
