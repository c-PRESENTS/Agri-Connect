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
  | { type: "wait"; attemptId: string };

export interface ProviderCheckoutInput {
  attemptId: string;
  orderId: string;
  idempotencyReference: string;
  amount: Money;
  sellerIds: string[];
  allocationCount: number;
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
  payment?: VerifiedProviderPayment;
}

export interface PaymentProviderAdapter {
  readonly name: ProviderName;
  capabilities(): Promise<VerifiedProviderCapabilities>;
  createCheckout(input: ProviderCheckoutInput): Promise<ProviderCheckoutResult>;
  retrievePayment(reference: string): Promise<VerifiedProviderPayment | undefined>;
  retrieveByMerchantReference(reference: string): Promise<VerifiedProviderPayment | undefined>;
}
