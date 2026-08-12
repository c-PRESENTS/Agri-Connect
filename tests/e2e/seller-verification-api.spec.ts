/// <reference types="node" />
import { expect, test, type APIRequestContext } from "@playwright/test";
import { createAuthenticatedApi, getTestAccount, hasTestAccount } from "./helpers/authenticated-api";

test.describe("seller verification API", () => {
  test("requires authentication for seller and operator verification data", async ({ request }) => {
    const responses = await Promise.all([
      request.get("/api/seller/verification/status"),
      request.put("/api/seller/verification/business-profile", { data: {} }),
      request.post("/api/seller/verification/documents", { data: {} }),
      request.get("/api/operator/seller-verifications"),
      request.post("/api/operator/seller-verifications/not-a-case/review", { data: {} }),
    ]);
    for (const response of responses) expect(response.status()).toBe(401);
  });

  test.skip(!hasTestAccount("SELLER"), "A seller test account is required");
  test.describe.configure({ mode: "serial" });
  let sellerApi: APIRequestContext;

  test.beforeAll(async () => {
    sellerApi = await createAuthenticatedApi(getTestAccount("SELLER"));
  });

  test.afterAll(async () => {
    await sellerApi?.dispose();
  });

  test("uses a server-authoritative supported-country checklist", async () => {
    const india = await sellerApi.get("/api/seller/verification/requirements?country=IN&entityType=company");
    expect(india.ok()).toBeTruthy();
    const indiaBody = await india.json() as { supported: boolean; requirements: Array<{ code: string; required: boolean }> };
    expect(indiaBody.supported).toBe(true);
    expect(indiaBody.requirements.some((item) => item.code === "pan" && item.required)).toBe(true);
    expect(indiaBody.requirements.some((item) => item.code === "gstin" && !item.required)).toBe(true);

    const unsupported = await sellerApi.get("/api/seller/verification/requirements?country=US&entityType=company");
    expect((await unsupported.json()).supported).toBe(false);
  });

  test("rejects invalid tax identifiers before storing them", async () => {
    const response = await sellerApi.put("/api/seller/verification/tax-identifiers", {
      data: { country: "IN", type: "pan", value: "not-a-pan" },
    });
    expect(response.status()).toBe(400);
  });

  test("does not expose encrypted identifiers or document storage keys", async () => {
    const response = await sellerApi.get("/api/seller/verification/status");
    expect(response.ok()).toBeTruthy();
    const text = await response.text();
    expect(text).not.toContain("encryptedValue");
    expect(text).not.toContain("storageKey");
    expect(text).not.toContain("sha256");
  });
});
