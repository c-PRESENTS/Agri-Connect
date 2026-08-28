import type { Express, NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";
import {
  adminBackupRequestSchema,
  controlCentreResourceActionSchema,
  controlCentreResourceModuleSchema,
  organisationApplicationReviewSchema,
  organisationOperationalSettingSchema,
  type AdminPermissionCode,
  type ControlCentreResourceModule,
} from "@shared/schema";
import { isAuthenticated } from "../../auth";
import { requireAdminPermission } from "../../organisations/access";
import {
  createControlCentreFarmer,
  createControlCentreBuyer,
  createControlCentreStudent,
  createControlCentreResearcher,
  createControlCentreLogisticsPartner,
  createOrganisationApplication,
  getControlCentreAnalytics,
  getControlCentreFarmerDetail,
  getControlCentreBuyerDetail,
  getControlCentreStudentDetail,
  getControlCentreResearcherDetail,
  getControlCentreLogisticsPartnerDetail,
  getControlCentreOverview,
  getControlCentreRevenue,
  getGlobalOperationsMap,
  listControlCentreFarmers,
  listControlCentreOrganisations,
  listControlCentreResources,
  listDataRequests,
  listOrganisationApplications,
  mutateControlCentreResource,
  requestAdminBackup,
  reviewOrganisationApplication,
  setOrganisationOperationalSetting,
  updateControlCentreFarmer,
  updateControlCentreStudent,
  updateControlCentreResearcher,
  updateControlCentreLogisticsPartner,
  bulkMutateFarmers,
  getControlCentreRegionDetail,
  createControlCentreRegion,
  updateControlCentreRegion,
  getControlCentreContentDetail,
  createControlCentreContent,
  updateControlCentreContent,
  deleteControlCentreContent,
  getControlCentreOrderDetail,
  updateControlCentreOrderStatus,
  globalSearchControlCentre,
} from "../../organisations/control-centre-repository";
import {
  acceptMarketplaceOpportunity,
  getCategoryExplorerData,
  setCategoryExplorerSavedProduct,
} from "../../organisations/category-explorer-repository";
import { changeAdminUserStatus } from "../../organisations/admin-user-service";
import { recordAdminAuditEvent } from "../../organisations/repository";
import { storage } from "../../storage";

const idSchema = z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9._:-]+$/);
const farmerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(160).optional(),
  status: z.enum(["all", "verified", "pending"]).default("all"),
  region: z.string().trim().max(180).optional(),
  registeredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
const overviewQuerySchema = z.object({
  days: z.coerce.number().int().refine((value) => [7, 30, 90].includes(value), "Reporting window must be 7, 30, or 90 days").default(30),
});
const categoryExplorerQuerySchema = z.object({
  category: idSchema.optional(),
  subCategory: idSchema.optional(),
  variety: z.string().trim().min(1).max(160).optional(),
  region: z.string().trim().min(1).max(180).optional(),
  search: z.string().trim().max(160).optional(),
  scope: z.enum(["local", "global"]).default("local"),
  sortBy: z.enum(["relevance", "price_asc", "price_desc", "rating"]).default("relevance"),
  minPrice: z.coerce.number().nonnegative().max(1_000_000).optional(),
  maxPrice: z.coerce.number().nonnegative().max(1_000_000).optional(),
  quantity: z.enum(["any", "bulk", "retail"]).default("any"),
  quality: z.enum(["all", "organic", "premium"]).default("all"),
}).refine(
  (value) => value.minPrice === undefined || value.maxPrice === undefined || value.minPrice <= value.maxPrice,
  { path: ["maxPrice"], message: "Maximum price must be greater than or equal to minimum price" },
);
const savedProductSchema = z.object({ saved: z.boolean() });
const opportunityClaimSchema = z.object({ id: idSchema });

const modulePermissions: Record<ControlCentreResourceModule, { read: AdminPermissionCode; manage: AdminPermissionCode | null }> = {
  sellers: { read: "partners.view", manage: "users.suspend" },
  buyers: { read: "partners.view", manage: "users.suspend" },
  students: { read: "partners.view", manage: "partners.manage" },
  researchers: { read: "partners.view", manage: "partners.manage" },
  "service-providers": { read: "partners.view", manage: "organisations.suspend" },
  "logistics-partners": { read: "partners.view", manage: "users.suspend" },
  regions: { read: "regions.view", manage: "regions.manage" },
  opportunities: { read: "opportunities.view", manage: "opportunities.manage" },
  content: { read: "content.view", manage: "content.manage" },
  orders: { read: "orders.view", manage: "orders.manage" },
  logistics: { read: "logistics.view", manage: "logistics.manage" },
  settings: { read: "settings.manage", manage: null },
};

function modulePermission(kind: "read" | "manage") {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const module = controlCentreResourceModuleSchema.parse(req.params.module);
      const permission = modulePermissions[module][kind];
      if (!permission) return res.status(405).json({ error: "This operation is not supported", code: "CONTROL_CENTRE_ACTION_UNSUPPORTED" });
      return requireAdminPermission(permission)(req, res, next);
    } catch (error) {
      return sendError(error, res);
    }
  };
}

function requirePlatformSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.adminAccess?.role?.isSuperAdmin || req.adminAccess.organisation?.id !== "agriconnect-platform") {
    return res.status(403).json({ error: "Platform Super Admin access is required", code: "SUPER_ADMIN_REQUIRED" });
  }
  next();
}

function actor(req: Request) {
  return {
    userId: req.session.userId!,
    access: req.adminAccess!,
    requestId: req.get("x-request-id") ?? null,
  };
}

function sendError(error: unknown, res: Response) {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: "Request validation failed", code: "CONTROL_CENTRE_INVALID_INPUT", fieldErrors: error.flatten().fieldErrors });
  }
  if (error instanceof Error) {
    const known: Record<string, { status: number; message: string }> = {
      ORGANISATION_APPLICATION_TRANSITION_INVALID: { status: 409, message: "The organisation application cannot make that transition" },
      ORGANISATION_NOT_APPROVED: { status: 422, message: "Settings can only be stored for an approved organisation" },
      CONTROL_CENTRE_ACTION_UNSUPPORTED: { status: 405, message: "This action is not supported for the selected resource" },
      CONTROL_CENTRE_RESOURCE_NOT_FOUND: { status: 404, message: "The selected resource was not found" },
      CONTROL_CENTRE_TRANSITION_INVALID: { status: 409, message: "The selected resource cannot make that transition" },
      MARKETPLACE_OPPORTUNITY_NOT_CLAIMABLE: { status: 409, message: "This opportunity is unavailable or the current account is not an eligible regional seller" },
    };
    const match = known[error.message];
    if (match) return res.status(match.status).json({ error: match.message, code: error.message });
  }
  console.error("Organisation control centre operation failed", error);
  return res.status(503).json({ error: "The Organisation Control Centre is temporarily unavailable", code: "CONTROL_CENTRE_UNAVAILABLE" });
}

export function registerOrganisationControlCentreRoutes(app: Express) {
  app.get("/api/admin/organisations", isAuthenticated, requireAdminPermission("dashboard.view"), requirePlatformSuperAdmin, async (req, res) => {
    try { return res.json(await listControlCentreOrganisations(req.session.userId!, req.adminAccess?.role?.isSuperAdmin === true)); }
    catch (error) { return sendError(error, res); }
  });

  app.get("/api/admin/overview", isAuthenticated, requireAdminPermission("dashboard.view"), requirePlatformSuperAdmin, async (req, res) => {
    try { return res.json(await getControlCentreOverview(overviewQuerySchema.parse(req.query).days)); }
    catch (error) { return sendError(error, res); }
  });

  app.get("/api/admin/farmers", isAuthenticated, requireAdminPermission("users.view"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const input = farmerQuerySchema.parse(req.query);
      return res.json(await listControlCentreFarmers({
        ...input,
        status: input.status === "all" ? undefined : input.status,
        region: input.region === "all" ? undefined : input.region,
      }));
    } catch (error) { return sendError(error, res); }
  });

  app.get("/api/admin/farmers/:farmerId", isAuthenticated, requireAdminPermission("users.view"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const detail = await getControlCentreFarmerDetail(idSchema.parse(req.params.farmerId));
      return detail ? res.json(detail) : res.status(404).json({ error: "Farmer not found", code: "ADMIN_FARMER_NOT_FOUND" });
    } catch (error) { return sendError(error, res); }
  });

  app.post("/api/admin/farmers", isAuthenticated, requireAdminPermission("users.edit"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const farmerSchema = z.object({
        name: z.string().trim().min(2).max(180),
        email: z.string().trim().email(),
        phone: z.string().trim().max(40).optional(),
        region: z.string().trim().max(120).optional(),
        isVerified: z.boolean().optional(),
      });
      const input = farmerSchema.parse(req.body);
      const created = await createControlCentreFarmer({
        ...input,
        actorUserId: req.session.userId!,
        organisationId: req.adminAccess!.organisation!.id,
        membershipId: req.adminAccess?.membership?.id ?? null,
        requestId: req.get("x-request-id") ?? null,
      });
      return res.status(201).json({ farmer: created });
    } catch (error) { return sendError(error, res); }
  });

  app.patch("/api/admin/farmers/:farmerId", isAuthenticated, requireAdminPermission("users.edit"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const farmerId = idSchema.parse(req.params.farmerId);
      const updateSchema = z.object({
        name: z.string().trim().min(2).max(180).optional(),
        email: z.string().trim().email().optional(),
        phone: z.string().trim().max(40).optional(),
        region: z.string().trim().max(120).optional(),
        isVerified: z.boolean().optional(),
        status: z.enum(["active", "suspended", "deactivated"]).optional(),
      });
      const input = updateSchema.parse(req.body);
      const updated = await updateControlCentreFarmer({
        id: farmerId,
        ...input,
        actorUserId: req.session.userId!,
        organisationId: req.adminAccess!.organisation!.id,
        membershipId: req.adminAccess?.membership?.id ?? null,
        requestId: req.get("x-request-id") ?? null,
      });
      return res.json({ farmer: updated });
    } catch (error) { return sendError(error, res); }
  });

  app.post("/api/admin/farmers/bulk", isAuthenticated, requireAdminPermission("users.edit"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const bulkSchema = z.object({
        ids: z.array(z.string().trim().min(1)).min(1),
        action: z.enum(["verify", "unverify", "suspend", "activate"]),
      });
      const input = bulkSchema.parse(req.body);
      const result = await bulkMutateFarmers({
        ...input,
        actorUserId: req.session.userId!,
        organisationId: req.adminAccess!.organisation!.id,
        membershipId: req.adminAccess?.membership?.id ?? null,
        requestId: req.get("x-request-id") ?? null,
      });
      return res.json(result);
    } catch (error) { return sendError(error, res); }
  });

  app.get("/api/admin/buyers/:buyerId", isAuthenticated, requireAdminPermission("partners.view"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const id = idSchema.parse(req.params.buyerId);
      const detail = await getControlCentreBuyerDetail(id);
      if (!detail) return res.status(404).json({ error: "Buyer account not found" });
      return res.json(detail);
    } catch (error) { return sendError(error, res); }
  });

  app.post("/api/admin/buyers", isAuthenticated, requireAdminPermission("users.edit"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const createSchema = z.object({
        name: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(180),
        phone: z.string().trim().max(40).optional(),
        location: z.string().trim().max(120).optional(),
      });
      const input = createSchema.parse(req.body);
      const created = await createControlCentreBuyer({
        ...input,
        actorUserId: req.session.userId!,
        organisationId: req.adminAccess!.organisation!.id,
        membershipId: req.adminAccess?.membership?.id ?? null,
        requestId: req.get("x-request-id") ?? null,
      });
      return res.status(201).json(created);
    } catch (error) { return sendError(error, res); }
  });

  app.patch("/api/admin/buyers/:buyerId", isAuthenticated, requireAdminPermission("users.edit"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const id = idSchema.parse(req.params.buyerId);
      const editSchema = z.object({
        name: z.string().trim().min(2).max(120).optional(),
        email: z.string().trim().email().max(180).optional(),
        phone: z.string().trim().max(40).optional().nullable(),
        location: z.string().trim().max(120).optional(),
        status: z.enum(["active", "suspended"]).optional(),
      });
      const input = editSchema.parse(req.body);
      const updated = await updateControlCentreFarmer({
        id,
        name: input.name,
        email: input.email,
        phone: input.phone || undefined,
        region: input.location,
        status: input.status,
        actorUserId: req.session.userId!,
        organisationId: req.adminAccess!.organisation!.id,
        membershipId: req.adminAccess?.membership?.id ?? null,
        requestId: req.get("x-request-id") ?? null,
      });
      return res.json(updated);
    } catch (error) { return sendError(error, res); }
  });

  app.get("/api/admin/students/:studentId", isAuthenticated, requireAdminPermission("partners.view"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const id = idSchema.parse(req.params.studentId);
      const detail = await getControlCentreStudentDetail(id);
      if (!detail) return res.status(404).json({ error: "Student programme record not found" });
      return res.json(detail);
    } catch (error) { return sendError(error, res); }
  });

  app.post("/api/admin/students", isAuthenticated, requireAdminPermission("users.edit"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const createSchema = z.object({
        email: z.string().trim().email().max(180),
        studentNumber: z.string().trim().min(2).max(80),
        programme: z.string().trim().min(2).max(180),
        studyLevel: z.enum(["UG", "PG", "PhD"]),
        department: z.string().trim().max(180).optional(),
        accessExpiresAt: z.string().optional(),
      });
      const input = createSchema.parse(req.body);
      const created = await createControlCentreStudent({
        ...input,
        actorUserId: req.session.userId!,
        organisationId: req.adminAccess!.organisation!.id,
        membershipId: req.adminAccess?.membership?.id ?? null,
        requestId: req.get("x-request-id") ?? null,
      });
      return res.status(201).json(created);
    } catch (error) { return sendError(error, res); }
  });

  app.patch("/api/admin/students/:studentId", isAuthenticated, requireAdminPermission("users.edit"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const id = idSchema.parse(req.params.studentId);
      const editSchema = z.object({
        programme: z.string().trim().min(2).max(180).optional(),
        studyLevel: z.enum(["UG", "PG", "PhD"]).optional(),
        department: z.string().trim().max(180).optional(),
        status: z.enum(["active", "suspended", "completed", "withdrawn", "expired"]).optional(),
        accessExpiresAt: z.string().optional(),
      });
      const input = editSchema.parse(req.body);
      const updated = await updateControlCentreStudent({
        id,
        ...input,
        actorUserId: req.session.userId!,
        organisationId: req.adminAccess!.organisation!.id,
        membershipId: req.adminAccess?.membership?.id ?? null,
        requestId: req.get("x-request-id") ?? null,
      });
      return res.json(updated);
    } catch (error) { return sendError(error, res); }
  });

  app.get("/api/admin/researchers/:researcherId", isAuthenticated, requireAdminPermission("partners.view"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const id = idSchema.parse(req.params.researcherId);
      const detail = await getControlCentreResearcherDetail(id);
      if (!detail) return res.status(404).json({ error: "Researcher programme record not found" });
      return res.json(detail);
    } catch (error) { return sendError(error, res); }
  });

  app.post("/api/admin/researchers", isAuthenticated, requireAdminPermission("users.edit"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const createSchema = z.object({
        email: z.string().trim().email().max(180),
        researcherId: z.string().trim().min(2).max(80),
        researchDomain: z.string().trim().min(2).max(180),
        roleLevel: z.enum(["PhD", "Postdoc", "PI", "Fellow"]),
        department: z.string().trim().max(180).optional(),
        accessExpiresAt: z.string().optional(),
      });
      const input = createSchema.parse(req.body);
      const created = await createControlCentreResearcher({
        ...input,
        actorUserId: req.session.userId!,
        organisationId: req.adminAccess!.organisation!.id,
        membershipId: req.adminAccess?.membership?.id ?? null,
        requestId: req.get("x-request-id") ?? null,
      });
      return res.status(201).json(created);
    } catch (error) { return sendError(error, res); }
  });

  app.patch("/api/admin/researchers/:researcherId", isAuthenticated, requireAdminPermission("users.edit"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const id = idSchema.parse(req.params.researcherId);
      const editSchema = z.object({
        researchDomain: z.string().trim().min(2).max(180).optional(),
        roleLevel: z.enum(["PhD", "Postdoc", "PI", "Fellow"]).optional(),
        department: z.string().trim().max(180).optional(),
        status: z.enum(["active", "suspended", "completed", "withdrawn", "expired"]).optional(),
        accessExpiresAt: z.string().optional(),
      });
      const input = editSchema.parse(req.body);
      const updated = await updateControlCentreResearcher({
        id,
        ...input,
        actorUserId: req.session.userId!,
        organisationId: req.adminAccess!.organisation!.id,
        membershipId: req.adminAccess?.membership?.id ?? null,
        requestId: req.get("x-request-id") ?? null,
      });
      return res.json(updated);
    } catch (error) { return sendError(error, res); }
  });

  app.get("/api/admin/logistics-partners/:partnerId", isAuthenticated, requireAdminPermission("partners.view"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const id = idSchema.parse(req.params.partnerId);
      const detail = await getControlCentreLogisticsPartnerDetail(id);
      if (!detail) return res.status(404).json({ error: "Logistics partner record not found" });
      return res.json(detail);
    } catch (error) { return sendError(error, res); }
  });

  app.post("/api/admin/logistics-partners", isAuthenticated, requireAdminPermission("users.edit"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const createSchema = z.object({
        name: z.string().trim().min(2).max(180),
        email: z.string().trim().email().max(180),
        phone: z.string().trim().max(40).optional(),
        location: z.string().trim().max(180).optional(),
      });
      const input = createSchema.parse(req.body);
      const created = await createControlCentreLogisticsPartner({
        ...input,
        actorUserId: req.session.userId!,
        organisationId: req.adminAccess!.organisation!.id,
        membershipId: req.adminAccess?.membership?.id ?? null,
        requestId: req.get("x-request-id") ?? null,
      });
      return res.status(201).json(created);
    } catch (error) { return sendError(error, res); }
  });

  app.patch("/api/admin/logistics-partners/:partnerId", isAuthenticated, requireAdminPermission("users.edit"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const id = idSchema.parse(req.params.partnerId);
      const editSchema = z.object({
        name: z.string().trim().min(2).max(180).optional(),
        phone: z.string().trim().max(40).optional().nullable(),
        location: z.string().trim().max(180).optional(),
        status: z.enum(["active", "suspended"]).optional(),
      });
      const input = editSchema.parse(req.body);
      const updated = await updateControlCentreLogisticsPartner({
        id,
        name: input.name,
        phone: input.phone || undefined,
        location: input.location,
        status: input.status,
        actorUserId: req.session.userId!,
        organisationId: req.adminAccess!.organisation!.id,
        membershipId: req.adminAccess?.membership?.id ?? null,
        requestId: req.get("x-request-id") ?? null,
      });
      return res.json(updated);
    } catch (error) { return sendError(error, res); }
  });

  app.get("/api/admin/organisations/applications", isAuthenticated, requireAdminPermission("organisations.view"), requirePlatformSuperAdmin, async (_req, res) => {
    try { return res.json(await listOrganisationApplications()); }
    catch (error) { return sendError(error, res); }
  });

  app.post("/api/admin/organisations/applications", isAuthenticated, requireAdminPermission("organisations.review"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const inputSchema = z.object({
        organisationName: z.string().trim().min(2).max(200),
        officialEmail: z.string().trim().email().max(320),
        region: z.string().trim().max(180).optional(),
        memberCount: z.coerce.number().optional(),
        primaryCrop: z.string().trim().max(200).optional(),
        contactPerson: z.string().trim().max(180).optional(),
      });
      const input = inputSchema.parse(req.body);
      const created = await createOrganisationApplication(input);
      return res.status(201).json({ application: created });
    } catch (error) { return sendError(error, res); }
  });

  app.post("/api/admin/organisations/applications/:applicationId/review", isAuthenticated, requireAdminPermission("organisations.review"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const id = idSchema.parse(req.params.applicationId);
      const input = organisationApplicationReviewSchema.parse(req.body);
      if (input.status === "approved" && !req.adminAccess?.permissions.includes("organisations.approve")) {
        return res.status(403).json({ error: "Organisation approval permission is required", code: "ADMIN_PERMISSION_REQUIRED", permission: "organisations.approve" });
      }
      const result = await reviewOrganisationApplication({
        id, ...input, actorUserId: req.session.userId!,
        organisationId: req.adminAccess!.organisation!.id,
        membershipId: req.adminAccess?.membership?.id ?? null,
        requestId: req.get("x-request-id") ?? null,
      });
      return result ? res.json({ application: result }) : res.status(404).json({ error: "Organisation application not found", code: "ORGANISATION_APPLICATION_NOT_FOUND" });
    } catch (error) { return sendError(error, res); }
  });

  app.get("/api/admin/resources/:module", isAuthenticated, modulePermission("read"), requirePlatformSuperAdmin, async (req, res) => {
    try { return res.json(await listControlCentreResources(controlCentreResourceModuleSchema.parse(req.params.module))); }
    catch (error) { return sendError(error, res); }
  });

  app.patch("/api/admin/resources/:module/:resourceId", isAuthenticated, modulePermission("manage"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const module = controlCentreResourceModuleSchema.parse(req.params.module);
      const id = idSchema.parse(req.params.resourceId);
      const input = controlCentreResourceActionSchema.parse(req.body);
      const permission = modulePermissions[module].manage!;
      if (["sellers", "buyers", "logistics-partners"].includes(module)) {
        if (!["suspend", "reactivate"].includes(input.action) || !input.expectedUpdatedAt) {
          return res.status(400).json({ error: "A valid account transition and version are required", code: "CONTROL_CENTRE_INVALID_ACCOUNT_ACTION" });
        }
        const result = await changeAdminUserStatus(id, actor(req), {
          status: input.action === "suspend" ? "suspended" : "active",
          reason: input.reason,
          expectedUpdatedAt: input.expectedUpdatedAt,
        });
        return res.json({ record: result });
      }
      if (["orders", "logistics"].includes(module)) {
        const transitions: Record<string, Record<string, string>> = {
          pending: { confirm: "confirmed" }, confirmed: { start_processing: "processing" },
          processing: { mark_shipped: "shipped" }, shipped: { mark_delivered: "delivered" },
          order_placed: { confirm: "payment_confirmed" }, payment_confirmed: { start_processing: "processing" },
          out_for_delivery: { mark_delivered: "delivered" },
        };
        const current = await storage.getOrder(id);
        if (!current) return res.status(404).json({ error: "Order not found", code: "ORDER_NOT_FOUND" });
        const nextStatus = transitions[current.status]?.[input.action];
        if (!nextStatus) return res.status(409).json({ error: "That order transition is not allowed", code: "ORDER_TRANSITION_INVALID" });
        const updated = await storage.updateOrderStatus(id, nextStatus as any, input.reason);
        await recordAdminAuditEvent({ organisationId: req.adminAccess?.organisation?.id, actorUserId: req.session.userId, membershipId: req.adminAccess?.membership?.id, action: `admin.${module}_status_updated`, permissionCode: permission, targetType: "order", targetId: id, changes: { status: { from: current.status, to: nextStatus } }, metadata: { reasonProvided: true } });
        return res.json({ record: updated });
      }
      return res.json({ record: await mutateControlCentreResource({
        module, id, action: input.action, reason: input.reason,
        actorUserId: req.session.userId!, actorOrganisationId: req.adminAccess!.organisation!.id,
        membershipId: req.adminAccess?.membership?.id ?? null, requestId: req.get("x-request-id") ?? null,
        permissionCode: permission,
      }) });
    } catch (error) { return sendError(error, res); }
  });

  app.get("/api/admin/global-operations/map", isAuthenticated, requireAdminPermission("regions.view"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      return res.json(await getGlobalOperationsMap({
        country: typeof req.query.country === "string" ? req.query.country.toUpperCase() : undefined,
        regionId: typeof req.query.regionId === "string" ? req.query.regionId : undefined,
      }));
    } catch (error) { return sendError(error, res); }
  });

  app.get("/api/admin/global-search", isAuthenticated, requireAdminPermission("dashboard.view"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q : "";
      return res.json(await globalSearchControlCentre(q));
    } catch (error) { return sendError(error, res); }
  });

  app.get("/api/admin/categories/explorer", isAuthenticated, requireAdminPermission("categories.view"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const filters = categoryExplorerQuerySchema.parse(req.query);
      return res.json(await getCategoryExplorerData(filters, req.session.userId!));
    } catch (error) { return sendError(error, res); }
  });

  app.put("/api/admin/categories/saved-products/:productId", isAuthenticated, requireAdminPermission("categories.view"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const productId = idSchema.parse(req.params.productId);
      const { saved } = savedProductSchema.parse(req.body);
      return res.json(await setCategoryExplorerSavedProduct(req.session.userId!, productId, saved));
    } catch (error) { return sendError(error, res); }
  });

  app.post("/api/admin/categories/opportunity/accept", isAuthenticated, requireAdminPermission("opportunities.manage"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const { id } = opportunityClaimSchema.parse(req.body);
      const ttlMinutes = Math.min(10_080, Math.max(15, Number(process.env.OPPORTUNITY_CLAIM_TTL_MINUTES || 1_440)));
      const opportunity = await acceptMarketplaceOpportunity(id, req.session.userId!, ttlMinutes);
      await recordAdminAuditEvent({
        organisationId: req.adminAccess?.organisation?.id,
        actorUserId: req.session.userId,
        membershipId: req.adminAccess?.membership?.id,
        action: "admin.marketplace_opportunity_claimed",
        permissionCode: "opportunities.manage",
        targetType: "regional_product_opportunity",
        targetId: id,
        metadata: { claimExpiresAt: opportunity.claimExpiresAt },
      });
      return res.json({ opportunity });
    } catch (error) { return sendError(error, res); }
  });

  app.put("/api/admin/global-operations/settings", isAuthenticated, requireAdminPermission("settings.manage"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const input = organisationOperationalSettingSchema.parse(req.body);
      return res.json({ setting: await setOrganisationOperationalSetting({
        ...input, actorUserId: req.session.userId!, actorOrganisationId: req.adminAccess!.organisation!.id,
        membershipId: req.adminAccess?.membership?.id ?? null, requestId: req.get("x-request-id") ?? null,
      }) });
    } catch (error) { return sendError(error, res); }
  });

  app.get("/api/admin/analytics", isAuthenticated, requireAdminPermission("analytics.view"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const days = req.query.days ? overviewQuerySchema.parse(req.query).days : 30;
      return res.json(await getControlCentreAnalytics(days));
    } catch (error) { return sendError(error, res); }
  });

  app.get("/api/admin/revenue", isAuthenticated, requireAdminPermission("revenue.view"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const days = req.query.days ? overviewQuerySchema.parse(req.query).days : 30;
      const currency = typeof req.query.currency === "string" ? req.query.currency : "all";
      return res.json(await getControlCentreRevenue(days, currency));
    } catch (error) { return sendError(error, res); }
  });

  app.get("/api/admin/data-requests", isAuthenticated, requireAdminPermission("data.export"), requirePlatformSuperAdmin, async (_req, res) => {
    try { return res.json(await listDataRequests()); }
    catch (error) { return sendError(error, res); }
  });

  app.post("/api/admin/data/backup-request", isAuthenticated, requireAdminPermission("data.request_backup"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const input = adminBackupRequestSchema.parse(req.body);
      return res.status(202).json({ request: await requestAdminBackup({
        organisationId: req.adminAccess!.organisation!.id, actorUserId: req.session.userId!,
        membershipId: req.adminAccess?.membership?.id ?? null, reason: input.reason,
        requestId: req.get("x-request-id") ?? null,
      }), execution: "external_backup_provider_required" });
    } catch (error) { return sendError(error, res); }
  });

  app.get("/api/admin/regions/:regionId", isAuthenticated, requireAdminPermission("regions.view"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const id = idSchema.parse(req.params.regionId);
      const detail = await getControlCentreRegionDetail(id);
      if (!detail) return res.status(404).json({ error: "Market region not found" });
      return res.json(detail);
    } catch (error) { return sendError(error, res); }
  });

  app.post("/api/admin/regions", isAuthenticated, requireAdminPermission("regions.manage"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const createSchema = z.object({
        name: z.string().trim().min(2).max(120),
        code: z.string().trim().min(2).max(30),
        countryCode: z.string().trim().min(2).max(4),
        type: z.string().trim().min(2).max(40),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      });
      const input = createSchema.parse(req.body);
      const created = await createControlCentreRegion({
        ...input,
        actorUserId: req.session.userId!,
        organisationId: req.adminAccess!.organisation!.id,
        membershipId: req.adminAccess?.membership?.id ?? null,
        requestId: req.get("x-request-id") ?? null,
      });
      return res.status(201).json(created);
    } catch (error) { return sendError(error, res); }
  });

  app.patch("/api/admin/regions/:regionId", isAuthenticated, requireAdminPermission("regions.manage"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const id = idSchema.parse(req.params.regionId);
      const editSchema = z.object({
        name: z.string().trim().min(2).max(120).optional(),
        code: z.string().trim().min(2).max(30).optional(),
        type: z.string().trim().min(2).max(40).optional(),
        active: z.boolean().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      });
      const input = editSchema.parse(req.body);
      const updated = await updateControlCentreRegion(id, {
        ...input,
        actorUserId: req.session.userId!,
        organisationId: req.adminAccess!.organisation!.id,
        membershipId: req.adminAccess?.membership?.id ?? null,
        requestId: req.get("x-request-id") ?? null,
      });
      return res.json(updated);
    } catch (error) { return sendError(error, res); }
  });

  app.get("/api/admin/content/:contentId", isAuthenticated, requireAdminPermission("content.view"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const id = idSchema.parse(req.params.contentId);
      const detail = await getControlCentreContentDetail(id);
      if (!detail) return res.status(404).json({ error: "Content resource not found" });
      return res.json(detail);
    } catch (error) { return sendError(error, res); }
  });

  app.post("/api/admin/content", isAuthenticated, requireAdminPermission("content.manage"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const createSchema = z.object({
        title: z.string().trim().min(3).max(200),
        summary: z.string().trim().min(5).max(3000),
        url: z.string().trim().min(3).max(500),
        category: z.string().trim().min(2).max(80),
        studyLevels: z.array(z.string().trim()).min(1),
        published: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      });
      const input = createSchema.parse(req.body);
      const created = await createControlCentreContent({
        ...input,
        actorUserId: req.session.userId!,
        organisationId: req.adminAccess!.organisation!.id,
        membershipId: req.adminAccess?.membership?.id ?? null,
        requestId: req.get("x-request-id") ?? null,
      });
      return res.status(201).json(created);
    } catch (error) { return sendError(error, res); }
  });

  app.patch("/api/admin/content/:contentId", isAuthenticated, requireAdminPermission("content.manage"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const id = idSchema.parse(req.params.contentId);
      const editSchema = z.object({
        title: z.string().trim().min(3).max(200).optional(),
        summary: z.string().trim().min(5).max(3000).optional(),
        url: z.string().trim().min(3).max(500).optional(),
        category: z.string().trim().min(2).max(80).optional(),
        studyLevels: z.array(z.string().trim()).optional(),
        published: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      });
      const input = editSchema.parse(req.body);
      const updated = await updateControlCentreContent(id, {
        ...input,
        actorUserId: req.session.userId!,
        organisationId: req.adminAccess!.organisation!.id,
        membershipId: req.adminAccess?.membership?.id ?? null,
        requestId: req.get("x-request-id") ?? null,
      });
      return res.json(updated);
    } catch (error) { return sendError(error, res); }
  });

  app.delete("/api/admin/content/:contentId", isAuthenticated, requireAdminPermission("content.manage"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const id = idSchema.parse(req.params.contentId);
      const result = await deleteControlCentreContent(id, {
        actorUserId: req.session.userId!,
        organisationId: req.adminAccess!.organisation!.id,
        membershipId: req.adminAccess?.membership?.id ?? null,
        requestId: req.get("x-request-id") ?? null,
      });
      return res.json(result);
    } catch (error) { return sendError(error, res); }
  });

  app.get("/api/admin/orders/:orderId", isAuthenticated, requireAdminPermission("orders.view"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const id = req.params.orderId;
      const detail = await getControlCentreOrderDetail(id);
      if (!detail) return res.status(404).json({ error: "Commerce order not found" });
      return res.json(detail);
    } catch (error) { return sendError(error, res); }
  });

  app.patch("/api/admin/orders/:orderId/status", isAuthenticated, requireAdminPermission("orders.manage"), requirePlatformSuperAdmin, async (req, res) => {
    try {
      const id = req.params.orderId;
      const schema = z.object({
        status: z.string().trim().min(2).max(40),
        paymentStatus: z.string().trim().min(2).max(40).optional(),
        carrier: z.string().trim().optional(),
        trackingNumber: z.string().trim().optional(),
        note: z.string().trim().optional(),
      });
      const input = schema.parse(req.body);
      const updated = await updateControlCentreOrderStatus({
        orderId: id,
        ...input,
        actorUserId: req.session.userId!,
        organisationId: req.adminAccess!.organisation!.id,
        membershipId: req.adminAccess?.membership?.id ?? null,
        requestId: req.get("x-request-id") ?? null,
      });
      return res.json(updated);
    } catch (error) { return sendError(error, res); }
  });
}
