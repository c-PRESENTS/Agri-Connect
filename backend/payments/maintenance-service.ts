import { pool } from "../config/db";
import { paymentOperationsRepository } from "../repositories/payment-operations-repository";
import { paymentRuntimeConfig } from "./config";
import { logPaymentFailure } from "./security";
import { reconciliationService } from "./reconciliation-service";
import { paymentRepository } from "../repositories/payment-repository";
import { refundRepository } from "../repositories/refund-repository";
import { refundService } from "./refund-service";
import { disputeRepository } from "../repositories/dispute-repository";

export interface RecoveryDrillFinding {
  code: string;
  severity: "warning" | "critical";
  count: number;
}

export interface RecoveryDrillResult {
  healthy: boolean;
  checkedAt: string;
  findings: RecoveryDrillFinding[];
}

export class PaymentMaintenanceService {
  async runRetention(at = new Date()): Promise<Record<string, number>> {
    const day = 24 * 60 * 60 * 1000;
    return paymentOperationsRepository.runRetention({
      webhookBefore: new Date(at.getTime() - paymentRuntimeConfig.webhookRetentionDays * day),
      idempotencyBefore: new Date(at.getTime() - paymentRuntimeConfig.idempotencyRetentionDays * day),
      operationalBefore: new Date(at.getTime() - paymentRuntimeConfig.operationalRetentionDays * day),
    });
  }

  async runRecoveryDrill(createCases: boolean): Promise<RecoveryDrillResult> {
    const result = await pool.query(
      `SELECT
        (SELECT COUNT(*)::int FROM payment_attempts
          WHERE provider_call_status='started' AND lease_expires_at<now()) AS expired_provider_leases,
        (SELECT COUNT(*)::int FROM payment_attempts pa
          WHERE pa.payment_status='succeeded' AND NOT EXISTS (
            SELECT 1 FROM protected_allocations alloc WHERE alloc.payment_attempt_id=pa.id
          )) AS missing_allocations,
        (SELECT COUNT(*)::int FROM protected_allocations alloc
          WHERE alloc.status IN ('release_scheduled','provider_held','releasing')
            AND EXISTS (
              SELECT 1 FROM payment_disputes pd
              WHERE pd.allocation_id=alloc.id
                AND pd.status IN ('open','under_review','needs_action','resolution_pending')
            )) AS disputed_release_races,
        (SELECT COUNT(*)::int FROM provider_webhook_events
          WHERE processing_status='received' AND received_at<now()-interval '10 minutes') AS stalled_webhooks,
        (SELECT COUNT(*)::int
          FROM protected_allocations alloc
          JOIN payment_attempts pay ON pay.id=alloc.payment_attempt_id
          JOIN payment_provider_configs cfg ON cfg.provider=pay.provider
          WHERE pay.provider='paypal'
            AND alloc.status IN ('held','disputed','release_scheduled','provider_held')
            AND alloc.created_at +
              ((cfg.configuration->>'maximumDelayedDisbursementDays')::text || ' days')::interval
              <= now()+interval '24 hours') AS paypal_hold_deadlines,
        (SELECT COUNT(*)::int FROM (
          SELECT lt.id
          FROM ledger_transactions lt
          JOIN ledger_entries le ON le.transaction_id=lt.id
          GROUP BY lt.id
          HAVING COALESCE(SUM(CASE WHEN le.direction='debit' THEN le.amount_minor ELSE 0 END),0)
             <> COALESCE(SUM(CASE WHEN le.direction='credit' THEN le.amount_minor ELSE 0 END),0)
        ) imbalance) AS unbalanced_ledgers`,
    );
    const counts = result.rows[0] as Record<string, number>;
    const severities: Record<string, RecoveryDrillFinding["severity"]> = {
      expired_provider_leases: "critical",
      missing_allocations: "critical",
      disputed_release_races: "critical",
      stalled_webhooks: "warning",
      paypal_hold_deadlines: "critical",
      unbalanced_ledgers: "critical",
    };
    const findings = Object.entries(counts)
      .map(([code, count]) => ({ code, count: Number(count), severity: severities[code] }))
      .filter((finding): finding is RecoveryDrillFinding =>
        finding.count > 0 && Boolean(finding.severity),
      );
    if (createCases) {
      for (const finding of findings) {
        await paymentOperationsRepository.createRecoveryCase(
          "recovery_drill_finding",
          finding.code,
          { count: finding.count, severity: finding.severity, detectedAt: new Date().toISOString() },
        );
      }
    }
    return {
      healthy: findings.length === 0,
      checkedAt: new Date().toISOString(),
      findings,
    };
  }

  async recoverExpiredReservations(): Promise<number> {
    const result = await pool.query(
      `SELECT DISTINCT pa.id AS attempt_id
       FROM inventory_reservations ir
       JOIN payment_attempts pa ON pa.order_id=ir.order_id
       WHERE ir.status='active' AND ir.expires_at<=now()
         AND pa.payment_status NOT IN ('succeeded','refunded')
       ORDER BY pa.id LIMIT 100`,
    );
    let resolved = 0;
    for (const row of result.rows as Array<{ attempt_id: string }>) {
      try {
        await reconciliationService.reconcileAttempt(row.attempt_id);
        const attempt = await paymentRepository.getAttempt(row.attempt_id);
        if (attempt && ["failed", "cancelled"].includes(attempt.paymentStatus)) {
          resolved += 1;
          continue;
        }
        await paymentOperationsRepository.createRecoveryCase(
          "expired_inventory_reservation",
          row.attempt_id,
          {
            paymentStatus: attempt?.paymentStatus ?? "missing",
            providerCallStatus: attempt?.providerCallStatus ?? "missing",
          },
        );
      } catch (error) {
        await paymentOperationsRepository.createRecoveryCase(
          "expired_inventory_reservation",
          row.attempt_id,
          { error: "reconciliation_failed" },
        );
        logPaymentFailure("expired reservation reconciliation failed", error, {
          attemptId: row.attempt_id,
        });
      }
    }
    return resolved;
  }

  async reconcilePendingRefunds(): Promise<number> {
    const ids = await refundRepository.listPendingRefundIds();
    let reconciled = 0;
    for (const id of ids) {
      try {
        if (await refundService.reconcile(id)) reconciled += 1;
      } catch (error) {
        await paymentOperationsRepository.createRecoveryCase(
          "refund_reconciliation_failure",
          id,
          { error: "provider_refund_lookup_failed" },
        );
        logPaymentFailure("pending refund reconciliation failed", error, { refundId: id });
      }
    }
    return reconciled;
  }

  start(intervalHours: number): () => void {
    const timer = setInterval(() => {
      Promise.all([
        this.runRetention(),
        this.runRecoveryDrill(true),
        this.recoverExpiredReservations(),
        this.reconcilePendingRefunds(),
        disputeRepository.escalateOverdue(),
      ]).catch((error) => {
        logPaymentFailure("scheduled maintenance failed", error);
      });
    }, intervalHours * 60 * 60 * 1000);
    timer.unref();
    return () => clearInterval(timer);
  }
}

export const paymentMaintenanceService = new PaymentMaintenanceService();
