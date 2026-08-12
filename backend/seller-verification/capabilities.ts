import type { SellerVerificationCapability } from "@shared/schema";
import { sellerVerificationRepository } from "../repositories/seller-verification-repository";
import { paymentOperationsRepository } from "../repositories/payment-operations-repository";
import { authStorage } from "../auth/storage";

const restricted: SellerVerificationCapability = {
  canCreateDraftListings: true,
  canPublishListings: false,
  canSellRegulatedProducts: false,
  canAcceptCashOrders: false,
  canAcceptOnlinePayments: false,
  canReceivePayouts: false,
  canUseProtectedPayments: false,
};

export async function sellerCapabilities(sellerId: string): Promise<SellerVerificationCapability> {
  const verificationCase = await sellerVerificationRepository.getCase(sellerId);
  const seller = await authStorage.getUser(sellerId);
  const verifiedCatalogSeed = seller?.authMethod === "catalog_seed" && seller.isVerified === true;
  if (!verifiedCatalogSeed && (verificationCase?.status !== "verified" || (verificationCase.expiresAt && verificationCase.expiresAt <= new Date()))) {
    return restricted;
  }
  const accounts = await paymentOperationsRepository.listSellerPaymentAccounts(sellerId);
  const activeAccount = accounts.some((account) =>
    account.status === "active"
    && Boolean(account.kycVerifiedAt)
    && (!account.expiresAt || account.expiresAt > new Date()),
  );
  return {
    canCreateDraftListings: true,
    canPublishListings: true,
    canSellRegulatedProducts: true,
    canAcceptCashOrders: true,
    canAcceptOnlinePayments: activeAccount,
    canReceivePayouts: activeAccount,
    canUseProtectedPayments: activeAccount,
  };
}

export async function marketplaceSellerVerified(sellerId: string): Promise<boolean> {
  if (!(await sellerCapabilities(sellerId)).canPublishListings) return false;
  const { regionalMarketplaceRepository } = await import("../repositories/regional-marketplace-repository");
  return Boolean(await regionalMarketplaceRepository.getActiveSellerAssignment(sellerId));
}
