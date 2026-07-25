import type { Express, Request } from "express";
import { z } from "zod";
import { isAuthenticated } from "../../auth";
import { authStorage } from "../../auth/storage";
import { storage } from "../../storage";
import { refundService } from "../../payments/refund-service";
import { refundRepository } from "../../repositories/refund-repository";
import { audit } from "../../audit";

interface RefundRouteDeps {
  getUserId(req: Request): string | undefined;
}

const requestSchema = z.object({
  amountMinor: z.string().regex(/^[1-9]\d*$/).optional(),
  allocationId: z.string().uuid().optional(),
});

export function registerRefundRoutes(app: Express, deps: RefundRouteDeps): void {
  app.post("/api/payments/orders/:orderId/refunds", isAuthenticated, async (req, res) => {
    try {
      const userId = deps.getUserId(req)!;
      const user = await authStorage.getUser(userId);
      const order = await storage.getOrder(req.params.orderId);
      if (!order || (order.buyerId !== userId && user?.role !== "admin")) {
        return res.status(404).json({ error: "Order not found" });
      }
      const idempotencyKey = req.get("Idempotency-Key")?.trim();
      if (!idempotencyKey || idempotencyKey.length > 120) {
        return res.status(400).json({ error: "A valid Idempotency-Key header is required" });
      }
      const input = requestSchema.parse(req.body);
      const result = await refundService.request({
        orderId: order.id,
        actorId: userId,
        idempotencyReference: `${userId}:${idempotencyKey}`,
        amountMinor: input.amountMinor,
        allocationId: input.allocationId,
      });
      audit({
        action: "payment.refund_requested",
        actorId: userId,
        targetType: "order",
        targetId: order.id,
      });
      return res.status(202).json(result);
    } catch (error) {
      return res.status(409).json({
        error: "Refund could not be created",
      });
    }
  });

  app.get("/api/payments/orders/:orderId/refunds", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    const user = await authStorage.getUser(userId);
    const order = await storage.getOrder(req.params.orderId);
    const sellerOnOrder = order?.items.some((item) => item.farmerId === userId);
    if (!order || (order.buyerId !== userId && !sellerOnOrder && user?.role !== "admin")) {
      return res.status(404).json({ error: "Order not found" });
    }
    return res.json({ refunds: await refundRepository.listOrderRefunds(order.id) });
  });

  app.get("/api/payments/operator/refund-failures", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    const user = await authStorage.getUser(userId);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "Access denied" });
    return res.json({ failures: await refundRepository.listFailedRefunds() });
  });

  app.post(
    "/api/payments/operator/refunds/:refundId/retry",
    isAuthenticated,
    async (req, res) => {
      try {
        const userId = deps.getUserId(req)!;
        const user = await authStorage.getUser(userId);
        if (!user || user.role !== "admin") return res.status(403).json({ error: "Access denied" });
        const result = await refundService.retry(req.params.refundId);
        return res.json(result);
      } catch (error) {
        return res.status(409).json({
          error: "Refund retry failed",
        });
      }
    },
  );
}
