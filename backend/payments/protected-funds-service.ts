import { paymentRuntimeConfig } from "./config";
import { providerRegistry } from "./provider-registry";
import { settlementRepository, type AllocationForRelease } from "../repositories/settlement-repository";
import { logPaymentFailure, paymentErrorCode } from "./security";
import { paymentMetrics } from "./observability";
import { paymentOperationsRepository } from "../repositories/payment-operations-repository";

export class ProtectedFundsService {
  async ensureAllocations(paymentAttemptId: string): Promise<string[]> {
    return settlementRepository.createHeldAllocations(paymentAttemptId);
  }

  async confirmDelivery(orderId: string): Promise<number> {
    let releaseDueAt = new Date(
      Date.now() + paymentRuntimeConfig.releaseDelayHours * 60 * 60 * 1000,
    );
    const protection = await settlementRepository.getOrderProtectionWindow(orderId);
    if (protection?.provider === "paypal") {
      const config = await paymentOperationsRepository.getProviderConfig("paypal");
      const maximumDays = Number(
        (config?.configuration as Record<string, unknown> | undefined)
          ?.maximumDelayedDisbursementDays,
      );
      if (!Number.isFinite(maximumDays) || maximumDays <= 0 || maximumDays > 28) {
        throw new Error("PayPal delayed-disbursement configuration is invalid");
      }
      const providerDeadline = new Date(
        protection.startedAt.getTime() + maximumDays * 24 * 60 * 60 * 1000 - 60 * 60 * 1000,
      );
      if (providerDeadline <= new Date()) {
        await paymentOperationsRepository.createRecoveryCase(
          "paypal_hold_window_exceeded",
          orderId,
          { providerDeadline: providerDeadline.toISOString() },
        );
        throw new Error("PayPal protected-payment hold window has elapsed");
      }
      if (releaseDueAt > providerDeadline) releaseDueAt = providerDeadline;
    }
    return settlementRepository.confirmDelivery(orderId, releaseDueAt);
  }

  private async executeRelease(allocation: AllocationForRelease): Promise<void> {
    const adapter = providerRegistry.get(allocation.provider);
    const capabilities = await adapter.capabilities();
    if (
      allocation.orderSellerCount > 1 &&
      !capabilities.supportsIndependentSellerRelease
    ) {
      throw new Error("provider_independent_seller_release_unsupported");
    }
    if (!adapter.createTransfer) throw new Error("provider_transfer_not_supported");
    const transfer = await settlementRepository.ensureTransfer(allocation);
    const existingProviderTransferId =
      typeof transfer.provider_transfer_id === "string"
        ? transfer.provider_transfer_id
        : undefined;
    const idempotencyReference = `payout:${allocation.id}`;
    let result;
    if (existingProviderTransferId && adapter.releaseTransfer) {
      result = await adapter.releaseTransfer(existingProviderTransferId, `${idempotencyReference}:release`);
    } else {
      result = await adapter.createTransfer({
        idempotencyReference,
        providerPaymentId: allocation.providerPaymentId,
        providerAccountId: allocation.providerAccountId,
        sellerId: allocation.sellerId,
        amount: {
          currency: allocation.currency,
          amountMinor: allocation.sellerNetMinor,
        },
        allocationId: allocation.id,
        holdUntil: allocation.releaseDueAt ?? new Date(),
      });
      if (result.status === "held" && adapter.releaseTransfer) {
        await settlementRepository.markTransferSucceeded(
          allocation.id,
          result.providerTransferId,
          "held",
        );
        result = await adapter.releaseTransfer(
          result.providerTransferId,
          `${idempotencyReference}:release`,
        );
      }
    }
    await settlementRepository.markTransferSucceeded(
      allocation.id,
      result.providerTransferId,
      result.status,
    );
    paymentMetrics.increment("payouts", allocation.provider, result.status);
  }

  async processDueAllocations(maximum = 20): Promise<number> {
    let processed = 0;
    while (processed < maximum) {
      const allocation = await settlementRepository.claimDueAllocation();
      if (!allocation) break;
      try {
        await this.executeRelease(allocation);
      } catch (error) {
        await settlementRepository.markTransferFailed(
          allocation.id,
          paymentErrorCode(error),
        );
        paymentMetrics.increment("payouts", allocation.provider, "failed");
        logPaymentFailure("seller payout failed", error, {
          provider: allocation.provider,
          allocationId: allocation.id,
        });
      }
      processed += 1;
    }
    return processed;
  }

  async retry(allocationId: string): Promise<boolean> {
    return settlementRepository.resetFailedAllocation(allocationId);
  }

  async recoverMissingAllocations(): Promise<number> {
    const attempts = await settlementRepository.listSucceededAttemptsWithoutAllocations();
    for (const attemptId of attempts) await this.ensureAllocations(attemptId);
    return attempts.length;
  }

  async reconcilePendingPayouts(): Promise<number> {
    const transfers = await settlementRepository.listPendingTransfers();
    let resolved = 0;
    for (const transfer of transfers) {
      const adapter = providerRegistry.get(transfer.provider);
      if (!adapter.retrieveTransfer) continue;
      try {
        let verified = await adapter.retrieveTransfer(transfer.providerTransferId);
        if (
          verified?.status === "held" &&
          adapter.releaseTransfer
        ) {
          verified = await adapter.releaseTransfer(
            transfer.providerTransferId,
            `payout:${transfer.allocationId}:release`,
          );
        }
        if (!verified || verified.status === "pending" || verified.status === "held") continue;
        if (verified.status === "failed") {
          await settlementRepository.markTransferFailed(
            transfer.allocationId,
            "provider_transfer_failed",
          );
        } else {
          await settlementRepository.markTransferSucceeded(
            transfer.allocationId,
            verified.providerTransferId,
            "succeeded",
          );
          paymentMetrics.increment("payouts", transfer.provider, "reconciled");
        }
        resolved += 1;
      } catch (error) {
        logPaymentFailure("pending payout reconciliation failed", error, {
          provider: transfer.provider,
          allocationId: transfer.allocationId,
        });
      }
    }
    return resolved;
  }
}

export const protectedFundsService = new ProtectedFundsService();
