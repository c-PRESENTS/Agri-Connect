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
      request.post("/api/stripe/create-checkout-session", { data: {} }),
      request.post("/api/paypal/orders/not-a-real-order", { data: {} }),
      request.post("/api/paypal/orders/not-a-real-provider-order/capture", { data: {} }),
      request.post("/api/razorpay/orders/not-a-real-order", { data: {} }),
      request.post("/api/razorpay/verify", {
        data: {
          razorpay_order_id: "order_untrusted",
          razorpay_payment_id: "pay_untrusted",
          razorpay_signature: "untrusted",
        },
      }),
    ];

    for (const response of await Promise.all(protectedRequests)) {
      expect(response.status()).toBe(401);
    }
  });

  test("unsigned provider webhooks are rejected", async ({ request }) => {
    const stripe = await request.post("/api/stripe/webhook", {
      headers: { "content-type": "application/json" },
      data: { type: "checkout.session.completed", data: { object: {} } },
    });
    expect(stripe.status()).toBe(400);

    const paypal = await request.post("/api/paypal/webhook", {
      headers: { "content-type": "application/json" },
      data: { event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: "capture_untrusted" } },
    });
    expect([400, 500]).toContain(paypal.status());

    const razorpay = await request.post("/api/razorpay/webhook", {
      headers: { "content-type": "application/json" },
      data: { event: "payment.captured", payload: { payment: { entity: { id: "pay_untrusted", order_id: "order_untrusted", status: "captured" } } } },
    });
    expect([400, 500]).toContain(razorpay.status());
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
