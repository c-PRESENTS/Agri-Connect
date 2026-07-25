import { paymentRepository } from "../repositories/payment-repository";
import { providerRegistry } from "./provider-registry";
import { paymentStateService } from "./payment-state-service";
import type { ProviderName } from "./types";
import { paymentMetrics } from "./observability";
import { protectedFundsService } from "./protected-funds-service";

export class ReconciliationService {
  async reconcileAttempt(attemptId: string): Promise<boolean> {
    const attempt = await paymentRepository.getAttempt(attemptId);
    const provider = attempt?.provider as ProviderName | undefined;
    if (!attempt || !provider || !providerRegistry.has(provider)) return false;
    if (attempt.paymentStatus === "succeeded") {
      await protectedFundsService.ensureAllocations(attempt.id);
      return true;
    }
    if (attempt.paymentStatus === "refunded") return true;
    await paymentRepository.markReconciliationPending(attempt.id);
    const adapter = providerRegistry.get(provider);
    let payment = attempt.providerPaymentId
      ? await adapter.retrievePayment(attempt.providerPaymentId)
      : await adapter.retrieveByMerchantReference(attempt.idempotencyReference);
    if (
      !payment &&
      !attempt.providerPaymentId &&
      ["started", "outcome_unknown"].includes(attempt.providerCallStatus)
    ) {
      const capabilities = await adapter.capabilities();
      if (capabilities.supportsIdempotentPaymentCreation) {
        const replayInput = await paymentRepository.getReconciliationCheckoutInput(attempt.id);
        if (replayInput) {
          const replay = await adapter.createCheckout(replayInput);
          await paymentRepository.persistProviderResult(attempt.id, {
            providerCallStatus: "completed",
            providerPaymentId: replay.providerPaymentId,
            providerSessionId: replay.providerSessionId,
            responseFingerprint: replay.responseFingerprint,
          });
          payment = await adapter.retrievePayment(replay.providerPaymentId);
        }
      }
    }
    if (!payment) {
      paymentMetrics.increment("reconciliations", provider, "not_found");
      return false;
    }
    await paymentStateService.applyVerifiedPayment(attempt, payment);
    paymentMetrics.increment("reconciliations", provider, "resolved");
    return true;
  }
}

export const reconciliationService = new ReconciliationService();
