import type { AdminEmployeeDetail, AdminEmployeeSummary, EmployeeDirectoryQuery } from "@shared/schema";
import { pool } from "../config/db";
import { PLATFORM_ORGANISATION_ID } from "./repository";

const employeeSelect = `
  SELECT m.id AS membership_id, u.id AS user_id,
    COALESCE(NULLIF(u.name,''), NULLIF(concat_ws(' ',u.first_name,u.last_name),''), u.email, u.id) AS display_name,
    COALESCE(u.email,'') AS email, m.status, r.id AS role_id, r.code AS role_code,
    r.name AS role_name, r.is_super_admin,
    EXISTS (SELECT 1 FROM account_mfa_credentials mc WHERE mc.user_id=u.id AND mc.enabled_at IS NOT NULL AND mc.disabled_at IS NULL) AS mfa_enabled,
    m.invited_at, m.accepted_at,
    (SELECT max(le.occurred_at) FROM account_login_events le WHERE le.user_id=u.id AND le.outcome='success') AS last_login_at,
    (SELECT count(*)::int FROM sessions s WHERE s.sess->>'userId'=u.id AND s.expire>now()) AS active_session_count
  FROM organisation_memberships m
  JOIN users u ON u.id=m.user_id
  JOIN admin_roles r ON r.id=m.role_id
  WHERE m.organisation_id=$1`;

function mapEmployee(row: any): AdminEmployeeSummary {
  return {
    membershipId: row.membership_id,
    userId: row.user_id,
    displayName: row.display_name,
    email: row.email,
    status: row.status,
    role: { id: row.role_id, code: row.role_code, name: row.role_name, isSuperAdmin: row.is_super_admin },
    mfaEnabled: row.mfa_enabled,
    invitedAt: row.invited_at?.toISOString?.() ?? row.invited_at ?? null,
    acceptedAt: row.accepted_at?.toISOString?.() ?? row.accepted_at ?? null,
    lastLoginAt: row.last_login_at?.toISOString?.() ?? row.last_login_at ?? null,
    activeSessionCount: row.active_session_count,
  };
}

export async function listAdminEmployees(query: EmployeeDirectoryQuery) {
  const where: string[] = [];
  const values: unknown[] = [PLATFORM_ORGANISATION_ID];
  if (query.search) {
    values.push(`%${query.search.toLowerCase()}%`);
    where.push(`(lower(COALESCE(u.name,'')) LIKE $${values.length} OR lower(COALESCE(u.email,'')) LIKE $${values.length} OR lower(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')) LIKE $${values.length})`);
  }
  if (query.status !== "all") { values.push(query.status); where.push(`m.status=$${values.length}`); }
  if (query.roleId !== "all") { values.push(query.roleId); where.push(`r.id=$${values.length}`); }
  const sort = {
    name: "display_name", email: "email", status: "m.status", role: "role_name",
    invitedAt: "m.invited_at", acceptedAt: "m.accepted_at", lastLoginAt: "last_login_at",
  }[query.sort];
  const offset = (query.page - 1) * query.pageSize;
  const filterSql = where.length ? ` AND ${where.join(" AND ")}` : "";
  const count = await pool.query(
    `SELECT count(*)::int AS total FROM organisation_memberships m JOIN users u ON u.id=m.user_id JOIN admin_roles r ON r.id=m.role_id WHERE m.organisation_id=$1${filterSql}`,
    values,
  );
  values.push(query.pageSize, offset);
  const employees = await pool.query(`${employeeSelect}${filterSql} ORDER BY ${sort} ${query.direction === "desc" ? "DESC" : "ASC"} NULLS LAST, m.id LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
  const invitations = await pool.query(
    `SELECT i.id,i.email,i.role_id AS "roleId",r.name AS "roleName",i.expires_at AS "expiresAt",i.created_at AS "createdAt"
       FROM organisation_invitations i JOIN admin_roles r ON r.id=i.role_id
      WHERE i.organisation_id=$1 AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>now()
      ORDER BY i.created_at DESC`,
    [PLATFORM_ORGANISATION_ID],
  );
  return {
    employees: employees.rows.map(mapEmployee),
    invitations: invitations.rows,
    pagination: { page: query.page, pageSize: query.pageSize, total: count.rows[0]?.total ?? 0, totalPages: Math.ceil((count.rows[0]?.total ?? 0) / query.pageSize) },
    filters: query,
    generatedAt: new Date().toISOString(),
  };
}

export async function getAdminEmployeeDetail(membershipId: string): Promise<AdminEmployeeDetail | null> {
  const result = await pool.query(`${employeeSelect} AND m.id=$2 LIMIT 1`, [PLATFORM_ORGANISATION_ID, membershipId]);
  if (!result.rowCount) return null;
  const row = result.rows[0];
  const [overrides, rolePermissions, activity] = await Promise.all([
    pool.query(
      `SELECT p.code AS "permissionCode",o.effect,o.reason FROM member_permission_overrides o JOIN admin_permissions p ON p.id=o.permission_id WHERE o.membership_id=$1 ORDER BY p.code`,
      [membershipId],
    ),
    pool.query(`SELECT p.code FROM admin_role_permissions rp JOIN admin_permissions p ON p.id=rp.permission_id WHERE rp.role_id=$1`, [row.role_id]),
    pool.query(
      `SELECT id,action,outcome,occurred_at AS "occurredAt",changes FROM admin_audit_events WHERE target_id IN ($1,$2) OR actor_user_id=$2 ORDER BY occurred_at DESC LIMIT 40`,
      [membershipId, row.user_id],
    ),
  ]);
  const effective = new Set<string>(row.is_super_admin ? [] : rolePermissions.rows.map((item: { code: string }) => item.code));
  if (row.is_super_admin) {
    const permissions = await pool.query(`SELECT code FROM admin_permissions ORDER BY code`);
    permissions.rows.forEach((item: { code: string }) => effective.add(item.code));
  }
  overrides.rows.forEach((item: { effect: string; permissionCode: string }) => item.effect === "allow" ? effective.add(item.permissionCode) : effective.delete(item.permissionCode));
  return { ...mapEmployee(row), overrides: overrides.rows, effectivePermissions: Array.from(effective).sort(), activity: activity.rows };
}

export async function listUserSessions(userId: string, currentSid: string) {
  const result = await pool.query(
    `SELECT sid,expire,sess->>'createdAt' AS created_at,sess->>'lastAuthenticatedAt' AS last_authenticated_at,
            sess->>'deviceLabel' AS device_label
       FROM sessions WHERE sess->>'userId'=$1 AND expire>now() ORDER BY expire DESC`,
    [userId],
  );
  return result.rows.map((row: any) => ({
    id: row.sid,
    current: row.sid === currentSid,
    deviceLabel: row.device_label || "Unknown browser",
    createdAt: row.created_at || null,
    lastAuthenticatedAt: row.last_authenticated_at || null,
    expiresAt: row.expire?.toISOString?.() ?? row.expire,
  }));
}

export async function listUserSecurityEvents(userId: string) {
  const result = await pool.query(
    `SELECT id,outcome,method,failure_code AS "failureCode",occurred_at AS "occurredAt"
       FROM account_login_events WHERE user_id=$1 ORDER BY occurred_at DESC LIMIT 30`,
    [userId],
  );
  return result.rows;
}
