import type { Express, Request, Response } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { createConversationMessageSchema, createConversationSchema } from "@shared/schema";
import { isAuthenticated } from "../../auth";
import { authStorage } from "../../auth/storage";
import { conversationRepository } from "../../repositories/conversation-repository";
import { storage } from "../../storage";

interface ConversationRouteDeps {
  getUserId(req: Request): string | undefined;
  rateLimit(key: string, limit: number, windowMs: number): boolean;
}

function handleZod(error: unknown, res: Response): boolean {
  if (error instanceof ZodError) {
    res.status(400).json({ error: fromZodError(error).message });
    return true;
  }
  return false;
}

export function registerConversationRoutes(app: Express, deps: ConversationRouteDeps): void {
  const { getUserId } = deps;

  app.post("/api/conversations", isAuthenticated, async (req, res) => {
    try {
      const buyerId = getUserId(req)!;
      if (!deps.rateLimit(`conversation-create:${buyerId}`, 15, 60_000)) {
        return res.status(429).json({ error: "Too many conversation requests. Please wait before trying again." });
      }
      const { productId } = createConversationSchema.parse(req.body);
      const product = await storage.getProduct(productId);
      if (!product) return res.status(404).json({ error: "Product not found" });
      if (product.farmerId === buyerId) {
        return res.status(409).json({ error: "Sellers cannot start a buyer conversation on their own product" });
      }
      const seller = await authStorage.getUser(product.farmerId);
      if (!seller || seller.role !== "farmer") {
        return res.status(422).json({
          error: "This product is not connected to a registered farmer messaging account.",
          code: "SELLER_MESSAGING_UNAVAILABLE",
        });
      }
      const conversation = await conversationRepository.createOrGet({ productId, buyerId, sellerId: seller.id });
      res.status(201).json(conversation);
    } catch (error) {
      if (handleZod(error, res)) return;
      res.status(500).json({ error: "Failed to start conversation" });
    }
  });

  app.get("/api/conversations", isAuthenticated, async (req, res) => {
    try {
      const productId = typeof req.query.productId === "string" ? req.query.productId.trim() : undefined;
      const conversations = await conversationRepository.listForUser(getUserId(req)!, productId || undefined);
      res.json(conversations);
    } catch {
      res.status(500).json({ error: "Failed to load conversations" });
    }
  });

  app.get("/api/conversations/:conversationId/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const access = await conversationRepository.getAccess(req.params.conversationId, userId);
      if (!access) return res.status(404).json({ error: "Conversation not found" });
      const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
      const pageSize = Math.min(100, Math.max(1, Number.parseInt(String(req.query.pageSize ?? "50"), 10) || 50));
      res.json(await conversationRepository.listMessages(access.id, page, pageSize));
    } catch {
      res.status(500).json({ error: "Failed to load messages" });
    }
  });

  app.post("/api/conversations/:conversationId/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      if (!deps.rateLimit(`conversation-message:${userId}`, 30, 60_000)) {
        return res.status(429).json({ error: "Too many messages. Please wait before sending another." });
      }
      const access = await conversationRepository.getAccess(req.params.conversationId, userId);
      if (!access) return res.status(404).json({ error: "Conversation not found" });
      if (access.status !== "active") return res.status(409).json({ error: "This conversation is closed" });
      const { content } = createConversationMessageSchema.parse(req.body);
      res.status(201).json(await conversationRepository.createMessage(access.id, userId, content));
    } catch (error) {
      if (handleZod(error, res)) return;
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.post("/api/conversations/:conversationId/read", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req)!;
      const access = await conversationRepository.getAccess(req.params.conversationId, userId);
      if (!access) return res.status(404).json({ error: "Conversation not found" });
      res.json({ updated: await conversationRepository.markRead(access.id, userId) });
    } catch {
      res.status(500).json({ error: "Failed to update read status" });
    }
  });
}
