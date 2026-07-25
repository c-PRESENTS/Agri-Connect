import type { Express, Request } from "express";
import { z } from "zod";
import { isAuthenticated } from "../../auth";
import { authStorage } from "../../auth/storage";
import { paymentDashboardRepository } from "../../repositories/payment-dashboard-repository";
import { reconciliationService } from "../../payments/reconciliation-service";
import { audit } from "../../audit";

interface PaymentDashboardRouteDeps {
  getUserId(req: Request): string | undefined;
}

function pagination(query: Request["query"]) {
  const page = z.coerce.number().int().min(1).default(1).parse(query.page);
  const pageSize = z.coerce.number().int().min(1).max(100).default(25).parse(query.pageSize);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

async function requireAdmin(userId: string) {
  const user = await authStorage.getUser(userId);
  return user?.role === "admin";
}

export function registerPaymentDashboardRoutes(
  app: Express,
  deps: PaymentDashboardRouteDeps,
): void {
  app.get("/api/payments/buyer/transactions", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    const { pageSize, offset } = pagination(req.query);
    const status = z.string().max(40).optional().parse(req.query.status);
    return res.json(
      await paymentDashboardRepository.listBuyerTransactions(
        userId,
        pageSize,
        offset,
        status,
      ),
    );
  });

  app.get("/api/payments/seller/balance", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    const user = await authStorage.getUser(userId);
    if (!user || !["farmer", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Seller access is required" });
    }
    return res.json({
      balances: await paymentDashboardRepository.getSellerBalance(userId),
    });
  });

  app.get("/api/payments/seller/payout-history", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    const user = await authStorage.getUser(userId);
    if (!user || !["farmer", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Seller access is required" });
    }
    const { pageSize, offset } = pagination(req.query);
    return res.json(
      await paymentDashboardRepository.listSellerPayoutHistory(userId, pageSize, offset),
    );
  });

  app.get("/api/payments/operator/overview", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    if (!(await requireAdmin(userId))) return res.status(403).json({ error: "Access denied" });
    return res.json(await paymentDashboardRepository.getOperatorOverview());
  });

  app.get("/api/payments/operator/reconciliation", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    if (!(await requireAdmin(userId))) return res.status(403).json({ error: "Access denied" });
    const { pageSize, offset } = pagination(req.query);
    return res.json(
      await paymentDashboardRepository.listReconciliationAttention(pageSize, offset),
    );
  });

  app.post(
    "/api/payments/operator/reconciliation/:attemptId/run",
    isAuthenticated,
    async (req, res) => {
      const userId = deps.getUserId(req)!;
      if (!(await requireAdmin(userId))) return res.status(403).json({ error: "Access denied" });
      const reconciled = await reconciliationService.reconcileAttempt(req.params.attemptId);
      audit({
        action: "payment.reconciliation_requested",
        actorId: userId,
        targetType: "payment_attempt",
        targetId: req.params.attemptId,
        outcome: reconciled ? "success" : "failed",
      });
      return res.status(reconciled ? 200 : 202).json({ reconciled });
    },
  );

  app.get("/api/payments/operator/recovery-cases", isAuthenticated, async (req, res) => {
    const userId = deps.getUserId(req)!;
    if (!(await requireAdmin(userId))) return res.status(403).json({ error: "Access denied" });
    const { pageSize, offset } = pagination(req.query);
    const status = z.enum(["open", "acknowledged", "resolved"]).default("open").parse(req.query.status);
    return res.json(
      await paymentDashboardRepository.listRecoveryCases(pageSize, offset, status),
    );
  });

  app.patch(
    "/api/payments/operator/recovery-cases/:caseId",
    isAuthenticated,
    async (req, res) => {
      const userId = deps.getUserId(req)!;
      if (!(await requireAdmin(userId))) return res.status(403).json({ error: "Access denied" });
      const input = z.object({
        status: z.enum(["acknowledged", "resolved"]),
      }).parse(req.body);
      const updated = await paymentDashboardRepository.updateRecoveryCase(
        req.params.caseId,
        input.status,
        userId,
      );
      if (!updated) return res.status(409).json({ error: "Recovery case cannot be updated" });
      audit({
        action: "payment.recovery_case_updated",
        actorId: userId,
        targetType: "payment_recovery_case",
        targetId: req.params.caseId,
      });
      return res.json({ status: input.status });
    },
  );
}
