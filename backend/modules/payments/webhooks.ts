import { createHash } from "crypto";
import type { Express } from "express";
import { z } from "zod";
import { paymentRepository } from "../../repositories/payment-repository";
import { paymentStateService } from "../../payments/payment-state-service";
import { providerRegistry } from "../../payments/provider-registry";
import { paymentOperationsRepository } from "../../repositories/payment-operations-repository";
import { paymentMetrics } from "../../payments/observability";
import { logPaymentFailure, paymentErrorCode } from "../../payments/security";
import { storage } from "../../storage";

const providerSchema = z.enum(["stripe", "paypal", "razorpay", "mock"]);

export function registerPaymentWebhookRoutes(app: Express): void {
  app.post("/api/webhooks/payments/:provider", async (req, res) => {
    const parsedProvider = providerSchema.safeParse(req.params.provider);
    if (!parsedProvider.success) return res.status(404).json({ error: "Unknown payment provider" });
    const provider = parsedProvider.data;
    if (!providerRegistry.has(provider)) {
      return res.status(503).json({ error: "Provider webhook is not activated" });
    }
    const rawBody = req.rawBody;
    if (!Buffer.isBuffer(rawBody)) return res.status(400).json({ error: "Raw webhook body is required" });
    const adapter = providerRegistry.get(provider);
    if (!adapter.verifyWebhook) return res.status(503).json({ error: "Provider webhook is not configured" });
    let event;
    try {
      event = await adapter.verifyWebhook(rawBody, req.headers);
    } catch (error) {
      paymentMetrics.increment("webhooks", provider, "rejected");
      const sourceFingerprint = createHash("sha256")
        .update(req.ip || "unknown")
        .digest("hex")
        .slice(0, 16);
      await paymentOperationsRepository.recordProviderHealthEvent({
        provider,
        evidenceSource: "untrusted_inbound_request",
        trusted: false,
        eventType: "webhook_request_rejected",
        details: { errorCode: paymentErrorCode(error), sourceFingerprint },
      }).catch(() => undefined);
      logPaymentFailure("webhook rejected", error, { provider, sourceFingerprint });
      return res.status(401).json({ error: "Invalid webhook request" });
    }
    const now = Date.now();
    if (!Number.isFinite(event.occurredAt.getTime())) {
      paymentMetrics.increment("webhooks", provider, "timestamp_rejected");
      await paymentOperationsRepository.recordProviderHealthEvent({
        provider,
        evidenceSource: "untrusted_inbound_request",
        trusted: false,
        eventType: "webhook_timestamp_rejected",
      }).catch(() => undefined);
      return res.status(400).json({ error: "Webhook timestamp is invalid" });
    }
    if (
      event.occurredAt.getTime() > now + 5 * 60_000 ||
      event.occurredAt.getTime() < now - 7 * 24 * 60 * 60_000
    ) {
      paymentMetrics.increment("webhooks", provider, "timestamp_rejected");
      await paymentOperationsRepository.recordProviderHealthEvent({
        provider,
        evidenceSource: "untrusted_inbound_request",
        trusted: false,
        eventType: "webhook_timestamp_rejected",
      }).catch(() => undefined);
      return res.status(400).json({ error: "Webhook timestamp is outside the accepted window" });
    }
    const recorded = await paymentRepository.recordWebhookEvent({
      provider,
      providerEventId: event.providerEventId,
      payloadHash: createHash("sha256").update(rawBody).digest("hex"),
      eventType: event.eventType,
      processingStatus: "received",
      normalizedData: event,
    });
    if (recorded === "duplicate") {
      paymentMetrics.increment("webhooks", provider, "duplicate");
      return res.status(200).json({ duplicate: true });
    }
    if (recorded === "conflict") {
      paymentMetrics.increment("webhooks", provider, "replay_conflict");
      await paymentOperationsRepository.recordProviderHealthEvent({
        provider,
        evidenceSource: "untrusted_inbound_request",
        trusted: false,
        eventType: "webhook_replay_payload_conflict",
        details: { providerEventId: event.providerEventId },
      }).catch(() => undefined);
      return res.status(409).json({ error: "Webhook event payload conflict" });
    }
    await paymentOperationsRepository.markWebhookVerified(provider, event.occurredAt);
    if (!event.payment) {
      await paymentRepository.markWebhookEventProcessed(provider, event.providerEventId, "ignored");
      paymentMetrics.increment("webhooks", provider, "ignored");
      return res.status(202).json({ accepted: true, noPaymentState: true });
    }
    try {
      let attempt = await paymentRepository.getAttemptByProviderPayment(
        provider,
        event.payment.providerPaymentId,
      );
      if (!attempt && event.providerSessionId) {
        attempt = await paymentRepository.getAttemptByProviderSession(
          provider,
          event.providerSessionId,
        );
        if (attempt) {
          attempt =
            (await paymentRepository.replaceProviderPaymentReference(
              attempt.id,
              event.payment.providerPaymentId,
            )) ?? attempt;
        }
      }
      if (!attempt) {
        const internalOrder = await storage.getOrder(event.payment.orderId);
        if (!internalOrder) {
          await paymentRepository.markWebhookEventProcessed(
            provider,
            event.providerEventId,
            "ignored",
          );
          paymentMetrics.increment("webhooks", provider, "unmatched_external_event");
          return res.status(202).json({ accepted: true, ignored: true });
        }
        await paymentRepository.markWebhookEventProcessed(
          provider,
          event.providerEventId,
          "pending_match",
        );
        paymentMetrics.increment("webhooks", provider, "pending_match");
        return res.status(500).json({ error: "Webhook is awaiting payment reconciliation" });
      }
      await paymentStateService.applyVerifiedPayment(attempt, event.payment);
      await paymentRepository.markWebhookEventProcessed(provider, event.providerEventId, "processed");
      paymentMetrics.increment("webhooks", provider, "processed");
      return res.status(200).json({ received: true });
    } catch (error) {
      paymentMetrics.increment("webhooks", provider, "processing_failed");
      logPaymentFailure("verified webhook processing failed", error, {
        provider,
        providerEventId: event.providerEventId,
      });
      return res.status(500).json({ error: "Verified webhook processing failed" });
    }
  });
}
