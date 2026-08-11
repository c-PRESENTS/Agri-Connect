import { createHmac } from "crypto";
import type { NextFunction, Request, Response } from "express";
import type { AdminAccessContext, AdminPermissionCode } from "@shared/models/organisations";
import { getPlatformAdminAccess, recordAdminAuditEvent } from "./repository";

declare global {
  namespace Express {
    interface Request {
      adminAccess?: AdminAccessContext;
    }
  }
}

function requestHash(value: string | undefined): string | null {
  if (!value) return null;
  const key = process.env.SECURITY_AUDIT_HASH_KEY || process.env.SESSION_SECRET || "local-audit-hash-key";
  return createHmac("sha256", key).update(value).digest("hex");
}

function requestUserId(req: Request): string | undefined {
  return req.session?.userId;
}

export function requireAdminPermission(permission: AdminPermissionCode) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = requestUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    try {
      const access = await getPlatformAdminAccess(userId);
      req.adminAccess = access;
      if (!access.hasAccess || !access.permissions.includes(permission)) {
        void recordAdminAuditEvent({
          organisationId: access.organisation?.id,
          actorUserId: userId,
          membershipId: access.membership?.id,
          action: "admin.permission_denied",
          permissionCode: permission,
          targetType: "route",
          targetId: req.path,
          outcome: "denied",
          requestId: req.get("x-request-id") ?? null,
          ipHash: requestHash(req.ip),
          deviceHash: requestHash(req.get("user-agent")),
          metadata: { method: req.method },
        }).catch(() => undefined);
        return res.status(403).json({
          error: "Access denied",
          code: "ADMIN_PERMISSION_REQUIRED",
          permission,
        });
      }

      res.on("finish", () => {
        void recordAdminAuditEvent({
          organisationId: access.organisation?.id,
          actorUserId: userId,
          membershipId: access.membership?.id,
          action: "admin.route_accessed",
          permissionCode: permission,
          targetType: "route",
          targetId: req.path,
          outcome: res.statusCode < 400 ? "success" : "failed",
          requestId: req.get("x-request-id") ?? null,
          ipHash: requestHash(req.ip),
          deviceHash: requestHash(req.get("user-agent")),
          metadata: { method: req.method, statusCode: res.statusCode },
        }).catch(() => undefined);
      });
      next();
    } catch (error) {
      next(error);
    }
  };
}
