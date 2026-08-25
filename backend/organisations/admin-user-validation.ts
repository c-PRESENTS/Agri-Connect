import { z } from "zod";
import {
  adminUserAccountStatusSchema,
  adminUserVerificationFilterSchema,
  sellerEntityTypeSchema,
  sellerVerificationStatusSchema,
} from "@shared/schema";

const optionalText = (maximum: number, pattern?: RegExp) => z.preprocess(
  (value) => typeof value === "string" && value.trim() ? value.trim() : undefined,
  (pattern ? z.string().max(maximum).regex(pattern) : z.string().max(maximum)).optional(),
);

const optionalDate = z.preprocess(
  (value) => typeof value === "string" && value.trim() ? value.trim() : undefined,
  z.coerce.date().optional(),
);

const userDirectoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: optionalText(160),
  accountType: z.preprocess(
    (value) => typeof value === "string" && value.trim() ? value.trim() : undefined,
    z.enum(["buyer", "farmer", "logistics", "admin"]).optional(),
  ),
  verification: z.preprocess(
    (value) => typeof value === "string" && value.trim() ? value.trim() : undefined,
    adminUserVerificationFilterSchema.optional(),
  ),
  status: z.preprocess(
    (value) => typeof value === "string" && value.trim() ? value.trim() : undefined,
    adminUserAccountStatusSchema.optional(),
  ),
  country: optionalText(2, /^[A-Za-z]{2}$/),
  region: optionalText(120),
  registeredFrom: optionalDate,
  registeredTo: optionalDate,
  lastLoginFrom: optionalDate,
  lastLoginTo: optionalDate,
  sort: z.enum(["createdAt", "updatedAt", "lastLoginAt", "name", "email"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
}).superRefine((value, context) => {
  for (const [fromKey, toKey] of [["registeredFrom", "registeredTo"], ["lastLoginFrom", "lastLoginTo"]] as const) {
    const from = value[fromKey];
    const to = value[toKey];
    if (from && to && from > to) context.addIssue({ code: "custom", path: [fromKey], message: `${fromKey} must be before ${toKey}` });
    if (from && to && to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000) {
      context.addIssue({ code: "custom", path: [toKey], message: "Date range cannot exceed 366 days" });
    }
  }
});

const verificationQueueQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: optionalText(160),
  status: z.preprocess(
    (value) => typeof value === "string" && value.trim() ? value.split(",").filter(Boolean) : undefined,
    z.array(sellerVerificationStatusSchema).min(1).max(8).optional(),
  ),
  country: optionalText(2, /^[A-Za-z]{2}$/),
  entityType: z.preprocess(
    (value) => typeof value === "string" && value.trim() ? value.trim() : undefined,
    sellerEntityTypeSchema.optional(),
  ),
  sort: z.enum(["submittedAt", "updatedAt", "legalName"]).default("submittedAt"),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

export type AdminUserDirectoryQuery = z.infer<typeof userDirectoryQuerySchema>;
export type AdminVerificationQueueQuery = z.infer<typeof verificationQueueQuerySchema>;

const verificationTransitions: Record<string, readonly string[]> = {
  pending_review: ["verified", "needs_information", "rejected"],
  verified: ["suspended"],
  suspended: ["verified"],
};

export function isVerificationTransitionAllowed(current: string, next: string): boolean {
  return Boolean(verificationTransitions[current]?.includes(next));
}

export function parseAdminUserDirectoryQuery(query: Record<string, unknown>): AdminUserDirectoryQuery {
  const parsed = userDirectoryQuerySchema.parse(query);
  return { ...parsed, country: parsed.country?.toUpperCase() };
}

export function parseAdminVerificationQueueQuery(query: Record<string, unknown>): AdminVerificationQueueQuery {
  const parsed = verificationQueueQuerySchema.parse(query);
  return {
    ...parsed,
    country: parsed.country?.toUpperCase(),
    status: parsed.status ?? ["pending_review", "needs_information"],
  };
}
