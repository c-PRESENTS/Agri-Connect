import type { User } from "@shared/schema";
import { paymentOperationsRepository } from "../repositories/payment-operations-repository";
import { providerRegistry } from "./provider-registry";
import { paymentErrorCode } from "./security";
import type { PaymentProvider } from "./config";
import { paymentRuntimeConfig } from "./config";

const providers: PaymentProvider[] = ["stripe", "paypal", "razorpay"];
const DEFAULT_DEMO_CURRENCIES: Record<PaymentProvider, string[]> = {
  stripe: ["GBP", "INR"],
  paypal: ["GBP"],
  razorpay: ["INR"],
};

function isSellerPreviewMode() {
  return paymentRuntimeConfig.uiPreviewEnabled;
}

function demoReviewWindow(at = new Date()) {
  return {
    verifiedAt: at,
    nextReviewAt: new Date(at.getTime() + 7 * 24 * 60 * 60 * 1000),
    expiresAt: new Date(at.getTime() + 30 * 24 * 60 * 60 * 1000),
  };
}

function storedCurrencies(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function publicAccount(
  provider: PaymentProvider,
  account:
    | Awaited<ReturnType<typeof paymentOperationsRepository.getSellerPaymentAccount>>
    | undefined,
  platformStatus: string,
) {
  return {
    provider,
    platformStatus,
    status: account?.status ?? "not_started",
    country: account?.country,
    currencies: account?.currencies ?? [],
    capabilities: account?.capabilities ?? {},
    kycVerifiedAt: account?.kycVerifiedAt,
    lastVerifiedAt: account?.lastVerifiedAt,
    nextReviewAt: account?.nextReviewAt,
    expiresAt: account?.expiresAt,
    suspensionReason: account?.suspensionReason,
  };
}

export class SellerAccountService {
  async list(sellerId: string) {
    const [accounts, configs] = await Promise.all([
      paymentOperationsRepository.listSellerPaymentAccounts(sellerId),
      paymentOperationsRepository.listProviderConfigs(),
    ]);
    const accountByProvider = new Map(accounts.map((account) => [account.provider, account]));
    const configByProvider = new Map(configs.map((config) => [config.provider, config]));
    return providers.map((provider) =>
      publicAccount(
        provider,
        accountByProvider.get(provider),
        configByProvider.get(provider)?.status ??
          (isSellerPreviewMode() ? "sandbox_ready" : "unavailable"),
      ),
    );
  }

  async beginOnboarding(
    seller: User,
    provider: PaymentProvider,
    country: string,
    returnBaseUrl: string,
  ) {
    const config = await paymentOperationsRepository.getProviderConfig(provider);
    if (!config || !["sandbox_ready", "active"].includes(config.status)) {
      if (!isSellerPreviewMode()) {
        throw new Error("This payment provider is not available for seller onboarding");
      }
    }
    if (provider === "razorpay" && country !== "IN") {
      throw new Error("Razorpay Route seller accounts must be based in India");
    }
    if (isSellerPreviewMode()) {
      const review = demoReviewWindow();
      const account = await paymentOperationsRepository.upsertSellerPaymentAccount({
        sellerId: seller.id,
        provider,
        providerAccountId: `demo:${provider}:${seller.id}`,
        status: "active",
        country,
        currencies: DEFAULT_DEMO_CURRENCIES[provider],
        capabilities: {
          demo: true,
          chargesEnabled: true,
          payoutsEnabled: true,
          onboardingComplete: true,
          protectedPaymentPreview: true,
        },
        kycVerifiedAt: review.verifiedAt,
        lastVerifiedAt: review.verifiedAt,
        nextReviewAt: review.nextReviewAt,
        expiresAt: review.expiresAt,
        suspensionReason: null,
      });
      return {
        providerAccountId: account.providerAccountId ?? `demo:${provider}:${seller.id}`,
        redirectUrl: `${returnBaseUrl}/seller?paymentOnboarding=demo&provider=${provider}`,
        expiresAt: account.expiresAt ?? review.expiresAt,
      };
    }
    const adapter = providerRegistry.get(provider);
    if (!adapter.createSellerOnboarding) {
      throw new Error("Seller onboarding is not supported by this provider");
    }
    const existing = await paymentOperationsRepository.getSellerPaymentAccount(
      seller.id,
      provider,
    );
    const callback = `${returnBaseUrl}/api/payments/seller/onboarding/${provider}/return`;
    const refresh = `${returnBaseUrl}/api/payments/seller/onboarding/${provider}/refresh`;
    const result = await adapter.createSellerOnboarding({
      sellerId: seller.id,
      providerAccountId: existing?.providerAccountId ?? undefined,
      country,
      email: seller.email ?? undefined,
      returnUrl: callback,
      refreshUrl: refresh,
    });
    await paymentOperationsRepository.upsertSellerPaymentAccount({
      sellerId: seller.id,
      provider,
      providerAccountId: result.providerAccountId,
      status: "pending",
      country,
      currencies: existing?.currencies ?? [],
      capabilities: existing?.capabilities ?? {},
      lastVerifiedAt: existing?.lastVerifiedAt,
      nextReviewAt: existing?.nextReviewAt,
      expiresAt: result.expiresAt ?? existing?.expiresAt,
      suspensionReason: null,
    });
    return result;
  }

  async acceptProviderReturn(
    sellerId: string,
    provider: PaymentProvider,
    providerAccountId?: string,
  ) {
    const account = await paymentOperationsRepository.getSellerPaymentAccount(sellerId, provider);
    if (!account) throw new Error("Seller payment account was not started");
    if (providerAccountId && ["paypal", "razorpay"].includes(provider)) {
      await paymentOperationsRepository.upsertSellerPaymentAccount({
        ...account,
        providerAccountId,
        status: "pending",
      });
    }
    return this.refresh(sellerId, provider);
  }

  async refresh(sellerId: string, provider: PaymentProvider) {
    const account = await paymentOperationsRepository.getSellerPaymentAccount(sellerId, provider);
    if (!account?.providerAccountId || account.providerAccountId.startsWith("pending:")) {
      throw new Error("Provider account identifier is not available yet");
    }
    if (isSellerPreviewMode() && account.providerAccountId.startsWith("demo:")) {
      const review = demoReviewWindow();
      const refreshed = await paymentOperationsRepository.upsertSellerPaymentAccount({
        ...account,
        status: "active",
        currencies: storedCurrencies(account.currencies).length
          ? storedCurrencies(account.currencies)
          : DEFAULT_DEMO_CURRENCIES[provider],
        capabilities: {
          ...(account.capabilities && typeof account.capabilities === "object" ? account.capabilities : {}),
          demo: true,
          chargesEnabled: true,
          payoutsEnabled: true,
          onboardingComplete: true,
          protectedPaymentPreview: true,
        },
        kycVerifiedAt: review.verifiedAt,
        lastVerifiedAt: review.verifiedAt,
        nextReviewAt: review.nextReviewAt,
        expiresAt: review.expiresAt,
        suspensionReason: null,
      });
      return {
        provider,
        providerAccountId: refreshed.providerAccountId ?? account.providerAccountId,
        status: "active" as const,
        country: refreshed.country ?? account.country ?? undefined,
        currencies: storedCurrencies(refreshed.currencies),
        capabilities: refreshed.capabilities as Record<string, unknown>,
        kycComplete: true,
        verifiedAt: review.verifiedAt,
        expiresAt: review.expiresAt,
        remediation: [],
      };
    }
    const adapter = providerRegistry.get(provider);
    if (!adapter.refreshSellerAccount) {
      throw new Error("Seller capability refresh is not supported by this provider");
    }
    const verified = await adapter.refreshSellerAccount(account.providerAccountId);
    await paymentOperationsRepository.upsertSellerPaymentAccount({
      ...account,
      providerAccountId: verified.providerAccountId,
      status: verified.status,
      country: verified.country ?? account.country,
      currencies: verified.currencies,
      capabilities: verified.capabilities,
      kycVerifiedAt: verified.kycComplete ? verified.verifiedAt : null,
      lastVerifiedAt: verified.verifiedAt,
      nextReviewAt: verified.expiresAt,
      expiresAt: verified.expiresAt,
      suspensionReason:
        verified.status === "active" ? null : (verified.remediation ?? []).join("; "),
    });
    return verified;
  }

  async suspendStaleAccounts(at = new Date()): Promise<void> {
    const due = await paymentOperationsRepository.listSellerAccountsDueForReview(at);
    for (const account of due) {
      const provider = providers.find((candidate) => candidate === account.provider);
      if (!provider) continue;
      try {
        await this.refresh(account.sellerId, provider);
      } catch (error) {
        await paymentOperationsRepository.upsertSellerPaymentAccount({
          ...account,
          status: "suspended",
          suspensionReason: paymentErrorCode(error),
          nextReviewAt: new Date(at.getTime() + 60 * 60 * 1000),
        });
      }
    }
  }
}

export const sellerAccountService = new SellerAccountService();
