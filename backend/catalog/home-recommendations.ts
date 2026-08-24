import type { HomeProductRecommendations, Product } from "@shared/schema";
import { haversineKm } from "../shipping/quote-engine";

export const HOME_NEARBY_RADIUS_KM = 150;
export const FRESH_PICK_MAX_AGE_DAYS = 30;

const FRESH_DAILY_NEEDS_SUBCATEGORIES = new Set([
  "vegetables",
  "fruits",
  "dairy",
  "meat",
  "fish",
  "organic-produce",
  "bakery",
]);

function isFreshFoodProduct(product: Product): boolean {
  return product.categoryId === "fresh-produce"
    || (product.categoryId === "daily-needs" && FRESH_DAILY_NEEDS_SUBCATEGORIES.has(product.subcategoryId));
}

function compareAvailabilityAndDistance(a: Product, b: Product): number {
  return (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY)
    || b.stock - a.stock
    || b.rating - a.rating
    || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function buildHomeProductRecommendations(input: {
  products: Product[];
  userLocation: { label: string; latitude: number; longitude: number };
  now?: Date;
}): HomeProductRecommendations {
  const now = input.now ?? new Date();
  const freshCutoff = now.getTime() - FRESH_PICK_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  const nearbyProducts = input.products
    .filter((product) => product.stock > 0)
    .filter((product) => Number.isFinite(product.farmerLatitude) && Number.isFinite(product.farmerLongitude))
    .map((product) => ({
      ...product,
      distance: Math.round(haversineKm(
        { lat: input.userLocation.latitude, lng: input.userLocation.longitude },
        { lat: product.farmerLatitude, lng: product.farmerLongitude },
      ) * 10) / 10,
    }))
    .filter((product) => product.distance <= HOME_NEARBY_RADIUS_KM);

  const freshPicks = nearbyProducts
    .filter((product) => product.isFreshPick === true)
    .filter(isFreshFoodProduct)
    .filter((product) => new Date(product.createdAt).getTime() >= freshCutoff)
    .sort(compareAvailabilityAndDistance);

  const featuredProducts = nearbyProducts
    .filter((product) => product.isFeatured)
    .sort(compareAvailabilityAndDistance);

  return {
    location: input.userLocation,
    nearbyRadiusKm: HOME_NEARBY_RADIUS_KM,
    freshnessWindowDays: FRESH_PICK_MAX_AGE_DAYS,
    freshPicks,
    featuredProducts,
  };
}
