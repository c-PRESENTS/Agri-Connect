import bcrypt from "bcryptjs";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import QRCode from "qrcode";
import speakeasy from "speakeasy";
import type { PoolClient } from "pg";
import type {
  AdminAccessContext,
  AdminPermissionCode,
  EmployeeOverrideInput,
  EmployeeRoleChangeInput,
  InviteEmployeeInput,
} from "@shared/schema";
import { ADMIN_PERMISSION_CODES } from "@shared/schema";
import { pool } from "../config/db";
import { PLATFORM_ORGANISATION_ID } from "./repository";
import { sendSecurityLink } from "./security-notifications";

export class EmployeeSecurityError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export interface EmployeeActor {
  userId: string;
  access: AdminAccessContext;
  requestId?: string | null;
  sessionId?: string;
}

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const recoveryHash = (userId: string, code: string) => tokenHash(`${userId}:${code.toUpperCase().replace(/\s/g, "")}`);

function encryptionKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) throw new EmployeeSecurityError(503, "MFA_NOT_CONFIGURED", "MFA encryption is not configured.");
  return createHash("sha256").update(raw).digest();
}

function encryptSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const body = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), body.toString("base64")].join(".");
}

function decryptSecret(value: string): string {
  const [version, iv, tag, body] = value.split(".");
  if (version !== "v1" || !iv || !tag || !body) throw new EmployeeSecurityError(500, "MFA_SECRET_INVALID", "Stored MFA credential is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64")), decipher.final()]).toString("utf8");
}

async function audit(client: PoolClient, actor: EmployeeActor | null, input: {
  action: string; permission?: AdminPermissionCode; targetType: string; targetId?: string | null;
  changes?: Record<string, unknown>; metadata?: Record<string, unknown>; outcome?: "success" | "failed" | "denied";
}) {
  await client.query(
    `INSERT INTO admin_audit_events(organisation_id,actor_user_id,membership_id,action,permission_code,target_type,target_id,outcome,request_id,changes,metadata)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb)`,
    [PLATFORM_ORGANISATION_ID, actor?.userId ?? null, actor?.access.membership?.id ?? null, input.action, input.permission ?? null,
      input.targetType, input.targetId ?? null, input.outcome ?? "success", actor?.requestId ?? null,
      JSON.stringify(input.changes ?? {}), JSON.stringify(input.metadata ?? {})],
  );
}

async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try { await client.query("BEGIN"); const result = await work(client); await client.query("COMMIT"); return result; }
  catch (error) { await client.query("ROLLBACK"); throw mapDatabaseError(error); }
  finally { client.release(); }
}

function mapDatabaseError(error: any): Error {
  if (error instanceof EmployeeSecurityError) return error;
  if (error?.code === "23514" && String(error.message).includes("last active Super Admin")) return new EmployeeSecurityError(409, "LAST_SUPER_ADMIN_REQUIRED", "The last active Super Admin cannot be changed or deactivated.");
  if (error?.code === "23505") return new EmployeeSecurityError(409, "EMPLOYEE_CONFLICT", "An active record already exists.");
  return error;
}

async function roleForUpdate(client: PoolClient, roleId: string) {
  const result = await client.query(`SELECT r.id,r.name,r.code,r.is_super_admin,
    EXISTS(SELECT 1 FROM admin_role_permissions rp JOIN admin_permissions p ON p.id=rp.permission_id WHERE rp.role_id=r.id AND p.code='security.manage') AS has_security_manage
    FROM admin_roles r WHERE r.id=$1 AND r.organisation_id=$2 AND r.scope='platform' FOR UPDATE`, [roleId, PLATFORM_ORGANISATION_ID]);
  if (!result.rowCount) throw new EmployeeSecurityError(404, "ROLE_NOT_FOUND", "Platform role not found.");
  return result.rows[0];
}

function requireSuperAdmin(actor: EmployeeActor, message = "Only a Super Admin may perform this change.") {
  if (!actor.access.role?.isSuperAdmin) throw new EmployeeSecurityError(403, "SUPER_ADMIN_REQUIRED", message);
}

async function revokeSessions(client: PoolClient, userId: string, exceptSid?: string) {
  const result = exceptSid
    ? await client.query(`DELETE FROM sessions WHERE sess->>'userId'=$1 AND sid<>$2`, [userId, exceptSid])
    : await client.query(`DELETE FROM sessions WHERE sess->>'userId'=$1`, [userId]);
  return result.rowCount ?? 0;
}

export async function inviteEmployee(actor: EmployeeActor, input: InviteEmployeeInput) {
  const rawToken = randomBytes(32).toString("base64url");
  const invitation = await withTransaction(async (client) => {
    const role = await roleForUpdate(client, input.roleId);
    if (role.is_super_admin || role.has_security_manage) requireSuperAdmin(actor);
    const actorEmail = await client.query(`SELECT lower(email) AS email FROM users WHERE id=$1`, [actor.userId]);
    if (actorEmail.rows[0]?.email === input.email && role.is_super_admin && !actor.access.role?.isSuperAdmin) {
      throw new EmployeeSecurityError(403, "SELF_ESCALATION_FORBIDDEN", "You cannot approve your own privilege escalation.");
    }
    const existing = await client.query(
      `SELECT m.id FROM organisation_memberships m JOIN users u ON u.id=m.user_id WHERE m.organisation_id=$1 AND lower(u.email)=$2 AND m.status IN ('active','invited','suspended')`,
      [PLATFORM_ORGANISATION_ID, input.email],
    );
    if (existing.rowCount) throw new EmployeeSecurityError(409, "EMPLOYEE_ALREADY_EXISTS", "This account already has a platform membership.");
    await client.query(`UPDATE organisation_invitations SET revoked_at=now() WHERE organisation_id=$1 AND lower(email)=$2 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at<=now()`, [PLATFORM_ORGANISATION_ID, input.email]);
    const duplicate = await client.query(`SELECT id FROM organisation_invitations WHERE organisation_id=$1 AND lower(email)=$2 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now()`, [PLATFORM_ORGANISATION_ID, input.email]);
    if (duplicate.rowCount) throw new EmployeeSecurityError(409, "ACTIVE_INVITATION_EXISTS", "An active invitation already exists for this email.");
    const result = await client.query(
      `INSERT INTO organisation_invitations(organisation_id,email,role_id,token_hash,invited_by,expires_at)
       VALUES($1,$2,$3,$4,$5,now()+interval '48 hours') RETURNING id,email,role_id AS "roleId",expires_at AS "expiresAt"`,
      [PLATFORM_ORGANISATION_ID, input.email, input.roleId, tokenHash(rawToken), actor.userId],
    );
    await audit(client, actor, { action: "admin.employee_invited", permission: "employees.invite", targetType: "organisation_invitation", targetId: result.rows[0].id, changes: { email: input.email, roleId: input.roleId } });
    return result.rows[0];
  });
  const delivery = await sendSecurityLink("invitation", input.email, rawToken);
  return { invitation, delivery };
}

export async function resendEmployeeInvitation(actor: EmployeeActor, invitationId: string) {
  const rawToken = randomBytes(32).toString("base64url");
  const invitation = await withTransaction(async (client) => {
    const result = await client.query(`SELECT i.*,r.is_super_admin,EXISTS(SELECT 1 FROM admin_role_permissions rp JOIN admin_permissions p ON p.id=rp.permission_id WHERE rp.role_id=r.id AND p.code='security.manage') AS has_security_manage FROM organisation_invitations i JOIN admin_roles r ON r.id=i.role_id WHERE i.id=$1 AND i.organisation_id=$2 FOR UPDATE OF i`, [invitationId, PLATFORM_ORGANISATION_ID]);
    const row = result.rows[0];
    if (!row) throw new EmployeeSecurityError(404, "INVITATION_NOT_FOUND", "Invitation not found.");
    if (row.accepted_at || row.revoked_at) throw new EmployeeSecurityError(409, "INVITATION_NOT_ACTIVE", "Only active invitations can be resent.");
    if (row.is_super_admin || row.has_security_manage) requireSuperAdmin(actor);
    const updated = await client.query(`UPDATE organisation_invitations SET token_hash=$2,expires_at=now()+interval '48 hours',created_at=now() WHERE id=$1 RETURNING id,email,role_id AS "roleId",expires_at AS "expiresAt"`, [invitationId, tokenHash(rawToken)]);
    await audit(client, actor, { action: "admin.employee_invitation_resent", permission: "employees.invite", targetType: "organisation_invitation", targetId: invitationId });
    return updated.rows[0];
  });
  const delivery = await sendSecurityLink("invitation", invitation.email, rawToken);
  return { invitation, delivery };
}

export async function revokeEmployeeInvitation(actor: EmployeeActor, invitationId: string, reason: string) {
  return withTransaction(async (client) => {
    const result = await client.query(`SELECT i.*,r.is_super_admin,EXISTS(SELECT 1 FROM admin_role_permissions rp JOIN admin_permissions p ON p.id=rp.permission_id WHERE rp.role_id=r.id AND p.code='security.manage') AS has_security_manage FROM organisation_invitations i JOIN admin_roles r ON r.id=i.role_id WHERE i.id=$1 AND i.organisation_id=$2 FOR UPDATE OF i`, [invitationId, PLATFORM_ORGANISATION_ID]);
    const row = result.rows[0];
    if (!row) throw new EmployeeSecurityError(404, "INVITATION_NOT_FOUND", "Invitation not found.");
    if (row.accepted_at || row.revoked_at) throw new EmployeeSecurityError(409, "INVITATION_NOT_ACTIVE", "Invitation is no longer active.");
    if (row.is_super_admin || row.has_security_manage) requireSuperAdmin(actor);
    await client.query(`UPDATE organisation_invitations SET revoked_at=now() WHERE id=$1`, [invitationId]);
    await audit(client, actor, { action: "admin.employee_invitation_revoked", permission: "employees.invite", targetType: "organisation_invitation", targetId: invitationId, changes: { reason } });
    return { id: invitationId, status: "revoked" };
  });
}

export async function inspectEmployeeInvitation(rawToken: string) {
  const result = await pool.query(
    `SELECT i.id,i.email,r.name AS "roleName",i.expires_at AS "expiresAt"
       FROM organisation_invitations i JOIN admin_roles r ON r.id=i.role_id
      WHERE i.token_hash=$1 AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>now()`,
    [tokenHash(rawToken)],
  );
  if (!result.rowCount) throw new EmployeeSecurityError(410, "INVITATION_INVALID", "Invitation is invalid, expired, revoked, or already used.");
  return result.rows[0];
}

export async function acceptEmployeeInvitation(rawToken: string, name?: string, password?: string) {
  return withTransaction(async (client) => {
    const inviteResult = await client.query(`SELECT * FROM organisation_invitations WHERE token_hash=$1 FOR UPDATE`, [tokenHash(rawToken)]);
    const invitation = inviteResult.rows[0];
    if (!invitation || invitation.accepted_at || invitation.revoked_at || new Date(invitation.expires_at) <= new Date()) {
      throw new EmployeeSecurityError(410, "INVITATION_INVALID", "Invitation is invalid, expired, revoked, or already used.");
    }
    let userResult = await client.query(`SELECT * FROM users WHERE lower(email)=lower($1) FOR UPDATE`, [invitation.email]);
    let user = userResult.rows[0];
    if (!user) {
      if (!name || !password) throw new EmployeeSecurityError(422, "ACCOUNT_DETAILS_REQUIRED", "Name and a strong password are required for a new account.");
      const hash = await bcrypt.hash(password, 12);
      userResult = await client.query(
        `INSERT INTO users(email,password_hash,auth_method,name,first_name,last_name,role,profile_complete,account_status,email_verified_at)
         VALUES(lower($1),$2,'password',$3,$4,$5,'buyer',true,'active',now()) RETURNING *`,
        [invitation.email, hash, name, name.split(/\s+/)[0], name.split(/\s+/).slice(1).join(" ") || null],
      );
      user = userResult.rows[0];
    } else {
      const updates: string[] = ["email_verified_at=COALESCE(email_verified_at,now())", "updated_at=now()"];
      const values: unknown[] = [user.id];
      if (!user.password_hash && password) { values.push(await bcrypt.hash(password, 12)); updates.push(`password_hash=$${values.length}`); }
      await client.query(`UPDATE users SET ${updates.join(",")} WHERE id=$1`, values);
    }
    const membership = await client.query(
      `INSERT INTO organisation_memberships(organisation_id,user_id,role_id,status,invited_by,invited_at,accepted_at)
       VALUES($1,$2,$3,'active',$4,$5,now())
       ON CONFLICT(organisation_id,user_id) DO UPDATE SET role_id=EXCLUDED.role_id,status='active',accepted_at=now(),deactivated_at=NULL,updated_at=now()
       RETURNING id,user_id AS "userId",status,accepted_at AS "acceptedAt"`,
      [invitation.organisation_id, user.id, invitation.role_id, invitation.invited_by, invitation.created_at],
    );
    await client.query(`UPDATE organisation_invitations SET accepted_at=now() WHERE id=$1`, [invitation.id]);
    await audit(client, null, { action: "admin.employee_invitation_accepted", targetType: "organisation_membership", targetId: membership.rows[0].id, changes: { invitationId: invitation.id, userId: user.id } });
    return membership.rows[0];
  });
}

export async function changeEmployeeRole(actor: EmployeeActor, membershipId: string, input: EmployeeRoleChangeInput) {
  return withTransaction(async (client) => {
    const targetResult = await client.query(`SELECT m.*,r.is_super_admin AS old_super FROM organisation_memberships m JOIN admin_roles r ON r.id=m.role_id WHERE m.id=$1 AND m.organisation_id=$2 FOR UPDATE OF m`, [membershipId, PLATFORM_ORGANISATION_ID]);
    const target = targetResult.rows[0];
    if (!target) throw new EmployeeSecurityError(404, "EMPLOYEE_NOT_FOUND", "Employee membership not found.");
    const role = await roleForUpdate(client, input.roleId);
    if (target.user_id === actor.userId && target.role_id !== input.roleId) throw new EmployeeSecurityError(403, "SELF_ESCALATION_FORBIDDEN", "Role changes require approval from another administrator.");
    if (role.is_super_admin || role.has_security_manage || target.old_super) requireSuperAdmin(actor);
    await client.query(`UPDATE organisation_memberships SET role_id=$2,updated_at=now() WHERE id=$1`, [membershipId, input.roleId]);
    const revoked = await revokeSessions(client, target.user_id, target.user_id === actor.userId ? actor.sessionId : undefined);
    await audit(client, actor, { action: "admin.employee_role_changed", permission: "employees.manage_permissions", targetType: "organisation_membership", targetId: membershipId, changes: { fromRoleId: target.role_id, toRoleId: input.roleId, reason: input.reason, revokedSessions: revoked } });
    return { membershipId, roleId: input.roleId, revokedSessions: revoked };
  });
}

export async function setEmployeeOverride(actor: EmployeeActor, membershipId: string, input: EmployeeOverrideInput) {
  return withTransaction(async (client) => {
    const targetResult = await client.query(`SELECT m.user_id,r.is_super_admin FROM organisation_memberships m JOIN admin_roles r ON r.id=m.role_id WHERE m.id=$1 AND m.organisation_id=$2 FOR UPDATE OF m`, [membershipId, PLATFORM_ORGANISATION_ID]);
    const target = targetResult.rows[0];
    if (!target) throw new EmployeeSecurityError(404, "EMPLOYEE_NOT_FOUND", "Employee membership not found.");
    if (input.permissionCode === "security.manage" || target.is_super_admin) requireSuperAdmin(actor);
    if (target.user_id === actor.userId && input.effect === "allow") throw new EmployeeSecurityError(403, "SELF_ESCALATION_FORBIDDEN", "Permission grants require approval from another administrator.");
    const permission = await client.query(`SELECT id FROM admin_permissions WHERE code=$1`, [input.permissionCode]);
    if (!permission.rowCount) throw new EmployeeSecurityError(404, "PERMISSION_NOT_FOUND", "Permission not found.");
    if (input.effect === "inherit") await client.query(`DELETE FROM member_permission_overrides WHERE membership_id=$1 AND permission_id=$2`, [membershipId, permission.rows[0].id]);
    else await client.query(
      `INSERT INTO member_permission_overrides(membership_id,permission_id,effect,granted_by,reason) VALUES($1,$2,$3,$4,$5)
       ON CONFLICT(membership_id,permission_id) DO UPDATE SET effect=EXCLUDED.effect,granted_by=EXCLUDED.granted_by,reason=EXCLUDED.reason,updated_at=now()`,
      [membershipId, permission.rows[0].id, input.effect, actor.userId, input.reason],
    );
    const revoked = await revokeSessions(client, target.user_id, target.user_id === actor.userId ? actor.sessionId : undefined);
    await audit(client, actor, { action: "admin.employee_permission_override_changed", permission: "employees.manage_permissions", targetType: "organisation_membership", targetId: membershipId, changes: { permissionCode: input.permissionCode, effect: input.effect, reason: input.reason, revokedSessions: revoked } });
    return { membershipId, ...input, revokedSessions: revoked };
  });
}

export async function changeEmployeeStatus(actor: EmployeeActor, membershipId: string, status: "active" | "deactivated", reason: string) {
  return withTransaction(async (client) => {
    const targetResult = await client.query(`SELECT m.*,r.is_super_admin FROM organisation_memberships m JOIN admin_roles r ON r.id=m.role_id WHERE m.id=$1 AND m.organisation_id=$2 FOR UPDATE OF m`, [membershipId, PLATFORM_ORGANISATION_ID]);
    const target = targetResult.rows[0];
    if (!target) throw new EmployeeSecurityError(404, "EMPLOYEE_NOT_FOUND", "Employee membership not found.");
    if (target.is_super_admin) requireSuperAdmin(actor);
    if (target.user_id === actor.userId && status === "deactivated") throw new EmployeeSecurityError(403, "SELF_DEACTIVATION_FORBIDDEN", "You cannot deactivate your own employee access.");
    await client.query(`UPDATE organisation_memberships SET status=$2::varchar,deactivated_at=CASE WHEN $2::varchar='deactivated' THEN now() ELSE NULL END,accepted_at=CASE WHEN $2::varchar='active' THEN COALESCE(accepted_at,now()) ELSE accepted_at END,updated_at=now() WHERE id=$1`, [membershipId, status]);
    const revoked = await revokeSessions(client, target.user_id, status === "active" && target.user_id === actor.userId ? actor.sessionId : undefined);
    await audit(client, actor, { action: status === "active" ? "admin.employee_reactivated" : "admin.employee_deactivated", permission: "employees.deactivate", targetType: "organisation_membership", targetId: membershipId, changes: { fromStatus: target.status, toStatus: status, reason, revokedSessions: revoked } });
    return { membershipId, status, revokedSessions: revoked };
  });
}

export async function revokeEmployeeSessions(actor: EmployeeActor, membershipId: string) {
  return withTransaction(async (client) => {
    const result = await client.query(`SELECT user_id FROM organisation_memberships WHERE id=$1 AND organisation_id=$2 FOR UPDATE`, [membershipId, PLATFORM_ORGANISATION_ID]);
    if (!result.rowCount) throw new EmployeeSecurityError(404, "EMPLOYEE_NOT_FOUND", "Employee membership not found.");
    const userId = result.rows[0].user_id;
    const revoked = await revokeSessions(client, userId, userId === actor.userId ? actor.sessionId : undefined);
    await audit(client, actor, { action: "admin.employee_sessions_revoked", permission: "employees.edit", targetType: "organisation_membership", targetId: membershipId, changes: { revokedSessions: revoked } });
    return { membershipId, revokedSessions: revoked };
  });
}

export async function updateRolePermissionMatrix(actor: EmployeeActor, roleId: string, permissionCodes: AdminPermissionCode[], reason: string) {
  return withTransaction(async (client) => {
    const role = await roleForUpdate(client, roleId);
    if (role.is_super_admin) throw new EmployeeSecurityError(409, "SUPER_ADMIN_ROLE_IMMUTABLE", "Super Admin always retains the complete permission catalogue.");
    if (permissionCodes.includes("security.manage")) requireSuperAdmin(actor);
    const actorMembership = actor.access.membership?.id;
    const actorRole = actor.access.role?.id;
    if (roleId === actorRole) throw new EmployeeSecurityError(403, "SELF_ESCALATION_FORBIDDEN", "Your own role matrix must be changed by another administrator.");
    await client.query(`DELETE FROM admin_role_permissions WHERE role_id=$1`, [roleId]);
    if (permissionCodes.length) await client.query(`INSERT INTO admin_role_permissions(role_id,permission_id) SELECT $1,id FROM admin_permissions WHERE code=ANY($2::text[])`, [roleId, permissionCodes]);
    const affected = await client.query(`SELECT user_id FROM organisation_memberships WHERE role_id=$1 AND status='active'`, [roleId]);
    let revoked = 0;
    for (const row of affected.rows) revoked += await revokeSessions(client, row.user_id, row.user_id === actor.userId ? actor.sessionId : undefined);
    await audit(client, actor, { action: "admin.role_permissions_changed", permission: "employees.manage_permissions", targetType: "admin_role", targetId: roleId, changes: { permissionCodes, reason, affectedEmployees: affected.rowCount, revokedSessions: revoked, actorMembership } });
    return { roleId, permissionCodes, affectedEmployees: affected.rowCount, revokedSessions: revoked };
  });
}

export async function beginTotpEnrollment(userId: string, email: string) {
  const secret = speakeasy.generateSecret({ length: 32, name: `AgriConnect:${email}`, issuer: "AgriConnect" });
  await pool.query(
    `INSERT INTO account_mfa_credentials(user_id,type,secret_ciphertext,enabled_at,disabled_at) VALUES($1,'totp',$2,NULL,NULL)
     ON CONFLICT(user_id,type) DO UPDATE SET secret_ciphertext=EXCLUDED.secret_ciphertext,enabled_at=NULL,disabled_at=NULL,updated_at=now()`,
    [userId, encryptSecret(secret.base32)],
  );
  return { qrDataUrl: await QRCode.toDataURL(secret.otpauth_url!), manualKey: secret.base32, issuer: "AgriConnect" };
}

export async function confirmTotpEnrollment(userId: string, code: string, currentSid?: string) {
  return withTransaction(async (client) => {
    const result = await client.query(`SELECT * FROM account_mfa_credentials WHERE user_id=$1 AND type='totp' FOR UPDATE`, [userId]);
    if (!result.rowCount) throw new EmployeeSecurityError(404, "MFA_ENROLLMENT_NOT_FOUND", "Start MFA enrollment first.");
    const valid = speakeasy.totp.verify({ secret: decryptSecret(result.rows[0].secret_ciphertext), encoding: "base32", token: code, window: 1 });
    if (!valid) throw new EmployeeSecurityError(422, "MFA_CODE_INVALID", "The authenticator code is invalid.");
    await client.query(`UPDATE account_mfa_credentials SET enabled_at=now(),disabled_at=NULL,updated_at=now() WHERE id=$1`, [result.rows[0].id]);
    await client.query(`DELETE FROM account_mfa_recovery_codes WHERE user_id=$1`, [userId]);
    const codes = Array.from({ length: 10 }, () => `${randomBytes(3).toString("hex").toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`);
    for (const recovery of codes) await client.query(`INSERT INTO account_mfa_recovery_codes(user_id,code_hash) VALUES($1,$2)`, [userId, recoveryHash(userId, recovery)]);
    await revokeSessions(client, userId, currentSid);
    await audit(client, null, { action: "account.mfa_enabled", targetType: "user", targetId: userId });
    return { enabled: true, recoveryCodes: codes };
  });
}

export async function verifyMfaCode(userId: string, code: string): Promise<{ method: "totp" | "recovery" }> {
  return withTransaction(async (client) => {
    const result = await client.query(`SELECT * FROM account_mfa_credentials WHERE user_id=$1 AND type='totp' AND enabled_at IS NOT NULL AND disabled_at IS NULL FOR UPDATE`, [userId]);
    if (!result.rowCount) throw new EmployeeSecurityError(409, "MFA_NOT_ENABLED", "MFA is not enabled.");
    const normalized = code.toUpperCase().replace(/\s/g, "");
    if (/^\d{6}$/.test(normalized) && speakeasy.totp.verify({ secret: decryptSecret(result.rows[0].secret_ciphertext), encoding: "base32", token: normalized, window: 1 })) return { method: "totp" };
    const recovery = await client.query(`UPDATE account_mfa_recovery_codes SET used_at=now() WHERE user_id=$1 AND code_hash=$2 AND used_at IS NULL RETURNING id`, [userId, recoveryHash(userId, normalized)]);
    if (recovery.rowCount) return { method: "recovery" };
    throw new EmployeeSecurityError(422, "MFA_CODE_INVALID", "The MFA or recovery code is invalid.");
  });
}

export async function disableTotp(userId: string, code: string, currentSid?: string) {
  await verifyMfaCode(userId, code);
  return withTransaction(async (client) => {
    await client.query(`UPDATE account_mfa_credentials SET disabled_at=now(),updated_at=now() WHERE user_id=$1 AND type='totp'`, [userId]);
    await client.query(`DELETE FROM account_mfa_recovery_codes WHERE user_id=$1`, [userId]);
    const revoked = await revokeSessions(client, userId, currentSid);
    await audit(client, null, { action: "account.mfa_disabled", targetType: "user", targetId: userId, changes: { revokedSessions: revoked } });
    return { enabled: false, revokedSessions: revoked };
  });
}

export async function regenerateRecoveryCodes(userId: string, code: string) {
  await verifyMfaCode(userId, code);
  return withTransaction(async (client) => {
    await client.query(`DELETE FROM account_mfa_recovery_codes WHERE user_id=$1`, [userId]);
    const codes = Array.from({ length: 10 }, () => `${randomBytes(3).toString("hex").toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`);
    for (const recovery of codes) await client.query(`INSERT INTO account_mfa_recovery_codes(user_id,code_hash) VALUES($1,$2)`, [userId, recoveryHash(userId, recovery)]);
    await audit(client, null, { action: "account.mfa_recovery_regenerated", targetType: "user", targetId: userId });
    return { recoveryCodes: codes };
  });
}

export async function getMfaState(userId: string) {
  const result = await pool.query(`SELECT enabled_at,disabled_at,(SELECT count(*)::int FROM account_mfa_recovery_codes rc WHERE rc.user_id=$1 AND rc.used_at IS NULL) AS recovery_codes_remaining FROM account_mfa_credentials WHERE user_id=$1 AND type='totp'`, [userId]);
  const row = result.rows[0];
  return { enabled: Boolean(row?.enabled_at && !row?.disabled_at), enabledAt: row?.enabled_at ?? null, recoveryCodesRemaining: row?.recovery_codes_remaining ?? 0, configured: Boolean(process.env.APP_ENCRYPTION_KEY) };
}

export async function revokeSessionById(userId: string, sid: string) {
  return withTransaction(async (client) => {
    const result = await client.query(`DELETE FROM sessions WHERE sid=$1 AND sess->>'userId'=$2`, [sid, userId]);
    if (!result.rowCount) throw new EmployeeSecurityError(404, "SESSION_NOT_FOUND", "Active session not found.");
    await audit(client, null, { action: "account.remote_session_revoked", targetType: "user", targetId: userId, changes: { sessionReference: tokenHash(sid).slice(0, 16) } });
    return { revoked: true };
  });
}

export async function hasEnabledMfa(userId: string): Promise<boolean> {
  const result = await pool.query(`SELECT 1 FROM account_mfa_credentials WHERE user_id=$1 AND type='totp' AND enabled_at IS NOT NULL AND disabled_at IS NULL`, [userId]);
  return Boolean(result.rowCount);
}

export async function requestEmailVerification(userId: string, email: string) {
  const rawToken = randomBytes(32).toString("base64url");
  await pool.query(`UPDATE account_email_verification_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL`, [userId]);
  await pool.query(`INSERT INTO account_email_verification_tokens(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '30 minutes')`, [userId, tokenHash(rawToken)]);
  return { delivery: await sendSecurityLink("email_verification", email, rawToken) };
}

export async function confirmEmailVerification(rawToken: string) {
  return withTransaction(async (client) => {
    const result = await client.query(`SELECT * FROM account_email_verification_tokens WHERE token_hash=$1 FOR UPDATE`, [tokenHash(rawToken)]);
    const row = result.rows[0];
    if (!row || row.used_at || new Date(row.expires_at) <= new Date()) throw new EmployeeSecurityError(410, "TOKEN_INVALID", "Verification link is invalid, expired, or already used.");
    await client.query(`UPDATE account_email_verification_tokens SET used_at=now() WHERE id=$1`, [row.id]);
    await client.query(`UPDATE users SET email_verified_at=now(),updated_at=now() WHERE id=$1`, [row.user_id]);
    return { verified: true };
  });
}

export async function requestPasswordReset(email: string) {
  const user = await pool.query(`SELECT id,email FROM users WHERE lower(email)=$1 AND account_status='active'`, [email]);
  if (!user.rowCount) return { accepted: true };
  const rawToken = randomBytes(32).toString("base64url");
  await pool.query(`UPDATE account_password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL`, [user.rows[0].id]);
  await pool.query(`INSERT INTO account_password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '30 minutes')`, [user.rows[0].id, tokenHash(rawToken)]);
  await sendSecurityLink("password_reset", email, rawToken);
  return { accepted: true };
}

export async function confirmPasswordReset(rawToken: string, password: string) {
  return withTransaction(async (client) => {
    const result = await client.query(`SELECT * FROM account_password_reset_tokens WHERE token_hash=$1 FOR UPDATE`, [tokenHash(rawToken)]);
    const row = result.rows[0];
    if (!row || row.used_at || new Date(row.expires_at) <= new Date()) throw new EmployeeSecurityError(410, "TOKEN_INVALID", "Reset link is invalid, expired, or already used.");
    await client.query(`UPDATE users SET password_hash=$2,auth_method='password',updated_at=now() WHERE id=$1`, [row.user_id, await bcrypt.hash(password, 12)]);
    await client.query(`UPDATE account_password_reset_tokens SET used_at=now() WHERE id=$1`, [row.id]);
    const revoked = await revokeSessions(client, row.user_id);
    await audit(client, null, { action: "account.password_reset", targetType: "user", targetId: row.user_id, changes: { revokedSessions: revoked } });
    return { reset: true };
  });
}

export function knownPermissionCodes(codes: string[]): AdminPermissionCode[] {
  const known = new Set<string>(ADMIN_PERMISSION_CODES);
  return codes.filter((code): code is AdminPermissionCode => known.has(code));
}
