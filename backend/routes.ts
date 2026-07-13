import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { registerBackendModules } from "./modules/register";

function getUserId(req: Request): string | undefined {
  return req.session?.userId;
}

function getUserIdOrSession(req: Request): string {
  return getUserId(req) ?? `session_${req.sessionID}`;
}

// Touching the session forces express-session to persist a cookie even when
// `saveUninitialized: false` is set. Required for guest carts so the same
// session ID survives across requests; otherwise every request gets a fresh
// sessionID and the cart appears empty on the next read.
function touchGuestSession(req: Request): void {
  if (getUserId(req)) return;
  (req.session as any).guest = true;
}

// Merge any guest-session cart into the user's cart on the first authed request.
// Idempotent: clears the guest key after merging.
async function mergeGuestCartIfNeeded(req: Request): Promise<void> {
  const userId = getUserId(req);
  if (!userId) return;
  const guestKey = req.session.guestCartKey ?? `session_${req.sessionID}`;
  if (guestKey === userId) return;
  try {
    await storage.mergeGuestCart(guestKey, userId);
    delete req.session.guestCartKey;
  } catch {
    // non-fatal
  }
}

// Tiny in-memory per-key rate limiter (sliding window).
const rateBuckets = new Map<string, number[]>();
// Periodic cleanup so the map doesn't grow unbounded (every 10 min, drop empty/stale keys).
setInterval(() => {
  const cutoff = Date.now() - 10 * 60_000;
  for (const [k, arr] of Array.from(rateBuckets.entries())) {
    const fresh = arr.filter((t: number) => t > cutoff);
    if (fresh.length === 0) rateBuckets.delete(k);
    else rateBuckets.set(k, fresh);
  }
}, 10 * 60_000).unref?.();

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const arr = (rateBuckets.get(key) || []).filter((t) => t > cutoff);
  if (arr.length >= limit) {
    rateBuckets.set(key, arr);
    return false;
  }
  arr.push(now);
  rateBuckets.set(key, arr);
  return true;
}
function aiRateLimit(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `ai:${getUserId(req) ?? req.ip}`;
    if (!rateLimit(key, limit, windowMs)) {
      return res.status(429).json({ error: "Too many requests, please slow down." });
    }
    next();
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  registerBackendModules(app, {
    getUserId,
    getUserIdOrSession,
    touchGuestSession,
    mergeGuestCartIfNeeded,
    rateLimit,
    aiRateLimit,
  });

  return httpServer;
}
