import type { Express } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { isAuthenticated } from "../../auth";
import { authStorage } from "../../auth/storage";
import {
  geocodeLocation,
  GeocodingUnavailableError,
  LocationNotFoundError,
  normalizeLocationQuery,
} from "../../location/geocoder";
import { localNeedsRepository } from "../../repositories/local-needs-repository";
import {
  ShareCareOwnListingError,
  ShareCareUnavailableError,
  shareCareRepository,
} from "../../repositories/share-care-repository";
import { storage } from "../../storage";
import {
  createShareCareListingSchema,
  localNeedPostSchema,
  shareCareListingStatusSchema,
  updateShareCareListingSchema,
} from "@shared/schema";

export function registerLocalNeedsRoutes(app: Express): void {
  app.get("/api/local-needs", async (req, res) => {
    try {
      const urgency = typeof req.query.urgency === "string" ? req.query.urgency : undefined;
      res.json(await localNeedsRepository.listActive(urgency));
    } catch (error) {
      console.error("Failed to list local needs:", error);
      res.status(500).json({ error: "Failed to fetch local needs" });
    }
  });

  app.post("/api/local-needs", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const buyer = await authStorage.getUser(userId);
      if (!buyer) return res.status(404).json({ error: "User not found" });
      if (buyer.role !== "buyer") {
        return res.status(403).json({ error: "Only buyer accounts can post a local need" });
      }

      const data = localNeedPostSchema.parse(req.body);
      const requestedLocation = normalizeLocationQuery(data.location || buyer.location || "");
      if (!requestedLocation) {
        return res.status(422).json({
          error: "Add a City, Country location in Account Settings before posting a need",
          field: "location",
        });
      }

      const sameAsProfile =
        requestedLocation === normalizeLocationQuery(buyer.location ?? "") &&
        buyer.latitude != null &&
        buyer.longitude != null;
      const resolved = sameAsProfile
        ? { label: buyer.location!, latitude: buyer.latitude!, longitude: buyer.longitude! }
        : await geocodeLocation(requestedLocation);

      const buyerName =
        buyer.name ||
        [buyer.firstName, buyer.lastName].filter(Boolean).join(" ").trim() ||
        buyer.email ||
        "AgriConnect Buyer";
      const need = await localNeedsRepository.create({
        buyerId: buyer.id,
        productName: data.productName,
        quantity: data.quantity,
        unit: data.unit,
        priceRange: data.priceRange,
        location: resolved.label,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        urgency: data.urgency,
        buyerName,
        buyerType: data.buyerType,
        description: data.description,
        deadline: data.deadline || undefined,
        category: data.category,
      });
      res.status(201).json(need);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      if (error instanceof LocationNotFoundError) {
        return res.status(422).json({ error: error.message, field: "location" });
      }
      if (error instanceof GeocodingUnavailableError) {
        return res.status(503).json({ error: error.message, field: "location" });
      }
      console.error("Failed to create local need:", error);
      res.status(500).json({ error: "Failed to post local need" });
    }
  });

  app.get("/api/demand-alerts", async (req, res) => {
    try {
      const location = req.query.location as string | undefined;
      const alerts = await storage.getDemandAlerts(location);
      res.json(alerts);
    } catch {
      res.status(500).json({ error: "Failed to fetch demand alerts" });
    }
  });
}

export function registerShareCareRoutes(app: Express): void {
  app.get("/api/share-care", async (req, res) => {
    try {
      const parsedStatus = typeof req.query.status === "string"
        ? shareCareListingStatusSchema.safeParse(req.query.status)
        : undefined;
      const requestedLimit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
      const limit = Number.isInteger(requestedLimit) ? requestedLimit : undefined;
      res.json(await shareCareRepository.list({
        freeOnly: req.query.free === "true",
        status: parsedStatus?.success ? parsedStatus.data : undefined,
        limit,
      }));
    } catch (error) {
      console.error("Failed to list Share & Care items:", error);
      res.status(500).json({ error: "Failed to fetch Share & Care listings" });
    }
  });

  app.post("/api/share-care", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const donor = await authStorage.getUser(userId);
      if (!donor) return res.status(404).json({ error: "User not found" });
      const data = createShareCareListingSchema.parse(req.body);
      const requestedLocation = normalizeLocationQuery(data.location || donor.location || "");
      if (!requestedLocation) {
        return res.status(422).json({ error: "Add a location before sharing an item", field: "location" });
      }
      const sameAsProfile =
        requestedLocation === normalizeLocationQuery(donor.location ?? "") &&
        donor.latitude != null &&
        donor.longitude != null;
      const resolved = sameAsProfile
        ? { label: donor.location!, latitude: donor.latitude!, longitude: donor.longitude! }
        : await geocodeLocation(requestedLocation);
      const donorName =
        donor.name ||
        [donor.firstName, donor.lastName].filter(Boolean).join(" ").trim() ||
        donor.email ||
        "AgriConnect Member";
      const listing = await shareCareRepository.create({
        donorId: userId,
        donorName,
        sourceType: data.sourceType,
        name: data.name,
        category: data.category,
        quantity: data.quantity,
        unit: data.unit,
        isFree: data.isFree,
        price: data.isFree ? 0 : data.price,
        location: resolved.label,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        emoji: data.emoji,
        urgency: data.urgency,
        expiresAt: new Date(Date.now() + data.expiresInHours * 60 * 60 * 1_000),
        dietaryTags: data.dietaryTags,
      });
      res.status(201).json(listing);
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ error: fromZodError(error).message });
      if (error instanceof LocationNotFoundError) return res.status(422).json({ error: error.message, field: "location" });
      if (error instanceof GeocodingUnavailableError) return res.status(503).json({ error: error.message, field: "location" });
      console.error("Failed to create Share & Care listing:", error);
      res.status(500).json({ error: "Failed to create Share & Care listing" });
    }
  });

  app.patch("/api/share-care/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const data = updateShareCareListingSchema.parse(req.body);
      const listing = await shareCareRepository.updateOwned(req.params.id, userId, {
        ...data,
        expiresAt: data.expiresInHours
          ? new Date(Date.now() + data.expiresInHours * 60 * 60 * 1_000)
          : undefined,
      });
      if (!listing) return res.status(404).json({ error: "Listing not found or not owned by you" });
      res.json(listing);
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ error: fromZodError(error).message });
      console.error("Failed to update Share & Care listing:", error);
      res.status(500).json({ error: "Failed to update Share & Care listing" });
    }
  });

  app.post("/api/share-care/:id/reserve", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      res.json(await shareCareRepository.reserve(req.params.id, userId));
    } catch (error) {
      if (error instanceof ShareCareUnavailableError) return res.status(409).json({ error: error.message });
      if (error instanceof ShareCareOwnListingError) return res.status(400).json({ error: error.message });
      console.error("Failed to reserve Share & Care listing:", error);
      res.status(500).json({ error: "Failed to reserve Share & Care listing" });
    }
  });

  app.get("/api/platform/stats", async (_req, res) => {
    try {
      const products = await storage.getProducts();
      const services = products.filter((product) => product.categoryId === "services").length;
      const productListings = products.length - services;
      const freeItems = await shareCareRepository.countAvailableFree();

      res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
      res.json({
        farmers: 1284,
        products: productListings,
        freeItems,
        buyers: 3642,
        students: 876,
        services,
        demoFields: ["farmers", "buyers", "students"],
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to calculate platform statistics:", error);
      res.status(500).json({ error: "Failed to fetch platform statistics" });
    }
  });
}
