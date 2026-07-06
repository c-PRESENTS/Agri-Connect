/**
 * Deterministic "is this seller online?" rule shared across the app
 * so the Smart Map, the home Live Sellers Rail, the product-page
 * "Sellers near you" panel, and any other surface all agree on the
 * same online/offline status for a given farmer/seller id.
 *
 * Rule: ~66% of sellers are considered online. Stable per id (no Math.random).
 */
export function isSellerOnline(farmerId: string | undefined | null): boolean {
  if (!farmerId) return false;
  return farmerId.charCodeAt(farmerId.length - 1) % 3 !== 0;
}
