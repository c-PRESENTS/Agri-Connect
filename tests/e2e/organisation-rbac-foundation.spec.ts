/// <reference types="node" />
import { Client } from "pg";
import { expect, test } from "@playwright/test";
import {
  createAuthenticatedApi,
  getTestAccount,
  hasTestAccount,
} from "./helpers/authenticated-api";

const EXPECTED_PERMISSION_CODES = [
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
] as const;

const EXPECTED_PLATFORM_ROLE_CODES = [
  "super_admin",
  "admin",
  "manager",
  "moderator",
  "customer_support",
  "finance",
  "operations",
  "data_analyst",
  "marketing",
  "viewer",
] as const;

const EXPECTED_SAFETY_TRIGGERS = [
  "organisation_memberships_last_super_admin_guard",
  "organisation_memberships_role_scope_guard",
  "organisation_invitations_role_scope_guard",
  "admin_roles_system_identity_guard",
  "organisations_platform_identity_guard",
] as const;

const allowDatabaseGuardTests = process.env.ORG_E2E_ALLOW_DB_GUARD_TESTS === "true";

async function expectCheckViolation(
  client: Client,
  savepoint: string,
  operation: () => Promise<unknown>,
): Promise<void> {
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    await operation();
    throw new Error(`Expected ${savepoint} to be rejected by a database guard`);
  } catch (error) {
    expect((error as { code?: string }).code).toBe("23514");
  } finally {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
  }
}

test.describe("organisation RBAC foundation", () => {
  test("requires an authenticated session for every foundation endpoint", async ({ request }) => {
    const responses = await Promise.all([
      request.get("/api/admin/access"),
      request.get("/api/admin/organisations/current"),
      request.get("/api/admin/roles"),
      request.get("/api/admin/permissions"),
    ]);

    for (const response of responses) expect(response.status()).toBe(401);
  });

  test("returns no admin authority and denies a protected endpoint for an ordinary user", async () => {
    test.skip(!hasTestAccount("BUYER"), "An ordinary buyer test account is required");
    const buyerApi = await createAuthenticatedApi(getTestAccount("BUYER"));
    try {
      const accessResponse = await buyerApi.get("/api/admin/access");
      expect(accessResponse.ok()).toBeTruthy();
      await expect(accessResponse.json()).resolves.toEqual({
        hasAccess: false,
        organisation: null,
        membership: null,
        role: null,
        permissions: [],
      });

      const protectedResponse = await buyerApi.get("/api/admin/organisations/current");
      expect(protectedResponse.status()).toBe(403);
      await expect(protectedResponse.json()).resolves.toMatchObject({
        code: "ADMIN_PERMISSION_REQUIRED",
        permission: "dashboard.view",
      });

      const elevationResponse = await buyerApi.patch("/api/auth/profile", {
        data: { role: "admin" },
      });
      expect(elevationResponse.status()).toBe(403);
      await expect(elevationResponse.json()).resolves.toMatchObject({
        code: "ADMIN_SELF_ASSIGNMENT_FORBIDDEN",
      });

      const profileResponse = await buyerApi.get("/api/auth/me");
      expect(profileResponse.ok()).toBeTruthy();
      const profile = await profileResponse.json() as { role: string };
      expect(profile.role).not.toBe("admin");
    } finally {
      await buyerApi.dispose();
    }
  });

  test("returns platform membership, role, and complete permissions for a Super Admin", async () => {
    test.skip(!hasTestAccount("ADMIN"), "A bootstrapped Super Admin test account is required");
    const adminApi = await createAuthenticatedApi(getTestAccount("ADMIN"));
    try {
      const accessResponse = await adminApi.get("/api/admin/access");
      expect(accessResponse.ok()).toBeTruthy();
      const access = await accessResponse.json() as {
        hasAccess: boolean;
        organisation: { id: string; type: string; status: string } | null;
        membership: { status: string } | null;
        role: { code: string; isSuperAdmin: boolean } | null;
        permissions: string[];
      };
      expect(access).toMatchObject({
        hasAccess: true,
        organisation: { id: "agriconnect-platform", type: "platform", status: "approved" },
        membership: { status: "active" },
        role: { code: "super_admin", isSuperAdmin: true },
      });
      expect(new Set(access.permissions)).toEqual(new Set(EXPECTED_PERMISSION_CODES));

      expect((await adminApi.get("/api/admin/organisations/current")).ok()).toBeTruthy();
      const rolesResponse = await adminApi.get("/api/admin/roles");
      expect(rolesResponse.ok()).toBeTruthy();
      const roles = (await rolesResponse.json()) as { roles: Array<{ code: string }> };
      expect(roles.roles.map((role) => role.code).sort()).toEqual([...EXPECTED_PLATFORM_ROLE_CODES].sort());

      const permissionsResponse = await adminApi.get("/api/admin/permissions");
      expect(permissionsResponse.ok()).toBeTruthy();
      const permissions = (await permissionsResponse.json()) as { permissions: Array<{ code: string }> };
      expect(permissions.permissions.map((permission) => permission.code).sort()).toEqual([...EXPECTED_PERMISSION_CODES].sort());
    } finally {
      await adminApi.dispose();
    }
  });

  test("redirects an unauthenticated operator visitor to login", async ({ page }) => {
    await page.goto("/operator");
    await expect(page).toHaveURL(/\/login\?returnTo=%2Foperator/);
  });

  test("renders forbidden, loading, and authorised operator states", async ({ page }) => {
    test.skip(
      !hasTestAccount("BUYER") || !hasTestAccount("ADMIN"),
      "Buyer and bootstrapped Super Admin accounts are required for UI access checks",
    );

    await page.request.post("/api/auth/login", { data: getTestAccount("BUYER") });
    await page.goto("/operator");
    await expect(page.getByTestId("admin-forbidden-state")).toBeVisible();

    await page.request.post("/api/auth/logout", { data: {} });
    await page.request.post("/api/auth/login", { data: getTestAccount("ADMIN") });
    await page.route("**/api/admin/access", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.continue();
    });
    await page.goto("/operator");
    await expect(page.getByTestId("loading-admin-access")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/overview$/);
    await expect(page.getByRole("heading", { name: "Organisation overview" })).toBeVisible();
  });

  test("seeds the canonical catalogue, mappings, platform organisation, and safety triggers", async () => {
    test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for database foundation verification");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      const platform = await client.query(
        "SELECT id,type,status FROM organisations WHERE id='agriconnect-platform'",
      );
      expect(platform.rows[0]).toEqual({
        id: "agriconnect-platform",
        type: "platform",
        status: "approved",
      });

      const permissions = await client.query("SELECT code FROM admin_permissions ORDER BY code");
      expect(permissions.rows.map((row) => row.code)).toEqual([...EXPECTED_PERMISSION_CODES].sort());

      const roles = await client.query(
        "SELECT code FROM admin_roles WHERE organisation_id='agriconnect-platform' AND scope='platform' ORDER BY code",
      );
      expect(roles.rows.map((row) => row.code)).toEqual([...EXPECTED_PLATFORM_ROLE_CODES].sort());

      const superAdminMappings = await client.query(
        `SELECT count(*)::integer AS count
           FROM admin_role_permissions mapping
           JOIN admin_permissions permission ON permission.id=mapping.permission_id
          WHERE mapping.role_id='role_platform_super_admin'`,
      );
      expect(superAdminMappings.rows[0].count).toBe(EXPECTED_PERMISSION_CODES.length);

      const triggers = await client.query(
        `SELECT trigger_name
           FROM information_schema.triggers
          WHERE event_object_schema=current_schema()
            AND trigger_name=ANY($1::text[])
          GROUP BY trigger_name
          ORDER BY trigger_name`,
        [[...EXPECTED_SAFETY_TRIGGERS]],
      );
      expect(triggers.rows.map((row) => row.trigger_name)).toEqual([...EXPECTED_SAFETY_TRIGGERS].sort());
    } finally {
      await client.end();
    }
  });

  test("has at least one active platform Super Admin", async () => {
    test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for database foundation verification");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      const activeSuperAdmins = await client.query(
        `SELECT count(*)::integer AS count
           FROM organisation_memberships membership
           JOIN admin_roles role ON role.id=membership.role_id
          WHERE membership.organisation_id='agriconnect-platform'
            AND membership.status='active'
            AND role.is_super_admin=true`,
      );
      expect(activeSuperAdmins.rows[0].count).toBeGreaterThan(0);
    } finally {
      await client.end();
    }
  });

  test("enforces all five migration safety guards", async () => {
    test.skip(
      !allowDatabaseGuardTests || !process.env.DATABASE_URL,
      "Set ORG_E2E_ALLOW_DB_GUARD_TESTS=true only against a disposable test database",
    );
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query("BEGIN");
    try {
      const user = await client.query("SELECT id FROM users ORDER BY created_at NULLS LAST LIMIT 1");
      expect(user.rows[0]?.id).toBeTruthy();
      const userId = String(user.rows[0].id);

      await expectCheckViolation(client, "protect_platform", () => client.query(
        "UPDATE organisations SET status='suspended' WHERE id='agriconnect-platform'",
      ));
      await expectCheckViolation(client, "protect_system_role", () => client.query(
        "UPDATE admin_roles SET code='changed' WHERE id='role_platform_admin'",
      ));

      const externalOrganisation = await client.query(
        `INSERT INTO organisations (type,name,slug,status)
         VALUES ('external','RBAC Guard Test','rbac-guard-test-' || gen_random_uuid(),'approved')
         RETURNING id`,
      );
      const organisationId = String(externalOrganisation.rows[0].id);

      await expectCheckViolation(client, "membership_scope", () => client.query(
        `INSERT INTO organisation_memberships (organisation_id,user_id,role_id,status)
         VALUES ($1,$2,'role_platform_viewer','active')`,
        [organisationId, userId],
      ));
      await expectCheckViolation(client, "invitation_scope", () => client.query(
        `INSERT INTO organisation_invitations (organisation_id,email,role_id,token_hash,expires_at)
         VALUES ($1,'guard-test@example.invalid','role_platform_viewer',$2,now()+interval '1 hour')`,
        [organisationId, "a".repeat(64)],
      ));

      const superAdmins = await client.query(
        `SELECT membership.id
           FROM organisation_memberships membership
           JOIN admin_roles role ON role.id=membership.role_id
          WHERE membership.organisation_id='agriconnect-platform'
            AND membership.status='active'
            AND role.is_super_admin=true
          ORDER BY membership.id
          FOR UPDATE OF membership`,
      );
      let lastSuperAdminId: string;
      if (superAdmins.rows.length === 0) {
        const temporarySuperAdmin = await client.query(
          `WITH test_user AS (
             INSERT INTO users (email,auth_method,role)
             VALUES ('organisation-guard-' || gen_random_uuid() || '@example.invalid','otp','buyer')
             RETURNING id
           )
           INSERT INTO organisation_memberships (organisation_id,user_id,role_id,status,accepted_at)
           SELECT 'agriconnect-platform',id,'role_platform_super_admin','active',now()
           FROM test_user
           RETURNING id`,
        );
        lastSuperAdminId = String(temporarySuperAdmin.rows[0].id);
      } else {
        lastSuperAdminId = String(superAdmins.rows[superAdmins.rows.length - 1].id);
      }
      for (const row of superAdmins.rows.slice(0, -1)) {
        await client.query(
          "UPDATE organisation_memberships SET status='deactivated' WHERE id=$1",
          [row.id],
        );
      }
      await expectCheckViolation(client, "last_super_admin", () => client.query(
        "UPDATE organisation_memberships SET status='deactivated' WHERE id=$1",
        [lastSuperAdminId],
      ));
    } finally {
      await client.query("ROLLBACK");
      await client.end();
    }
  });
});
