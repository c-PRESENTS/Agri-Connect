import type { Express, Request, Response } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { insertProductSchema, type ProductFilters } from "@shared/schema";
import { isAuthenticated } from "../../auth";
import { authStorage } from "../../auth/storage";
import { storage } from "../../storage";
import { audit } from "../../audit";
import { buildHomeProductRecommendations } from "../../catalog/home-recommendations";
import { sellerCapabilities } from "../../seller-verification/capabilities";
import { regionalMarketplaceRepository } from "../../repositories/regional-marketplace-repository";
import { haversineKm } from "../../shipping/quote-engine";

function getUserId(req: Request): string | undefined {
  return req.session?.userId;
}

function handleZod(err: unknown, res: Response): boolean {
  if (err instanceof ZodError) {
    res.status(400).json({ error: fromZodError(err).message });
    return true;
  }
  return false;
}

function getBuyerCategories(categories: Awaited<ReturnType<typeof storage.getCategories>>) {
  return categories
    .filter((category) => category.buyerVisible !== false)
    .map((category) => ({
      ...category,
      subcategories: category.subcategories.filter((subcategory) => subcategory.buyerVisible !== false),
    }));
}

export function registerCatalogRoutes(app: Express): void {
  app.get("/api/products", async (req, res) => {
    try {
      const filters: ProductFilters = {};

      if (req.query.categoryId) filters.categoryId = req.query.categoryId as string;
      if (req.query.subcategoryId) filters.subcategoryId = req.query.subcategoryId as string;
      if (req.query.search) filters.search = req.query.search as string;
      if (req.query.isOrganic === "true") filters.isOrganic = true;
      if (req.query.inStock === "true") filters.inStock = true;
      if (req.query.distance) filters.distance = parseInt(req.query.distance as string);
      if (req.query.rating) filters.rating = parseFloat(req.query.rating as string);
      if (req.query.minPrice) filters.minPrice = parseFloat(req.query.minPrice as string);
      if (req.query.maxPrice) filters.maxPrice = parseFloat(req.query.maxPrice as string);
      if (req.query.sortBy) filters.sortBy = req.query.sortBy as ProductFilters["sortBy"];

      const products = await storage.getProducts(filters);
      const liveLocation = req.session?.liveLocation;
      if (liveLocation) {
        let ranked = products
          .map((product) => ({
            ...product,
            distance: Math.round(haversineKm(
              { lat: liveLocation.latitude, lng: liveLocation.longitude },
              { lat: product.farmerLatitude, lng: product.farmerLongitude },
            ) * 10) / 10,
          }))
          .filter((product) => !filters.distance || product.distance <= filters.distance);
        if (!filters.sortBy || filters.sortBy === "distance") {
          ranked = ranked.sort(
            (first, second) =>
              (first.distance ?? Number.POSITIVE_INFINITY) -
              (second.distance ?? Number.POSITIVE_INFINITY),
          );
        }
        return res.json(ranked);
      }
      res.json(products);
    } catch {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/home-recommendations", isAuthenticated, async (req, res) => {
    try {
      const user = await authStorage.getUser(getUserId(req)!);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const liveLocation = req.session.liveLocation;
      const latitude = liveLocation?.latitude ?? user.latitude;
      const longitude = liveLocation?.longitude ?? user.longitude;
      const label = liveLocation?.label ?? user.location;
      if (!label || latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return res.status(422).json({
          error: "A saved profile location with coordinates is required for nearby recommendations.",
          code: "PROFILE_LOCATION_REQUIRED",
        });
      }

      const recommendations = buildHomeProductRecommendations({
        products: await storage.getProducts(),
        userLocation: {
          label,
          latitude,
          longitude,
        },
      });
      res.json(recommendations);
    } catch {
      res.status(500).json({ error: "Failed to load nearby product recommendations" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      if ((product.publicationStatus ?? "published") !== "published" && product.farmerId !== getUserId(req)) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const productData = insertProductSchema.parse(req.body);
      const { opportunityId, ...persistedProductData } = productData;
      const category = await storage.getCategory(productData.categoryId);
      if (!category) return res.status(400).json({ error: "Please select a valid category." });
      if (!category.subcategories.some((subcategory) => subcategory.id === productData.subcategoryId)) {
        return res.status(400).json({ error: "Please select a valid subcategory." });
      }
      const product = await storage.createProduct(persistedProductData as any, userId);
      if (opportunityId) {
        const attached = await regionalMarketplaceRepository.attachOpportunityListing(opportunityId, userId, product.id);
        if (!attached) {
          await storage.deleteProduct(product.id);
          return res.status(409).json({ error: "The opportunity expired or does not match this product and region" });
        }
      }
      audit({ action: "seller.product_created", actorId: userId, targetType: "product", targetId: product.id });
      res.status(201).json(product);
    } catch (error) {
      if (handleZod(error, res)) return;
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.post("/api/products/:id/publish", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const existing = await storage.getProduct(req.params.id);
      if (!existing) return res.status(404).json({ error: "Product not found" });
      if (existing.farmerId !== userId) return res.status(403).json({ error: "Access denied" });
      const capabilities = await sellerCapabilities(userId);
      if (!capabilities.canPublishListings) {
        return res.status(403).json({
          error: "Complete seller verification before publishing listings.",
          code: "SELLER_VERIFICATION_REQUIRED",
        });
      }
      const assignment = await regionalMarketplaceRepository.getActiveSellerAssignment(userId, existing.regionId);
      if (!assignment?.canPublish) {
        return res.status(403).json({
          error: "An approved selling region is required before publishing listings.",
          code: "SELLER_REGION_APPROVAL_REQUIRED",
        });
      }
      const product = await storage.updateProduct(existing.id, {
        publicationStatus: "published",
        publicationReason: undefined,
        regionId: assignment.regionId,
        regionName: assignment.regionName,
      });
      await regionalMarketplaceRepository.attachProductRegion(existing.id, assignment);
      audit({ action: "seller.product_published", actorId: userId, targetType: "product", targetId: existing.id });
      return res.json(product);
    } catch {
      return res.status(500).json({ error: "Failed to publish product" });
    }
  });

  app.patch("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const existing = await storage.getProduct(req.params.id);
      if (!existing) return res.status(404).json({ error: "Product not found" });
      if (existing.farmerId !== userId) return res.status(403).json({ error: "Access denied" });
      const parsedUpdates = insertProductSchema.partial().parse(req.body);
      const { opportunityId: _ignoredOpportunityId, ...updates } = parsedUpdates;
      if (updates.regionId) {
        const assignment = await regionalMarketplaceRepository.getActiveSellerAssignment(userId, updates.regionId);
        if (!assignment) return res.status(403).json({ error: "You are not approved to sell in that region", code: "SELLER_REGION_APPROVAL_REQUIRED" });
        Object.assign(updates, { regionId: assignment.regionId, regionName: assignment.regionName });
      }
      const product = await storage.updateProduct(req.params.id, updates as any);
      audit({ action: "seller.product_updated", actorId: userId, targetType: "product", targetId: req.params.id });
      res.json(product);
    } catch (error) {
      if (handleZod(error, res)) return;
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const existing = await storage.getProduct(req.params.id);
      if (!existing) return res.status(404).json({ error: "Product not found" });
      if (existing.farmerId !== userId) return res.status(403).json({ error: "Access denied" });
      await storage.deleteProduct(req.params.id);
      audit({ action: "seller.product_deleted", actorId: userId, targetType: "product", targetId: req.params.id });
      res.status(204).send();
    } catch {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  app.get("/api/farmers/:farmerId/products", async (req, res) => {
    try {
      const products = await storage.getProductsByFarmer(req.params.farmerId);
      const requesterId = getUserId(req);
      if (requesterId === req.params.farmerId) return res.json(products);
      const publicProducts = await storage.getProducts();
      res.json(publicProducts.filter((product) => product.farmerId === req.params.farmerId));
    } catch {
      res.status(500).json({ error: "Failed to fetch farmer products" });
    }
  });

  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/buyer", async (_req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(getBuyerCategories(categories));
    } catch {
      res.status(500).json({ error: "Failed to fetch buyer categories" });
    }
  });

  app.get("/api/categories/:id", async (req, res) => {
    try {
      const category = await storage.getCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch {
      res.status(500).json({ error: "Failed to fetch category" });
    }
  });
}
