import { createHmac, timingSafeEqual } from "crypto";
import type { Express } from "express";
import { z } from "zod";
import { paymentRepository } from "../../repositories/payment-repository";
import { paymentStateService } from "../../payments/payment-state-service";

const providerSchema = z.enum(["stripe", "paypal", "razorpay", "mock"]);
const mockEventSchema = z.object({
  id: z.string().min(1).max(255),
  type: z.literal("payment.updated"),
  providerPaymentId: z.string().min(1),
});
const replayWindowSeconds = 5 * 60;

function verifyMock(rawBody: Buffer, timestamp: string | undefined, signature: string | undefined): boolean {
  if (process.env.NODE_ENV === "production" || !timestamp || !signature) return false;
  const numericTimestamp = Number(timestamp);
  if (!Number.isFinite(numericTimestamp) || Math.abs(Date.now() / 1000 - numericTimestamp) > replayWindowSeconds) return false;
  const secret = process.env.PAYMENT_MOCK_WEBHOOK_SECRET || "local-mock-webhook-secret";
  const expected = createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody).digest("hex");
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function registerPaymentWebhookRoutes(app: Express): void {
  app.post("/api/webhooks/payments/:provider", async (req, res) => {
    const parsedProvider = providerSchema.safeParse(req.params.provider);
    if (!parsedProvider.success) return res.status(404).json({ error: "Unknown payment provider" });
    if (parsedProvider.data !== "mock") {
      return res.status(503).json({ error: "Provider webhook is not activated in the new payment architecture" });
    }
    const rawBody = req.rawBody;
    if (!Buffer.isBuffer(rawBody)) return res.status(400).json({ error: "Raw webhook body is required" });
    if (!verifyMock(rawBody, req.get("x-agri-mock-timestamp"), req.get("x-agri-mock-signature"))) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }
    let event: z.infer<typeof mockEventSchema>;
    try {
      event = mockEventSchema.parse(JSON.parse(rawBody.toString("utf8")));
    } catch {
      return res.status(400).json({ error: "Malformed webhook event" });
    }
    const inserted = await paymentRepository.recordWebhookEvent({
      provider: "mock",
      providerEventId: event.id,
      payloadHash: createHmac("sha256", "payload-hash").update(rawBody).digest("hex"),
      eventType: event.type,
      processingStatus: "received",
      normalizedData: event,
    });
    if (!inserted) return res.status(200).json({ duplicate: true });
    const attempt = await paymentRepository.getAttemptByProviderPayment("mock", event.providerPaymentId);
    if (!attempt) return res.status(202).json({ accepted: true, pendingMatch: true });
    const { providerRegistry } = await import("../../payments/provider-registry");
    const payment = await providerRegistry.get("mock").retrievePayment(event.providerPaymentId);
    if (payment) await paymentStateService.applyVerifiedPayment(attempt, payment);
    res.status(200).json({ received: true });
  });
}
