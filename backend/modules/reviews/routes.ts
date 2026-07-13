import type { Express, Request, Response } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import type { InsertReview } from "@shared/schema";
import { insertReviewSchema } from "@shared/schema";
import { isAuthenticated } from "../../auth";
import { authStorage } from "../../auth/storage";
import { storage } from "../../storage";

interface ReviewsRouteDeps {
  getUserId(req: Request): string | undefined;
}

function handleZod(error: unknown, res: Response): boolean {
  if (error instanceof ZodError) {
    res.status(400).json({ error: fromZodError(error).message });
    return true;
  }
  return false;
}

export function registerReviewsRoutes(app: Express, deps: ReviewsRouteDeps): void {
  const { getUserId } = deps;

  app.get("/api/reviews/product/:productId", async (req, res) => {
    try {
      const reviews = await storage.getProductReviews(req.params.productId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.post("/api/reviews", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const data = insertReviewSchema.parse(req.body);

      const alreadyReviewed = await storage.hasUserReviewedProduct(userId, data.productId);
      if (alreadyReviewed) {
        return res.status(409).json({ error: "You have already reviewed this product" });
      }

      const deliveredOrder = await storage.getUserOrderForProduct(userId, data.productId);
      if (!deliveredOrder || deliveredOrder.id !== data.orderId) {
        return res.status(403).json({ error: "You can only review products from your delivered orders" });
      }

      const profile = await authStorage.getUser(userId);
      const displayName =
        profile?.name ||
        [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
        profile?.email ||
        "Anonymous";
      const avatar = profile?.avatar || profile?.profileImageUrl || "";

      const review = await storage.createReview(userId, displayName, avatar, data as InsertReview);
      res.status(201).json(review);
    } catch (error) {
      if (handleZod(error, res)) return;
      res.status(500).json({ error: "Failed to create review" });
    }
  });

  app.get("/api/reviews/check/:productId", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.json({ canReview: false, hasReviewed: false });
      const hasReviewed = await storage.hasUserReviewedProduct(userId, req.params.productId);
      const deliveredOrder = await storage.getUserOrderForProduct(userId, req.params.productId);
      res.json({ canReview: !!deliveredOrder && !hasReviewed, hasReviewed, orderId: deliveredOrder?.id });
    } catch (error) {
      res.status(500).json({ error: "Failed to check review eligibility" });
    }
  });
}
