import { useQuery } from "@tanstack/react-query";
import type { Category } from "@shared/schema";

export function useCatalogCategories(audience: "buyer" | "seller" = "buyer") {
  return useQuery<Category[]>({
    queryKey: [`/api/catalog/categories?audience=${audience}`],
    staleTime: 60_000,
  });
}

export function buyerCategories(categories: readonly Category[]): Category[] {
  return categories
    .filter((category) => category.buyerVisible !== false)
    .map((category) => ({
      ...category,
      subcategories: category.subcategories.filter((subcategory) => subcategory.buyerVisible !== false),
    }));
}

export function isPublishedShoppableCategory(categories: readonly Category[], categoryId: string): boolean {
  return buyerCategories(categories).some((category) => category.id === categoryId);
}
