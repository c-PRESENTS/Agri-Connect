import type { Express, Request, Response } from "express";
import { ZodError } from "zod";
import {
  regionInputSchema,
  regionalAssignmentReviewSchema,
  regionalTargetInputSchema,
  regionalOrganisationInputSchema,
  sellerRegionRequestSchema,
} from "@shared/schema";
import { isAuthenticated } from "../../auth";
import { requireAdminPermission } from "../../organisations/access";
import { getPlatformAdminAccess, hasOrganisationPermission } from "../../organisations/repository";
import { regionalMarketplaceRepository } from "../../repositories/regional-marketplace-repository";
import { regionalMarketplaceService } from "../../regional-marketplace/service";
import { marketplaceMapConfig } from "../../regional-marketplace/provider-config";

function numberQuery(value: unknown): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function inputError(error: unknown, res: Response): boolean {
  if (!(error instanceof ZodError)) return false;
  res.status(400).json({ error: error.issues[0]?.message || "Invalid request" });
  return true;
}

async function mayReviewAssignment(req: Request, assignmentId: string): Promise<boolean> {
  const userId = req.session.userId!;
  const platform = await getPlatformAdminAccess(userId);
  if (platform.hasAccess && platform.permissions.includes("users.approve")) return true;
  const assignment = await regionalMarketplaceRepository.getAssignmentForReview(assignmentId);
  if (!assignment?.organisationId) return false;
  return (await hasOrganisationPermission(userId, assignment.organisationId, "users.approve"))
    && (await regionalMarketplaceRepository.organisationCanApproveRegion(assignment.organisationId, assignment.regionId));
}

export function registerRegionalMarketplaceRoutes(app: Express): void {
  app.get("/api/marketplace/config", (_req, res) => res.json(marketplaceMapConfig()));
  app.get("/api/marketplace/regions", async (_req, res) => res.json(await regionalMarketplaceRepository.listRegions()));
  app.get("/api/marketplace/organisations", async (req, res) => {
    const regionId = typeof req.query.regionId === "string" ? req.query.regionId : undefined;
    res.json(await regionalMarketplaceRepository.listTrustedOrganisations(regionId));
  });
  app.get("/api/marketplace/regions/:regionId/organisations", async (req, res) => res.json(await regionalMarketplaceRepository.listEligibleOrganisationsForRegion(req.params.regionId)));
  app.get("/api/marketplace/search", async (req, res) => {
    try {
      res.json(await regionalMarketplaceService.search({
        categoryId: typeof req.query.categoryId === "string" ? req.query.categoryId : undefined,
        subcategoryId: typeof req.query.subcategoryId === "string" ? req.query.subcategoryId : undefined,
        search: typeof req.query.search === "string" ? req.query.search.trim().slice(0, 120) : undefined,
        regionId: typeof req.query.regionId === "string" ? req.query.regionId : undefined,
        scope: req.query.scope === "local" ? "local" : "global",
        latitude: numberQuery(req.query.latitude),
        longitude: numberQuery(req.query.longitude),
        quantity: numberQuery(req.query.quantity),
        minPrice: numberQuery(req.query.minPrice),
        maxPrice: numberQuery(req.query.maxPrice),
        rating: numberQuery(req.query.rating),
        qualityGrade: req.query.qualityGrade === "A" || req.query.qualityGrade === "B" || req.query.qualityGrade === "C" ? req.query.qualityGrade : undefined,
        page: numberQuery(req.query.page),
        pageSize: numberQuery(req.query.pageSize),
        sortBy: req.query.sortBy === "price_asc" || req.query.sortBy === "price_desc" || req.query.sortBy === "rating" || req.query.sortBy === "distance" || req.query.sortBy === "newest" ? req.query.sortBy : undefined,
      }));
    } catch (error) {
      console.error("Regional marketplace search failed", error);
      res.status(500).json({ error: "Marketplace search is temporarily unavailable" });
    }
  });

  app.get("/api/seller/regions", isAuthenticated, async (req, res) => res.json(await regionalMarketplaceRepository.listSellerAssignments(req.session.userId!)));
  app.post("/api/seller/regions/request", isAuthenticated, async (req, res) => {
    try {
      const input = sellerRegionRequestSchema.parse(req.body);
      const seller = await import("../../auth/storage").then(({ authStorage }) => authStorage.getUser(req.session.userId!));
      if (!seller || (seller.role !== "farmer" && seller.sellerEnabled !== true)) return res.status(403).json({ error: "Seller access is required" });
      res.status(201).json(await regionalMarketplaceRepository.requestSellerAssignment(req.session.userId!, input.regionId, input.organisationId));
    } catch (error) {
      if (inputError(error, res)) return;
      if (error instanceof Error && error.message === "ORGANISATION_REGION_MISMATCH") return res.status(400).json({ error: "That organisation is not authorised for the selected region" });
      res.status(500).json({ error: "Unable to request this selling region" });
    }
  });
  app.get("/api/seller/opportunities", isAuthenticated, async (req, res) => res.json(await regionalMarketplaceRepository.listSellerOpportunities(req.session.userId!)));
  app.post("/api/seller/opportunities/:id/claim", isAuthenticated, async (req, res) => {
    const ttl = Math.min(10_080, Math.max(15, Number(process.env.OPPORTUNITY_CLAIM_TTL_MINUTES || 1440)));
    const claimed = await regionalMarketplaceRepository.claimOpportunity(req.params.id, req.session.userId!, ttl);
    if (!claimed) return res.status(409).json({ error: "This opportunity is no longer available" });
    res.json(claimed);
  });
  app.post("/api/seller/opportunities/:id/cancel", isAuthenticated, async (req, res) => {
    if (!await regionalMarketplaceRepository.cancelOpportunity(req.params.id, req.session.userId!)) return res.status(409).json({ error: "This opportunity cannot be cancelled" });
    res.status(204).send();
  });
  app.get("/api/marketplace/notifications", isAuthenticated, async (req, res) => res.json(await regionalMarketplaceRepository.listNotifications(req.session.userId!)));
  app.post("/api/marketplace/notifications/:id/read", isAuthenticated, async (req, res) => {
    if (!await regionalMarketplaceRepository.markNotificationRead(req.params.id, req.session.userId!)) return res.status(404).json({ error: "Notification not found" });
    res.status(204).send();
  });

  app.get("/api/operator/regional-marketplace/assignments", isAuthenticated, async (req, res) => {
    const access = await getPlatformAdminAccess(req.session.userId!);
    if (!access.hasAccess || !access.permissions.includes("users.view")) return res.status(403).json({ error: "Access denied" });
    res.json(await regionalMarketplaceRepository.listAssignmentsForReview());
  });
  app.get("/api/organisation/regional-marketplace/assignments", isAuthenticated, async (req, res) => {
    const organisationIds = await regionalMarketplaceRepository.listReviewerOrganisationIds(req.session.userId!);
    const allowed = [] as string[];
    for (const organisationId of organisationIds) {
      if (await hasOrganisationPermission(req.session.userId!, organisationId, "users.view")) allowed.push(organisationId);
    }
    if (allowed.length === 0) return res.status(403).json({ error: "Regional organisation manager access is required" });
    res.json(await regionalMarketplaceRepository.listAssignmentsForOrganisationReview(allowed));
  });
  app.get("/api/organisation/regional-marketplace/access", isAuthenticated, async (req, res) => {
    const organisationIds = await regionalMarketplaceRepository.listReviewerOrganisationIds(req.session.userId!);
    for (const organisationId of organisationIds) {
      if (await hasOrganisationPermission(req.session.userId!, organisationId, "users.view")) return res.json({ hasAccess: true });
    }
    res.json({ hasAccess: false });
  });
  app.post("/api/operator/regional-marketplace/assignments/:id/review", isAuthenticated, async (req, res) => {
    try {
      if (!await mayReviewAssignment(req, req.params.id)) return res.status(403).json({ error: "You cannot approve sellers for this region" });
      const input = regionalAssignmentReviewSchema.parse(req.body);
      const assignment = await regionalMarketplaceRepository.reviewAssignment(req.params.id, req.session.userId!, input);
      if (!assignment) return res.status(404).json({ error: "Regional assignment not found" });
      res.json(assignment);
    } catch (error) {
      if (!inputError(error, res)) res.status(500).json({ error: "Unable to review regional assignment" });
    }
  });
  app.post("/api/operator/regional-marketplace/regions", isAuthenticated, requireAdminPermission("organisations.manage"), async (req, res) => {
    try { res.status(201).json(await regionalMarketplaceRepository.createRegion(regionInputSchema.parse(req.body))); }
    catch (error) { if (!inputError(error, res)) res.status(500).json({ error: "Unable to create region" }); }
  });
  app.post("/api/operator/regional-marketplace/organisations", isAuthenticated, requireAdminPermission("organisations.manage"), async (req, res) => {
    try { res.status(201).json(await regionalMarketplaceRepository.createRegionalOrganisation(req.session.userId!, regionalOrganisationInputSchema.parse(req.body))); }
    catch (error) {
      if (inputError(error, res)) return;
      if (error instanceof Error && error.message === "MANAGER_NOT_FOUND") return res.status(400).json({ error: "The organisation manager must already have an AgriConnect account" });
      res.status(500).json({ error: "Unable to create regional organisation" });
    }
  });
  app.post("/api/operator/regional-marketplace/targets", isAuthenticated, requireAdminPermission("products.approve"), async (req, res) => {
    try { res.status(201).json(await regionalMarketplaceRepository.createTarget(req.session.userId!, regionalTargetInputSchema.parse(req.body))); }
    catch (error) { if (!inputError(error, res)) res.status(500).json({ error: "Unable to save regional catalogue target" }); }
  });
  app.post("/api/operator/regional-marketplace/scan", isAuthenticated, requireAdminPermission("products.approve"), async (_req, res) => {
    res.json(await regionalMarketplaceRepository.scanOpportunities());
  });
}
