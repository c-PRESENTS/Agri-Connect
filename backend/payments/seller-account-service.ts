import type { User } from "@shared/schema";
import { paymentOperationsRepository } from "../repositories/payment-operations-repository";
import { providerRegistry } from "./provider-registry";
import { paymentErrorCode } from "./security";
import type { PaymentProvider } from "./config";

const providers: PaymentProvider[] = ["stripe", "paypal", "razorpay"];

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
        configByProvider.get(provider)?.status ?? "unavailable",
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
      throw new Error("This payment provider is not available for seller onboarding");
    }
    if (provider === "razorpay" && country !== "IN") {
      throw new Error("Razorpay Route seller accounts must be based in India");
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
