/// <reference types="node" />
import { expect, test } from "@playwright/test";
import type { AdminPortalDataSource } from "../../backend/organisations/admin-portal-service";
import { createAdminPortalService } from "../../backend/organisations/admin-portal-service";
import { parseAdminAuditQuery } from "../../backend/organisations/admin-portal-validation";
import { visibleAdminNavigation } from "../../frontend/src/lib/admin-navigation";
import { createAuthenticatedApi, getTestAccount, hasTestAccount } from "./helpers/authenticated-api";

function fixtureSource(overrides: Partial<AdminPortalDataSource> = {}): AdminPortalDataSource {
  return {
    loadCoreMetrics: async () => ({
      totals: {
        users: 12,
        sellers: 4,
        products: 21,
        availableProducts: 18,
        orders: 7,
        approvedOrganisations: 2,
        activeEmployees: 3,
      },
      orderStatusCounts: { pending: 2, delivered: 5 },
      orderValueByCurrency: [{ currency: "GBP", orderCount: 7, totalMinor: "12500" }],
    }),
    loadRecentActivity: async () => [{
      id: "audit-1",
      actor: { id: "user-1", name: "Admin User", email: "admin@example.invalid" },
      action: "admin.route_accessed",
      outcome: "success",
      targetType: "route",
      targetId: "/api/admin/dashboard/summary",
      organisation: { id: "agriconnect-platform", name: "AgriConnect Platform" },
      permissionCode: "dashboard.view",
      occurredAt: "2026-08-23T00:00:00.000Z",
    }],
    loadProviderStatus: async () => [{
      provider: "stripe",
      mode: "test",
      status: "active",
      webhookVerifiedAt: null,
      nextReviewAt: null,
      expiresAt: null,
      updatedAt: "2026-08-23T00:00:00.000Z",
    }],
    countVerificationPending: async () => 2,
    countProductReviews: async () => 3,
    countRegionalPending: async () => 3,
    loadPaymentAttention: async () => ({ reconciliation: 1, refunds: 2, disputes: 3, payouts: 4, recoveries: 5 }),
    ...overrides,
  };
}

test.describe("organisation admin portal Phase 2", () => {
  test("reconciles dashboard and pending-work fixtures without granting hidden widgets", async () => {
    const service = createAdminPortalService(fixtureSource());
    const summary = await service.dashboardSummary(["dashboard.view", "audit.view", "revenue.view"]);
    expect(summary.totals).toMatchObject({ users: 12, products: 21, orders: 7 });
    expect(summary.recentActivity).toHaveLength(1);
    expect(summary.providerStatus).toHaveLength(1);
    expect(summary.errors).toEqual([]);

    const pending = await service.pendingWork([
      "dashboard.view",
      "verification.review",
      "users.view",
      "revenue.view",
    ]);
    expect(pending.items.map((item) => [item.id, item.count])).toEqual([
      ["seller_verifications", 2],
      ["regional_seller_requests", 3],
      ["payment_attention", 15],
    ]);

    const dashboardOnly = await service.dashboardSummary(["dashboard.view"]);
    expect(dashboardOnly.recentActivity).toEqual([]);
    expect(dashboardOnly.providerStatus).toEqual([]);
    expect(dashboardOnly.systemStatus.map((item) => item.id)).toEqual(["database"]);

    expect(visibleAdminNavigation(["dashboard.view"]).map((item) => item.path)).toEqual(["/admin/overview"]);
    expect(visibleAdminNavigation(["dashboard.view", "audit.view"]).map((item) => item.path)).toEqual([
      "/admin/overview",
      "/admin/audit",
    ]);
  });

  test("keeps the core dashboard available when an optional widget fails", async () => {
    const service = createAdminPortalService(fixtureSource({
      loadProviderStatus: async () => { throw new Error("provider unavailable"); },
    }));
    const summary = await service.dashboardSummary(["dashboard.view", "audit.view", "revenue.view"]);
    expect(summary.totals.users).toBe(12);
    expect(summary.recentActivity).toHaveLength(1);
    expect(summary.providerStatus).toEqual([]);
    expect(summary.errors).toEqual([expect.objectContaining({ widget: "providerStatus", code: "WIDGET_UNAVAILABLE" })]);
    expect(summary.systemStatus).toContainEqual(expect.objectContaining({ id: "payments", status: "unavailable" }));
  });

  test("normalises and bounds audit filters", () => {
    const parsed = parseAdminAuditQuery({
      page: "2",
      pageSize: "50",
      outcome: "denied",
      action: "admin.permission_denied",
      dateFrom: "2026-07-01T00:00:00.000Z",
      dateTo: "2026-08-01T00:00:00.000Z",
      direction: "asc",
    });
    expect(parsed).toMatchObject({ page: 2, pageSize: 50, outcome: "denied", direction: "asc" });
    expect(() => parseAdminAuditQuery({ pageSize: "51" })).toThrow();
    expect(() => parseAdminAuditQuery({ outcome: "unknown" })).toThrow();
    expect(() => parseAdminAuditQuery({
      dateFrom: "2025-01-01T00:00:00.000Z",
      dateTo: "2026-01-01T00:00:00.000Z",
    })).toThrow();
  });

  test("loads live dashboard and safe audit data from the existing database", async () => {
    test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for live Phase 2 repository verification");
    const { adminPortalDataSource, getAdminAuditEvent, listAdminAuditEvents } = await import(
      "../../backend/organisations/admin-portal-repository"
    );
    const service = createAdminPortalService(adminPortalDataSource);
    const summary = await service.dashboardSummary([
      "dashboard.view",
      "audit.view",
      "revenue.view",
    ]);
    expect(summary.totals.users).toBeGreaterThanOrEqual(0);
    expect(summary.totals.products).toBeGreaterThanOrEqual(summary.totals.availableProducts);
    expect(summary.totals.orders).toBeGreaterThanOrEqual(0);
    expect(summary.generatedAt).toEqual(expect.any(String));

    const audit = await listAdminAuditEvents(parseAdminAuditQuery({ page: "1", pageSize: "5" }));
    expect(audit.pagination).toMatchObject({ page: 1, pageSize: 5, total: expect.any(Number) });
    expect(audit.filters.applied.sort).toBe("occurredAt");
    for (const event of audit.rows) {
      expect(event).not.toHaveProperty("ipHash");
      expect(event).not.toHaveProperty("deviceHash");
      expect(event).not.toHaveProperty("changes");
      expect(event).not.toHaveProperty("metadata");
    }
    if (audit.rows[0]) {
      const detail = await getAdminAuditEvent(audit.rows[0].id);
      expect(detail).toBeTruthy();
      expect(detail).not.toHaveProperty("ipHash");
      expect(detail).not.toHaveProperty("deviceHash");
      expect(detail).not.toHaveProperty("changes");
      expect(detail).not.toHaveProperty("metadata");
    }
  });

  test("requires authentication for every Phase 2 API and admin route", async ({ page, request }) => {
    const responses = await Promise.all([
      request.get("/api/admin/dashboard/summary"),
      request.get("/api/admin/dashboard/pending-work"),
      request.get("/api/admin/audit-events"),
      request.get("/api/admin/audit-events/00000000-0000-4000-8000-000000000000"),
    ]);
    for (const response of responses) expect(response.status()).toBe(401);
    await page.goto("/admin/overview");
    await expect(page).toHaveURL(/\/admin\/sign-in\?returnTo=%2Fadmin%2Foverview/);
  });

  test("denies Phase 2 APIs and renders a real forbidden page for an ordinary user", async ({ page }) => {
    test.skip(!hasTestAccount("BUYER"), "An ordinary buyer test account is required");
    const buyerApi = await createAuthenticatedApi(getTestAccount("BUYER"));
    try {
      expect((await buyerApi.get("/api/admin/dashboard/summary")).status()).toBe(403);
      expect((await buyerApi.get("/api/admin/dashboard/pending-work")).status()).toBe(403);
      expect((await buyerApi.get("/api/admin/audit-events")).status()).toBe(403);
    } finally {
      await buyerApi.dispose();
    }

    await page.request.post("/api/auth/login", { data: getTestAccount("BUYER") });
    await page.goto("/admin/overview");
    await expect(page.getByTestId("admin-forbidden-state")).toBeVisible();
    await page.goto("/");
    await page.getByTestId("button-user-menu").click();
    await expect(page.getByTestId("menu-item-admin-portal")).toHaveCount(0);
  });

  test("returns live dashboard and safe paginated audit contracts for a Super Admin", async () => {
    test.skip(!hasTestAccount("ADMIN"), "A bootstrapped Super Admin test account is required");
    const adminApi = await createAuthenticatedApi(getTestAccount("ADMIN"));
    try {
      const summaryResponse = await adminApi.get("/api/admin/dashboard/summary");
      expect(summaryResponse.ok()).toBeTruthy();
      const summary = await summaryResponse.json();
      expect(summary).toMatchObject({
        totals: expect.objectContaining({ users: expect.any(Number), products: expect.any(Number), orders: expect.any(Number) }),
        generatedAt: expect.any(String),
        errors: expect.any(Array),
      });

      const pendingResponse = await adminApi.get("/api/admin/dashboard/pending-work");
      expect(pendingResponse.ok()).toBeTruthy();
      expect(await pendingResponse.json()).toMatchObject({ items: expect.any(Array), generatedAt: expect.any(String) });

      const auditResponse = await adminApi.get("/api/admin/audit-events?page=1&pageSize=1&outcome=success&direction=desc");
      expect(auditResponse.ok()).toBeTruthy();
      const audit = await auditResponse.json();
      expect(audit).toMatchObject({
        rows: expect.any(Array),
        pagination: { page: 1, pageSize: 1, total: expect.any(Number), totalPages: expect.any(Number) },
        filters: { applied: expect.objectContaining({ outcome: "success", direction: "desc" }) },
        generatedAt: expect.any(String),
      });
      if (audit.rows[0]) {
        expect(audit.rows[0]).not.toHaveProperty("ipHash");
        expect(audit.rows[0]).not.toHaveProperty("deviceHash");
        expect(audit.rows[0]).not.toHaveProperty("changes");
        expect(audit.rows[0]).not.toHaveProperty("metadata");
        const detailResponse = await adminApi.get(`/api/admin/audit-events/${audit.rows[0].id}`);
        expect(detailResponse.ok()).toBeTruthy();
        const detail = await detailResponse.json();
        expect(detail.event).not.toHaveProperty("ipHash");
        expect(detail.event).not.toHaveProperty("deviceHash");
        expect(detail.event).not.toHaveProperty("changes");
        expect(detail.event).not.toHaveProperty("metadata");
      }

      const invalid = await adminApi.get("/api/admin/audit-events?pageSize=1000");
      expect(invalid.status()).toBe(400);
      await expect(invalid.json()).resolves.toMatchObject({ code: "ADMIN_INVALID_FILTER" });
    } finally {
      await adminApi.dispose();
    }
  });

  test("keeps operator compatibility and provides desktop and tablet admin navigation", async ({ page }) => {
    test.skip(!hasTestAccount("ADMIN"), "A bootstrapped Super Admin test account is required");
    await page.request.post("/api/auth/login", { data: getTestAccount("ADMIN") });
    await page.goto("/operator");
    await expect(page).toHaveURL(/\/admin\/overview$/);
    await expect(page.getByRole("heading", { name: "Organisation overview" })).toBeVisible();
    await expect(page.getByTestId("admin-nav-overview")).toBeVisible();
    await expect(page.getByTestId("admin-nav-audit-logs")).toBeVisible();

    await page.setViewportSize({ width: 700, height: 900 });
    await page.reload();
    await page.getByTestId("admin-sidebar-trigger").click();
    await expect(page.getByTestId("admin-nav-overview")).toBeVisible();
  });
});
