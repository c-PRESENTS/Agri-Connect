/// <reference types="node" />
import { randomUUID } from "crypto";
import { expect, test } from "@playwright/test";
import { visibleAdminNavigation } from "../../frontend/src/lib/admin-navigation";
import { isVerificationTransitionAllowed, parseAdminUserDirectoryQuery, parseAdminVerificationQueueQuery } from "../../backend/organisations/admin-user-validation";
import { createAuthenticatedApi, getTestAccount, hasTestAccount } from "./helpers/authenticated-api";

test.describe("organisation admin portal Phase 3", () => {
  test("allowlists and bounds user and verification queue filters", () => {
    expect(parseAdminUserDirectoryQuery({ page: "2", pageSize: "50", accountType: "farmer", status: "active", country: "gb", sort: "lastLoginAt", direction: "asc" })).toMatchObject({ page: 2, pageSize: 50, accountType: "farmer", country: "GB", sort: "lastLoginAt", direction: "asc" });
    expect(() => parseAdminUserDirectoryQuery({ pageSize: "51" })).toThrow();
    expect(() => parseAdminUserDirectoryQuery({ sort: "passwordHash" })).toThrow();
    expect(() => parseAdminUserDirectoryQuery({ registeredFrom: "2024-01-01", registeredTo: "2026-01-10" })).toThrow();
    expect(parseAdminVerificationQueueQuery({ status: "pending_review,needs_information", country: "in", entityType: "company" })).toMatchObject({ status: ["pending_review", "needs_information"], country: "IN", entityType: "company" });
    expect(() => parseAdminVerificationQueueQuery({ status: "approved" })).toThrow();
  });

  test("enforces the verification state machine and permission-aware navigation", () => {
    expect(isVerificationTransitionAllowed("pending_review", "verified")).toBe(true);
    expect(isVerificationTransitionAllowed("pending_review", "needs_information")).toBe(true);
    expect(isVerificationTransitionAllowed("verified", "suspended")).toBe(true);
    expect(isVerificationTransitionAllowed("suspended", "verified")).toBe(true);
    expect(isVerificationTransitionAllowed("verified", "rejected")).toBe(false);
    expect(isVerificationTransitionAllowed("not_started", "verified")).toBe(false);
    expect(visibleAdminNavigation(["users.view"]).map((item) => item.path)).toEqual(["/admin/users"]);
    expect(visibleAdminNavigation(["verification.view"]).map((item) => item.path)).toEqual(["/admin/verifications"]);
    expect(visibleAdminNavigation(["users.view", "verification.view", "audit.view"]).map((item) => item.path)).toEqual(["/admin/users", "/admin/verifications", "/admin/audit"]);
  });

  test("requires authentication for every Phase 3 API and UI route", async ({ page, request }) => {
    const id = randomUUID();
    const responses = await Promise.all([
      request.get("/api/admin/users"),
      request.get(`/api/admin/users/${id}`),
      request.post(`/api/admin/users/${id}/verify`, { data: {} }),
      request.post(`/api/admin/users/${id}/suspend`, { data: {} }),
      request.post(`/api/admin/users/${id}/reactivate`, { data: {} }),
      request.post(`/api/admin/users/${id}/notes`, { data: {} }),
      request.get("/api/admin/verifications"),
      request.get(`/api/admin/verifications/${id}`),
      request.post(`/api/admin/verifications/${id}/review`, { data: {} }),
      request.get(`/api/admin/verification-documents/${id}`),
    ]);
    for (const response of responses) expect(response.status()).toBe(401);
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin\/sign-in\?returnTo=%2Fadmin%2Fusers/);
    await page.goto("/admin/verifications");
    await expect(page).toHaveURL(/\/admin\/sign-in\?returnTo=%2Fadmin%2Fverifications/);
  });

  test("denies Phase 3 APIs and hides navigation for an ordinary user", async ({ page }) => {
    test.skip(!hasTestAccount("BUYER"), "An ordinary buyer test account is required");
    const buyerApi = await createAuthenticatedApi(getTestAccount("BUYER"));
    try {
      expect((await buyerApi.get("/api/admin/users")).status()).toBe(403);
      expect((await buyerApi.get("/api/admin/verifications")).status()).toBe(403);
    } finally {
      await buyerApi.dispose();
    }
    await page.request.post("/api/auth/login", { data: getTestAccount("BUYER") });
    await page.goto("/admin/users");
    await expect(page.getByTestId("admin-forbidden-state")).toBeVisible();
    await page.goto("/");
    await page.getByTestId("button-user-menu").click();
    await expect(page.getByTestId("menu-item-admin-portal")).toHaveCount(0);
  });

  test("reviews evidence transactionally and makes account suspension recoverable", async () => {
    test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for live Phase 3 transaction verification");
    const [{ pool }, services, repository, capabilities] = await Promise.all([
      import("../../backend/config/db"),
      import("../../backend/organisations/admin-user-service"),
      import("../../backend/organisations/admin-user-repository"),
      import("../../backend/seller-verification/capabilities"),
    ]);
    const actorId = randomUUID();
    const sellerId = randomUUID();
    const caseId = randomUUID();
    const regionId = randomUUID();
    const documentIds = [randomUUID(), randomUUID(), randomUUID()];
    const access = { hasAccess: true, organisation: null, membership: null, role: null, permissions: ["users.view", "users.edit", "users.suspend", "verification.view", "verification.review", "verification.approve"] as any };
    try {
      await pool.query("INSERT INTO market_regions (id,code,name,country_code,type,data_version,active) VALUES ($1,$2,'Phase 3 Test Region','US','county','phase-3-test',true)", [regionId, `PHASE-3-${regionId}`]);
      await pool.query("INSERT INTO users (id,email,auth_method,role,name,profile_complete,account_status) VALUES ($1,$2,'password','buyer','Phase 3 Reviewer',true,'active'),($3,$4,'password','farmer','Phase 3 Seller',true,'active')", [actorId, `${actorId}@example.invalid`, sellerId, `${sellerId}@example.invalid`]);
      await pool.query("INSERT INTO seller_business_profiles (seller_id,country,entity_type,legal_name,registration_number,registered_address,operating_address,primary_activities,contact_email,contact_phone) VALUES ($1,'US','individual','Phase 3 Farm','SECRET-REG-1234','{}','{}','[]',$2,'+10000000000')", [sellerId, `${sellerId}@example.invalid`]);
      await pool.query("INSERT INTO seller_verification_cases (id,seller_id,status,country,entity_type,requirements_version,submitted_at) VALUES ($1,$2,'pending_review','US','individual','phase-3-test',now())", [caseId, sellerId]);
      await pool.query("INSERT INTO seller_associated_persons (seller_id,full_name,role,country) VALUES ($1,'Test Representative','representative','US')", [sellerId]);
      for (const [index, requirementCode] of ["representative_identity", "address_evidence", "bank_account_proof"].entries()) {
        await pool.query("INSERT INTO seller_verification_documents (id,seller_id,case_id,requirement_code,document_type,issuing_country,original_file_name,content_type,size_bytes,status,uploaded_at) VALUES ($1,$2,$3,$4,'government_letter','US',$5,'application/pdf',128,'pending_review',now())", [documentIds[index], sellerId, caseId, requirementCode, `${requirementCode}.pdf`]);
      }
      await pool.query("INSERT INTO seller_region_assignments (seller_id,organisation_id,region_id,status,can_publish,can_fulfil,approved_at,effective_at,reason) VALUES ($1,'agriconnect-platform',$2,'active',true,true,now(),now(),'Phase 3 transaction test')", [sellerId, regionId]);
      const directory = await repository.listAdminUsers(parseAdminUserDirectoryQuery({ search: "Phase 3 Seller", accountType: "farmer", status: "active", page: "1", pageSize: "1", sort: "name", direction: "asc" }));
      expect(directory).toMatchObject({ users: [expect.objectContaining({ id: sellerId, accountStatus: "active", verificationStatus: "pending_review" })], pagination: { page: 1, pageSize: 1, total: 1, pageCount: 1 } });
      const queue = await repository.listAdminVerifications(parseAdminVerificationQueueQuery({ search: "Phase 3 Farm", status: "pending_review", page: "1", pageSize: "1" }));
      expect(queue).toMatchObject({ cases: [expect.objectContaining({ id: caseId, sellerId })], pagination: { total: 1 } });
      expect(await capabilities.marketplaceSellerVerified(sellerId)).toBe(false);
      const before = await pool.query("SELECT updated_at FROM seller_verification_cases WHERE id=$1", [caseId]);
      const expectedUpdatedAt = new Date(before.rows[0].updated_at).toISOString();
      await expect(services.reviewAdminVerification(caseId, { userId: actorId, access }, {
        decision: "verified",
        reason: "Approval must fail until mandatory evidence is explicitly reviewed.",
        expectedUpdatedAt,
        documentDecisions: [],
      })).rejects.toMatchObject({ status: 422, code: "ADMIN_VERIFICATION_INCOMPLETE" });
      await services.reviewAdminVerification(caseId, { userId: actorId, access, requestId: "phase-3-test" }, {
        decision: "verified",
        reason: "All mandatory evidence was reviewed in the Phase 3 transaction test.",
        expectedUpdatedAt,
        documentDecisions: documentIds.map((documentId) => ({ documentId, status: "verified" as const })),
      });
      await expect(services.reviewAdminVerification(caseId, { userId: actorId, access }, {
        decision: "suspended",
        reason: "A stale reviewer must refresh before changing this case.",
        expectedUpdatedAt,
        documentDecisions: [],
      })).rejects.toMatchObject({ status: 409, code: "ADMIN_STALE_UPDATE" });
      expect(await capabilities.marketplaceSellerVerified(sellerId)).toBe(true);
      const verification = await repository.getAdminVerificationDetail(caseId);
      expect(verification).toMatchObject({ case: { status: "verified" }, seller: { isPubliclyVerified: true, isRegionallyEligible: true }, business: { registrationNumberMasked: expect.stringContaining("1234") } });
      expect(JSON.stringify(verification)).not.toContain("SECRET-REG-1234");
      expect(JSON.stringify(verification)).not.toContain("storageKey");
      expect(JSON.stringify(verification)).not.toContain("encryptedValue");

      await services.addAdminUserNote(sellerId, { userId: actorId, access }, { classification: "compliance", text: "Phase 3 transaction note" });
      let user = await pool.query("SELECT updated_at FROM users WHERE id=$1", [sellerId]);
      await services.changeAdminUserStatus(sellerId, { userId: actorId, access }, { status: "suspended", reason: "Phase 3 reversible suspension test", expectedUpdatedAt: new Date(user.rows[0].updated_at).toISOString() });
      expect(await capabilities.marketplaceSellerVerified(sellerId)).toBe(false);
      user = await pool.query("SELECT updated_at FROM users WHERE id=$1", [sellerId]);
      await services.changeAdminUserStatus(sellerId, { userId: actorId, access }, { status: "active", reason: "Phase 3 reversible reactivation test", expectedUpdatedAt: new Date(user.rows[0].updated_at).toISOString() });
      expect(await capabilities.marketplaceSellerVerified(sellerId)).toBe(true);
      const detail = await repository.getAdminUserDetail(sellerId);
      expect(detail?.notes).toContainEqual(expect.objectContaining({ classification: "compliance", text: "Phase 3 transaction note" }));
      expect(detail?.loginHistory).toEqual([]);
      const audit = await pool.query("SELECT action FROM admin_audit_events WHERE target_id=ANY($1::varchar[])", [[sellerId, caseId]]);
      expect(audit.rows.map((row: { action: string }) => row.action)).toEqual(expect.arrayContaining(["admin.verification_reviewed", "admin.user_note_added", "admin.user_suspended", "admin.user_reactivated"]));
    } finally {
      await pool.query("DELETE FROM admin_audit_events WHERE target_id=ANY($1::varchar[])", [[sellerId, caseId]]).catch(() => undefined);
      await pool.query("DELETE FROM users WHERE id=ANY($1::varchar[])", [[sellerId, actorId]]).catch(() => undefined);
      await pool.query("DELETE FROM market_regions WHERE id=$1", [regionId]).catch(() => undefined);
    }
  });

  test("serves safe Phase 3 contracts and responsive routes to a Super Admin", async ({ page }) => {
    test.skip(!hasTestAccount("ADMIN"), "A bootstrapped Super Admin test account is required");
    const adminApi = await createAuthenticatedApi(getTestAccount("ADMIN"));
    try {
      const users = await adminApi.get("/api/admin/users?page=1&pageSize=5&sort=createdAt&direction=desc");
      expect(users.ok()).toBeTruthy();
      const directory = await users.json();
      expect(directory).toMatchObject({ users: expect.any(Array), pagination: { page: 1, pageSize: 5, total: expect.any(Number), pageCount: expect.any(Number) }, generatedAt: expect.any(String) });
      expect(JSON.stringify(directory)).not.toContain("passwordHash");
      const queue = await adminApi.get("/api/admin/verifications?page=1&pageSize=5&status=pending_review,needs_information");
      expect(queue.ok()).toBeTruthy();
      expect(await queue.json()).toMatchObject({ cases: expect.any(Array), generatedAt: expect.any(String) });
      expect((await adminApi.get("/api/admin/users?pageSize=1000")).status()).toBe(400);
    } finally {
      await adminApi.dispose();
    }
    await page.request.post("/api/auth/login", { data: getTestAccount("ADMIN") });
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "User management" })).toBeVisible();
    await expect(page.getByTestId("admin-nav-users")).toBeVisible();
    await page.setViewportSize({ width: 700, height: 900 });
    await page.reload();
    await page.getByTestId("admin-sidebar-trigger").click();
    await expect(page.getByTestId("admin-nav-verification-centre")).toBeVisible();
  });
});
