import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table used by express-session. Do not drop while sessions are
// stored in Postgres.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// OTP codes table — persists one-time passcodes across restarts and instances.
// Old codes are lazily pruned when the send rate-limit is checked.
export const otpCodes = pgTable(
  "otp_codes",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    phone: varchar("phone", { length: 40 }).notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    attempts: integer("attempts").notNull().default(0),
    used: boolean("used").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("IDX_otp_phone").on(table.phone)],
);

export type OtpCode = typeof otpCodes.$inferSelect;

// Unified users table for AgriConnect identity and business profile fields.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  phone: varchar("phone").unique(),
  passwordHash: text("password_hash"),
  googleId: varchar("google_id").unique(),
  authMethod: text("auth_method").notNull().default("otp"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Business profile fields
  role: text("role").notNull().default("buyer"),
  name: text("name"),
  avatar: text("avatar"),
  location: text("location"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  rating: real("rating").default(0),
  reviewCount: integer("review_count").default(0),
  isOnline: boolean("is_online").default(false),
  isVerified: boolean("is_verified").default(false),
  profileComplete: boolean("profile_complete").default(false),
  preferredLanguage: text("preferred_language"),
  preferredCurrency: text("preferred_currency"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const updateProfileSchema = z.object({
  role: z.enum(["buyer", "farmer", "logistics", "admin"]).optional(),
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().max(80).optional().nullable(),
  name: z.string().min(1).max(120).optional(),
  phone: z.string().max(40).optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  preferredLanguage: z.string().max(10).optional().nullable(),
  preferredCurrency: z.string().max(10).optional().nullable(),
  profileComplete: z.boolean().optional(),
  googleId: z.string().optional(),
  profileImageUrl: z.string().url().optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const insertUserSchema = createInsertSchema(users);
export type InsertUser = typeof users.$inferInsert;
