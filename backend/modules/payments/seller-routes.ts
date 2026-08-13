import type { Express, Request } from "express";
import { z } from "zod";
import { isAuthenticated } from "../../auth";
import { authStorage } from "../../auth/storage";
import { paymentProviderSchema } from "../../payments/config";
import { sellerAccountService } from "../../payments/seller-account-service";
import { paymentOperationsRepository } from "../../repositories/payment-operations-repository";
import { marketplaceSellerVerified } from "../../seller-verification/capabilities";

interface SellerPaymentRouteDeps {
  getUserId(req: Request): string | undefined;
}

const onboardingSchema = z.object({
  country: z.string().length(2).transform((value) => value.toUpperCase()),
});
const cashPreferenceSchema = z.object({
  acceptsCashAtPickup: z.boolean(),
  acceptsCashOnFarmerDelivery: z.boolean(),
});

function returnBase(req: Request): string {
  const configured = process.env.PAYMENT_RETURN_BASE_URL?.trim();
  return configured || `${req.protocol}://${req.get("host")}`;
}

export function registerSellerPaymentRoutes(
  app: Express,
  deps: SellerPaymentRouteDeps,
): void {
  app.get("/api/payments/seller/accounts", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    const user = await authStorage.getUser(userId);
    if (!user || !["farmer", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Seller access is required" });
    }
    return res.json({ accounts: await sellerAccountService.list(userId) });
  });

  app.get("/api/payments/seller/cash-preferences", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    const user = await authStorage.getUser(userId);
    if (!user || !["farmer", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Seller access is required" });
    }
    const preference = await paymentOperationsRepository.getSellerCashPreference(userId);
    return res.json({
      acceptsCashAtPickup: preference?.acceptsCashAtPickup ?? false,
      acceptsCashOnFarmerDelivery: preference?.acceptsCashOnFarmerDelivery ?? false,
    });
  });

  app.patch("/api/payments/seller/cash-preferences", isAuthenticated, async (req, res) => {
    try {
      const userId = deps.getUserId(req)!;
      const user = await authStorage.getUser(userId);
      if (!user || !["farmer", "admin"].includes(user.role)) {
        return res.status(403).json({ error: "Seller access is required" });
      }
      const input = cashPreferenceSchema.parse(req.body);
      if ((input.acceptsCashAtPickup || input.acceptsCashOnFarmerDelivery) && !(await marketplaceSellerVerified(userId))) {
        return res.status(403).json({
          error: "Complete marketplace seller verification before accepting cash orders.",
          code: "SELLER_VERIFICATION_REQUIRED",
        });
      }
      const preference = await paymentOperationsRepository.upsertSellerCashPreference({
        sellerId: userId,
        ...input,
      });
      return res.json(preference);
    } catch {
      return res.status(400).json({ error: "Unable to update cash preferences" });
    }
  });

  app.post(
    "/api/payments/seller/accounts/:provider/onboarding",
    isAuthenticated,
    async (req, res) => {
      try {
        const userId = deps.getUserId(req)!;
        const user = await authStorage.getUser(userId);
        if (!user || !["farmer", "admin"].includes(user.role)) {
          return res.status(403).json({ error: "Seller access is required" });
        }
        const provider = paymentProviderSchema.parse(req.params.provider);
        const input = onboardingSchema.parse(req.body);
        if (!(await marketplaceSellerVerified(userId))) {
          return res.status(403).json({
            error: "Complete marketplace seller verification before payment-provider onboarding.",
            code: "SELLER_VERIFICATION_REQUIRED",
          });
        }
        const result = await sellerAccountService.beginOnboarding(
          user,
          provider,
          input.country,
          returnBase(req),
        );
        return res.status(201).json({ redirectUrl: result.redirectUrl });
      } catch (error) {
        return res.status(400).json({
          error: "Unable to start seller onboarding",
        });
      }
    },
  );

  app.post(
    "/api/payments/seller/accounts/:provider/refresh",
    isAuthenticated,
    async (req, res) => {
      try {
        const userId = deps.getUserId(req)!;
        const provider = paymentProviderSchema.parse(req.params.provider);
        const result = await sellerAccountService.refresh(userId, provider);
        return res.json(result);
      } catch (error) {
        return res.status(400).json({
          error: "Unable to refresh seller account",
        });
      }
    },
  );

  app.get(
    "/api/payments/seller/onboarding/:provider/return",
    isAuthenticated,
    async (req, res) => {
      const provider = paymentProviderSchema.safeParse(req.params.provider);
      const base = returnBase(req);
      if (!provider.success) return res.redirect(`${base}/seller?paymentOnboarding=invalid`);
      const userId = deps.getUserId(req)!;
      const providerAccountId =
        typeof req.query.merchantIdInPayPal === "string"
          ? req.query.merchantIdInPayPal
          : typeof req.query.merchantId === "string"
            ? req.query.merchantId
            : typeof req.query.razorpayAccountId === "string"
              ? req.query.razorpayAccountId
              : typeof req.query.account_id === "string"
                ? req.query.account_id
                : undefined;
      try {
        await sellerAccountService.acceptProviderReturn(
          userId,
          provider.data,
          providerAccountId,
        );
        return res.redirect(
          `${base}/seller?paymentOnboarding=returned&provider=${provider.data}`,
        );
      } catch {
        return res.redirect(
          `${base}/seller?paymentOnboarding=pending&provider=${provider.data}`,
        );
      }
    },
  );

  app.get(
    "/api/payments/seller/onboarding/:provider/refresh",
    isAuthenticated,
    async (req, res) => {
      const provider = paymentProviderSchema.safeParse(req.params.provider);
      const base = returnBase(req);
      if (!provider.success) return res.redirect(`${base}/seller?paymentOnboarding=invalid`);
      return res.redirect(
        `${base}/seller?paymentOnboarding=refresh_required&provider=${provider.data}`,
      );
    },
  );
}
