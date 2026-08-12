import type { Express, Request, Response } from "express";
import { ZodError, z } from "zod";
import { fromZodError } from "zod-validation-error";
import {
  sellerAssociatedPersonInputSchema,
  sellerBusinessProfileInputSchema,
  sellerDocumentInputSchema,
  sellerTaxIdentifierInputSchema,
} from "@shared/schema";
import { isAuthenticated } from "../../auth";
import { authStorage } from "../../auth/storage";
import { requireAdminPermission } from "../../organisations/access";
import { sellerVerificationRepository } from "../../repositories/seller-verification-repository";
import { sellerDocumentStorage, MAX_DOCUMENT_BYTES } from "../../seller-verification/document-storage";
import { sellerVerificationService } from "../../seller-verification/service";
import { sellerRequirements } from "../../seller-verification/requirements";

type Deps = { getUserId(req: Request): string | undefined };
const uploadSchema = sellerDocumentInputSchema.extend({
  dataBase64: z.string().min(4).max(Math.ceil(MAX_DOCUMENT_BYTES * 4 / 3) + 100),
});

function handleError(error: unknown, res: Response) {
  if (error instanceof ZodError) return res.status(400).json({ error: fromZodError(error).message });
  const message = error instanceof Error ? error.message : "Seller verification request failed";
  return res.status(400).json({ error: message });
}

async function requireSeller(req: Request, res: Response, deps: Deps) {
  const userId = deps.getUserId(req);
  const user = userId ? await authStorage.getUser(userId) : undefined;
  if (!userId || !user || !["farmer", "admin"].includes(user.role)) {
    res.status(403).json({ error: "Seller access is required" });
    return undefined;
  }
  return userId;
}

export function registerSellerVerificationRoutes(app: Express, deps: Deps): void {
  app.get("/api/seller/verification/status", isAuthenticated, async (req, res) => {
    const sellerId = await requireSeller(req, res, deps);
    if (!sellerId) return;
    try { return res.json(await sellerVerificationService.status(sellerId)); } catch (error) { return handleError(error, res); }
  });

  app.get("/api/seller/verification/requirements", isAuthenticated, async (req, res) => {
    const sellerId = await requireSeller(req, res, deps);
    if (!sellerId) return;
    const profile = await sellerVerificationRepository.getProfile(sellerId);
    const country = typeof req.query.country === "string" ? req.query.country.toUpperCase() : profile?.country ?? "";
    const entityType = typeof req.query.entityType === "string" ? req.query.entityType : profile?.entityType ?? "individual";
    return res.json(sellerRequirements({ country, entityType, primaryActivities: profile?.primaryActivities as string[] | undefined }));
  });

  app.put("/api/seller/verification/business-profile", isAuthenticated, async (req, res) => {
    const sellerId = await requireSeller(req, res, deps);
    if (!sellerId) return;
    try {
      const input = sellerBusinessProfileInputSchema.parse(req.body);
      await sellerVerificationService.saveProfile(sellerId, input);
      return res.json(await sellerVerificationService.status(sellerId));
    } catch (error) { return handleError(error, res); }
  });

  app.put("/api/seller/verification/tax-identifiers", isAuthenticated, async (req, res) => {
    const sellerId = await requireSeller(req, res, deps);
    if (!sellerId) return;
    try {
      await sellerVerificationService.saveTaxIdentifier(sellerId, sellerTaxIdentifierInputSchema.parse(req.body));
      return res.json(await sellerVerificationService.status(sellerId));
    } catch (error) { return handleError(error, res); }
  });

  app.post("/api/seller/verification/people", isAuthenticated, async (req, res) => {
    const sellerId = await requireSeller(req, res, deps);
    if (!sellerId) return;
    try {
      const input = sellerAssociatedPersonInputSchema.parse(req.body);
      await sellerVerificationRepository.addPerson({ sellerId, ...input });
      const verificationCase = await sellerVerificationRepository.getCase(sellerId);
      if (verificationCase) await sellerVerificationRepository.recordEvent(verificationCase.id, sellerId, "associated_person_added", { role: input.role });
      return res.status(201).json(await sellerVerificationService.status(sellerId));
    } catch (error) { return handleError(error, res); }
  });

  app.delete("/api/seller/verification/people/:personId", isAuthenticated, async (req, res) => {
    const sellerId = await requireSeller(req, res, deps);
    if (!sellerId) return;
    const deleted = await sellerVerificationRepository.deletePerson(sellerId, req.params.personId);
    if (!deleted.length) return res.status(404).json({ error: "Associated person not found" });
    return res.json(await sellerVerificationService.status(sellerId));
  });

  app.post("/api/seller/verification/documents", isAuthenticated, async (req, res) => {
    const sellerId = await requireSeller(req, res, deps);
    if (!sellerId) return;
    let stored: Awaited<ReturnType<typeof sellerDocumentStorage.save>> | undefined;
    try {
      const input = uploadSchema.parse(req.body);
      const state = await sellerVerificationService.status(sellerId);
      if (!state.case || !state.profile) throw new Error("Save the business profile before uploading documents");
      const requirement = state.requirements.find((item) => item.code === input.requirementCode && item.kind === "document");
      if (!requirement) throw new Error("This document is not part of the current country checklist");
      if (requirement.acceptedDocumentTypes?.length && !requirement.acceptedDocumentTypes.includes(input.documentType)) {
        throw new Error(`Accepted document types: ${requirement.acceptedDocumentTypes.join(", ")}`);
      }
      const data = Buffer.from(input.dataBase64, "base64");
      if (!data.length || data.toString("base64").replace(/=+$/, "") !== input.dataBase64.replace(/\s|=+$/g, "")) throw new Error("Document data is not valid base64");
      stored = await sellerDocumentStorage.save(sellerId, input.contentType, data);
      const document = await sellerVerificationRepository.createDocument({
        sellerId,
        caseId: state.case.id,
        requirementCode: input.requirementCode,
        documentType: input.documentType,
        issuingCountry: input.issuingCountry,
        originalFileName: input.fileName,
        contentType: input.contentType,
        sizeBytes: stored.sizeBytes,
        storageKey: stored.storageKey,
        sha256: stored.sha256,
        status: "uploaded",
        uploadedAt: new Date(),
        issuedAt: input.issuedAt ? new Date(input.issuedAt) : null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      });
      await sellerVerificationRepository.recordEvent(state.case.id, sellerId, "document_uploaded", { documentId: document.id, requirementCode: input.requirementCode });
      return res.status(201).json(await sellerVerificationService.status(sellerId));
    } catch (error) {
      if (stored) await sellerDocumentStorage.remove(stored.storageKey);
      return handleError(error, res);
    }
  });

  app.post("/api/seller/verification/submit", isAuthenticated, async (req, res) => {
    const sellerId = await requireSeller(req, res, deps);
    if (!sellerId) return;
    try { return res.json(await sellerVerificationService.submit(sellerId)); } catch (error) { return handleError(error, res); }
  });

  app.get("/api/operator/seller-verifications", isAuthenticated, requireAdminPermission("verification.view"), async (req, res) => {
    const requested = typeof req.query.status === "string" ? req.query.status.split(",").filter(Boolean) : undefined;
    return res.json({ cases: await sellerVerificationRepository.listQueue(requested) });
  });

  app.get("/api/operator/seller-verifications/:sellerId", isAuthenticated, requireAdminPermission("verification.view"), async (req, res) => {
    return res.json(await sellerVerificationService.status(req.params.sellerId));
  });

  app.get("/api/operator/seller-verification-documents/:documentId", isAuthenticated, requireAdminPermission("verification.view"), async (req, res) => {
    const document = await sellerVerificationRepository.getDocumentById(req.params.documentId);
    if (!document?.storageKey) return res.status(404).json({ error: "Document not found" });
    const data = await sellerDocumentStorage.read(document.storageKey);
    res.setHeader("Content-Type", document.contentType);
    res.setHeader("Content-Disposition", `inline; filename="${document.originalFileName.replace(/[\r\n\"]/g, "_")}"`);
    res.setHeader("Cache-Control", "no-store, private");
    return res.send(data);
  });

  app.post("/api/operator/seller-verifications/:caseId/review", isAuthenticated, requireAdminPermission("verification.review"), async (req, res) => {
    try {
      const decision = typeof req.body?.decision === "string" ? req.body.decision : "";
      const requiredPermission = decision === "verified" ? "verification.approve" : decision === "rejected" ? "verification.reject" : "verification.review";
      if (!req.adminAccess?.permissions.includes(requiredPermission)) {
        return res.status(403).json({ error: "Access denied", code: "ADMIN_PERMISSION_REQUIRED", permission: requiredPermission });
      }
      return res.json(await sellerVerificationService.review(req.params.caseId, deps.getUserId(req)!, req.body));
    } catch (error) { return handleError(error, res); }
  });
}
