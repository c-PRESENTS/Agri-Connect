import { authStorage } from "../backend/auth/storage";
import { configuredCatalogOwnerEmail } from "../backend/catalog/catalog-owner";
import { shareCareRepository } from "../backend/repositories/share-care-repository";
import { marketplaceSellerVerified } from "../backend/seller-verification/capabilities";
import { storage } from "../backend/storage";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const email = configuredCatalogOwnerEmail();
  const owner = await authStorage.getUserByEmail(email);

  assert(owner, `Canonical seller account not found for ${email}`);
  assert(owner.accountStatus === "active", "Canonical seller account is not active");
  assert(owner.role === "farmer" || owner.sellerEnabled, "Canonical account is not seller-enabled");
  assert(await marketplaceSellerVerified(owner.id), "Canonical seller is not marketplace verified");

  const [publicProducts, verifiedProducts, ownedProducts, sellerOrders, stats, shareCareListings, shareCareSummary] = await Promise.all([
    storage.getProducts(),
    storage.getVerifiedDatabaseSellerProducts(),
    storage.getProductsByFarmer(owner.id),
    storage.getSellerOrders(owner.id),
    storage.getFarmerStats(owner.id),
    shareCareRepository.list({ limit: 100 }),
    shareCareRepository.summary(owner.id),
  ]);

  assert(verifiedProducts.length > 0, "No verified database products are available");
  assert(ownedProducts.length > 0, "Canonical seller has no products");
  assert(publicProducts.every((product) => product.farmerId === owner.id), "A public product is linked to another seller");
  assert(verifiedProducts.every((product) => product.farmerId === owner.id), "A verified product is linked to another seller");
  assert(ownedProducts.every((product) => product.farmerId === owner.id), "Owned-product query returned another seller");
  assert(
    verifiedProducts.every((product) =>
      product.farmerName === owner.name
      && product.farmerLocation === (owner.location || "")
      && product.farmerIsVerified === true
      && product.farmerIsOnline === (owner.isOnline === true)),
    "Product seller snapshots do not match the database-backed seller profile",
  );
  assert(
    sellerOrders.every((order) => order.items.every((item) => item.farmerId === owner.id)),
    "Seller order API data contains an item linked to another seller",
  );
  assert(stats.totalProducts === ownedProducts.length, "Farmer statistics product total is not database-derived");
  const legacyShareCareIds = new Set(Array.from({ length: 15 }, (_, index) => `sc-${index + 1}`));
  const canonicalShareCareListings = shareCareListings.filter((listing) => legacyShareCareIds.has(listing.id));
  const sameCoordinate = (left: number, right: number | null | undefined) =>
    typeof right === "number" && Math.abs(left - right) < 0.00001;
  assert(canonicalShareCareListings.length === 15, "Not all legacy Share & Care listings are available through database-backed donors");
  assert(
    canonicalShareCareListings.every((listing) =>
      listing.donorId === owner.id
      && listing.donor === owner.name
      && listing.location === owner.location
      && sameCoordinate(listing.latitude, owner.latitude)
      && sameCoordinate(listing.longitude, owner.longitude)
      && listing.donorIsVerified === true),
    "A legacy Share & Care listing is not linked to the canonical database-backed donor",
  );

  const publicProductIds = new Set(publicProducts.map((product) => product.id));
  const nonPublicOwnedProducts = ownedProducts
    .filter((product) => !publicProductIds.has(product.id))
    .map((product) => ({
      id: product.id,
      name: product.name,
      moderationStatus: product.moderationStatus,
      publicationStatus: product.publicationStatus,
      publicationReason: product.publicationReason,
      price: product.price,
      stock: product.stock,
      unit: product.unit,
      imageCount: product.images?.length ?? 0,
    }));

  const report = {
    owner: {
      id: owner.id,
      email: owner.email,
      name: owner.name,
      role: owner.role,
      sellerEnabled: owner.sellerEnabled,
      accountStatus: owner.accountStatus,
      location: owner.location,
      latitude: owner.latitude,
      longitude: owner.longitude,
      rating: owner.rating,
      reviewCount: owner.reviewCount,
      isOnline: owner.isOnline,
    },
    marketplaceVerified: true,
    publicProducts: publicProducts.length,
    verifiedProducts: verifiedProducts.length,
    ownedProducts: ownedProducts.length,
    sellerOrders: sellerOrders.length,
    farmerStats: stats,
    shareCare: {
      canonicalListings: canonicalShareCareListings.length,
      activeListings: canonicalShareCareListings.filter((listing) => listing.status === "available").length,
      summary: shareCareSummary,
    },
    nonPublicOwnedProducts,
    sampleProducts: verifiedProducts.slice(0, 3).map((product) => ({
      id: product.id,
      name: product.name,
      farmerId: product.farmerId,
      farmerName: product.farmerName,
      farmerLocation: product.farmerLocation,
      farmerIsVerified: product.farmerIsVerified,
    })),
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
