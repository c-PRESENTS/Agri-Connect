import { expect, test, type APIRequestContext, type APIResponse, type Page } from "@playwright/test";

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
        "ECONNRESET",
        "Timeout",
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

async function apiRequestWithRetry(
  request: APIRequestContext,
  method: "get" | "post" | "delete",
  url: string,
  options?: Parameters<APIRequestContext["post"]>[1],
): Promise<APIResponse> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      if (method === "post") {
        return await request.post(url, options);
      }
      if (method === "delete") {
        return await request.delete(url, options);
      }
      return await request.get(url, options);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable = [
        "ECONNRESET",
        "ECONNREFUSED",
        "socket hang up",
        "Timeout",
      ].some((text) => message.includes(text));

      if (!retryable || attempt === 4) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  throw lastError;
}

test.describe("frontend/backend smoke E2E", () => {
  test("renders marketplace UI from backend-backed product data", async ({ page }) => {
    test.setTimeout(SPA_TEST_TIMEOUT);

    const productsResponse = page.waitForResponse(
      (response) => response.url().includes("/api/products") && response.request().method() === "GET",
      { timeout: SPA_NAV_TIMEOUT },
    );
    await gotoApp(page, "/");
    const products = await productsResponse;
    expect(products.ok()).toBe(true);
    const productList = await products.json();
    expect(productList.length).toBeGreaterThan(0);

    await expect(page).toHaveTitle(/AgriConnect/);
    await expect.poll(
      async () => {
        const bodyText = await page.locator("body").innerText();
        return productList.some((product: { name: string }) => bodyText.includes(product.name));
      },
      { timeout: SPA_EXPECT_TIMEOUT },
    ).toBe(true);
  });

  test("public API endpoints serve data used by frontend pages", async ({ request }) => {
    const health = await request.get("/api/health");
    await expect(health).toBeOK();
    await expect(await health.json()).toMatchObject({ status: "ok" });

    const products = await apiRequestWithRetry(request, "get", "/api/products");
    await expect(products).toBeOK();
    const productBody = await products.json();
    expect(Array.isArray(productBody)).toBe(true);
    expect(productBody.length).toBeGreaterThan(0);
    expect(productBody[0]).toEqual(expect.objectContaining({ id: expect.any(String), name: expect.any(String) }));

    const categories = await request.get("/api/categories");
    await expect(categories).toBeOK();
    expect((await categories.json()).length).toBeGreaterThan(0);

    const search = await request.get("/api/search?q=tomato");
    await expect(search).toBeOK();
    expect((await search.json()).products.length).toBeGreaterThan(0);

    const shareCare = await request.get("/api/share-care");
    await expect(shareCare).toBeOK();
    expect((await shareCare.json()).length).toBeGreaterThan(0);

    const landListings = await request.get("/api/land-listings");
    await expect(landListings).toBeOK();
    const landBody = await landListings.json();
    expect(landBody.sale.length + landBody.investment.length + landBody.community.length).toBeGreaterThan(0);
  });

  test("guest cart can add, read, and clear a product through backend APIs", async ({ request }) => {
    const products = await apiRequestWithRetry(request, "get", "/api/products");
    await expect(products).toBeOK();
    const [product] = await products.json();
    expect(product?.id).toBeTruthy();

    const add = await apiRequestWithRetry(request, "post", "/api/cart", {
      data: { productId: product.id, quantity: 2 },
    });
    await expect(add).toBeOK();
    const added = await add.json();
    expect(added).toEqual(expect.objectContaining({ productId: product.id, quantity: 2 }));

    const cart = await apiRequestWithRetry(request, "get", "/api/cart");
    await expect(cart).toBeOK();
    const cartBody = await cart.json();
    expect(cartBody.items.some((item: { productId: string; quantity: number }) => item.productId === product.id && item.quantity === 2)).toBe(true);
    expect(cartBody.total).toBeGreaterThan(0);

    const clear = await apiRequestWithRetry(request, "delete", "/api/cart");
    await expect(clear).toBeOK();
    const empty = await apiRequestWithRetry(request, "get", "/api/cart");
    await expect(empty).toBeOK();
    expect((await empty.json()).items).toHaveLength(0);
  });

  test("shipping quote API returns carrier options for the send parcel flow", async ({ request }) => {
    const quote = await request.post("/api/shipping/quotes", {
      data: {
        pickup: {
          name: "Farm",
          phone: "+447700900000",
          line1: "Farm Lane",
          city: "Chelmsford",
          postcode: "CM1 1AA",
          country: "GB",
        },
        drop: {
          name: "Buyer",
          phone: "+447700900001",
          line1: "Market Street",
          city: "London",
          postcode: "SW1A 1AA",
          country: "GB",
        },
        items: [{ name: "Tomatoes", quantity: 2, weightKg: 0.5, fragile: true }],
        service: "standard",
      },
    });

    await expect(quote).toBeOK();
    const body = await quote.json();
    expect(body.quotes.length).toBeGreaterThan(0);
    expect(body.distanceKm).toBeGreaterThan(0);
    expect(body.quotes[0]).toEqual(expect.objectContaining({ partnerName: expect.any(String), price: expect.any(Number) }));
  });

  test("protected dashboard route sends guests to login", async ({ page }) => {
    test.setTimeout(SPA_TEST_TIMEOUT);

    const authResponse = await page.request.get("/api/auth/user");
    expect(authResponse.status()).toBe(401);

    await gotoApp(page, "/dashboard");

    await expect(page).toHaveURL(/\/login/, { timeout: SPA_EXPECT_TIMEOUT });
  });

  const featurePages = [
    { name: "ship", path: "/ship", testId: "tab-track" },
    { name: "share-care", path: "/share-care", testId: "text-share-count" },
    { name: "land leasing", path: "/land-leasing", testId: "tab-lease" },
    { name: "agritech", path: "/agritech", testId: "tabs-agritech" },
    { name: "support", path: "/support", testId: "text-support-heading" },
  ];

  for (const feature of featurePages) {
    test(`public feature page renders: ${feature.name}`, async ({ page }) => {
      test.setTimeout(SPA_TEST_TIMEOUT);

      await gotoApp(page, feature.path);
      await expect(page.getByTestId(feature.testId)).toBeVisible({ timeout: SPA_EXPECT_TIMEOUT });
    });
  }
});
