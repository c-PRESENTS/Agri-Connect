import crypto from "crypto";
import { and, count, eq, gte, lt } from "drizzle-orm";
import { db } from "../db";
import { otpCodes } from "@shared/models/auth";

const OTP_TTL_MS = 5 * 60 * 1000;    // 5 minutes
const MAX_ATTEMPTS = 5;                // lock after 5 wrong guesses
const SEND_LIMIT = 5;                  // max OTPs sent per phone per window
const SEND_WINDOW_MS = 30 * 60 * 1000; // 30-minute send window

export type VerifyResult =
  | { valid: true }
  | { valid: false; reason: "not_found" | "expired" | "invalid" | "max_attempts" };

function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function checkSendRateLimit(phone: string): Promise<boolean> {
  const sanitized = sanitizePhone(phone);
  const windowStart = new Date(Date.now() - SEND_WINDOW_MS);

  // Lazily prune records older than the window for this phone.
  await db.delete(otpCodes).where(
    and(eq(otpCodes.phone, sanitized), lt(otpCodes.createdAt, windowStart)),
  );

  const [row] = await db
    .select({ n: count() })
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, sanitized), gte(otpCodes.createdAt, windowStart)));

  return (row?.n ?? 0) < SEND_LIMIT;
}

export async function generateOtp(phone: string): Promise<{ code: string; ttlMs: number }> {
  const sanitized = sanitizePhone(phone);

  // Invalidate any earlier active OTP so only the latest is usable.
  await db
    .update(otpCodes)
    .set({ used: true })
    .where(and(eq(otpCodes.phone, sanitized), eq(otpCodes.used, false)));

  const code = crypto.randomInt(100_000, 1_000_000).toString();
  await db.insert(otpCodes).values({
    phone: sanitized,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    attempts: 0,
    used: false,
  });

  return { code, ttlMs: OTP_TTL_MS };
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyResult> {
  const sanitized = sanitizePhone(phone);
  const now = new Date();

  const [record] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, sanitized), eq(otpCodes.used, false)))
    .orderBy(otpCodes.createdAt)
    .limit(1);

  if (!record) return { valid: false, reason: "not_found" };

  if (record.expiresAt < now) {
    await db.delete(otpCodes).where(eq(otpCodes.id, record.id));
    return { valid: false, reason: "expired" };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return { valid: false, reason: "max_attempts" };
  }

  // Constant-time comparison to prevent timing oracle attacks.
  const expected = Buffer.from(hashCode(code));
  const stored   = Buffer.from(record.codeHash);
  const match =
    expected.length === stored.length && crypto.timingSafeEqual(expected, stored);

  if (!match) {
    await db
      .update(otpCodes)
      .set({ attempts: record.attempts + 1 })
      .where(eq(otpCodes.id, record.id));
    return { valid: false, reason: "invalid" };
  }

  // Consume — delete so the code is gone and can never be reused.
  await db.delete(otpCodes).where(eq(otpCodes.id, record.id));
  return { valid: true };
}
