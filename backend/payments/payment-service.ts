import { paymentRepository } from "../repositories/payment-repository";
import { providerRegistry } from "./provider-registry";
import type { ProviderCheckoutInput, ProviderCheckoutResult, ProviderName } from "./types";
import { paymentOperationsRepository } from "../repositories/payment-operations-repository";
import { paymentMetrics } from "./observability";
import { logPaymentFailure, paymentErrorCode } from "./security";

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

    let result: ProviderCheckoutResult;
    try {
      result = await providerRegistry.get(provider).createCheckout(input);
      paymentMetrics.increment("provider_calls", provider, "provider_succeeded");
    } catch (error) {
      const outcomeUnknown =
        typeof error === "object" && error !== null && "outcomeUnknown" in error;
      await paymentRepository.persistProviderResult(input.attemptId, {
        providerCallStatus: outcomeUnknown ? "outcome_unknown" : "failed",
        paymentStatus: outcomeUnknown ? "processing" : "failed",
        failureCode: outcomeUnknown ? "provider_outcome_unknown" : paymentErrorCode(error),
      });
      if (outcomeUnknown) await paymentRepository.markReconciliationPending(input.attemptId);
      paymentMetrics.increment("provider_calls", provider, outcomeUnknown ? "unknown" : "failed");
      logPaymentFailure("provider call failed", error, { provider, attemptId: input.attemptId });
      throw error;
    }

    try {
      await paymentRepository.persistProviderResult(input.attemptId, {
        providerCallStatus: "completed",
        providerPaymentId: result.providerPaymentId,
        providerSessionId: result.providerSessionId,
        responseFingerprint: result.responseFingerprint,
      });
      return result;
    } catch (error) {
      // The provider has succeeded. Never overwrite the financial state as failed
      // merely because the separate persistence transaction was unavailable.
      await paymentRepository.markReconciliationPending(input.attemptId).catch(() => undefined);
      await paymentOperationsRepository.createRecoveryCase(
        "provider_result_unpersisted",
        input.attemptId,
        { provider, idempotencyReference: input.idempotencyReference },
      ).catch(() => undefined);
      paymentMetrics.increment("provider_calls", provider, "result_unpersisted");
      logPaymentFailure("provider result persistence failed", error, {
        provider,
        attemptId: input.attemptId,
      });
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
