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
import { storage } from "../../storage";
import { localNeedPostSchema } from "@shared/schema";

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
        ? {
            label: buyer.location!,
            latitude: buyer.latitude!,
            longitude: buyer.longitude!,
          }
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
  const items = [
      { id: "sc-1", name: "Heritage Tomatoes", unit: "kg", qty: 4, donor: "Rachel Green", location: "Chelmsford, Essex", latitude: 51.7356, longitude: 0.4685, emoji: "🍅", postedAgo: "2m ago", category: "vegetables", urgency: "urgent", expiresIn: "45 mins" },
      { id: "sc-2", name: "Fresh Kale Bundles", unit: "bundle", qty: 6, donor: "Tom Hart", location: "Norwich, Norfolk", latitude: 52.6309, longitude: 1.2974, emoji: "🥬", postedAgo: "8m ago", category: "vegetables", urgency: "medium", expiresIn: "2 hours" },
      { id: "sc-3", name: "Duck Eggs (free-range)", unit: "dozen", qty: 2, donor: "Anna Bell", location: "Bath, Somerset", latitude: 51.3811, longitude: -2.359, emoji: "🥚", postedAgo: "15m ago", category: "dairy", urgency: "safe", expiresIn: "5 hours" },
      { id: "sc-4", name: "Organic Apples", unit: "kg", qty: 5, donor: "Liam Walker", location: "Canterbury, Kent", latitude: 51.2802, longitude: 1.0789, emoji: "🍎", postedAgo: "22m ago", category: "fruits", urgency: "safe", expiresIn: "1 day" },
      { id: "sc-5", name: "Wild Garlic Leaves", unit: "bunch", qty: 8, donor: "Sue Moore", location: "York, Yorkshire", latitude: 53.959, longitude: -1.0815, emoji: "🌿", postedAgo: "35m ago", category: "medicinal", urgency: "medium", expiresIn: "3 hours" },
      { id: "sc-6", name: "Surplus Courgettes", unit: "kg", qty: 3, donor: "Paul Evans", location: "Oxford, Oxfordshire", latitude: 51.752, longitude: -1.2577, emoji: "🥒", postedAgo: "41m ago", category: "vegetables", urgency: "medium", expiresIn: "2 hours" },
      { id: "sc-7", name: "Homemade Plum Jam", unit: "jar", qty: 10, donor: "Claire James", location: "Exeter, Devon", latitude: 50.7184, longitude: -3.5339, emoji: "🫙", postedAgo: "55m ago", category: "pickles", urgency: "safe", expiresIn: "30 days" },
      { id: "sc-8", name: "Sunflower Seedlings", unit: "tray", qty: 3, donor: "Mark Singh", location: "Cambridge, Cambs", latitude: 52.2053, longitude: 0.1218, emoji: "🌻", postedAgo: "1h ago", category: "seeds", urgency: "safe", expiresIn: "7 days" },
      { id: "sc-9", name: "Raw Honey (uncapped)", unit: "jar", qty: 4, donor: "Fiona Black", location: "Bury St Edmunds, Suffolk", latitude: 52.2452, longitude: 0.7104, emoji: "🍯", postedAgo: "1h ago", category: "honey", urgency: "safe", expiresIn: "60 days" },
      { id: "sc-10", name: "Mixed Salad Greens", unit: "bag", qty: 7, donor: "George Ali", location: "Lincoln, Lincolnshire", latitude: 53.2307, longitude: -0.5406, emoji: "🥗", postedAgo: "2h ago", category: "vegetables", urgency: "urgent", expiresIn: "50 mins" },
      { id: "sc-11", name: "Runner Beans (fresh)", unit: "kg", qty: 2, donor: "Priya Shah", location: "Colchester, Essex", latitude: 51.8959, longitude: 0.8919, emoji: "🫘", postedAgo: "2h ago", category: "pulses", urgency: "medium", expiresIn: "2 hours" },
      { id: "sc-12", name: "Butternut Squash", unit: "each", qty: 5, donor: "David Owen", location: "Kings Lynn, Norfolk", latitude: 52.751, longitude: 0.3924, emoji: "🎃", postedAgo: "3h ago", category: "vegetables", urgency: "safe", expiresIn: "5 days" },
      { id: "sc-13", name: "Sourdough Loaves", unit: "loaf", qty: 6, donor: "Holt Bakery", location: "Brighton, East Sussex", latitude: 50.8225, longitude: -0.1372, emoji: "🍞", postedAgo: "20m ago", category: "bakery", urgency: "urgent", expiresIn: "40 mins" },
      { id: "sc-14", name: "Beef Mince (frozen)", unit: "kg", qty: 4, donor: "Hartley Farm", location: "Reading, Berkshire", latitude: 51.4543, longitude: -0.9781, emoji: "🥩", postedAgo: "30m ago", category: "meat", urgency: "safe", expiresIn: "30 days" },
      { id: "sc-15", name: "Surplus Yoghurt Pots", unit: "pack", qty: 12, donor: "Dales Dairy", location: "Manchester", latitude: 53.4808, longitude: -2.2426, emoji: "🥣", postedAgo: "1h ago", category: "dairy", urgency: "medium", expiresIn: "1.5 hours" },
  ];

  app.get("/api/share-care", (_req, res) => {
    res.json(items);
  });

  app.get("/api/platform/stats", async (_req, res) => {
    try {
      const products = await storage.getProducts();
      const services = products.filter((product) => product.categoryId === "services").length;
      const productListings = products.length - services;

      res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
      res.json({
        farmers: 1284,
        products: productListings,
        freeItems: items.length,
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
