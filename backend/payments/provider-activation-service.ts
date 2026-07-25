import { paymentOperationsRepository } from "../repositories/payment-operations-repository";
import { paymentRuntimeConfig, type PaymentProvider } from "./config";
import { paymentMetrics } from "./observability";
import { providerRegistry } from "./provider-registry";
import { logPaymentFailure, paymentErrorCode } from "./security";

export interface ProviderReadiness {
  provider: PaymentProvider;
  ready: boolean;
  reasons: string[];
  checks: {
    requested: boolean;
    credentialsConfigured: boolean;
    approvalCurrent: boolean;
    capabilitiesCurrent: boolean;
    providerAuthenticated: boolean;
    webhookRegistered: boolean;
  };
  checkedAt: string;
}

function configured(...names: string[]): boolean {
  return names.every((name) => Boolean(process.env[name]?.trim()));
}

function credentialsConfigured(provider: PaymentProvider): boolean {
  if (provider === "stripe") return configured("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET");
  if (provider === "paypal") {
    return configured(
      "PAYPAL_CLIENT_ID",
      "PAYPAL_CLIENT_SECRET",
      "PAYPAL_WEBHOOK_ID",
      "PAYPAL_PARTNER_MERCHANT_ID",
      "PAYPAL_BN_CODE",
    );
  }
  return configured("RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET");
}

function credentialModeMatches(provider: PaymentProvider): boolean {
  const live = paymentRuntimeConfig.mode === "live";
  if (provider === "stripe") {
    return process.env.STRIPE_SECRET_KEY?.startsWith(live ? "sk_live_" : "sk_test_") ?? false;
  }
  if (provider === "paypal") {
    return (process.env.PAYPAL_ENV === "live") === live;
  }
  return process.env.RAZORPAY_KEY_ID?.startsWith(live ? "rzp_live_" : "rzp_test_") ?? false;
}

function providerConfigurationReasons(
  provider: PaymentProvider,
  platformCountry: string | null,
  configuration: Record<string, unknown>,
): string[] {
  const reasons: string[] = [];
  if (
    paymentRuntimeConfig.platformFeeBps > 0 &&
    configuration.platformFeeApproved !== true
  ) {
    reasons.push("platform_fee_approval_required");
  }
  if (provider === "stripe") {
    for (const key of [
      "connectApproved",
      "platformCountryVerified",
      "sellerCountryEligibilityVerified",
      "merchantOfRecordVerified",
      "chargebackLiabilityVerified",
    ]) {
      if (configuration[key] !== true) reasons.push(`stripe_${key}_required`);
    }
  } else if (provider === "paypal") {
    for (const key of [
      "partnerApproved",
      "delayedDisbursementApproved",
      "sellerOnboardingApproved",
    ]) {
      if (configuration[key] !== true) reasons.push(`paypal_${key}_required`);
    }
    const maximumHoldDays = Number(configuration.maximumDelayedDisbursementDays);
    const maximumFulfillmentDays = Number(configuration.maximumOrderFulfillmentDays);
    if (
      !Number.isFinite(maximumHoldDays) ||
      maximumHoldDays <= 0 ||
      maximumHoldDays > 28 ||
      paymentRuntimeConfig.releaseDelayHours > maximumHoldDays * 24
    ) {
      reasons.push("paypal_delayed_disbursement_window_invalid");
    }
    if (
      !Number.isFinite(maximumFulfillmentDays) ||
      maximumFulfillmentDays <= 0 ||
      maximumFulfillmentDays * 24 + paymentRuntimeConfig.releaseDelayHours >
        maximumHoldDays * 24
    ) {
      reasons.push("paypal_fulfillment_exceeds_hold_window");
    }
  } else {
    if (platformCountry !== "IN") reasons.push("razorpay_india_platform_required");
    for (const key of [
      "indianPlatformVerified",
      "settlementAccountVerified",
      "routeApproved",
      "financialTurnoverEligible",
      "payerPayeeTransparencyApproved",
      "indiaTaxApproved",
    ]) {
      if (configuration[key] !== true) reasons.push(`razorpay_${key}_required`);
    }
    if (
      configuration.complianceSubmissionStatus !== "approved" ||
      configuration.complianceApprovalStatus !== "approved"
    ) {
      reasons.push("razorpay_route_compliance_approval_required");
    }
    const now = Date.now();
    const verifiedAt = Date.parse(String(configuration.complianceVerifiedAt ?? ""));
    const reviewAt = Date.parse(String(configuration.complianceReviewAt ?? ""));
    const expiresAt = Date.parse(String(configuration.complianceExpiresAt ?? ""));
    if (
      !Number.isFinite(verifiedAt) ||
      !Number.isFinite(reviewAt) ||
      !Number.isFinite(expiresAt) ||
      verifiedAt > now ||
      reviewAt <= now ||
      expiresAt <= now
    ) {
      reasons.push("razorpay_route_compliance_stale");
    }
  }
  return reasons;
}

function isAuthenticationFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    status?: unknown;
    statusCode?: unknown;
    providerStatus?: unknown;
    code?: unknown;
  };
  const status = Number(candidate.status ?? candidate.statusCode ?? candidate.providerStatus);
  return status === 401 || status === 403 ||
    ["authentication_error", "invalid_client", "BAD_REQUEST_ERROR"].includes(String(candidate.code));
}

export class ProviderActivationService {
  async validate(provider: PaymentProvider, probeProvider = true): Promise<ProviderReadiness> {
    const reasons: string[] = [];
    const config = await paymentOperationsRepository.getProviderConfig(provider);
    const credentials = credentialsConfigured(provider);
    const requested = paymentRuntimeConfig.requestedProviders.includes(provider);
    if (!requested) reasons.push("provider_not_requested_by_environment");
    if (paymentRuntimeConfig.mode === "mock") reasons.push("real_provider_requires_sandbox_or_live_mode");
    if (!credentials) reasons.push("provider_credentials_incomplete");
    if (credentials && !credentialModeMatches(provider)) reasons.push("provider_credential_mode_mismatch");
    if (!config) reasons.push("provider_configuration_missing");
    if (config && config.mode !== paymentRuntimeConfig.mode) reasons.push("provider_mode_mismatch");
    if (
      paymentRuntimeConfig.mode === "live" &&
      (!paymentRuntimeConfig.returnBaseUrl ||
        new URL(paymentRuntimeConfig.returnBaseUrl).protocol !== "https:")
    ) {
      reasons.push("live_https_return_url_required");
    }

    const now = new Date();
    const approvalCurrent = Boolean(
      config?.approvalVerifiedAt &&
      (!config.nextReviewAt || config.nextReviewAt > now) &&
      (!config.expiresAt || config.expiresAt > now),
    );
    if (config && !approvalCurrent) reasons.push("provider_approval_missing_or_stale");
    if (config) {
      const configuration = config.configuration as Record<string, unknown>;
      reasons.push(
        ...providerConfigurationReasons(
          provider,
          config.platformCountry,
          configuration,
        ),
      );
      const expectedWebhookEventBy = Date.parse(
        String(configuration.expectedWebhookEventBy ?? ""),
      );
      if (Number.isFinite(expectedWebhookEventBy) && expectedWebhookEventBy <= now.getTime()) {
        const lastDelivery = await paymentOperationsRepository.getLastVerifiedWebhookAt(provider);
        if (!lastDelivery || lastDelivery.getTime() < expectedWebhookEventBy) {
          reasons.push("expected_event_delivery_gap");
        }
      }
    }
    const capabilities = await paymentOperationsRepository.getCurrentProviderCapabilities(provider, now);
    if (!capabilities) reasons.push("verified_provider_capabilities_missing_or_stale");

    let providerAuthenticated = false;
    let webhookRegistered = false;
    if (probeProvider && credentials && paymentRuntimeConfig.returnBaseUrl) {
      const expectedWebhookUrl =
        `${paymentRuntimeConfig.returnBaseUrl.replace(/\/$/, "")}/api/webhooks/payments/${provider}`;
      const adapter = providerRegistry.get(provider);
      if (!adapter.inspectPlatform) {
        reasons.push("provider_platform_inspection_unavailable");
      } else {
        try {
          const inspection = await adapter.inspectPlatform(expectedWebhookUrl);
          providerAuthenticated = inspection.authenticated;
          if (!providerAuthenticated) reasons.push("provider_authentication_failed");
          if (inspection.webhookRegistration === "verified") {
            webhookRegistered = true;
          } else if (inspection.webhookRegistration === "delivery_confirmation_required") {
            const lastDelivery = await paymentOperationsRepository.getLastVerifiedWebhookAt(provider);
            webhookRegistered = Boolean(
              lastDelivery &&
              config?.approvalVerifiedAt &&
              lastDelivery.getTime() >= config.approvalVerifiedAt.getTime(),
            );
            if (!webhookRegistered) reasons.push("verified_webhook_delivery_required");
          } else {
            reasons.push("registered_webhook_missing_or_invalid");
          }
        } catch (error) {
          const authenticationFailure = isAuthenticationFailure(error);
          reasons.push(
            authenticationFailure
              ? "provider_authentication_failed"
              : "provider_health_probe_unavailable",
          );
          await paymentOperationsRepository.recordProviderHealthEvent({
            provider,
            evidenceSource: authenticationFailure ? "provider_api" : "network_probe",
            trusted: authenticationFailure,
            eventType: authenticationFailure
              ? "provider_authentication_failed"
              : "provider_probe_transient_failure",
            details: { errorCode: paymentErrorCode(error) },
          });
          logPaymentFailure("provider readiness probe failed", error, { provider });
        }
      }
    } else if (config?.webhookVerifiedAt) {
      webhookRegistered = true;
    }

    const readiness: ProviderReadiness = {
      provider,
      ready: reasons.length === 0,
      reasons: Array.from(new Set(reasons)),
      checks: {
        requested,
        credentialsConfigured: credentials,
        approvalCurrent,
        capabilitiesCurrent: Boolean(capabilities),
        providerAuthenticated,
        webhookRegistered,
      },
      checkedAt: now.toISOString(),
    };
    paymentMetrics.increment("provider_reviews", provider, readiness.ready ? "ready" : "not_ready");
    return readiness;
  }

  async activate(provider: PaymentProvider): Promise<ProviderReadiness> {
    const readiness = await this.validate(provider, true);
    if (!readiness.ready) return readiness;
    await paymentOperationsRepository.markWebhookVerified(provider);
    await paymentOperationsRepository.activateProvider(
      provider,
      paymentRuntimeConfig.mode === "live" ? "active" : "sandbox_ready",
    );
    await paymentOperationsRepository.recordProviderHealthEvent({
      provider,
      evidenceSource: "provider_api_and_approved_configuration",
      trusted: true,
      eventType: "provider_activation_validated",
      details: { mode: paymentRuntimeConfig.mode },
    });
    return readiness;
  }

  async reviewActiveProviders(): Promise<void> {
    const configs = await paymentOperationsRepository.listProviderConfigs();
    for (const config of configs) {
      if (!["active", "sandbox_ready"].includes(config.status)) continue;
      const provider = config.provider as PaymentProvider;
      if (!["stripe", "paypal", "razorpay"].includes(provider)) continue;
      const readiness = await this.validate(provider, true);
      if (readiness.ready) continue;
      const trustedReason = readiness.reasons.find((reason) =>
        [
          "provider_authentication_failed",
          "registered_webhook_missing_or_invalid",
          "verified_webhook_delivery_required",
          "expected_event_delivery_gap",
          "provider_approval_missing_or_stale",
          "verified_provider_capabilities_missing_or_stale",
        ].includes(reason),
      );
      if (!trustedReason) continue;
      await paymentOperationsRepository.suspendProvider(provider, trustedReason);
      await paymentOperationsRepository.recordProviderHealthEvent({
        provider,
        evidenceSource: "automatic_capability_review",
        trusted: true,
        eventType:
          trustedReason === "provider_authentication_failed"
            ? "provider_authentication_failed"
            : trustedReason === "expected_event_delivery_gap"
              ? "expected_event_delivery_gap"
              : trustedReason.includes("webhook")
              ? "registered_webhook_invalid"
              : "provider_capability_invalid",
        details: { reason: trustedReason },
      });
      await paymentOperationsRepository.createRecoveryCase(
        "provider_suspended",
        provider,
        { reason: trustedReason, checkedAt: readiness.checkedAt },
      );
    }
  }

  start(intervalMinutes: number): () => void {
    const timer = setInterval(() => {
      this.reviewActiveProviders().catch((error) => {
        logPaymentFailure("automatic provider review failed", error);
      });
    }, intervalMinutes * 60_000);
    timer.unref();
    return () => clearInterval(timer);
  }
}

export const providerActivationService = new ProviderActivationService();
