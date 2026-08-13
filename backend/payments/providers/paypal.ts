import { createHash } from "crypto";
import { paymentOperationsRepository } from "../../repositories/payment-operations-repository";
import { paypalApi, verifyPayPalWebhook } from "../paypal";
import { paymentRuntimeConfig } from "../config";
import type {
  NormalizedProviderEvent,
  PaymentProviderAdapter,
  ProviderCheckoutInput,
  ProviderCheckoutResult,
  ProviderRefundInput,
  ProviderRefundResult,
  ProviderPlatformInspection,
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

const maximumDelayedDisbursementDays = 28;

interface PayPalLink {
  href: string;
  rel: string;
}

interface PayPalCapture {
  id: string;
  status: string;
  amount?: { currency_code?: string; value?: string };
  custom_id?: string;
  invoice_id?: string;
}

interface PayPalOrder {
  id: string;
  status: string;
  purchase_units?: Array<{
    reference_id?: string;
    custom_id?: string;
    invoice_id?: string;
    amount?: { currency_code?: string; value?: string };
    payments?: { captures?: PayPalCapture[] };
  }>;
  links?: PayPalLink[];
}

function minorToDecimal(amountMinor: string): string {
  const amount = BigInt(amountMinor);
  if (amount <= BigInt(0)) throw new Error("PayPal amount must be positive");
  return `${amount / BigInt(100)}.${(amount % BigInt(100)).toString().padStart(2, "0")}`;
}

function decimalToMinor(value: string): string {
  const [whole = "0", fraction = ""] = value.split(".");
  return (BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0").slice(0, 2))).toString();
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function partnerHeaders(requestId?: string): Record<string, string> {
  const partnerId = process.env.PAYPAL_PARTNER_MERCHANT_ID;
  const bnCode = process.env.PAYPAL_BN_CODE;
  if (!partnerId || !bnCode) throw new Error("PayPal partner configuration is incomplete");
  return {
    "PayPal-Partner-Attribution-Id": bnCode,
    ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
  };
}

function authAssertion(sellerPayerId: string): string {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId) throw new Error("PAYPAL_CLIENT_ID is not configured");
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode({ iss: clientId, payer_id: sellerPayerId })}.`;
}

function normalizeOrder(order: PayPalOrder): VerifiedProviderPayment | undefined {
  const units = order.purchase_units ?? [];
  const unit = units[0];
  const captures = units.flatMap((purchaseUnit) => purchaseUnit.payments?.captures ?? []);
  const amounts = (captures.length ? captures.map((capture) => capture.amount) : units.map((entry) => entry.amount))
    .filter((amount): amount is NonNullable<typeof amount> => Boolean(amount?.currency_code && amount.value));
  const amount = amounts[0];
  const orderId = unit?.custom_id ?? unit?.invoice_id ?? unit?.reference_id;
  if (!amount?.currency_code || !amount.value || !orderId) return undefined;
  const currency = amount.currency_code.toUpperCase();
  if (currency !== "GBP" && currency !== "INR") throw new Error("Unsupported PayPal currency");
  const totalMinor = amounts.reduce(
    (total, entry) => total + BigInt(decimalToMinor(entry.value ?? "0")),
    BigInt(0),
  );
  const status =
    captures.length > 0 && captures.every((capture) => capture.status === "COMPLETED")
      ? "succeeded"
      : captures.some((capture) => ["DECLINED", "FAILED"].includes(capture.status))
        ? "failed"
        : order.status === "VOIDED"
          ? "cancelled"
          : "processing";
  return {
    providerPaymentId: order.id,
    orderId,
    amount: { currency, amountMinor: totalMinor.toString() },
    status,
  };
}

async function currentCapabilities(): Promise<VerifiedProviderCapabilities> {
  const capabilities = await paymentOperationsRepository.getCurrentProviderCapabilities("paypal");
  if (!capabilities) throw new Error("PayPal capabilities have not been verified or are stale");
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

export class PayPalPaymentAdapter implements PaymentProviderAdapter {
  readonly name = "paypal" as const;

  capabilities(): Promise<VerifiedProviderCapabilities> {
    return currentCapabilities();
  }

  async createCheckout(input: ProviderCheckoutInput): Promise<ProviderCheckoutResult> {
    if (
      !paymentRuntimeConfig.mvpModeEnabled &&
      (!input.allocations?.length || input.allocations.length !== input.sellerIds.length)
    ) {
      throw new Error("PayPal requires a verified payee allocation for every seller");
    }
    const purchaseUnits = paymentRuntimeConfig.mvpModeEnabled
      ? [{
          reference_id: input.orderId,
          custom_id: input.orderId,
          invoice_id: input.orderId,
          amount: {
            currency_code: input.amount.currency,
            value: minorToDecimal(input.amount.amountMinor),
          },
        }]
      : input.allocations!.map((allocation) => ({
      reference_id: `${input.orderId}:${allocation.sellerId}`,
      custom_id: input.orderId,
      invoice_id: `${input.orderId}-${allocation.sellerId}`,
      payee: { merchant_id: allocation.providerAccountId },
      amount: {
        currency_code: allocation.amount.currency,
        value: minorToDecimal(allocation.amount.amountMinor),
      },
      payment_instruction: {
        disbursement_mode: "DELAYED",
        ...(BigInt(allocation.platformFeeMinor) > BigInt(0)
          ? {
              platform_fees: [
                {
                  amount: {
                    currency_code: allocation.amount.currency,
                    value: minorToDecimal(allocation.platformFeeMinor),
                  },
                },
              ],
            }
          : {}),
      },
        }));
    const order = await paypalApi<PayPalOrder>(
      "/v2/checkout/orders",
      {
        method: "POST",
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: purchaseUnits,
          payment_source: {
            paypal: {
              experience_context: {
                return_url: `${input.returnBaseUrl}/api/payments/returns/paypal?attemptId=${encodeURIComponent(input.attemptId)}`,
                cancel_url: `${input.returnBaseUrl}/payment/${encodeURIComponent(input.attemptId)}/cancelled`,
                user_action: "PAY_NOW",
              },
            },
          },
        }),
      },
      partnerHeaders(input.idempotencyReference),
    );
    const approval = order.links?.find((link) => link.rel === "payer-action" || link.rel === "approve");
    if (!approval) throw new Error("PayPal did not return a buyer approval URL");
    return {
      providerPaymentId: order.id,
      providerSessionId: order.id,
      responseFingerprint: fingerprint({ id: order.id, status: order.status }),
      nextAction: { type: "redirect", url: approval.href },
    };
  }

  async completeCheckout(
    providerSessionId: string,
    idempotencyReference: string,
  ): Promise<VerifiedProviderPayment> {
    const order = await paypalApi<PayPalOrder>(
      `/v2/checkout/orders/${encodeURIComponent(providerSessionId)}/capture`,
      { method: "POST", body: "{}" },
      partnerHeaders(`${idempotencyReference}:capture`),
    );
    const payment = normalizeOrder(order);
    if (!payment) throw new Error("PayPal capture response could not be verified");
    return payment;
  }

  async retrievePayment(reference: string): Promise<VerifiedProviderPayment | undefined> {
    const order = await paypalApi<PayPalOrder>(
      `/v2/checkout/orders/${encodeURIComponent(reference)}`,
      undefined,
      partnerHeaders(),
    );
    return normalizeOrder(order);
  }

  async retrieveByMerchantReference(): Promise<VerifiedProviderPayment | undefined> {
    return undefined;
  }

  async verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<NormalizedProviderEvent> {
    const event = JSON.parse(rawBody.toString("utf8")) as {
      id?: string;
      event_type?: string;
      create_time?: string;
      resource?: {
        id?: string;
        supplementary_data?: { related_ids?: { order_id?: string } };
      };
    };
    if (!event.id || !event.event_type) throw new Error("Malformed PayPal webhook event");
    const scalarHeaders = Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [
        key,
        Array.isArray(value) ? value[0] : value,
      ]),
    );
    if (!(await verifyPayPalWebhook(scalarHeaders, event))) {
      throw new Error("Invalid PayPal webhook signature");
    }
    const orderReference =
      event.resource?.supplementary_data?.related_ids?.order_id ?? event.resource?.id;
    return {
      provider: "paypal",
      providerEventId: event.id,
      eventType: event.event_type,
      occurredAt: event.create_time ? new Date(event.create_time) : new Date(),
      payment: orderReference ? await this.retrievePayment(orderReference) : undefined,
    };
  }

  async createSellerOnboarding(
    input: SellerOnboardingInput,
  ): Promise<SellerOnboardingResult> {
    const partnerId = process.env.PAYPAL_PARTNER_MERCHANT_ID;
    if (!partnerId) throw new Error("PAYPAL_PARTNER_MERCHANT_ID is not configured");
    const referral = await paypalApi<{ links?: PayPalLink[] }>(
      `/v2/customer/partner-referrals`,
      {
        method: "POST",
        body: JSON.stringify({
          tracking_id: input.sellerId,
          partner_config_override: {
            return_url: input.returnUrl,
            return_url_description: "Return to AgriConnect seller payment settings",
          },
          operations: [
            {
              operation: "API_INTEGRATION",
              api_integration_preference: {
                rest_api_integration: {
                  integration_method: "PAYPAL",
                  integration_type: "THIRD_PARTY",
                  third_party_details: {
                    features: [
                      "PAYMENT",
                      "REFUND",
                      "PARTNER_FEE",
                      "DELAY_FUNDS_DISBURSEMENT",
                    ],
                  },
                },
              },
            },
          ],
          products: ["EXPRESS_CHECKOUT"],
          legal_consents: [{ type: "SHARE_DATA_CONSENT", granted: true }],
        }),
      },
      partnerHeaders(`onboard:${input.sellerId}`),
    );
    const action = referral.links?.find((link) => link.rel === "action_url");
    if (!action) throw new Error("PayPal did not return a seller onboarding URL");
    return {
      providerAccountId: input.providerAccountId ?? `pending:${input.sellerId}`,
      redirectUrl: action.href,
    };
  }

  async refreshSellerAccount(providerAccountId: string): Promise<VerifiedSellerAccount> {
    const partnerId = process.env.PAYPAL_PARTNER_MERCHANT_ID;
    if (!partnerId) throw new Error("PAYPAL_PARTNER_MERCHANT_ID is not configured");
    const merchant = await paypalApi<{
      merchant_id?: string;
      country?: string;
      primary_email_confirmed?: boolean;
      payments_receivable?: boolean;
      products?: Array<{ name?: string; vetting_status?: string }>;
      capabilities?: Array<{ name?: string; status?: string }>;
    }>(
      `/v1/customer/partners/${encodeURIComponent(partnerId)}/merchant-integrations/${encodeURIComponent(providerAccountId)}`,
      undefined,
      partnerHeaders(),
    );
    const capabilityMap = Object.fromEntries(
      (merchant.capabilities ?? []).map((capability) => [
        capability.name ?? "unknown",
        capability.status === "ACTIVE",
      ]),
    );
    const required = ["PAYMENT", "REFUND", "DELAY_FUNDS_DISBURSEMENT"];
    const active =
      merchant.payments_receivable === true &&
      merchant.primary_email_confirmed === true &&
      required.every((capability) => capabilityMap[capability] === true);
    const now = new Date();
    return {
      providerAccountId: merchant.merchant_id ?? providerAccountId,
      status: active ? "active" : "restricted",
      country: merchant.country,
      currencies: [],
      capabilities: capabilityMap,
      kycComplete: merchant.products?.every((product) => product.vetting_status === "SUBSCRIBED") ?? false,
      verifiedAt: now,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      remediation: active ? undefined : ["Complete PayPal seller onboarding and required capabilities"],
    };
  }

  async createTransfer(input: ProviderTransferInput): Promise<ProviderTransferResult> {
    if (!input.holdUntil) throw new Error("PayPal delayed disbursement requires a release deadline");
    const maximum = Date.now() + maximumDelayedDisbursementDays * 24 * 60 * 60 * 1000;
    if (input.holdUntil.getTime() > maximum) {
      throw new Error("PayPal seller release cannot exceed 28 days from capture");
    }
    const order = await paypalApi<PayPalOrder>(
      `/v2/checkout/orders/${encodeURIComponent(input.providerPaymentId)}`,
      undefined,
      partnerHeaders(),
    );
    const capture = order.purchase_units
      ?.find((unit) => unit.reference_id?.endsWith(`:${input.sellerId}`))
      ?.payments?.captures?.[0];
    if (!capture?.id) throw new Error("PayPal seller capture reference was not found");
    const payout = await paypalApi<{ payout_item_id?: string; transaction_status?: string }>(
      "/v1/payments/referenced-payouts-items",
      {
        method: "POST",
        body: JSON.stringify({
          reference_id: capture.id,
          reference_type: "TRANSACTION_ID",
        }),
      },
      partnerHeaders(input.idempotencyReference),
    );
    if (!payout.payout_item_id) throw new Error("PayPal did not return a payout reference");
    return {
      providerTransferId: payout.payout_item_id,
      status: payout.transaction_status === "SUCCESS" ? "succeeded" : "pending",
    };
  }

  async retrieveTransfer(providerTransferId: string): Promise<VerifiedProviderTransfer> {
    const payout = await paypalApi<{
      payout_item_id?: string;
      transaction_status?: string;
    }>(
      `/v1/payments/referenced-payouts-items/${encodeURIComponent(providerTransferId)}`,
      undefined,
      partnerHeaders(),
    );
    return {
      providerTransferId: payout.payout_item_id ?? providerTransferId,
      status:
        payout.transaction_status === "SUCCESS"
          ? "succeeded"
          : ["FAILED", "BLOCKED", "RETURNED", "REFUNDED"].includes(
                payout.transaction_status ?? "",
              )
            ? "failed"
            : "pending",
    };
  }

  async refundPayment(input: ProviderRefundInput): Promise<ProviderRefundResult> {
    const order = await paypalApi<PayPalOrder>(
      `/v2/checkout/orders/${encodeURIComponent(input.providerPaymentId)}`,
      undefined,
      partnerHeaders(),
    );
    const units = input.sellerId
      ? order.purchase_units?.filter((unit) => unit.reference_id?.endsWith(`:${input.sellerId}`))
      : order.purchase_units;
    const captures = (units ?? []).flatMap((unit) => unit.payments?.captures ?? []);
    if (!captures.length) throw new Error("PayPal captures were not found for this refund");
    const requested = BigInt(input.amount.amountMinor);
    const capturedTotal = captures.reduce(
      (sum, capture) => sum + BigInt(decimalToMinor(capture.amount?.value ?? "0")),
      BigInt(0),
    );
    if (captures.length > 1 && requested !== capturedTotal) {
      throw new Error("Partial PayPal refunds must target one seller allocation");
    }
    const refunds = [];
    for (const capture of captures) {
      const refund = await paypalApi<{ id?: string; status?: string }>(
        `/v2/payments/captures/${encodeURIComponent(capture.id)}/refund`,
        {
          method: "POST",
          body: JSON.stringify({
            ...(captures.length === 1
              ? {
                  amount: {
                    currency_code: input.amount.currency,
                    value: minorToDecimal(input.amount.amountMinor),
                  },
                }
              : {}),
            note_to_payer: input.reason?.slice(0, 255),
          }),
        },
        partnerHeaders(`${input.idempotencyReference}:${capture.id}`),
      );
      if (!refund.id) throw new Error("PayPal did not return a refund reference");
      refunds.push(refund);
    }
    const ids = refunds.map((refund) => refund.id!);
    return {
      providerRefundId: ids.length === 1 ? ids[0] : `paypal_multi_${fingerprint(ids).slice(0, 32)}`,
      providerRefundIds: ids,
      status: refunds.every((refund) => refund.status === "COMPLETED")
        ? "succeeded"
        : refunds.some((refund) => refund.status === "FAILED")
          ? "failed"
          : "pending",
    };
  }

  async retrieveRefund(providerRefundId: string): Promise<VerifiedProviderRefund> {
    const refund = await paypalApi<{
      id: string;
      status?: string;
      amount?: { currency_code?: string; value?: string };
    }>(
      `/v2/payments/refunds/${encodeURIComponent(providerRefundId)}`,
      undefined,
      partnerHeaders(),
    );
    if (!refund.amount?.currency_code || !refund.amount.value) {
      throw new Error("PayPal refund response is missing its verified amount");
    }
    const currency = refund.amount.currency_code.toUpperCase();
    if (currency !== "GBP" && currency !== "INR") {
      throw new Error("Unsupported PayPal refund currency");
    }
    return {
      providerRefundId: refund.id,
      amount: { currency, amountMinor: decimalToMinor(refund.amount.value) },
      status:
        refund.status === "COMPLETED"
          ? "succeeded"
          : ["FAILED", "CANCELLED"].includes(refund.status ?? "")
            ? "failed"
            : "pending",
    };
  }

  async inspectPlatform(expectedWebhookUrl: string): Promise<ProviderPlatformInspection> {
    const response = await paypalApi<{
      webhooks?: Array<{ id?: string; url?: string }>;
    }>("/v1/notifications/webhooks", undefined, partnerHeaders());
    const configuredId = process.env.PAYPAL_WEBHOOK_ID;
    const registered = (response.webhooks ?? []).some(
      (webhook) =>
        webhook.url === expectedWebhookUrl &&
        (!configuredId || webhook.id === configuredId),
    );
    return {
      authenticated: true,
      webhookRegistration: registered ? "verified" : "missing",
      accountReference: process.env.PAYPAL_PARTNER_MERCHANT_ID,
    };
  }
}
