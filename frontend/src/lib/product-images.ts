import { getCategoryImage } from "./categories";
import {
  LOCAL_BRANDED_PRODUCT_FALLBACK,
  normalizeProductImageKey,
  productImageAliasIndex,
  productImageRegistry,
  type ProductImageAttribution,
} from "./product-image-registry";

export type ProductImageResolutionSource =
  | "seller-uploaded"
  | "exact-product"
  | "alias"
  | "subcategory"
  | "category"
  | "branded-fallback";

export interface ProductImageResolution {
  src: string;
  fallbackSrc?: string;
  source: ProductImageResolutionSource;
  reason: string;
  normalizedName: string;
  matchedSlug?: string;
  attribution?: ProductImageAttribution;
  reviewRequired: boolean;
  ambiguousMatches: readonly string[];
  ignoredProvidedImage?: string;
}

export interface ProductImageResolverInput {
  id?: string;
  name: string;
  categoryId?: string;
  subcategoryId?: string;
  images?: readonly (string | null | undefined)[];
  providedImage?: string | null;
  imageOwnership?: "seller" | "system" | "unknown";
}

export interface ProductImageLike {
  id?: string;
  name?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  images?: readonly (string | null | undefined)[] | null;
}

const SYSTEM_PRODUCT_ID = /^product-\d+$/;

function firstUsableImage(input: ProductImageResolverInput): string | undefined {
  const candidates = [input.providedImage, ...(input.images ?? [])];
  return candidates.find((candidate): candidate is string =>
    typeof candidate === "string" && candidate.trim().length > 0,
  )?.trim();
}

function isSystemProvided(input: ProductImageResolverInput): boolean {
  if (input.imageOwnership === "system") return true;
  if (input.imageOwnership === "seller") return false;
  return Boolean(input.id && SYSTEM_PRODUCT_ID.test(input.id));
}

function taxonomyFallback(
  input: ProductImageResolverInput,
  normalizedName: string,
  ambiguousMatches: readonly string[] = [],
  ignoredProvidedImage?: string,
): ProductImageResolution {
  if (input.subcategoryId) {
    const subcategoryImage = getCategoryImage(input.subcategoryId);
    if (subcategoryImage) {
      return {
        src: subcategoryImage,
        source: "subcategory",
        reason: ambiguousMatches.length
          ? "Ambiguous name mapping; used the declared subcategory image"
          : "No approved exact or alias mapping; used the declared subcategory image",
        normalizedName,
        reviewRequired: true,
        ambiguousMatches,
        ignoredProvidedImage,
      };
    }
  }

  if (input.categoryId) {
    const categoryImage = getCategoryImage(input.categoryId);
    if (categoryImage) {
      return {
        src: categoryImage,
        source: "category",
        reason: ambiguousMatches.length
          ? "Ambiguous name mapping; used the declared category image"
          : "No approved exact, alias, or subcategory mapping; used the declared category image",
        normalizedName,
        reviewRequired: true,
        ambiguousMatches,
        ignoredProvidedImage,
      };
    }
  }

  return {
    src: LOCAL_BRANDED_PRODUCT_FALLBACK,
    source: "branded-fallback",
    reason: ambiguousMatches.length
      ? "Ambiguous name mapping and no taxonomy image; used the local branded fallback"
      : "No approved mapping or taxonomy image; used the local branded fallback",
    normalizedName,
    reviewRequired: true,
    ambiguousMatches,
    ignoredProvidedImage,
  };
}

/**
 * Resolves a product image deterministically. It never uses fuzzy substring
 * matching and never treats remote seed URLs as authoritative.
 */
export function resolveProductImage(input: ProductImageResolverInput): ProductImageResolution {
  const normalizedName = normalizeProductImageKey(input.name || "unnamed-product");
  const providedImage = firstUsableImage(input);
  const systemProvided = isSystemProvided(input);

  if (providedImage && !systemProvided) {
    const approvedFallback = resolveProductImage({
      ...input,
      images: [],
      providedImage: null,
      imageOwnership: "system",
    });
    return {
      src: providedImage,
      fallbackSrc: approvedFallback.src,
      source: "seller-uploaded",
      reason: "Preserved the product image supplied by the seller",
      normalizedName,
      reviewRequired: false,
      ambiguousMatches: [],
    };
  }

  const exact = productImageRegistry[normalizedName];
  if (exact) {
    return {
      src: exact.localAssetPath,
      source: "exact-product",
      reason: "Matched the normalized product name in the canonical registry",
      normalizedName,
      matchedSlug: exact.slug,
      attribution: exact.attribution,
      reviewRequired: false,
      ambiguousMatches: [],
      ignoredProvidedImage: systemProvided ? providedImage : undefined,
    };
  }

  const aliasMatches = productImageAliasIndex[normalizedName] ?? [];
  if (aliasMatches.length === 1) {
    const match = productImageRegistry[aliasMatches[0]];
    return {
      src: match.localAssetPath,
      source: "alias",
      reason: `Matched approved alias to ${match.name}`,
      normalizedName,
      matchedSlug: match.slug,
      attribution: match.attribution,
      reviewRequired: false,
      ambiguousMatches: [],
      ignoredProvidedImage: systemProvided ? providedImage : undefined,
    };
  }

  return taxonomyFallback(
    input,
    normalizedName,
    aliasMatches,
    systemProvided ? providedImage : undefined,
  );
}

export function resolveProductImageForProduct(
  product: ProductImageLike,
  options?: { providedImage?: string | null; imageOwnership?: ProductImageResolverInput["imageOwnership"] },
): ProductImageResolution {
  return resolveProductImage({
    id: product.id,
    name: product.name?.trim() || "Unnamed product",
    categoryId: product.categoryId ?? undefined,
    subcategoryId: product.subcategoryId ?? undefined,
    images: product.images ?? undefined,
    providedImage: options?.providedImage,
    imageOwnership: options?.imageOwnership,
  });
}

/** Backward-compatible URL helper for taxonomy tiles and name-only records. */
export function getProductImage(
  productName: string,
  categoryId?: string,
  _size: "sm" | "md" | "lg" = "md",
  subcategoryId?: string,
): string {
  return resolveProductImage({
    name: productName,
    categoryId,
    subcategoryId,
    imageOwnership: "system",
  }).src;
}

export { LOCAL_BRANDED_PRODUCT_FALLBACK };
