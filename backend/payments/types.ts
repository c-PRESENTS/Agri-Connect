import type { PaymentCurrency, PaymentProvider } from "./config";

export type ProviderName = PaymentProvider | "mock";
export type ProviderScenario =
  | "success"
  | "failure"
  | "cancelled"
  | "requires_action"
  | "pending"
  | "timeout";

export interface Money {
  currency: PaymentCurrency;
  amountMinor: string;
}

export interface VerifiedProviderCapabilities {
  maximumSellersPerCheckout: number;
  maximumAllocationsPerPayment: number;
  supportsPartialSellerRefund: boolean;
  supportsIndependentSellerRelease: boolean;
  supportsIdempotentPaymentCreation: boolean;
  supportsLookupByMerchantReference: boolean;
  verifiedAt: Date;
  expiresAt: Date;
  source: "provider_api" | "provider_contract" | "approved_configuration";
  sourceReference: string;
}

export type PaymentNextAction =
  | { type: "redirect"; url: string }
  | { type: "mock"; attemptId: string; scenario: ProviderScenario }
  | {
      type: "client_sdk";
      provider: "razorpay";
      attemptId: string;
      providerSessionId: string;
      publicKey: string;
      amount: Money;
    }
  | { type: "wait"; attemptId: string };

export interface ProviderCheckoutInput {
  attemptId: string;
  orderId: string;
  idempotencyReference: string;
  amount: Money;
  sellerIds: string[];
  allocationCount: number;
  allocations?: Array<{
    sellerId: string;
    providerAccountId: string;
    amount: Money;
    platformFeeMinor: string;
  }>;
  returnBaseUrl: string;
  scenario?: ProviderScenario;
}

export interface ProviderCheckoutResult {
  providerPaymentId: string;
  providerSessionId?: string;
  responseFingerprint: string;
  nextAction: PaymentNextAction;
}

export interface VerifiedProviderPayment {
  providerPaymentId: string;
  orderId: string;
  amount: Money;
  status: "processing" | "succeeded" | "failed" | "cancelled";
}

export interface NormalizedProviderEvent {
  provider: ProviderName;
  providerEventId: string;
  eventType: string;
  occurredAt: Date;
  providerSessionId?: string;
  payment?: VerifiedProviderPayment;
}

export interface SellerOnboardingInput {
  sellerId: string;
  providerAccountId?: string;
  country: string;
  email?: string;
  returnUrl: string;
  refreshUrl: string;
}

export interface SellerOnboardingResult {
  providerAccountId: string;
  redirectUrl: string;
  expiresAt?: Date;
}

export interface VerifiedSellerAccount {
  providerAccountId: string;
  status: "pending" | "active" | "restricted" | "suspended";
  country?: string;
  currencies: string[];
  capabilities: Record<string, boolean>;
  kycComplete: boolean;
  verifiedAt: Date;
  expiresAt: Date;
  remediation?: string[];
}

export interface ProviderTransferInput {
  idempotencyReference: string;
  providerPaymentId: string;
  providerAccountId: string;
  sellerId: string;
  amount: Money;
  allocationId: string;
  holdUntil?: Date;
}

export interface ProviderTransferResult {
  providerTransferId: string;
  status: "held" | "pending" | "succeeded";
}

export interface VerifiedProviderTransfer {
  providerTransferId: string;
  status: "held" | "pending" | "succeeded" | "failed";
}

export interface ProviderReversalInput {
  idempotencyReference: string;
  providerTransferId: string;
  amount: Money;
}

export interface ProviderReversalResult {
  providerReversalId: string;
  status: "pending" | "succeeded";
}

export interface ProviderClientConfirmation {
  providerPaymentId: string;
  providerSessionId: string;
  signature: string;
}

export interface ProviderRefundInput {
  idempotencyReference: string;
  providerPaymentId: string;
  amount: Money;
  reason?: string;
  sellerId?: string;
}

export interface ProviderRefundResult {
  providerRefundId: string;
  providerRefundIds?: string[];
  status: "pending" | "succeeded" | "failed";
}

export interface VerifiedProviderRefund {
  providerRefundId: string;
  amount: Money;
  status: "pending" | "succeeded" | "failed";
}

export interface ProviderPlatformInspection {
  authenticated: boolean;
  webhookRegistration: "verified" | "missing" | "delivery_confirmation_required";
  accountReference?: string;
  currencies?: string[];
}

export interface PaymentProviderAdapter {
  readonly name: ProviderName;
  capabilities(): Promise<VerifiedProviderCapabilities>;
  createCheckout(input: ProviderCheckoutInput): Promise<ProviderCheckoutResult>;
  retrievePayment(reference: string): Promise<VerifiedProviderPayment | undefined>;
  retrieveByMerchantReference(reference: string): Promise<VerifiedProviderPayment | undefined>;
  completeCheckout?(
    providerSessionId: string,
    idempotencyReference: string,
  ): Promise<VerifiedProviderPayment>;
  verifyClientConfirmation?(
    confirmation: ProviderClientConfirmation,
  ): Promise<VerifiedProviderPayment>;
  verifyWebhook?(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<NormalizedProviderEvent>;
  createSellerOnboarding?(input: SellerOnboardingInput): Promise<SellerOnboardingResult>;
  refreshSellerAccount?(providerAccountId: string): Promise<VerifiedSellerAccount>;
  createTransfer?(input: ProviderTransferInput): Promise<ProviderTransferResult>;
  releaseTransfer?(
    providerTransferId: string,
    idempotencyReference: string,
  ): Promise<ProviderTransferResult>;
  retrieveTransfer?(providerTransferId: string): Promise<VerifiedProviderTransfer | undefined>;
  reverseTransfer?(input: ProviderReversalInput): Promise<ProviderReversalResult>;
  refundPayment?(input: ProviderRefundInput): Promise<ProviderRefundResult>;
  retrieveRefund?(providerRefundId: string): Promise<VerifiedProviderRefund | undefined>;
  inspectPlatform?(expectedWebhookUrl: string): Promise<ProviderPlatformInspection>;
}
