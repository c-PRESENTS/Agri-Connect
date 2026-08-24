import type { AdminPermissionCode } from "./organisations";

export interface AdminDashboardTotals {
  users: number;
  sellers: number;
  products: number;
  availableProducts: number;
  orders: number;
  approvedOrganisations: number;
  activeEmployees: number;
}

export interface AdminOrderValue {
  currency: string;
  orderCount: number;
  totalMinor: string;
}

export interface AdminAuditActor {
  id: string | null;
  name: string;
  email: string | null;
}

export interface AdminAuditOrganisation {
  id: string | null;
  name: string;
}

export interface AdminAuditEventSummary {
  id: string;
  actor: AdminAuditActor;
  action: string;
  outcome: "success" | "denied" | "failed";
  targetType: string;
  targetId: string | null;
  organisation: AdminAuditOrganisation;
  permissionCode: string | null;
  occurredAt: string;
}

export interface AdminProviderStatus {
  provider: string;
  mode: string;
  status: string;
  webhookVerifiedAt: string | null;
  nextReviewAt: string | null;
  expiresAt: string | null;
  updatedAt: string;
}

export interface AdminSystemStatus {
  id: "database" | "audit" | "payments";
  label: string;
  status: "operational" | "degraded" | "unavailable" | "not_configured";
  detail: string;
  checkedAt: string;
}

export interface AdminWidgetError {
  widget: "recentActivity" | "providerStatus" | "verification" | "products" | "regional" | "payments";
  code: "WIDGET_UNAVAILABLE";
  message: string;
}

export interface AdminDashboardSummary {
  totals: AdminDashboardTotals;
  orderStatusCounts: Record<string, number>;
  orderValueByCurrency: AdminOrderValue[];
  recentActivity: AdminAuditEventSummary[];
  providerStatus: AdminProviderStatus[];
  systemStatus: AdminSystemStatus[];
  errors: AdminWidgetError[];
  generatedAt: string;
}

export interface AdminPendingWorkItem {
  id: "product_reviews" | "seller_verifications" | "regional_seller_requests" | "payment_attention";
  label: string;
  description: string;
  count: number;
  href: string;
  permission: AdminPermissionCode;
  tone: "default" | "warning" | "critical";
}

export interface AdminPendingWorkResponse {
  items: AdminPendingWorkItem[];
  errors: AdminWidgetError[];
  generatedAt: string;
}

export interface AdminAuditFilterMetadata {
  actors: AdminAuditActor[];
  actions: string[];
  outcomes: Array<"success" | "denied" | "failed">;
  targetTypes: string[];
  organisations: AdminAuditOrganisation[];
  applied: {
    actor: string | null;
    action: string | null;
    outcome: "success" | "denied" | "failed" | null;
    target: string | null;
    organisation: string | null;
    dateFrom: string;
    dateTo: string;
    sort: "occurredAt";
    direction: "asc" | "desc";
  };
}

export interface AdminAuditPage {
  rows: AdminAuditEventSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: AdminAuditFilterMetadata;
  generatedAt: string;
}

export interface AdminAuditEventDetail extends AdminAuditEventSummary {
  requestId: string | null;
  changedFields: string[];
  request: {
    method: string | null;
    statusCode: number | null;
  };
}

export interface AdminAuditQuery {
  page: number;
  pageSize: number;
  actor?: string;
  action?: string;
  outcome?: "success" | "denied" | "failed";
  target?: string;
  organisation?: string;
  dateFrom: Date;
  dateTo: Date;
  sort: "occurredAt";
  direction: "asc" | "desc";
}
