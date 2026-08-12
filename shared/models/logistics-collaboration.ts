import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";
import { users } from "./auth";

export const logisticsCollaborationInterests = pgTable(
  "logistics_collaboration_interests",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
    contactName: varchar("contact_name", { length: 120 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    organisationName: varchar("organisation_name", { length: 160 }).notNull(),
    collaborationType: varchar("collaboration_type", { length: 40 }).notNull(),
    region: varchar("region", { length: 160 }).notNull(),
    details: text("details"),
    status: varchar("status", { length: 30 }).notNull().default("registered"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("logistics_collaboration_email_type_uidx").on(table.email, table.collaborationType),
    index("logistics_collaboration_status_created_idx").on(table.status, table.createdAt),
    index("logistics_collaboration_user_idx").on(table.userId, table.updatedAt),
  ],
);

export const collaborationTypeSchema = z.enum([
  "carrier",
  "cold_chain",
  "warehouse",
  "last_mile",
  "technology",
  "other",
]);

export const createLogisticsCollaborationInterestSchema = z.object({
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(5).max(40).optional().or(z.literal("")),
  organisationName: z.string().trim().min(2).max(160),
  collaborationType: collaborationTypeSchema,
  region: z.string().trim().min(2).max(160),
  details: z.string().trim().max(1_000).optional().or(z.literal("")),
});

export type CreateLogisticsCollaborationInterest = z.infer<typeof createLogisticsCollaborationInterestSchema>;
export type LogisticsCollaborationInterest = typeof logisticsCollaborationInterests.$inferSelect;
