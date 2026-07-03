import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronLeft, ShoppingCart, Star, Leaf } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getProductImage } from "@/lib/product-images";
import type { Product } from "@shared/schema";

const QUICK_CATS = [
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

  const panelW = open ? "w-[180px]" : "w-8";

  return (
    <div
      className={`relative flex flex-col border-l border-border bg-background/95 backdrop-blur-sm transition-all duration-200 flex-shrink-0 ${panelW}`}
      style={{ minWidth: open ? 180 : 32 }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-6 h-10 rounded-full border border-border bg-background shadow-md flex items-center justify-center hover:bg-muted transition-colors"
        title={open ? t("market.hide_quick_shop") : t("market.quick_shop")}
      >
        {open ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {open && (
        <>
          {/* Header */}
          <div className="px-2 py-2 border-b border-border flex-shrink-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("market.quick_shop")}</p>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-1 p-2 border-b border-border flex-shrink-0">
            {QUICK_CATS.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat)}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-all ${
                  activeCat.id === cat.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted text-foreground"
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Product mini-cards */}
          <ScrollArea className="flex-1">
            <div className="p-1.5 space-y-1.5">
              {products.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-4">{t("market.no_products")}</p>
              ) : (
                products.map(p => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/products/${p.id}`)}
                    className="w-full text-left rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all overflow-hidden group"
                  >
                    <div className="w-full aspect-[3/2] overflow-hidden bg-muted">
                      <img
                        src={getProductImage(p.name, p.categoryId, "sm")}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=200&h=130&fit=crop";
                        }}
                      />
                    </div>
                    <div className="p-1.5">
                      <p className="text-[10px] font-medium text-foreground leading-tight line-clamp-2">{p.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] font-bold text-primary">
                          {p.price === 0 ? t("common.free") : `£${p.price}`}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                          <span className="text-[9px] text-muted-foreground">{p.rating?.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {p.isOrganic && (
                          <Badge className="text-[8px] px-1 py-0 bg-green-500/10 text-green-600 border-green-500/20 h-4">
                            <Leaf className="h-2 w-2 mr-0.5" />{t("product.org_short")}
                          </Badge>
                        )}
                        <span className="text-[9px] text-muted-foreground">/{p.unit}</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Browse all link */}
            <div className="p-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-[10px]"
                onClick={() => navigate(`/?${activeCat.catKey}=${activeCat.id}`)}
              >
                <ShoppingCart className="h-3 w-3 mr-1" />
                {t("market.browse_all")}
              </Button>
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
