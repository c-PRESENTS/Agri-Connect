import type { Express, Request } from "express";
import { z } from "zod";
import { isAuthenticated } from "../../auth";
import { authStorage } from "../../auth/storage";
import { audit } from "../../audit";
import { paymentRuntimeConfig, paymentProviderSchema } from "../../payments/config";
import { paymentMaintenanceService } from "../../payments/maintenance-service";
import { paymentMetrics } from "../../payments/observability";
import { providerActivationService } from "../../payments/provider-activation-service";
import { paymentOperationsRepository } from "../../repositories/payment-operations-repository";

interface OperatorPaymentRouteDeps {
  getUserId(req: Request): string | undefined;
}

const configurationKeys: Record<z.infer<typeof paymentProviderSchema>, Set<string>> = {
  stripe: new Set([
    "expectedWebhookEventBy",
    "platformFeeApproved",
    "connectApproved",
    "platformCountryVerified",
    "sellerCountryEligibilityVerified",
    "merchantOfRecordVerified",
    "chargebackLiabilityVerified",
  ]),
  paypal: new Set([
    "expectedWebhookEventBy",
    "platformFeeApproved",
    "partnerApproved",
    "delayedDisbursementApproved",
    "sellerOnboardingApproved",
    "maximumDelayedDisbursementDays",
    "maximumOrderFulfillmentDays",
  ]),
  razorpay: new Set([
    "expectedWebhookEventBy",
    "platformFeeApproved",
    "indianPlatformVerified",
    "settlementAccountVerified",
    "routeApproved",
    "financialTurnoverEligible",
    "payerPayeeTransparencyApproved",
    "complianceSubmissionStatus",
    "complianceApprovalStatus",
    "complianceVerifiedAt",
    "complianceReviewAt",
    "complianceExpiresAt",
    "indiaTaxApproved",
  ]),
};

const providerConfigurationSchema = z.object({
  platformCountry: z.string().length(2).transform((value) => value.toUpperCase()),
  approvalVerifiedAt: z.coerce.date(),
  nextReviewAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  configuration: z.record(z.union([z.boolean(), z.string().max(255), z.number().finite()])),
  capabilities: z.object({
    maximumSellersPerCheckout: z.number().int().positive().max(1000),
    maximumAllocationsPerPayment: z.number().int().positive().max(5000),
    supportsPartialSellerRefund: z.boolean(),
    supportsIndependentSellerRelease: z.boolean(),
    supportsIdempotentPaymentCreation: z.boolean(),
    supportsLookupByMerchantReference: z.boolean(),
    source: z.enum(["provider_api", "provider_contract", "approved_configuration"]),
    sourceReference: z.string().trim().min(3).max(500),
    verifiedAt: z.coerce.date(),
    expiresAt: z.coerce.date(),
  }),
}).superRefine((value, context) => {
  const now = Date.now();
  if (value.approvalVerifiedAt.getTime() > now) {
    context.addIssue({ code: "custom", path: ["approvalVerifiedAt"], message: "Cannot be in the future" });
  }
  if (value.nextReviewAt <= value.approvalVerifiedAt || value.expiresAt <= new Date()) {
    context.addIssue({ code: "custom", path: ["expiresAt"], message: "Approval dates are not current" });
  }
  if (
    value.capabilities.verifiedAt.getTime() > now ||
    value.capabilities.expiresAt <= new Date()
  ) {
    context.addIssue({ code: "custom", path: ["capabilities"], message: "Capability evidence is not current" });
  }
});

async function isAdmin(userId: string): Promise<boolean> {
  return (await authStorage.getUser(userId))?.role === "admin";
}

export function registerPaymentOperatorRoutes(
  app: Express,
  deps: OperatorPaymentRouteDeps,
): void {
  app.get("/api/payments/operator/providers/readiness", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    if (!(await isAdmin(userId))) return res.status(403).json({ error: "Access denied" });
    const providers = paymentProviderSchema.options;
    return res.json({
      mode: paymentRuntimeConfig.mode,
      providers: await Promise.all(
        providers.map((provider) => providerActivationService.validate(provider, true)),
      ),
    });
  });

  app.put("/api/payments/operator/providers/:provider/configuration", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    if (!(await isAdmin(userId))) return res.status(403).json({ error: "Access denied" });
    const provider = paymentProviderSchema.parse(req.params.provider);
    const input = providerConfigurationSchema.parse(req.body);
    const unknownKeys = Object.keys(input.configuration).filter(
      (key) => !configurationKeys[provider].has(key),
    );
    if (unknownKeys.length) {
      return res.status(400).json({ error: "Unsupported provider configuration fields" });
    }
    const config = await paymentOperationsRepository.configureProvider(
      {
        provider,
        mode: paymentRuntimeConfig.mode,
        status: "pending_review",
        platformCountry: input.platformCountry,
        configuration: input.configuration,
        approvalVerifiedAt: input.approvalVerifiedAt,
        nextReviewAt: input.nextReviewAt,
        expiresAt: input.expiresAt,
        webhookVerifiedAt: null,
        suspensionReason: null,
      },
      input.capabilities,
    );
    audit({
      action: "payment.provider_configuration_updated",
      actorId: userId,
      targetType: "payment_provider",
      targetId: provider,
    });
    return res.json({
      provider: config.provider,
      status: config.status,
      mode: config.mode,
    });
  });

  app.post("/api/payments/operator/providers/:provider/validate", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    if (!(await isAdmin(userId))) return res.status(403).json({ error: "Access denied" });
    const provider = paymentProviderSchema.parse(req.params.provider);
    return res.json(await providerActivationService.validate(provider, true));
  });

  app.post("/api/payments/operator/providers/:provider/activate", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    if (!(await isAdmin(userId))) return res.status(403).json({ error: "Access denied" });
    const provider = paymentProviderSchema.parse(req.params.provider);
    const readiness = await providerActivationService.activate(provider);
    audit({
      action: "payment.provider_activation_requested",
      actorId: userId,
      targetType: "payment_provider",
      targetId: provider,
      outcome: readiness.ready ? "success" : "denied",
    });
    return res.status(readiness.ready ? 200 : 409).json(readiness);
  });

  app.post("/api/payments/operator/providers/:provider/suspend", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    if (!(await isAdmin(userId))) return res.status(403).json({ error: "Access denied" });
    const provider = paymentProviderSchema.parse(req.params.provider);
    const input = z.object({ reason: z.string().trim().min(10).max(500) }).parse(req.body);
    await paymentOperationsRepository.suspendProvider(provider, "operator_suspended");
    await paymentOperationsRepository.recordProviderHealthEvent({
      provider,
      evidenceSource: "operator",
      trusted: true,
      eventType: "operator_confirmed_configuration_issue",
      details: { reason: input.reason, operatorId: userId },
    });
    audit({
      action: "payment.provider_suspended",
      actorId: userId,
      targetType: "payment_provider",
      targetId: provider,
    });
    return res.json({ provider, status: "suspended" });
  });

  app.get("/api/payments/operator/metrics", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    if (!(await isAdmin(userId))) return res.status(403).json({ error: "Access denied" });
    return res.json({ metrics: paymentMetrics.snapshot() });
  });

  app.post("/api/payments/operator/recovery-drill", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    if (!(await isAdmin(userId))) return res.status(403).json({ error: "Access denied" });
    const result = await paymentMaintenanceService.runRecoveryDrill(true);
    audit({
      action: "payment.recovery_drill_run",
      actorId: userId,
      targetType: "payment_recovery_case",
      targetId: result.checkedAt,
      outcome: result.healthy ? "success" : "failed",
    });
    return res.status(result.healthy ? 200 : 409).json(result);
  });

  app.post("/api/payments/operator/retention/run", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    if (!(await isAdmin(userId))) return res.status(403).json({ error: "Access denied" });
    return res.json({ deleted: await paymentMaintenanceService.runRetention() });
  });
}
