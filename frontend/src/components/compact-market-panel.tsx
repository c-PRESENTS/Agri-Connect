import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronLeft, ShoppingCart, Star, Leaf } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { resolveProductImageForProduct } from "@/lib/product-images";
import type { Product } from "@shared/schema";
import { FavoriteProductButton } from "./favorite-product-button";
import { SafeProductImage } from "./safe-product-image";
import { useCurrency } from "@/contexts/currency-context";

const QUICK_CATS = [
  { catKey: "categoryId",    id: "fresh-produce", label: "Fresh",   emoji: "Fresh" },
  { catKey: "subcategoryId", id: "vegetables",    label: "Veg",      emoji: "🥦" },
  { catKey: "subcategoryId", id: "fruits",        label: "Fruits",   emoji: "🍎" },
  { catKey: "subcategoryId", id: "dairy",         label: "Dairy",    emoji: "🥛" },
  { catKey: "subcategoryId", id: "grains",        label: "Grains",   emoji: "🌾" },
  { catKey: "subcategoryId", id: "spices",        label: "Spices",   emoji: "🌿" },
  { catKey: "subcategoryId", id: "meat",          label: "Meat",     emoji: "🥩" },
  { catKey: "categoryId",    id: "dietary",       label: "Diet",     emoji: "💚" },
  { catKey: "categoryId",    id: "inputs-tools",  label: "Tools",    emoji: "🔧" },
  { catKey: "categoryId",    id: "modern-farming",label: "AgriTech", emoji: "🛰️" },
  { catKey: "subcategoryId", id: "organic-produce",label: "Organic", emoji: "🌱" },
];

interface CompactMarketPanelProps {
  defaultOpen?: boolean;
}

export function CompactMarketPanel({ defaultOpen = false }: CompactMarketPanelProps) {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(defaultOpen);
  const [activeCat, setActiveCat] = useState(QUICK_CATS[0]);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products", activeCat.catKey, activeCat.id],
    queryFn: async () => {
      const res = await fetch(`/api/products?${activeCat.catKey}=${activeCat.id}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data.slice(0, 12) : [];
    },
    enabled: open,
  });

  const browseHref =
    activeCat.catKey === "subcategoryId"
      ? `/?category=daily-needs&subcategory=${activeCat.id}`
      : `/?category=${activeCat.id}`;

  const panelW = open ? "w-[245px]" : "w-10";

  return (
    <div
      className={`relative flex h-full min-h-0 flex-shrink-0 flex-col overflow-hidden border-l border-border/60 bg-background/95 backdrop-blur-sm transition-all duration-200 ${panelW}`}
      style={{ minWidth: open ? 245 : 40 }}
    >
      {/* Integrated Header with clean toggle */}
      <div className="px-2.5 py-2.5 bg-muted/40 border-b border-border/60 flex items-center justify-between flex-shrink-0">
        {open ? (
          <>
            <div className="flex items-center gap-1.5 min-w-0">
              <ShoppingCart className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs sm:text-sm font-black text-foreground uppercase tracking-wide truncate">{t("market.quick_shop")}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-7 w-7 rounded-lg border border-border/70 bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
              title={t("market.hide_quick_shop")}
              data-testid="button-collapse-quick-shop"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full h-8 rounded-lg border border-border/70 bg-background hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-muted flex items-center justify-center transition-colors cursor-pointer"
            title={t("market.quick_shop")}
            data-testid="button-expand-quick-shop"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {!open && (
        <div 
          onClick={() => setOpen(true)} 
          className="flex-1 flex flex-col items-center justify-center py-4 cursor-pointer hover:bg-muted/30 transition-colors select-none"
          title={t("market.quick_shop")}
        >
          <ShoppingCart className="h-4 w-4 text-muted-foreground mb-3" />
          <span className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-black text-muted-foreground uppercase tracking-widest">
            {t("market.quick_shop")}
          </span>
        </div>
      )}

      {open && (
        <>

          {/* Category pills */}
          <div className="flex flex-wrap gap-1.5 p-2.5 border-b border-border/60 flex-shrink-0 bg-background/50">
            {QUICK_CATS.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wide border transition-all ${
                  activeCat.id === cat.id
                    ? "bg-amber-400 text-black border-amber-400 shadow-xs font-black"
                    : "border-border/60 hover:border-primary/50 hover:bg-muted text-foreground bg-background"
                }`}
              >
                <span className="text-sm">{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Product mini-cards */}
          <ScrollArea className="min-h-0 flex-1 overscroll-contain" type="always">
            <div className="p-2 space-y-2.5">
              {products.length === 0 ? (
                <p className="text-xs font-bold text-muted-foreground text-center py-6">{t("market.no_products")}</p>
              ) : (
                products.map(p => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/products/${p.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") navigate(`/products/${p.id}`);
                    }}
                    role="link"
                    tabIndex={0}
                    className="w-full text-left rounded-xl border border-border/60 hover:border-primary/50 hover:bg-primary/5 shadow-2xs transition-all overflow-hidden group cursor-pointer"
                  >
                    <div className="relative w-full aspect-[3/2] overflow-hidden bg-muted">
                      <SafeProductImage
                        src={resolveProductImageForProduct(p).src}
                        fallbackSrc={resolveProductImageForProduct(p).fallbackSrc}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <FavoriteProductButton
                        productId={p.id}
                        productName={p.name}
                        className="!absolute right-1.5 top-1.5 h-7 w-7 border bg-background/95 shadow-md hover:bg-red-50"
                        data-testid={`button-quick-shop-favorite-${p.id}`}
                      />
                    </div>
                    <div className="p-2 space-y-1">
                      <p className="text-xs sm:text-sm font-black text-foreground uppercase tracking-wide leading-snug line-clamp-2">{p.name}</p>
                      <div className="flex items-center justify-between gap-1 pt-0.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          {p.price === 0
                            ? t("common.free")
                            : format(p.price, {
                                sourceCurrency: p.currency || "GBP",
                                includeCode: true,
                              })}
                          <span className="text-[10px] sm:text-xs font-bold text-muted-foreground ml-0.5 whitespace-nowrap">/{p.unit}</span>
                        </span>
                        <div className="flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-black text-foreground">{p.rating?.toFixed(1)}</span>
                        </div>
                      </div>
                      {p.isOrganic && (
                        <div className="pt-0.5">
                          <Badge className="text-[10px] px-1.5 py-0 bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30 h-4 font-bold">
                            <Leaf className="h-2.5 w-2.5 mr-1" />{t("product.org_short")}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Browse all link */}
            <div className="p-2.5">
              <Button
                size="sm"
                className="w-full h-8 text-xs font-black uppercase tracking-wide bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-1.5"
                onClick={() => navigate(browseHref)}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                {t("market.browse_all")}
              </Button>
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
