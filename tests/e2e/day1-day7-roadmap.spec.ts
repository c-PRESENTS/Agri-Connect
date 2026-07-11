import { expect, test, type Page } from "@playwright/test";

const SPA_TEST_TIMEOUT = 180_000;
const SPA_NAV_TIMEOUT = 45_000;
const SPA_EXPECT_TIMEOUT = 30_000;

async function gotoApp(page: Page, path: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: "commit", timeout: SPA_NAV_TIMEOUT });
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable = [
        "ERR_CONNECTION_REFUSED",
        "net::ERR_ABORTED",
        "frame was detached",
      ].some((text) => message.includes(text));

      if (!retryable || attempt === 4) {
        throw error;
      }

      await page.waitForTimeout(1_000);
    }
  }

  throw lastError;
}

test.describe("Day 1-7 roadmap E2E coverage", () => {
  test("Day 2 privacy policy page renders as a public frontend route", async ({ page }) => {
    test.setTimeout(SPA_TEST_TIMEOUT);
    await gotoApp(page, "/privacy-policy");
    await expect(page.locator("body")).toContainText("Privacy", { timeout: SPA_EXPECT_TIMEOUT });
  });

  test("Day 2 terms page renders as a public frontend route", async ({ page }) => {
    test.setTimeout(SPA_TEST_TIMEOUT);
    await gotoApp(page, "/terms-of-service");
    await expect(page.locator("body")).toContainText("Terms", { timeout: SPA_EXPECT_TIMEOUT });
  });

  test("Day 2 refund page renders as a public frontend route", async ({ page }) => {
    test.setTimeout(SPA_TEST_TIMEOUT);
    await gotoApp(page, "/refund-policy");
    await expect(page.locator("body")).toContainText("Refund", { timeout: SPA_EXPECT_TIMEOUT });
  });

  test("Day 2 not-found page renders for missing public routes", async ({ page }) => {
    test.setTimeout(SPA_TEST_TIMEOUT);
    await gotoApp(page, "/route-that-does-not-exist");
    await expect(page.locator("body")).toContainText(/404|not found|page/i, { timeout: SPA_EXPECT_TIMEOUT });
  });

  test("Day 3 SEO, manifest, cookie, and support foundations are wired", async ({ page, request }) => {
    test.setTimeout(SPA_TEST_TIMEOUT);
    await gotoApp(page, "/support");
    await expect(page.getByTestId("text-support-heading")).toBeVisible({ timeout: SPA_EXPECT_TIMEOUT });
    await expect(page).toHaveTitle(/AgriConnect|Support/i);

    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute("content", /.+/);

    const manifest = await request.get("/manifest.json");
    await expect(manifest).toBeOK();
    const manifestBody = await manifest.json();
    expect(manifestBody).toEqual(expect.objectContaining({
      name: expect.any(String),
      start_url: expect.any(String),
      icons: expect.any(Array),
    }));

    await expect(page.getByRole("region", { name: /privacy|cookie|choices/i })).toBeVisible({ timeout: SPA_EXPECT_TIMEOUT });

    const support = await request.post("/api/support", {
      data: {
        name: "Playwright Tester",
        email: "playwright-day7@example.test",
        topic: "feedback",
        message: "Day 1-7 E2E support contract validation message.",
      },
    });
    await expect(support).toBeOK();
    await expect(await support.json()).toEqual(expect.objectContaining({
      id: expect.any(String),
      status: "open",
    }));
  });

  test("Day 4 main navigation routes and user/currency controls remain visible", async ({ page }) => {
    test.setTimeout(SPA_TEST_TIMEOUT);
    await gotoApp(page, "/support");

    for (const testId of [
      "nav-link-help",
      "nav-link-agritech",
      "nav-link-map",
      "nav-link-land",
      "nav-link-share",
      "nav-link-ship",
      "nav-link-user",
      "button-login-nav",
      "button-region-switcher",
    ]) {
      await expect(page.getByTestId(testId)).toBeVisible({ timeout: SPA_EXPECT_TIMEOUT });
    }
  });

  test("Day 5 about page credibility, farmer help, schemes, and logistics links render", async ({ page }) => {
    test.setTimeout(SPA_TEST_TIMEOUT);
    await gotoApp(page, "/about");

    await expect(page.getByTestId("text-about-heading")).toBeVisible({ timeout: SPA_EXPECT_TIMEOUT });
    await expect(page.getByTestId("card-about-impact")).toBeVisible();
    await expect(page.getByTestId("section-about-free-selling")).toBeVisible();
    await expect(page.getByTestId("link-about-knowledge")).toHaveAttribute("href", "/farmers-help");
    await expect(page.getByTestId("link-about-schemes")).toHaveAttribute("href", "/government-schemes");
    await expect(page.getByTestId("link-about-logistics")).toHaveAttribute("href", "/logistics");
  });

  test("Day 6 and Day 7 category hierarchy and variety counts are complete through backend APIs", async ({ request }) => {
    const categoriesResponse = await request.get("/api/categories");
    await expect(categoriesResponse).toBeOK();
    const categories = await categoriesResponse.json();

    const byId = new Map(categories.map((category: { id: string }) => [category.id, category]));
    for (const id of ["daily-needs", "fresh-produce", "inputs-tools", "processed"]) {
      expect(byId.has(id), `missing top-level category ${id}`).toBe(true);
    }

    for (const category of categories as Array<{ id: string; subcategories: Array<{ id: string; parentId: string }> }>) {
      expect(category.subcategories.length, `${category.id} should expose subcategories`).toBeGreaterThan(0);
      for (const subcategory of category.subcategories) {
        expect(subcategory.parentId, `${subcategory.id} parent should match ${category.id}`).toBe(category.id);
      }
    }

    const dailyNeeds = byId.get("daily-needs") as { subcategories: Array<{ id: string; name: string }> };
    expect(dailyNeeds.subcategories.find((subcategory) => subcategory.id === "vegetables")?.name).toContain("47+");
    expect(dailyNeeds.subcategories.find((subcategory) => subcategory.id === "fruits")?.name).toContain("50+");

    const freshProduce = byId.get("fresh-produce") as { subcategories: Array<{ id: string }> };
    expect(freshProduce.subcategories.map((subcategory) => subcategory.id)).toEqual(expect.arrayContaining(["wholesale-veg", "wholesale-fruits"]));

    const vegetables = await request.get("/api/products?subcategoryId=vegetables");
    await expect(vegetables).toBeOK();
    expect((await vegetables.json()).length).toBeGreaterThanOrEqual(47);

    const fruits = await request.get("/api/products?subcategoryId=fruits");
    await expect(fruits).toBeOK();
    expect((await fruits.json()).length).toBeGreaterThanOrEqual(50);

    const wholesaleVegetables = await request.get("/api/products?subcategoryId=wholesale-veg");
    await expect(wholesaleVegetables).toBeOK();
    expect((await wholesaleVegetables.json()).length).toBeGreaterThan(0);

    const wholesaleFruits = await request.get("/api/products?subcategoryId=wholesale-fruits");
    await expect(wholesaleFruits).toBeOK();
    expect((await wholesaleFruits.json()).length).toBeGreaterThan(0);
  });

  test("Day 7 expanded produce categories render in the frontend category experience", async ({ page }) => {
    test.setTimeout(SPA_TEST_TIMEOUT);
    await gotoApp(page, "/");

    await expect(page.locator("body")).toContainText("Vegetables", { timeout: SPA_EXPECT_TIMEOUT });
    await expect(page.locator("body")).toContainText("Fruits", { timeout: SPA_EXPECT_TIMEOUT });
    await expect(page.locator("body")).toContainText("Organic Tomatoes", { timeout: SPA_EXPECT_TIMEOUT });
  });
});
