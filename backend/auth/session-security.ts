import type { NextFunction, Request, Response } from "express";
import { createHmac } from "crypto";
import { hasEnabledMfa } from "../organisations/employee-security-service";

declare module "express-session" {
  interface SessionData {
    pendingMfaUserId?: string;
    pendingMfaExpiresAt?: string;
    createdAt?: string;
    lastAuthenticatedAt?: string;
    deviceLabel?: string;
    ipHash?: string;
  }
}

function hash(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return createHmac("sha256", process.env.SECURITY_AUDIT_HASH_KEY || process.env.SESSION_SECRET || "local-session-hash-key").update(value).digest("hex");
}

function deviceLabel(userAgent: string | undefined): string {
  if (!userAgent) return "Unknown browser";
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Chrome\//.test(userAgent) ? "Chrome" : /Firefox\//.test(userAgent) ? "Firefox" : /Safari\//.test(userAgent) ? "Safari" : "Browser";
  const platform = /Windows/.test(userAgent) ? "Windows" : /Android/.test(userAgent) ? "Android" : /iPhone|iPad/.test(userAgent) ? "iOS" : /Mac OS/.test(userAgent) ? "macOS" : /Linux/.test(userAgent) ? "Linux" : "device";
  return `${browser} on ${platform}`;
}

export function stampAuthenticatedSession(req: Request, userId: string): void {
  const now = new Date().toISOString();
  req.session.userId = userId;
  delete req.session.pendingMfaUserId;
  delete req.session.pendingMfaExpiresAt;
  req.session.createdAt ||= now;
  req.session.lastAuthenticatedAt = now;
  req.session.deviceLabel = deviceLabel(req.get("user-agent"));
  req.session.ipHash = hash(req.ip);
}

export async function establishSessionOrMfaChallenge(req: Request, userId: string): Promise<boolean> {
  if (await hasEnabledMfa(userId)) {
    delete req.session.userId;
    req.session.pendingMfaUserId = userId;
    req.session.pendingMfaExpiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    req.session.createdAt ||= new Date().toISOString();
    req.session.deviceLabel = deviceLabel(req.get("user-agent"));
    req.session.ipHash = hash(req.ip);
    return true;
  }
  stampAuthenticatedSession(req, userId);
  return false;
}

export function requireRecentAuthentication(req: Request, res: Response, next: NextFunction) {
  const authenticatedAt = req.session.lastAuthenticatedAt ? Date.parse(req.session.lastAuthenticatedAt) : 0;
  if (!authenticatedAt || Date.now() - authenticatedAt > 10 * 60_000) {
    return res.status(403).json({ error: "Recent authentication is required", code: "RECENT_AUTH_REQUIRED" });
  }
  next();
}
