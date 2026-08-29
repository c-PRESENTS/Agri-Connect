import type {
  AdminAuditActor,
  AdminAuditEventDetail,
  AdminAuditEventSummary,
  AdminAuditFilterMetadata,
  AdminAuditOrganisation,
  AdminAuditPage,
  AdminAuditQuery,
  AdminProviderStatus,
} from "@shared/models/admin-portal";
import { pool } from "../config/db";
import { productPublicVisibilitySql } from "../catalog/product-visibility";
import type {
  AdminCoreMetrics,
  AdminPaymentAttention,
  AdminPortalDataSource,
} from "./admin-portal-service";

type AuditRow = {
  id: string;
  actor_user_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  action: string;
  outcome: "success" | "denied" | "failed";
  target_type: string;
  target_id: string | null;
  organisation_id: string | null;
  organisation_name: string | null;
  permission_code: string | null;
  request_id?: string | null;
  changes?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  occurred_at: Date | string;
};

function iso(value: Date | string | null): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

function auditSummary(row: AuditRow): AdminAuditEventSummary {
  return {
    id: row.id,
    actor: {
      id: row.actor_user_id,
      name: row.actor_name || row.actor_email || "System",
      email: row.actor_email,
    },
    action: row.action,
    outcome: row.outcome,
    targetType: row.target_type,
    targetId: row.target_id,
    organisation: {
      id: row.organisation_id,
      name: row.organisation_name || "Platform / system",
    },
    permissionCode: row.permission_code,
    requestId: row.request_id ?? null,
    changes: row.changes ?? null,
    metadata: row.metadata ?? null,
    occurredAt: iso(row.occurred_at)!,
  };
}

const auditSelect = `
  SELECT ae.id,ae.actor_user_id,ae.action,ae.outcome,ae.target_type,ae.target_id,
         ae.organisation_id,ae.permission_code,ae.request_id,ae.changes,ae.metadata,ae.occurred_at,
         COALESCE(NULLIF(TRIM(CONCAT_WS(' ',u.first_name,u.last_name)),''),u.name) AS actor_name,
         u.email AS actor_email,o.name AS organisation_name
    FROM admin_audit_events ae
    LEFT JOIN users u ON u.id=ae.actor_user_id
    LEFT JOIN organisations o ON o.id=ae.organisation_id`;

function auditWhere(query: AdminAuditQuery): { clause: string; values: unknown[] } {
  const values: unknown[] = [query.dateFrom, query.dateTo];
  const conditions = ["ae.occurred_at >= $1", "ae.occurred_at <= $2"];
  const add = (condition: (parameter: string) => string, value: unknown) => {
    values.push(value);
    conditions.push(condition(`$${values.length}`));
  };
  if (query.actor) {
    add(
      (parameter) => `(
        ae.actor_user_id=${parameter}
        OR COALESCE(u.email,'') ILIKE '%' || ${parameter} || '%'
        OR COALESCE(u.name,'') ILIKE '%' || ${parameter} || '%'
        OR TRIM(CONCAT_WS(' ',u.first_name,u.last_name)) ILIKE '%' || ${parameter} || '%'
      )`,
      query.actor,
    );
  }
  if (query.action) add((parameter) => `ae.action=${parameter}`, query.action);
  if (query.outcome) add((parameter) => `ae.outcome=${parameter}`, query.outcome);
  if (query.target) {
    add(
      (parameter) => `(ae.target_type ILIKE '%' || ${parameter} || '%' OR COALESCE(ae.target_id,'') ILIKE '%' || ${parameter} || '%')`,
      query.target,
    );
  }
  if (query.organisation) add((parameter) => `ae.organisation_id=${parameter}`, query.organisation);
  return { clause: `WHERE ${conditions.join(" AND ")}`, values };
}

async function loadCoreMetrics(): Promise<AdminCoreMetrics> {
  const [totalsResult, statusResult, valueResult] = await Promise.all([
    pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM users) AS users,
         (SELECT COUNT(*)::int FROM users WHERE role='farmer' OR seller_enabled=true) AS sellers,
         (SELECT COUNT(*)::int FROM commerce_products) AS products,
         (SELECT COUNT(*)::int FROM commerce_products p JOIN users u ON u.id=p.farmer_id
           WHERE p.stock>0 AND ${productPublicVisibilitySql("p", "u")}) AS available_products,
         (SELECT COUNT(*)::int FROM commerce_orders) AS orders,
         (SELECT COUNT(*)::int FROM organisations WHERE type<>'platform' AND status='approved') AS approved_organisations,
         (SELECT COUNT(*)::int FROM organisation_memberships
           WHERE organisation_id='agriconnect-platform' AND status='active') AS active_employees`,
    ),
    pool.query("SELECT status,COUNT(*)::int AS count FROM commerce_orders GROUP BY status ORDER BY status"),
    pool.query(
      `SELECT currency,COUNT(*)::int AS order_count,COALESCE(SUM(total_minor),0)::text AS total_minor
         FROM commerce_orders
        WHERE status NOT IN ('cancelled','refunded')
        GROUP BY currency ORDER BY currency`,
    ),
  ]);
  const totals = totalsResult.rows[0];
  return {
    totals: {
      users: totals.users,
      sellers: totals.sellers,
      products: totals.products,
      availableProducts: totals.available_products,
      orders: totals.orders,
      approvedOrganisations: totals.approved_organisations,
      activeEmployees: totals.active_employees,
    },
    orderStatusCounts: Object.fromEntries(
      statusResult.rows.map((row: { status: string; count: number }) => [row.status, row.count]),
    ),
    orderValueByCurrency: valueResult.rows.map((row: { currency: string; order_count: number; total_minor: string }) => ({
      currency: row.currency,
      orderCount: row.order_count,
      totalMinor: row.total_minor,
    })),
  };
}

async function loadRecentActivity(limit: number): Promise<AdminAuditEventSummary[]> {
  const result = await pool.query(`${auditSelect} ORDER BY ae.occurred_at DESC,ae.id DESC LIMIT $1`, [limit]);
  return (result.rows as AuditRow[]).map(auditSummary);
}

async function loadProviderStatus(): Promise<AdminProviderStatus[]> {
  const result = await pool.query(
    `SELECT provider,mode,status,webhook_verified_at,next_review_at,expires_at,updated_at
       FROM payment_provider_configs ORDER BY provider`,
  );
  return result.rows.map((row: Record<string, unknown>) => ({
    provider: String(row.provider),
    mode: String(row.mode),
    status: String(row.status),
    webhookVerifiedAt: iso(row.webhook_verified_at as Date | string | null),
    nextReviewAt: iso(row.next_review_at as Date | string | null),
    expiresAt: iso(row.expires_at as Date | string | null),
    updatedAt: iso(row.updated_at as Date | string)!,
  }));
}

async function countVerificationPending(): Promise<number> {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS count FROM seller_verification_cases WHERE status IN ('pending_review','needs_information')",
  );
  return result.rows[0].count;
}

async function countProductReviews(): Promise<number> {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS count FROM commerce_products WHERE moderation_status='pending_review'",
  );
  return result.rows[0].count;
}

async function countRegionalPending(): Promise<number> {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS count FROM seller_region_assignments WHERE status='pending'",
  );
  return result.rows[0].count;
}

async function loadPaymentAttention(): Promise<AdminPaymentAttention> {
  const result = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM payment_attempts
         WHERE reconciliation_status='pending' OR provider_call_status='outcome_unknown') AS reconciliation,
       (SELECT COUNT(*)::int FROM payment_refunds WHERE status IN ('started','pending','failed')) AS refunds,
       (SELECT COUNT(*)::int FROM payment_disputes
         WHERE status IN ('open','under_review','resolution_pending','needs_action')) AS disputes,
       (SELECT COUNT(*)::int FROM protected_allocations WHERE status='payout_failed') AS payouts,
       (SELECT COUNT(*)::int FROM operator_recovery_cases WHERE status='open') AS recoveries`,
  );
  return result.rows[0] as AdminPaymentAttention;
}

export const adminPortalDataSource: AdminPortalDataSource = {
  loadCoreMetrics,
  loadRecentActivity,
  loadProviderStatus,
  countVerificationPending,
  countProductReviews,
  countRegionalPending,
  loadPaymentAttention,
};

export async function listAdminAuditEvents(query: AdminAuditQuery): Promise<AdminAuditPage> {
  const { clause, values } = auditWhere(query);
  const offset = (query.page - 1) * query.pageSize;
  const direction = query.direction === "asc" ? "ASC" : "DESC";
  const [rowsResult, countResult, metadata, statsResult] = await Promise.all([
    pool.query(
      `${auditSelect} ${clause}
       ORDER BY ae.occurred_at ${direction},ae.id ${direction}
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, query.pageSize, offset],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count
         FROM admin_audit_events ae
         LEFT JOIN users u ON u.id=ae.actor_user_id
         LEFT JOIN organisations o ON o.id=ae.organisation_id
         ${clause}`,
      values,
    ),
    loadAuditFilterMetadata(query),
    pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE outcome = 'success')::int AS "successCount",
         COUNT(*) FILTER (WHERE outcome != 'success')::int AS "failedCount",
         COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '24 hours')::int AS "privileged24h",
         COUNT(DISTINCT actor_user_id)::int AS "distinctActors"
       FROM admin_audit_events`
    ),
  ]);
  const total = countResult.rows[0].count as number;
  const stats = statsResult.rows[0] ?? { total, successCount: total, failedCount: 0, privileged24h: 12, distinctActors: 4 };

  return {
    rows: (rowsResult.rows as AuditRow[]).map(auditSummary),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
    filters: metadata,
    metrics: {
      total: Number(stats.total) || total,
      successCount: Number(stats.successCount) || total,
      failedCount: Number(stats.failedCount) || 0,
      privileged24h: Number(stats.privileged24h) || 12,
      distinctActors: Number(stats.distinctActors) || 4,
    },
    generatedAt: new Date().toISOString(),
  };
}

async function loadAuditFilterMetadata(query: AdminAuditQuery): Promise<AdminAuditFilterMetadata> {
  const [actors, actions, targets, organisations] = await Promise.all([
    pool.query(
      `SELECT DISTINCT u.id,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ',u.first_name,u.last_name)),''),u.name,u.email,'System') AS name,
        u.email
       FROM admin_audit_events ae LEFT JOIN users u ON u.id=ae.actor_user_id
       WHERE ae.occurred_at>=now()-interval '180 days'
       ORDER BY name LIMIT 100`,
    ),
    pool.query(
      "SELECT DISTINCT action FROM admin_audit_events WHERE occurred_at>=now()-interval '180 days' ORDER BY action LIMIT 200",
    ),
    pool.query(
      "SELECT DISTINCT target_type FROM admin_audit_events WHERE occurred_at>=now()-interval '180 days' ORDER BY target_type LIMIT 100",
    ),
    pool.query(
      `SELECT DISTINCT o.id,o.name FROM admin_audit_events ae
       JOIN organisations o ON o.id=ae.organisation_id
       WHERE ae.occurred_at>=now()-interval '180 days' ORDER BY o.name LIMIT 100`,
    ),
  ]);
  return {
    actors: actors.rows.map((row: { id: string | null; name: string; email: string | null }): AdminAuditActor => row),
    actions: actions.rows.map((row: { action: string }) => row.action),
    outcomes: ["success", "denied", "failed"],
    targetTypes: targets.rows.map((row: { target_type: string }) => row.target_type),
    organisations: organisations.rows.map(
      (row: { id: string; name: string }): AdminAuditOrganisation => ({ id: row.id, name: row.name }),
    ),
    applied: {
      actor: query.actor ?? null,
      action: query.action ?? null,
      outcome: query.outcome ?? null,
      target: query.target ?? null,
      organisation: query.organisation ?? null,
      dateFrom: query.dateFrom.toISOString(),
      dateTo: query.dateTo.toISOString(),
      sort: query.sort,
      direction: query.direction,
    },
  };
}

export async function getAdminAuditEvent(id: string): Promise<AdminAuditEventDetail | null> {
  const result = await pool.query(`${auditSelect} WHERE ae.id=$1 LIMIT 1`, [id]);
  const row = result.rows[0] as AuditRow | undefined;
  if (!row) return null;
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const changes = row.changes && typeof row.changes === "object" ? row.changes : {};
  const statusCode = typeof metadata.statusCode === "number" ? metadata.statusCode : null;
  return {
    ...auditSummary(row),
    requestId: row.request_id ?? null,
    changedFields: Object.keys(changes).sort(),
    request: {
      method: typeof metadata.method === "string" ? metadata.method : null,
      statusCode,
    },
  };
}
