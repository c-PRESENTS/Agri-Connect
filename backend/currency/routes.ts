import type { Express } from "express";
import { getExchangeRateSnapshot } from "./exchange-rate-service";

export function registerCurrencyRoutes(app: Express): void {
  app.get("/api/exchange-rates", async (_req, res, next) => {
    try {
      const snapshot = await getExchangeRateSnapshot();
      res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=86400");
      res.json(snapshot);
    } catch (error) {
      next(error);
    }
  });
}

