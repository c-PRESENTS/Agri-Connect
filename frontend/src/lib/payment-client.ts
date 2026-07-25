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

export async function createCheckoutQuote(input: {
  currency: "GBP" | "INR";
  deliveryMethod: "standard" | "express" | "pickup";
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
  return response.json() as Promise<{ id: string }>;
}

export type CheckoutProvider = "mock" | "stripe" | "paypal" | "razorpay";

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
    };

export async function createCheckoutIntent(
  quoteId: string,
  deliveryAddress: string,
  idempotencyKey: string,
  provider: CheckoutProvider,
) {
  const response = await fetch("/api/checkout/intents", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({
      quoteId,
      provider,
      deliveryAddress,
      ...(provider === "mock" ? { scenario: "success" } : {}),
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Could not start protected payment");
  return body as { orderId: string; attemptId: string; nextAction: CheckoutNextAction };
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
      description: "Protected payment",
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
