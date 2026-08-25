import type { Express, Request, Response } from "express";
import { z, ZodError } from "zod";
import {
  adminUserMutationSchema,
  adminUserNoteInputSchema,
  adminVerificationReviewInputSchema,
  productModerationActionSchema,
  productModerationReasonActionSchema,
  productPromotionActionSchema,
  createCatalogCategorySchema,
  updateCatalogCategorySchema,
  categoryTransitionSchema,
  categoryReasonTransitionSchema,
  reorderCatalogCategoriesSchema,
} from "@shared/schema";
import { isAuthenticated } from "../../auth";
import { requireAdminPermission } from "../../organisations/access";
import {
  adminPortalDataSource,
  getAdminAuditEvent,
  listAdminAuditEvents,
} from "../../organisations/admin-portal-repository";
import { createAdminPortalService } from "../../organisations/admin-portal-service";
import { parseAdminAuditQuery } from "../../organisations/admin-portal-validation";
import {
  getAdminUserDetail,
  getAdminVerificationDetail,
  listAdminUsers,
  listAdminVerifications,
} from "../../organisations/admin-user-repository";
import {
  AdminUserOperationError,
  addAdminUserNote,
  changeAdminUserStatus,
  reviewAdminVerification,
  verifyAdminUser,
} from "../../organisations/admin-user-service";
import {
  parseAdminUserDirectoryQuery,
  parseAdminVerificationQueueQuery,
} from "../../organisations/admin-user-validation";
import {
  getPlatformAdminAccess,
  listPlatformPermissions,
  listPlatformRoles,
  recordAdminAuditEvent,
} from "../../organisations/repository";
import { sellerVerificationRepository } from "../../repositories/seller-verification-repository";
import { sellerDocumentStorage } from "../../seller-verification/document-storage";
import { getAdminProductDetail, listAdminProducts } from "../../organisations/admin-product-repository";
import {
  ProductModerationError,
  getUpdatedAdminProduct,
  moderateProduct,
  setProductPromotion,
} from "../../organisations/admin-product-service";
import { parseAdminProductQuery } from "../../organisations/admin-product-validation";
import { categoriesData, storage } from "../../storage";
import {
  ensureCanonicalTaxonomyImported,
  getAdminCategory,
  getCategoryEvents,
  listAdminCategories,
} from "../../organisations/admin-category-repository";
import {
  CategoryManagementError,
  createCategory,
  reorderCategories,
  transitionCategory,
  updateCategory,
} from "../../organisations/admin-category-service";
import { registerEmployeeSecurityRoutes } from "./employee-security-routes";

const adminPortalService = createAdminPortalService(adminPortalDataSource);
const userIdSchema = z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9._:-]+$/);
const uuidSchema = z.string().uuid();
const productIdSchema = z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9._:-]+$/);
const categoryIdSchema = z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9._:-]+$/);

function sendValidationError(error: unknown, res: Response): boolean {
  if (!(error instanceof ZodError)) return false;
  res.status(400).json({
    error: "Request validation failed",
    code: "ADMIN_INVALID_FILTER",
    fieldErrors: error.flatten().fieldErrors,
  });
  return true;
}

function operationActor(req: Request) {
  return {
    userId: req.session.userId!,
    access: req.adminAccess!,
    requestId: req.get("x-request-id") ?? null,
  };
}

async function sendOperationError(
  error: unknown,
  req: Request,
  res: Response,
  audit: { action: string; permissionCode: any; targetType: string; targetId: string },
) {
  if (error instanceof ZodError) {
    await recordAdminAuditEvent({
      organisationId: req.adminAccess?.organisation?.id,
      actorUserId: req.session.userId,
      membershipId: req.adminAccess?.membership?.id,
      ...audit,
      outcome: "failed",
      requestId: req.get("x-request-id") ?? null,
      metadata: { errorCode: "ADMIN_INVALID_INPUT" },
    });
    return res.status(400).json({ error: "Request validation failed", code: "ADMIN_INVALID_INPUT", fieldErrors: error.flatten().fieldErrors });
  }
  if (error instanceof AdminUserOperationError) {
    await recordAdminAuditEvent({
      organisationId: req.adminAccess?.organisation?.id,
      actorUserId: req.session.userId,
      membershipId: req.adminAccess?.membership?.id,
      ...audit,
      outcome: "failed",
      requestId: req.get("x-request-id") ?? null,
      metadata: { errorCode: error.code },
    });
    return res.status(error.status).json({ error: error.message, code: error.code });
  }
  console.error(`${audit.action} failed`, error);
  await recordAdminAuditEvent({
    organisationId: req.adminAccess?.organisation?.id,
    actorUserId: req.session.userId,
    membershipId: req.adminAccess?.membership?.id,
    ...audit,
    outcome: "failed",
    requestId: req.get("x-request-id") ?? null,
    metadata: { errorCode: "ADMIN_OPERATION_FAILED" },
  }).catch(() => undefined);
  return res.status(503).json({ error: "The administrative operation is temporarily unavailable", code: "ADMIN_OPERATION_FAILED" });
}

async function sendProductOperationError(error: unknown, req: Request, res: Response, action: string, permissionCode: any, targetId: string) {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: "Request validation failed", code: "PRODUCT_INVALID_INPUT", fieldErrors: error.flatten().fieldErrors });
  }
  if (error instanceof ProductModerationError) {
    return res.status(error.status).json({ error: error.message, code: error.code });
  }
  console.error(`${action} failed`, error);
  await recordAdminAuditEvent({
    organisationId: req.adminAccess?.organisation?.id,
    actorUserId: req.session.userId,
    membershipId: req.adminAccess?.membership?.id,
    action,
    permissionCode,
    targetType: "product",
    targetId,
    outcome: "failed",
    requestId: req.get("x-request-id") ?? null,
    metadata: { errorCode: "PRODUCT_MODERATION_FAILED" },
  }).catch(() => undefined);
  return res.status(503).json({ error: "Product moderation is temporarily unavailable", code: "PRODUCT_MODERATION_FAILED" });
}

async function sendCategoryOperationError(error: unknown, req: Request, res: Response, action: string, permissionCode: any, targetId: string) {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: "Request validation failed", code: "CATEGORY_INVALID_INPUT", fieldErrors: error.flatten().fieldErrors });
  }
  if (error instanceof CategoryManagementError) {
    return res.status(error.status).json({ error: error.message, code: error.code });
  }
  console.error(`${action} failed`, error);
  await recordAdminAuditEvent({
    organisationId: req.adminAccess?.organisation?.id,
    actorUserId: req.session.userId,
    membershipId: req.adminAccess?.membership?.id,
    action,
    permissionCode,
    targetType: "category",
    targetId,
    outcome: "failed",
    requestId: req.get("x-request-id") ?? null,
    metadata: { errorCode: "CATEGORY_OPERATION_FAILED" },
  }).catch(() => undefined);
  return res.status(503).json({ error: "Category management is temporarily unavailable", code: "CATEGORY_OPERATION_FAILED" });
}

export function registerAdminFoundationRoutes(app: Express): void {
  registerEmployeeSecurityRoutes(app);
  app.get(
    "/api/admin/categories",
    isAuthenticated,
    requireAdminPermission("categories.view"),
    async (req, res) => {
      try {
        if (req.query.includeDrafts !== undefined && req.query.includeDrafts !== "true" && req.query.includeDrafts !== "false") {
          return res.status(400).json({ error: "includeDrafts must be true or false", code: "CATEGORY_INVALID_FILTER" });
        }
        await ensureCanonicalTaxonomyImported(categoriesData);
        return res.json({ categories: await listAdminCategories(req.query.includeDrafts === "true"), generatedAt: new Date().toISOString() });
      } catch (error) {
        return sendCategoryOperationError(error, req, res, "admin.categories_viewed", "categories.view", "catalog");
      }
    },
  );

  app.get(
    "/api/admin/categories/:categoryId",
    isAuthenticated,
    requireAdminPermission("categories.view"),
    async (req, res) => {
      try {
        await ensureCanonicalTaxonomyImported(categoriesData);
        const id = categoryIdSchema.parse(req.params.categoryId);
        const category = await getAdminCategory(id);
        if (!category) return res.status(404).json({ error: "Category not found", code: "CATEGORY_NOT_FOUND" });
        return res.json({ category, events: await getCategoryEvents(id) });
      } catch (error) {
        return sendCategoryOperationError(error, req, res, "admin.category_viewed", "categories.view", req.params.categoryId);
      }
    },
  );

  app.post(
    "/api/admin/categories",
    isAuthenticated,
    requireAdminPermission("categories.create"),
    async (req, res) => {
      try {
        await ensureCanonicalTaxonomyImported(categoriesData);
        return res.status(201).json({ category: await createCategory(operationActor(req), createCatalogCategorySchema.parse(req.body)) });
      } catch (error) {
        return sendCategoryOperationError(error, req, res, "admin.category_created", "categories.create", "new");
      }
    },
  );

  app.patch(
    "/api/admin/categories/:categoryId",
    isAuthenticated,
    requireAdminPermission("categories.edit"),
    async (req, res) => {
      const targetId = req.params.categoryId;
      try {
        return res.json({ category: await updateCategory(categoryIdSchema.parse(targetId), operationActor(req), updateCatalogCategorySchema.parse(req.body)) });
      } catch (error) {
        return sendCategoryOperationError(error, req, res, "admin.category_edited", "categories.edit", targetId);
      }
    },
  );

  for (const transition of [
    { action: "submit", permission: "categories.edit", reason: false },
    { action: "publish", permission: "categories.publish", reason: false },
    { action: "request-changes", permission: "categories.edit", reason: true },
    { action: "archive", permission: "categories.archive", reason: true },
  ] as const) {
    app.post(
      `/api/admin/categories/:categoryId/${transition.action}`,
      isAuthenticated,
      requireAdminPermission(transition.permission),
      async (req, res) => {
        const targetId = req.params.categoryId;
        try {
          const input = (transition.reason ? categoryReasonTransitionSchema : categoryTransitionSchema).parse(req.body);
          return res.json({ category: await transitionCategory(categoryIdSchema.parse(targetId), transition.action, operationActor(req), input) });
        } catch (error) {
          return sendCategoryOperationError(error, req, res, `admin.category_${transition.action.replace("-", "_")}`, transition.permission, targetId);
        }
      },
    );
  }

  app.post(
    "/api/admin/categories/reorder",
    isAuthenticated,
    requireAdminPermission("categories.reorder"),
    async (req, res) => {
      try {
        return res.json({ categories: await reorderCategories(operationActor(req), reorderCatalogCategoriesSchema.parse(req.body)) });
      } catch (error) {
        return sendCategoryOperationError(error, req, res, "admin.categories_reordered", "categories.reorder", String(req.body?.parentId ?? "root"));
      }
    },
  );

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

  app.get(
    "/api/admin/dashboard/summary",
    isAuthenticated,
    requireAdminPermission("dashboard.view"),
    async (req, res, next) => {
      try {
        res.json(await adminPortalService.dashboardSummary(req.adminAccess?.permissions ?? []));
      } catch (error) {
        console.error("Admin dashboard summary failed", error);
        res.status(503).json({ error: "Dashboard summary is temporarily unavailable", code: "ADMIN_DASHBOARD_UNAVAILABLE" });
      }
    },
  );

  app.get(
    "/api/admin/dashboard/pending-work",
    isAuthenticated,
    requireAdminPermission("dashboard.view"),
    async (req, res, next) => {
      try {
        res.json(await adminPortalService.pendingWork(req.adminAccess?.permissions ?? []));
      } catch (error) {
        console.error("Admin pending work failed", error);
        res.status(503).json({ error: "Pending work is temporarily unavailable", code: "ADMIN_PENDING_WORK_UNAVAILABLE" });
      }
    },
  );

  app.get(
    "/api/admin/audit-events",
    isAuthenticated,
    requireAdminPermission("audit.view"),
    async (req, res, next) => {
      try {
        res.json(await listAdminAuditEvents(parseAdminAuditQuery(req.query)));
      } catch (error) {
        if (!sendValidationError(error, res)) {
          console.error("Admin audit listing failed", error);
          res.status(503).json({ error: "Audit events are temporarily unavailable", code: "ADMIN_AUDIT_UNAVAILABLE" });
        }
      }
    },
  );

  app.get(
    "/api/admin/audit-events/:id",
    isAuthenticated,
    requireAdminPermission("audit.view"),
    async (req, res, next) => {
      try {
        const id = z.string().uuid().parse(req.params.id);
        const event = await getAdminAuditEvent(id);
        if (!event) {
          return res.status(404).json({ error: "Audit event not found", code: "ADMIN_AUDIT_EVENT_NOT_FOUND" });
        }
        return res.json({ event, generatedAt: new Date().toISOString() });
      } catch (error) {
        if (!sendValidationError(error, res)) {
          console.error("Admin audit detail failed", error);
          res.status(503).json({ error: "Audit event is temporarily unavailable", code: "ADMIN_AUDIT_UNAVAILABLE" });
        }
      }
    },
  );

  app.get(
    "/api/admin/users",
    isAuthenticated,
    requireAdminPermission("users.view"),
    async (req, res) => {
      try {
        return res.json(await listAdminUsers(parseAdminUserDirectoryQuery(req.query)));
      } catch (error) {
        if (!sendValidationError(error, res)) {
          console.error("Admin user directory failed", error);
          return res.status(503).json({ error: "The user directory is temporarily unavailable", code: "ADMIN_USERS_UNAVAILABLE" });
        }
      }
    },
  );

  app.get(
    "/api/admin/users/:userId",
    isAuthenticated,
    requireAdminPermission("users.view"),
    async (req, res) => {
      try {
        const detail = await getAdminUserDetail(userIdSchema.parse(req.params.userId));
        if (!detail) return res.status(404).json({ error: "User not found", code: "ADMIN_USER_NOT_FOUND" });
        return res.json(detail);
      } catch (error) {
        if (!sendValidationError(error, res)) return res.status(503).json({ error: "User detail is temporarily unavailable", code: "ADMIN_USERS_UNAVAILABLE" });
      }
    },
  );

  app.post(
    "/api/admin/users/:userId/verify",
    isAuthenticated,
    requireAdminPermission("users.approve"),
    async (req, res) => {
      const targetId = req.params.userId;
      try {
        const userId = userIdSchema.parse(targetId);
        await verifyAdminUser(userId, operationActor(req), adminUserMutationSchema.parse(req.body));
        return res.json(await getAdminUserDetail(userId));
      } catch (error) {
        return sendOperationError(error, req, res, { action: "admin.user_verified", permissionCode: "users.approve", targetType: "user", targetId });
      }
    },
  );

  for (const action of ["suspend", "reactivate"] as const) {
    app.post(
      `/api/admin/users/:userId/${action}`,
      isAuthenticated,
      requireAdminPermission("users.suspend"),
      async (req, res) => {
        const targetId = req.params.userId;
        try {
          const userId = userIdSchema.parse(targetId);
          await changeAdminUserStatus(userId, operationActor(req), { ...adminUserMutationSchema.parse(req.body), status: action === "suspend" ? "suspended" : "active" });
          return res.json(await getAdminUserDetail(userId));
        } catch (error) {
          return sendOperationError(error, req, res, { action: action === "suspend" ? "admin.user_suspended" : "admin.user_reactivated", permissionCode: "users.suspend", targetType: "user", targetId });
        }
      },
    );
  }

  app.post(
    "/api/admin/users/:userId/notes",
    isAuthenticated,
    requireAdminPermission("users.edit"),
    async (req, res) => {
      const targetId = req.params.userId;
      try {
        const userId = userIdSchema.parse(targetId);
        const note = await addAdminUserNote(userId, operationActor(req), adminUserNoteInputSchema.parse(req.body));
        return res.status(201).json({ note, detail: await getAdminUserDetail(userId) });
      } catch (error) {
        return sendOperationError(error, req, res, { action: "admin.user_note_added", permissionCode: "users.edit", targetType: "user", targetId });
      }
    },
  );

  app.get(
    "/api/admin/verifications",
    isAuthenticated,
    requireAdminPermission("verification.view"),
    async (req, res) => {
      try {
        return res.json(await listAdminVerifications(parseAdminVerificationQueueQuery(req.query)));
      } catch (error) {
        if (!sendValidationError(error, res)) return res.status(503).json({ error: "The verification queue is temporarily unavailable", code: "ADMIN_VERIFICATIONS_UNAVAILABLE" });
      }
    },
  );

  app.get(
    "/api/admin/verifications/:caseId",
    isAuthenticated,
    requireAdminPermission("verification.view"),
    async (req, res) => {
      try {
        const detail = await getAdminVerificationDetail(uuidSchema.parse(req.params.caseId));
        if (!detail) return res.status(404).json({ error: "Verification case not found", code: "ADMIN_VERIFICATION_NOT_FOUND" });
        return res.json(detail);
      } catch (error) {
        if (!sendValidationError(error, res)) return res.status(503).json({ error: "Verification detail is temporarily unavailable", code: "ADMIN_VERIFICATIONS_UNAVAILABLE" });
      }
    },
  );

  app.get(
    "/api/admin/verification-documents/:documentId",
    isAuthenticated,
    requireAdminPermission("verification.view"),
    async (req, res) => {
      try {
        const document = await sellerVerificationRepository.getDocumentById(uuidSchema.parse(req.params.documentId));
        if (!document?.storageKey) return res.status(404).json({ error: "Document not found", code: "ADMIN_VERIFICATION_DOCUMENT_NOT_FOUND" });
        const data = await sellerDocumentStorage.read(document.storageKey);
        res.setHeader("Content-Type", document.contentType);
        res.setHeader("Content-Disposition", `inline; filename="${document.originalFileName.replace(/[\r\n\"]/g, "_")}"`);
        res.setHeader("Cache-Control", "no-store, private");
        res.setHeader("X-Content-Type-Options", "nosniff");
        return res.send(data);
      } catch (error) {
        if (!sendValidationError(error, res)) return res.status(404).json({ error: "Document not found", code: "ADMIN_VERIFICATION_DOCUMENT_NOT_FOUND" });
      }
    },
  );

  app.post(
    "/api/admin/verifications/:caseId/review",
    isAuthenticated,
    requireAdminPermission("verification.review"),
    async (req, res) => {
      const targetId = req.params.caseId;
      try {
        const caseId = uuidSchema.parse(targetId);
        const input = adminVerificationReviewInputSchema.parse(req.body);
        const requiredPermission = input.decision === "verified" ? "verification.approve" : input.decision === "rejected" ? "verification.reject" : "verification.review";
        if (!req.adminAccess?.permissions.includes(requiredPermission)) {
          await recordAdminAuditEvent({ organisationId: req.adminAccess?.organisation?.id, actorUserId: req.session.userId, membershipId: req.adminAccess?.membership?.id, action: "admin.permission_denied", permissionCode: requiredPermission, targetType: "verification_case", targetId: caseId, outcome: "denied" });
          return res.status(403).json({ error: "Access denied", code: "ADMIN_PERMISSION_REQUIRED", permission: requiredPermission });
        }
        const result = await reviewAdminVerification(caseId, operationActor(req), input);
        return res.json({ detail: await getAdminVerificationDetail(caseId), user: await getAdminUserDetail(result.sellerId) });
      } catch (error) {
        return sendOperationError(error, req, res, { action: "admin.verification_reviewed", permissionCode: "verification.review", targetType: "verification_case", targetId });
      }
    },
  );

  app.get(
    "/api/admin/products",
    isAuthenticated,
    requireAdminPermission("products.view"),
    async (req, res) => {
      try {
        return res.json(await listAdminProducts(parseAdminProductQuery(req.query)));
      } catch (error) {
        if (!sendValidationError(error, res)) return res.status(503).json({ error: "The product queue is temporarily unavailable", code: "ADMIN_PRODUCTS_UNAVAILABLE" });
      }
    },
  );

  app.get(
    "/api/admin/products/:productId",
    isAuthenticated,
    requireAdminPermission("products.view"),
    async (req, res) => {
      try {
        const productId = productIdSchema.parse(req.params.productId);
        const detail = await getAdminProductDetail(productId);
        if (!detail) return res.status(404).json({ error: "Product not found", code: "PRODUCT_NOT_FOUND" });
        return res.json(detail);
      } catch (error) {
        if (!sendValidationError(error, res)) return res.status(503).json({ error: "Product detail is temporarily unavailable", code: "ADMIN_PRODUCTS_UNAVAILABLE" });
      }
    },
  );

  const transitionRoutes = [
    { action: "approve", toStatus: "approved", permission: "products.approve", reasonRequired: false },
    { action: "reject", toStatus: "rejected", permission: "products.reject", reasonRequired: true },
    { action: "request-changes", toStatus: "changes_requested", permission: "products.reject", reasonRequired: true },
    { action: "suspend", toStatus: "suspended", permission: "products.suspend", reasonRequired: true },
    { action: "restore", toStatus: "approved", permission: "products.suspend", reasonRequired: true },
    { action: "remove", toStatus: "removed", permission: "products.remove", reasonRequired: true },
  ] as const;

  for (const transition of transitionRoutes) {
    app.post(
      `/api/admin/products/:productId/${transition.action}`,
      isAuthenticated,
      requireAdminPermission(transition.permission),
      async (req, res) => {
        const targetId = req.params.productId;
        try {
          const productId = productIdSchema.parse(targetId);
          const input = (transition.reasonRequired ? productModerationReasonActionSchema : productModerationActionSchema).parse(req.body);
          const product = await storage.getProductForOwner(productId);
          if (!product) throw new ProductModerationError(404, "PRODUCT_NOT_FOUND", "Product not found.");
          const category = await storage.getCategory(product.categoryId);
          const validCategory = Boolean(category?.subcategories.some((subcategory) => subcategory.id === product.subcategoryId));
          await moderateProduct(productId, operationActor(req), {
            toStatus: transition.toStatus,
            expectedUpdatedAt: input.expectedUpdatedAt,
            reason: input.reason,
            permission: transition.permission,
            action: transition.action.replace("-", "_"),
            validCategory,
          });
          return res.json(await getUpdatedAdminProduct(productId));
        } catch (error) {
          return sendProductOperationError(error, req, res, `admin.product_${transition.action.replace("-", "_")}`, transition.permission, targetId);
        }
      },
    );
  }

  for (const promotion of [
    { action: "feature", field: "is_featured" },
    { action: "fresh-pick", field: "is_fresh_pick" },
  ] as const) {
    app.post(
      `/api/admin/products/:productId/${promotion.action}`,
      isAuthenticated,
      requireAdminPermission("products.feature"),
      async (req, res) => {
        const targetId = req.params.productId;
        try {
          const productId = productIdSchema.parse(targetId);
          const input = productPromotionActionSchema.parse(req.body);
          await setProductPromotion(productId, operationActor(req), { field: promotion.field, ...input });
          return res.json(await getUpdatedAdminProduct(productId));
        } catch (error) {
          return sendProductOperationError(error, req, res, `admin.product_${promotion.action.replace("-", "_")}`, "products.feature", targetId);
        }
      },
    );
  }
}
