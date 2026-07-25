import type { Express, Request, Response } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { supportTicketSchema } from "@shared/schema";
import { isAuthenticated } from "../../auth";
import { authStorage } from "../../auth/storage";
import { storage } from "../../storage";
import { queueSupportTicketEmails } from "../../notifications";

type SupportRouteDeps = {
  getUserId: (req: Request) => string | undefined;
  rateLimit: (key: string, limit: number, windowMs: number) => boolean;
};

function handleZod(err: unknown, res: Response): boolean {
  if (err instanceof ZodError) {
    res.status(400).json({ error: fromZodError(err).message });
    return true;
  }
  return false;
}

export function registerSupportRoutes(app: Express, deps: SupportRouteDeps): void {
  app.get("/api/e2e/support-key", (_req, res) => {
    const enabled = process.env.E2E_SUPPORT_ENABLED === "true";
    if (!enabled) return res.json({ enabled: false });
    const keyId = process.env.E2E_SUPPORT_KEY_ID;
    const publicKeyPem = process.env.E2E_SUPPORT_PUBLIC_KEY_PEM;
    if (!keyId || !publicKeyPem) return res.status(503).json({ error: "End-to-end support encryption is enabled but no recipient public key is configured" });
    res.json({ enabled: true, keyId, algorithm: "RSA-OAEP-256/AES-256-GCM", publicKeyPem });
  });

  app.post("/api/support", async (req, res) => {
    try {
      if (!deps.rateLimit(`support:${deps.getUserId(req) ?? req.ip}`, 5, 60_000)) {
        return res.status(429).json({ error: "Too many requests, please try again shortly." });
      }
      const parsed = supportTicketSchema.parse(req.body);
      const e2eEnabled = process.env.E2E_SUPPORT_ENABLED === "true";
      if (e2eEnabled && !parsed.encryptedMessage) return res.status(400).json({ error: "End-to-end encrypted message required" });
      if (parsed.encryptedMessage && parsed.encryptedMessage.keyId !== process.env.E2E_SUPPORT_KEY_ID) {
        return res.status(400).json({ error: "The recipient encryption key is no longer active. Refresh and try again." });
      }
      const userId = deps.getUserId(req);
      const ticket = await storage.createSupportTicket({
        name: parsed.name, email: parsed.email, topic: parsed.topic,
        message: parsed.message ?? "[End-to-end encrypted support message]",
        encryptedMessage: parsed.encryptedMessage, userId,
      });
      queueSupportTicketEmails(ticket);
      res.status(201).json({ id: ticket.id, status: ticket.status });
    } catch (error) {
      if (handleZod(error, res)) return;
      res.status(500).json({ error: "Failed to submit support request" });
    }
  });

  app.get("/api/support", isAuthenticated, async (req, res) => {
    try {
      const tickets = await storage.getSupportTickets(deps.getUserId(req));
      res.json(tickets);
    } catch {
      res.status(500).json({ error: "Failed to fetch support tickets" });
    }
  });

  app.get("/api/support/e2e/inbox", isAuthenticated, async (req, res) => {
    try {
      const userId = deps.getUserId(req)!;
      const user = await authStorage.getUser(userId);
      if (user?.role !== "admin") return res.status(403).json({ error: "Access denied" });
      // This service returns ciphertext only; private keys never enter it.
      res.json((await storage.getAllSupportTickets()).filter((ticket) => ticket.encryptedMessage));
    } catch {
      res.status(500).json({ error: "Failed to fetch encrypted support inbox" });
    }
  });
}
