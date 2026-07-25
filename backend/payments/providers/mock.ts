import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto";
import { paymentRuntimeConfig } from "../config";
import type {
  PaymentProviderAdapter,
  ProviderCheckoutInput,
  ProviderCheckoutResult,
  NormalizedProviderEvent,
  VerifiedProviderCapabilities,
  VerifiedProviderPayment,
  ProviderTransferInput,
  ProviderTransferResult,
  ProviderReversalInput,
  ProviderReversalResult,
  ProviderRefundInput,
  ProviderRefundResult,
  VerifiedProviderRefund,
  VerifiedProviderTransfer,
} from "../types";

const mockPayments = new Map<string, VerifiedProviderPayment>();
const idempotentPayments = new Map<string, string>();
const mockRefunds = new Map<string, VerifiedProviderRefund>();

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

  async verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<NormalizedProviderEvent> {
    this.assertAvailable();
    const timestamp = headers["x-agri-mock-timestamp"];
    const received = headers["x-agri-mock-signature"];
    if (typeof timestamp !== "string" || typeof received !== "string") {
      throw new Error("Missing mock webhook signature");
    }
    const seconds = Number(timestamp);
    if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 5 * 60) {
      throw new Error("Mock webhook timestamp is outside the replay window");
    }
    const secret = process.env.PAYMENT_MOCK_WEBHOOK_SECRET || "local-mock-webhook-secret";
    const expected = createHmac("sha256", secret)
      .update(`${timestamp}.`)
      .update(rawBody)
      .digest("hex");
    if (
      expected.length !== received.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(received))
    ) {
      throw new Error("Invalid mock webhook signature");
    }
    const event = JSON.parse(rawBody.toString("utf8")) as {
      id?: string;
      type?: string;
      providerPaymentId?: string;
    };
    if (!event.id || event.type !== "payment.updated" || !event.providerPaymentId) {
      throw new Error("Malformed mock webhook event");
    }
    return {
      provider: "mock",
      providerEventId: event.id,
      eventType: event.type,
      occurredAt: new Date(seconds * 1000),
      payment: mockPayments.get(event.providerPaymentId),
    };
  }

  async createTransfer(input: ProviderTransferInput): Promise<ProviderTransferResult> {
    this.assertAvailable();
    return {
      providerTransferId: `mock_transfer_${fingerprint(input.idempotencyReference).slice(0, 24)}`,
      status: "succeeded",
    };
  }

  async releaseTransfer(
    providerTransferId: string,
    _idempotencyReference: string,
  ): Promise<ProviderTransferResult> {
    this.assertAvailable();
    return { providerTransferId, status: "succeeded" };
  }

  async retrieveTransfer(providerTransferId: string): Promise<VerifiedProviderTransfer> {
    this.assertAvailable();
    return { providerTransferId, status: "succeeded" };
  }

  async reverseTransfer(input: ProviderReversalInput): Promise<ProviderReversalResult> {
    this.assertAvailable();
    return {
      providerReversalId: `mock_reversal_${fingerprint(input.idempotencyReference).slice(0, 24)}`,
      status: "succeeded",
    };
  }

  async refundPayment(input: ProviderRefundInput): Promise<ProviderRefundResult> {
    this.assertAvailable();
    const providerRefundId = `mock_refund_${fingerprint(input.idempotencyReference).slice(0, 24)}`;
    mockRefunds.set(providerRefundId, {
      providerRefundId,
      amount: input.amount,
      status: "succeeded",
    });
    return {
      providerRefundId,
      status: "succeeded",
    };
  }

  async retrieveRefund(providerRefundId: string): Promise<VerifiedProviderRefund | undefined> {
    this.assertAvailable();
    return mockRefunds.get(providerRefundId);
  }
}
