import type { Express } from "express";
import { isAuthenticated } from "../../auth";
import { requireAdminPermission } from "../../organisations/access";
import {
  getPlatformAdminAccess,
  listPlatformPermissions,
  listPlatformRoles,
  recordAdminAuditEvent,
} from "../../organisations/repository";

export function registerAdminFoundationRoutes(app: Express): void {
  app.get("/api/admin/access", isAuthenticated, async (req, res, next) => {
    try {
      const access = await getPlatformAdminAccess(req.session.userId!);
      res.json(access);
    } catch (error) {
      next(error);
    }
  });

  app.get(
    "/api/admin/organisations/current",
    isAuthenticated,
    requireAdminPermission("dashboard.view"),
    async (req, res, next) => {
      try {
        await recordAdminAuditEvent({
          organisationId: req.adminAccess?.organisation?.id,
          actorUserId: req.session.userId,
          membershipId: req.adminAccess?.membership?.id,
          action: "admin.organisation_context_viewed",
          permissionCode: "dashboard.view",
          targetType: "organisation",
          targetId: req.adminAccess?.organisation?.id,
        });
        res.json(req.adminAccess);
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/admin/roles",
    isAuthenticated,
    requireAdminPermission("employees.view"),
    async (_req, res, next) => {
      try {
        res.json({ roles: await listPlatformRoles() });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/admin/permissions",
    isAuthenticated,
    requireAdminPermission("employees.manage_permissions"),
    async (_req, res, next) => {
      try {
        res.json({ permissions: await listPlatformPermissions() });
      } catch (error) {
        next(error);
      }
    },
  );
}
