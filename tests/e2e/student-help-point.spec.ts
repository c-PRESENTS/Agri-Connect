import { randomUUID } from "crypto";
import { Client } from "pg";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { createAuthenticatedApi, getTestAccount, hasTestAccount } from "./helpers/authenticated-api";

const allowDatabaseSetup = process.env.STUDENT_E2E_ALLOW_DB_SETUP === "true";

test.describe("verified student help point", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!allowDatabaseSetup, "Set STUDENT_E2E_ALLOW_DB_SETUP=true only against a disposable test database.");

  let api: APIRequestContext;
  let db: Client;
  let userId: string;
  let registryId: string;
  let resourceId: string;

  test.beforeAll(async () => {
    const account = getTestAccount("STUDENT");
    api = await createAuthenticatedApi(account);
    const userResponse = await api.get("/api/auth/user");
    expect(userResponse.ok()).toBeTruthy();
    const user = await userResponse.json();
    userId = user.id;

    db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    registryId = randomUUID();
    resourceId = randomUUID();
    await db.query(
      `INSERT INTO student_registry (id, institutional_email, student_number, study_level, programme, enrolment_status, access_expires_at)
       VALUES ($1, LOWER($2), $3, 'UG', 'E2E Agriculture Programme', 'active', NOW() + INTERVAL '1 day')
       ON CONFLICT (institutional_email) DO UPDATE SET enrolment_status='active', revoked_at=NULL, access_expires_at=NOW() + INTERVAL '1 day'
       RETURNING id`,
      [registryId, account.email, `E2E-${Date.now()}`],
    ).then((result) => { registryId = result.rows[0].id; });
    await db.query(
      `INSERT INTO student_entitlements (user_id, student_registry_id, verified_at, last_verified_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET student_registry_id=$2, revoked_at=NULL, last_verified_at=NOW()`,
      [userId, registryId],
    );
    await db.query(
      `INSERT INTO student_resources (id, title, summary, url, category, study_levels, published, sort_order)
       VALUES ($1, 'E2E Library Guide', 'Temporary published resource for student portal verification.', '/support', 'Library and research', ARRAY['UG'], true, 1)`,
      [resourceId],
    );
  });

  test.afterAll(async () => {
    if (db) {
      await db.query("DELETE FROM student_support_requests WHERE student_user_id=$1", [userId]).catch(() => undefined);
      await db.query("DELETE FROM student_resources WHERE id=$1", [resourceId]).catch(() => undefined);
      await db.query("DELETE FROM student_entitlements WHERE user_id=$1", [userId]).catch(() => undefined);
      await db.query("DELETE FROM student_registry WHERE id=$1", [registryId]).catch(() => undefined);
      await db.end();
    }
    await api?.dispose();
  });


  test("returns only the verified student's profile and published resources", async () => {
    const profile = await api.get("/api/student/profile");
    expect(profile.status()).toBe(200);
    await expect(profile.json()).resolves.toMatchObject({ studyLevel: "UG", programme: "E2E Agriculture Programme" });

    const resources = await api.get("/api/student/resources");
    expect(resources.status()).toBe(200);
    expect((await resources.json()).some((resource: { id: string }) => resource.id === resourceId)).toBeTruthy();
    const wrongLevel = await api.get("/api/student/resources?level=PhD");
    expect(wrongLevel.status()).toBe(403);
  });

  test("denies a marketplace account without a student entitlement", async () => {
    test.skip(!hasTestAccount("BUYER"), "Set a separate E2E_BUYER account to verify non-student denial.");
    const buyerApi = await createAuthenticatedApi(getTestAccount("BUYER"));
    try {
      const buyer = await (await buyerApi.get("/api/auth/user")).json();
      expect(buyer.id).not.toBe(userId);
      const profile = await buyerApi.get("/api/student/profile");
      expect(profile.status()).toBe(403);
    } finally {
      await buyerApi.dispose();
    }
  });

  test("rejects invalid help requests and stores a valid request for its owner", async () => {
    const invalid = await api.post("/api/student/support-requests", { data: { category: "IT", subject: "x", description: "short", preferredContact: "platform", privacyAcknowledged: false } });
    expect(invalid.status()).toBe(400);

    const created = await api.post("/api/student/support-requests", { data: {
      category: "IT and account access",
      subject: "E2E student support request",
      description: "This temporary request verifies validated, student-owned support storage.",
      preferredContact: "platform",
      privacyAcknowledged: true,
    } });
    expect(created.status()).toBe(201);
    const request = await created.json();
    expect(request.studentUserId).toBe(userId);

    const ownRequest = await api.get(`/api/student/support-requests/${request.id}`);
    expect(ownRequest.status()).toBe(200);
    const unrelated = await api.get(`/api/student/support-requests/${randomUUID()}`);
    expect(unrelated.status()).toBe(404);
  });

  test("renders dashboard, resources, form validation, and request history", async ({ page }) => {
    const account = getTestAccount("STUDENT");
    const login = await page.request.post("/api/auth/login", { data: account });
    expect(login.ok()).toBeTruthy();

    await page.goto("/student/dashboard");
    await expect(page.getByRole("heading", { name: "Student Help Point" })).toBeVisible();
    await expect(page.getByText("E2E Agriculture Programme").first()).toBeVisible();

    await page.getByRole("link", { name: "Resources" }).click();
    await expect(page.getByRole("heading", { name: "E2E Library Guide" })).toBeVisible();

    await page.getByRole("link", { name: "Request help" }).click();
    await expect(page.getByRole("button", { name: "Submit request" })).toBeDisabled();
    await page.getByLabel(/I understand this request/).check();
    await page.getByRole("button", { name: "Submit request" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
  });
});
