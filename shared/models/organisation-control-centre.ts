import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { users } from "./auth";
import { organisations } from "./organisations";

export const organisationSettings = pgTable(
  "organisation_settings",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organisationId: varchar("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    settingKey: varchar("setting_key", { length: 100 }).notNull(),
    value: jsonb("value").notNull().default(sql`'{}'::jsonb`),
    version: integer("version").notNull().default(1),
    updatedBy: varchar("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("organisation_settings_org_key_unique").on(table.organisationId, table.settingKey),
    index("organisation_settings_updated_idx").on(table.organisationId, table.updatedAt),
  ],
);

export const adminDataRequests = pgTable(
  "admin_data_requests",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organisationId: varchar("organisation_id").references(() => organisations.id, { onDelete: "set null" }),
    requestedBy: varchar("requested_by").references(() => users.id, { onDelete: "set null" }),
    requestType: varchar("request_type", { length: 60 }).notNull(),
    status: varchar("status", { length: 30 }).notNull().default("requested"),
    reason: text("reason").notNull(),
    safeResult: jsonb("safe_result").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("admin_data_requests_org_status_idx").on(table.organisationId, table.status, table.createdAt)],
);

export const controlCentreResourceModuleSchema = z.enum([
  "sellers",
  "buyers",
  "students",
  "researchers",
  "service-providers",
  "logistics-partners",
  "regions",
  "opportunities",
  "content",
  "orders",
  "logistics",
  "settings",
]);

export const organisationApplicationReviewSchema = z.object({
  status: z.enum(["approved", "rejected", "documents_required"]),
  reason: z.string().trim().min(3).max(1_000),
});

const currencyConversionValueSchema = z.object({
  type: z.literal("currency_conversion"),
  sourceCurrency: z.string().trim().regex(/^[A-Z]{3}$/),
  targetCurrency: z.string().trim().regex(/^[A-Z]{3}$/),
  rate: z.number().positive().max(1_000_000),
  enabled: z.boolean(),
});

const shippingOverrideValueSchema = z.object({
  type: z.literal("shipping_rule_override"),
  enabled: z.boolean(),
  flatFeeMinor: z.number().int().min(0).max(100_000_000).optional(),
});

export const organisationOperationalSettingSchema = z.object({
  organisationId: z.string().trim().min(1).max(160),
  settingKey: z.enum(["currency_conversion", "shipping_rule_override"]),
  value: z.discriminatedUnion("type", [currencyConversionValueSchema, shippingOverrideValueSchema]),
  reason: z.string().trim().min(3).max(500),
}).superRefine((input, context) => {
  if (input.settingKey !== input.value.type) {
    context.addIssue({ code: "custom", path: ["settingKey"], message: "Setting key and value type must match" });
  }
  if (input.value.type === "currency_conversion" && input.value.sourceCurrency === input.value.targetCurrency) {
    context.addIssue({ code: "custom", path: ["value", "targetCurrency"], message: "Currencies must be different" });
  }
});

export const controlCentreResourceActionSchema = z.object({
  action: z.enum([
    "activate",
    "deactivate",
    "suspend",
    "reactivate",
    "confirm",
    "start_processing",
    "mark_shipped",
    "mark_delivered",
    "publish",
    "unpublish",
    "cancel",
  ]),
  reason: z.string().trim().min(3).max(500),
  expectedUpdatedAt: z.string().datetime().optional(),
});

export const adminBackupRequestSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export type ControlCentreResourceModule = z.infer<typeof controlCentreResourceModuleSchema>;
export type ControlCentreResourceAction = z.infer<typeof controlCentreResourceActionSchema>;
export type OrganisationOperationalSettingInput = z.infer<typeof organisationOperationalSettingSchema>;
