import { paymentRuntimeConfig, type PaymentCurrency } from "./config";
import { providerRegistry } from "./provider-registry";
import type { ProviderName, VerifiedProviderCapabilities } from "./types";

export interface PaymentEligibility {
  provider: ProviderName;
  eligible: boolean;
  reasons: string[];
  capabilities?: VerifiedProviderCapabilities;
}

export class EligibilityService {
  async evaluate(
    provider: ProviderName,
    currency: PaymentCurrency,
    sellerIds: string[],
    allocationCount: number,
  ): Promise<PaymentEligibility> {
    const reasons: string[] = [];
    if (!paymentRuntimeConfig.supportedCurrencies.includes(currency)) reasons.push("currency_not_supported");
    if (!providerRegistry.has(provider)) reasons.push("provider_not_registered");
    if (provider !== "mock") reasons.push("provider_not_activated");
    if (provider === "mock" && (process.env.NODE_ENV === "production" || paymentRuntimeConfig.mode === "live")) {
      reasons.push("mock_not_available");
    }
    if (reasons.length) return { provider, eligible: false, reasons };
    const capabilities = await providerRegistry.get(provider).capabilities();
    if (capabilities.expiresAt.getTime() <= Date.now()) reasons.push("capabilities_stale");
    if (sellerIds.length > capabilities.maximumSellersPerCheckout) reasons.push("seller_limit_exceeded");
    if (allocationCount > capabilities.maximumAllocationsPerPayment) reasons.push("allocation_limit_exceeded");
    return { provider, eligible: reasons.length === 0, reasons, capabilities };
  }
}

export const eligibilityService = new EligibilityService();
