import type { Express, Request, Response, NextFunction } from "express";
import { registerAIRoutes } from "./ai/routes";
import { registerCartRoutes } from "./cart/routes";
import { registerCatalogRoutes } from "./catalog/routes";
import { registerCommerceRoutes } from "./commerce/routes";
import { registerLocalNeedsRoutes, registerShareCareRoutes } from "./community/routes";
import { registerFarmerRoutes } from "./farmers/routes";
import { registerGovernmentRoutes } from "./government/routes";
import { registerLandRoutes } from "./land/routes";
import { registerProxyRoutes } from "./proxy/routes";
import { registerReviewsRoutes } from "./reviews/routes";
import { registerSearchRoutes } from "./search/routes";
import { registerSupportRoutes } from "./support/routes";

export interface BackendModuleDeps {
  getUserId(req: Request): string | undefined;
  getUserIdOrSession(req: Request): string;
  touchGuestSession(req: Request): void;
  mergeGuestCartIfNeeded(req: Request): Promise<void>;
  rateLimit(key: string, limit: number, windowMs: number): boolean;
  aiRateLimit(limit: number, windowMs: number): (req: Request, res: Response, next: NextFunction) => void;
}

export function registerBackendModules(app: Express, deps: BackendModuleDeps): void {
  registerCatalogRoutes(app);
  registerCartRoutes(app, {
    getUserId: deps.getUserId,
    getUserIdOrSession: deps.getUserIdOrSession,
    touchGuestSession: deps.touchGuestSession,
    mergeGuestCartIfNeeded: deps.mergeGuestCartIfNeeded,
  });
  registerCommerceRoutes(app, { getUserId: deps.getUserId });
  registerReviewsRoutes(app, { getUserId: deps.getUserId });
  registerFarmerRoutes(app);
  registerLocalNeedsRoutes(app);
  registerSearchRoutes(app);
  registerAIRoutes(app, { aiRateLimit: deps.aiRateLimit });
  registerGovernmentRoutes(app, { getUserId: deps.getUserId });
  registerSupportRoutes(app, { getUserId: deps.getUserId, rateLimit: deps.rateLimit });
  registerShareCareRoutes(app);
  registerLandRoutes(app);
  registerProxyRoutes(app);
}
