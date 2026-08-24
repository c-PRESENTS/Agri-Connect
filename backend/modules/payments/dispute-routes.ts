import type { Express, Request } from "express";
import { z } from "zod";
import { isAuthenticated } from "../../auth";
import { authStorage } from "../../auth/storage";
import { storage } from "../../storage";
import { disputeService } from "../../payments/dispute-service";
import { disputeRepository } from "../../repositories/dispute-repository";
import { audit } from "../../audit";
import { requireAdminPermission } from "../../organisations/access";

interface DisputeRouteDeps {
  getUserId(req: Request): string | undefined;
}

const evidenceSchema = z.object({
  evidenceType: z.enum(["buyer_statement", "seller_statement", "delivery", "product", "communication", "other"]),
  text: z.string().trim().min(10).max(5000),
  url: z.string().url().max(2000).refine(
    (value) => ["http:", "https:"].includes(new URL(value).protocol),
    "Evidence URL must use HTTP or HTTPS",
  ).optional(),
});

const openSchema = z.object({
  allocationId: z.string().uuid(),
  reason: z.enum(["non_delivery", "damaged", "not_as_described", "quality", "quantity", "other"]),
  details: z.string().trim().min(20).max(5000),
  evidence: evidenceSchema.optional(),
});

const resolutionSchema = z.object({
  resolution: z.enum(["buyer", "seller", "split"]),
  refundAmountMinor: z.string().regex(/^[1-9]\d*$/).optional(),
});

async function orderAccess(orderId: string, userId: string) {
  const [order, user] = await Promise.all([
    storage.getOrder(orderId),
    authStorage.getUser(userId),
  ]);
  if (!order) return undefined;
  const seller = order.items.some((item) => item.farmerId === userId);
  if (order.buyerId !== userId && !seller && user?.role !== "admin") return undefined;
  return { order, user, seller };
}

export function registerDisputeRoutes(app: Express, deps: DisputeRouteDeps): void {
  app.get("/api/payments/orders/:orderId/allocations", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    const access = await orderAccess(req.params.orderId, userId);
    if (!access) return res.status(404).json({ error: "Order not found" });
    const allocations = await disputeRepository.listOrderAllocations(access.order.id);
    return res.json({
      allocations:
        access.order.buyerId === userId || access.user?.role === "admin"
          ? allocations
          : allocations.filter((allocation) => allocation.seller_id === userId),
    });
  });

  app.post("/api/payments/orders/:orderId/disputes", isAuthenticated, async (req, res) => {
    try {
      const userId = deps.getUserId(req)!;
      const order = await storage.getOrder(req.params.orderId);
      if (!order || order.buyerId !== userId) {
        return res.status(404).json({ error: "Order not found" });
      }
      const input = openSchema.parse(req.body);
      const dispute = await disputeService.open({
        orderId: order.id,
        allocationId: input.allocationId,
        buyerId: userId,
        reason: input.reason,
        details: input.details,
        evidence: input.evidence,
      });
      audit({
        action: "payment.dispute_opened",
        actorId: userId,
        targetType: "order",
        targetId: order.id,
      });
      return res.status(201).json(dispute);
    } catch (error) {
      return res.status(409).json({
        error: "Dispute could not be opened",
      });
    }
  });

  app.get("/api/payments/orders/:orderId/disputes", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    const access = await orderAccess(req.params.orderId, userId);
    if (!access) return res.status(404).json({ error: "Order not found" });
    const disputes = await disputeRepository.listForOrder(access.order.id);
    if (access.order.buyerId === userId || access.user?.role === "admin") {
      return res.json({ disputes });
    }
    const allocations = await disputeRepository.listOrderAllocations(access.order.id);
    const sellerAllocationIds = new Set(
      allocations
        .filter((allocation) => allocation.seller_id === userId)
        .map((allocation) => allocation.id),
    );
    return res.json({
      disputes: disputes.filter((dispute) => sellerAllocationIds.has(dispute.allocation_id)),
    });
  });

  app.post("/api/payments/disputes/:disputeId/evidence", isAuthenticated, async (req, res) => {
    try {
      const userId = deps.getUserId(req)!;
      const input = evidenceSchema.parse(req.body);
      return res.status(201).json(
        await disputeService.addEvidence(req.params.disputeId, userId, input),
      );
    } catch (error) {
      return res.status(409).json({
        error: "Evidence could not be submitted",
      });
    }
  });

  app.post("/api/payments/disputes/:disputeId/withdraw", isAuthenticated, async (req, res) => {
    try {
      const userId = deps.getUserId(req)!;
      return res.json(await disputeService.withdraw(req.params.disputeId, userId));
    } catch (error) {
      return res.status(409).json({
        error: "Dispute could not be withdrawn",
      });
    }
  });

  app.get("/api/payments/operator/disputes", isAuthenticated, requireAdminPermission("revenue.view"), async (req, res) => {
    const page = z.coerce.number().int().min(1).default(1).parse(req.query.page);
    const pageSize = z.coerce.number().int().min(1).max(100).default(25).parse(req.query.pageSize);
    const status = z.string().max(40).optional().parse(req.query.status);
    return res.json(
      await disputeRepository.listForOperator(pageSize, (page - 1) * pageSize, status),
    );
  });

  app.get("/api/payments/seller/disputes", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    const user = await authStorage.getUser(userId);
    if (!user || !["farmer", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Seller access is required" });
    }
    const page = z.coerce.number().int().min(1).default(1).parse(req.query.page);
    const pageSize = z.coerce.number().int().min(1).max(100).default(25).parse(req.query.pageSize);
    return res.json(
      await disputeRepository.listForSeller(userId, pageSize, (page - 1) * pageSize),
    );
  });

  app.post(
    "/api/payments/operator/disputes/:disputeId/review",
    isAuthenticated,
    requireAdminPermission("revenue.manage_payouts"),
    async (req, res) => {
      try {
        const userId = deps.getUserId(req)!;
        return res.json(await disputeService.startReview(req.params.disputeId, userId));
      } catch (error) {
        return res.status(409).json({
          error: "Review could not be started",
        });
      }
    },
  );

  app.post(
    "/api/payments/operator/disputes/:disputeId/resolve",
    isAuthenticated,
    requireAdminPermission("revenue.manage_payouts"),
    async (req, res) => {
      try {
        const userId = deps.getUserId(req)!;
        const input = resolutionSchema.parse(req.body);
        const result = await disputeService.resolve(req.params.disputeId, userId, input);
        audit({
          action: "payment.dispute_resolved",
          actorId: userId,
          targetType: "payment_dispute",
          targetId: req.params.disputeId,
        });
        return res.json(result);
      } catch (error) {
        return res.status(409).json({
          error: "Dispute resolution failed",
        });
      }
    },
  );
}
