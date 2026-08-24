import type {
  AdminAuditEventSummary,
  AdminDashboardSummary,
  AdminDashboardTotals,
  AdminOrderValue,
  AdminPendingWorkItem,
  AdminPendingWorkResponse,
  AdminProviderStatus,
  AdminSystemStatus,
  AdminWidgetError,
} from "@shared/models/admin-portal";
import type { AdminPermissionCode } from "@shared/models/organisations";

export interface AdminCoreMetrics {
  totals: AdminDashboardTotals;
  orderStatusCounts: Record<string, number>;
  orderValueByCurrency: AdminOrderValue[];
}

export interface AdminPaymentAttention {
  reconciliation: number;
  refunds: number;
  disputes: number;
  payouts: number;
  recoveries: number;
}

export interface AdminPortalDataSource {
  loadCoreMetrics(): Promise<AdminCoreMetrics>;
  loadRecentActivity(limit: number): Promise<AdminAuditEventSummary[]>;
  loadProviderStatus(): Promise<AdminProviderStatus[]>;
  countVerificationPending(): Promise<number>;
  countProductReviews(): Promise<number>;
  countRegionalPending(): Promise<number>;
  loadPaymentAttention(): Promise<AdminPaymentAttention>;
}

function can(permissions: readonly AdminPermissionCode[], permission: AdminPermissionCode): boolean {
  return permissions.includes(permission);
}

function widgetError(widget: AdminWidgetError["widget"]): AdminWidgetError {
  return {
    widget,
    code: "WIDGET_UNAVAILABLE",
    message: "This section is temporarily unavailable. Other admin data is still current.",
  };
}

function providerSystemStatus(providers: AdminProviderStatus[], checkedAt: string): AdminSystemStatus {
  if (providers.length === 0) {
    return {
      id: "payments",
      label: "Payment providers",
      status: "not_configured",
      detail: "No payment provider status records are configured.",
      checkedAt,
    };
  }
  const degraded = providers.some((provider) => provider.status !== "active");
  return {
    id: "payments",
    label: "Payment providers",
    status: degraded ? "degraded" : "operational",
    detail: degraded ? "One or more providers require attention." : "All configured providers are active.",
    checkedAt,
  };
}

export function createAdminPortalService(source: AdminPortalDataSource) {
  return {
    async dashboardSummary(permissions: readonly AdminPermissionCode[]): Promise<AdminDashboardSummary> {
      const generatedAt = new Date().toISOString();
      const core = await source.loadCoreMetrics();
      const errors: AdminWidgetError[] = [];
      let recentActivity: AdminAuditEventSummary[] = [];
      let providerStatus: AdminProviderStatus[] = [];

      const optional: Array<Promise<void>> = [];
      if (can(permissions, "audit.view")) {
        optional.push(
          source.loadRecentActivity(8)
            .then((rows) => { recentActivity = rows; })
            .catch(() => { errors.push(widgetError("recentActivity")); }),
        );
      }
      if (can(permissions, "revenue.view")) {
        optional.push(
          source.loadProviderStatus()
            .then((rows) => { providerStatus = rows; })
            .catch(() => { errors.push(widgetError("providerStatus")); }),
        );
      }
      await Promise.all(optional);

      const systemStatus: AdminSystemStatus[] = [
        {
          id: "database",
          label: "Platform database",
          status: "operational",
          detail: "Live dashboard aggregates completed successfully.",
          checkedAt: generatedAt,
        },
      ];
      if (can(permissions, "audit.view")) {
        systemStatus.push({
          id: "audit",
          label: "Audit activity",
          status: errors.some((error) => error.widget === "recentActivity") ? "unavailable" : "operational",
          detail: errors.some((error) => error.widget === "recentActivity")
            ? "Recent audit activity could not be loaded."
            : "Durable admin audit storage is available.",
          checkedAt: generatedAt,
        });
      }
      if (can(permissions, "revenue.view")) {
        systemStatus.push(
          errors.some((error) => error.widget === "providerStatus")
            ? {
                id: "payments",
                label: "Payment providers",
                status: "unavailable",
                detail: "Provider status could not be loaded.",
                checkedAt: generatedAt,
              }
            : providerSystemStatus(providerStatus, generatedAt),
        );
      }

      return {
        ...core,
        recentActivity,
        providerStatus,
        systemStatus,
        errors,
        generatedAt,
      };
    },

    async pendingWork(permissions: readonly AdminPermissionCode[]): Promise<AdminPendingWorkResponse> {
      const generatedAt = new Date().toISOString();
      const items: AdminPendingWorkItem[] = [];
      const errors: AdminWidgetError[] = [];
      const tasks: Array<Promise<void>> = [];

      if (can(permissions, "products.approve")) {
        tasks.push(source.countProductReviews().then((count) => {
          items.push({
            id: "product_reviews",
            label: "Product reviews",
            description: "Seller listings awaiting a catalogue moderation decision.",
            count,
            href: "/admin/products?status=pending_review",
            permission: "products.approve",
            tone: count > 0 ? "warning" : "default",
          });
        }).catch(() => { errors.push(widgetError("products")); }));
      }

      if (can(permissions, "verification.review")) {
        tasks.push(source.countVerificationPending().then((count) => {
          items.push({
            id: "seller_verifications",
            label: "Seller verification reviews",
            description: "Submitted seller checks awaiting an operator decision.",
            count,
            href: "/admin/verifications?status=pending_review,needs_information",
            permission: "verification.review",
            tone: count > 0 ? "warning" : "default",
          });
        }).catch(() => { errors.push(widgetError("verification")); }));
      }

      if (can(permissions, "users.view")) {
        tasks.push(source.countRegionalPending().then((count) => {
          items.push({
            id: "regional_seller_requests",
            label: "Regional seller requests",
            description: "Seller-region assignments awaiting review.",
            count,
            href: "/admin/overview?section=regional#regional",
            permission: "users.view",
            tone: count > 0 ? "warning" : "default",
          });
        }).catch(() => { errors.push(widgetError("regional")); }));
      }

      if (can(permissions, "revenue.view")) {
        tasks.push(source.loadPaymentAttention().then((attention) => {
          const count = Object.values(attention).reduce((sum, value) => sum + value, 0);
          items.push({
            id: "payment_attention",
            label: "Payment operations",
            description: "Reconciliation, refund, dispute, payout, and recovery items requiring attention.",
            count,
            href: "/admin/overview?section=payments#payments",
            permission: "revenue.view",
            tone: count > 0 ? "critical" : "default",
          });
        }).catch(() => { errors.push(widgetError("payments")); }));
      }

      await Promise.all(tasks);
      const order: AdminPendingWorkItem["id"][] = ["product_reviews", "seller_verifications", "regional_seller_requests", "payment_attention"];
      items.sort((left, right) => order.indexOf(left.id) - order.indexOf(right.id));
      return { items, errors, generatedAt };
    },
  };
}
