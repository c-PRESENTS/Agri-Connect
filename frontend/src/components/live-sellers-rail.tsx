import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { LeafletFarmerMap } from "@/components/leaflet-farmer-map";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SafeProductImage } from "@/components/safe-product-image";
import {
  Star, MapPin, Wifi, Activity, RefreshCw, X, Package,
  Phone, MessageCircle, ShoppingBag, ChevronRight,
} from "lucide-react";
import { resolveProductImageForProduct } from "@/lib/product-images";
import { isSellerOnline } from "@/lib/seller-presence";
import { getPublicLocationLabel, hasValidPublicCoordinates } from "@/lib/public-map-location";
import type { Product } from "@shared/schema";
import { useCurrency } from "@/contexts/currency-context";

interface SellerEntry {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  location: string;
  productCount: number;
  topProducts: Product[];
  isOnline: boolean;
  latitude: number;
  longitude: number;
  totalStock: number;
}

/** Self-ticking "Xs ago" label. Isolated so the parent (and the map) don't
 *  re-render every second. */
function UpdatedAgo({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const seconds = since ? Math.max(0, Math.floor((now - since) / 1000)) : 0;
  return <>{timeAgo(seconds)}</>;
}

function timeAgo(seconds: number): string {
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

export interface LiveSellersRailProps {
  /** Optional pre-filtered products. Defaults to all. */
  products?: Product[];
  /** Map height in pixels. */
  mapHeight?: number;
  /** Seller list height in pixels. */
  listHeight?: number;
  /** Render the map and list stacked full-width (used in bottom rails on directory pages). */
  layout?: "stacked" | "wide";
}

/**
 * Re-uses the same Leaflet map as the home page. Handles clicks on map
 * markers by expanding a big detail card at the top of the list view that
 * mirrors the map popup.
 *
 * "Live" feel:
 *  1. /api/products refetches every 30s.
 *  2. A 1s tick keeps "Updated Xs ago" label moving.
 *  3. Online sellers get a pulsing green dot.
 */
export function LiveSellersRail({
  products: providedProducts,
  mapHeight = 380,
  listHeight = 460,
  layout = "stacked",
}: LiveSellersRailProps) {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { data: fetched = [], dataUpdatedAt, isFetching } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: !providedProducts,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const products = providedProducts ?? fetched;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const sellers: SellerEntry[] = useMemo(() => {
    const map = new Map<string, SellerEntry>();
    for (const p of products) {
      if (!hasValidPublicCoordinates(p.farmerLatitude, p.farmerLongitude)) continue;
      const existing = map.get(p.farmerId);
      if (existing) {
        existing.productCount += 1;
        existing.totalStock += p.stock || 0;
        existing.topProducts.push(p);
      } else {
        map.set(p.farmerId, {
          id: p.farmerId,
          name: p.farmerName?.trim() || "Seller not specified",
          avatar: p.farmerAvatar || "",
          rating: Number.isFinite(p.farmerRating) ? p.farmerRating : 0,
          location: getPublicLocationLabel(p.farmerLocation),
          productCount: 1,
          topProducts: [p],
          isOnline: isSellerOnline(p.farmerId),
          latitude: p.farmerLatitude,
          longitude: p.farmerLongitude,
          totalStock: p.stock || 0,
        });
      }
    }
    // Trim each seller's top products to 4 and sort cheapest first.
    for (const s of Array.from(map.values())) {
      s.topProducts = s.topProducts.sort((a, b) => a.price - b.price).slice(0, 4);
    }
    return Array.from(map.values()).sort(
      (a: SellerEntry, b: SellerEntry) => Number(b.isOnline) - Number(a.isOnline)
    );
  }, [products]);

  const onlineCount = sellers.filter((s) => s.isOnline).length;

  const handleFarmerClick = (farmerId: string) => {
    setSelectedId(farmerId);
    // Scroll the expanded row into view inside its own scroll container.
    setTimeout(() => {
      rowRefs.current[farmerId]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const isWide = layout === "wide";

  return (
    <div
      className={isWide ? "grid lg:grid-cols-[1fr_400px] gap-4" : "flex flex-col gap-3"}
      data-testid="rail-live-sellers"
    >
      {/* === MAP COLUMN === */}
      <div className="flex flex-col gap-3 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 p-1">
          <div className="min-w-0">
            <p className="text-sm sm:text-base font-black uppercase tracking-wide text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <span className="relative inline-flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
              </span>
              {t("live_sellers.title")}
            </p>
            <p className="text-xs sm:text-sm font-bold text-foreground/80 truncate mt-1" data-testid="text-live-status">
              {onlineCount} of {sellers.length} sellers online · Updated <UpdatedAgo since={dataUpdatedAt} />
            </p>
          </div>
          <Badge variant="secondary" className="text-sm font-black gap-2 px-3.5 py-1.5 bg-muted border border-border/80 text-foreground shrink-0 shadow-2xs" data-testid="badge-seller-activity">
            {isFetching ? <RefreshCw className="w-4 h-4 animate-spin text-primary" /> : <Activity className="w-4 h-4 text-primary" />}
            <span className="font-black text-sm sm:text-base">{sellers.length}</span>
          </Badge>
        </div>

        <Card className="overflow-hidden p-0">
          <div style={{ height: mapHeight }} className="w-full">
            <LeafletFarmerMap
              products={products}
              onFarmerClick={handleFarmerClick}
              selectedFarmerId={selectedId}
              height="100%"
              initialZoom={6}
              center={[54.0, -2.5]}
              showControls={true}
              showLayerSwitcher={true}
              tileStyle="satellite"
            />
          </div>
        </Card>
      </div>

      {/* === LIST COLUMN === */}
      <Card className="flex flex-col overflow-hidden min-w-0 border-2 rounded-2xl shadow-md">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
          <p className="text-base font-black flex items-center gap-2">
            <Wifi className="w-4 h-4 text-green-600" />
            {t("live_sellers.title")}
          </p>
          <Badge variant="outline" className="text-xs font-black px-2.5 py-1 rounded-lg" data-testid="badge-online-count">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse" />
            {t("live_sellers.online_count", { count: onlineCount })}
          </Badge>
        </div>

        <ScrollArea style={{ height: listHeight }}>
          <div className="divide-y">
            {sellers.length === 0 ? (
              <div className="p-8 sm:p-12 text-center text-base font-bold text-muted-foreground space-y-2">
                <MapPin className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p>{t("product_grid.no_products_title")}</p>
              </div>
            ) : (
              sellers.map((s) => {
                const top = s.topProducts[0];
                const thumb = top ? resolveProductImageForProduct(top) : null;
                const isActive = selectedId === s.id;

                return (
                  <div
                    key={s.id}
                    ref={(el) => {
                      rowRefs.current[s.id] = el as any;
                    }}
                    className={`transition-colors ${isActive ? "bg-primary/5" : ""}`}
                    data-testid={`row-live-seller-${s.id}`}
                  >
                    {/* Compact header — always visible, click to toggle */}
                    <button
                      type="button"
                      onClick={() => (isActive ? setSelectedId(null) : handleFarmerClick(s.id))}
                      className={`w-full flex gap-3 p-3 text-left transition-colors ${
                        isActive
                          ? "border-l-2 border-primary"
                          : "hover-elevate active-elevate-2"
                      }`}
                      data-testid={`button-toggle-seller-${s.id}`}
                      aria-expanded={isActive}
                    >
                      <div className="relative shrink-0">
                        {isActive || !thumb ? (
                          <img
                            src={s.avatar}
                            alt={s.name}
                            className="h-14 w-14 rounded-full object-cover bg-muted shadow-md ring-2 ring-background transition-all"
                            loading="lazy"
                          />
                        ) : (
                          <SafeProductImage
                            src={thumb.src}
                            fallbackSrc={thumb.fallbackSrc}
                            alt={top?.name ?? s.name}
                            className="h-12 w-12 rounded-md object-cover bg-muted transition-all"
                          />
                        )}
                        {s.isOnline && (
                          <span className="absolute -top-0.5 -right-0.5 inline-flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 ring-2 ring-background" />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`truncate ${isActive ? "text-base sm:text-lg font-black text-foreground" : "text-base font-black text-foreground"}`}>
                            {s.name}
                          </p>
                          <span
                            className={`text-xs font-black shrink-0 ${
                              s.isOnline ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                            }`}
                          >
                            {s.isOnline ? t("live_sellers.live_status") : t("map.offline_status")}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                          {s.location}
                        </p>
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold mt-1 flex-wrap">
                          <span className="flex items-center gap-1 font-black">
                            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                            {s.rating.toFixed(1)}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Package className="w-3.5 h-3.5" />
                            {s.productCount} listings
                          </span>
                          {isActive && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-muted-foreground flex items-center gap-1">
                                <ShoppingBag className="w-3.5 h-3.5" />
                                {s.totalStock} in stock
                              </span>
                            </>
                          )}
                          {!isActive && top && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <span className="font-black text-primary">from {format(top.price, { sourceCurrency: top.currency || "GBP" })}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-5 h-5 mt-1 shrink-0 text-muted-foreground transition-transform ${
                          isActive ? "rotate-90 text-primary" : ""
                        }`}
                      />
                    </button>

                    {/* Inline expanded body — only when this row is active */}
                    {isActive && (
                      <div className="px-3 pb-3" data-testid={`expanded-seller-${s.id}`}>
                        {/* Product mini-grid */}
                        {s.topProducts.length > 0 && (
                          <div className="grid grid-cols-4 gap-1.5 mb-3">
                            {s.topProducts.map((p) => (
                              <Link
                                key={p.id}
                                href={`/products/${p.id}`}
                                className="group block hover-elevate active-elevate-2 rounded-md overflow-hidden border bg-background"
                                onClick={(e) => e.stopPropagation()}
                                data-testid={`thumb-expanded-product-${p.id}`}
                              >
                                <div className="aspect-square bg-muted overflow-hidden">
                                  <SafeProductImage
                                    src={resolveProductImageForProduct(p).src}
                                    fallbackSrc={resolveProductImageForProduct(p).fallbackSrc}
                                    alt={p.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                </div>
                                <div className="p-1">
                                  <p className="text-[10px] font-medium truncate">{p.name}</p>
                                  <p className="text-[10px] font-bold text-primary">{format(p.price, { sourceCurrency: p.currency || "GBP" })}</p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            asChild
                            size="default"
                            className="flex-1 h-11 text-sm font-black uppercase tracking-wider bg-amber-400 hover:bg-amber-500 text-black shadow-md rounded-xl"
                            data-testid={`button-visit-shop-${s.id}`}
                          >
                            <Link href={`/sellers/${s.id}`} onClick={(e) => e.stopPropagation()}>
                              {t("live_sellers.visit_shop")}
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Link>
                          </Button>
                          <Button
                            size="default"
                            variant="outline"
                            className="h-11 px-3.5 border-2 rounded-xl"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`button-message-${s.id}`}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="default"
                            variant="outline"
                            className="h-11 px-3.5 border-2 rounded-xl"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`button-call-${s.id}`}
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                          <Button
                            size="default"
                            variant="ghost"
                            className="h-11 px-3.5 rounded-xl"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(null);
                            }}
                            data-testid={`button-collapse-${s.id}`}
                            title="Collapse"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
