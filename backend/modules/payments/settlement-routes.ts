import type { Express, Request } from "express";
import { isAuthenticated } from "../../auth";
import { authStorage } from "../../auth/storage";
import { storage } from "../../storage";
import { protectedFundsService } from "../../payments/protected-funds-service";
import { settlementRepository } from "../../repositories/settlement-repository";
import { audit } from "../../audit";
import { requireAdminPermission } from "../../organisations/access";

interface SettlementRouteDeps {
  getUserId(req: Request): string | undefined;
}

export function registerSettlementRoutes(app: Express, deps: SettlementRouteDeps): void {
  app.post(
    "/api/payments/orders/:orderId/confirm-delivery",
    isAuthenticated,
    async (req, res) => {
      const userId = deps.getUserId(req)!;
      const order = await storage.getOrder(req.params.orderId);
      if (!order || order.buyerId !== userId) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (order.status !== "delivered" || order.paymentStatus !== "paid") {
        return res.status(409).json({
          error: "Paid delivery must be marked delivered before seller payout can be scheduled",
        });
      }
      const scheduled = await protectedFundsService.confirmDelivery(order.id);
      if (!scheduled) {
        return res.status(409).json({ error: "No held seller funds are available for release" });
      }
      audit({
        action: "payment.delivery_confirmed",
        actorId: userId,
        targetType: "order",
        targetId: order.id,
      });
      return res.json({ scheduled, status: "seller_payout_on_hold" });
    },
  );

  app.get("/api/payments/seller/payouts", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    const user = await authStorage.getUser(userId);
    if (!user || !["farmer", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Seller access is required" });
    }
    return res.json({ payouts: await settlementRepository.listSellerPayouts(userId) });
  });

  app.get("/api/payments/operator/payout-failures", isAuthenticated, requireAdminPermission("revenue.view"), async (_req, res) => {
    return res.json({ failures: await settlementRepository.listPayoutFailures() });
  });

  app.post(
    "/api/payments/operator/payouts/:allocationId/retry",
    isAuthenticated,
    requireAdminPermission("revenue.manage_payouts"),
    async (req, res) => {
      const userId = deps.getUserId(req)!;
      const reset = await protectedFundsService.retry(req.params.allocationId);
      if (!reset) return res.status(409).json({ error: "Payout is not recoverable in its current state" });
      audit({
        action: "payment.payout_retry_scheduled",
        actorId: userId,
        targetType: "protected_allocation",
        targetId: req.params.allocationId,
      });
      return res.json({ status: "release_scheduled" });
    },
  );
}
