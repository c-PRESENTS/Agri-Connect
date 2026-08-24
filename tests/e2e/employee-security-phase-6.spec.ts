/// <reference types="node" />
import { randomUUID } from "crypto";
import { expect, test } from "@playwright/test";
import speakeasy from "speakeasy";
import { employeeOverrideSchema, inviteEmployeeSchema, passwordResetConfirmSchema } from "../../shared/models/admin-employees";
import { visibleAdminNavigation } from "../../frontend/src/lib/admin-navigation";

test.describe("organisation admin portal Phase 6", () => {
  test("validates employee security input and permission-aware navigation", () => {
    expect(inviteEmployeeSchema.parse({ email: " STAFF@Example.com ", roleId: "role_platform_viewer" }).email).toBe("staff@example.com");
    expect(() => inviteEmployeeSchema.parse({ email: "invalid", roleId: "role" })).toThrow();
    expect(employeeOverrideSchema.parse({ permissionCode: "products.view", effect: "deny", reason: "Separation of duties" })).toMatchObject({ effect: "deny" });
    expect(() => passwordResetConfirmSchema.parse({ token: "x".repeat(32), password: "weak-password" })).toThrow();
    expect(visibleAdminNavigation(["employees.view"]).map((item) => item.path)).toEqual(["/admin/employees", "/admin/roles"]);
    expect(visibleAdminNavigation(["security.manage"]).map((item) => item.path)).toEqual(["/admin/security"]);
  });

  test("protects every Phase 6 admin API and redirects admin UI to employee sign-in", async ({ page, request }) => {
    const id = randomUUID();
    const responses = await Promise.all([
      request.get("/api/admin/employees"),
      request.get(`/api/admin/employees/${id}`),
      request.post("/api/admin/employees/invitations", { data: {} }),
      request.post(`/api/admin/employees/invitations/${id}/resend`, { data: {} }),
      request.post(`/api/admin/employees/invitations/${id}/revoke`, { data: {} }),
      request.patch(`/api/admin/employees/${id}/role`, { data: {} }),
      request.put(`/api/admin/employees/${id}/overrides`, { data: {} }),
      request.post(`/api/admin/employees/${id}/deactivate`, { data: {} }),
      request.post(`/api/admin/employees/${id}/reactivate`, { data: {} }),
      request.post(`/api/admin/employees/${id}/sessions/revoke`, { data: {} }),
      request.put(`/api/admin/roles/${id}/permissions`, { data: {} }),
      request.get("/api/admin/security"),
      request.post("/api/admin/security/totp/enroll", { data: {} }),
      request.post("/api/admin/security/totp/confirm", { data: {} }),
      request.post("/api/admin/security/totp/disable", { data: {} }),
      request.post("/api/admin/security/recovery-codes/regenerate", { data: {} }),
      request.delete(`/api/admin/security/sessions/${id}`),
    ]);
    for (const response of responses) expect(response.status()).toBe(401);
    await page.goto("/admin/employees");
    await expect(page).toHaveURL(/\/admin\/sign-in\?returnTo=%2Fadmin%2Femployees/);
    await page.goto("/admin/security");
    await expect(page).toHaveURL(/\/admin\/sign-in\?returnTo=%2Fadmin%2Fsecurity/);
  });

  test("runs invitation, role, override, status and session lifecycle transactionally", async () => {
    test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for live Phase 6 verification");
    process.env.NODE_ENV = "test";
    const [{ pool }, service, notifications, repository] = await Promise.all([
      import("../../backend/config/db"),
      import("../../backend/organisations/employee-security-service"),
      import("../../backend/organisations/security-notifications"),
      import("../../backend/organisations/admin-employee-repository"),
    ]);
    const suffix = randomUUID().slice(0, 8);
    const actorId = `phase6-actor-${suffix}`;
    const email = `phase6-employee-${suffix}@example.invalid`;
    const actor = {
      userId: actorId,
      sessionId: `phase6-current-${suffix}`,
      requestId: "phase-6-test",
      access: {
        hasAccess: true,
        organisation: { id: "agriconnect-platform", name: "AgriConnect", slug: "agriconnect", type: "platform", status: "approved" },
        membership: null,
        role: { id: "role_platform_super_admin", code: "super_admin", name: "Super Admin", scope: "platform", isSuperAdmin: true },
        permissions: ["employees.view", "employees.invite", "employees.edit", "employees.deactivate", "employees.manage_permissions", "security.manage"],
      } as any,
    };
    let invitationId = "";
    let targetUserId = "";
    let membershipId = "";
    try {
      await pool.query("INSERT INTO users(id,email,auth_method,role,name,profile_complete,account_status,email_verified_at) VALUES($1,$2,'password','buyer','Phase 6 Actor',true,'active',now())", [actorId, `${actorId}@example.invalid`]);
      const invited = await service.inviteEmployee(actor, { email, roleId: "role_platform_viewer" });
      invitationId = invited.invitation.id;
      expect(invited.delivery).toBe("preview");
      await expect(service.inviteEmployee(actor, { email, roleId: "role_platform_viewer" })).rejects.toMatchObject({ code: "ACTIVE_INVITATION_EXISTS" });
      const originalMessage = notifications.readSecurityTestMessage("invitation", email);
      const originalToken = new URL(originalMessage!.url).searchParams.get("token")!;
      await service.resendEmployeeInvitation(actor, invitationId);
      await expect(service.inspectEmployeeInvitation(originalToken)).rejects.toMatchObject({ code: "INVITATION_INVALID" });
      const message = notifications.readSecurityTestMessage("invitation", email);
      const token = new URL(message!.url).searchParams.get("token")!;
      expect((await service.inspectEmployeeInvitation(token)).email).toBe(email);
      const accepted = await service.acceptEmployeeInvitation(token, "Phase Six Employee", "StrongPassword123");
      membershipId = accepted.id;
      targetUserId = accepted.userId;
      await expect(service.acceptEmployeeInvitation(token)).rejects.toMatchObject({ code: "INVITATION_INVALID" });
      const user = await pool.query("SELECT email_verified_at,password_hash FROM users WHERE id=$1", [targetUserId]);
      expect(user.rows[0].email_verified_at).toBeTruthy();
      expect(user.rows[0].password_hash).not.toContain("StrongPassword123");
      const selfActor = { ...actor, userId: targetUserId, access: { ...actor.access, role: { id: "role_platform_viewer", code: "viewer", name: "Viewer", scope: "platform", isSuperAdmin: false } } };
      await expect(service.changeEmployeeRole(selfActor, membershipId, { roleId: "role_platform_super_admin", reason: "Attempt self escalation" })).rejects.toMatchObject({ code: "SELF_ESCALATION_FORBIDDEN" });

      const revokedEmail = `phase6-revoked-${suffix}@example.invalid`;
      const revokedInvite = await service.inviteEmployee(actor, { email: revokedEmail, roleId: "role_platform_viewer" });
      const revokedToken = new URL(notifications.readSecurityTestMessage("invitation", revokedEmail)!.url).searchParams.get("token")!;
      await service.revokeEmployeeInvitation(actor, revokedInvite.invitation.id, "Invitation no longer required");
      await expect(service.inspectEmployeeInvitation(revokedToken)).rejects.toMatchObject({ code: "INVITATION_INVALID" });

      const expiredEmail = `phase6-expired-${suffix}@example.invalid`;
      const expiredInvite = await service.inviteEmployee(actor, { email: expiredEmail, roleId: "role_platform_viewer" });
      const expiredToken = new URL(notifications.readSecurityTestMessage("invitation", expiredEmail)!.url).searchParams.get("token")!;
      await pool.query("UPDATE organisation_invitations SET expires_at=now()-interval '1 minute' WHERE id=$1", [expiredInvite.invitation.id]);
      await expect(service.inspectEmployeeInvitation(expiredToken)).rejects.toMatchObject({ code: "INVITATION_INVALID" });

      await pool.query("INSERT INTO sessions(sid,sess,expire) VALUES($1,$2::jsonb,now()+interval '1 day')", [`phase6-session-${suffix}`, JSON.stringify({ userId: targetUserId })]);
      await service.setEmployeeOverride(actor, membershipId, { permissionCode: "products.view", effect: "allow", reason: "Moderation coverage" });
      expect((await pool.query("SELECT count(*)::int AS count FROM sessions WHERE sess->>'userId'=$1", [targetUserId])).rows[0].count).toBe(0);
      await service.changeEmployeeRole(actor, membershipId, { roleId: "role_platform_moderator", reason: "Assigned moderation duties" });
      let detail = await repository.getAdminEmployeeDetail(membershipId);
      expect(detail?.role.code).toBe("moderator");
      expect(detail?.effectivePermissions).toContain("products.view");
      await service.changeEmployeeStatus(actor, membershipId, "deactivated", "Employment access paused");
      expect((await repository.getAdminEmployeeDetail(membershipId))?.status).toBe("deactivated");
      await service.changeEmployeeStatus(actor, membershipId, "active", "Employee returned");
      detail = await repository.getAdminEmployeeDetail(membershipId);
      expect(detail?.status).toBe("active");
      expect(detail?.activity.map((event) => event.action)).toEqual(expect.arrayContaining(["admin.employee_invitation_accepted", "admin.employee_role_changed", "admin.employee_permission_override_changed", "admin.employee_deactivated", "admin.employee_reactivated"]));
    } finally {
      if (targetUserId) await pool.query("DELETE FROM users WHERE id=$1", [targetUserId]).catch(() => undefined);
      await pool.query("DELETE FROM organisation_invitations WHERE email LIKE $1", [`phase6-%-${suffix}@example.invalid`]).catch(() => undefined);
      await pool.query("DELETE FROM admin_audit_events WHERE request_id='phase-6-test' OR target_id=$1 OR target_id=$2", [membershipId || "none", targetUserId || "none"]).catch(() => undefined);
      await pool.query("DELETE FROM users WHERE id=$1", [actorId]).catch(() => undefined);
    }
  });

  test("keeps reset and MFA secrets hashed/encrypted and recovery codes single-use", async () => {
    test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for live Phase 6 security verification");
    process.env.NODE_ENV = "test";
    process.env.APP_ENCRYPTION_KEY = "phase-6-e2e-encryption-key-not-for-production";
    const [{ pool }, service, notifications] = await Promise.all([
      import("../../backend/config/db"),
      import("../../backend/organisations/employee-security-service"),
      import("../../backend/organisations/security-notifications"),
    ]);
    const suffix = randomUUID().slice(0, 8);
    const userId = `phase6-security-${suffix}`;
    const email = `${userId}@example.invalid`;
    try {
      await pool.query("INSERT INTO users(id,email,password_hash,auth_method,role,name,profile_complete,account_status) VALUES($1,$2,'old-hash','password','buyer','Phase 6 Security',true,'active')", [userId, email]);
      const enrollment = await service.beginTotpEnrollment(userId, email);
      const stored = await pool.query("SELECT secret_ciphertext FROM account_mfa_credentials WHERE user_id=$1", [userId]);
      expect(stored.rows[0].secret_ciphertext).not.toContain(enrollment.manualKey);
      const currentCode = speakeasy.totp({ secret: enrollment.manualKey, encoding: "base32" });
      const confirmed = await service.confirmTotpEnrollment(userId, currentCode);
      expect(confirmed.recoveryCodes).toHaveLength(10);
      expect((await service.verifyMfaCode(userId, confirmed.recoveryCodes[0])).method).toBe("recovery");
      await expect(service.verifyMfaCode(userId, confirmed.recoveryCodes[0])).rejects.toMatchObject({ code: "MFA_CODE_INVALID" });
      expect((await service.getMfaState(userId)).recoveryCodesRemaining).toBe(9);

      await service.requestEmailVerification(userId, email);
      const verifyMessage = notifications.readSecurityTestMessage("email_verification", email);
      const verifyToken = new URL(verifyMessage!.url).searchParams.get("token")!;
      await service.confirmEmailVerification(verifyToken);
      await expect(service.confirmEmailVerification(verifyToken)).rejects.toMatchObject({ code: "TOKEN_INVALID" });
      expect((await pool.query("SELECT email_verified_at FROM users WHERE id=$1", [userId])).rows[0].email_verified_at).toBeTruthy();

      await service.requestPasswordReset(email);
      const resetMessage = notifications.readSecurityTestMessage("password_reset", email);
      const resetToken = new URL(resetMessage!.url).searchParams.get("token")!;
      const tokenRow = await pool.query("SELECT token_hash FROM account_password_reset_tokens WHERE user_id=$1 AND used_at IS NULL", [userId]);
      expect(tokenRow.rows[0].token_hash).not.toBe(resetToken);
      await pool.query("INSERT INTO sessions(sid,sess,expire) VALUES($1,$2::jsonb,now()+interval '1 day')", [`phase6-reset-${suffix}`, JSON.stringify({ userId })]);
      await service.confirmPasswordReset(resetToken, "ChangedPassword456");
      expect((await pool.query("SELECT count(*)::int AS count FROM sessions WHERE sess->>'userId'=$1", [userId])).rows[0].count).toBe(0);
      await expect(service.confirmPasswordReset(resetToken, "AnotherPassword789")).rejects.toMatchObject({ code: "TOKEN_INVALID" });
    } finally {
      await pool.query("DELETE FROM admin_audit_events WHERE target_id=$1", [userId]).catch(() => undefined);
      await pool.query("DELETE FROM users WHERE id=$1", [userId]).catch(() => undefined);
    }
  });

  test("never exposes invitation and reset validity through unsafe public responses", async ({ request }) => {
    const unknown = `${randomUUID()}${randomUUID()}`.replaceAll("-", "");
    const invitation = await request.get(`/api/auth/invitations/${unknown}`);
    expect(invitation.status()).toBe(410);
    const reset = await request.post("/api/auth/password-reset/request", { data: { email: `missing-${randomUUID()}@example.invalid` } });
    expect(reset.status()).toBe(202);
    expect(await reset.json()).toEqual({ accepted: true });
  });
});
