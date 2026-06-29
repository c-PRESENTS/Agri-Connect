import type { Express, Request, Response } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { updateProfileSchema } from "@shared/models/auth";
import { fromZodError } from "zod-validation-error";
import { ZodError } from "zod";

export function registerAuthRoutes(app: Express): void {
  // Current authenticated user (full DB record)
  app.get("/api/auth/user", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update profile (role, name, phone, location, preferences, etc.)
  app.patch("/api/auth/profile", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const updates = updateProfileSchema.parse(req.body);
      // Role can only be set if user has no role yet (initial onboarding).
      // Once a role is assigned, only an admin flow may change it.
      if (updates.role) {
        const current = await authStorage.getUser(userId);
        if (current?.role && current.role !== updates.role) {
          delete (updates as { role?: string }).role;
        }
      }
      const user = await authStorage.updateProfile(userId, updates);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Mark profile wizard complete
  app.post("/api/auth/profile/complete", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.updateProfile(userId, { profileComplete: true });
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark profile complete" });
    }
  });

  // Backwards-compat alias used by older client code
  app.get("/api/auth/me", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
