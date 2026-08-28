import rateLimit from "express-rate-limit";
import type { Express, Request, Response } from "express";
import { z, ZodError } from "zod";
import {
  employeeDirectoryQuerySchema,
  employeeOverrideSchema,
  employeeRoleChangeSchema,
  employeeStatusChangeSchema,
  invitationActionSchema,
  inviteEmployeeSchema,
  rolePermissionMatrixSchema,
  totpCodeSchema,
} from "@shared/schema";
import { isAuthenticated } from "../../auth";
import { requireRecentAuthentication } from "../../auth/session-security";
import { authStorage } from "../../auth/storage";
import { requireAdminPermission } from "../../organisations/access";
import { getAdminEmployeeDetail, listAdminEmployees, listUserSecurityEvents, listUserSessions, getSecurityPosture } from "../../organisations/admin-employee-repository";
import {
  beginTotpEnrollment,
  changeEmployeeRole,
  changeEmployeeStatus,
  confirmTotpEnrollment,
  disableTotp,
  EmployeeSecurityError,
  inviteEmployee,
  regenerateRecoveryCodes,
  resendEmployeeInvitation,
  revokeEmployeeInvitation,
  revokeEmployeeSessions,
  revokeSessionById,
  setEmployeeOverride,
  updateRolePermissionMatrix,
  getMfaState,
} from "../../organisations/employee-security-service";

const idSchema = z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9._:-]+$/);
const invitationLimiter = rateLimit({ windowMs: 60 * 60_000, max: 20, standardHeaders: true, legacyHeaders: false });
const mfaLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

function actor(req: Request) {
  return { userId: req.session.userId!, access: req.adminAccess!, requestId: req.get("x-request-id") ?? null, sessionId: req.sessionID };
}

function sendError(error: unknown, res: Response) {
  if (error instanceof ZodError) return res.status(400).json({ error: "Request validation failed", code: "EMPLOYEE_INVALID_INPUT", fieldErrors: error.flatten().fieldErrors });
  if (error instanceof EmployeeSecurityError) return res.status(error.status).json({ error: error.message, code: error.code });
  console.error("Employee security operation failed", error);
  return res.status(503).json({ error: "Employee security is temporarily unavailable", code: "EMPLOYEE_SECURITY_UNAVAILABLE" });
}

export function registerEmployeeSecurityRoutes(app: Express) {
  app.get("/api/admin/employees", isAuthenticated, requireAdminPermission("employees.view"), async (req, res) => {
    try { return res.json(await listAdminEmployees(employeeDirectoryQuerySchema.parse(req.query))); }
    catch (error) { return sendError(error, res); }
  });

  app.get("/api/admin/employees/:membershipId", isAuthenticated, requireAdminPermission("employees.view"), async (req, res) => {
    try {
      const detail = await getAdminEmployeeDetail(idSchema.parse(req.params.membershipId));
      return detail ? res.json({ employee: detail, generatedAt: new Date().toISOString() }) : res.status(404).json({ error: "Employee not found", code: "EMPLOYEE_NOT_FOUND" });
    } catch (error) { return sendError(error, res); }
  });

  app.post("/api/admin/employees/invitations", isAuthenticated, invitationLimiter, requireAdminPermission("employees.invite"), requireRecentAuthentication, async (req, res) => {
    try { return res.status(201).json(await inviteEmployee(actor(req), inviteEmployeeSchema.parse(req.body))); }
    catch (error) { return sendError(error, res); }
  });

  app.post("/api/admin/employees/invitations/:invitationId/resend", isAuthenticated, invitationLimiter, requireAdminPermission("employees.invite"), requireRecentAuthentication, async (req, res) => {
    try { return res.json(await resendEmployeeInvitation(actor(req), idSchema.parse(req.params.invitationId))); }
    catch (error) { return sendError(error, res); }
  });

  app.post("/api/admin/employees/invitations/:invitationId/revoke", isAuthenticated, requireAdminPermission("employees.invite"), requireRecentAuthentication, async (req, res) => {
    try { return res.json(await revokeEmployeeInvitation(actor(req), idSchema.parse(req.params.invitationId), invitationActionSchema.parse(req.body).reason)); }
    catch (error) { return sendError(error, res); }
  });

  app.patch("/api/admin/employees/:membershipId/role", isAuthenticated, requireAdminPermission("employees.manage_permissions"), requireRecentAuthentication, async (req, res) => {
    try { return res.json(await changeEmployeeRole(actor(req), idSchema.parse(req.params.membershipId), employeeRoleChangeSchema.parse(req.body))); }
    catch (error) { return sendError(error, res); }
  });

  app.put("/api/admin/employees/:membershipId/overrides", isAuthenticated, requireAdminPermission("employees.manage_permissions"), requireRecentAuthentication, async (req, res) => {
    try { return res.json(await setEmployeeOverride(actor(req), idSchema.parse(req.params.membershipId), employeeOverrideSchema.parse(req.body))); }
    catch (error) { return sendError(error, res); }
  });

  for (const status of ["deactivate", "reactivate"] as const) app.post(
    `/api/admin/employees/:membershipId/${status}`,
    isAuthenticated,
    requireAdminPermission("employees.deactivate"),
    requireRecentAuthentication,
    async (req, res) => {
      try { return res.json(await changeEmployeeStatus(actor(req), idSchema.parse(req.params.membershipId), status === "deactivate" ? "deactivated" : "active", employeeStatusChangeSchema.parse(req.body).reason)); }
      catch (error) { return sendError(error, res); }
    },
  );

  app.post("/api/admin/employees/:membershipId/sessions/revoke", isAuthenticated, requireAdminPermission("employees.edit"), requireRecentAuthentication, async (req, res) => {
    try { return res.json(await revokeEmployeeSessions(actor(req), idSchema.parse(req.params.membershipId))); }
    catch (error) { return sendError(error, res); }
  });

  app.put("/api/admin/roles/:roleId/permissions", isAuthenticated, requireAdminPermission("employees.manage_permissions"), requireRecentAuthentication, async (req, res) => {
    try {
      const input = rolePermissionMatrixSchema.parse(req.body);
      return res.json(await updateRolePermissionMatrix(actor(req), idSchema.parse(req.params.roleId), input.permissionCodes, input.reason));
    } catch (error) { return sendError(error, res); }
  });

  app.get("/api/admin/security", isAuthenticated, requireAdminPermission("security.manage"), async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [mfa, sessions, events, posture] = await Promise.all([
        getMfaState(userId),
        listUserSessions(userId, req.sessionID),
        listUserSecurityEvents(userId),
        getSecurityPosture(userId),
      ]);
      return res.json({ mfa, sessions, events, posture, generatedAt: new Date().toISOString() });
    } catch (error) { return sendError(error, res); }
  });

  app.post("/api/admin/security/totp/enroll", isAuthenticated, mfaLimiter, requireAdminPermission("security.manage"), requireRecentAuthentication, async (req, res) => {
    try {
      const user = await authStorage.getUser(req.session.userId!);
      if (!user?.email) return res.status(422).json({ error: "An email address is required", code: "EMAIL_REQUIRED" });
      return res.json(await beginTotpEnrollment(user.id, user.email));
    } catch (error) { return sendError(error, res); }
  });

  app.post("/api/admin/security/totp/confirm", isAuthenticated, mfaLimiter, requireAdminPermission("security.manage"), requireRecentAuthentication, async (req, res) => {
    try { return res.json(await confirmTotpEnrollment(req.session.userId!, totpCodeSchema.parse(req.body).code, req.sessionID)); }
    catch (error) { return sendError(error, res); }
  });

  app.post("/api/admin/security/totp/disable", isAuthenticated, mfaLimiter, requireAdminPermission("security.manage"), requireRecentAuthentication, async (req, res) => {
    try { return res.json(await disableTotp(req.session.userId!, totpCodeSchema.parse(req.body).code, req.sessionID)); }
    catch (error) { return sendError(error, res); }
  });

  app.post("/api/admin/security/recovery-codes/regenerate", isAuthenticated, mfaLimiter, requireAdminPermission("security.manage"), requireRecentAuthentication, async (req, res) => {
    try { return res.json(await regenerateRecoveryCodes(req.session.userId!, totpCodeSchema.parse(req.body).code)); }
    catch (error) { return sendError(error, res); }
  });

  app.delete("/api/admin/security/sessions/:sessionId", isAuthenticated, requireAdminPermission("security.manage"), requireRecentAuthentication, async (req, res) => {
    if (req.params.sessionId === req.sessionID) return res.status(409).json({ error: "Use Sign out for the current session", code: "CURRENT_SESSION_REQUIRES_LOGOUT" });
    try { return res.json(await revokeSessionById(req.session.userId!, req.params.sessionId)); }
    catch (error) { return sendError(error, res); }
  });
}
