import { useMemo, useRef, useEffect, useState, memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin, Star, Leaf, ShoppingCart, Package, SlidersHorizontal,
  ChevronRight, ShieldCheck, MoreHorizontal, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { resolveCategoryImage, handleCategoryImageError, categories as staticCategories } from "@/lib/categories";
import { useCatalogCategories } from "@/hooks/use-catalog-categories";
import type { Product } from "@shared/schema";
import { resolveProductImageForProduct } from "@/lib/product-images";
import { FavoriteProductButton } from "./favorite-product-button";
import { useCurrency } from "@/contexts/currency-context";
import { useLiveLocation } from "@/contexts/live-location-context";
import { getSubSubcategories, type SubSubItem } from "@/lib/sub-subcategories";

interface ProductShowcaseProps {
  categoryId: string | null;
  subcategoryId: string | null;
  activeSection?: string | null;
  searchQuery?: string;
  onAddToCart?: (product: Product) => void;
  onProductClick?: (product: Product) => void;
  onSectionVisible?: (sectionTitle: string) => void;
  onFarmerClick?: (farmerId: string) => void;
  onSubcategoryChange?: (subcategoryId: string | null) => void;
  onSectionChange?: (sectionTitle: string | null) => void;
}

function productMatchesSection(product: Product, section: SubSubItem): boolean {
  const pName = (product.name || "").toLowerCase();
  const pDesc = (product.description || "").toLowerCase();
  const pSub = (product.subcategoryId || "").toLowerCase();
  const secTitle = section.title.toLowerCase();

  if (pName.includes(secTitle) || pDesc.includes(secTitle) || pSub.includes(secTitle)) {
    return true;
  }
  const rootSecTitle = secTitle.replace(/s$/, "");
  if (rootSecTitle.length > 3 && (pName.includes(rootSecTitle) || pDesc.includes(rootSecTitle))) {
    return true;
  }

  return section.items.some((item) => {
    const itemLower = item.toLowerCase();
    const cleanItem = itemLower.replace(/\s*\(.*?\)\s*/g, "").trim();
    return (
      pName.includes(itemLower) ||
      pDesc.includes(itemLower) ||
      pName.includes(cleanItem) ||
      cleanItem.includes(pName) ||
      itemLower.includes(pName)
    );
  });
}

const SUBCATEGORY_ICONS: Record<string, string> = {
  "pulses-lentils": "/category-logos/daily-needs.svg",
  "grains-cereals": "/category-logos/other-agri.svg",
  "cooking-oils": "/category-logos/processed.svg",
  "vegetables": "/category-logos/fresh-produce.svg",
  "fruits": "/category-logos/fresh-produce.svg",
  "dairy-eggs": "/category-logos/dairy.svg",
  "meat-poultry": "/category-logos/livestock.svg",
  "spices-condiments": "/category-logos/specialty.svg",
};

interface CardProps {
  product: Product;
  idx: number;
  cityName: string;
  isAdded: boolean;
  onAdd: (e: React.MouseEvent, product: Product) => void;
  onClick?: (product: Product) => void;
}

const ShowcaseProductCard = memo(function ShowcaseProductCard({
  product,
  idx,
  cityName,
  isAdded,
  onAdd,
  onClick,
}: CardProps) {
  const { format } = useCurrency();
  const img = useMemo(() => resolveProductImageForProduct(product), [product]);

  const isFreshPick = idx % 2 === 0 || Boolean(product.isOrganic);
  const isBestseller = idx % 3 === 1 || Boolean(product.isFeatured);

  const discountPct = idx % 3 === 0 ? 13 : idx % 3 === 1 ? 17 : 10;
  const originalPrice = product.price ? product.price * (1 + discountPct / 100) : null;

  const formattedPrice = useMemo(() => {
    return format(product.price, { sourceCurrency: product.currency || "GBP" });
  }, [format, product.price, product.currency]);

  const formattedOriginalPrice = useMemo(() => {
    return originalPrice ? format(originalPrice, { sourceCurrency: product.currency || "GBP" }) : null;
  }, [format, originalPrice, product.currency]);

  const hasRealSeller = Boolean(
    product.farmerName?.trim() &&
    !product.farmerId?.startsWith("farmer-") &&
    !product.farmerId?.startsWith("catalog-") &&
    product.farmerName !== "Verified Seller" &&
    product.farmerName !== "Green Fields Farm"
  );
  const sellerTitle = hasRealSeller ? product.farmerName!.trim() : "";
  const sellerLoc = product.farmerLocation || cityName;
  const sellerDist = typeof product.distance === "number" ? product.distance : 0;
  const rating =
    typeof product.farmerRating === "number" && product.farmerRating > 0
      ? product.farmerRating
      : product.rating || 4.6;
  const reviewCount = product.reviewCount || 70 + ((idx * 17) % 60);

  return (
    <div
      onClick={() => onClick?.(product)}
      className="group rounded-2xl border border-slate-200/90 dark:border-border/80 bg-white dark:bg-card overflow-hidden shadow-2xs hover:shadow-md hover:border-emerald-500/50 transition-all duration-200 flex flex-col justify-between cursor-pointer"
      data-testid={`product-card-${product.id}`}
    >
      {/* Image Area with Badge & Heart Button */}
      <div className="relative aspect-[16/10] bg-slate-100 dark:bg-muted overflow-hidden">
        <img
          src={img.src}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = img.fallbackSrc || img.src;
          }}
        />

        {/* Top Left Badge */}
        <div className="absolute top-2 left-2 z-10">
          {isBestseller ? (
            <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs leading-none">
              Bestseller
            </span>
          ) : isFreshPick ? (
            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs leading-none">
              Fresh Pick
            </span>
          ) : null}
        </div>

        {/* Top Right Wishlist Heart */}
        <div className="absolute top-2 right-2 z-10">
          <FavoriteProductButton
            productId={product.id}
            productName={product.name}
            className="h-7 w-7 rounded-full bg-white/90 dark:bg-card/90 border border-slate-200/80 shadow-2xs flex items-center justify-center text-red-500 hover:scale-105 transition-transform"
          />
        </div>
      </div>

      {/* Card Body Details */}
      <div className="p-4 sm:p-4.5 flex flex-col flex-1 justify-between gap-3">
        <div>
          {/* Title & Unit */}
          <h3 className="font-black text-sm sm:text-base md:text-lg text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
            {product.name}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold mt-0.5">
            {product.unit || "500g"}
          </p>

          {/* Price Row */}
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-lg sm:text-xl font-black text-emerald-800 dark:text-emerald-400">
              {formattedPrice}
            </span>
            {formattedOriginalPrice && (
              <span className="text-xs sm:text-sm text-slate-400 line-through font-semibold">
                {formattedOriginalPrice}
              </span>
            )}
            <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md">
              {discountPct}% OFF
            </span>
          </div>

          {/* Seller / Source Name & Location */}
          <div className="mt-2.5 text-xs sm:text-sm">
            <p className="font-black text-slate-800 dark:text-slate-100 truncate">
              {hasRealSeller ? sellerTitle : "Direct Marketplace"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 truncate font-semibold">
              <MapPin className={`h-3.5 w-3.5 ${hasRealSeller ? "text-red-400" : "text-emerald-500"} shrink-0`} />
              <span>
                {hasRealSeller ? `${sellerLoc} • ${sellerDist.toFixed(0)} km` : "Verified Direct Source"}
              </span>
            </p>
          </div>

          {/* Rating & Verified Status */}
          <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-border/40 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-black text-slate-900 dark:text-slate-100">
                {rating.toFixed(1)}
              </span>
              <span className="text-slate-400 font-bold">({reviewCount})</span>
            </div>

            <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-black">
              <ShieldCheck className="h-4 w-4" />
              <span>Verified</span>
            </div>
          </div>
        </div>

        {/* Full-width Add to Cart button */}
        <Button
          onClick={(e) => onAdd(e, product)}
          className="w-full mt-2 h-10 bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-2xs gap-2 transition-colors cursor-pointer"
          data-testid={`button-add-cart-${product.id}`}
        >
          {isAdded ? (
            <>
              <Check className="h-4 w-4 stroke-[3]" />
              <span>Added to Cart</span>
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              <span>Add to Cart</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
});

export function ProductShowcase({
  categoryId,
  subcategoryId: initialSubcategory,
  activeSection,
  searchQuery = "",
  onAddToCart,
  onProductClick,
  onSubcategoryChange,
  onSectionChange,
}: ProductShowcaseProps) {
  const { t } = useTranslation();
  const { data: publishedCategories = [] } = useCatalogCategories("buyer");
  const { format } = useCurrency();
  const { location: liveLoc } = useLiveLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(initialSubcategory);
  const [sortBy, setSortBy] = useState<string>("relevance");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [onlyOrganic, setOnlyOrganic] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const cityName = liveLoc?.label || "Coimbatore, TN";

  useEffect(() => {
    setSelectedSubcategory(initialSubcategory || null);
  }, [categoryId, initialSubcategory]);

  const allKnownCategories = useMemo(() => {
    return publishedCategories.length > 0 ? publishedCategories : staticCategories;
  }, [publishedCategories]);

  const effectiveCategory = useMemo(() => {
    if (!categoryId) return allKnownCategories[0] || null;
    return (
      allKnownCategories.find((c) => c.id === categoryId) ||
      staticCategories.find((c) => c.id === categoryId) ||
      allKnownCategories[0] ||
      null
    );
  }, [allKnownCategories, categoryId]);

  const subcategoriesList = useMemo(() => {
    if (!effectiveCategory) return [];
    return effectiveCategory.subcategories || [];
  }, [effectiveCategory]);

  const validSubcategory = useMemo(() => {
    if (!selectedSubcategory) return null;
    return subcategoriesList.some((s) => s.id === selectedSubcategory) ? selectedSubcategory : null;
  }, [selectedSubcategory, subcategoriesList]);

  // Sub-sections (Level 3 items: Cookware, Storage, Cleaning, Appliances, etc.)
  const availableSections = useMemo(() => {
    if (!validSubcategory) return [];
    return getSubSubcategories(validSubcategory);
  }, [validSubcategory]);

  const activeSectionItem = useMemo(() => {
    if (!activeSection || availableSections.length === 0) return null;
    return (
      availableSections.find(
        (s) => s.title.toLowerCase() === activeSection.toLowerCase()
      ) || null
    );
  }, [activeSection, availableSections]);

  const queryParams = new URLSearchParams();
  if (categoryId) queryParams.set("categoryId", categoryId);
  if (validSubcategory) queryParams.set("subcategoryId", validSubcategory);
  if (searchQuery.trim()) queryParams.set("search", searchQuery.trim());
  const queryString = queryParams.toString();

  const { data: allProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: [queryString ? `/api/products?${queryString}` : "/api/products"],
    staleTime: 30_000,
  });

  // Sort & Filter products
  const products = useMemo(() => {
    let list = [...allProducts];

    if (onlyOrganic) {
      list = list.filter((p) => p.isOrganic);
    }

    if (activeSectionItem) {
      const sectionFiltered = list.filter((p) => productMatchesSection(p, activeSectionItem));
      if (sectionFiltered.length > 0) {
        list = sectionFiltered;
      }
    }

    if (sortBy === "price_asc") {
      list.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === "rating") {
      list.sort((a, b) => (b.rating || 4.5) - (a.rating || 4.5));
    } else if (sortBy === "distance") {
      list.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    return list;
  }, [allProducts, sortBy, onlyOrganic, activeSectionItem]);

  // Distinct verified sellers count
  const verifiedSellersCount = useMemo(() => {
    const sellerIds = new Set(
      products
        .filter(
          (p) =>
            p.farmerId &&
            !p.farmerId.startsWith("farmer-") &&
            !p.farmerId.startsWith("catalog-") &&
            p.farmerName?.trim() &&
            p.farmerName !== "Verified Seller" &&
            p.farmerName !== "Green Fields Farm",
        )
        .map((p) => p.farmerId),
    );
    return sellerIds.size;
  }, [products]);

  // Stable Add to cart callback
  const handleAdd = useCallback(
    (e: React.MouseEvent, product: Product) => {
      e.stopPropagation();
      setAddedIds((prev) => new Set(prev).add(product.id));
      onAddToCart?.(product);
      setTimeout(() => {
        setAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(product.id);
          return next;
        });
      }, 1000);
    },
    [onAddToCart],
  );

  const handleSubcategoryClick = useCallback(
    (subId: string | null) => {
      setSelectedSubcategory(subId);
      onSubcategoryChange?.(subId || "");
    },
    [onSubcategoryChange],
  );

  // Active Category or Subcategory Title
  const activeTitle = useMemo(() => {
    if (searchQuery.trim()) return `Search: “${searchQuery.trim()}”`;
    if (selectedSubcategory) {
      const sub = subcategoriesList.find((s) => s.id === selectedSubcategory);
      if (sub) return sub.name;
    }
    if (effectiveCategory) return effectiveCategory.name;
    return "Pulses & Lentils";
  }, [searchQuery, selectedSubcategory, subcategoriesList, effectiveCategory]);

  // Fresh Picks Near You (bottom strip)
  const freshPicks = useMemo(() => {
    return allProducts.slice(0, 8);
  }, [allProducts]);

  return (
    <div
      className="flex-1 flex flex-col h-full bg-slate-50/60 dark:bg-background overflow-hidden"
      ref={containerRef}
    >
      {/* ─── 1. TOP SUBCATEGORY PILLS STRIP ─── */}
      <div className="bg-white dark:bg-card border-b border-slate-200/80 dark:border-border/60 px-4 py-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-0.5">
          {/* "All" category pill */}
          <button
            type="button"
            onClick={() => handleSubcategoryClick(null)}
            className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all shrink-0 min-w-[80px] sm:min-w-[92px] ${
              selectedSubcategory === null
                ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs ring-1 ring-emerald-500/50"
                : "border-slate-200/80 dark:border-border/60 bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-muted/40"
            }`}
          >
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-1 shadow-2xs overflow-hidden">
              <Leaf className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <span
              className={`text-[11px] font-bold text-center leading-tight ${
                selectedSubcategory === null
                  ? "text-emerald-900 dark:text-emerald-300 font-black"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              All Items
            </span>
          </button>

          {/* Subcategories list */}
          {subcategoriesList.map((sub) => {
            const isSelected = selectedSubcategory === sub.id;
            const subImage =
              resolveCategoryImage(sub.id, sub.imageUrl) ||
              SUBCATEGORY_ICONS[sub.id] ||
              `/category-logos/${effectiveCategory?.id || "daily-needs"}.svg`;

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => handleSubcategoryClick(sub.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all shrink-0 min-w-[84px] sm:min-w-[96px] ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs ring-1 ring-emerald-500/50"
                    : "border-slate-200/80 dark:border-border/60 bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-muted/40"
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-muted flex items-center justify-center mb-1 shadow-2xs overflow-hidden">
                  <img
                    src={subImage}
                    alt={sub.name}
                    className="h-8 w-8 object-contain"
                    onError={(e) => handleCategoryImageError(e.currentTarget, sub.id)}
                  />
                </div>
                <span
                  className={`text-[11px] font-bold text-center leading-tight line-clamp-2 ${
                    isSelected
                      ? "text-emerald-900 dark:text-emerald-300 font-black"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {sub.name}
                </span>
              </button>
            );
          })}

          {/* "More" Pill */}
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="flex flex-col items-center justify-center p-2 rounded-2xl border border-slate-200/80 dark:border-border/60 bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-muted/40 transition-all shrink-0 min-w-[76px]"
          >
            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-muted flex items-center justify-center mb-1 shadow-2xs">
              <MoreHorizontal className="h-5 w-5 text-slate-500" />
            </div>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 text-center leading-tight">
              More
            </span>
          </button>
        </div>

        {/* ─── 1.5. SUB-SECTIONS PILL BAR (LEVEL 3 SECTIONS) ─── */}
        {availableSections.length > 0 && (
          <div className="px-3 sm:px-6 py-2 border-t border-slate-200/60 dark:border-border/40 bg-slate-50/70 dark:bg-muted/20">
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:none">
              <span className="text-[10.5px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider shrink-0 mr-1">
                Sections:
              </span>

              {/* "All Sections" Pill */}
              <button
                type="button"
                onClick={() => onSectionChange?.(null)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                  !activeSectionItem
                    ? "bg-amber-400 text-amber-950 border-amber-500 shadow-2xs font-black dark:bg-amber-400 dark:text-amber-950"
                    : "bg-white dark:bg-card text-slate-700 dark:text-slate-300 border-slate-200 dark:border-border/80 hover:border-emerald-500 hover:text-emerald-800"
                }`}
              >
                All Sections ({allProducts.length})
              </button>

              {availableSections.map((sec) => {
                const isSecActive = activeSectionItem?.title.toLowerCase() === sec.title.toLowerCase();
                const count = allProducts.filter((p) => productMatchesSection(p, sec)).length;
                return (
                  <button
                    key={sec.title}
                    type="button"
                    onClick={() => {
                      if (isSecActive) {
                        onSectionChange?.(null);
                      } else {
                        onSectionChange?.(sec.title);
                      }
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 border flex items-center gap-1.5 ${
                      isSecActive
                        ? "bg-amber-400 text-amber-950 border-amber-500 shadow-2xs font-black dark:bg-amber-400 dark:text-amber-950"
                        : "bg-white dark:bg-card text-slate-700 dark:text-slate-300 border-slate-200 dark:border-border/80 hover:border-emerald-500 hover:text-emerald-800"
                    }`}
                  >
                    <span>{sec.title}</span>
                    {count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                          isSecActive
                            ? "bg-amber-500/40 text-amber-950"
                            : "bg-slate-100 dark:bg-muted text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── SCROLLABLE MAIN PRODUCT SHOWCASE AREA ─── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
          {/* ─── 2. CATEGORY HEADER & CONTROLS ─── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-card p-4 rounded-2xl border border-slate-200/80 dark:border-border/60 shadow-2xs">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {activeTitle}
                </h1>
                {activeSectionItem && (
                  <span className="bg-amber-100 text-amber-950 dark:bg-amber-950/80 dark:text-amber-300 text-xs font-black px-2.5 py-0.5 rounded-full border border-amber-400/80 flex items-center gap-1.5 shadow-2xs">
                    <span>{activeSectionItem.title}</span>
                    <button
                      type="button"
                      onClick={() => onSectionChange?.(null)}
                      className="ml-0.5 text-amber-800 hover:text-red-600 dark:text-amber-300 dark:hover:text-red-400 font-black leading-none"
                      title="Clear section filter"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                {products.length} item{products.length === 1 ? "" : "s"} {verifiedSellersCount > 0 ? `from ${verifiedSellersCount} verified sellers` : "available in marketplace"}
                {activeSectionItem && ` in ${activeSectionItem.title}`}
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              {/* Sort by dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-muted px-2.5 py-1 rounded-xl border border-slate-200/60 dark:border-border/40">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Sort by:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-7 border-0 bg-transparent shadow-none text-xs font-black text-slate-800 dark:text-slate-200 p-0 focus:ring-0">
                    <SelectValue placeholder="Relevance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance" className="text-xs font-bold">
                      Relevance
                    </SelectItem>
                    <SelectItem value="price_asc" className="text-xs font-bold">
                      Price: Low to High
                    </SelectItem>
                    <SelectItem value="price_desc" className="text-xs font-bold">
                      Price: High to Low
                    </SelectItem>
                    <SelectItem value="rating" className="text-xs font-bold">
                      Customer Rating
                    </SelectItem>
                    <SelectItem value="distance" className="text-xs font-bold">
                      Distance: Nearest
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filters button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterOpen(true)}
                className={`h-9 px-3 rounded-xl text-xs font-bold border-slate-200/80 dark:border-border/60 gap-1.5 shadow-2xs ${
                  onlyOrganic
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-black"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filters</span>
                {onlyOrganic && <span className="h-2 w-2 rounded-full bg-emerald-600" />}
              </Button>
            </div>
          </div>

          {/* ─── 3. PRODUCT CARDS GRID (3 CARDS PER SLIDE/ROW) ─── */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-200 p-3.5 space-y-3 bg-white">
                  <Skeleton className="aspect-[16/10] w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-9 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-card rounded-2xl border border-slate-200/80 shadow-2xs">
              <Package className="h-10 w-10 text-slate-400 mx-auto mb-2 opacity-60" />
              <h3 className="font-black text-slate-800 dark:text-slate-200">No products found</h3>
              <p className="text-xs text-slate-400 mt-1">
                Try selecting another subcategory or adjusting filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {products.map((product, idx) => (
                <ShowcaseProductCard
                  key={product.id}
                  product={product}
                  idx={idx}
                  cityName={cityName}
                  isAdded={addedIds.has(product.id)}
                  onAdd={handleAdd}
                  onClick={onProductClick}
                />
              ))}
            </div>
          )}

          {/* ─── 4. BOTTOM "FRESH PICKS NEAR YOU" STRIP ─── */}
          <div className="bg-white dark:bg-card rounded-2xl border border-slate-200/80 dark:border-border/60 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Leaf className="h-4 w-4 text-emerald-600" />
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-slate-100">
                  Fresh Picks Near You
                </h3>
                <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
                  • {freshPicks.length} fresh products available
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSubcategory(null)}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>View All</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
              {freshPicks.map((item, idx) => {
                const img = resolveProductImageForProduct(item);
                const dist = (idx * 0.4 + 1.2).toFixed(1);
                const rating = (4.5 + (idx % 4) * 0.1).toFixed(1);

                return (
                  <div
                    key={`fresh-${item.id}`}
                    onClick={() => onProductClick?.(item)}
                    className="flex items-center gap-3 p-2 rounded-xl border border-slate-200/70 dark:border-border/60 bg-slate-50/50 dark:bg-muted/30 hover:bg-slate-100 dark:hover:bg-muted/60 transition-all shrink-0 min-w-[200px] sm:min-w-[220px] cursor-pointer group"
                  >
                    <img
                      src={img.src}
                      alt={item.name}
                      className="h-12 w-12 rounded-lg object-cover bg-white shadow-2xs group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = img.fallbackSrc || img.src;
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-xs text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-700 transition-colors">
                        {item.name}
                      </h4>
                      <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400">
                        {format(item.price, { sourceCurrency: item.currency || "GBP" })}
                        <span className="text-slate-400 font-semibold text-[10px]">
                          {" "}
                          / {item.unit || "pack"}
                        </span>
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mt-0.5">
                        <span>{dist} km</span>
                        <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                          <Star className="h-2.5 w-2.5 fill-amber-400" />
                          {rating}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── FILTERS SHEET MODAL ─── */}
      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent side="right" className="w-80 p-6 space-y-5">
          <SheetHeader>
            <SheetTitle className="font-black text-lg">Filter Products</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-500">Dietary & Quality</label>
              <button
                type="button"
                onClick={() => setOnlyOrganic((v) => !v)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${
                  onlyOrganic
                    ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>Certified Organic Only</span>
                {onlyOrganic && <Check className="h-4 w-4 text-emerald-600" />}
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-500">Sort Ordering</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="distance">Nearest Distance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => setIsFilterOpen(false)}
              className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-black rounded-xl h-10 mt-4"
            >
              Apply Filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
