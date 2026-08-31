/// <reference types="node" />
import { expect, test } from "@playwright/test";

const canonicalDonorName = "Harsh Gavand";
const legacyDonorNames = new Set([
  "Rachel Green", "Tom Hart", "Anna Bell", "Liam Walker", "Sue Moore",
  "Paul Evans", "Claire James", "Mark Singh", "Fiona Black", "George Ali",
  "Priya Shah", "David Owen", "Holt Bakery", "Hartley Farm", "Dales Dairy",
]);

interface ShareCareListingResponse {
  id: string;
  donorId?: string;
  donor: string;
  donorIsVerified: boolean;
  status: string;
  location: string;
  latitude: number;
  longitude: number;
}

test.describe("Share & Care canonical donor API", () => {
  test("returns only database-backed available listings for the real verified donor", async ({ request }) => {
    const response = await request.get("/api/share-care?status=available&limit=100");
    expect(response.ok()).toBeTruthy();

    const listings = await response.json() as ShareCareListingResponse[];
    expect(listings.length).toBeGreaterThan(0);
    const donorIds = new Set(listings.map((listing) => listing.donorId));
    expect(donorIds.size).toBe(1);
    expect([...donorIds][0]).toBeTruthy();

    for (const listing of listings) {
      expect(listing.donor).toBe(canonicalDonorName);
      expect(legacyDonorNames.has(listing.donor)).toBe(false);
      expect(listing.donorIsVerified).toBe(true);
      expect(listing.location).toBe("Mumbai, India");
      expect(Number.isFinite(listing.latitude)).toBe(true);
      expect(Number.isFinite(listing.longitude)).toBe(true);
    }
  });

  test("derives community totals and leaderboard from the same database donor", async ({ request }) => {
    const response = await request.get("/api/share-care/summary");
    expect(response.ok()).toBeTruthy();

    const summary = await response.json() as {
      community: { totalListings: number; activeListings: number; totalDonors: number };
      viewer: unknown;
      leaderboard: Array<{
        donorId: string;
        donorName: string;
        donorIsVerified: boolean;
        listingsShared: number;
        activeListings: number;
      }>;
    };
    expect(summary.viewer).toBeNull();
    expect(summary.community.totalListings).toBeGreaterThanOrEqual(summary.community.activeListings);
    expect(summary.community.activeListings).toBeGreaterThan(0);
    expect(summary.community.totalDonors).toBe(1);
    expect(summary.leaderboard).toHaveLength(1);
    expect(summary.leaderboard[0]).toMatchObject({
      donorName: canonicalDonorName,
      donorIsVerified: true,
      listingsShared: summary.community.totalListings,
      activeListings: summary.community.activeListings,
    });
    expect(summary.leaderboard[0].donorId).toBeTruthy();
  });

  test("keeps reservation mutations protected by authentication", async ({ request }) => {
    const listingsResponse = await request.get("/api/share-care?status=available&limit=1");
    const listings = await listingsResponse.json() as ShareCareListingResponse[];
    expect(listings).toHaveLength(1);

    const reserveResponse = await request.post(`/api/share-care/${listings[0].id}/reserve`);
    expect(reserveResponse.status()).toBe(401);
  });
});
