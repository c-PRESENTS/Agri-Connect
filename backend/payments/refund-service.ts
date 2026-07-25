import { providerRegistry } from "./provider-registry";
import { refundRepository, type PreparedRefund } from "../repositories/refund-repository";
import { storage } from "../storage";
import { logPaymentFailure, paymentErrorCode } from "./security";
import { paymentMetrics } from "./observability";
import { paymentOperationsRepository } from "../repositories/payment-operations-repository";
import { disputeRepository } from "../repositories/dispute-repository";
import { paymentRepository } from "../repositories/payment-repository";
import { protectedFundsService } from "./protected-funds-service";

export class RefundService {
  private async finalizeSucceeded(
    refund: PreparedRefund,
    providerRefundId: string,
  ): Promise<void> {
    const adapter = providerRegistry.get(refund.provider);
    for (const allocation of refund.allocations) {
      if (allocation.previousStatus !== "released" || !allocation.providerTransferId) continue;
      const remainingSellerFunds =
        BigInt(allocation.sellerNetMinor) - BigInt(allocation.refundedMinor);
      const reversalAmount = refund.isPartial
        ? BigInt(refund.amountMinor)
        : remainingSellerFunds;
      if (reversalAmount <= BigInt(0)) continue;
      if (!adapter.reverseTransfer) {
        await refundRepository.createReversalRecovery(
          refund.id,
          allocation.id,
          "provider_transfer_reversal_not_supported",
        );
        continue;
      }
      try {
        const reversal = await adapter.reverseTransfer({
          idempotencyReference: `${refund.idempotencyReference}:reverse:${allocation.id}`,
          providerTransferId: allocation.providerTransferId,
          amount: { currency: refund.currency, amountMinor: reversalAmount.toString() },
        });
        await refundRepository.recordReversal(
          allocation.id,
          reversalAmount.toString(),
          reversal.providerReversalId,
        );
      } catch (error) {
        await refundRepository.createReversalRecovery(
          refund.id,
          allocation.id,
          paymentErrorCode(error),
        );
        logPaymentFailure("refund transfer reversal failed", error, {
          provider: refund.provider,
          refundId: refund.id,
          allocationId: allocation.id,
        });
      }
    }
    if (await refundRepository.isOrderFullyRefunded(refund.orderId)) {
      await storage.markOrderRefunded(
        refund.orderId,
        providerRefundId,
        `Verified refund via ${refund.provider}`,
      );
      await paymentRepository.markAttemptRefunded(refund.paymentAttemptId);
    }
  }

  private async execute(refund: PreparedRefund) {
    const adapter = providerRegistry.get(refund.provider);
    if (!adapter.refundPayment) throw new Error("Provider refunds are not supported");
    const capabilities = await adapter.capabilities();
    if (refund.isPartial && !capabilities.supportsPartialSellerRefund) {
      await refundRepository.failProviderRefund(
        refund,
        "provider_partial_seller_refund_unsupported",
      );
      throw new Error("This provider does not support partial seller refunds");
    }
    const targetAllocation =
      refund.allocations.length === 1 ? refund.allocations[0] : undefined;
    let result;
    try {
      result = await adapter.refundPayment({
        idempotencyReference: refund.idempotencyReference,
        providerPaymentId: refund.providerPaymentId,
        amount: { currency: refund.currency, amountMinor: refund.amountMinor },
        reason: "requested_by_customer",
        sellerId: targetAllocation?.sellerId,
      });
    } catch (error) {
      await refundRepository.failProviderRefund(
        refund,
        paymentErrorCode(error),
      );
      paymentMetrics.increment("refunds", refund.provider, "failed");
      logPaymentFailure("refund provider call failed", error, {
        provider: refund.provider,
        refundId: refund.id,
      });
      throw error;
    }
    if (result.status === "failed") {
      await refundRepository.failProviderRefund(refund, "provider_refund_failed");
      throw new Error("Provider rejected the refund");
    }
    const newlyCompleted = await refundRepository.completeProviderRefund(
      refund,
      result.providerRefundId,
      result.providerRefundIds ?? [result.providerRefundId],
      result.status,
    );
    if (result.status === "succeeded" && newlyCompleted) {
      await this.finalizeSucceeded(refund, result.providerRefundId);
    }
    paymentMetrics.increment("refunds", refund.provider, result.status);
    return {
      id: refund.id,
      status: result.status,
      providerRefundId: result.providerRefundId,
    };
  }

  async request(input: {
    orderId: string;
    actorId: string;
    idempotencyReference: string;
    amountMinor?: string;
    allocationId?: string;
  }) {
    // A provider payment may have succeeded immediately before allocation
    // persistence failed. Repair that recoverable gap before preparing the
    // refund; allocation creation is protected by unique constraints and is
    // therefore safe to retry.
    const succeededAttempt = await paymentRepository.getSucceededAttemptByOrder(input.orderId);
    if (succeededAttempt) {
      await protectedFundsService.ensureAllocations(succeededAttempt.id);
    }
    const prepared = await refundRepository.prepare(input);
    if (prepared.existing && prepared.refund.status !== "failed") {
      return {
        id: prepared.refund.id,
        status: prepared.refund.status,
        idempotentReplay: true,
      };
    }
    return this.execute(prepared.refund);
  }

  async retry(refundId: string) {
    const refund = await refundRepository.restartFailed(refundId);
    if (!refund) throw new Error("Refund is not recoverable in its current state");
    return this.execute(refund);
  }

  async reconcile(refundId: string): Promise<boolean> {
    const refund = await refundRepository.getPreparedRefund(refundId);
    if (!refund || refund.status === "succeeded") return Boolean(refund);
    if (refund.status !== "pending" || !refund.providerRefundIds.length) return false;
    const adapter = providerRegistry.get(refund.provider);
    if (!adapter.retrieveRefund) return false;
    const verified = await Promise.all(
      refund.providerRefundIds.map((id) => adapter.retrieveRefund!(id)),
    );
    if (verified.some((item) => !item)) return false;
    const refunds = verified.filter(
      (item): item is NonNullable<typeof item> => Boolean(item),
    );
    if (
      refunds.some((item) => item.amount.currency !== refund.currency) ||
      refunds.reduce((sum, item) => sum + BigInt(item.amount.amountMinor), BigInt(0)) !==
        BigInt(refund.amountMinor)
    ) {
      await paymentOperationsRepository.createRecoveryCase(
        "provider_refund_amount_mismatch",
        refund.id,
        { provider: refund.provider },
      );
      return false;
    }
    if (refunds.some((item) => item.status === "failed")) {
      await refundRepository.failProviderRefund(refund, "provider_refund_failed");
      return true;
    }
    if (refunds.some((item) => item.status === "pending")) return false;
    const newlyCompleted = await refundRepository.completeProviderRefund(
      refund,
      refund.providerRefundIds.length === 1
        ? refund.providerRefundIds[0]
        : `multi:${refund.id}`,
      refund.providerRefundIds,
      "succeeded",
    );
    if (!newlyCompleted) return true;
    await this.finalizeSucceeded(
      refund,
      refund.providerRefundIds.length === 1
        ? refund.providerRefundIds[0]
        : `multi:${refund.id}`,
    );
    if (refund.idempotencyReference.startsWith("dispute:")) {
      const disputeId = refund.idempotencyReference.split(":")[1];
      const dispute = await disputeRepository.getContext(disputeId);
      if (dispute?.status === "resolution_pending") {
        const resolution = refund.idempotencyReference.split(":")[2];
        if (resolution === "buyer" || resolution === "split") {
          await disputeRepository.completeResolution(
            dispute,
            dispute.resolutionActorId ?? dispute.openedBy,
            resolution,
            refund.id,
          );
        }
      }
    }
    paymentMetrics.increment("refunds", refund.provider, "reconciled");
    return true;
  }
}

export const refundService = new RefundService();
