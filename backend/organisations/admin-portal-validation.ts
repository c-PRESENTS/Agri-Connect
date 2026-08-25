import { z } from "zod";
import type { AdminAuditQuery } from "@shared/models/admin-portal";

const optionalTrimmed = (maximum: number, pattern?: RegExp) =>
  z.preprocess(
    (value) => typeof value === "string" && value.trim() ? value.trim() : undefined,
    (pattern ? z.string().max(maximum).regex(pattern) : z.string().max(maximum)).optional(),
  );

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  actor: optionalTrimmed(160),
  action: optionalTrimmed(160, /^[A-Za-z0-9._:-]+$/),
  outcome: z.preprocess(
    (value) => typeof value === "string" && value.trim() ? value.trim() : undefined,
    z.enum(["success", "denied", "failed"]).optional(),
  ),
  target: optionalTrimmed(160),
  organisation: optionalTrimmed(160, /^[A-Za-z0-9._:-]+$/),
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
  sort: z.literal("occurredAt").default("occurredAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
}).superRefine((value, context) => {
  if (value.dateFrom > value.dateTo) {
    context.addIssue({ code: "custom", path: ["dateFrom"], message: "dateFrom must be before dateTo" });
  }
  const rangeMs = value.dateTo.getTime() - value.dateFrom.getTime();
  if (rangeMs > 180 * 24 * 60 * 60 * 1000) {
    context.addIssue({ code: "custom", path: ["dateTo"], message: "Audit date range cannot exceed 180 days" });
  }
});

export function parseAdminAuditQuery(query: Record<string, unknown>): AdminAuditQuery {
  const dateTo = query.dateTo ?? new Date();
  const parsedDateTo = z.coerce.date().parse(dateTo);
  const dateFrom = query.dateFrom ?? new Date(parsedDateTo.getTime() - 90 * 24 * 60 * 60 * 1000);
  return auditQuerySchema.parse({ ...query, dateFrom, dateTo: parsedDateTo });
}
