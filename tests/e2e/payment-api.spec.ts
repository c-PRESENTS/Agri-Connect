import { expect, test } from "@playwright/test";

/**
 * Payment API safety checks intentionally require no payment-provider keys and
 * do not create orders. They verify that public browser requests cannot turn
 * an order into a paid order, and that unsigned webhooks are rejected before
 * provider logic runs. Set RUN_PAYMENT_API_E2E=true against a running app.
 */
test.describe("payment API security boundaries", () => {
  test("payment creation and verification endpoints require a buyer session", async ({ request }) => {
    const protectedRequests = [
      request.post("/api/orders", { data: {} }),
      request.get("/api/payments/methods"),
      request.post("/api/checkout/quotes", { data: {} }),
      request.get("/api/checkout/quotes/00000000-0000-0000-0000-000000000000"),
      request.post("/api/checkout/intents", { data: {} }),
      request.post("/api/checkout/cash-orders", { data: {} }),
      request.get("/api/payments/seller/cash-preferences"),
      request.patch("/api/payments/seller/cash-preferences", { data: {} }),
      request.get("/api/payments/buyer/transactions"),
      request.get("/api/payments/seller/balance"),
      request.get("/api/payments/operator/providers/readiness"),
    ];

    for (const response of await Promise.all(protectedRequests)) {
      expect(response.status()).toBe(401);
    }
  });

  test("unsigned provider webhooks are rejected", async ({ request }) => {
    const stripe = await request.post("/api/webhooks/payments/stripe", {
      headers: { "content-type": "application/json" },
      data: { type: "checkout.session.completed", data: { object: {} } },
    });
    expect(stripe.status()).toBe(401);

    const paypal = await request.post("/api/webhooks/payments/paypal", {
      headers: { "content-type": "application/json" },
      data: { event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: "capture_untrusted" } },
    });
    expect(paypal.status()).toBe(401);

    const razorpay = await request.post("/api/webhooks/payments/razorpay", {
      headers: { "content-type": "application/json" },
      data: { event: "payment.captured", payload: { payment: { entity: { id: "pay_untrusted", order_id: "order_untrusted", status: "captured" } } } },
    });
    expect(razorpay.status()).toBe(401);
  });

  test("webhook routing rejects unknown providers and invalid content types", async ({ request }) => {
    const unknown = await request.post("/api/webhooks/payments/not-a-provider", {
      headers: { "content-type": "application/json" },
      data: {},
    });
    expect(unknown.status()).toBe(404);

    const invalidContentType = await request.post("/api/webhooks/payments/stripe", {
      headers: { "content-type": "text/plain" },
      data: "{}",
    });
    expect(invalidContentType.status()).toBe(415);
  });

  test("a browser redirect URL cannot confirm payment", async ({ request }) => {
    const response = await request.get("/payment/success?session_id=cs_untrusted");
    expect(response.ok()).toBeTruthy();

    // The redirect only renders the client route. It never calls a payment
    // confirmation API; confirmation remains behind authenticated, signed or
    // provider-verified server endpoints tested above.
    const html = await response.text();
    expect(html).not.toContain("payment.stripe_verified");
  });
});
