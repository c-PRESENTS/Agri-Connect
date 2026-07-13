import type { Express, Request, Response } from "express";
import { storage } from "../../storage";

export function registerSearchRoutes(app: Express): void {
  const handleDiscovery = async (req: Request, res: Response) => {
    try {
      const queryValue = typeof req.query.q === "string" ? req.query.q : typeof req.query.search === "string" ? req.query.search : "";
      const query = queryValue.trim().slice(0, 100);
      if (!query) {
        return res.json({ products: [], categories: [], farmers: [] });
      }

      const products = await storage.getProducts({ search: query });
      const categories = await storage.getCategories();

      const normalizedQuery = query.toLowerCase();
      const matchedCategories = categories.filter((category) =>
        category.buyerVisible !== false && (
          category.name.toLowerCase().includes(normalizedQuery) ||
          category.subcategories.some((subcategory) => subcategory.buyerVisible !== false && subcategory.name.toLowerCase().includes(normalizedQuery))
        )
      );
      const farmersById = new Map<string, { id: string; name: string; location: string; categories: Set<string> }>();
      for (const product of products) {
        const farmer = farmersById.get(product.farmerId) || {
          id: product.farmerId,
          name: product.farmerName || "Seller not specified",
          location: product.farmerLocation || "Location not specified",
          categories: new Set<string>(),
        };
        farmer.categories.add(product.categoryId);
        farmersById.set(product.farmerId, farmer);
      }

      res.json({
        products: products.slice(0, 20).map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          unit: product.unit,
          categoryId: product.categoryId,
          subcategoryId: product.subcategoryId,
          farmerId: product.farmerId,
          farmerName: product.farmerName,
          farmerLocation: product.farmerLocation,
          images: product.images,
        })),
        categories: matchedCategories,
        farmers: Array.from(farmersById.values()).map((farmer) => ({ ...farmer, categories: Array.from(farmer.categories) })),
      });
    } catch (error) {
      res.status(500).json({ error: "Search failed" });
    }
  };

  app.get("/api/search", handleDiscovery);
  app.get("/api/discovery", handleDiscovery);
}
