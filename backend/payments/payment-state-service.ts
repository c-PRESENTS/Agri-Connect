import { paymentRepository } from "../repositories/payment-repository";
import { commerceRepository } from "../repositories/commerce-repository";
import { storage } from "../storage";
import type { PaymentAttempt } from "@shared/schema";
import type { VerifiedProviderPayment } from "./types";

export class PaymentStateService {
  async applyVerifiedPayment(
    attempt: PaymentAttempt,
    payment: VerifiedProviderPayment,
  ): Promise<void> {
    if (payment.orderId !== attempt.orderId) throw new Error("Provider order reference mismatch");
    if (payment.amount.currency !== attempt.currency || payment.amount.amountMinor !== attempt.amountMinor.toString()) {
      throw new Error("Provider payment amount or currency mismatch");
    }
    await paymentRepository.applyVerifiedPaymentStatus(attempt.id, payment.status);
    const order = await storage.getOrder(attempt.orderId);
    if (!order) throw new Error("Payment order not found");
    if (payment.status === "succeeded") {
      await storage.markOrderPaid(order.id, payment.providerPaymentId);
      await commerceRepository.consumeReservations(order.id);
      await storage.clearCart(order.buyerId);
    } else if (payment.status === "failed" || payment.status === "cancelled") {
      await storage.markOrderPaymentFailed(order.id, `Verified provider status: ${payment.status}`);
    }
  }
}

export const paymentStateService = new PaymentStateService();
