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
  ShoppingBag, ShoppingCart, Zap, Sun, Droplets,
  BarChart3, Wifi, Compass, Mountain, Map, Plus, MapPin,
  ChevronRight, Check,
} from "lucide-react";
import { LeafletFarmerMap } from "./leaflet-farmer-map";
import { HeroServiceGrid } from "./hero-service-grid";
import { UserBookmarks } from "./user-bookmarks";
import type { HomeProductRecommendations, Product } from "@shared/schema";
import { resolveProductImageForProduct } from "@/lib/product-images";
import { handleCategoryImageError, resolveCategoryImage } from "@/lib/categories";
import { useCatalogCategories } from "@/hooks/use-catalog-categories";
import { MAIN_MARKETPLACE_CATEGORIES } from "@/lib/main-marketplace-categories";
import { FavoriteProductButton } from "./favorite-product-button";
import { buildCategoryBrowseUrl } from "@/lib/product-navigation";
import { useCurrency } from "@/contexts/currency-context";
import { useAuth } from "@/hooks/use-auth";
import { useLiveLocation } from "@/contexts/live-location-context";

type ShareCareItem = { id: string; name: string; unit: string; qty: number; donor: string; location: string; emoji: string; postedAgo: string; category: string };

type PlatformStatistics = {
  farmers: number;
  products: number;
  freeItems: number;
  buyers: number;
  students: number;
  services: number;
  updatedAt?: string;
};

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
  imageUrl?: string;
  isSubcategory: boolean;
};

type HeroMapMode = "products" | "live-needs" | "farms-nearby" | "land-lots";

const HERO_MAP_MODES: { id: HeroMapMode; label: string; emoji: string; overlays: { farmers?: boolean; needs?: boolean; heatmap?: boolean; land?: boolean } }[] = [
  { id: "products", label: "Products & Farmers", emoji: "🌱", overlays: { farmers: true, needs: false, heatmap: false, land: false } },
  { id: "live-needs", label: "Live Needs", emoji: "📍", overlays: { farmers: false, needs: true, heatmap: false, land: false } },
  { id: "farms-nearby", label: "Farms Nearby", emoji: "🏡", overlays: { farmers: true, needs: false, heatmap: true, land: false } },
  { id: "land-lots", label: "Land & Lots", emoji: "🗺️", overlays: { farmers: false, needs: false, heatmap: false, land: true } },
];

export const HeroSection = memo(function HeroSection({ onBrowse, products, onFarmerClick, onAddToCart }: HeroSectionProps) {
  const { format } = useCurrency();
  const { data: publishedCategories = [] } = useCatalogCategories("buyer");
  const homeCategoryTiles: HomeCategoryTile[] = publishedCategories.flatMap((category) => {
    const label = MAIN_MARKETPLACE_CATEGORIES.find((item) => item.id === category.id)?.label ?? category.name;
    return [{ id: category.id, label, categoryId: category.id, imageId: category.id, imageUrl: category.imageUrl, isSubcategory: false }, ...category.subcategories.map((subcategory) => ({ id: `${category.id}-${subcategory.id}`, label: subcategory.name, categoryId: category.id, subcategoryId: subcategory.id, imageId: subcategory.id, imageUrl: subcategory.imageUrl, isSubcategory: true }))];
  });
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { location: liveLocation } = useLiveLocation();
  const [, navigate] = useLocation();
  const isEmbeddedView = new URLSearchParams(window.location.search).get("embedded") === "1";
  const [heroMapMode, setHeroMapMode] = useState<HeroMapMode>("products");
  const [heroTileStyle, setHeroTileStyle] = useState<"standard" | "satellite" | "terrain" | "hybrid">("standard");
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
    <section className="relative isolate overflow-hidden bg-[#050d0d] text-white">

      {/* Atmospheric command-centre backdrop — kept separate from the live UI. */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none bg-cover bg-[35%_center] lg:bg-center"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(3,13,12,0.2) 0%, rgba(3,13,12,0.34) 43%, rgba(3,13,12,0.72) 100%), url('/images/agriconnect-command-center-bg.png')",
        }}
      />
      <div className="absolute inset-0 -z-10 pointer-events-none bg-[linear-gradient(180deg,rgba(3,12,11,0.02),rgba(3,12,11,0.28))]" />

      {/* ─── HERO SPLIT: Text + Map HUD Console ─── */}
      <div className="relative z-10 w-full overflow-hidden">
        <div ref={heroGridRef} className="flex flex-col lg:flex-row lg:min-h-[370px] w-full items-stretch">

          {/* ──────── MOBILE HERO (compact — Cyber HUD style) ──────── */}
          <div className="flex lg:hidden flex-col px-3 pt-3 pb-2 w-full min-w-0 gap-2.5 bg-[#061413]">
            {/* Live status pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              <div className="inline-flex items-center gap-1.5 bg-[#0a2723] border border-emerald-500/80 rounded-full px-2.5 py-0.5 shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <Leaf className="w-3 h-3 text-emerald-400" />
                <span className="text-[10.5px] font-black text-emerald-300 uppercase tracking-wider">{t("home.farm_to_table")}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-[#0a2723] border border-emerald-500/70 rounded-full px-2.5 py-0.5 shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10.5px] font-black text-emerald-300">{platformStats?.farmers ?? farmerCount} {t("home.farmers")}</span>
              </div>
              <span className="text-[11px] text-white/40 shrink-0">·</span>
              <span className="text-[11px] font-bold text-white/70 shrink-0"><span className="text-white font-black">{platformStats?.products ?? products.length}</span> {t("home.products")}</span>
              <span className="text-[11px] text-white/40 shrink-0">·</span>
              <span className="text-[11px] font-bold text-white/70 shrink-0"><span className="text-white font-black">{platformStats?.freeItems ?? shareCareItems.length}</span> {t("home.free_items")}</span>
            </div>

            {/* Headline */}
            <div>
              <h1 className="text-[24px] sm:text-[26px] font-black text-white leading-[1.15] tracking-tight uppercase">
                FRESH PRODUCE, <span className="text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]">DIRECT TO YOU</span>
              </h1>
              <p className="text-xs sm:text-sm text-white/85 leading-relaxed mt-1 font-semibold">
                Connecting you directly with local growers, Fair prices, verified quality, and sustainable impact.
              </p>
            </div>

            {/* Metric Strip */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-[#0b2120]/90 border border-emerald-800/60 border-t-2 border-t-amber-400 rounded-xl p-2 text-center shadow-xs">
                <span className="text-sm font-black text-white block">{platformStats?.farmers ?? farmerCount}</span>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">Farmers</span>
              </div>
              <div className="bg-[#0b2120]/90 border border-emerald-800/60 border-t-2 border-t-cyan-400 rounded-xl p-2 text-center shadow-xs">
                <span className="text-sm font-black text-white block">{platformStats?.products ?? products.length}</span>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">Products</span>
              </div>
              <div className="bg-[#0b2120]/90 border border-emerald-800/60 border-t-2 border-t-orange-400 rounded-xl p-2 text-center shadow-xs">
                <span className="text-sm font-black text-white block">{platformStats?.freeItems ?? shareCareItems.length}</span>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">Free Items</span>
              </div>
              <div className="bg-[#0b2120]/90 border border-emerald-800/60 border-t-2 border-t-blue-400 rounded-xl p-2 text-center shadow-xs">
                <span className="text-sm font-black text-white block">{platformStats?.buyers ?? 1}</span>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">Buyers</span>
              </div>
            </div>

            {/* AI Crop Intelligence & 2027 Field Network */}
            <div className="flex items-center justify-between gap-2 py-1">
              <div className="inline-flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/60 rounded-lg px-2.5 py-1 shadow-xs">
                <Activity className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px] font-black uppercase tracking-wider text-white">
                  AI CROP INTELLIGENCE
                </span>
                <span className="bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                  OPTIMAL
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-white tracking-wider drop-shadow-sm">
                <Zap className="h-4 w-4 text-cyan-400 fill-cyan-400 shrink-0" />
                <span>2027 FIELD NETWORK</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex gap-2 mt-1">
              <Button
                onClick={onBrowse}
                data-testid="button-mobile-shop-now"
                className="flex-1 h-11 bg-[#0e2a28] hover:bg-[#143d3a] border border-emerald-600/50 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md gap-1.5 px-2"
              >
                {t("home.shop_now")}<ArrowRight className="h-4 w-4 text-amber-400" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/map")}
                data-testid="button-mobile-live-map"
                className="flex-1 h-11 border-2 border-emerald-400 bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-wider rounded-xl gap-1.5 px-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {t("home.live_map")}
              </Button>
            </div>
          </div>

          {/* ──────── DESKTOP HERO — Text & Stats (≥lg only) ──────── */}
          <div ref={heroLeftRef} className="hidden lg:flex flex-col justify-center px-6 lg:px-8 py-5 lg:py-6 w-full overflow-hidden min-w-0">

            {/* Top pill tags */}
            <div className="flex items-center gap-2.5 flex-wrap mb-3">
              <div className="inline-flex items-center gap-1.5 bg-[#0a2723] border border-emerald-500/80 rounded-full px-3.5 py-1 text-xs font-black text-emerald-300 uppercase tracking-wider shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                <Leaf className="h-4 w-4 text-emerald-400" />
                {t("home.farm_to_table")}
              </div>
              <div className="inline-flex items-center gap-2 bg-[#0a2723] border border-emerald-500/80 rounded-full px-3.5 py-1 text-xs font-black text-emerald-300 uppercase tracking-wider shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-xs" />
                <span>{platformStats?.farmers ?? farmerCount} {t("home.farmers")}</span>
              </div>
            </div>

            {/* Big Headline */}
            <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-black text-white mb-2 leading-[1.05] tracking-tight uppercase">
              <span className="block">FRESH PRODUCE,</span>
              <span className="block text-amber-400 drop-shadow-[0_0_18px_rgba(245,158,11,0.45)] whitespace-nowrap">
                DIRECT TO YOU
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base font-bold text-white/90 mb-4 leading-relaxed max-w-lg">
              Connecting you directly with local growers, Fair prices, verified quality, and sustainable impact.
            </p>

            {/* 4 HUD Stat Cards + 3D Wireframe Cyber Globe with 2027 Badge */}
            <div className="flex items-center gap-3 mb-4 max-w-xl">
              {/* 4 Metric Cards */}
              <div className="grid grid-cols-4 gap-2 flex-1">
                {/* Farmer Stat Card */}
                <div className="bg-[#0b2120]/95 backdrop-blur-md border border-emerald-800/60 border-t-2 border-t-amber-400 rounded-xl py-2 px-2 flex flex-col items-center text-center shadow-lg hover:border-emerald-500 transition-all">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center mb-1 text-amber-400">
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="text-lg xl:text-xl font-black text-white leading-none my-0.5">
                    {platformStats?.farmers ?? farmerCount}
                  </span>
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-300">
                    FARMERS
                  </span>
                </div>

                {/* Products Stat Card */}
                <div className="bg-[#0b2120]/95 backdrop-blur-md border border-emerald-800/60 border-t-2 border-t-cyan-400 rounded-xl py-2 px-2 flex flex-col items-center text-center shadow-lg hover:border-emerald-500 transition-all">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center mb-1 text-cyan-400">
                    <Sprout className="h-4 w-4" />
                  </div>
                  <span className="text-lg xl:text-xl font-black text-white leading-none my-0.5">
                    {platformStats?.products ?? products.length}
                  </span>
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-300">
                    PRODUCTS
                  </span>
                </div>

                {/* Free Items Stat Card */}
                <div className="bg-[#0b2120]/95 backdrop-blur-md border border-emerald-800/60 border-t-2 border-t-orange-400 rounded-xl py-2 px-2 flex flex-col items-center text-center shadow-lg hover:border-emerald-500 transition-all">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center mb-1 text-orange-400">
                    <Zap className="h-4 w-4" />
                  </div>
                  <span className="text-lg xl:text-xl font-black text-white leading-none my-0.5">
                    {platformStats?.freeItems ?? shareCareItems.length}
                  </span>
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-300">
                    FREE ITEMS
                  </span>
                </div>

                {/* Buyers Stat Card */}
                <div className="bg-[#0b2120]/95 backdrop-blur-md border border-emerald-800/60 border-t-2 border-t-blue-400 rounded-xl py-2 px-2 flex flex-col items-center text-center shadow-lg hover:border-emerald-500 transition-all">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center mb-1 text-blue-400">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <span className="text-lg xl:text-xl font-black text-white leading-none my-0.5">
                    {platformStats?.buyers ?? 1}
                  </span>
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-300">
                    BUYERS
                  </span>
                </div>
              </div>

              {/* AI status card; the generated backdrop supplies the globe artwork. */}
              <div className="relative w-28 h-20 shrink-0 hidden sm:flex items-center justify-center">
                <div className="relative z-10 bg-[#0a1b1a]/88 border border-slate-400/25 rounded-xl px-2.5 py-1.5 text-center shadow-[inset_0_1px_rgba(255,255,255,0.08),0_12px_28px_rgba(0,0,0,0.32)] backdrop-blur-md">
                  <span className="text-xs font-black text-emerald-300 block leading-tight tracking-wider">
                    2027
                  </span>
                  <span className="text-[8.5px] font-black uppercase text-white/90 block leading-tight">
                    AI Crop Intelligence
                  </span>
                  <span className="text-[8px] font-black uppercase text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                  </span>
                </div>
              </div>
            </div>

            {/* AI Crop Intelligence & 2027 Field Network */}
            <div className="space-y-2 mb-4">
              <div>
                <div className="inline-flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/60 rounded-lg px-3 py-1 shadow-xs backdrop-blur-xs">
                  <Activity className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                    AI CROP INTELLIGENCE
                  </span>
                  <span className="bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-[9.5px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                    OPTIMAL
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-white tracking-widest drop-shadow-md">
                <Zap className="h-4 w-4 text-cyan-400 fill-cyan-400 shrink-0" />
                <span>2027 FIELD NETWORK</span>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <Button
                onClick={onBrowse}
                className="bg-[#0a2220] hover:bg-[#123835] border border-emerald-600/60 hover:border-emerald-400 text-white px-6 h-11 text-xs sm:text-sm font-black uppercase tracking-wider rounded-xl shadow-lg gap-2 transition-all"
              >
                <span>SHOP NOW</span>
                <ArrowRight className="h-4 w-4 text-amber-400" />
              </Button>

              <Button
                variant="outline"
                className="border-2 border-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-6 h-11 text-xs sm:text-sm font-black uppercase tracking-wider rounded-xl gap-2 shadow-[0_0_18px_rgba(16,185,129,0.35)] cursor-pointer"
                onClick={() => navigate("/map")}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE MAP</span>
              </Button>
            </div>

            {/* Trust Badges Row */}
            <div className="flex gap-3.5 sm:gap-5 flex-wrap items-center">
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-black">
                <Check className="h-4 w-4 text-emerald-400 stroke-[2.5]" />
                <span>Verified Farms</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-blue-300 font-black">
                <Truck className="h-4 w-4 text-blue-400 stroke-[2.5]" />
                <span>Farm-to-Door</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-black">
                <Leaf className="h-4 w-4 text-emerald-400 stroke-[2.5]" />
                <span>100% Natural</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-purple-300 font-black">
                <Globe className="h-4 w-4 text-purple-400 stroke-[2.5]" />
                <span>75+ Regions</span>
              </div>
              <div className="bg-[#0c2a27] border border-emerald-500/60 text-emerald-300 text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Check className="h-3 w-3 stroke-[2.5]" />
                <span>2027 Target</span>
              </div>
            </div>

          </div>

          {/* MOBILE-ONLY compact map */}
          <div className="block lg:hidden relative w-full px-3" style={{ height: mobileMapHeight }}>
            <div className="w-full h-full rounded-2xl overflow-hidden border border-emerald-700/40 shadow-xl relative">
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
            <div className="absolute bottom-2 left-2 right-2 z-[500] flex gap-1 flex-nowrap justify-between pointer-events-auto">
              {HERO_MAP_MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setHeroMapMode(mode.id)}
                  data-testid={`btn-mobile-map-mode-${mode.id}`}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-0.5 px-1 py-0.5 rounded-md text-[7px] font-bold border shadow-sm backdrop-blur-md transition-all ${heroMapMode === mode.id ? "bg-emerald-500 text-white border-emerald-400" : "bg-black/60 text-white/85 border-white/15"}`}
                >
                  <span className="text-[8px] shrink-0">{mode.emoji}</span>
                  <span className="truncate">{mode.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* MOBILE-ONLY map resize handle */}
          <div
            onMouseDown={(e) => { e.preventDefault(); startMobileMapDrag(e.clientY); }}
            onTouchStart={(e) => { startMobileMapDrag(e.touches[0].clientY); }}
            data-testid="mobile-map-resize-handle"
            title={t("map.drag_to_resize")}
            className="block lg:hidden mx-3 mt-1.5 mb-2 h-6 rounded-full cursor-row-resize touch-none select-none relative overflow-hidden bg-gradient-to-r from-emerald-500/20 via-emerald-400/40 to-emerald-500/20 border border-emerald-400/50 shadow-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <span className="relative z-10 text-[9px] font-black uppercase tracking-wider text-white drop-shadow-xs">
              {t("map.drag_to_resize")}
            </span>
          </div>

          {/* DRAG HANDLE */}
          <div
            onMouseDown={startHeroDrag}
            title={t("map.drag_to_resize")}
            data-testid="hero-resize-handle"
            className="hidden lg:flex flex-col items-center justify-center w-3 cursor-col-resize group flex-shrink-0 z-20 hover:bg-white/5 transition-colors"
          >
            <div className="flex flex-col gap-1">
              <div className="w-0.5 h-5 rounded-full bg-emerald-500/30 group-hover:bg-emerald-400/80 transition-colors" />
              <div className="w-0.5 h-2 rounded-full bg-emerald-500/20 group-hover:bg-emerald-400/60 transition-colors" />
              <div className="w-0.5 h-5 rounded-full bg-emerald-500/30 group-hover:bg-emerald-400/80 transition-colors" />
            </div>
          </div>

          {/* ──────── DESKTOP SATELLITE HUD CONSOLE (≥lg only) ──────── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative hidden lg:flex flex-1 p-2.5 pl-0"
          >
            {/* Outer Gunmetal Metallic Bezel Frame */}
            <div className="relative w-full h-full rounded-3xl p-1 bg-gradient-to-b from-[#163330] via-[#091a18] to-[#040f0e] border-2 border-[#1a4b44] shadow-[0_0_35px_rgba(4,20,18,0.9),inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col overflow-hidden">

              {/* Top Notch Header */}
              <div className="flex items-center justify-between px-3.5 py-2 bg-[#061413]/95 border-b border-[#143d37] z-30 rounded-t-2xl gap-3">
                {/* Left Layer Switcher Tabs */}
                <div className="flex items-center gap-1 bg-[#030c0b]/90 p-1 rounded-xl border border-[#143d37]">
                  <button
                    onClick={() => setHeroTileStyle("standard")}
                    className={`px-3 py-1 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      heroTileStyle === "standard"
                        ? "bg-amber-400 text-amber-950 shadow-sm font-black"
                        : "text-slate-300 hover:text-white hover:bg-[#0b211f]"
                    }`}
                  >
                    STANDARD
                  </button>
                  <button
                    onClick={() => setHeroTileStyle("satellite")}
                    className={`px-3 py-1 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      heroTileStyle === "satellite"
                        ? "bg-amber-400 text-amber-950 shadow-sm font-black"
                        : "text-slate-300 hover:text-white hover:bg-[#0b211f]"
                    }`}
                  >
                    SATELLITE
                  </button>
                  <button
                    onClick={() => setHeroTileStyle("terrain")}
                    className={`px-3 py-1 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      heroTileStyle === "terrain"
                        ? "bg-amber-400 text-amber-950 shadow-sm font-black"
                        : "text-slate-300 hover:text-white hover:bg-[#0b211f]"
                    }`}
                  >
                    TERRAIN / 3D
                  </button>
                  <button
                    onClick={() => navigate("/map")}
                    className="px-3 py-1 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-300 hover:text-emerald-200 hover:bg-[#0b211f] transition-all cursor-pointer"
                  >
                    BUYERS VIEW
                  </button>
                </div>

                {/* Center AGRI CONNECT HUD Badge */}
                <div className="bg-gradient-to-r from-[#0d2a27] via-[#103a35] to-[#0d2a27] border border-[#1b554c] rounded-xl px-3.5 py-1 shadow-md flex items-center gap-2 shrink-0">
                  <Leaf className="h-4 w-4 text-emerald-400 fill-emerald-400" />
                  <span className="text-xs font-black tracking-widest text-emerald-300 uppercase">AGRI CONNECT</span>
                </div>

                {/* Right Status LEDs */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-700/40 text-[10px] font-black tracking-wider text-cyan-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>NETWORK</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-700/40 text-[10px] font-black tracking-wider text-emerald-300">
                    <Zap className="h-3 w-3 text-emerald-400 fill-emerald-400" />
                    <span>POWER</span>
                  </div>
                </div>
              </div>

              {/* Main Map Viewport with Leaflet & Overlays */}
              <div className="relative flex-1 w-full overflow-hidden rounded-b-2xl">
                <LeafletFarmerMap
                  products={products}
                  onFarmerClick={onFarmerClick}
                  height="100%"
                  initialZoom={7}
                  center={[52.3, -1.0]}
                  showControls={false}
                  showLayerSwitcher={false}
                  tileStyle={heroTileStyle}
                  mapOverlays={HERO_MAP_MODES.find(m => m.id === heroMapMode)?.overlays}
                />

                {/* Animated Glowing Fair-Price Route Lines Overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-[1000]" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="routeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
                      <stop offset="50%" stopColor="#34d399" stopOpacity="1" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.85" />
                    </linearGradient>
                    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {/* Glowing Route Polyline */}
                  <path
                    d="M 120 180 Q 220 140 320 210 T 520 200 T 680 160 T 820 220"
                    fill="none"
                    stroke="url(#routeGlow)"
                    strokeWidth="3.5"
                    filter="url(#neonGlow)"
                    strokeDasharray="8 4"
                    className="animate-pulse"
                  />
                  {/* Checkpoint Nodes */}
                  <circle cx="320" cy="210" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                  <circle cx="520" cy="200" r="6" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
                  <circle cx="680" cy="160" r="5" fill="#fbbf24" stroke="#ffffff" strokeWidth="2" />
                </svg>

                {/* Floating Top-Left Route Tracker Badge */}
                <div className="absolute top-3 left-3 z-[1200] bg-[#071917]/90 backdrop-blur-md border border-emerald-600/70 rounded-xl px-2.5 py-1.5 shadow-xl text-white pointer-events-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-emerald-300">
                      CURRENT FAIR-PRICE ROUTES
                    </span>
                  </div>
                </div>


                {/* Floating Weather Card (Bottom Left) */}
                <div className="absolute bottom-12 left-3 z-[1200] bg-[#071917]/95 backdrop-blur-md border border-emerald-700/60 rounded-xl p-2.5 shadow-2xl text-white w-44 pointer-events-auto">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-300">WEATHER</span>
                    <Sun className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-white leading-none">91°F</span>
                    <span className="text-[10.5px] font-bold text-amber-400">/ 37.1°C</span>
                    <span className="text-[9px] font-black text-emerald-400 uppercase ml-auto">SUNNY</span>
                  </div>
                  <div className="flex items-center justify-between text-[8.5px] text-slate-300 font-bold mt-1.5 pt-1 border-t border-emerald-900/60">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 0 Online
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> 0 Needs
                    </span>
                  </div>
                </div>

                {/* Right-Side Telemetry Panel (Moisture Graph + Soil Analysis) */}
                <div className="absolute bottom-12 right-3 z-[1200] flex flex-col gap-2 pointer-events-auto">
                  {/* Moisture Data Widget */}
                  <div className="bg-[#071917]/95 backdrop-blur-md border border-emerald-700/60 rounded-xl p-2 shadow-2xl text-white w-44">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-300">MOISTURE DATA</span>
                      <Droplets className="h-3 w-3 text-cyan-400" />
                    </div>
                    {/* Live SVG Curve Graph */}
                    <div className="h-10 w-full bg-[#040f0e] rounded-lg p-1 relative overflow-hidden flex items-end">
                      <svg className="w-full h-full text-emerald-400" viewBox="0 0 100 40" fill="none" preserveAspectRatio="none">
                        <path d="M0,30 Q15,10 30,25 T60,15 T85,5 T100,20" fill="none" stroke="#10b981" strokeWidth="2" />
                        <path d="M0,30 Q15,10 30,25 T60,15 T85,5 T100,20 L100,40 L0,40 Z" fill="rgba(16,185,129,0.15)" />
                      </svg>
                      <span className="absolute top-1 left-1 text-[7.5px] text-slate-500 font-mono">90%</span>
                      <span className="absolute bottom-1 right-1 text-[7.5px] text-emerald-300 font-mono font-bold">28.5%</span>
                    </div>
                  </div>

                  {/* Soil Analysis Widget */}
                  <div className="bg-[#071917]/95 backdrop-blur-md border border-emerald-700/60 rounded-xl p-2 shadow-2xl text-white w-44">
                    <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-300 block mb-1">
                      SOIL ANALYSIS
                    </span>
                    {/* Strata layer representation */}
                    <div className="h-6 w-full rounded-md overflow-hidden flex flex-col border border-emerald-900/60">
                      <div className="h-2 bg-emerald-800/80 w-full" />
                      <div className="h-2 bg-amber-900/80 w-full" />
                      <div className="h-2 bg-stone-900 w-full" />
                    </div>
                    <span className="text-[8px] text-emerald-300 font-bold block mt-1">
                      Current Moisture: ~3.8% analysis
                    </span>
                  </div>
                </div>

                {/* Bottom Center Status Notch */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1200] bg-[#071917]/95 border-2 border-emerald-500/80 rounded-full px-4 py-1 text-center shadow-xl flex items-center gap-2 whitespace-nowrap">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10.5px] sm:text-xs font-black uppercase tracking-wider text-emerald-300">
                    AgriConnect AI Powered Map
                  </span>
                </div>



              </div>
            </div>
          </motion.div>
        </div>

        {/* ─── QUICK ACCESS & MY SITES (Cyber-HUD Panoramic Command Deck) ─── */}
        <div className="px-3 sm:px-5 lg:px-7 pb-2.5 pt-1.5 w-full overflow-hidden space-y-2 relative">
          <HeroServiceGrid />
          <UserBookmarks />
        </div>
      </div>

      {/* ─── BOTTOM CONTENT STRIP ─── */}
      <div className="relative z-10 bg-background border-t border-border/50">

        {/* ─── FRESH PICKS CAROUSEL ─── */}
        <div className="px-3 sm:container sm:mx-auto sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
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
                  className="cursor-pointer relative aspect-square rounded-lg sm:rounded-xl overflow-hidden border border-border/50 bg-muted mb-1 sm:mb-1.5 shadow-xs transition-all group-hover:shadow-md group-hover:border-primary/30 group-hover:scale-[1.02]"
                >
                  <img
                    src={resolveProductImageForProduct(product).src}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1540420828642-fca2c5c18abe?w=300&h=300&fit=crop`; }}
                  />
                  <div className="absolute top-1 right-1">
                    <Badge className="bg-primary/95 border-none h-4 sm:h-5 px-1 sm:px-1.5 text-[8px] sm:text-[10px] font-bold shadow-xs">{format(product.price, { sourceCurrency: product.currency || "GBP" })}</Badge>
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

        {/* ─── FEATURED PRODUCTS ─── */}
        {featuredProducts.length > 0 && (
          <div className="px-3 sm:container sm:mx-auto sm:px-4 pb-2 sm:pb-3">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
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
            <div className="flex gap-1.5 sm:gap-2.5 overflow-x-auto pb-1 sm:pb-1.5 no-scrollbar">
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
                    className="cursor-pointer relative aspect-square rounded-lg sm:rounded-xl overflow-hidden border-2 border-amber-200/60 dark:border-amber-700/40 bg-muted mb-1 sm:mb-1.5 shadow-xs transition-all group-hover:shadow-md group-hover:border-amber-400 group-hover:scale-[1.02]"
                  >
                    <img
                      src={resolveProductImageForProduct(product).src}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1540420828642-fca2c5c18abe?w=300&h=300&fit=crop`; }}
                    />
                    <div className="absolute top-1 left-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-400 flex items-center justify-center shadow-xs">
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

        {/* ─── COMMUNITY FREE ITEMS ─── */}
        {shareCareItems.length > 0 && (
          <div className="px-3 sm:container sm:mx-auto sm:px-4 pb-2 sm:pb-3">
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
          <div className="px-3 sm:container sm:mx-auto sm:px-4 pt-2 sm:pt-4 pb-3 sm:pb-5">

            <div className="flex items-center gap-2 sm:gap-2.5 mb-2.5 sm:mb-3 flex-wrap">
              <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-primary flex-shrink-0" />
              <h2 className="text-xs sm:text-sm md:text-base font-black uppercase tracking-[0.12em] text-foreground">{t("home.all_categories")}</h2>
              <span className="text-xs text-muted-foreground font-black">
                ({homeCategoryTiles.length})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-11">
              {homeCategoryTiles.map((tile) => {
                const image = resolveCategoryImage(tile.imageId, tile.imageUrl, tile.categoryId);
                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => openHomeCategoryTile(tile)}
                    data-testid={`${tile.isSubcategory ? "subcategory" : "main-category"}-${tile.id}`}
                    aria-label={`Open ${tile.label} ${tile.isSubcategory ? "subcategory" : "category"}`}
                    className={`group relative aspect-[4/3] min-w-0 overflow-hidden rounded-xl border bg-muted text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0 ${
                      tile.isSubcategory ? "border-border/80" : "border-primary"
                    }`}
                  >
                    {image ? (
                      <img
                        src={image}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(event) => handleCategoryImageError(event.currentTarget, tile.imageId, tile.categoryId)}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-primary/15" />
                    )}
                    <div className={`absolute inset-0 bg-gradient-to-t via-black/30 to-transparent transition-colors group-hover:from-primary/95 ${
                      tile.isSubcategory ? "from-black/85" : "from-black/95"
                    }`} />
                    {tile.isSubcategory && (
                      <span className="absolute left-1.5 top-1.5 rounded bg-amber-400 text-black px-1.5 py-0.2 text-[8px] sm:text-[10px] font-black uppercase tracking-wider shadow-xs">
                        Sub
                      </span>
                    )}
                    <span className="absolute inset-x-1.5 bottom-1.5 line-clamp-2 text-center text-[11px] sm:text-xs font-black leading-tight text-white drop-shadow-md uppercase tracking-tight">
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
