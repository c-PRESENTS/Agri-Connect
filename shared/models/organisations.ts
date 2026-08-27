import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { users } from "./auth";

export const organisationTypeSchema = z.enum(["platform", "external"]);
export const organisationStatusSchema = z.enum([
  "draft",
  "email_verification_pending",
  "documents_required",
  "pending_review",
  "approved",
  "rejected",
  "suspended",
  "archived",
]);
export const organisationMembershipStatusSchema = z.enum([
  "invited",
  "active",
  "suspended",
  "deactivated",
]);
export const adminRoleScopeSchema = z.enum(["platform", "organisation"]);
export const permissionEffectSchema = z.enum(["allow", "deny"]);

export const ADMIN_PERMISSION_CODES = [
  "dashboard.view",
  "employees.view",
  "employees.invite",
  "employees.edit",
  "employees.deactivate",
  "employees.manage_permissions",
  "users.view",
  "users.edit",
  "users.approve",
  "users.suspend",
  "users.export",
  "organisations.view",
  "organisations.review",
  "organisations.approve",
  "organisations.suspend",
  "organisations.manage",
  "categories.view",
  "categories.create",
  "categories.edit",
  "categories.reorder",
  "categories.publish",
  "categories.archive",
  "products.view",
  "products.edit",
  "products.approve",
  "products.reject",
  "products.suspend",
  "products.feature",
  "products.remove",
  "verification.view",
  "verification.review",
  "verification.approve",
  "verification.reject",
  "analytics.view",
  "analytics.export",
  "revenue.view",
  "revenue.export",
  "revenue.manage_payouts",
  "data.import",
  "data.export",
  "data.request_backup",
  "audit.view",
  "audit.export",
  "security.manage",
  "partners.view",
  "partners.manage",
  "regions.view",
  "regions.manage",
  "opportunities.view",
  "opportunities.manage",
  "content.view",
  "content.manage",
  "orders.view",
  "orders.manage",
  "logistics.view",
  "logistics.manage",
  "settings.manage",
] as const;

export type AdminPermissionCode = (typeof ADMIN_PERMISSION_CODES)[number];
export const adminPermissionCodeSchema = z.enum(ADMIN_PERMISSION_CODES);

export const organisations = pgTable(
  "organisations",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    type: varchar("type", { length: 30 }).notNull().default("external"),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    officialEmail: varchar("official_email", { length: 320 }),
    status: varchar("status", { length: 40 }).notNull().default("draft"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("organisations_slug_unique").on(table.slug),
    index("organisations_status_type_idx").on(table.status, table.type),
  ],
);

export const organisationApplications = pgTable(
  "organisation_applications",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organisationId: varchar("organisation_id").references(() => organisations.id, { onDelete: "set null" }),
    applicantUserId: varchar("applicant_user_id").references(() => users.id, { onDelete: "set null" }),
    organisationName: varchar("organisation_name", { length: 200 }).notNull(),
    officialEmail: varchar("official_email", { length: 320 }).notNull(),
    status: varchar("status", { length: 40 }).notNull().default("draft"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewReason: text("review_reason"),
    applicationData: jsonb("application_data").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("organisation_applications_status_idx").on(table.status, table.createdAt),
    index("organisation_applications_email_idx").on(table.officialEmail),
  ],
);

export const adminPermissions = pgTable(
  "admin_permissions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    code: varchar("code", { length: 120 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description").notNull(),
    groupName: varchar("group_name", { length: 80 }).notNull(),
    highRisk: boolean("high_risk").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("admin_permissions_code_unique").on(table.code)],
);

export const adminRoles = pgTable(
  "admin_roles",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organisationId: varchar("organisation_id").references(() => organisations.id, { onDelete: "cascade" }),
    scope: varchar("scope", { length: 30 }).notNull(),
    code: varchar("code", { length: 80 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description").notNull(),
    isSystem: boolean("is_system").notNull().default(false),
    isSuperAdmin: boolean("is_super_admin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("admin_roles_org_scope_code_unique").on(table.organisationId, table.scope, table.code),
    index("admin_roles_scope_idx").on(table.scope),
  ],
);

export const adminRolePermissions = pgTable(
  "admin_role_permissions",
  {
    roleId: varchar("role_id").notNull().references(() => adminRoles.id, { onDelete: "cascade" }),
    permissionId: varchar("permission_id").notNull().references(() => adminPermissions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("admin_role_permissions_unique").on(table.roleId, table.permissionId)],
);

export const organisationMemberships = pgTable(
  "organisation_memberships",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organisationId: varchar("organisation_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    roleId: varchar("role_id").notNull().references(() => adminRoles.id),
    status: varchar("status", { length: 30 }).notNull().default("invited"),
    invitedBy: varchar("invited_by").references(() => users.id, { onDelete: "set null" }),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("organisation_memberships_org_user_unique").on(table.organisationId, table.userId),
    index("organisation_memberships_user_status_idx").on(table.userId, table.status),
    index("organisation_memberships_org_status_idx").on(table.organisationId, table.status),
  ],
);

export const memberPermissionOverrides = pgTable(
  "member_permission_overrides",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    membershipId: varchar("membership_id").notNull().references(() => organisationMemberships.id, { onDelete: "cascade" }),
    permissionId: varchar("permission_id").notNull().references(() => adminPermissions.id, { onDelete: "cascade" }),
    effect: varchar("effect", { length: 10 }).notNull(),
    grantedBy: varchar("granted_by").references(() => users.id, { onDelete: "set null" }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("member_permission_overrides_unique").on(table.membershipId, table.permissionId)],
);

export const organisationInvitations = pgTable(
  "organisation_invitations",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organisationId: varchar("organisation_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 320 }).notNull(),
    roleId: varchar("role_id").notNull().references(() => adminRoles.id),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    invitedBy: varchar("invited_by").references(() => users.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("organisation_invitations_token_unique").on(table.tokenHash),
    index("organisation_invitations_email_idx").on(table.organisationId, table.email),
  ],
);

export const accountEmailVerificationTokens = pgTable(
  "account_email_verification_tokens",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("account_email_verification_token_unique").on(table.tokenHash),
    index("account_email_verification_user_idx").on(table.userId),
  ],
);

export const accountPasswordResetTokens = pgTable(
  "account_password_reset_tokens",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("account_password_reset_token_unique").on(table.tokenHash),
    index("account_password_reset_user_idx").on(table.userId),
  ],
);

export const accountMfaCredentials = pgTable(
  "account_mfa_credentials",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 30 }).notNull().default("totp"),
    secretCiphertext: text("secret_ciphertext").notNull(),
    enabledAt: timestamp("enabled_at", { withTimezone: true }),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("account_mfa_user_type_unique").on(table.userId, table.type)],
);

export const accountMfaRecoveryCodes = pgTable(
  "account_mfa_recovery_codes",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("account_mfa_recovery_code_unique").on(table.codeHash),
    index("account_mfa_recovery_user_idx").on(table.userId),
  ],
);

export const accountLoginEvents = pgTable(
  "account_login_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
    emailHash: varchar("email_hash", { length: 64 }),
    outcome: varchar("outcome", { length: 30 }).notNull(),
    method: varchar("method", { length: 30 }).notNull(),
    ipHash: varchar("ip_hash", { length: 64 }),
    deviceHash: varchar("device_hash", { length: 64 }),
    failureCode: varchar("failure_code", { length: 80 }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("account_login_events_user_idx").on(table.userId, table.occurredAt),
    index("account_login_events_outcome_idx").on(table.outcome, table.occurredAt),
  ],
);

export const adminAuditEvents = pgTable(
  "admin_audit_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organisationId: varchar("organisation_id").references(() => organisations.id, { onDelete: "set null" }),
    actorUserId: varchar("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    membershipId: varchar("membership_id").references(() => organisationMemberships.id, { onDelete: "set null" }),
    action: varchar("action", { length: 160 }).notNull(),
    permissionCode: varchar("permission_code", { length: 120 }),
    targetType: varchar("target_type", { length: 80 }).notNull(),
    targetId: varchar("target_id", { length: 160 }),
    outcome: varchar("outcome", { length: 20 }).notNull().default("success"),
    requestId: varchar("request_id", { length: 100 }),
    ipHash: varchar("ip_hash", { length: 64 }),
    deviceHash: varchar("device_hash", { length: 64 }),
    changes: jsonb("changes").notNull().default(sql`'{}'::jsonb`),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("admin_audit_events_actor_idx").on(table.actorUserId, table.occurredAt),
    index("admin_audit_events_org_idx").on(table.organisationId, table.occurredAt),
    index("admin_audit_events_target_idx").on(table.targetType, table.targetId, table.occurredAt),
  ],
);

export type Organisation = typeof organisations.$inferSelect;
export type OrganisationMembership = typeof organisationMemberships.$inferSelect;
export type AdminRole = typeof adminRoles.$inferSelect;
export type AdminPermission = typeof adminPermissions.$inferSelect;

export interface AdminAccessContext {
  hasAccess: boolean;
  organisation: Pick<Organisation, "id" | "name" | "slug" | "type" | "status"> | null;
  membership: Pick<OrganisationMembership, "id" | "status"> | null;
  role: Pick<AdminRole, "id" | "code" | "name" | "scope" | "isSuperAdmin"> | null;
  permissions: AdminPermissionCode[];
}
