/// <reference types="node" />
import { Client } from "pg";
import { expect, test } from "@playwright/test";
import {
  createAuthenticatedApi,
  getTestAccount,
  hasTestAccount,
} from "./helpers/authenticated-api";

const CONTROL_CENTRE_PERMISSIONS = [
  "partners.view", "partners.manage", "regions.view", "regions.manage",
  "opportunities.view", "opportunities.manage", "content.view", "content.manage",
  "orders.view", "orders.manage", "logistics.view", "logistics.manage", "settings.manage",
] as const;

test.describe("Organisation Control Centre", () => {
  test("requires a session for every new control-centre API", async ({ request }) => {
    const responses = await Promise.all([
      request.get("/api/admin/organisations"),
      request.get("/api/admin/overview"),
      request.get("/api/admin/farmers"),
      request.get("/api/admin/resources/sellers"),
      request.get("/api/admin/global-operations/map"),
      request.get("/api/admin/analytics"),
      request.get("/api/admin/revenue"),
      request.get("/api/admin/data-requests"),
    ]);
    for (const response of responses) expect(response.status()).toBe(401);
  });

  test("persists the additive settings/data tables and strict Super Admin permissions", async () => {
    test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for database verification");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      const permissions = await client.query(
        `SELECT p.code,EXISTS (
          SELECT 1 FROM admin_role_permissions rp
          WHERE rp.permission_id=p.id AND rp.role_id='role_platform_super_admin'
        ) AS mapped
        FROM admin_permissions p WHERE p.code=ANY($1::text[]) ORDER BY p.code`,
        [[...CONTROL_CENTRE_PERMISSIONS]],
      );
      expect(permissions.rows.map((row) => row.code)).toEqual([...CONTROL_CENTRE_PERMISSIONS].sort());
      expect(permissions.rows.every((row) => row.mapped === true)).toBeTruthy();

      const tables = await client.query(
        "SELECT to_regclass('public.organisation_settings') AS settings,to_regclass('public.admin_data_requests') AS requests",
      );
      expect(tables.rows[0]).toEqual({ settings: "organisation_settings", requests: "admin_data_requests" });
    } finally {
      await client.end();
    }
  });

  test("denies the global control centre to an ordinary authenticated account", async () => {
    test.skip(!hasTestAccount("BUYER"), "An ordinary buyer test account is required");
    const api = await createAuthenticatedApi(getTestAccount("BUYER"));
    try {
      for (const endpoint of [
        "/api/admin/overview",
        "/api/admin/farmers",
        "/api/admin/resources/regions",
        "/api/admin/analytics",
        "/api/admin/revenue",
      ]) {
        const response = await api.get(endpoint);
        expect(response.status(), `${endpoint} must reject an ordinary account`).toBe(403);
      }
    } finally {
      await api.dispose();
    }
  });

  test("returns live control-centre data to a bootstrapped Super Admin", async () => {
    test.skip(!hasTestAccount("ADMIN"), "A bootstrapped Super Admin test account is required");
    const api = await createAuthenticatedApi(getTestAccount("ADMIN"));
    try {
      const access = await api.get("/api/admin/access");
      expect(access.ok()).toBeTruthy();
      await expect(access.json()).resolves.toMatchObject({
        hasAccess: true,
        organisation: { id: "agriconnect-platform" },
        role: { isSuperAdmin: true },
      });

      const overview = await api.get("/api/admin/overview");
      expect(overview.ok()).toBeTruthy();
      await expect(overview.json()).resolves.toMatchObject({
        summary: { totalUsers: expect.any(Number), farmers: expect.any(Number), orders: expect.any(Number) },
        currency: "GBP",
        trends: expect.any(Array),
        recentActivity: expect.any(Array),
      });

      const farmers = await api.get("/api/admin/farmers?page=1&pageSize=5");
      expect(farmers.ok()).toBeTruthy();
      await expect(farmers.json()).resolves.toMatchObject({ items: expect.any(Array), total: expect.any(Number), page: 1, pageSize: 5 });

      for (const endpoint of [
        "/api/admin/organisations",
        "/api/admin/resources/sellers",
        "/api/admin/resources/orders",
        "/api/admin/analytics",
        "/api/admin/revenue",
        "/api/admin/data-requests",
      ]) {
        const response = await api.get(endpoint);
        expect(response.ok(), `${endpoint} should be available`).toBeTruthy();
      }
    } finally {
      await api.dispose();
    }
  });

  test("renders the live Super Admin shell and real farmer workspace", async ({ page }) => {
    test.skip(!hasTestAccount("ADMIN"), "A bootstrapped Super Admin test account is required");
    await page.request.post("/api/auth/login", { data: getTestAccount("ADMIN") });
    await page.goto("/admin/control-centre");
    await expect(page.getByRole("heading", { name: "Good morning, Super Admin" })).toBeVisible();
    await expect(page.getByText("Organisation Control Centre", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Farmers", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/control-centre\/farmers$/);
    await expect(page.getByRole("heading", { name: "Farmers Management Centre" })).toBeVisible();
    await expect(page.getByText(/Farmers list/)).toBeVisible();
  });
});
