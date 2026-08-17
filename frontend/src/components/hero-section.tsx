import "leaflet/dist/leaflet.css";
import { useEffect, useLayoutEffect, useState, useRef, memo } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Star, Users, Leaf,
  ShieldCheck, Truck, Sprout, Globe, Activity, Satellite,
  ShoppingBag, ShoppingCart,
} from "lucide-react";
import { LeafletFarmerMap } from "./leaflet-farmer-map";
import { HeroServiceGrid } from "./hero-service-grid";
import { UserBookmarks } from "./user-bookmarks";
import type { HomeProductRecommendations, Product } from "@shared/schema";
import { resolveProductImageForProduct } from "@/lib/product-images";
import { categoryImages, getShoppableCategories } from "@/lib/categories";
import { MAIN_MARKETPLACE_CATEGORIES } from "@/lib/main-marketplace-categories";
import { FavoriteProductButton } from "./favorite-product-button";
import { buildCategoryBrowseUrl } from "@/lib/product-navigation";
import { useCurrency } from "@/contexts/currency-context";
import { useAuth } from "@/hooks/use-auth";
import { useLiveLocation } from "@/contexts/live-location-context";

type ShareCareItem = { id: string; name: string; unit: string; qty: number; donor: string; location: string; emoji: string; postedAgo: string; category: string };
type PlatformStatistics = { buyers: number };

interface HeroSectionProps {
  onBrowse: () => void;
  products: Product[];
  onFarmerClick: (farmerId: string) => void;
  onAddToCart?: (product: Product) => void;
}

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "home.verified_farms", color: "text-green-300" },
  { icon: Truck, label: "home.farm_to_door", color: "text-blue-300" },
  { icon: Leaf, label: "home.natural", color: "text-emerald-300" },
  { icon: Globe, label: "home.regions", color: "text-purple-300" },
];

type HomeCategoryTile = {
  id: string;
  label: string;
  categoryId: string;
  subcategoryId?: string;
  imageId: string;
  isSubcategory: boolean;
};

const shoppableCategoriesById = new Map(
  getShoppableCategories().map((category) => [category.id, category]),
);

const HOME_CATEGORY_TILES: HomeCategoryTile[] = MAIN_MARKETPLACE_CATEGORIES.flatMap(({ id, label }) => {
  const category = shoppableCategoriesById.get(id);
  if (!category) return [];

  return [
    {
      id: category.id,
      label,
      categoryId: category.id,
      imageId: category.id,
      isSubcategory: false,
    },
    ...category.subcategories.map((subcategory) => ({
      id: `${category.id}-${subcategory.id}`,
      label: subcategory.name,
      categoryId: category.id,
      subcategoryId: subcategory.id,
      imageId: subcategory.id,
      isSubcategory: true,
    })),
  ];
});

type HeroMapMode = "products" | "live-needs" | "farms-nearby" | "land-lots";

const HERO_MAP_MODES: { id: HeroMapMode; label: string; emoji: string; overlays: { farmers?: boolean; needs?: boolean; heatmap?: boolean } }[] = [
  { id: "products", label: "Products & Farmers", emoji: "🌱", overlays: { farmers: true, needs: false, heatmap: false } },
  { id: "live-needs", label: "Live Needs", emoji: "📍", overlays: { farmers: false, needs: true, heatmap: false } },
  { id: "farms-nearby", label: "Farms Nearby", emoji: "🏡", overlays: { farmers: true, needs: false, heatmap: true } },
  { id: "land-lots", label: "Land & Lots", emoji: "🗺️", overlays: { farmers: false, needs: false, heatmap: false } },
];

export const HeroSection = memo(function HeroSection({ onBrowse, products, onFarmerClick, onAddToCart }: HeroSectionProps) {
  const { format } = useCurrency();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { location: liveLocation } = useLiveLocation();
  const [, navigate] = useLocation();
  const isEmbeddedView = new URLSearchParams(window.location.search).get("embedded") === "1";
  const [heroMapMode, setHeroMapMode] = useState<HeroMapMode>("products");
  const [heroLeftPct, setHeroLeftPct] = useState(42);
  const heroGridRef = useRef<HTMLDivElement | null>(null);
  const heroLeftRef = useRef<HTMLDivElement | null>(null);
  const heroDragging = useRef<{ startX: number; startPct: number; containerW: number } | null>(null);

  const [mobileMapHeight, setMobileMapHeight] = useState<number>(180);
  const mobileMapDragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const startMobileMapDrag = (clientY: number) => {
    mobileMapDragRef.current = { startY: clientY, startHeight: mobileMapHeight };
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const ref = mobileMapDragRef.current;
      if (!ref) return;
      const y = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const next = Math.min(520, Math.max(120, ref.startHeight + (y - ref.startY)));
      setMobileMapHeight(next);
    };
    const handleEnd = () => {
      mobileMapDragRef.current = null;
      window.removeEventListener("mousemove", handleMove as EventListener);
      window.removeEventListener("touchmove", handleMove as EventListener);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchend", handleEnd);
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", handleMove as EventListener);
    window.addEventListener("touchmove", handleMove as EventListener, { passive: false });
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchend", handleEnd);
    document.body.style.userSelect = "none";
  };
  // Share & Care live items (live query)
  const { data: shareCareItems = [] } = useQuery<ShareCareItem[]>({
    queryKey: ["/api/share-care"],
  });
  const { data: platformStats } = useQuery<PlatformStatistics>({
    queryKey: ["/api/platform/stats"],
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const { data: homeRecommendations } = useQuery<HomeProductRecommendations>({
    queryKey: [
      `/api/products/home-recommendations?profile=${encodeURIComponent(user?.id ?? "")}`
      + `&locationUpdatedAt=${encodeURIComponent(liveLocation?.updatedAt ?? "profile")}`,
    ],
    enabled: isAuthenticated,
  });

  const startHeroDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const containerW = heroGridRef.current ? heroGridRef.current.offsetWidth : window.innerWidth;
    const startPct = heroLeftRef.current ? (heroLeftRef.current.offsetWidth / containerW) * 100 : heroLeftPct;
    heroDragging.current = { startX: e.clientX, startPct, containerW };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (ev: MouseEvent) => {
      if (!heroDragging.current || !heroLeftRef.current) return;
      const delta = ((ev.clientX - heroDragging.current.startX) / heroDragging.current.containerW) * 100;
      const pct = Math.max(25, Math.min(70, heroDragging.current.startPct + delta));
      heroLeftRef.current.style.width = pct + "%";
    };
    const onUp = (ev: MouseEvent) => {
      if (heroDragging.current && heroLeftRef.current) {
        const delta = ((ev.clientX - heroDragging.current.startX) / heroDragging.current.containerW) * 100;
        const pct = Math.max(25, Math.min(70, heroDragging.current.startPct + delta));
        setHeroLeftPct(pct);
      }
      heroDragging.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Apply heroLeftPct synchronously on desktop; 100% on mobile — useLayoutEffect avoids flash
  useLayoutEffect(() => {
    const applyWidth = () => {
      if (!heroLeftRef.current) return;
      heroLeftRef.current.style.width = window.innerWidth >= 1024 ? heroLeftPct + "%" : "100%";
    };
    applyWidth();
    window.addEventListener("resize", applyWidth);
    return () => window.removeEventListener("resize", applyWidth);
  }, [heroLeftPct]);

  const freshPickProducts = homeRecommendations?.freshPicks ?? [];
  const featuredProducts = homeRecommendations?.featuredProducts ?? [];
  const farmerCount = new Set(products.map(p => p.farmerId)).size;
  const openProductCategory = (product: Product) => {
    navigate(
      buildCategoryBrowseUrl({
        categoryId: product.categoryId,
        subcategoryId: product.subcategoryId,
      }),
    );
    window.dispatchEvent(
      new CustomEvent("agri-subcategory-open", {
        detail: product.categoryId,
      }),
    );
  };
  const openHomeCategoryTile = (tile: HomeCategoryTile) => {
    const params = new URLSearchParams({ category: tile.categoryId });
    if (tile.subcategoryId) params.set("subcategory", tile.subcategoryId);

    navigate(`/?${params.toString()}`);
    window.dispatchEvent(
      new CustomEvent("agri-subcategory-open", {
        detail: tile.categoryId,
      }),
    );
  };
  return (
    <section className="relative overflow-hidden">

      {/* ─── DARK NATURE BACKGROUND ─── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(rgba(0,0,0,0.72) 0%, rgba(10,20,10,0.80) 100%), url('https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920&h=700&fit=crop&q=80') center/cover no-repeat`,
        }}
      />

      {/* ─── HERO SPLIT: Text + Map ─── */}
      <div className="relative z-10 w-full overflow-hidden">
        <div ref={heroGridRef} className="flex flex-col lg:flex-row lg:min-h-[420px] w-full">

          {/* ──────── MOBILE HERO (compact — Amazon-app style) ──────── */}
          <div className="flex lg:hidden flex-col px-3 pt-2.5 pb-2 w-full min-w-0 gap-2">
            {/* Live status pill + compact stat strip — all in one row */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <div className="inline-flex items-center gap-1 bg-green-500/15 border border-green-400/40 rounded-full px-1.5 py-0.5 shrink-0">
                <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[9px] font-bold text-green-300">{farmerCount} {t("home.farmers")}</span>
              </div>
              <span className="text-[9px] text-white/40 shrink-0">·</span>
              <span className="text-[9px] font-semibold text-white/60 shrink-0"><span className="text-white/90 font-black">{farmerCount}</span> {t("home.farmers")}</span>
              <span className="text-[9px] text-white/40 shrink-0">·</span>
              <span className="text-[9px] font-semibold text-white/60 shrink-0"><span className="text-white/90 font-black">{products.length}</span> {t("home.products")}</span>
              <span className="text-[9px] text-white/40 shrink-0">·</span>
              <span className="text-[9px] font-semibold text-white/60 shrink-0"><span className="text-white/90 font-black">{shareCareItems.length}</span> {t("home.free_items")}</span>
              <span className="text-[9px] text-white/40 shrink-0">·</span>
              <span className="text-[9px] font-semibold text-white/60 shrink-0"><span className="text-white/90 font-black">{platformStats?.buyers ?? "—"}</span> {t("platform_stats.buyers", "Buyers")}</span>
            </div>

            {/* Compact headline — one tight block */}
            <div>
              <h1 className="text-[20px] font-black text-white leading-[1.1] tracking-tight">
                {t("home.hero_title")}, <span className="gradient-text">{t("home.hero_subtitle")}</span>
              </h1>
              <p className="text-[11px] text-white/60 leading-snug mt-0.5">
                {t("home.hero_description")}
              </p>
            </div>

            {/* CTAs — side by side */}
            <div className="flex gap-3 mt-1">
              <Button
                onClick={onBrowse}
                data-testid="button-mobile-shop-now"
                className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:text-base font-black uppercase tracking-wider rounded-xl shadow-md gap-2 px-4"
              >
                {t("home.shop_now")}<ArrowRight className="h-4.5 w-4.5" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/map")}
                data-testid="button-mobile-live-map"
                className="flex-1 h-12 border-2 border-white/30 text-white hover:bg-white/15 bg-white/10 text-sm sm:text-base font-black uppercase tracking-wider rounded-xl gap-2 px-4"
              >
                <Satellite className="h-4.5 w-4.5 text-green-400" />{t("home.live_map")}
              </Button>
            </div>
          </div>

          {/* ──────── DESKTOP HERO — Text & CTAs (≥lg only) ──────── */}
          <div ref={heroLeftRef} className="hidden lg:flex flex-col justify-center px-10 lg:px-12 py-8 w-full overflow-hidden min-w-0">

            <div className="flex items-center gap-2 flex-wrap mb-4">
              <Badge className="bg-primary/25 text-primary border-2 border-primary/40 px-3 py-1 text-xs font-black tracking-[0.12em] uppercase rounded-full shadow-xs">
                <Leaf className="h-3.5 w-3.5 mr-1" />{t("home.farm_to_table")}
              </Badge>
              <div className="flex items-center gap-1.5 bg-white/15 border-2 border-white/25 rounded-full px-3 py-1 shadow-xs">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-black text-green-300">{farmerCount} {t("home.farmers")}</span>
              </div>
            </div>

            <h1 className="text-4xl xl:text-5xl font-black text-white mb-3 leading-[1] tracking-tighter">
              <span className="block">{t("home.fresh_produce")}</span>
              <span className="gradient-text block whitespace-nowrap">{t("home.direct_to_you")}</span>
            </h1>

            <p className="text-base sm:text-lg font-bold text-white/90 mb-6 leading-relaxed max-w-lg">
              {t("home.hero_description")}
            </p>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
              {[
                { value: `${farmerCount}`, label: t("home.farmers"), icon: Users, color: "text-primary bg-primary/25" },
                { value: `${products.length}`, label: t("home.products"), icon: Sprout, color: "text-emerald-400 bg-emerald-900/60" },
                { value: `${shareCareItems.length}`, label: t("home.free_items"), icon: Activity, color: "text-amber-400 bg-amber-900/60" },
                { value: platformStats?.buyers === undefined ? "—" : `${platformStats.buyers}`, label: t("platform_stats.buyers", "Buyers"), icon: ShoppingBag, color: "text-sky-300 bg-sky-900/60" },
              ].map(({ value, label, icon: Icon, color }) => (
                <div key={label} className="bg-white/15 backdrop-blur-md border-2 border-white/25 rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center shadow-lg hover:bg-white/20 transition-all">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-white leading-none my-1">{value}</span>
                  <span className="text-xs sm:text-sm font-black uppercase tracking-[0.14em] text-white/80">{label}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <Button onClick={onBrowse} className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-14 text-base sm:text-lg font-black uppercase tracking-wider rounded-2xl shadow-xl shadow-primary/30 gap-2.5">
                {t("home.shop_now")}<ArrowRight className="h-5.5 w-5.5" />
              </Button>
              <Button variant="outline" className="border-2 border-green-400/80 text-white hover:bg-green-500/30 px-8 h-14 text-base sm:text-lg font-black uppercase tracking-wider rounded-2xl gap-2.5 bg-green-500/25 shadow-lg" onClick={() => navigate("/map")}>
                <Satellite className="h-5.5 w-5.5 text-green-300" />{t("home.live_map")}
              </Button>
            </div>

            <div className="flex gap-5 sm:gap-6 flex-wrap items-center">
              {TRUST_BADGES.map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-2 text-sm sm:text-base text-white font-black drop-shadow-md">
                  <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                  <span>{t(label)}</span>
                </div>
              ))}
            </div>

          </div>

          {/* MOBILE-ONLY compact map — shown on mobile, hidden on lg+ where the full right-panel map shows */}
          <div className="block lg:hidden relative w-full px-3" style={{ height: mobileMapHeight }}>
            {/* Map tile — overflow-hidden only on the map itself */}
            <div className="w-full h-full rounded-2xl overflow-hidden border border-white/20 shadow-xl shadow-black/30">
              <LeafletFarmerMap
                products={products}
                onFarmerClick={onFarmerClick}
                height="100%"
                initialZoom={6}
                center={[52.3, -1.0]}
                showControls={false}
                showLayerSwitcher={false}
                tileStyle="satellite"
                mapOverlays={HERO_MAP_MODES.find(m => m.id === heroMapMode)?.overlays}
              />
            </div>
            {/* Mode buttons — OUTSIDE overflow-hidden so they sit above Leaflet layers */}
            <div className="absolute bottom-2 left-2 right-2 z-[500] flex gap-1 flex-nowrap justify-between pointer-events-auto">
              {HERO_MAP_MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setHeroMapMode(mode.id)}
                  data-testid={`btn-mobile-map-mode-${mode.id}`}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-0.5 px-1 py-0.5 rounded-md text-[7px] font-bold border shadow-sm backdrop-blur-md transition-all ${heroMapMode === mode.id ? "bg-green-500 text-white border-green-400" : "bg-black/60 text-white/85 border-white/15"}`}
                >
                  <span className="text-[8px] shrink-0">{mode.emoji}</span>
                  <span className="truncate">{mode.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* MOBILE-ONLY map resize handle — glowing, animated, obvious tap target */}
          <div
            onMouseDown={(e) => { e.preventDefault(); startMobileMapDrag(e.clientY); }}
            onTouchStart={(e) => { startMobileMapDrag(e.touches[0].clientY); }}
            data-testid="mobile-map-resize-handle"
            title={t("map.drag_to_resize")}
            className="block lg:hidden mx-3 mt-1.5 mb-2 h-7 rounded-full cursor-row-resize touch-none select-none relative overflow-hidden bg-gradient-to-r from-green-500/20 via-green-400/40 to-green-500/20 border border-green-400/50 shadow-[0_0_18px_rgba(34,197,94,0.5)] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            {/* Shining sweep animation */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
            {/* Grip dots */}
            <div className="flex items-center gap-1 relative z-10">
              <span className="w-1 h-1 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.9)]" />
              <span className="w-1 h-1 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.9)]" />
              <span className="w-1 h-1 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.9)]" />
            </div>
            <span className="relative z-10 text-[10px] font-black uppercase tracking-wider text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
              {t("map.drag_to_resize")}
            </span>
            <div className="flex items-center gap-1 relative z-10">
              <span className="w-1 h-1 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.9)]" />
              <span className="w-1 h-1 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.9)]" />
              <span className="w-1 h-1 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.9)]" />
            </div>
          </div>

          {/* DRAG HANDLE — horizontal resize between text and map */}
          <div
            onMouseDown={startHeroDrag}
            title={t("map.drag_to_resize")}
            data-testid="hero-resize-handle"
            className="hidden lg:flex flex-col items-center justify-center w-3 cursor-col-resize group flex-shrink-0 z-20 hover:bg-white/5 transition-colors"
          >
            <div className="flex flex-col gap-1">
              <div className="w-0.5 h-5 rounded-full bg-white/30 group-hover:bg-primary/80 transition-colors" />
              <div className="w-0.5 h-2 rounded-full bg-white/20 group-hover:bg-primary/60 transition-colors" />
              <div className="w-0.5 h-5 rounded-full bg-white/30 group-hover:bg-primary/80 transition-colors" />
            </div>
          </div>

          {/* RIGHT — Full-height satellite map */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="relative hidden lg:flex flex-1"
          >
            <div className="absolute inset-0 p-4 pl-0">
              <div className="w-full h-full rounded-[1.75rem] overflow-hidden border border-white/20 shadow-2xl shadow-black/30">
                <LeafletFarmerMap
                  products={products}
                  onFarmerClick={onFarmerClick}
                  height="100%"
                  initialZoom={7}
                  center={[52.3, -1.0]}
                  showControls={true}
                  showLayerSwitcher={true}
                  tileStyle="satellite"
                  mapOverlays={HERO_MAP_MODES.find(m => m.id === heroMapMode)?.overlays}
                />
              </div>
              {/* Map mode toggle strip */}
              <div className="absolute bottom-8 left-4 right-8 z-30 flex items-end justify-between gap-2">
                <div className="flex flex-wrap gap-1 pointer-events-auto">
                  {HERO_MAP_MODES.map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => setHeroMapMode(mode.id)}
                      data-testid={`btn-hero-map-mode-${mode.id}`}
                      className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-[9px] font-bold border shadow-md backdrop-blur-md transition-all ${heroMapMode === mode.id ? "bg-green-500 text-white border-green-400 shadow-green-500/30" : "bg-black/60 text-white/85 border-white/15 hover:bg-black/75 hover:border-white/30"}`}
                    >
                      <span className="text-[10px]">{mode.emoji}</span>
                      <span>{mode.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ─── QUICK ACCESS — full-width, still on dark hero bg ─── */}
        <div className="px-3 sm:px-10 lg:px-12 pb-2 sm:pb-3 pt-1 w-full overflow-hidden">
          <HeroServiceGrid />
        </div>

        {/* ─── MY SITES / BOOKMARKS ─── */}
        {!isEmbeddedView && (
          <div className="px-3 sm:px-10 lg:px-12 pb-3 sm:pb-5 w-full overflow-hidden">
            <UserBookmarks />
          </div>
        )}
      </div>

      {/* ─── BOTTOM CONTENT STRIP ─── */}
      <div className="relative z-10 bg-background border-t border-border/50">

        {/* ─── FRESH PICKS CAROUSEL ─── */}
        <div className="px-3 sm:container sm:mx-auto sm:px-4 py-2 sm:py-4">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2.5">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-foreground/60">{t("home.fresh_picks")}</span>
              <Badge variant="secondary" className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 h-4">{freshPickProducts.slice(0, 14).length}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={onBrowse} className="h-6 px-2 text-[10px] font-bold text-primary hover:text-primary gap-1">
              {t("common.all")} <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          {homeRecommendations && (
            <p className="mb-2 text-[10px] font-semibold leading-snug text-muted-foreground sm:text-xs">
              In-stock fresh food listed within the last {homeRecommendations.freshnessWindowDays} days and available within {homeRecommendations.nearbyRadiusKm} km of {homeRecommendations.location.label}. Nearest products are shown first, followed by higher stock and ratings.
            </p>
          )}
          <div className="flex gap-1.5 sm:gap-2.5 overflow-x-auto pb-1 sm:pb-1.5 no-scrollbar">
            {freshPickProducts.slice(0, 14).map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                whileHover={{ y: -3 }}
                className="flex-shrink-0 w-[88px] sm:w-[112px] group"
                data-testid={`product-card-${product.id}`}
              >
                <div
                  role="link"
                  tabIndex={0}
                  aria-label={`Browse ${product.name} in its category`}
                  onClick={() => openProductCategory(product)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openProductCategory(product);
                    }
                  }}
                  className="cursor-pointer relative aspect-square rounded-lg sm:rounded-xl overflow-hidden border border-border/50 bg-muted mb-1 sm:mb-1.5 shadow-sm transition-all group-hover:shadow-md group-hover:border-primary/30 group-hover:scale-[1.02]"
                >
                  <img
                    src={resolveProductImageForProduct(product).src}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1540420828642-fca2c5c18abe?w=300&h=300&fit=crop`; }}
                  />
                  <div className="absolute top-1 right-1">
                    <Badge className="bg-primary/95 border-none h-4 sm:h-5 px-1 sm:px-1.5 text-[8px] sm:text-[10px] font-bold shadow-sm">{format(product.price, { sourceCurrency: product.currency || "GBP" })}</Badge>
                  </div>
                  <FavoriteProductButton
                    productId={product.id}
                    productName={product.name}
                    data-testid={`button-hero-favorite-${product.id}`}
                    className="!absolute bottom-1 right-1 h-6 w-6 bg-background/95 text-red-500 shadow-md hover:bg-red-50 hover:text-red-600"
                  />
                  {product.isOrganic && (
                    <div className="absolute top-1 left-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <Leaf className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-white" />
                    </div>
                  )}
                </div>
                <h3 className="text-[10px] sm:text-[12px] font-bold text-foreground truncate group-hover:text-primary transition-colors">{product.name}</h3>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate leading-tight">
                  {product.farmerName} · {product.distance?.toFixed(1)} km
                </p>
                <div className="flex items-center gap-0.5 mt-0.5">
                  <span className="text-[11px] sm:text-[13px] font-black text-primary leading-none">{format(product.price, { sourceCurrency: product.currency || "GBP" })}</span>
                  <span className="text-[8px] sm:text-[10px] text-muted-foreground leading-none">/{product.unit}</span>
                </div>
                <Button
                  size="sm"
                  className="w-full mt-1 h-6 sm:h-7 px-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-tight gap-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={(e) => { e.stopPropagation(); onAddToCart?.(product); }}
                  data-testid={`button-hero-add-${product.id}`}
                >
                  <ShoppingCart className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  {t("product.add_short")}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ─── FEATURED PRODUCTS — slightly bigger cards, right under Fresh Picks ─── */}
        {featuredProducts.length > 0 && (
          <div className="px-3 sm:container sm:mx-auto sm:px-4 pb-2 sm:pb-4">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2.5">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">{t("home.featured")}</span>
                <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700 text-[8px] sm:text-[9px] px-1 sm:px-1.5 h-4">{t("home.top_picks")}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={onBrowse} className="h-6 px-2 text-[10px] font-bold text-amber-600 hover:text-amber-700 gap-1">
                {t("common.all")} <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            {homeRecommendations && (
              <p className="mb-2 text-[10px] font-semibold leading-snug text-muted-foreground sm:text-xs">
                In-stock featured listings available within {homeRecommendations.nearbyRadiusKm} km of {homeRecommendations.location.label}, ordered by distance, stock, rating, and recency.
              </p>
            )}
            <div className="flex gap-1.5 sm:gap-3 overflow-x-auto pb-1 sm:pb-1.5 no-scrollbar">
              {featuredProducts.slice(0, 16).map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.025 }}
                  whileHover={{ y: -3 }}
                  className="flex-shrink-0 w-[88px] sm:w-[122px] group"
                  data-testid={`featured-card-${product.id}`}
                >
                  <div
                    role="link"
                    tabIndex={0}
                    aria-label={`Browse ${product.name} in its category`}
                    onClick={() => openProductCategory(product)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openProductCategory(product);
                      }
                    }}
                    className="cursor-pointer relative aspect-square rounded-lg sm:rounded-xl overflow-hidden border-2 border-amber-200/60 dark:border-amber-700/40 bg-muted mb-1 sm:mb-1.5 shadow-md transition-all group-hover:shadow-lg group-hover:border-amber-400 group-hover:scale-[1.02]"
                  >
                    <img
                      src={resolveProductImageForProduct(product).src}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1540420828642-fca2c5c18abe?w=300&h=300&fit=crop`; }}
                    />
                    <div className="absolute top-1 left-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
                      <Star className="h-2 w-2 sm:h-3 sm:w-3 text-white fill-white" />
                    </div>
                    <div className="absolute top-1 right-1">
                      <Badge className="bg-background/90 border border-amber-300 text-amber-700 dark:text-amber-300 h-4 sm:h-5 px-1 sm:px-1.5 text-[8px] sm:text-[10px] font-bold">{format(product.price, { sourceCurrency: product.currency || "GBP" })}</Badge>
                    </div>
                    <FavoriteProductButton
                      productId={product.id}
                      productName={product.name}
                      data-testid={`button-hero-featured-favorite-${product.id}`}
                      className="!absolute bottom-1 right-1 h-6 w-6 bg-background/95 text-red-500 shadow-md hover:bg-red-50 hover:text-red-600"
                    />
                  </div>
                  <h3 className="text-[10px] sm:text-[12px] font-bold text-foreground truncate group-hover:text-amber-600 transition-colors">{product.name}</h3>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate leading-tight">
                    {product.farmerName} · {product.distance?.toFixed(1)} km
                  </p>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <span className="text-[11px] sm:text-[13px] font-black text-amber-600 dark:text-amber-400 leading-none">{format(product.price, { sourceCurrency: product.currency || "GBP" })}</span>
                    <span className="text-[8px] sm:text-[10px] text-muted-foreground leading-none">/{product.unit}</span>
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-1 h-6 sm:h-7 px-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-tight gap-1 bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={(e) => { e.stopPropagation(); onAddToCart?.(product); }}
                    data-testid={`button-hero-featured-add-${product.id}`}
                  >
                  <ShoppingCart className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  {t("product.add_short")}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
        )}

        {/* ─── COMMUNITY FREE ITEMS — 2 rows, live Share & Care data ─── */}
        {shareCareItems.length > 0 && (
          <div className="px-3 sm:container sm:mx-auto sm:px-4 pb-2 sm:pb-4">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">{t("home.free_items")}</span>
                <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 h-4 border-orange-200 dark:border-orange-700 text-orange-600 dark:text-orange-400 flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block animate-pulse" />
                  {t("common.live")}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/share-care")}
                className="h-6 px-2 text-[10px] font-bold text-orange-600 hover:text-orange-700 gap-1"
                data-testid="btn-share-care-all">
                <span className="hidden sm:inline">{t("share.title")}</span>
                <span className="sm:hidden">{t("nav.more")}</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1 sm:gap-1.5">
              {shareCareItems.slice(0, 12).map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate("/share-care")}
                  data-testid={`free-item-${item.id}`}
                  className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-orange-100 dark:border-orange-900/40 bg-orange-50/40 dark:bg-orange-950/20 hover:border-orange-300 hover:bg-orange-100/50 dark:hover:bg-orange-900/30 transition-all text-left group min-w-0"
                >
                  <span className="text-base sm:text-xl leading-none flex-shrink-0">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] sm:text-[12px] font-bold text-foreground truncate group-hover:text-orange-600 transition-colors leading-tight">{item.name}</div>
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      <span className="text-[9px] sm:text-[11px] text-orange-500 font-bold uppercase">{t("product.free")}</span>
                      <span className="text-[8px] sm:text-[10px] text-muted-foreground">· {item.postedAgo}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── ALL CATEGORIES ─── */}
        <div className="border-t border-border/30 bg-background">
          <div className="px-3 sm:container sm:mx-auto sm:px-4 pt-2 sm:pt-5 pb-3 sm:pb-6">

            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-5 flex-wrap">
              <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-primary flex-shrink-0" />
              <h2 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-[0.12em] text-foreground">{t("home.all_categories")}</h2>
              <span className="text-xs sm:text-sm text-muted-foreground font-black">
                ({HOME_CATEGORY_TILES.length})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-11">
              {HOME_CATEGORY_TILES.map((tile) => {
                const image = categoryImages[tile.imageId] || categoryImages[tile.categoryId];
                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => openHomeCategoryTile(tile)}
                    data-testid={`${tile.isSubcategory ? "subcategory" : "main-category"}-${tile.id}`}
                    aria-label={`Open ${tile.label} ${tile.isSubcategory ? "subcategory" : "category"}`}
                    className={`group relative aspect-[4/3] min-w-0 overflow-hidden rounded-2xl border-2 bg-muted text-left shadow-md transition-all duration-200 hover:-translate-y-1 hover:border-primary/80 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 ${
                      tile.isSubcategory ? "border-border/80" : "border-primary"
                    }`}
                  >
                    {image ? (
                      <img
                        src={image}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-primary/15" />
                    )}
                    <div className={`absolute inset-0 bg-gradient-to-t via-black/30 to-transparent transition-colors group-hover:from-primary/95 ${
                      tile.isSubcategory ? "from-black/85" : "from-black/95"
                    }`} />
                    {tile.isSubcategory && (
                      <span className="absolute left-2 top-2 rounded-lg bg-amber-400 text-black px-2 py-0.5 text-[9px] sm:text-xs font-black uppercase tracking-wider shadow-sm">
                        Sub
                      </span>
                    )}
                    <span className="absolute inset-x-2 bottom-2 line-clamp-2 text-center text-xs sm:text-sm font-black leading-tight text-white drop-shadow-md uppercase tracking-tight">
                      {tile.label}
                    </span>
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
});
