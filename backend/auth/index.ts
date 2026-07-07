import bcrypt from "bcryptjs";
import connectPg from "connect-pg-simple";
import rateLimit from "express-rate-limit";
import type { Express, Request, RequestHandler, Response } from "express";
import session from "express-session";
import { z, ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { updateProfileSchema, type User } from "@shared/models/auth";
import { authStorage } from "./storage";
import { verifyGoogleToken } from "./google";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Try again in 15 minutes." },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many registration attempts. Try again in an hour." },
});

declare module "express-session" {
  interface SessionData {
    userId?: string;
    guest?: boolean;
  }
}

const credentialsSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120).optional(),
});

const loginSchema = credentialsSchema.pick({ email: true, password: true });

function serializeUser(user: User) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable is required in production");
  }

  const PgStore = connectPg(session);
  const sessionStore = new PgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  return session({
    secret: sessionSecret || "dev-session-secret-change-me",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await authStorage.getUser(req.session.userId);
  if (!user) {
    req.session.destroy(() => undefined);
    return res.status(401).json({ message: "Unauthorized" });
  }

  (req as any).user = serializeUser(user);
  next();
};

function getSessionUserId(req: Request): string | undefined {
  return req.session.userId;
}

function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

function handleAuthError(error: unknown, res: Response): boolean {
  if (error instanceof ZodError) {
    res.status(400).json({ message: fromZodError(error).message });
    return true;
  }
  return false;
}

export function registerAuthRoutes(app: Express): void {
  app.post("/api/auth/register", registerLimiter, async (req, res) => {
    try {
      const credentials = credentialsSchema.parse(req.body);
      const existing = await authStorage.getUserByEmail(credentials.email);
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const passwordHash = await bcrypt.hash(credentials.password, 12);
      const user = await authStorage.createUser({
        email: credentials.email,
        passwordHash,
        name: credentials.name,
        firstName: credentials.name?.split(" ")[0],
        lastName: credentials.name?.split(" ").slice(1).join(" ") || null,
      });
      await regenerateSession(req);
      req.session.userId = user.id;
      res.status(201).json(serializeUser(user));
    } catch (error) {
      if (handleAuthError(error, res)) return;
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      const user = await authStorage.getUserByEmail(credentials.email);
      if (!user?.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(credentials.password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      await regenerateSession(req);
      req.session.userId = user.id;
      res.json(serializeUser(user));
    } catch (error) {
      if (handleAuthError(error, res)) return;
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Failed to sign in" });
    }
  });

  app.post("/api/auth/google", async (req, res) => {
    try {
      const { credential } = req.body;
      if (!credential || typeof credential !== "string") {
        return res.status(400).json({ message: "Missing Google credential" });
      }

      const googleUser = await verifyGoogleToken(credential);
      let user = await authStorage.getUserByGoogleId(googleUser.googleId);

      if (!user && googleUser.email) {
        user = await authStorage.getUserByEmail(googleUser.email);
        if (user) {
          user = await authStorage.updateProfile(user.id, {
            googleId: googleUser.googleId,
            firstName: googleUser.name.split(" ")[0],
            lastName: googleUser.name.split(" ").slice(1).join(" ") || null,
            profileImageUrl: googleUser.picture,
          });
        }
      }

      if (!user) {
        user = await authStorage.createUser({
          googleId: googleUser.googleId,
          email: googleUser.email || null,
          name: googleUser.name,
          firstName: googleUser.name.split(" ")[0],
          lastName: googleUser.name.split(" ").slice(1).join(" ") || null,
          profileImageUrl: googleUser.picture,
          authMethod: "google",
          profileComplete: false,
        });
      }

      // Regenerate session to prevent session fixation.
      await regenerateSession(req);
      req.session.userId = user.id;
      res.json({ user: serializeUser(user), isNewUser: !user.profileComplete });
    } catch (error) {
      console.error("Error with Google auth:", error);
      res.status(401).json({ message: "Google authentication failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((error) => {
      if (error) {
        return res.status(500).json({ message: "Failed to sign out" });
      }
      res.clearCookie("connect.sid");
      res.status(204).send();
    });
  });

  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = getSessionUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await authStorage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(serializeUser(user));
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch("/api/auth/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = getSessionUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const updates = updateProfileSchema.parse(req.body);
      if (updates.role) {
        const current = await authStorage.getUser(userId);
        // Only lock role once the profile has been completed — new users must
        // be free to choose farmer / buyer during onboarding.
        if (current?.role && current.role !== updates.role && current.profileComplete) {
          delete (updates as { role?: string }).role;
        }
      }
      const user = await authStorage.updateProfile(userId, updates);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(serializeUser(user));
    } catch (error) {
      if (handleAuthError(error, res)) return;
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post("/api/auth/profile/complete", isAuthenticated, async (req, res) => {
    try {
      const userId = getSessionUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await authStorage.updateProfile(userId, { profileComplete: true });
      res.json(user ? serializeUser(user) : null);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark profile complete" });
    }
  });

  app.get("/api/auth/me", isAuthenticated, async (req, res) => {
    try {
      const userId = getSessionUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await authStorage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(serializeUser(user));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/login", (_req, res) => {
    res.redirect("/login");
  });
}

