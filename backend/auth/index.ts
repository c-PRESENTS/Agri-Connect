import bcrypt from "bcryptjs";
import connectPg from "connect-pg-simple";
import rateLimit from "express-rate-limit";
import type { Express, Request, RequestHandler, Response } from "express";
import session from "express-session";
import { z, ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { updateProfileSchema, type User } from "@shared/models/auth";
import { authStorage } from "./storage";
import { audit } from "../audit";
import { verifyGoogleToken } from "./google";
import {
  geocodeLocation,
  GeocodingUnavailableError,
  LocationNotFoundError,
  normalizeLocationQuery,
  reverseGeocodeLocation,
} from "../location/geocoder";

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
    guestCartKey?: string;
    liveLocation?: {
      latitude: number;
      longitude: number;
      accuracyMeters: number | null;
      label: string;
      countryCode: string | null;
      updatedAt: string;
    };
  }
}

const credentialsSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120).optional(),
});

const loginSchema = credentialsSchema.pick({ email: true, password: true });
const liveLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().nonnegative().max(100_000).optional().nullable(),
});
const accountModeSchema = z.object({
  mode: z.enum(["buyer", "seller"]),
});

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

export async function regenerateSessionPreservingGuestCart(req: Request): Promise<void> {
  const guestCartKey = req.session.guest ? `session_${req.sessionID}` : undefined;
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
  if (guestCartKey) req.session.guestCartKey = guestCartKey;
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
      await regenerateSessionPreservingGuestCart(req);
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

      await regenerateSessionPreservingGuestCart(req);
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
      await regenerateSessionPreservingGuestCart(req);
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

  // Session discovery is intentionally public. An anonymous browser is a
  // normal application state, so return null instead of producing a noisy 401
  // for every first-time visitor.
  app.get("/api/auth/user", async (req, res) => {
    try {
      const userId = getSessionUserId(req);
      if (!userId) return res.json(null);
      const user = await authStorage.getUser(userId);
      if (!user) {
        req.session.destroy(() => undefined);
        return res.json(null);
      }
      res.json(serializeUser(user));
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/auth/live-location", isAuthenticated, async (req, res) => {
    return res.json(req.session.liveLocation ?? null);
  });

  app.put("/api/auth/live-location", isAuthenticated, async (req, res) => {
    try {
      const input = liveLocationSchema.parse(req.body);
      let label = "Current device location";
      let countryCode: string | null = null;
      try {
        const resolved = await reverseGeocodeLocation(input.latitude, input.longitude);
        label = resolved.label;
        countryCode = resolved.countryCode;
      } catch (error) {
        if (!(error instanceof LocationNotFoundError || error instanceof GeocodingUnavailableError)) {
          throw error;
        }
      }

      req.session.liveLocation = {
        latitude: input.latitude,
        longitude: input.longitude,
        accuracyMeters: input.accuracyMeters ?? null,
        label,
        countryCode,
        updatedAt: new Date().toISOString(),
      };
      return res.json(req.session.liveLocation);
    } catch (error) {
      if (handleAuthError(error, res)) return;
      return res.status(500).json({ message: "Failed to update live location" });
    }
  });

  app.delete("/api/auth/live-location", isAuthenticated, (req, res) => {
    delete req.session.liveLocation;
    return res.status(204).end();
  });

  app.patch("/api/auth/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = getSessionUserId(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const updates = updateProfileSchema.parse(req.body);
      const current = await authStorage.getUser(userId);
      if (updates.role) {
        // Only lock role once the profile has been completed — new users must
        // be free to choose farmer / buyer during onboarding.
        if (current?.role && current.role !== updates.role && current.profileComplete) {
          delete (updates as { role?: string }).role;
        }
      }
      const locationWasSubmitted = Object.prototype.hasOwnProperty.call(req.body, "location");
      // Public coordinates are derived from a city-level location by the
      // server. Client-supplied coordinates are intentionally ignored.
      delete (updates as { latitude?: number | null }).latitude;
      delete (updates as { longitude?: number | null }).longitude;
      if (locationWasSubmitted) {
        const submittedLocation = normalizeLocationQuery(updates.location ?? "");
        if (!submittedLocation) {
          updates.location = null;
          updates.latitude = null;
          updates.longitude = null;
        } else if (
          submittedLocation !== normalizeLocationQuery(current?.location ?? "") ||
          current?.latitude == null ||
          current?.longitude == null
        ) {
          const resolved = await geocodeLocation(submittedLocation);
          updates.location = resolved.label;
          updates.latitude = resolved.latitude;
          updates.longitude = resolved.longitude;
        } else {
          updates.location = current.location;
        }
      }
      const user = await authStorage.updateProfile(userId, updates);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(serializeUser(user));
    } catch (error) {
      if (handleAuthError(error, res)) return;
      if (error instanceof LocationNotFoundError) {
        return res.status(422).json({ message: error.message, field: "location" });
      }
      if (error instanceof GeocodingUnavailableError) {
        return res.status(503).json({ message: error.message, field: "location" });
      }
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post("/api/auth/account-mode", isAuthenticated, async (req, res) => {
    const userId = getSessionUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    try {
      const { mode } = accountModeSchema.parse(req.body);
      const current = await authStorage.getUser(userId);
      if (!current) return res.status(404).json({ message: "User not found" });
      if (!["buyer", "farmer"].includes(current.role)) {
        audit({ action: "account.mode_switched", actorId: userId, targetType: "account", targetId: userId, outcome: "denied" });
        return res.status(403).json({ message: "This account type cannot switch to seller mode" });
      }

      const user = await authStorage.switchAccountMode(userId, mode);
      if (!user) return res.status(404).json({ message: "User not found" });
      audit({ action: "account.mode_switched", actorId: userId, targetType: "account", targetId: userId });
      return res.json(serializeUser(user));
    } catch (error) {
      if (handleAuthError(error, res)) return;
      console.error("Error switching account mode:", error);
      return res.status(500).json({ message: "Failed to switch account mode" });
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
