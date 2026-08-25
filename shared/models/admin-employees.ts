import { z } from "zod";
import { ADMIN_PERMISSION_CODES } from "./organisations";

const idSchema = z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9._:-]+$/);
const reasonSchema = z.string().trim().min(5).max(500);
const passwordSchema = z.string().min(12).max(128)
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

export const employeeDirectoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).default(""),
  status: z.enum(["all", "invited", "active", "suspended", "deactivated"]).default("all"),
  roleId: z.string().trim().max(160).default("all"),
  sort: z.enum(["name", "email", "status", "role", "invitedAt", "acceptedAt", "lastLoginAt"]).default("name"),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

export const inviteEmployeeSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  roleId: idSchema,
});

export const invitationActionSchema = z.object({ reason: reasonSchema });
export const acceptEmployeeInvitationSchema = z.object({
  token: z.string().min(32).max(256),
  name: z.string().trim().min(2).max(120).optional(),
  password: passwordSchema.optional(),
});

export const employeeRoleChangeSchema = z.object({
  roleId: idSchema,
  reason: reasonSchema,
});

export const employeeOverrideSchema = z.object({
  permissionCode: z.enum(ADMIN_PERMISSION_CODES),
  effect: z.enum(["allow", "deny", "inherit"]),
  reason: reasonSchema,
});

export const employeeStatusChangeSchema = z.object({ reason: reasonSchema });
export const rolePermissionMatrixSchema = z.object({
  permissionCodes: z.array(z.enum(ADMIN_PERMISSION_CODES)).max(ADMIN_PERMISSION_CODES.length),
  reason: reasonSchema,
});

export const tokenSchema = z.object({ token: z.string().min(32).max(256) });
export const emailVerificationRequestSchema = z.object({ email: z.string().trim().email().max(320).optional() });
export const passwordResetRequestSchema = z.object({ email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()) });
export const passwordResetConfirmSchema = tokenSchema.extend({ password: passwordSchema });
export const totpCodeSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/) });
export const mfaChallengeSchema = z.object({ code: z.string().trim().min(6).max(32) });

export type EmployeeDirectoryQuery = z.infer<typeof employeeDirectoryQuerySchema>;
export type InviteEmployeeInput = z.infer<typeof inviteEmployeeSchema>;
export type EmployeeRoleChangeInput = z.infer<typeof employeeRoleChangeSchema>;
export type EmployeeOverrideInput = z.infer<typeof employeeOverrideSchema>;

export interface AdminEmployeeSummary {
  membershipId: string;
  userId: string;
  displayName: string;
  email: string;
  status: "invited" | "active" | "suspended" | "deactivated";
  role: { id: string; code: string; name: string; isSuperAdmin: boolean };
  mfaEnabled: boolean;
  invitedAt: string | null;
  acceptedAt: string | null;
  lastLoginAt: string | null;
  activeSessionCount: number;
}

export interface AdminEmployeeDetail extends AdminEmployeeSummary {
  overrides: Array<{ permissionCode: string; effect: "allow" | "deny"; reason: string | null }>;
  effectivePermissions: string[];
  activity: Array<{ id: string; action: string; outcome: string; occurredAt: string; changes: Record<string, unknown> }>;
}
