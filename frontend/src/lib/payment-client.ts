import { apiRequest } from "@/lib/queryClient";

export interface PaymentAttemptResponse {
  attempt: {
    id: string;
    orderId: string;
    provider: string;
    currency: string;
    amountMinor: string;
    paymentStatus: string;
    providerCallStatus: string;
    reconciliationStatus: string;
  };
  order: {
    id: string;
    orderNumber: string;
    total: number;
    paymentStatus: string;
  };
}

export interface CheckoutQuoteResponse {
  id: string;
  currency: "GBP" | "INR";
  subtotalMinor: string;
  taxMinor: string;
  shippingMinor: string;
  platformFeeMinor: string;
  totalMinor: string;
  expiresAt: string;
  deliveryAddress?: string;
  deliveryAddressStruct?: {
    name: string;
    phone: string;
    email?: string;
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
  };
  deliveryMethod: "standard" | "express" | "pickup";
  shippingChoices: Record<string, { partnerId: string; service: string }>;
  items: Array<{
    productId: string;
    name: string;
    image?: string;
    quantity: number;
    unitPrice: number;
    farmerId: string;
    farmerName: string;
  }>;
}

export interface CheckoutMethodResponse {
  id: "stripe" | "cash" | "razorpay" | "paypal";
  available: boolean;
  reasonCode?: string;
  displayStatus: "available" | "unavailable" | "coming_soon";
  flow: "redirect" | "client_sdk" | "mock" | "manual" | "disabled";
}

export async function createCheckoutQuote(input: {
  currency?: "GBP" | "INR";
  deliveryMethod: "standard" | "express" | "pickup";
  sellerIds: string[];
  shippingChoices: Record<string, { partnerId: string; service: string }>;
  deliveryAddressStruct: {
    name: string;
    phone: string;
    email?: string;
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
  };
}) {
  const response = await apiRequest("POST", "/api/checkout/quotes", input);
  return response.json() as Promise<CheckoutQuoteResponse>;
}

export type CheckoutProvider = "mock" | "stripe" | "paypal" | "razorpay";

export type PaymentClientError = Error & {
  code?: string;
  orderId?: string;
  attemptId?: string;
};

export type CheckoutNextAction =
  | { type: "redirect"; url: string }
  | { type: "mock"; attemptId: string; scenario: string }
  | { type: "wait"; attemptId: string }
  | {
      type: "client_sdk";
      provider: "razorpay";
      attemptId: string;
      providerSessionId: string;
      publicKey: string;
      amount: { currency: string; amountMinor: string };
      description: string;
    };

export async function createCheckoutIntent(
  quoteId: string,
  idempotencyKey: string,
  provider: CheckoutProvider,
  simulatedMethod?: "card" | "razorpay" | "paypal",
) {
  const response = await fetch("/api/checkout/intents", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({
      quoteId,
      provider,
      ...(provider === "mock"
        ? { scenario: "success", simulatedMethod: simulatedMethod ?? "card" }
        : {}),
    }),
  });
  const body = await response.json();
  if (!response.ok) {
    const error = new Error(
      body.error || "Could not start protected payment",
    ) as PaymentClientError;
    error.code = body.code;
    error.orderId = body.orderId;
    error.attemptId = body.attemptId;
    throw error;
  }
  return body as { orderId: string; attemptId: string; nextAction: CheckoutNextAction };
}

export async function getCheckoutQuote(quoteId: string): Promise<CheckoutQuoteResponse> {
  const response = await fetch(`/api/checkout/quotes/${encodeURIComponent(quoteId)}`, {
    credentials: "include",
  });
  const body = await response.json();
  if (!response.ok) {
    const error = new Error(
      body.error || "Could not load checkout quote",
    ) as PaymentClientError;
    error.code = body.code;
    error.orderId = body.orderId;
    error.attemptId = body.attemptId;
    throw error;
  }
  return body;
}

export async function getCheckoutMethods(
  quoteId: string,
): Promise<{
  currency: "GBP" | "INR";
  mode: "mock" | "sandbox" | "live";
  methods: CheckoutMethodResponse[];
}> {
  const response = await fetch(
    `/api/payments/methods?quoteId=${encodeURIComponent(quoteId)}`,
    { credentials: "include" },
  );
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Could not load payment methods");
  return body;
}

export async function createCashOrder(
  quoteId: string,
  idempotencyKey: string,
): Promise<{ orderId: string; replayed: boolean }> {
  const response = await fetch("/api/checkout/cash-orders", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ quoteId }),
  });
  const body = await response.json();
  if (!response.ok) {
    const error = new Error(
      body.error || "Could not place cash order",
    ) as PaymentClientError;
    error.code = body.code;
    error.orderId = body.orderId;
    error.attemptId = body.attemptId;
    throw error;
  }
  return body;
}

function loadRazorpayCheckout(): Promise<void> {
  if ("Razorpay" in window) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Razorpay Checkout could not be loaded"));
    document.head.appendChild(script);
  });
}

export async function followCheckoutNextAction(
  action: CheckoutNextAction,
): Promise<"processing" | "navigated"> {
  if (action.type === "redirect") {
    window.location.assign(action.url);
    return "navigated";
  }
  if (action.type !== "client_sdk") return "processing";
  await loadRazorpayCheckout();
  const RazorpayConstructor = (
    window as typeof window & {
      Razorpay: new (options: Record<string, unknown>) => { open(): void };
    }
  ).Razorpay;
  await new Promise<void>((resolve, reject) => {
    const checkout = new RazorpayConstructor({
      key: action.publicKey,
      amount: action.amount.amountMinor,
      currency: action.amount.currency,
      order_id: action.providerSessionId,
      name: "AgriConnect",
      description: action.description,
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const confirmation = await fetch(
            `/api/payments/attempts/${encodeURIComponent(action.attemptId)}/client-confirmation`,
            {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                providerPaymentId: response.razorpay_payment_id,
                providerSessionId: response.razorpay_order_id,
                signature: response.razorpay_signature,
              }),
            },
          );
          if (!confirmation.ok) throw new Error("Razorpay confirmation failed");
          resolve();
        } catch (error) {
          reject(error);
        }
      },
      modal: { ondismiss: () => reject(new Error("Payment was cancelled")) },
    });
    checkout.open();
  });
  return "processing";
}

export async function getPaymentAttempt(attemptId: string): Promise<PaymentAttemptResponse> {
  const response = await fetch(`/api/payments/attempts/${encodeURIComponent(attemptId)}`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Could not load payment status");
  return response.json();
}

export async function cancelPaymentAttempt(attemptId: string): Promise<void> {
  await apiRequest("POST", `/api/payments/attempts/${encodeURIComponent(attemptId)}/cancel`, {});
}
