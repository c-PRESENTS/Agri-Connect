import { createHash } from "crypto";
import { paymentOperationsRepository } from "../../repositories/payment-operations-repository";
import {
  getRazorpayCredentials,
  razorpayApi,
  verifyRazorpayPayment,
  verifyRazorpayWebhook,
} from "../razorpay";
import type {
  NormalizedProviderEvent,
  PaymentProviderAdapter,
  ProviderCheckoutInput,
  ProviderCheckoutResult,
  ProviderClientConfirmation,
  ProviderRefundInput,
  ProviderRefundResult,
  ProviderPlatformInspection,
  ProviderReversalInput,
  ProviderReversalResult,
  ProviderTransferInput,
  ProviderTransferResult,
  SellerOnboardingInput,
  SellerOnboardingResult,
  VerifiedProviderCapabilities,
  VerifiedProviderPayment,
  VerifiedProviderRefund,
  VerifiedProviderTransfer,
  VerifiedSellerAccount,
} from "../types";

interface RazorpayOrder {
  id: string;
  amount: number;
  amount_paid: number;
  currency: string;
  receipt?: string;
  status: string;
  notes?: Record<string, string>;
}

interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  captured?: boolean;
  notes?: Record<string, string>;
}

interface RazorpayTransfer {
  id: string;
  status?: string;
  transfer_status?: string;
  settlement_status?: string;
  on_hold?: boolean;
}

function requireInr(currency: string): void {
  if (currency !== "INR") throw new Error("Razorpay Route is available only for INR transactions");
}

function amountMinor(value: string): number {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Razorpay amount must be a positive safe integer in paise");
  }
  return amount;
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalizePayment(payment: RazorpayPayment): VerifiedProviderPayment {
  requireInr(payment.currency);
  const orderId = payment.notes?.orderId;
  if (!orderId) throw new Error("Razorpay payment is missing the internal order reference");
  return {
    providerPaymentId: payment.id,
    orderId,
    amount: { currency: "INR", amountMinor: String(payment.amount) },
    status:
      payment.status === "captured"
        ? "succeeded"
        : payment.status === "failed"
          ? "failed"
          : "processing",
  };
}

async function currentCapabilities(): Promise<VerifiedProviderCapabilities> {
  const capabilities = await paymentOperationsRepository.getCurrentProviderCapabilities("razorpay");
  if (!capabilities) throw new Error("Razorpay capabilities have not been verified or are stale");
  return {
    maximumSellersPerCheckout: capabilities.maximumSellersPerCheckout,
    maximumAllocationsPerPayment: capabilities.maximumAllocationsPerPayment,
    supportsPartialSellerRefund: capabilities.supportsPartialSellerRefund,
    supportsIndependentSellerRelease: capabilities.supportsIndependentSellerRelease,
    supportsIdempotentPaymentCreation: capabilities.supportsIdempotentPaymentCreation,
    supportsLookupByMerchantReference: capabilities.supportsLookupByMerchantReference,
    verifiedAt: capabilities.verifiedAt,
    expiresAt: capabilities.expiresAt,
    source: capabilities.source as VerifiedProviderCapabilities["source"],
    sourceReference: capabilities.sourceReference,
  };
}

export class RazorpayPaymentAdapter implements PaymentProviderAdapter {
  readonly name = "razorpay" as const;

  capabilities(): Promise<VerifiedProviderCapabilities> {
    return currentCapabilities();
  }

  async createCheckout(input: ProviderCheckoutInput): Promise<ProviderCheckoutResult> {
    requireInr(input.amount.currency);
    const order = await razorpayApi<RazorpayOrder>("/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: amountMinor(input.amount.amountMinor),
        currency: "INR",
        receipt: input.idempotencyReference.slice(0, 40),
        notes: {
          orderId: input.orderId,
          attemptId: input.attemptId,
          idempotencyReference: input.idempotencyReference,
        },
      }),
    });
    const { keyId } = getRazorpayCredentials();
    return {
      providerPaymentId: order.id,
      providerSessionId: order.id,
      responseFingerprint: fingerprint({
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
      }),
      nextAction: {
        type: "client_sdk",
        provider: "razorpay",
        attemptId: input.attemptId,
        providerSessionId: order.id,
        publicKey: keyId,
        amount: input.amount,
      },
    };
  }

  async retrievePayment(reference: string): Promise<VerifiedProviderPayment | undefined> {
    if (reference.startsWith("pay_")) {
      return normalizePayment(
        await razorpayApi<RazorpayPayment>(`/v1/payments/${encodeURIComponent(reference)}`),
      );
    }
    const payments = await razorpayApi<{ items?: RazorpayPayment[] }>(
      `/v1/orders/${encodeURIComponent(reference)}/payments`,
    );
    const payment = payments.items?.find((item) => item.status === "captured") ?? payments.items?.[0];
    return payment ? normalizePayment(payment) : undefined;
  }

  async retrieveByMerchantReference(): Promise<VerifiedProviderPayment | undefined> {
    return undefined;
  }

  async verifyClientConfirmation(
    confirmation: ProviderClientConfirmation,
  ): Promise<VerifiedProviderPayment> {
    if (
      !verifyRazorpayPayment(
        confirmation.providerSessionId,
        confirmation.providerPaymentId,
        confirmation.signature,
      )
    ) {
      throw new Error("Invalid Razorpay checkout signature");
    }
    const payment = await razorpayApi<RazorpayPayment>(
      `/v1/payments/${encodeURIComponent(confirmation.providerPaymentId)}`,
    );
    if (payment.order_id !== confirmation.providerSessionId) {
      throw new Error("Razorpay payment order mismatch");
    }
    return normalizePayment(payment);
  }

  async verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<NormalizedProviderEvent> {
    const signature = headers["x-razorpay-signature"];
    if (
      !verifyRazorpayWebhook(
        rawBody,
        Array.isArray(signature) ? signature[0] : signature,
      )
    ) {
      throw new Error("Invalid Razorpay webhook signature");
    }
    const event = JSON.parse(rawBody.toString("utf8")) as {
      event?: string;
      created_at?: number;
      payload?: { payment?: { entity?: RazorpayPayment } };
    };
    const paymentEntity = event.payload?.payment?.entity;
    if (!event.event || !paymentEntity?.id) throw new Error("Malformed Razorpay webhook event");
    return {
      provider: "razorpay",
      providerEventId: `${event.event}:${paymentEntity.id}:${event.created_at ?? 0}`,
      eventType: event.event,
      occurredAt: new Date((event.created_at ?? Math.floor(Date.now() / 1000)) * 1000),
      payment: normalizePayment(paymentEntity),
    };
  }

  async createSellerOnboarding(
    input: SellerOnboardingInput,
  ): Promise<SellerOnboardingResult> {
    const configuredUrl = process.env.RAZORPAY_ROUTE_ONBOARDING_URL;
    if (!configuredUrl) {
      throw new Error("Razorpay Route onboarding must be configured and approved before use");
    }
    const url = new URL(configuredUrl);
    if (process.env.PAYMENTS_MODE === "live" && url.protocol !== "https:") {
      throw new Error("Live Razorpay Route onboarding must use HTTPS");
    }
    url.searchParams.set("reference_id", input.sellerId);
    url.searchParams.set("return_url", input.returnUrl);
    return {
      providerAccountId: input.providerAccountId ?? `pending:${input.sellerId}`,
      redirectUrl: url.toString(),
    };
  }

  async refreshSellerAccount(providerAccountId: string): Promise<VerifiedSellerAccount> {
    const account = await razorpayApi<{
      id: string;
      status?: string;
      profile?: { addresses?: { registered?: { country?: string } } };
    }>(`/v2/accounts/${encodeURIComponent(providerAccountId)}`);
    const product = await razorpayApi<{
      activation_status?: string;
      requirements?: Array<{ field_reference?: string; status?: string }>;
    }>(`/v2/accounts/${encodeURIComponent(providerAccountId)}/products/route`);
    const active = account.status === "activated" && product.activation_status === "activated";
    const now = new Date();
    return {
      providerAccountId: account.id,
      status: active ? "active" : account.status === "suspended" ? "suspended" : "restricted",
      country: account.profile?.addresses?.registered?.country ?? "IN",
      currencies: ["INR"],
      capabilities: { routeTransfers: active },
      kycComplete: active && !(product.requirements ?? []).some((item) => item.status !== "verified"),
      verifiedAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      remediation: active
        ? undefined
        : (product.requirements ?? []).map((item) => item.field_reference ?? "Route requirement"),
    };
  }

  async createTransfer(input: ProviderTransferInput): Promise<ProviderTransferResult> {
    requireInr(input.amount.currency);
    const response = await razorpayApi<{ items?: RazorpayTransfer[] }>(
      `/v1/payments/${encodeURIComponent(input.providerPaymentId)}/transfers`,
      {
        method: "POST",
        body: JSON.stringify({
          transfers: [
            {
              account: input.providerAccountId,
              amount: amountMinor(input.amount.amountMinor),
              currency: "INR",
              on_hold: true,
              on_hold_until: input.holdUntil
                ? Math.floor(input.holdUntil.getTime() / 1000)
                : undefined,
              notes: { allocationId: input.allocationId, sellerId: input.sellerId },
              linked_account_notes: ["allocationId"],
            },
          ],
        }),
      },
    );
    const transfer = response.items?.[0];
    if (!transfer?.id) throw new Error("Razorpay did not return a Route transfer");
    return { providerTransferId: transfer.id, status: "held" };
  }

  async releaseTransfer(
    providerTransferId: string,
    _idempotencyReference: string,
  ): Promise<ProviderTransferResult> {
    const transfer = await razorpayApi<RazorpayTransfer>(
      `/v1/transfers/${encodeURIComponent(providerTransferId)}`,
      { method: "PATCH", body: JSON.stringify({ on_hold: false }) },
    );
    return {
      providerTransferId: transfer.id,
      status:
        transfer.transfer_status === "processed" || transfer.status === "processed"
          ? "succeeded"
          : "pending",
    };
  }

  async retrieveTransfer(providerTransferId: string): Promise<VerifiedProviderTransfer> {
    const transfer = await razorpayApi<RazorpayTransfer>(
      `/v1/transfers/${encodeURIComponent(providerTransferId)}`,
    );
    const status = transfer.transfer_status ?? transfer.status;
    return {
      providerTransferId: transfer.id,
      status:
        status === "processed"
          ? "succeeded"
          : status === "failed" || status === "reversed"
            ? "failed"
            : transfer.on_hold
              ? "held"
              : "pending",
    };
  }

  async reverseTransfer(input: ProviderReversalInput): Promise<ProviderReversalResult> {
    requireInr(input.amount.currency);
    const reversal = await razorpayApi<{ id?: string; entity?: string }>(
      `/v1/transfers/${encodeURIComponent(input.providerTransferId)}/reversals`,
      {
        method: "POST",
        body: JSON.stringify({ amount: amountMinor(input.amount.amountMinor) }),
      },
    );
    if (!reversal.id) throw new Error("Razorpay did not return a reversal reference");
    return { providerReversalId: reversal.id, status: "succeeded" };
  }

  async refundPayment(input: ProviderRefundInput): Promise<ProviderRefundResult> {
    requireInr(input.amount.currency);
    const refund = await razorpayApi<{ id?: string; status?: string }>(
      `/v1/payments/${encodeURIComponent(input.providerPaymentId)}/refund`,
      {
        method: "POST",
        body: JSON.stringify({
          amount: amountMinor(input.amount.amountMinor),
          speed: "normal",
          notes: { idempotencyReference: input.idempotencyReference },
        }),
      },
    );
    if (!refund.id) throw new Error("Razorpay did not return a refund reference");
    return {
      providerRefundId: refund.id,
      status: refund.status === "processed" ? "succeeded" : refund.status === "failed" ? "failed" : "pending",
    };
  }

  async retrieveRefund(providerRefundId: string): Promise<VerifiedProviderRefund> {
    const refund = await razorpayApi<{
      id: string;
      amount: number;
      currency: string;
      status?: string;
    }>(`/v1/refunds/${encodeURIComponent(providerRefundId)}`);
    requireInr(refund.currency);
    return {
      providerRefundId: refund.id,
      amount: { currency: "INR", amountMinor: String(refund.amount) },
      status:
        refund.status === "processed"
          ? "succeeded"
          : refund.status === "failed"
            ? "failed"
            : "pending",
    };
  }

  async inspectPlatform(_expectedWebhookUrl: string): Promise<ProviderPlatformInspection> {
    await razorpayApi<{ count?: number; items?: unknown[] }>("/v1/payments?count=1");
    return {
      authenticated: true,
      webhookRegistration: "delivery_confirmation_required",
      accountReference: getRazorpayCredentials().keyId,
      currencies: ["INR"],
    };
  }
}
