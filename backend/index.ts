import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./runtime/static";
import { createServer } from "http";
import { setupAuth, registerAuthRoutes } from "./auth";
import { registerOtpRoutes } from "./otp/routes";

const app = express();
const httpServer = createServer(app);

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
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  // In development Vite injects inline scripts for HMR and React Fast Refresh.
  // Those are blocked by a strict CSP, which breaks the dev experience.
  // The built production output has no inline scripts, so the policy is safe
  // to enforce only in production.
  contentSecurityPolicy: isProd
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "https://accounts.google.com", "https://apis.google.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "https://api.sendgrid.com", "https://rest.nexmo.com", "https://accounts.google.com"],
          frameSrc: ["https://accounts.google.com"],
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
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
