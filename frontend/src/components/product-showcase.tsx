import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Star, Leaf, ShoppingCart, Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { getShoppableCategories, categoryImages } from "@/lib/categories";
import { getSubSubcategories } from "@/lib/sub-subcategories";
import { motion } from "framer-motion";
import type { Product } from "@shared/schema";
import { SafeProductImage } from "./safe-product-image";
import { resolveProductImageForProduct } from "@/lib/product-images";
import { normalizeProductImageKey } from "@/lib/product-image-registry";
import { FavoriteProductButton } from "./favorite-product-button";
import { useCurrency } from "@/contexts/currency-context";

interface ProductShowcaseProps {
  categoryId: string | null;
  subcategoryId: string | null;
  activeSection: string | null;
  searchQuery?: string;
  onAddToCart?: (product: Product) => void;
  onProductClick?: (product: Product) => void;
  onSectionVisible?: (sectionTitle: string) => void;
  onFarmerClick?: (farmerId: string) => void;
}

function displayNameForSubcategory(subcategoryId: string): string {
  for (const cat of getShoppableCategories()) {
    const sub = cat.subcategories.find((item) => item.id === subcategoryId);
    if (sub) return sub.name;
  }
  return subcategoryId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

interface ProductSection {
  title: string;
  products: Product[];
}

function HighlightedProductName({ name, query }: { name: string; query: string }) {
  const term = query.trim();
  const matchIndex = term ? name.toLocaleLowerCase().indexOf(term.toLocaleLowerCase()) : -1;

  if (matchIndex < 0) return <>{name}</>;

  return (
    <>
      {name.slice(0, matchIndex)}
      <mark className="rounded bg-amber-300 px-0.5 text-black">
        {name.slice(matchIndex, matchIndex + term.length)}
      </mark>
      {name.slice(matchIndex + term.length)}
    </>
  );
}

export function ProductShowcase({
  categoryId,
  subcategoryId,
  activeSection,
  searchQuery = "",
  onAddToCart,
  onProductClick,
  onSectionVisible,
  onFarmerClick
}: ProductShowcaseProps) {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const [visibleSection, setVisibleSection] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  if (categoryId) queryParams.set("categoryId", categoryId);
  if (subcategoryId) queryParams.set("subcategoryId", subcategoryId);
  if (searchQuery.trim()) queryParams.set("search", searchQuery.trim());
  const queryString = queryParams.toString();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: [queryString ? `/api/products?${queryString}` : "/api/products"],
  });
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();

  // Every section contains complete canonical API products. Taxonomy labels
  // without a matching backend product never become clickable commerce cards.
  const content = useMemo<ProductSection[]>(() => {
    if (normalizedSearch) {
      return products.length > 0
        ? [{ title: t("search.results", "Search Results"), products }]
        : [];
    }

    if (subcategoryId) {
      const deepContent = getSubSubcategories(subcategoryId);
      if (deepContent.length === 0) {
        return products.length > 0
          ? [{ title: displayNameForSubcategory(subcategoryId), products }]
          : [];
      }

      const remaining = new Map(products.map((product) => [product.id, product]));
      const sections = deepContent.map<ProductSection>((section) => {
        const normalizedNames = new Set(section.items.map(normalizeProductImageKey));
        const secTitleLower = section.title.toLowerCase();

        // 1. Match products by exact key, substring, or title overlap
        const matchingProducts = products.filter((product) => {
          if (!remaining.has(product.id)) return false;

          const normName = normalizeProductImageKey(product.name);
          if (normalizedNames.has(normName)) return true;

          const nameLower = product.name.toLowerCase();
          if (nameLower.includes(secTitleLower)) return true;

          return section.items.some((item) => {
            const itemLower = item.toLowerCase();
            return nameLower.includes(itemLower) || itemLower.includes(nameLower);
          });
        });

        matchingProducts.forEach((product) => remaining.delete(product.id));

        return {
          title: section.title,
          products: matchingProducts,
        };
      });

      const remainingProducts = Array.from(remaining.values());

      // Ensure NO section is empty — if a taxonomy section has no direct match, populate with remaining or all products
      sections.forEach((sec) => {
        if (sec.products.length === 0) {
          sec.products = remainingProducts.length > 0 ? remainingProducts : products;
        }
      });

      if (remainingProducts.length > 0 && sections.every(s => !s.products.some(p => remaining.has(p.id)))) {
        const leftover = remainingProducts.filter(p => !sections.some(s => s.products.some(sp => sp.id === p.id)));
        if (leftover.length > 0) {
          sections.push({
            title: t("product_showcase.available_products", "Available Products"),
            products: leftover,
          });
        }
      }

      return products.length > 0 ? sections : [];
    }

    if (categoryId) {
      const cat = getShoppableCategories().find((item) => item.id === categoryId);
      if (cat) {
        const knownSubcategoryIds = new Set(cat.subcategories.map((subcategory) => subcategory.id));
        const sections = cat.subcategories.flatMap<ProductSection>((subcategory) => {
          const matchingProducts = products.filter(
            (product) => product.subcategoryId === subcategory.id,
          );
          return matchingProducts.length > 0
            ? [{ title: subcategory.name, products: matchingProducts }]
            : [];
        });
        const remainingProducts = products.filter(
          (product) => !knownSubcategoryIds.has(product.subcategoryId),
        );

        if (remainingProducts.length > 0) {
          sections.push({
            title: t("product_showcase.available_products", "Available Products"),
            products: remainingProducts,
          });
        }

        return sections;
      }
    }

    return products.length > 0
      ? [{ title: t("product_showcase.available_products", "Available Products"), products }]
      : [];
  }, [subcategoryId, categoryId, normalizedSearch, products, t]);

  const displayName = useMemo(() => {
    if (searchQuery.trim()) return `Search results for “${searchQuery.trim()}”`;
    if (subcategoryId) {
      for (const cat of getShoppableCategories()) {
        const sub = cat.subcategories.find(s => s.id === subcategoryId);
        if (sub) return sub.name;
      }
    }
    if (categoryId) {
      const cat = getShoppableCategories().find(c => c.id === categoryId);
      if (cat) return cat.name;
    }
    return "Products";
  }, [subcategoryId, categoryId, searchQuery]);

  // Create stable ref callback per section title
  const createRefCallback = useCallback((title: string) => {
    return (el: HTMLDivElement | null) => {
      if (el) {
        sectionRefsMap.current.set(title, el);
      } else {
        sectionRefsMap.current.delete(title);
      }
    };
  }, []);

  const scrollToSection = useCallback((targetTitle: string) => {
    if (!targetTitle) return;
    const normalizeTitle = (title: string) => title.trim().replace(/\s+/g, " ").toLocaleLowerCase();
    const targetKey = normalizeTitle(targetTitle);
    let targetEl: HTMLDivElement | undefined;

    if (sectionRefsMap.current.has(targetTitle)) {
      targetEl = sectionRefsMap.current.get(targetTitle);
    } else {
      for (const [key, el] of Array.from(sectionRefsMap.current.entries())) {
        const normKey = normalizeTitle(key);
        if (normKey === targetKey || normKey.includes(targetKey) || targetKey.includes(normKey)) {
          targetEl = el;
          break;
        }
      }
    }

    if (targetEl) {
      const viewport = containerRef.current?.querySelector(
        "[data-radix-scroll-area-viewport]",
      ) as HTMLElement | null;

      if (viewport) {
        const viewportRect = viewport.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const targetTop = viewport.scrollTop + targetRect.top - viewportRect.top - 12;
        viewport.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
      } else {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, []);

  // Scroll to top when browsing context changes so search results start with the best match.
  useEffect(() => {
    if (containerRef.current) {
      const viewport = containerRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (viewport) {
        viewport.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [subcategoryId, categoryId, normalizedSearch]);

  // Scroll to section when activeSection changes from nav panel click or URL navigation
  useEffect(() => {
    if (activeSection && content.length > 0) {
      const timer = setTimeout(() => {
        scrollToSection(activeSection);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeSection, content, scrollToSection]);

  // Setup IntersectionObserver after content renders
  useEffect(() => {
    if (content.length === 0) return;
    
    // Delay to ensure refs are populated after render
    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const sectionTitle = entry.target.getAttribute('data-section');
              if (sectionTitle) {
                setVisibleSection(sectionTitle);
                onSectionVisible?.(sectionTitle);
              }
            }
          }
        },
        { threshold: 0.2, rootMargin: '-80px 0px -40% 0px' }
      );

      sectionRefsMap.current.forEach((el) => {
        observer.observe(el);
      });

      return () => observer.disconnect();
    }, 150);

    return () => clearTimeout(timer);
  }, [content, onSectionVisible]);

  // Show placeholder when no category selected
  if (!categoryId && !subcategoryId && !normalizedSearch) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Package className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-foreground mb-2">{t("category.browse_by_category")}</h3>
          <p className="text-muted-foreground text-sm">
            {t("category.explore_description")}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        <Skeleton className="h-[180px] w-full rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" ref={containerRef}>
      {/* Stats Bar */}
      <div className="flex-shrink-0 bg-muted/40 border-b border-border/60 px-4 py-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-3 text-sm sm:text-base font-black text-foreground">
            <div className="flex items-center gap-2 bg-amber-500/15 text-amber-950 dark:text-amber-200 border-2 border-amber-500/40 px-4 py-2 rounded-xl shadow-xs">
              <Package className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-black text-sm sm:text-base uppercase tracking-wide">
                {products.length} {products.length === 1 ? "item" : "items"}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-500/15 text-emerald-950 dark:text-emerald-200 border-2 border-emerald-500/40 px-4 py-2 rounded-xl shadow-xs">
              <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-black text-sm sm:text-base uppercase tracking-wide">{new Set(products.map(p => p.farmerId)).size} {t("features.farmers_label")}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs sm:text-sm font-black uppercase tracking-wide gap-2 h-9 px-4 bg-emerald-600 text-white border-0 shadow-md">
              <Truck className="h-4.5 w-4.5 text-white" />
              {t("product_showcase.same_day_delivery")}
            </Badge>
          </div>
        </div>
      </div>

      {/* Product Sections */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-background to-amber-50/50 dark:from-emerald-950/30 dark:via-background dark:to-amber-950/20 border-2 border-emerald-300 shadow-md">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {categoryId && (
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl overflow-hidden shadow-xs ring-2 ring-emerald-400/50 bg-emerald-500/10 shrink-0 flex items-center justify-center">
                  <img
                    src={categoryImages[categoryId] || `/category-logos/${categoryId}.svg`}
                    alt={displayName}
                    className="h-full w-full object-cover rounded-2xl"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-tight mb-2 truncate">{displayName}</h1>
                <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm font-black">
                  <span className="px-3 py-1 rounded-lg bg-amber-400 text-amber-950 font-black shadow-2xs border border-amber-500/50">
                    {content.length} {content.length === 1 ? "category" : "categories"}
                  </span>
                  <span className="text-foreground/40 font-bold">•</span>
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-black shadow-2xs">
                    {content.reduce((acc, c) => acc + c.products.length, 0)} items
                  </span>
                </div>
              </div>
            </div>
          </div>

          {content.length === 0 && (
            <div className="flex min-h-64 items-center justify-center rounded-lg border border-border/40 bg-muted/10 p-8">
              <div className="max-w-sm text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <h2 className="font-semibold">{t("product_grid.no_products_title")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("product_showcase.no_products_available", "No catalog products are currently available in this category.")}
                </p>
              </div>
            </div>
          )}

          {/* Product Sections by Category */}
          {content.map((section, sectionIdx) => (
            <motion.div
              key={section.title}
              ref={createRefCallback(section.title)}
              data-section={section.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sectionIdx * 0.03, duration: 0.15 }}
              className={`scroll-mt-16 p-2 rounded-lg transition-all duration-150 ${
                visibleSection === section.title ? 'ring-1 ring-primary/20 bg-primary/5 shadow-xs' : ''
              }`}
            >
              {/* Section Header */}
              <div className="flex items-center gap-2.5 mb-3 px-1">
                <div className="h-3.5 w-3.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.7)] shrink-0" />
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-foreground">
                  {section.title}
                </h2>
                <div className="flex-1 h-0.5 bg-gradient-to-r from-amber-500/40 via-border to-transparent rounded-full ml-1" />
                <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-xs sm:text-sm font-black text-primary shadow-2xs">
                  {section.products.length} items
                </span>
              </div>

              {/* Product Grid */}
              <div data-product-grid="showcase" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
                {section.products.map((product, itemIdx) => {
                  const imageResolution = resolveProductImageForProduct(product);
                  const isNameMatch = Boolean(
                    normalizedSearch && product.name.toLocaleLowerCase().includes(normalizedSearch),
                  );
                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: sectionIdx * 0.02 + itemIdx * 0.01, duration: 0.15 }}
                    >
                      <Card data-product-tile data-product-name={product.name.toLowerCase()} className={`overflow-hidden group hover:shadow-xl border-2 bg-card hover:border-primary/60 transition-all duration-200 active:scale-[0.98] cursor-pointer scroll-mt-20 rounded-2xl shadow-md flex flex-col justify-between h-full ${
                        isNameMatch ? "border-amber-400 ring-2 ring-amber-300/60" : "border-border/80"
                      }`} onClick={() => onProductClick?.(product)}>
                        {/* Product Image */}
                        <div className="relative aspect-square bg-muted/20 overflow-hidden">
                          <SafeProductImage src={imageResolution.src} fallbackSrc={imageResolution.fallbackSrc} alt={`${product.name} product image`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          
                          {/* Badges */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                            {isNameMatch && (
                              <Badge className="text-xs px-2.5 py-1 bg-amber-400 text-black font-black uppercase tracking-wider border-0 shadow-md rounded-lg">
                                Search match
                              </Badge>
                            )}
                            {product.isOrganic && (
                              <Badge className="text-xs px-2.5 py-1 bg-green-700 text-white font-black uppercase tracking-wider border-0 shadow-md rounded-lg">
                                {t("product.org_short")}
                              </Badge>
                            )}
                          </div>

                          {/* Quick Action Buttons */}
                          <FavoriteProductButton
                            productId={product.id}
                            productName={product.name}
                            className="!absolute right-2 top-2 h-9 w-9 border-2 border-border/60 bg-background/95 shadow-md hover:bg-red-50"
                            data-testid={`button-showcase-favorite-${sectionIdx}-${itemIdx}`}
                          />
                          <Button
                            size="icon"
                            className="absolute bottom-2 right-2 h-9 w-9 shadow-md bg-amber-400 hover:bg-amber-500 text-black border-2 border-black/20 font-black"
                            onClick={(e) => { e.stopPropagation(); onAddToCart?.(product); }}
                            data-testid={`button-quick-add-${product.id}`}
                            title={t("product.add_to_cart")}
                          >
                            <ShoppingCart className="h-4.5 w-4.5 text-black" />
                          </Button>
                        </div>

                        {/* Product Info */}
                        <CardContent className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
                          <div>
                            <h3 className="font-black text-base sm:text-lg text-foreground line-clamp-2 leading-tight mb-2 group-hover:text-primary transition-colors tracking-tight">
                              <HighlightedProductName name={product.name} query={searchQuery} />
                            </h3>

                            {/* Price & Rating */}
                            <div className="flex items-baseline justify-between gap-2 my-2 flex-wrap">
                              <div className="inline-flex items-baseline flex-wrap min-w-0">
                                <span className="font-black text-lg sm:text-xl text-amber-600 dark:text-amber-400 tracking-tight font-mono whitespace-nowrap">
                                  {format(product.price, {
                                    sourceCurrency: product.currency || "GBP",
                                    includeCode: true,
                                  })}
                                </span>
                                <span className="text-xs sm:text-sm font-black text-muted-foreground ml-1 whitespace-nowrap">/{product.unit}</span>
                              </div>
                              <div className="flex items-center gap-1 bg-amber-400/20 border border-amber-400/50 px-2 py-0.5 rounded-lg shadow-2xs shrink-0">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                <span className="text-xs font-black text-foreground">{product.farmerRating.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Add to Cart button */}
                          <Button
                            size="sm"
                            className="w-full mt-1 h-10 sm:h-11 px-4 text-xs sm:text-sm font-black uppercase tracking-wider gap-2 bg-amber-400 hover:bg-amber-500 text-black shadow-md rounded-xl border border-amber-500/40"
                            onClick={(e) => { e.stopPropagation(); onAddToCart?.(product); }}
                            data-testid={`button-tile-add-${product.id}`}
                          >
                            <ShoppingCart className="h-4 w-4 text-black" />
                            {t("product.add_short")}
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}

          {/* AgriConnect Featured Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 p-5 rounded-2xl bg-gradient-to-r from-primary/15 via-green-500/10 to-amber-500/10 border-2 border-primary/30 shadow-md"
          >
            <div className="flex items-center gap-3.5 mb-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-green-700 shadow-md flex items-center justify-center shrink-0">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-black text-base sm:text-lg text-foreground tracking-tight">{t("product_showcase.badge")}</h3>
                <p className="text-xs sm:text-sm font-extrabold text-emerald-700 dark:text-emerald-400">{t("product_showcase.verified_farmers")}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-background border border-primary/20 shadow-xs flex flex-col items-center justify-center">
                <div className="font-black text-xl sm:text-2xl text-primary leading-none mb-1">{products.length}+</div>
                <div className="font-extrabold text-xs sm:text-sm uppercase tracking-wide text-foreground">{t("features.products_label")}</div>
              </div>
              <div className="p-3 rounded-xl bg-background border border-primary/20 shadow-xs flex flex-col items-center justify-center">
                <div className="font-black text-xl sm:text-2xl text-primary leading-none mb-1">100%</div>
                <div className="font-extrabold text-xs sm:text-sm uppercase tracking-wide text-foreground">{t("common.verified")}</div>
              </div>
              <div className="p-3 rounded-xl bg-background border border-primary/20 shadow-xs flex flex-col items-center justify-center">
                <div className="font-black text-xl sm:text-2xl text-primary leading-none mb-1">3-5 Days</div>
                <div className="font-extrabold text-xs sm:text-sm uppercase tracking-wide text-foreground">{t("product_showcase.same_day_delivery")}</div>
              </div>
            </div>
          </motion.div>
        </div>
      </ScrollArea>
    </div>
  );
}
