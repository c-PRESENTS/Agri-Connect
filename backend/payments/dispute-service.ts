import { createHash } from "crypto";
import { paymentRuntimeConfig } from "./config";
import { refundService } from "./refund-service";
import { disputeRepository } from "../repositories/dispute-repository";
import { paymentErrorCode } from "./security";

export class DisputeService {
  async open(input: {
    orderId: string;
    allocationId: string;
    buyerId: string;
    reason: string;
    details: string;
    evidence?: { evidenceType: string; text: string; url?: string };
  }) {
    const disputeId = await disputeRepository.create({
      ...input,
      filingDays: paymentRuntimeConfig.disputeFilingDays,
      responseDays: paymentRuntimeConfig.disputeResponseDays,
    });
    if (input.evidence) {
      await this.addEvidence(disputeId, input.buyerId, input.evidence);
    }
    return { id: disputeId, status: "open" };
  }

  async addEvidence(
    disputeId: string,
    actorId: string,
    evidence: { evidenceType: string; text: string; url?: string },
  ) {
    const dispute = await disputeRepository.getContext(disputeId);
    if (!dispute) throw new Error("Dispute not found");
    if (![dispute.buyerId, dispute.sellerId].includes(actorId)) {
      throw new Error("Only the buyer or affected seller can submit evidence");
    }
    if (!["open", "under_review", "needs_action"].includes(dispute.status)) {
      throw new Error("Evidence can no longer be added to this dispute");
    }
    const evidenceData = {
      text: evidence.text,
      ...(evidence.url ? { url: evidence.url } : {}),
    };
    const contentHash = createHash("sha256")
      .update(JSON.stringify(evidenceData))
      .digest("hex");
    const evidenceId = await disputeRepository.addEvidence({
      disputeId,
      actorId,
      evidenceType: evidence.evidenceType,
      evidenceData,
      contentHash,
    });
    return { id: evidenceId, contentHash };
  }

  async startReview(disputeId: string, operatorId: string) {
    const changed = await disputeRepository.markUnderReview(disputeId, operatorId);
    if (!changed) throw new Error("Dispute cannot enter review from its current state");
    return { status: "under_review" };
  }

  async resolve(
    disputeId: string,
    operatorId: string,
    input: { resolution: "buyer" | "seller" | "split"; refundAmountMinor?: string },
  ) {
    const dispute = await disputeRepository.getContext(disputeId);
    if (!dispute) throw new Error("Dispute not found");
    if (!["open", "under_review", "needs_action"].includes(dispute.status)) {
      throw new Error("Dispute cannot be resolved from its current state");
    }
    const remaining =
      BigInt(dispute.sellerNetMinor) - BigInt(dispute.refundedMinor);
    let refundAmountMinor: string | undefined;
    if (input.resolution === "buyer") refundAmountMinor = remaining.toString();
    if (input.resolution === "split") {
      if (!input.refundAmountMinor) throw new Error("Split resolution requires a refund amount");
      const requested = BigInt(input.refundAmountMinor);
      if (requested <= BigInt(0) || requested >= remaining) {
        throw new Error("Split refund must be greater than zero and less than the seller balance");
      }
      refundAmountMinor = requested.toString();
    }
    const started = await disputeRepository.markResolutionPending(
      dispute.id,
      operatorId,
      input.resolution,
      refundAmountMinor,
    );
    if (!started) throw new Error("Dispute resolution is already in progress");
    if (input.resolution === "seller") {
      await disputeRepository.completeResolution(dispute, operatorId, "seller");
      return { status: "resolved_seller" };
    }
    try {
      const refund = await refundService.request({
        orderId: dispute.orderId,
        actorId: operatorId,
        idempotencyReference: `dispute:${dispute.id}:${input.resolution}:${refundAmountMinor}`,
        amountMinor: refundAmountMinor,
        allocationId: dispute.allocationId,
      });
      if (refund.status === "succeeded") {
        await disputeRepository.completeResolution(
          dispute,
          operatorId,
          input.resolution,
          refund.id,
        );
        return {
          status: input.resolution === "buyer" ? "resolved_buyer" : "resolved_split",
          refund,
        };
      }
      return { status: "resolution_pending", refund };
    } catch (error) {
      await disputeRepository.markResolutionFailed(
        dispute.id,
        operatorId,
        paymentErrorCode(error),
      );
      throw error;
    }
  }

  async withdraw(disputeId: string, buyerId: string) {
    const dispute = await disputeRepository.getContext(disputeId);
    if (!dispute || dispute.buyerId !== buyerId) throw new Error("Dispute not found");
    const withdrawn = await disputeRepository.withdraw(dispute, buyerId);
    if (!withdrawn) throw new Error("Dispute can no longer be withdrawn");
    return { status: "withdrawn" };
  }
}

export const disputeService = new DisputeService();
