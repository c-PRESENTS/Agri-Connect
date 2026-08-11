import {
  ADMIN_PERMISSION_CODES,
  type AdminAccessContext,
  type AdminPermissionCode,
} from "@shared/models/organisations";
import { pool } from "../config/db";

export const PLATFORM_ORGANISATION_ID = "agriconnect-platform";
export const PLATFORM_SUPER_ADMIN_ROLE_ID = "role_platform_super_admin";

type AccessRow = {
  organisation_id: string;
  organisation_name: string;
  organisation_slug: string;
  organisation_type: string;
  organisation_status: string;
  membership_id: string;
  membership_status: string;
  role_id: string;
  role_code: string;
  role_name: string;
  role_scope: string;
  is_super_admin: boolean;
};

type PermissionRow = { code: string; effect?: "allow" | "deny" };

const permissionCatalog = new Set<string>(ADMIN_PERMISSION_CODES);

function knownPermissions(rows: PermissionRow[]): AdminPermissionCode[] {
  return rows
    .map((row) => row.code)
    .filter((code): code is AdminPermissionCode => permissionCatalog.has(code));
}

export function resolveAdminPermissions(
  rolePermissions: AdminPermissionCode[],
  overrides: Array<{ code: AdminPermissionCode; effect: "allow" | "deny" }>,
  isSuperAdmin: boolean,
): AdminPermissionCode[] {
  if (isSuperAdmin) return [...ADMIN_PERMISSION_CODES];

  const resolved = new Set<AdminPermissionCode>(rolePermissions);
  for (const override of overrides) {
    if (override.effect === "allow") resolved.add(override.code);
    else resolved.delete(override.code);
  }
  return ADMIN_PERMISSION_CODES.filter((code) => resolved.has(code));
}

export async function getPlatformAdminAccess(userId: string): Promise<AdminAccessContext> {
  const accessResult = await pool.query(
    `SELECT
       o.id AS organisation_id,
       o.name AS organisation_name,
       o.slug AS organisation_slug,
       o.type AS organisation_type,
       o.status AS organisation_status,
       m.id AS membership_id,
       m.status AS membership_status,
       r.id AS role_id,
       r.code AS role_code,
       r.name AS role_name,
       r.scope AS role_scope,
       r.is_super_admin
     FROM organisation_memberships m
     JOIN organisations o ON o.id = m.organisation_id
     JOIN admin_roles r ON r.id = m.role_id
     WHERE m.user_id = $1
       AND m.organisation_id = $2
       AND m.status = 'active'
       AND o.status = 'approved'
       AND o.type = 'platform'
     LIMIT 1`,
    [userId, PLATFORM_ORGANISATION_ID],
  );

  const row = accessResult.rows[0] as AccessRow | undefined;
  if (!row) {
    return { hasAccess: false, organisation: null, membership: null, role: null, permissions: [] };
  }

  const [rolePermissionResult, overrideResult] = await Promise.all([
    pool.query(
      `SELECT p.code
       FROM admin_role_permissions rp
       JOIN admin_permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = $1`,
      [row.role_id],
    ),
    pool.query(
      `SELECT p.code, mpo.effect
       FROM member_permission_overrides mpo
       JOIN admin_permissions p ON p.id = mpo.permission_id
       WHERE mpo.membership_id = $1`,
      [row.membership_id],
    ),
  ]);

  const rolePermissions = knownPermissions(rolePermissionResult.rows as PermissionRow[]);
  const overrides = (overrideResult.rows as PermissionRow[])
    .filter(
      (item): item is PermissionRow & { code: AdminPermissionCode; effect: "allow" | "deny" } =>
        permissionCatalog.has(item.code) && (item.effect === "allow" || item.effect === "deny"),
    )
    .map(({ code, effect }) => ({ code, effect }));

  return {
    hasAccess: true,
    organisation: {
      id: row.organisation_id,
      name: row.organisation_name,
      slug: row.organisation_slug,
      type: row.organisation_type,
      status: row.organisation_status,
    },
    membership: { id: row.membership_id, status: row.membership_status },
    role: {
      id: row.role_id,
      code: row.role_code,
      name: row.role_name,
      scope: row.role_scope,
      isSuperAdmin: row.is_super_admin,
    },
    permissions: resolveAdminPermissions(rolePermissions, overrides, row.is_super_admin),
  };
}

export async function listPlatformPermissions(): Promise<Array<Record<string, unknown>>> {
  const result = await pool.query(
    `SELECT id, code, name, description, group_name AS "groupName", high_risk AS "highRisk"
     FROM admin_permissions
     ORDER BY group_name, code`,
  );
  return result.rows;
}

export async function listPlatformRoles(): Promise<Array<Record<string, unknown>>> {
  const result = await pool.query(
    `SELECT
       r.id, r.code, r.name, r.description, r.scope,
       r.is_system AS "isSystem", r.is_super_admin AS "isSuperAdmin",
       COALESCE(
         json_agg(p.code ORDER BY p.code) FILTER (WHERE p.code IS NOT NULL),
         '[]'::json
       ) AS permissions
     FROM admin_roles r
     LEFT JOIN admin_role_permissions rp ON rp.role_id = r.id
     LEFT JOIN admin_permissions p ON p.id = rp.permission_id
     WHERE r.organisation_id = $1 AND r.scope = 'platform'
     GROUP BY r.id
     ORDER BY r.is_super_admin DESC, r.name`,
    [PLATFORM_ORGANISATION_ID],
  );
  return result.rows;
}

export async function ensureBootstrapSuperAdmins(): Promise<{ configured: number; activated: number; missing: string[] }> {
  const emails = Array.from(
    new Set(
      (process.env.ORG_ADMIN_BOOTSTRAP_EMAILS ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  if (emails.length === 0) return { configured: 0, activated: 0, missing: [] };

  const activated: string[] = [];
  const missing: string[] = [];
  for (const email of emails) {
    const result = await pool.query(
      `INSERT INTO organisation_memberships
         (organisation_id, user_id, role_id, status, accepted_at)
       SELECT $1, u.id, $2, 'active', now()
       FROM users u
       WHERE lower(u.email) = $3
       ON CONFLICT (organisation_id, user_id) DO UPDATE SET
         role_id = EXCLUDED.role_id,
         status = 'active',
         deactivated_at = NULL,
         updated_at = now()
       RETURNING user_id`,
      [PLATFORM_ORGANISATION_ID, PLATFORM_SUPER_ADMIN_ROLE_ID, email],
    );
    if (result.rowCount) activated.push(email);
    else missing.push(email);
  }

  return { configured: emails.length, activated: activated.length, missing };
}

export interface AdminAuditInput {
  organisationId?: string | null;
  actorUserId?: string | null;
  membershipId?: string | null;
  action: string;
  permissionCode?: AdminPermissionCode;
  targetType: string;
  targetId?: string | null;
  outcome?: "success" | "denied" | "failed";
  requestId?: string | null;
  ipHash?: string | null;
  deviceHash?: string | null;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function recordAdminAuditEvent(input: AdminAuditInput): Promise<void> {
  await pool.query(
    `INSERT INTO admin_audit_events
       (organisation_id, actor_user_id, membership_id, action, permission_code,
        target_type, target_id, outcome, request_id, ip_hash, device_hash, changes, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb)`,
    [
      input.organisationId ?? null,
      input.actorUserId ?? null,
      input.membershipId ?? null,
      input.action,
      input.permissionCode ?? null,
      input.targetType,
      input.targetId ?? null,
      input.outcome ?? "success",
      input.requestId ?? null,
      input.ipHash ?? null,
      input.deviceHash ?? null,
      JSON.stringify(input.changes ?? {}),
      JSON.stringify(input.metadata ?? {}),
    ],
  );
}
