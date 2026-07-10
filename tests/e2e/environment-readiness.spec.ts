import { expect, test } from "@playwright/test";

test("environment can reach localhost health endpoint", async ({ page }) => {
  const response = await page.goto("/api/health", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expect(page.locator("body")).toContainText('"status":"ok"');
});
