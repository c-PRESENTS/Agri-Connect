import type { Express, Request, Response } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { supportTicketSchema } from "@shared/schema";
import { isAuthenticated } from "../../auth";
import { storage } from "../../storage";

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
  app.post("/api/support", async (req, res) => {
    try {
      if (!deps.rateLimit(`support:${deps.getUserId(req) ?? req.ip}`, 5, 60_000)) {
        return res.status(429).json({ error: "Too many requests, please try again shortly." });
      }
      const parsed = supportTicketSchema.parse(req.body);
      const userId = deps.getUserId(req);
      const ticket = await storage.createSupportTicket({ ...parsed, userId });
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
}
