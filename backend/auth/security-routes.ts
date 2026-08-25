import rateLimit from "express-rate-limit";
import type { Express, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import {
  acceptEmployeeInvitationSchema,
  emailVerificationRequestSchema,
  mfaChallengeSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  tokenSchema,
} from "@shared/schema";
import { authStorage } from "./storage";
import { stampAuthenticatedSession } from "./session-security";
import {
  acceptEmployeeInvitation,
  confirmEmailVerification,
  confirmPasswordReset,
  EmployeeSecurityError,
  inspectEmployeeInvitation,
  requestEmailVerification,
  requestPasswordReset,
  verifyMfaCode,
} from "../organisations/employee-security-service";
import { recordAccountLoginEvent } from "./login-events";

const tokenLimiter = rateLimit({ windowMs: 60 * 60_000, max: 8, standardHeaders: true, legacyHeaders: false });
const mfaLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

function errorResponse(error: unknown, res: Response) {
  if (error instanceof ZodError) return res.status(400).json({ error: "Request validation failed", code: "AUTH_INVALID_INPUT", fieldErrors: error.flatten().fieldErrors });
  if (error instanceof EmployeeSecurityError) return res.status(error.status).json({ error: error.message, code: error.code });
  console.error("Account security operation failed", error);
  return res.status(503).json({ error: "Account security is temporarily unavailable", code: "AUTH_SECURITY_UNAVAILABLE" });
}

export function registerAccountSecurityRoutes(app: Express, isAuthenticated: RequestHandler) {
  app.get("/api/auth/invitations/:token", tokenLimiter, async (req, res) => {
    try { return res.json({ invitation: await inspectEmployeeInvitation(req.params.token) }); }
    catch (error) { return errorResponse(error, res); }
  });

  app.post("/api/auth/invitations/accept", tokenLimiter, async (req, res) => {
    try {
      const input = acceptEmployeeInvitationSchema.parse(req.body);
      return res.json({ membership: await acceptEmployeeInvitation(input.token, input.name, input.password) });
    } catch (error) { return errorResponse(error, res); }
  });

  app.post("/api/auth/email-verification/request", tokenLimiter, isAuthenticated, async (req, res) => {
    try {
      emailVerificationRequestSchema.parse(req.body ?? {});
      const user = await authStorage.getUser(req.session.userId!);
      if (!user?.email) return res.status(422).json({ error: "This account has no email address", code: "EMAIL_REQUIRED" });
      return res.status(202).json(await requestEmailVerification(user.id, user.email));
    } catch (error) { return errorResponse(error, res); }
  });

  app.post("/api/auth/email-verification/confirm", tokenLimiter, async (req, res) => {
    try { return res.json(await confirmEmailVerification(tokenSchema.parse(req.body).token)); }
    catch (error) { return errorResponse(error, res); }
  });

  app.post("/api/auth/password-reset/request", tokenLimiter, async (req, res) => {
    try { await requestPasswordReset(passwordResetRequestSchema.parse(req.body).email); return res.status(202).json({ accepted: true }); }
    catch (error) { return errorResponse(error, res); }
  });

  app.post("/api/auth/password-reset/confirm", tokenLimiter, async (req, res) => {
    try { const input = passwordResetConfirmSchema.parse(req.body); return res.json(await confirmPasswordReset(input.token, input.password)); }
    catch (error) { return errorResponse(error, res); }
  });

  app.post("/api/auth/mfa/verify", mfaLimiter, async (req, res) => {
    const pendingUserId = req.session.pendingMfaUserId;
    const expiresAt = req.session.pendingMfaExpiresAt ? Date.parse(req.session.pendingMfaExpiresAt) : 0;
    if (!pendingUserId || !expiresAt || expiresAt <= Date.now()) {
      delete req.session.pendingMfaUserId;
      delete req.session.pendingMfaExpiresAt;
      return res.status(401).json({ error: "MFA challenge expired", code: "MFA_CHALLENGE_EXPIRED" });
    }
    try {
      const { code } = mfaChallengeSchema.parse(req.body);
      const result = await verifyMfaCode(pendingUserId, code);
      const user = await authStorage.getUser(pendingUserId);
      if (!user || user.accountStatus !== "active") return res.status(403).json({ error: "This account is not active", code: "ACCOUNT_NOT_ACTIVE" });
      stampAuthenticatedSession(req, user.id);
      await recordAccountLoginEvent({ req, userId: user.id, email: user.email, outcome: "success", method: result.method === "recovery" ? "mfa_recovery" : "mfa_totp" });
      const { passwordHash: _passwordHash, ...safeUser } = user;
      return res.json({ user: safeUser, method: result.method });
    } catch (error) {
      await recordAccountLoginEvent({ req, userId: pendingUserId, outcome: "failed", method: "mfa_totp", failureCode: "MFA_CODE_INVALID" }).catch(() => undefined);
      return errorResponse(error, res);
    }
  });
}
