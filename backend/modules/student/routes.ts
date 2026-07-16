import { createHash, randomBytes } from "crypto";
import type { Express, NextFunction, Request, Response } from "express";
import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { ZodError, z } from "zod";
import { authStorage } from "../../auth/storage";
import { verifyGoogleToken } from "../../auth/google";
import { db } from "../../config/db";
import {
  studentEntitlements,
  studentEnrolmentStatusSchema,
  studentLevelSchema,
  studentLoginConfirmations,
  studentRegistry,
  studentResources,
  studentSupportRequestInputSchema,
  studentSupportRequests,
} from "@shared/schema";
import { readStudentTestConfirmation, sendStudentLoginConfirmation } from "./email";
import { audit } from "../../audit";

declare module "express-session" {
  interface SessionData {
    studentPortalVerifiedAt?: string;
    studentDemoLevel?: "UG" | "PG" | "PhD";
  }
}

type StudentRouteDeps = {
  getUserId: (req: Request) => string | undefined;
  rateLimit: (key: string, limit: number, windowMs: number) => boolean;
};

const googleCredentialSchema = z.object({ credential: z.string().min(20) });
const confirmationSchema = z.object({ token: z.string().min(40).max(200) });
const resourceQuerySchema = z.object({
  level: studentLevelSchema.optional(),
  category: z.string().trim().max(80).optional(),
});

const demoRequests = new Map<string, Array<{
  id: string;
  studentUserId: string;
  category: string;
  subject: string;
  description: string;
  preferredContact: string;
  status: "submitted";
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: null;
}>>();

const demoResources = [
  {
    id: "demo-academic-support",
    title: "Academic skills and study planning",
    summary: "Preview guidance for study planning, assessment preparation, and academic skills support.",
    url: "/student/support",
    category: "Academic support",
    studyLevels: ["UG", "PG", "PhD"],
    published: true,
    sortOrder: 1,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: "demo-library-research",
    title: "Library and research support",
    summary: "Preview access point for literature searches, referencing, datasets, and research consultations.",
    url: "/student/support",
    category: "Library and research",
    studyLevels: ["UG", "PG", "PhD"],
    published: true,
    sortOrder: 2,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: "demo-ug-field-learning",
    title: "Undergraduate field learning toolkit",
    summary: "Placement preparation, practical fieldwork checklists, and first-degree academic support.",
    url: "/student/support",
    category: "Academic support",
    studyLevels: ["UG"],
    published: true,
    sortOrder: 3,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: "demo-pg-dissertation",
    title: "Postgraduate dissertation support",
    summary: "Research design, ethics preparation, supervisor meetings, and dissertation planning for taught postgraduates.",
    url: "/student/support",
    category: "Library and research",
    studyLevels: ["PG"],
    published: true,
    sortOrder: 3,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: "demo-phd-researcher",
    title: "Doctoral researcher support",
    summary: "Progression reviews, research integrity, publication planning, and doctoral supervision guidance.",
    url: "/student/support",
    category: "Library and research",
    studyLevels: ["PhD"],
    published: true,
    sortOrder: 3,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
];

function demoEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.STUDENT_DEMO_MODE !== "false";
}

function demoAccess(userId: string, studyLevel: "UG" | "PG" | "PhD" = "UG") {
  const preview = {
    UG: { programme: "BSc Agriculture and Sustainable Development", department: "School of Agriculture", studentNumber: "DEMO-UG" },
    PG: { programme: "MSc Sustainable Agriculture", department: "Graduate School of Agriculture", studentNumber: "DEMO-PG" },
    PhD: { programme: "PhD Agricultural Innovation", department: "Doctoral Research School", studentNumber: "DEMO-PHD" },
  }[studyLevel];
  return {
    entitlement: { id: "demo-entitlement", userId },
    registry: {
      id: "demo-registry",
      institutionalEmail: "student.preview@example.edu",
      studentNumber: preview.studentNumber,
      studyLevel,
      programme: preview.programme,
      department: preview.department,
      enrolmentStatus: "active",
      accessExpiresAt: new Date(Date.now() + 24 * 60 * 60_000),
      revokedAt: null,
    },
  };
}

function enabled(): boolean {
  return demoEnabled() || process.env.STUDENT_PORTAL_ENABLED === "true";
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}${"*".repeat(Math.max(2, name.length - 2))}@${domain}`;
}

function studentUnavailable(res: Response): Response {
  return res.status(503).json({ error: "Student portal is not enabled" });
}

async function activeStudentForUser(userId: string) {
  const [result] = await db
    .select({ registry: studentRegistry, entitlement: studentEntitlements })
    .from(studentEntitlements)
    .innerJoin(studentRegistry, eq(studentRegistry.id, studentEntitlements.studentRegistryId))
    .where(and(
      eq(studentEntitlements.userId, userId),
      isNull(studentEntitlements.revokedAt),
      eq(studentRegistry.enrolmentStatus, "active"),
      isNull(studentRegistry.revokedAt),
      gt(studentRegistry.accessExpiresAt, new Date()),
    ));
  return result;
}

export async function requireVerifiedStudent(req: Request, res: Response, next: NextFunction) {
  if (!enabled()) return studentUnavailable(res);
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: "Authentication required" });
  if (demoEnabled()) {
    res.locals.studentAccess = demoAccess(userId, req.session.studentDemoLevel);
    return next();
  }
  try {
    const access = await activeStudentForUser(userId);
    if (!access) return res.status(403).json({ error: "Verified active student access required" });
    res.locals.studentAccess = access;
    next();
  } catch {
    res.status(500).json({ error: "Unable to verify student access" });
  }
}

export function registerStudentRoutes(app: Express, deps: StudentRouteDeps): void {
  app.post("/api/student-auth/google", async (req, res) => {
    if (!enabled()) return studentUnavailable(res);
    if (!deps.rateLimit(`student-google:${req.ip}`, 8, 15 * 60_000)) {
      return res.status(429).json({ error: "Too many student login attempts" });
    }
    try {
      const { credential } = googleCredentialSchema.parse(req.body);
      const googleUser = await verifyGoogleToken(credential);
      if (!googleUser.email || !googleUser.emailVerified) {
        return res.status(403).json({ error: "A verified institutional Google email is required" });
      }

      const email = googleUser.email.trim().toLowerCase();
      const [registry] = await db.select().from(studentRegistry).where(and(
        eq(studentRegistry.institutionalEmail, email),
        eq(studentRegistry.enrolmentStatus, "active"),
        isNull(studentRegistry.revokedAt),
        gt(studentRegistry.accessExpiresAt, new Date()),
      ));
      if (!registry) return res.status(403).json({ error: "Student access is unavailable for this account" });
      studentLevelSchema.parse(registry.studyLevel);
      studentEnrolmentStatusSchema.parse(registry.enrolmentStatus);

      let user = await authStorage.getUserByGoogleId(googleUser.googleId);
      if (!user) user = await authStorage.getUserByEmail(email);
      if (user && user.email?.toLowerCase() !== email) {
        return res.status(403).json({ error: "Student identity does not match the registered email" });
      }
      if (!user) {
        user = await authStorage.createUser({
          googleId: googleUser.googleId,
          email,
          name: googleUser.name,
          firstName: googleUser.name.split(" ")[0],
          lastName: googleUser.name.split(" ").slice(1).join(" ") || null,
          profileImageUrl: googleUser.picture,
          authMethod: "google",
          profileComplete: false,
        });
      } else if (user.googleId && user.googleId !== googleUser.googleId) {
        return res.status(403).json({ error: "Student identity does not match the linked Google account" });
      } else if (!user.googleId) {
        user = await authStorage.updateProfile(user.id, {
          googleId: googleUser.googleId,
          firstName: googleUser.name.split(" ")[0],
          lastName: googleUser.name.split(" ").slice(1).join(" ") || null,
          profileImageUrl: googleUser.picture,
        });
      }
      if (!user) return res.status(500).json({ error: "Unable to prepare student account" });

      const rawToken = randomBytes(32).toString("base64url");
      const ttlMinutes = Math.min(30, Math.max(5, Number(process.env.STUDENT_LOGIN_CONFIRMATION_TTL_MINUTES) || 15));
      const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
      await db.update(studentLoginConfirmations)
        .set({ usedAt: new Date() })
        .where(and(eq(studentLoginConfirmations.userId, user.id), isNull(studentLoginConfirmations.usedAt)));
      const [confirmation] = await db.insert(studentLoginConfirmations).values({
        userId: user.id,
        studentRegistryId: registry.id,
        tokenHash: tokenHash(rawToken),
        expiresAt,
      }).returning({ id: studentLoginConfirmations.id });
      const delivered = await sendStudentLoginConfirmation(email, rawToken, ttlMinutes);
      if (!delivered) {
        await db.update(studentLoginConfirmations).set({ usedAt: new Date() }).where(eq(studentLoginConfirmations.id, confirmation.id));
        return res.status(503).json({ error: "Student confirmation email is not configured" });
      }

      const guestCartKey = req.session.guestCartKey ?? `session_${req.sessionID}`;
      await new Promise<void>((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
      req.session.userId = user.id;
      req.session.guestCartKey = guestCartKey;
      audit({ action: "student.login_requested", actorId: user.id, targetType: "student_access", targetId: registry.id });
      res.status(202).json({ requiresConfirmation: true, email: maskEmail(email), expiresInMinutes: ttlMinutes });
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ error: "Invalid student login request" });
      console.warn("[student-auth] login failed", (error as Error).message);
      res.status(401).json({ error: "Student authentication failed" });
    }
  });

  app.post("/api/student-auth/confirm", async (req, res) => {
    if (!enabled()) return studentUnavailable(res);
    try {
      const userId = deps.getUserId(req);
      if (!userId) return res.status(401).json({ error: "Sign in with the same Google account first" });
      const { token } = confirmationSchema.parse(req.body);
      const hash = tokenHash(token);
      const [confirmation] = await db.select().from(studentLoginConfirmations).where(and(
        eq(studentLoginConfirmations.tokenHash, hash),
        eq(studentLoginConfirmations.userId, userId),
        isNull(studentLoginConfirmations.usedAt),
        gt(studentLoginConfirmations.expiresAt, new Date()),
      ));
      if (!confirmation) return res.status(400).json({ error: "Confirmation link is invalid or expired" });
      const [registry] = await db.select().from(studentRegistry).where(and(
        eq(studentRegistry.id, confirmation.studentRegistryId),
        eq(studentRegistry.enrolmentStatus, "active"),
        isNull(studentRegistry.revokedAt),
        gt(studentRegistry.accessExpiresAt, new Date()),
      ));
      if (!registry) return res.status(403).json({ error: "Student access is no longer active" });

      await db.transaction(async (tx) => {
        const [consumed] = await tx.update(studentLoginConfirmations)
          .set({ usedAt: new Date() })
          .where(and(eq(studentLoginConfirmations.id, confirmation.id), isNull(studentLoginConfirmations.usedAt)))
          .returning({ id: studentLoginConfirmations.id });
        if (!consumed) throw new Error("Confirmation already used");
        await tx.insert(studentEntitlements).values({
          userId,
          studentRegistryId: registry.id,
          verifiedAt: new Date(),
          lastVerifiedAt: new Date(),
        }).onConflictDoUpdate({
          target: studentEntitlements.userId,
          set: { studentRegistryId: registry.id, lastVerifiedAt: new Date(), revokedAt: null, updatedAt: new Date() },
        });
      });
      req.session.studentPortalVerifiedAt = new Date().toISOString();
      audit({ action: "student.access_verified", actorId: userId, targetType: "student_access", targetId: registry.id });
      res.json({ verified: true, redirectTo: "/student/dashboard" });
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ error: "Invalid confirmation token" });
      console.warn("[student-auth] confirmation failed", (error as Error).message);
      res.status(400).json({ error: "Unable to confirm student login" });
    }
  });

  app.get("/api/student-auth/status", async (req, res) => {
    if (!enabled()) return res.json({ enabled: false, verified: false });
    const userId = deps.getUserId(req);
    if (demoEnabled()) return res.json({ enabled: true, verified: Boolean(userId), demo: true });
    if (!userId) return res.json({ enabled: true, verified: false });
    try {
      const access = await activeStudentForUser(userId);
      res.json({ enabled: true, verified: Boolean(access) });
    } catch {
      res.status(500).json({ error: "Unable to verify student access" });
    }
  });

  app.get("/api/student-auth/test/confirmation", async (req, res) => {
    if (process.env.NODE_ENV === "production" || process.env.STUDENT_EMAIL_MODE !== "test") return res.status(404).end();
    const testKey = process.env.STUDENT_AUTH_TEST_KEY;
    if (!testKey || req.get("x-student-test-key") !== testKey) return res.status(403).json({ error: "Access denied" });
    const email = z.string().email().parse(req.query.email);
    const message = readStudentTestConfirmation(email);
    if (!message) return res.status(404).json({ error: "No test confirmation found" });
    res.json({ token: message.token, createdAt: message.createdAt });
  });

  app.post("/api/student-demo/level", async (req, res) => {
    if (!demoEnabled()) return res.status(404).end();
    const userId = deps.getUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });
    try {
      const level = studentLevelSchema.parse(req.body?.level);
      req.session.studentDemoLevel = level;
      res.json({ level });
    } catch {
      res.status(400).json({ error: "Demo level must be UG, PG, or PhD" });
    }
  });

  app.get("/api/student/profile", requireVerifiedStudent, async (_req, res) => {
    const { registry } = res.locals.studentAccess;
    res.json({
      studentNumber: registry.studentNumber,
      institutionalEmail: registry.institutionalEmail,
      studyLevel: registry.studyLevel,
      programme: registry.programme,
      department: registry.department,
      accessExpiresAt: registry.accessExpiresAt,
      demo: demoEnabled(),
    });
  });

  app.get("/api/student/resources", requireVerifiedStudent, async (req, res) => {
    try {
      const query = resourceQuerySchema.parse(req.query);
      const { registry } = res.locals.studentAccess;
      const level = studentLevelSchema.parse(registry.studyLevel);
      if (query.level && query.level !== level) {
        return res.status(403).json({ error: "Resources are limited to your verified study level" });
      }
      if (demoEnabled()) {
        return res.json(demoResources.filter((resource) =>
          resource.studyLevels.includes(level) && (!query.category || resource.category === query.category),
        ));
      }
      const resources = await db.select().from(studentResources)
        .where(eq(studentResources.published, true))
        .orderBy(asc(studentResources.sortOrder), asc(studentResources.title));
      res.json(resources.filter((resource) =>
        resource.studyLevels.includes(level) && (!query.category || resource.category === query.category),
      ));
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ error: "Invalid resource filter" });
      res.status(500).json({ error: "Failed to load student resources" });
    }
  });

  app.get("/api/student/support-requests", requireVerifiedStudent, async (req, res) => {
    const userId = deps.getUserId(req)!;
    if (demoEnabled()) return res.json(demoRequests.get(userId) || []);
    const requests = await db.select().from(studentSupportRequests)
      .where(eq(studentSupportRequests.studentUserId, userId))
      .orderBy(asc(studentSupportRequests.createdAt));
    res.json(requests);
  });

  app.get("/api/student/support-requests/:id", requireVerifiedStudent, async (req, res) => {
    const userId = deps.getUserId(req)!;
    if (demoEnabled()) {
      const request = (demoRequests.get(userId) || []).find((candidate) => candidate.id === req.params.id);
      if (!request) return res.status(404).json({ error: "Support request not found" });
      return res.json(request);
    }
    const [request] = await db.select().from(studentSupportRequests).where(and(
      eq(studentSupportRequests.id, req.params.id),
      eq(studentSupportRequests.studentUserId, userId),
    ));
    if (!request) return res.status(404).json({ error: "Support request not found" });
    res.json(request);
  });

  app.post("/api/student/support-requests", requireVerifiedStudent, async (req, res) => {
    try {
      const userId = deps.getUserId(req)!;
      if (!deps.rateLimit(`student-support:${userId}`, 5, 60_000)) {
        return res.status(429).json({ error: "Too many requests, please try again shortly" });
      }
      const input = studentSupportRequestInputSchema.parse(req.body);
      if (demoEnabled()) {
        const now = new Date();
        const request = {
          id: `demo-request-${randomBytes(8).toString("hex")}`,
          studentUserId: userId,
          category: input.category,
          subject: input.subject,
          description: input.description,
          preferredContact: input.preferredContact,
          status: "submitted" as const,
          createdAt: now,
          updatedAt: now,
          resolvedAt: null,
        };
        demoRequests.set(userId, [request, ...(demoRequests.get(userId) || [])]);
        return res.status(201).json(request);
      }
      const [request] = await db.insert(studentSupportRequests).values({
        studentUserId: userId,
        category: input.category,
        subject: input.subject,
        description: input.description,
        preferredContact: input.preferredContact,
      }).returning();
      audit({ action: "student.support_requested", actorId: userId, targetType: "student_support", targetId: request.id });
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ error: "Please correct the highlighted request fields" });
      res.status(500).json({ error: "Failed to submit student support request" });
    }
  });
}
