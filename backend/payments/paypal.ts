type PayPalOrder = { id: string; status: string; purchase_units?: Array<{ payments?: { captures?: Array<{ id: string; status: string }> } }> };

export const paypalBaseUrl = () => process.env.PAYPAL_ENV === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

function credentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("PayPal sandbox credentials are not configured");
  return { clientId, clientSecret };
}

export async function getPayPalAccessToken(): Promise<string> {
  const { clientId, clientSecret } = credentials();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) {
    throw Object.assign(new Error("PayPal authentication failed"), {
      providerStatus: response.status,
      code: "invalid_client",
    });
  }
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new Error("PayPal did not return an access token");
  return body.access_token;
}

export async function paypalApi<T>(
  path: string,
  init: RequestInit = {},
  additionalHeaders: Record<string, string> = {},
): Promise<T> {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${paypalBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...additionalHeaders,
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const requestId = response.headers.get("paypal-debug-id");
    const error = new Error(`PayPal API request failed (${response.status})`);
    Object.assign(error, {
      providerStatus: response.status,
      providerRequestId: requestId,
      outcomeUnknown: response.status >= 500,
    });
    throw error;
  }
  return response.json() as Promise<T>;
}

export async function createPayPalOrder(orderId: string, amount: number, currency = "GBP"): Promise<PayPalOrder> {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `agriconnect-${orderId}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ reference_id: orderId, custom_id: orderId, invoice_id: orderId, amount: { currency_code: currency, value: amount.toFixed(2) } }],
    }),
  });
  if (!response.ok) throw new Error("PayPal order creation failed");
  return response.json() as Promise<PayPalOrder>;
}

export async function capturePayPalOrder(paypalOrderId: string, orderId: string): Promise<PayPalOrder> {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "PayPal-Request-Id": `agriconnect-capture-${orderId}` },
  });
  if (!response.ok) throw new Error("PayPal capture failed");
  return response.json() as Promise<PayPalOrder>;
}

export function getPayPalCapture(result: PayPalOrder): { id: string; status: string } | undefined {
  return result.purchase_units?.flatMap((unit) => unit.payments?.captures ?? []).at(0);
}

export async function refundPayPalCapture(captureId: string, orderId: string): Promise<string> {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${paypalBaseUrl()}/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "PayPal-Request-Id": `agriconnect-refund-${orderId}` },
  });
  if (!response.ok) throw new Error("PayPal refund failed");
  const body = await response.json() as { id?: string; status?: string };
  if (!body.id || !["COMPLETED", "PENDING"].includes(body.status ?? "")) throw new Error("PayPal refund was not accepted");
  return body.id;
}

export async function verifyPayPalWebhook(headers: Record<string, string | undefined>, event: unknown): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  const token = await getPayPalAccessToken();
  const response = await fetch(`${paypalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: webhookId,
      webhook_event: event,
    }),
  });
  if (!response.ok) return false;
  return (await response.json() as { verification_status?: string }).verification_status === "SUCCESS";
}
