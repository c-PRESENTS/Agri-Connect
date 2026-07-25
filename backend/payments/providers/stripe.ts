import { createHash } from "crypto";
import type Stripe from "stripe";
import { paymentOperationsRepository } from "../../repositories/payment-operations-repository";
import { getStripe, getWebhookSecret } from "../stripe";
import type {
  Money,
  NormalizedProviderEvent,
  PaymentProviderAdapter,
  ProviderCheckoutInput,
  ProviderCheckoutResult,
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

function amountMinor(value: string): number {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Stripe amount must be a positive safe integer in minor units");
  }
  return amount;
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalizeCurrency(currency: string): Money["currency"] {
  const normalized = currency.toUpperCase();
  if (normalized !== "GBP" && normalized !== "INR") {
    throw new Error(`Unsupported Stripe currency: ${currency}`);
  }
  return normalized;
}

function paymentIntentStatus(
  status: Stripe.PaymentIntent.Status,
): VerifiedProviderPayment["status"] {
  if (status === "succeeded") return "succeeded";
  if (status === "canceled") return "cancelled";
  if (status === "requires_payment_method") return "failed";
  return "processing";
}

function paymentFromIntent(intent: Stripe.PaymentIntent): VerifiedProviderPayment {
  const orderId = intent.metadata.order_id;
  if (!orderId) throw new Error("Stripe payment is missing the internal order reference");
  return {
    providerPaymentId: intent.id,
    orderId,
    amount: {
      currency: normalizeCurrency(intent.currency),
      amountMinor: String(intent.amount),
    },
    status: paymentIntentStatus(intent.status),
  };
}

function cancelledPaymentFromSession(
  session: Stripe.Checkout.Session,
): VerifiedProviderPayment | undefined {
  const orderId = session.metadata?.order_id;
  if (
    session.status !== "expired" ||
    !orderId ||
    session.amount_total === null ||
    !session.currency
  ) {
    return undefined;
  }
  return {
    providerPaymentId: session.id,
    orderId,
    amount: {
      currency: normalizeCurrency(session.currency),
      amountMinor: String(session.amount_total),
    },
    status: "cancelled",
  };
}

async function currentCapabilities(): Promise<VerifiedProviderCapabilities> {
  const capabilities = await paymentOperationsRepository.getCurrentProviderCapabilities("stripe");
  if (!capabilities) throw new Error("Stripe capabilities have not been verified or are stale");
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

export class StripePaymentAdapter implements PaymentProviderAdapter {
  readonly name = "stripe" as const;

  capabilities(): Promise<VerifiedProviderCapabilities> {
    return currentCapabilities();
  }

  async createCheckout(input: ProviderCheckoutInput): Promise<ProviderCheckoutResult> {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: input.attemptId,
        success_url: `${input.returnBaseUrl}/payment/${encodeURIComponent(input.attemptId)}/processing`,
        cancel_url: `${input.returnBaseUrl}/payment/${encodeURIComponent(input.attemptId)}/cancelled`,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: input.amount.currency.toLowerCase(),
              unit_amount: amountMinor(input.amount.amountMinor),
              product_data: { name: `AgriConnect order ${input.orderId}` },
            },
          },
        ],
        metadata: {
          order_id: input.orderId,
          attempt_id: input.attemptId,
          idempotency_reference: input.idempotencyReference,
        },
        payment_intent_data: {
          metadata: {
            order_id: input.orderId,
            attempt_id: input.attemptId,
            idempotency_reference: input.idempotencyReference,
          },
        },
      },
      { idempotencyKey: input.idempotencyReference },
    );
    if (!session.url) throw new Error("Stripe did not return a hosted checkout URL");
    return {
      providerPaymentId:
        typeof session.payment_intent === "string" ? session.payment_intent : session.id,
      providerSessionId: session.id,
      responseFingerprint: fingerprint({
        id: session.id,
        paymentIntent: session.payment_intent,
        status: session.status,
      }),
      nextAction: { type: "redirect", url: session.url },
    };
  }

  async retrievePayment(reference: string): Promise<VerifiedProviderPayment | undefined> {
    const stripe = getStripe();
    if (reference.startsWith("cs_")) {
      const session = await stripe.checkout.sessions.retrieve(reference, {
        expand: ["payment_intent"],
      });
      if (!session.payment_intent || typeof session.payment_intent === "string") {
        return cancelledPaymentFromSession(session);
      }
      return paymentFromIntent(session.payment_intent);
    }
    return paymentFromIntent(await stripe.paymentIntents.retrieve(reference));
  }

  async retrieveByMerchantReference(
    reference: string,
  ): Promise<VerifiedProviderPayment | undefined> {
    const stripe = getStripe();
    const escaped = reference.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
    const results = await stripe.paymentIntents.search({
      query: `metadata['idempotency_reference']:'${escaped}'`,
      limit: 1,
    });
    return results.data[0] ? paymentFromIntent(results.data[0]) : undefined;
  }

  async verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<NormalizedProviderEvent> {
    const signature = headers["stripe-signature"];
    if (typeof signature !== "string") throw new Error("Missing Stripe signature");
    const event = getStripe().webhooks.constructEvent(rawBody, signature, getWebhookSecret());
    const object = event.data.object;
    let payment: VerifiedProviderPayment | undefined;
    if (object.object === "payment_intent") payment = paymentFromIntent(object);
    if (object.object === "checkout.session" && typeof object.payment_intent === "string") {
      payment = await this.retrievePayment(object.payment_intent);
    }
    return {
      provider: "stripe",
      providerEventId: event.id,
      eventType: event.type,
      occurredAt: new Date(event.created * 1000),
      providerSessionId: object.object === "checkout.session" ? object.id : undefined,
      payment,
    };
  }

  async createSellerOnboarding(
    input: SellerOnboardingInput,
  ): Promise<SellerOnboardingResult> {
    const stripe = getStripe();
    let accountId = input.providerAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        controller: {
          fees: { payer: "application" },
          losses: { payments: "application" },
          stripe_dashboard: { type: "express" },
        },
        country: input.country,
        email: input.email,
        metadata: { seller_id: input.sellerId },
      });
      accountId = account.id;
    }
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: input.refreshUrl,
      return_url: input.returnUrl,
      type: "account_onboarding",
    });
    return {
      providerAccountId: accountId,
      redirectUrl: link.url,
      expiresAt: new Date(link.expires_at * 1000),
    };
  }

  async refreshSellerAccount(providerAccountId: string): Promise<VerifiedSellerAccount> {
    const account = await getStripe().accounts.retrieve(providerAccountId);
    const requirements = account.requirements;
    const restricted = Boolean(requirements?.disabled_reason);
    const active = account.charges_enabled && account.payouts_enabled && !restricted;
    const now = new Date();
    return {
      providerAccountId: account.id,
      status: active ? "active" : restricted ? "restricted" : "pending",
      country: account.country ?? undefined,
      currencies: account.default_currency ? [account.default_currency.toUpperCase()] : [],
      capabilities: Object.fromEntries(
        Object.entries(account.capabilities ?? {}).map(([key, value]) => [key, value === "active"]),
      ),
      kycComplete: Boolean(account.details_submitted && !requirements?.currently_due?.length),
      verifiedAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      remediation: requirements?.currently_due ?? undefined,
    };
  }

  async createTransfer(input: ProviderTransferInput): Promise<ProviderTransferResult> {
    const transfer = await getStripe().transfers.create(
      {
        amount: amountMinor(input.amount.amountMinor),
        currency: input.amount.currency.toLowerCase(),
        destination: input.providerAccountId,
        source_transaction: input.providerPaymentId.startsWith("ch_")
          ? input.providerPaymentId
          : undefined,
        transfer_group: input.allocationId,
        metadata: { allocation_id: input.allocationId },
      },
      { idempotencyKey: input.idempotencyReference },
    );
    return { providerTransferId: transfer.id, status: "succeeded" };
  }

  async retrieveTransfer(providerTransferId: string): Promise<VerifiedProviderTransfer> {
    const transfer = await getStripe().transfers.retrieve(providerTransferId);
    return {
      providerTransferId: transfer.id,
      status: transfer.reversed ? "failed" : "succeeded",
    };
  }

  async reverseTransfer(input: ProviderReversalInput): Promise<ProviderReversalResult> {
    const reversal = await getStripe().transfers.createReversal(
      input.providerTransferId,
      { amount: amountMinor(input.amount.amountMinor) },
      { idempotencyKey: input.idempotencyReference },
    );
    return { providerReversalId: reversal.id, status: "succeeded" };
  }

  async refundPayment(input: ProviderRefundInput): Promise<ProviderRefundResult> {
    const refund = await getStripe().refunds.create(
      {
        payment_intent: input.providerPaymentId,
        amount: amountMinor(input.amount.amountMinor),
        reason: input.reason === "fraudulent" ? "fraudulent" : "requested_by_customer",
        metadata: { idempotency_reference: input.idempotencyReference },
      },
      { idempotencyKey: input.idempotencyReference },
    );
    return {
      providerRefundId: refund.id,
      status: refund.status === "succeeded" ? "succeeded" : refund.status === "failed" ? "failed" : "pending",
    };
  }

  async retrieveRefund(providerRefundId: string): Promise<VerifiedProviderRefund> {
    const refund = await getStripe().refunds.retrieve(providerRefundId);
    return {
      providerRefundId: refund.id,
      amount: {
        currency: normalizeCurrency(refund.currency),
        amountMinor: String(refund.amount),
      },
      status:
        refund.status === "succeeded"
          ? "succeeded"
          : refund.status === "failed" || refund.status === "canceled"
            ? "failed"
            : "pending",
    };
  }

  async inspectPlatform(expectedWebhookUrl: string): Promise<ProviderPlatformInspection> {
    const stripe = getStripe();
    const [balance, endpoints] = await Promise.all([
      stripe.balance.retrieve(),
      stripe.webhookEndpoints.list({ limit: 100 }),
    ]);
    const registered = endpoints.data.some(
      (endpoint) => endpoint.status === "enabled" && endpoint.url === expectedWebhookUrl,
    );
    return {
      authenticated: Boolean(balance.object === "balance"),
      webhookRegistration: registered ? "verified" : "missing",
      currencies: Array.from(
        new Set(balance.available.map((entry) => entry.currency.toUpperCase())),
      ),
    };
  }
}
