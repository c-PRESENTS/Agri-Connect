import { createHmac, timingSafeEqual } from "crypto";

export function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay test credentials are not configured");
  return { keyId, keySecret };
}

export async function razorpayApi<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { keyId, keySecret } = getRazorpayCredentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const error = new Error(`Razorpay API request failed (${response.status})`);
    Object.assign(error, {
      providerStatus: response.status,
      outcomeUnknown: response.status >= 500,
    });
    throw error;
  }
  return response.json() as Promise<T>;
}

function signature(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function matches(expected: string, received: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createRazorpayOrder(orderId: string, amount: number, currency = "GBP") {
  const { keyId, keySecret } = getRazorpayCredentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: Math.round(amount * 100), currency, receipt: orderId, notes: { orderId } }),
  });
  if (!response.ok) throw new Error("Razorpay order creation failed");
  return response.json() as Promise<{ id: string; amount: number; currency: string; status: string }>;
}

export async function getRazorpayPayment(paymentId: string) {
  const { keyId, keySecret } = getRazorpayCredentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Basic ${auth}` } });
  if (!response.ok) throw new Error("Razorpay payment lookup failed");
  return response.json() as Promise<{ id: string; order_id: string; status: string; amount: number; currency: string }>;
}

export async function refundRazorpayPayment(paymentId: string): Promise<string> {
  const { keyId, keySecret } = getRazorpayCredentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Razorpay refund failed");
  const body = await response.json() as { id?: string; status?: string };
  if (!body.id || !["processed", "pending"].includes(body.status ?? "")) throw new Error("Razorpay refund was not accepted");
  return body.id;
}

export function verifyRazorpayPayment(orderId: string, paymentId: string, receivedSignature: string): boolean {
  return matches(signature(`${orderId}|${paymentId}`, getRazorpayCredentials().keySecret), receivedSignature);
}

export function verifyRazorpayWebhook(rawBody: Buffer, receivedSignature: string | undefined): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  return Boolean(secret && receivedSignature && matches(signature(rawBody.toString("utf8"), secret), receivedSignature));
}
