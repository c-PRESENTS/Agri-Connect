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
  const response = await apiRequest("POST", "/api/checkout/quotes", { currency: "GBP", ...input });
  return response.json() as Promise<{ id: string }>;
}

export async function createMockCheckoutIntent(
  quoteId: string,
  deliveryAddress: string,
  idempotencyKey: string,
) {
  const response = await fetch("/api/checkout/intents", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ quoteId, provider: "mock", deliveryAddress, scenario: "success" }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Could not start protected payment");
  return body as { orderId: string; attemptId: string; nextAction: { type: string } };
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
