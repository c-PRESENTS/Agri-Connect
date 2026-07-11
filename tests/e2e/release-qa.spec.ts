import { expect, test, type Page, type APIRequestContext } from "@playwright/test";

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

async function publicRouteOk(request: APIRequestContext, path: string) {
  const response = await request.get(path);
  await expect(response, `${path} should return a successful response`).toBeOK();
  await expect(response.headers()["content-type"] ?? "").toContain("text/html");
}

async function dismissCookieBannerIfVisible(page: Page) {
  const acceptAll = page.getByRole("button", { name: /accept all/i });
  if ((await acceptAll.count()) > 0 && (await acceptAll.isVisible().catch(() => false))) {
    await acceptAll.click();
  }
}

test.describe("release QA E2E coverage", () => {
  const navTargets = [
    { name: "help", testId: "nav-link-help", path: "/farmers-help", expectedUrl: /\/farmers-help/ },
    { name: "agritech", testId: "nav-link-agritech", path: "/agritech", expectedUrl: /\/agritech/ },
    { name: "map", testId: "nav-link-map", path: "/map", expectedUrl: /\/map/ },
    { name: "land", testId: "nav-link-land", path: "/land-leasing", expectedUrl: /\/land-leasing/ },
    { name: "share", testId: "nav-link-share", path: "/share-care", expectedUrl: /\/share-care/ },
    { name: "ship", testId: "nav-link-ship", path: "/ship", expectedUrl: /\/ship/ },
    { name: "user", testId: "nav-link-user", path: "/login", expectedUrl: /\/login/ },
  ];

  for (const target of navTargets) {
    test(`critical nav clickable routes correctly: ${target.name}`, async ({ page, request }) => {
      test.setTimeout(SPA_TEST_TIMEOUT);

      await publicRouteOk(request, target.path);
      await page.setViewportSize({ width: 1440, height: 900 });
      await gotoApp(page, "/support");
      await dismissCookieBannerIfVisible(page);

      const navControl = page.getByTestId(target.testId);
      await expect(navControl).toBeVisible({ timeout: SPA_EXPECT_TIMEOUT });
      await expect(navControl).toBeEnabled();
      await navControl.scrollIntoViewIfNeeded();
      await navControl.click({ timeout: SPA_EXPECT_TIMEOUT });
      await expect(page).toHaveURL(target.expectedUrl, { timeout: SPA_EXPECT_TIMEOUT });
    });
  }

  const responsiveRoutes = [
    { path: "/support", testId: "text-support-heading" },
    { path: "/ship", testId: "tab-track" },
    { path: "/about", testId: "text-about-heading" },
  ];

  const viewports = [
    { name: "mobile", width: 390, height: 844 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    for (const route of responsiveRoutes) {
      test(`responsive smoke: ${route.path} at ${viewport.name}`, async ({ page }) => {
        test.setTimeout(SPA_TEST_TIMEOUT);

        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await gotoApp(page, route.path);
        await expect(page.getByTestId(route.testId)).toBeVisible({ timeout: SPA_EXPECT_TIMEOUT });
        await expect(page.locator("body")).not.toHaveText("");
      });
    }
  }

  test("mobile navigation exposes compact controls", async ({ page }) => {
    test.setTimeout(SPA_TEST_TIMEOUT);

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoApp(page, "/support");

    await expect(page.getByTestId("button-mobile-more-tools")).toBeVisible({ timeout: SPA_EXPECT_TIMEOUT });
    await expect(page.getByTestId("button-cart-nav")).toBeVisible();
    await expect(page.getByTestId("button-login-nav")).toBeVisible();
  });

  test("critical pages do not show broken or unlabeled images", async ({ page, request }) => {
    test.setTimeout(SPA_TEST_TIMEOUT);

    const products = await request.get("/api/products");
    await expect(products).toBeOK();
    const [product] = await products.json();

    for (const path of ["/", "/about", `/products/${product.id}`]) {
      await gotoApp(page, path);
      await page.locator("img").first().waitFor({ state: "attached", timeout: SPA_EXPECT_TIMEOUT }).catch(() => undefined);

      const imageProblems = await page.locator("img").evaluateAll((images) =>
        images
          .filter((image) => {
            const rect = image.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          })
          .map((image) => ({
            alt: image.getAttribute("alt") ?? "",
            src: image.getAttribute("src") ?? image.currentSrc ?? "",
            testId: image.getAttribute("data-testid") ?? "",
          }))
          .filter((image) => !image.alt.trim() || !image.src.trim()),
      );

      expect(imageProblems, `${path} has visible images without alt text or source`).toEqual([]);
    }
  });

  test("support form backend validates bad input and accepts valid support tickets", async ({ request }) => {
    const invalid = await request.post("/api/support", {
      data: {
        name: "",
        email: "not-an-email",
        topic: "feedback",
        message: "short",
      },
    });
    expect(invalid.status()).toBe(400);

    const valid = await request.post("/api/support", {
      data: {
        name: "Release QA Tester",
        email: "release-qa@example.test",
        topic: "feedback",
        message: "Release QA validates support ticket creation through the backend contract.",
      },
    });
    await expect(valid).toBeOK();
    await expect(await valid.json()).toEqual(expect.objectContaining({
      id: expect.any(String),
      status: "open",
    }));
  });

  test("keyboard focus reaches interactive controls on support page", async ({ page }) => {
    test.setTimeout(SPA_TEST_TIMEOUT);

    await gotoApp(page, "/support");
    await dismissCookieBannerIfVisible(page);

    const focusTargets = [
      "button-login-nav",
      "input-search",
      "button-cart-nav",
    ];

    for (const testId of focusTargets) {
      const target = page.getByTestId(testId);
      await expect(target).toBeVisible({ timeout: SPA_EXPECT_TIMEOUT });
      await target.focus();

      await expect.poll(
        () => page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? ""),
        { message: `${testId} should be keyboard focusable` },
      ).toBe(testId);
    }
  });

  test("about page public links resolve through frontend/backend server", async ({ page, request }) => {
    test.setTimeout(SPA_TEST_TIMEOUT);

    await gotoApp(page, "/about");

    const linkIds = [
      "link-about-support",
      "link-about-knowledge",
      "link-about-schemes",
      "link-about-logistics",
    ];

    for (const linkId of linkIds) {
      const href = await page.getByTestId(linkId).getAttribute("href");
      expect(href, `${linkId} should have an href`).toBeTruthy();
      await publicRouteOk(request, href!);
    }
  });

  test("critical public pages have no captured page errors or failed local API requests", async ({ page }) => {
    test.setTimeout(SPA_TEST_TIMEOUT);

    const pageErrors: string[] = [];
    const failedLocalRequests: string[] = [];

    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("requestfailed", (request) => {
      const url = request.url();
      const failureText = request.failure()?.errorText ?? "";
      const isLocalApp = url.includes("127.0.0.1:5000") || url.includes("localhost:5000");
      const isBackendApi = url.includes("/api/");
      const isExpectedSpaAbort = failureText.includes("net::ERR_ABORTED");

      if (isLocalApp && isBackendApi && !isExpectedSpaAbort) {
        failedLocalRequests.push(`${request.method()} ${url} ${failureText}`.trim());
      }
    });

    for (const path of ["/support", "/ship", "/share-care", "/land-leasing", "/agritech", "/about"]) {
      await gotoApp(page, path);
      await expect(page.locator("body")).not.toHaveText("");
    }

    expect(pageErrors).toEqual([]);
    expect(failedLocalRequests).toEqual([]);
  });
});
