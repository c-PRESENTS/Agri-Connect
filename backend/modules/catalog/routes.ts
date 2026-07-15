import type { Express, Request, Response } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { insertProductSchema, type ProductFilters } from "@shared/schema";
import { isAuthenticated } from "../../auth";
import { storage } from "../../storage";
import { audit } from "../../audit";

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
      res.json(products);
    } catch {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
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
      const category = await storage.getCategory(productData.categoryId);
      if (!category) return res.status(400).json({ error: "Please select a valid category." });
      if (!category.subcategories.some((subcategory) => subcategory.id === productData.subcategoryId)) {
        return res.status(400).json({ error: "Please select a valid subcategory." });
      }
      const product = await storage.createProduct(productData as any, userId);
      audit({ action: "seller.product_created", actorId: userId, targetType: "product", targetId: product.id });
      res.status(201).json(product);
    } catch (error) {
      if (handleZod(error, res)) return;
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const existing = await storage.getProduct(req.params.id);
      if (!existing) return res.status(404).json({ error: "Product not found" });
      if (existing.farmerId !== userId) return res.status(403).json({ error: "Access denied" });
      const updates = insertProductSchema.partial().parse(req.body);
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
      res.json(products);
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
