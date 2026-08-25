import type { ProductModerationStatus } from "@shared/schema";
import { adminProductQuerySchema } from "@shared/schema";

export type AdminProductQuery = ReturnType<typeof parseAdminProductQuery>;

export function parseAdminProductQuery(query: Record<string, unknown>) {
  const normalized = Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== "" && value !== undefined),
  );
  return adminProductQuerySchema.parse(normalized);
}

const transitions: Record<ProductModerationStatus, readonly ProductModerationStatus[]> = {
  draft: ["pending_review", "removed"],
  pending_review: ["approved", "rejected", "changes_requested", "removed"],
  approved: ["suspended", "removed"],
  rejected: ["removed"],
  changes_requested: ["pending_review", "removed"],
  suspended: ["approved", "removed"],
  removed: [],
};

export function isProductModerationTransitionAllowed(
  from: ProductModerationStatus,
  to: ProductModerationStatus,
): boolean {
  return transitions[from].includes(to);
}
