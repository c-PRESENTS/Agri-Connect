import type { Express, Request } from "express";
import { schemeApplicationSchema } from "@shared/schema";
import { isAuthenticated } from "../../auth";
import { authStorage } from "../../auth/storage";
import { storage } from "../../storage";

interface GovernmentRouteDeps {
  getUserId(req: Request): string | undefined;
}

export function registerGovernmentRoutes(app: Express, deps: GovernmentRouteDeps): void {
  const { getUserId } = deps;

  app.get("/api/government/applications", async (req, res) => {
    try {
      const userId = getUserId(req);
      const applications = await storage.getSchemeApplications(userId);
      res.json(applications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  app.post("/api/government/applications", isAuthenticated, async (req, res) => {
    try {
      const parsed = schemeApplicationSchema.parse(req.body);
      const { schemeId, schemeName, farmerName, landArea, location, phone } = parsed;
      const userId = getUserId(req)!;
      const profile = await authStorage.getUser(userId);
      const displayName =
        profile?.name ||
        [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
        farmerName;
      const application = await storage.createSchemeApplication({
        userId,
        userName: displayName,
        schemeId,
        schemeName,
        farmerName,
        landArea: landArea || "",
        location: location || "",
        phone: phone || "",
        documents: [],
      });
      res.status(201).json(application);
    } catch (error) {
      res.status(500).json({ error: "Failed to submit application" });
    }
  });
}
