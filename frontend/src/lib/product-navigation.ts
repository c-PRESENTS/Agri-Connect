import type { Product } from "@shared/schema";

export type ProductBrowseContext = {
  categoryId?: string | null;
  subcategoryId?: string | null;
  section?: string | null;
};

export type ResolvedProductBrowseContext = {
  categoryId: string;
  subcategoryId?: string;
  section?: string;
};

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function buildProductDetailUrl(
  product: Pick<Product, "id" | "categoryId" | "subcategoryId">,
  context: ProductBrowseContext = {},
) {
  const params = new URLSearchParams();
  const categoryId = clean(context.categoryId) || clean(product.categoryId);
  const hasSubcategoryContext = Object.prototype.hasOwnProperty.call(context, "subcategoryId");
  const subcategoryId = hasSubcategoryContext
    ? clean(context.subcategoryId)
    : clean(product.subcategoryId);
  const section = clean(context.section);

  if (categoryId) params.set("fromCategory", categoryId);
  if (subcategoryId) params.set("fromSubcategory", subcategoryId);
  if (section) params.set("fromSection", section);

  const query = params.toString();
  return `/products/${encodeURIComponent(product.id)}${query ? `?${query}` : ""}`;
}

export function getProductBrowseContext(
  search: string,
  product: Pick<Product, "categoryId" | "subcategoryId">,
): ResolvedProductBrowseContext {
  const params = new URLSearchParams(search);
  const originCategory = clean(params.get("fromCategory"));
  return {
    categoryId: originCategory || clean(product.categoryId) || "daily-needs",
    // When an originating category is present without a subcategory, preserve
    // that main-category view instead of narrowing it to the product's own
    // subcategory. Direct product URLs still fall back to product metadata.
    subcategoryId:
      clean(params.get("fromSubcategory")) ||
      (originCategory ? undefined : clean(product.subcategoryId)),
    section: clean(params.get("fromSection")),
  };
}

export function buildCategoryBrowseUrl(context: ProductBrowseContext) {
  const params = new URLSearchParams();
  const categoryId = clean(context.categoryId) || "daily-needs";
  const subcategoryId = clean(context.subcategoryId);
  const section = clean(context.section);

  params.set("category", categoryId);
  if (subcategoryId) params.set("subcategory", subcategoryId);
  if (section) params.set("section", section);

  return `/?${params.toString()}`;
}
