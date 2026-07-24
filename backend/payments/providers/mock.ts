import { createHash, randomUUID } from "crypto";
import { paymentRuntimeConfig } from "../config";
import type {
  PaymentProviderAdapter,
  ProviderCheckoutInput,
  ProviderCheckoutResult,
  VerifiedProviderCapabilities,
  VerifiedProviderPayment,
} from "../types";

const mockPayments = new Map<string, VerifiedProviderPayment>();
const idempotentPayments = new Map<string, string>();

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export class MockPaymentAdapter implements PaymentProviderAdapter {
  readonly name = "mock" as const;

  private assertAvailable(): void {
    if (process.env.NODE_ENV === "production" || paymentRuntimeConfig.mode === "live") {
      throw new Error("Mock payments are unavailable in production");
    }
  }

  async capabilities(): Promise<VerifiedProviderCapabilities> {
    this.assertAvailable();
    const now = new Date();
    return {
      maximumSellersPerCheckout: 25,
      maximumAllocationsPerPayment: 100,
      supportsPartialSellerRefund: true,
      supportsIndependentSellerRelease: true,
      supportsIdempotentPaymentCreation: true,
      supportsLookupByMerchantReference: true,
      verifiedAt: now,
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
      source: "approved_configuration",
      sourceReference: "mock-adapter-v1",
    };
  }

  async createCheckout(input: ProviderCheckoutInput): Promise<ProviderCheckoutResult> {
    this.assertAvailable();
    if (input.scenario === "timeout") {
      throw Object.assign(new Error("Mock provider outcome is unknown"), { outcomeUnknown: true });
    }
    const existingId = idempotentPayments.get(input.idempotencyReference);
    const providerPaymentId = existingId ?? `mock_pay_${randomUUID()}`;
    idempotentPayments.set(input.idempotencyReference, providerPaymentId);
    const status =
      input.scenario === "failure"
        ? "failed"
        : input.scenario === "cancelled"
          ? "cancelled"
          : input.scenario === "pending" || input.scenario === "requires_action"
            ? "processing"
            : "succeeded";
    mockPayments.set(providerPaymentId, {
      providerPaymentId,
      orderId: input.orderId,
      amount: input.amount,
      status,
    });
    return {
      providerPaymentId,
      providerSessionId: `mock_session_${input.attemptId}`,
      responseFingerprint: fingerprint({ providerPaymentId, status }),
      nextAction:
        input.scenario === "pending"
          ? { type: "wait", attemptId: input.attemptId }
          : {
              type: "mock",
              attemptId: input.attemptId,
              scenario: input.scenario ?? "success",
            },
    };
  }

  async retrievePayment(reference: string): Promise<VerifiedProviderPayment | undefined> {
    this.assertAvailable();
    return mockPayments.get(reference);
  }

  async retrieveByMerchantReference(reference: string): Promise<VerifiedProviderPayment | undefined> {
    this.assertAvailable();
    const paymentId = idempotentPayments.get(reference);
    return paymentId ? mockPayments.get(paymentId) : undefined;
  }
}
