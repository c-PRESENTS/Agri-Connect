import { paymentRepository } from "../repositories/payment-repository";
import { providerRegistry } from "./provider-registry";
import type { ProviderCheckoutInput, ProviderCheckoutResult, ProviderName } from "./types";

export class PaymentService {
  async executeProviderCall(
    provider: ProviderName,
    input: ProviderCheckoutInput,
    leaseOwner: string,
  ): Promise<ProviderCheckoutResult> {
    const started = await paymentRepository.markProviderCallStarted(
      input.attemptId,
      leaseOwner,
      new Date(Date.now() + 60_000),
    );
    if (!started) throw new Error("Payment attempt is not queued or no longer exists");

    try {
      const result = await providerRegistry.get(provider).createCheckout(input);
      await paymentRepository.persistProviderResult(input.attemptId, {
        providerCallStatus: "completed",
        providerPaymentId: result.providerPaymentId,
        providerSessionId: result.providerSessionId,
        responseFingerprint: result.responseFingerprint,
      });
      return result;
    } catch (error) {
      const outcomeUnknown =
        typeof error === "object" && error !== null && "outcomeUnknown" in error;
      await paymentRepository.persistProviderResult(input.attemptId, {
        providerCallStatus: outcomeUnknown ? "outcome_unknown" : "failed",
        paymentStatus: outcomeUnknown ? "processing" : "failed",
        failureCode: outcomeUnknown ? "provider_outcome_unknown" : "provider_call_failed",
      });
      if (outcomeUnknown) await paymentRepository.markReconciliationPending(input.attemptId);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
