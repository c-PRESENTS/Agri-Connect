import type { Express } from "express";
import { storage } from "../../storage";

export function registerLandRoutes(app: Express): void {
  app.get("/api/land-listings", async (req, res) => {
    try {
      const { type } = req.query;
      if (type === "sale") {
        const listings = await storage.getLandSaleListings();
        res.json(listings);
      } else if (type === "investment") {
        const listings = await storage.getLandInvestmentListings();
        res.json(listings);
      } else if (type === "community") {
        const listings = await storage.getCommunityPlotListings();
        res.json(listings);
      } else {
        const [sale, investment, community] = await Promise.all([
          storage.getLandSaleListings(),
          storage.getLandInvestmentListings(),
          storage.getCommunityPlotListings(),
        ]);
        res.json({ sale, investment, community });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch land listings" });
    }
  });
}
