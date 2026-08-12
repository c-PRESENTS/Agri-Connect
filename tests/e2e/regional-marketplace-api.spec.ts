/// <reference types="node" />
import { expect, test } from "@playwright/test";

test.describe("regional marketplace API", () => {
  test("publishes provider configuration without exposing the server geocoding key", async ({ request }) => {
    const response = await request.get("/api/marketplace/config");
    expect(response.ok()).toBeTruthy();
    const body = await response.json() as Record<string, unknown>;
    expect(["osm", "google", "custom"]).toContain(body.mapProvider);
    expect(body).not.toHaveProperty("geocodingApiKey");
    expect(body).not.toHaveProperty("GEOCODING_API_KEY");
  });

  test("returns canonical regions and one aligned map/list search payload", async ({ request }) => {
    const regions = await request.get("/api/marketplace/regions");
    expect(regions.ok()).toBeTruthy();
    const regionBody = await regions.json() as Array<{ id: string; name: string; countryCode: string }>;
    expect(regionBody.length).toBeGreaterThan(0);
    expect(regionBody.every((region) => Boolean(region.id && region.name && region.countryCode))).toBe(true);

    const search = await request.get("/api/marketplace/search?search=rice&scope=global&pageSize=12");
    expect(search.ok()).toBeTruthy();
    const body = await search.json() as { products: Array<{ id: string; farmerId: string; publicationStatus?: string }>; markers: Array<{ sellerId: string; productIds: string[] }>; pagination: { total: number } };
    const visibleIds = new Set(body.products.map((product) => product.id));
    for (const marker of body.markers) expect(marker.productIds.every((id) => visibleIds.has(id))).toBe(true);
    expect(body.products.every((product) => (product.publicationStatus ?? "published") === "published")).toBe(true);
  });

  test("protects seller and operator regional workflows", async ({ request }) => {
    const responses = await Promise.all([
      request.get("/api/seller/regions"),
      request.get("/api/seller/opportunities"),
      request.get("/api/marketplace/notifications"),
      request.get("/api/operator/regional-marketplace/assignments"),
      request.get("/api/organisation/regional-marketplace/assignments"),
      request.get("/api/organisation/regional-marketplace/access"),
      request.post("/api/operator/regional-marketplace/scan"),
    ]);
    for (const response of responses) expect(response.status()).toBe(401);
  });
});
