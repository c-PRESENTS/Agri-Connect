import type { Express, Request } from "express";
import { ZodError } from "zod";
import { createLogisticsCollaborationInterestSchema } from "@shared/schema";
import { logisticsCollaborationRepository } from "../../repositories/logistics-collaboration-repository";

interface LogisticsCollaborationRouteDeps {
  getUserId(req: Request): string | undefined;
  rateLimit(key: string, limit: number, windowMs: number): boolean;
}

export function registerLogisticsCollaborationRoutes(
  app: Express,
  deps: LogisticsCollaborationRouteDeps,
): void {
  app.post("/api/logistics-collaboration/interests", async (req, res) => {
    try {
      const userId = deps.getUserId(req);
      if (!deps.rateLimit(`logistics-collaboration:${userId ?? req.ip}`, 5, 60_000)) {
        return res.status(429).json({ message: "Too many requests. Please try again shortly." });
      }

      const input = createLogisticsCollaborationInterestSchema.parse(req.body);
      const interest = await logisticsCollaborationRepository.register(userId, input);
      return res.status(201).json({
        id: interest.id,
        status: interest.status,
        message: "Your collaboration interest has been registered.",
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Please check the collaboration details and try again." });
      }
      console.error("Failed to register logistics collaboration interest:", error);
      return res.status(500).json({ message: "Could not register your interest right now." });
    }
  });
}
