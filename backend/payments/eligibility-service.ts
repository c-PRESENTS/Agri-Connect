import { paymentRuntimeConfig, type PaymentCurrency } from "./config";
import { paymentOperationsRepository } from "../repositories/payment-operations-repository";
import { providerRegistry } from "./provider-registry";
import type { ProviderName, VerifiedProviderCapabilities } from "./types";
import { hasStripeTestSecretKey, hasStripeWebhookSecret } from "./stripe";
import { hasRazorpayTestCredentials, hasRazorpayWebhookSecret } from "./razorpay";

export interface PaymentEligibility {
  provider: ProviderName;
  eligible: boolean;
  reasons: string[];
  previewOnly?: boolean;
  capabilities?: VerifiedProviderCapabilities;
}

export class EligibilityService {
  async evaluate(
    provider: ProviderName,
    currency: PaymentCurrency,
    sellerIds: string[],
    allocationCount: number,
    options: { allowUiPreview?: boolean } = {},
  ): Promise<PaymentEligibility> {
    const reasons: string[] = [];
    if (!paymentRuntimeConfig.supportedCurrencies.includes(currency)) reasons.push("currency_not_supported");
    if (provider === "razorpay" && currency !== "INR") reasons.push("razorpay_inr_only");
    if (!providerRegistry.has(provider)) reasons.push("provider_not_registered");
    if (
      provider !== "mock" &&
      !paymentRuntimeConfig.requestedProviders.includes(provider)
    ) {
      reasons.push("provider_not_enabled");
    }
    if (provider === "mock" && (process.env.NODE_ENV === "production" || paymentRuntimeConfig.mode === "live")) {
      reasons.push("mock_not_available");
    }
    if (provider === "razorpay" && paymentRuntimeConfig.mode === "sandbox") {
      if (!hasRazorpayTestCredentials()) reasons.push("razorpay_test_credentials_missing");
      if (!hasRazorpayWebhookSecret()) reasons.push("razorpay_webhook_secret_missing");
    }
    const stripeDevelopmentCheckout =
      provider === "stripe" &&
      process.env.NODE_ENV !== "production" &&
      paymentRuntimeConfig.mode === "sandbox" &&
      paymentRuntimeConfig.requestedProviders.includes("stripe") &&
      hasStripeTestSecretKey() &&
      hasStripeWebhookSecret();
    if (stripeDevelopmentCheckout && reasons.length === 0) {
      const now = new Date();
      return {
        provider,
        eligible: true,
        reasons: [],
        capabilities: {
          maximumSellersPerCheckout: 25,
          maximumAllocationsPerPayment: 100,
          supportsPartialSellerRefund: true,
          supportsIndependentSellerRelease: true,
          supportsIdempotentPaymentCreation: true,
          supportsLookupByMerchantReference: true,
          verifiedAt: now,
          expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
          source: "approved_configuration",
          sourceReference: "stripe-sandbox-checkout",
        },
      };
    }
    const razorpaySandboxCheckout =
      provider === "razorpay" &&
      currency === "INR" &&
      paymentRuntimeConfig.mode === "sandbox" &&
      paymentRuntimeConfig.requestedProviders.includes("razorpay") &&
      hasRazorpayTestCredentials() &&
      hasRazorpayWebhookSecret();
    if (razorpaySandboxCheckout && reasons.length === 0) {
      const now = new Date();
      return {
        provider,
        eligible: true,
        reasons: [],
        capabilities: {
          maximumSellersPerCheckout: 25,
          maximumAllocationsPerPayment: 100,
          supportsPartialSellerRefund: true,
          supportsIndependentSellerRelease: false,
          supportsIdempotentPaymentCreation: true,
          supportsLookupByMerchantReference: false,
          verifiedAt: now,
          expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
          source: "approved_configuration",
          sourceReference: "razorpay-sandbox-checkout",
        },
      };
    }
    if (provider !== "mock") {
      if (paymentRuntimeConfig.mode === "mock") reasons.push("real_provider_requires_sandbox_or_live_mode");
      const config = await paymentOperationsRepository.getProviderConfig(provider);
      if (!config || !["sandbox_ready", "active"].includes(config.status)) {
        reasons.push("provider_not_activated");
      } else {
        if (config.mode !== paymentRuntimeConfig.mode) reasons.push("provider_mode_mismatch");
        if (!config.approvalVerifiedAt) reasons.push("provider_approval_unverified");
        if (!config.webhookVerifiedAt) reasons.push("provider_webhook_unverified");
        if (config.nextReviewAt && config.nextReviewAt <= new Date()) reasons.push("provider_review_due");
        if (config.expiresAt && config.expiresAt <= new Date()) reasons.push("provider_approval_expired");
        const configuration = config.configuration as Record<string, unknown>;
        if (
          paymentRuntimeConfig.platformFeeBps > 0 &&
          configuration.platformFeeApproved !== true
        ) {
          reasons.push("platform_fee_approval_required");
        }
        if (provider === "stripe") {
          const required = [
            "connectApproved",
            "platformCountryVerified",
            "sellerCountryEligibilityVerified",
            "merchantOfRecordVerified",
            "chargebackLiabilityVerified",
          ];
          if (required.some((key) => configuration[key] !== true)) {
            reasons.push("stripe_platform_responsibilities_unverified");
          }
        }
        if (provider === "paypal") {
          const maximumHoldDays = Number(configuration.maximumDelayedDisbursementDays);
          const maximumFulfillmentDays = Number(configuration.maximumOrderFulfillmentDays);
          if (
            configuration.partnerApproved !== true ||
            configuration.delayedDisbursementApproved !== true ||
            configuration.sellerOnboardingApproved !== true
          ) {
            reasons.push("paypal_partner_approval_incomplete");
          }
          if (
            !Number.isFinite(maximumHoldDays) ||
            maximumHoldDays <= 0 ||
            maximumHoldDays > 28 ||
            paymentRuntimeConfig.releaseDelayHours > maximumHoldDays * 24
          ) {
            reasons.push("paypal_hold_window_unsupported");
          }
          if (
            !Number.isFinite(maximumFulfillmentDays) ||
            maximumFulfillmentDays <= 0 ||
            maximumFulfillmentDays * 24 + paymentRuntimeConfig.releaseDelayHours >
              maximumHoldDays * 24
          ) {
            reasons.push("paypal_fulfillment_exceeds_hold_window");
          }
        }
        if (provider === "razorpay") {
          const verifiedAt = Date.parse(String(configuration.complianceVerifiedAt ?? ""));
          const reviewAt = Date.parse(String(configuration.complianceReviewAt ?? ""));
          const expiresAt = Date.parse(String(configuration.complianceExpiresAt ?? ""));
          if (
            config.platformCountry !== "IN" ||
            configuration.indianPlatformVerified !== true ||
            configuration.settlementAccountVerified !== true ||
            configuration.routeApproved !== true ||
            configuration.financialTurnoverEligible !== true ||
            configuration.payerPayeeTransparencyApproved !== true ||
            configuration.complianceSubmissionStatus !== "approved" ||
            configuration.complianceApprovalStatus !== "approved" ||
            configuration.indiaTaxApproved !== true
          ) {
            reasons.push("razorpay_route_compliance_incomplete");
          }
          if (
            !Number.isFinite(verifiedAt) ||
            !Number.isFinite(reviewAt) ||
            !Number.isFinite(expiresAt) ||
            reviewAt <= Date.now() ||
            expiresAt <= Date.now() ||
            verifiedAt > Date.now()
          ) {
            reasons.push("razorpay_compliance_stale_or_expired");
          }
        }
      }
      const accounts = await paymentOperationsRepository.getSellerPaymentAccounts(provider, sellerIds);
      const currentAccounts = accounts.filter(
        (account) =>
          account.status === "active" &&
          Boolean(account.providerAccountId) &&
          (!account.expiresAt || account.expiresAt > new Date()) &&
          (!account.nextReviewAt || account.nextReviewAt > new Date()),
      );
      if (currentAccounts.length !== sellerIds.length) reasons.push("seller_payment_account_ineligible");
      if (
        currentAccounts.some(
          (account) =>
            Array.isArray(account.currencies) &&
            account.currencies.length > 0 &&
            !account.currencies.includes(currency),
        )
      ) {
        reasons.push("seller_currency_not_supported");
      }
      if (
        provider === "razorpay" &&
        currentAccounts.some(
          (account) =>
            account.country !== "IN" ||
            !account.kycVerifiedAt ||
            (account.capabilities as Record<string, unknown>).routeTransfers !== true,
        )
      ) {
        reasons.push("razorpay_seller_kyc_or_route_ineligible");
      }
    }
    if (reasons.length) {
      if (
        options.allowUiPreview &&
        paymentRuntimeConfig.uiPreviewEnabled &&
        provider !== "mock" &&
        providerRegistry.has(provider)
      ) {
        return { provider, eligible: true, reasons, previewOnly: true };
      }
      return { provider, eligible: false, reasons };
    }
    const capabilities = await providerRegistry.get(provider).capabilities();
    if (capabilities.expiresAt.getTime() <= Date.now()) reasons.push("capabilities_stale");
    if (sellerIds.length > capabilities.maximumSellersPerCheckout) reasons.push("seller_limit_exceeded");
    if (allocationCount > capabilities.maximumAllocationsPerPayment) reasons.push("allocation_limit_exceeded");
    return { provider, eligible: reasons.length === 0, reasons, capabilities };
  }
}

export const eligibilityService = new EligibilityService();
