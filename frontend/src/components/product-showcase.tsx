import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Star, Leaf, ShoppingCart, Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { getShoppableCategories } from "@/lib/categories";
import { getSubSubcategories } from "@/lib/sub-subcategories";
import { motion } from "framer-motion";
import type { Product } from "@shared/schema";
import { SafeProductImage } from "./safe-product-image";
import { resolveProductImage } from "@/lib/product-images";
import { FavoriteProductButton } from "./favorite-product-button";
import { useCurrency } from "@/contexts/currency-context";

interface ProductShowcaseProps {
  categoryId: string | null;
  subcategoryId: string | null;
  activeSection: string | null;
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

function normalizeProductName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function ProductShowcase({
  categoryId,
  subcategoryId,
  activeSection,
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
  const queryString = queryParams.toString();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: [queryString ? `/api/products?${queryString}` : "/api/products"],
  });

  // Taxonomy supplies section headings only. Every rendered card is built from
  // one complete product returned by the catalog API.
  const content = useMemo<ProductSection[]>(() => {
    if (subcategoryId) {
      const deepContent = getSubSubcategories(subcategoryId);
      if (deepContent.length === 0) {
        return products.length > 0
          ? [{ title: displayNameForSubcategory(subcategoryId), products }]
          : [];
      }

      const assignedProductIds = new Set<string>();
      const sections = deepContent.flatMap<ProductSection>((section) => {
        const taxonomyNames = new Set(section.items.map(normalizeProductName));
        const matchingProducts = products.filter((product) => {
          if (assignedProductIds.has(product.id)) return false;
          if (!taxonomyNames.has(normalizeProductName(product.name))) return false;
          assignedProductIds.add(product.id);
          return true;
        });

        return matchingProducts.length > 0
          ? [{ title: section.title, products: matchingProducts }]
          : [];
      });
      const remainingProducts = products.filter((product) => !assignedProductIds.has(product.id));

      if (remainingProducts.length > 0) {
        sections.push({
          title: t("product_showcase.available_products", "Available Products"),
          products: remainingProducts,
        });
      }

      return sections;
    }

    if (categoryId) {
      const cat = getShoppableCategories().find(c => c.id === categoryId);
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
  }, [subcategoryId, categoryId, products, t]);

  const displayName = useMemo(() => {
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
  }, [subcategoryId, categoryId]);

  // Create stable ref callback per section title
  const createRefCallback = useCallback((title: string) => {
    return (el: HTMLDivElement | null) => {
      if (el) {
        sectionRefsMap.current.set(title, el);
      }
      // Don't delete on null - React may call with null during reconciliation
      // Refs will be naturally replaced when content changes
    };
  }, []);

  // Scroll to section when activeSection changes from nav panel click
  useEffect(() => {
    if (activeSection) {
      // Small delay to ensure refs are populated after render
      const timer = setTimeout(() => {
        const el = sectionRefsMap.current.get(activeSection);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeSection]);

  // Clear refs when content changes
  useEffect(() => {
    sectionRefsMap.current.clear();
  }, [content.length > 0 ? content.map(c => c.title).join(',') : '']);

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
  if (!categoryId && !subcategoryId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Package className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t("category.browse_by_category")}</h3>
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
      <div className="flex-shrink-0 bg-muted/20 border-b border-border/40 px-3 py-1.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1">
              <Package className="h-4 w-4 text-primary" />
              <span className="font-bold">{t("product_showcase.item_count", { count: products.length })}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{new Set(products.map(p => p.farmerId)).size} {t("features.farmers_label")}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[9px] h-5 px-1.5">
              <Truck className="h-2.5 w-2.5 mr-1" />
              {t("product_showcase.same_day_delivery")}
            </Badge>
          </div>
        </div>
      </div>

      {/* Product Sections */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{displayName}</h1>
              <p className="text-sm text-muted-foreground">
                {content.length} categories | {content.reduce((acc, c) => acc + c.products.length, 0)} items
              </p>
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
              <div className="flex items-center gap-1.5 mb-2">
                <div className="h-1 w-1 rounded-full bg-primary" />
                <h2 className="text-[10px] font-bold uppercase tracking-tight">{section.title}</h2>
                <div className="flex-1 h-px bg-border/30" />
                <span className="text-[8px] text-muted-foreground uppercase font-bold">{section.products.length}</span>
              </div>

              {/* Product Grid */}
              <div data-product-grid="showcase" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {section.products.map((product, itemIdx) => {
                  const imageResolution = resolveProductImage({
                    id: product.id,
                    name: product.name,
                    categoryId: product.categoryId,
                    subcategoryId: product.subcategoryId,
                    images: product.images,
                  });
                   
                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: sectionIdx * 0.02 + itemIdx * 0.01, duration: 0.15 }}
                    >
                      <Card data-product-tile data-product-name={product.name.toLowerCase()} className="overflow-hidden group hover:shadow-sm border-border/40 transition-all duration-200 active:scale-[0.97] cursor-pointer scroll-mt-20" onClick={() => onProductClick?.(product)}>
                        {/* Product Image */}
                        <div className="relative aspect-square bg-muted/20 overflow-hidden">
                          <SafeProductImage src={imageResolution.src} fallbackSrc={imageResolution.fallbackSrc} alt={`${product.name} product image`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          
                          {/* Badges */}
                          <div className="absolute top-1 left-1 flex flex-col gap-0.5">
                            {product.isOrganic && (
                              <Badge className="text-[7px] h-3.5 px-1 py-0 bg-green-600/90 border-0">
                                {t("product.org_short")}
                              </Badge>
                            )}
                          </div>

                          {/* Quick Add Button — always visible (Amazon-style) */}
                          <FavoriteProductButton
                            productId={product.id}
                            productName={product.name}
                            className="!absolute right-1 top-1 h-7 w-7 border bg-background/95 shadow-md hover:bg-red-50"
                            data-testid={`button-showcase-favorite-${sectionIdx}-${itemIdx}`}
                          />
                          <Button
                            size="icon"
                            className="absolute bottom-1 right-1 h-7 w-7 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground border border-background"
                            onClick={(e) => { e.stopPropagation(); onAddToCart?.(product); }}
                            data-testid={`button-quick-add-${product.id}`}
                            title={t("product.add_to_cart")}
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Product Info */}
                        <CardContent className="p-1.5">
                          <h3 className="font-bold text-[9px] uppercase tracking-tight truncate mb-1">{product.name}</h3>
                          
                          {/* Price & Rating */}
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[10px] text-primary">
                              {format(product.price, {
                                sourceCurrency: product.currency || "GBP",
                                includeCode: true,
                              })}
                              <span className="text-[8px] font-normal text-muted-foreground ml-0.5">/{product.unit}</span>
                            </span>
                            <div className="flex items-center gap-0.5">
                              <Star className="h-2 w-2 fill-yellow-400 text-yellow-400" />
                              <span className="text-[8px] font-bold">{product.farmerRating.toFixed(1)}</span>
                            </div>
                          </div>

                          {/* Always-visible {t("product.add_to_cart")} button */}
                          <Button
                            size="sm"
                            className="w-full mt-1.5 h-6 px-2 text-[9px] font-bold uppercase tracking-tight gap-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={(e) => { e.stopPropagation(); onAddToCart?.(product); }}
                            data-testid={`button-tile-add-${product.id}`}
                          >
                            <ShoppingCart className="h-2.5 w-2.5" />
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
            className="mt-8 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-green-500/10 border border-primary/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Leaf className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm">{t("product_showcase.badge")}</h3>
                <p className="text-xs text-muted-foreground">{t("product_showcase.verified_farmers")}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-2 rounded-md bg-background/50">
                <div className="font-bold text-lg text-primary">{products.length}+</div>
                <div className="text-muted-foreground">{t("features.products_label")}</div>
              </div>
              <div className="p-2 rounded-md bg-background/50">
                <div className="font-bold text-lg text-primary">100%</div>
                <div className="text-muted-foreground">{t("common.verified")}</div>
              </div>
              <div className="p-2 rounded-md bg-background/50">
                <div className="font-bold text-lg text-primary">24hr</div>
                <div className="text-muted-foreground">{t("product_showcase.same_day_delivery")}</div>
              </div>
            </div>
          </motion.div>
        </div>
      </ScrollArea>
    </div>
  );
}
