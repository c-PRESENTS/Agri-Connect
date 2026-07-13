import type { Express } from "express";
import { storage } from "../../storage";

export function registerFarmerRoutes(app: Express): void {
  app.get("/api/farmers/:farmerId/stats", async (req, res) => {
    try {
      const stats = await storage.getFarmerStats(req.params.farmerId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch farmer stats" });
    }
  });
}
