import { paymentRepository } from "../repositories/payment-repository";
import { providerRegistry } from "./provider-registry";
import { paymentStateService } from "./payment-state-service";

export class ReconciliationService {
  async reconcileAttempt(attemptId: string): Promise<boolean> {
    const attempt = await paymentRepository.getAttempt(attemptId);
    if (!attempt || !providerRegistry.has(attempt.provider as "mock")) return false;
    if (attempt.paymentStatus === "succeeded" || attempt.paymentStatus === "refunded") return true;
    await paymentRepository.markReconciliationPending(attempt.id);
    const adapter = providerRegistry.get(attempt.provider as "mock");
    const payment = attempt.providerPaymentId
      ? await adapter.retrievePayment(attempt.providerPaymentId)
      : await adapter.retrieveByMerchantReference(attempt.idempotencyReference);
    if (!payment) return false;
    await paymentStateService.applyVerifiedPayment(attempt, payment);
    return true;
  }
}

export const reconciliationService = new ReconciliationService();
