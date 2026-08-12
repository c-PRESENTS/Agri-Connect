import type { Product, ProductFilters } from "@shared/schema";
import { storage } from "../storage";
import { haversineKm } from "../shipping/quote-engine";
import { regionalMarketplaceRepository } from "../repositories/regional-marketplace-repository";

type MarketplaceSearch = ProductFilters & {
  latitude?: number;
  longitude?: number;
  regionId?: string;
  quantity?: number;
  page?: number;
  pageSize?: number;
  scope?: "local" | "global";
};

function sellerMarkers(products: Product[]) {
  const grouped = new Map<string, { sellerId: string; sellerName: string; latitude: number; longitude: number; location: string; productCount: number; minimumPrice: number; rating: number; productIds: string[] }>();
  for (const product of products) {
    if (!Number.isFinite(product.farmerLatitude) || !Number.isFinite(product.farmerLongitude)
      || product.farmerLatitude < -90 || product.farmerLatitude > 90
      || product.farmerLongitude < -180 || product.farmerLongitude > 180) continue;
    const current = grouped.get(product.farmerId);
    if (current) {
      current.productCount += 1;
      current.minimumPrice = Math.min(current.minimumPrice, product.price);
      current.productIds.push(product.id);
    } else {
      grouped.set(product.farmerId, {
        sellerId: product.farmerId,
        sellerName: product.farmerName,
        latitude: product.farmerLatitude,
        longitude: product.farmerLongitude,
        location: product.regionName || product.farmerLocation,
        productCount: 1,
        minimumPrice: product.price,
        rating: product.farmerRating,
        productIds: [product.id],
      });
    }
  }
  return Array.from(grouped.values());
}

export class RegionalMarketplaceService {
  async search(input: MarketplaceSearch) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(60, Math.max(1, input.pageSize ?? 24));
    const resolvedRegion = input.regionId
      ? (await regionalMarketplaceRepository.listRegions()).find((region) => region.id === input.regionId) ?? null
      : input.latitude != null && input.longitude != null
        ? await regionalMarketplaceRepository.resolveNearestOperationalRegion(input.latitude, input.longitude)
        : null;
    const effectiveRegionId = input.regionId ?? (resolvedRegion ? String(resolvedRegion.id) : undefined);
    let products = await storage.getProducts({
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId,
      search: input.search,
      isOrganic: input.isOrganic,
      inStock: true,
      rating: input.rating,
      minPrice: input.minPrice,
      maxPrice: input.maxPrice,
      qualityGrade: input.qualityGrade,
      sortBy: input.sortBy,
    });
    const eligibility = await regionalMarketplaceRepository.getEligibleProductRegions(products.map((product) => product.id));
    products = products.flatMap((product) => {
      const approved = eligibility.get(product.id);
      if (!approved || (input.quantity && product.stock < input.quantity)) return [];
      const distance = input.latitude != null && input.longitude != null
        ? Math.round(haversineKm({ lat: input.latitude, lng: input.longitude }, { lat: product.farmerLatitude, lng: product.farmerLongitude }) * 10) / 10
        : product.distance;
      const localFulfilmentEligible = approved.canFulfil && Boolean(effectiveRegionId && effectiveRegionId === approved.regionId);
      if (input.scope === "local" && !localFulfilmentEligible) return [];
      return [{ ...product, regionId: approved.regionId, regionName: approved.regionName, distance, localFulfilmentEligible }];
    });
    products.sort((a, b) => {
      if (a.localFulfilmentEligible !== b.localFulfilmentEligible) return a.localFulfilmentEligible ? -1 : 1;
      if (input.sortBy === "price_asc") return a.price - b.price;
      if (input.sortBy === "price_desc") return b.price - a.price;
      if (input.sortBy === "rating") return b.farmerRating - a.farmerRating;
      return (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY);
    });
    const total = products.length;
    const start = (page - 1) * pageSize;
    const pageProducts = products.slice(start, start + pageSize);
    const localCount = products.filter((product) => product.localFulfilmentEligible).length;
    return {
      query: { categoryId: input.categoryId ?? null, subcategoryId: input.subcategoryId ?? null, search: input.search ?? "", regionId: effectiveRegionId ?? null, scope: input.scope ?? "global" },
      resolvedRegion,
      products: pageProducts,
      markers: sellerMarkers(pageProducts),
      pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
      summary: { localCount, globalCount: total - localCount },
    };
  }
}

export const regionalMarketplaceService = new RegionalMarketplaceService();
