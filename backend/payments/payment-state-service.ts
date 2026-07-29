import { paymentRepository } from "../repositories/payment-repository";
import { commerceRepository } from "../repositories/commerce-repository";
import { storage } from "../storage";
import type { PaymentAttempt } from "@shared/schema";
import type { VerifiedProviderPayment } from "./types";
import { protectedFundsService } from "./protected-funds-service";
import { paymentOperationsRepository } from "../repositories/payment-operations-repository";

export class PaymentStateService {
  async applyVerifiedPayment(
    attempt: PaymentAttempt,
    payment: VerifiedProviderPayment,
  ): Promise<void> {
    if (payment.orderId !== attempt.orderId) throw new Error("Provider order reference mismatch");
    if (payment.amount.currency !== attempt.currency || payment.amount.amountMinor !== attempt.amountMinor.toString()) {
      throw new Error("Provider payment amount or currency mismatch");
    }
    const transitioned = await paymentRepository.applyVerifiedPaymentStatus(
      attempt.id,
      payment.status,
    );
    if (!transitioned) {
      if (payment.status === "succeeded" && attempt.paymentStatus === "succeeded") {
        await protectedFundsService.ensureAllocations(attempt.id);
        return;
      }
      if (
        payment.status === "succeeded" &&
        ["failed", "cancelled", "refunded"].includes(attempt.paymentStatus)
      ) {
        await paymentOperationsRepository.createRecoveryCase(
          "late_provider_success",
          attempt.id,
          {
            provider: attempt.provider,
            priorPaymentStatus: attempt.paymentStatus,
            providerPaymentId: payment.providerPaymentId,
          },
        );
      }
      return;
    }
    const order = await storage.getOrder(attempt.orderId);
    if (!order) throw new Error("Payment order not found");
    if (payment.status === "succeeded") {
      if (attempt.provider === "stripe" || attempt.provider === "paypal" || attempt.provider === "razorpay") {
        await storage.setOrderPaymentReference(
          attempt.orderId,
          attempt.provider,
          payment.providerPaymentId,
        );
        await storage.setOrderPaymentTransactionId(
          attempt.orderId,
          payment.providerPaymentId,
        );
      }
      await storage.markOrderPaid(order.id, payment.providerPaymentId);
      await commerceRepository.consumeReservations(order.id);
      await storage.removePurchasedCartItems(
        order.buyerId,
        order.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      );
      await protectedFundsService.ensureAllocations(attempt.id);
    } else if (payment.status === "failed" || payment.status === "cancelled") {
      await storage.markOrderPaymentFailed(order.id, `Verified provider status: ${payment.status}`);
      await storage.restoreStockForOrder(order);
      await storage.updateOrderStatus(
        order.id,
        "cancelled",
        `Protected payment ${payment.status}`,
      );
    }
  }
}

export const paymentStateService = new PaymentStateService();
