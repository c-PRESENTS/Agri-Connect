import { createHmac } from "crypto";
import type { Request } from "express";
import { pool } from "../config/db";

function hash(value: string | undefined): string | null {
  if (!value) return null;
  const key = process.env.SECURITY_AUDIT_HASH_KEY || process.env.SESSION_SECRET || "local-login-audit-key";
  return createHmac("sha256", key).update(value).digest("hex");
}

export async function recordAccountLoginEvent(input: {
  req: Request;
  userId?: string | null;
  email?: string | null;
  outcome: "success" | "failed" | "denied";
  method: "password" | "google" | "otp" | "student_email" | "mfa_totp" | "mfa_recovery";
  failureCode?: string | null;
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO account_login_events (user_id,email_hash,outcome,method,ip_hash,device_hash,failure_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        input.userId ?? null,
        hash(input.email?.trim().toLowerCase()),
        input.outcome,
        input.method,
        hash(input.req.ip),
        hash(input.req.get("user-agent")),
        input.failureCode ?? null,
      ],
    );
  } catch (error) {
    console.warn("[login-audit] unable to record login event", error instanceof Error ? error.message : "unknown error");
  }
}
