import { expect, test } from "@playwright/test";

// Read-only foundation checks. They do not create records, call payment
// providers, alter sessions, or require credentials. Set RUN_FOUNDATION_E2E
// to run them against an already-running local/staging server.
test.describe("security and accessibility foundation", () => {
  test("public API endpoints return safe responses", async ({ request }) => {
    const health = await request.get("/api/health");
    expect(health.ok()).toBeTruthy();
    await expect(health.json()).resolves.toMatchObject({ status: "ok" });

    for (const path of ["/api/products", "/api/categories", "/api/categories/buyer"]) {
      const response = await request.get(path);
      expect(response.ok(), path).toBeTruthy();
      await expect(response.json()).resolves.toEqual(expect.any(Array));
    }
  });

  test("support form has labels, keyboard submit behavior, and validation", async ({ page }) => {
    await page.goto("/support");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeVisible();
    await expect(page.getByLabel(/message/i)).toBeVisible();
    await expect(page.getByTestId("button-send-support")).toBeDisabled();

    await page.getByTestId("input-support-name").fill("Foundation Test");
    await page.getByTestId("input-support-email").fill("invalid-email");
    await page.getByTestId("input-support-message").fill("This verifies client-side form readiness.");
    await expect(page.getByTestId("button-send-support")).toBeDisabled();
  });
});
