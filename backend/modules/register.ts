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
import { registerDashboardRoutes } from "./dashboard/routes";
import { registerStudentRoutes } from "./student/routes";
import { registerPaymentRoutes } from "./payments/routes";
import { registerPaymentWebhookRoutes } from "./payments/webhooks";
import { registerSellerPaymentRoutes } from "./payments/seller-routes";
import { registerSettlementRoutes } from "./payments/settlement-routes";
import { registerRefundRoutes } from "./payments/refund-routes";
import { registerDisputeRoutes } from "./payments/dispute-routes";
import { registerPaymentDashboardRoutes } from "./payments/dashboard-routes";
import { registerPaymentOperatorRoutes } from "./payments/operator-routes";
import { registerAdminFoundationRoutes } from "./admin/routes";
import { registerConversationRoutes } from "./conversations/routes";
import { registerAccountRoutes } from "./account/routes";
import { registerSellerVerificationRoutes } from "./seller-verification/routes";
import { registerLogisticsCollaborationRoutes } from "./logistics-collaboration/routes";
import { registerRegionalMarketplaceRoutes } from "./regional-marketplace/routes";

import { registerDietaryRoutes } from "./dietary/routes";

export interface BackendModuleDeps {
  getUserId(req: Request): string | undefined;
  getUserIdOrSession(req: Request): string;
  touchGuestSession(req: Request): void;
  mergeGuestCartIfNeeded(req: Request): Promise<void>;
  rateLimit(key: string, limit: number, windowMs: number): boolean;
  aiRateLimit(limit: number, windowMs: number): (req: Request, res: Response, next: NextFunction) => void;
}

export function registerBackendModules(app: Express, deps: BackendModuleDeps): void {
  registerAdminFoundationRoutes(app);
  registerAccountRoutes(app, { getUserId: deps.getUserId });
  registerSellerVerificationRoutes(app, { getUserId: deps.getUserId });
  registerLogisticsCollaborationRoutes(app, {
    getUserId: deps.getUserId,
    rateLimit: deps.rateLimit,
  });
  registerRegionalMarketplaceRoutes(app);
  registerCatalogRoutes(app);
  registerDietaryRoutes(app, { getUserIdOrSession: deps.getUserIdOrSession });
  registerCartRoutes(app, {
    getUserId: deps.getUserId,
    getUserIdOrSession: deps.getUserIdOrSession,
    touchGuestSession: deps.touchGuestSession,
    mergeGuestCartIfNeeded: deps.mergeGuestCartIfNeeded,
  });
  registerCommerceRoutes(app, { getUserId: deps.getUserId });
  registerPaymentRoutes(app, { getUserId: deps.getUserId });
  registerSellerPaymentRoutes(app, { getUserId: deps.getUserId });
  registerSettlementRoutes(app, { getUserId: deps.getUserId });
  registerRefundRoutes(app, { getUserId: deps.getUserId });
  registerDisputeRoutes(app, { getUserId: deps.getUserId });
  registerPaymentDashboardRoutes(app, { getUserId: deps.getUserId });
  registerPaymentOperatorRoutes(app, { getUserId: deps.getUserId });
  registerPaymentWebhookRoutes(app);
  registerReviewsRoutes(app, { getUserId: deps.getUserId });
  registerConversationRoutes(app, { getUserId: deps.getUserId, rateLimit: deps.rateLimit });
  registerFarmerRoutes(app);
  registerLocalNeedsRoutes(app);
  registerSearchRoutes(app);
  registerAIRoutes(app, { aiRateLimit: deps.aiRateLimit });
  registerGovernmentRoutes(app, { getUserId: deps.getUserId });
  registerSupportRoutes(app, { getUserId: deps.getUserId, rateLimit: deps.rateLimit });
  registerDashboardRoutes(app, { getUserId: deps.getUserId });
  registerStudentRoutes(app, { getUserId: deps.getUserId, rateLimit: deps.rateLimit });
  registerShareCareRoutes(app);
  registerLandRoutes(app);
  registerProxyRoutes(app);
}
