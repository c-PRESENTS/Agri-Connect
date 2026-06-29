import "leaflet/dist/leaflet.css";
import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Star, Users, Leaf, TrendingUp,
  ShieldCheck, Truck, Sprout, Globe, Activity, Zap, Satellite,
  GripVertical, PlusCircle, EyeOff, Pencil, Check, X as XIcon,
  ShoppingCart,
} from "lucide-react";
import { LeafletFarmerMap } from "./leaflet-farmer-map";
import { HeroServiceGrid } from "./hero-service-grid";
import { UserBookmarks } from "./user-bookmarks";
import type { Product } from "@shared/schema";
import { getProductImage } from "@/lib/product-images";
import { categoryImages } from "@/lib/categories";

const CAT_LS_KEY = "agri-all-cats-v1";
type ShareCareItem = { id: string; name: string; unit: string; qty: number; donor: string; location: string; emoji: string; postedAgo: string; category: string };

const ALL_PRODUCT_CATS = [
  { key: "vegetables",       emoji: "🥦", label: "Vegetables"     },
  { key: "fruits",           emoji: "🍎", label: "Fruits"         },
  { key: "dairy",            emoji: "🥛", label: "Dairy & Eggs"   },
  { key: "grains",           emoji: "🌾", label: "Grains"         },
  { key: "pulses",           emoji: "🫘", label: "Pulses"         },
  { key: "oils",             emoji: "🫒", label: "Cooking Oils"   },
  { key: "meat",             emoji: "🥩", label: "Meat"           },
  { key: "fish",             emoji: "🐟", label: "Fish & Seafood" },
  { key: "spices",           emoji: "🌶️",label: "Spices"         },
  { key: "flowers",          emoji: "🌸", label: "Flowers"        },
  { key: "organic",          emoji: "🌿", label: "Organic"        },
  { key: "honey",            emoji: "🍯", label: "Honey & Bee"    },
  { key: "mushrooms",        emoji: "🍄", label: "Mushrooms"      },
  { key: "medicinal",        emoji: "💊", label: "Medicinal"      },
  { key: "seeds",            emoji: "🌱", label: "Seeds"          },
  { key: "fertilizers",     emoji: "🪣",  label: "Fertilizers"   },
  { key: "pesticides",       emoji: "🧪", label: "Pesticides"     },
  { key: "tools",            emoji: "🔧", label: "Tools"          },
  { key: "machinery",        emoji: "🚜", label: "Machinery"      },
  { key: "irrigation",       emoji: "💧", label: "Irrigation"     },
  { key: "protective-gear",  emoji: "🧤", label: "Safety Gear"    },
  { key: "dairy-animals",    emoji: "🐄", label: "Livestock"      },
  { key: "poultry",          emoji: "🐓", label: "Poultry"        },
  { key: "aquaculture",      emoji: "🐠", label: "Aquaculture"    },
  { key: "tea",              emoji: "🍵", label: "Tea"            },
  { key: "coffee",           emoji: "☕", label: "Coffee"         },
  { key: "timber",           emoji: "🪵", label: "Timber"         },
  { key: "animal-feed",      emoji: "🌾", label: "Animal Feed"    },
  { key: "hydroponics",      emoji: "🌊", label: "Hydroponics"    },
  { key: "greenhouse",       emoji: "🏠", label: "Greenhouse"     },
  { key: "bakery",           emoji: "🍞", label: "Bakery"         },
  { key: "snacks",           emoji: "🍿", label: "Snacks"         },
  { key: "pickles",          emoji: "🥫", label: "Pickles"        },
  { key: "plantation",       emoji: "🌴", label: "Plantation"     },
  { key: "fibre",            emoji: "🧵", label: "Fibre Crops"    },
  { key: "farming-services", emoji: "🚛", label: "Farm Services"  },
];

interface HeroSectionProps {
  onBrowse: () => void;
  products: Product[];
  onFarmerClick: (farmerId: string) => void;
  onAddToCart?: (product: Product) => void;
}

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "Verified Farms", color: "text-green-300" },
  { icon: Truck, label: "Farm-to-Door", color: "text-blue-300" },
  { icon: Leaf, label: "100% Natural", color: "text-emerald-300" },
  { icon: Globe, label: "75+ Regions", color: "text-purple-300" },
];

type HeroMapMode = "products" | "live-needs" | "farms-nearby" | "land-lots";

const HERO_MAP_MODES: { id: HeroMapMode; label: string; emoji: string; overlays: { farmers?: boolean; needs?: boolean; heatmap?: boolean } }[] = [
  { id: "products", label: "Products & Farmers", emoji: "🌱", overlays: { farmers: true, needs: false, heatmap: false } },
  { id: "live-needs", label: "Live Needs", emoji: "📍", overlays: { farmers: false, needs: true, heatmap: false } },
  { id: "farms-nearby", label: "Farms Nearby", emoji: "🏡", overlays: { farmers: true, needs: false, heatmap: true } },
  { id: "land-lots", label: "Land & Lots", emoji: "🗺️", overlays: { farmers: false, needs: false, heatmap: false } },
];

function loadCatPrefs(): { order: string[]; hidden: string[] } {
  try {
    const v = localStorage.getItem(CAT_LS_KEY);
    if (v) return JSON.parse(v);
  } catch {}
  return { order: ALL_PRODUCT_CATS.map(c => c.key), hidden: [] };
}
function saveCatPrefs(p: { order: string[]; hidden: string[] }) {
  localStorage.setItem(CAT_LS_KEY, JSON.stringify(p));
}

export function HeroSection({ onBrowse, products, onFarmerClick, onAddToCart }: HeroSectionProps) {
  const [, navigate] = useLocation();
  const [liveOrders, setLiveOrders] = useState(1427);
  const [activeFarmers, setActiveFarmers] = useState(89);
  const [heroMapMode, setHeroMapMode] = useState<HeroMapMode>("products");
  const [heroLeftPct, setHeroLeftPct] = useState(42);
  const heroGridRef = useRef<HTMLDivElement | null>(null);
  const heroLeftRef = useRef<HTMLDivElement | null>(null);
  const heroDragging = useRef<{ startX: number; startPct: number; containerW: number } | null>(null);

  // All Categories – order & visibility managed by user
  const [catPrefs, setCatPrefs] = useState(loadCatPrefs);
  const [catEditMode, setCatEditMode] = useState(false);
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
  const catDragIdx = useRef<number | null>(null);
  const persistCatPrefs = (p: { order: string[]; hidden: string[] }) => { setCatPrefs(p); saveCatPrefs(p); };

  const orderedCats = catPrefs.order
    .map(k => ALL_PRODUCT_CATS.find(c => c.key === k))
    .filter(Boolean) as typeof ALL_PRODUCT_CATS;
  // append any new cats not yet in user order
  const allKeys = new Set(catPrefs.order);
  ALL_PRODUCT_CATS.forEach(c => { if (!allKeys.has(c.key)) orderedCats.push(c); });

  // Share & Care live items (live query)
  const { data: shareCareItems = [] } = useQuery<ShareCareItem[]>({
    queryKey: ["/api/share-care"],
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

  useEffect(() => {
    const t = setInterval(() => {
      setLiveOrders(n => n + Math.floor(Math.random() * 3));
      setActiveFarmers(n => Math.max(70, Math.min(120, n + (Math.random() > 0.5 ? 1 : -1))));
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const paidProducts = products.filter(p => p.price > 0);
  const featuredProducts = products.filter(p => p.isFeatured);
  const farmerCount = new Set(products.map(p => p.farmerId)).size;

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
                <span className="text-[9px] font-bold text-green-300">{activeFarmers} live</span>
              </div>
              <span className="text-[9px] text-white/40 shrink-0">·</span>
              <span className="text-[9px] font-semibold text-white/60 shrink-0"><span className="text-white/90 font-black">{farmerCount}+</span> farms</span>
              <span className="text-[9px] text-white/40 shrink-0">·</span>
              <span className="text-[9px] font-semibold text-white/60 shrink-0"><span className="text-white/90 font-black">{products.length}+</span> products</span>
              <span className="text-[9px] text-white/40 shrink-0">·</span>
              <span className="text-[9px] font-semibold text-white/60 shrink-0"><span className="text-white/90 font-black">{liveOrders.toLocaleString()}</span> orders</span>
            </div>

            {/* Compact headline — one tight block */}
            <div>
              <h1 className="text-[20px] font-black text-white leading-[1.1] tracking-tight">
                Fresh produce, <span className="gradient-text">direct to you.</span>
              </h1>
              <p className="text-[11px] text-white/60 leading-snug mt-0.5">
                Verified UK farms · fair prices · same-day delivery
              </p>
            </div>

            {/* CTAs — side by side, compact */}
            <div className="flex gap-2">
              <Button
                onClick={onBrowse}
                data-testid="button-mobile-shop-now"
                className="flex-1 h-9 bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-bold rounded-lg shadow-sm gap-1 px-3"
              >
                Shop now<ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/map")}
                data-testid="button-mobile-live-map"
                className="flex-1 h-9 border-white/25 text-white hover:bg-white/10 bg-white/5 text-[12px] font-bold rounded-lg gap-1 px-3"
              >
                <Satellite className="h-3.5 w-3.5 text-green-400" />Live map
              </Button>
            </div>
          </div>

          {/* ──────── DESKTOP HERO — Text & CTAs (≥lg only) ──────── */}
          <div ref={heroLeftRef} className="hidden lg:flex flex-col justify-center px-10 lg:px-12 py-8 w-full overflow-hidden min-w-0">

            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Badge className="bg-primary/20 text-primary border-primary/30 px-2 py-0.5 text-[9px] font-bold tracking-[0.1em] uppercase rounded-full">
                <Leaf className="h-2.5 w-2.5 mr-0.5" />Farm to Table
              </Badge>
              <div className="flex items-center gap-1 bg-white/10 border border-white/20 rounded-full px-1.5 py-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[9px] font-bold text-green-300">{activeFarmers} live</span>
              </div>
            </div>

            <h1 className="text-4xl xl:text-5xl font-black text-white mb-3 leading-[1] tracking-tighter">
              FRESH PRODUCE,{" "}
              <span className="gradient-text">DIRECT TO YOU</span>
            </h1>

            <p className="text-sm text-white/70 mb-4 leading-snug max-w-md">
              Connecting you directly with local growers. Fair prices, verified quality.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { value: `${farmerCount}+`, label: "Farmers", icon: Users, color: "text-primary bg-primary/20" },
                { value: `${products.length}+`, label: "Products", icon: Sprout, color: "text-emerald-400 bg-emerald-900/40" },
                { value: `${liveOrders.toLocaleString()}`, label: "Orders", icon: Activity, color: "text-amber-400 bg-amber-900/40" },
              ].map(({ value, label, icon: Icon, color }) => (
                <div key={label} className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-lg p-2.5 flex flex-col items-center text-center">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center mx-auto mb-1 ${color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-black text-white leading-none">{value}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{label}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Button onClick={onBrowse} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 h-10 text-sm font-bold rounded-lg shadow-lg shadow-primary/20 gap-1">
                Shop Now<ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="border-green-400/60 text-white hover:bg-green-500/30 px-6 h-10 text-sm font-bold rounded-lg gap-1 bg-green-500/20" onClick={() => navigate("/map")}>
                <Satellite className="h-4 w-4" />Live Map
              </Button>
            </div>

            <div className="flex gap-3 flex-wrap">
              {TRUST_BADGES.map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-1 text-[11px] text-white/60 font-medium">
                  <Icon className={`h-3 w-3 ${color}`} />
                  {label}
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
            title="Drag to resize map"
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
              Drag to resize map
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
            title="Drag to resize"
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
        <div className="px-3 sm:px-10 lg:px-12 pb-3 sm:pb-5 w-full overflow-hidden">
          <UserBookmarks />
        </div>
      </div>

      {/* ─── BOTTOM CONTENT STRIP ─── */}
      <div className="relative z-10 bg-background border-t border-border/50">

        {/* Stats strip — horizontal scroll on mobile, grid on desktop */}
        <div className="border-b border-border/40 bg-muted/20">
          <div className="px-3 sm:container sm:mx-auto sm:px-4 py-2 sm:py-3">
            <div className="flex sm:grid sm:grid-cols-4 gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar">
              {[
                { icon: Users, label: "Farmers", value: "2,500+", border: "border-green-200/60 dark:border-green-800/40", bg: "bg-green-50/80 dark:bg-green-950/30", iconColor: "text-green-600 dark:text-green-400", textColor: "text-green-700 dark:text-green-300" },
                { icon: Star, label: "Rating", value: "4.9", border: "border-amber-200/60 dark:border-amber-800/40", bg: "bg-amber-50/80 dark:bg-amber-950/30", iconColor: "text-amber-600 dark:text-amber-400", textColor: "text-amber-700 dark:text-amber-300" },
                { icon: TrendingUp, label: "Products", value: `${products.length}+`, border: "border-blue-200/60 dark:border-blue-800/40", bg: "bg-blue-50/80 dark:bg-blue-950/30", iconColor: "text-blue-600 dark:text-blue-400", textColor: "text-blue-700 dark:text-blue-300" },
                { icon: Zap, label: "Orders", value: liveOrders.toLocaleString(), border: "border-purple-200/60 dark:border-purple-800/40", bg: "bg-purple-50/80 dark:bg-purple-950/30", iconColor: "text-purple-600 dark:text-purple-400", textColor: "text-purple-700 dark:text-purple-300" },
              ].map(({ icon: Icon, label, value, border, bg, iconColor, textColor }) => (
                <div key={label} className={`flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl border shrink-0 ${border} ${bg}`}>
                  <div className={`h-6 w-6 sm:h-8 sm:w-8 rounded-md sm:rounded-lg bg-background/80 border ${border} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{label}</div>
                    <div className={`text-[11px] sm:text-sm font-black ${textColor} leading-none`}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── FRESH PICKS CAROUSEL ─── */}
        <div className="px-3 sm:container sm:mx-auto sm:px-4 py-2 sm:py-4">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2.5">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-foreground/60">Fresh Picks</span>
              <Badge variant="secondary" className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 h-4">{paidProducts.slice(0, 14).length}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={onBrowse} className="h-6 px-2 text-[10px] font-bold text-primary hover:text-primary gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex gap-1.5 sm:gap-2.5 overflow-x-auto pb-1 sm:pb-1.5 no-scrollbar">
            {paidProducts.slice(0, 14).map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                whileHover={{ y: -3 }}
                className="flex-shrink-0 w-[88px] sm:w-[112px] group"
                data-testid={`product-card-${product.id}`}
              >
                <div onClick={onBrowse} className="cursor-pointer relative aspect-square rounded-lg sm:rounded-xl overflow-hidden border border-border/50 bg-muted mb-1 sm:mb-1.5 shadow-sm transition-all group-hover:shadow-md group-hover:border-primary/30 group-hover:scale-[1.02]">
                  <img
                    src={getProductImage(product.name, product.categoryId, "sm")}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1540420828642-fca2c5c18abe?w=300&h=300&fit=crop`; }}
                  />
                  <div className="absolute top-1 right-1">
                    <Badge className="bg-primary/95 border-none h-4 sm:h-5 px-1 sm:px-1.5 text-[8px] sm:text-[10px] font-bold shadow-sm">£{product.price}</Badge>
                  </div>
                  {product.isOrganic && (
                    <div className="absolute top-1 left-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <Leaf className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-white" />
                    </div>
                  )}
                </div>
                <h3 className="text-[10px] sm:text-[12px] font-bold text-foreground truncate group-hover:text-primary transition-colors">{product.name}</h3>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate leading-tight">{product.farmerName}</p>
                <div className="flex items-center gap-0.5 mt-0.5">
                  <span className="text-[11px] sm:text-[13px] font-black text-primary leading-none">£{product.price}</span>
                  <span className="text-[8px] sm:text-[10px] text-muted-foreground leading-none">/{product.unit}</span>
                </div>
                <Button
                  size="sm"
                  className="w-full mt-1 h-6 sm:h-7 px-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-tight gap-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={(e) => { e.stopPropagation(); onAddToCart?.(product); }}
                  data-testid={`button-hero-add-${product.id}`}
                >
                  <ShoppingCart className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  Add
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
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Featured</span>
                <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700 text-[8px] sm:text-[9px] px-1 sm:px-1.5 h-4">Top Picks</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={onBrowse} className="h-6 px-2 text-[10px] font-bold text-amber-600 hover:text-amber-700 gap-1">
                All <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
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
                  <div onClick={onBrowse} className="cursor-pointer relative aspect-square rounded-lg sm:rounded-xl overflow-hidden border-2 border-amber-200/60 dark:border-amber-700/40 bg-muted mb-1 sm:mb-1.5 shadow-md transition-all group-hover:shadow-lg group-hover:border-amber-400 group-hover:scale-[1.02]">
                    <img
                      src={getProductImage(product.name, product.categoryId, "sm")}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1540420828642-fca2c5c18abe?w=300&h=300&fit=crop`; }}
                    />
                    <div className="absolute top-1 left-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
                      <Star className="h-2 w-2 sm:h-3 sm:w-3 text-white fill-white" />
                    </div>
                    <div className="absolute top-1 right-1">
                      <Badge className="bg-background/90 border border-amber-300 text-amber-700 dark:text-amber-300 h-4 sm:h-5 px-1 sm:px-1.5 text-[8px] sm:text-[10px] font-bold">£{product.price}</Badge>
                    </div>
                  </div>
                  <h3 className="text-[10px] sm:text-[12px] font-bold text-foreground truncate group-hover:text-amber-600 transition-colors">{product.name}</h3>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate leading-tight">{product.farmerName}</p>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <span className="text-[11px] sm:text-[13px] font-black text-amber-600 dark:text-amber-400 leading-none">£{product.price}</span>
                    <span className="text-[8px] sm:text-[10px] text-muted-foreground leading-none">/{product.unit}</span>
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-1 h-6 sm:h-7 px-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-tight gap-1 bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={(e) => { e.stopPropagation(); onAddToCart?.(product); }}
                    data-testid={`button-hero-featured-add-${product.id}`}
                  >
                    <ShoppingCart className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    Add
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
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">Free Items</span>
                <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 h-4 border-orange-200 dark:border-orange-700 text-orange-600 dark:text-orange-400 flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block animate-pulse" />
                  Live
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/share-care")}
                className="h-6 px-2 text-[10px] font-bold text-orange-600 hover:text-orange-700 gap-1"
                data-testid="btn-share-care-all">
                <span className="hidden sm:inline">Share &amp; Care</span>
                <span className="sm:hidden">More</span>
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
                      <span className="text-[9px] sm:text-[11px] text-orange-500 font-bold uppercase">Free</span>
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

            <div className="flex items-center gap-1.5 sm:gap-3 mb-1.5 sm:mb-4 flex-wrap">
              <div className="h-1.5 w-1.5 sm:h-2.5 sm:w-2.5 rounded-full bg-primary flex-shrink-0" />
              <h2 className="text-[11px] sm:text-base font-black uppercase tracking-[0.12em] text-foreground">All Categories</h2>
              <span className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold">
                ({orderedCats.filter(c => !catPrefs.hidden.includes(c.key)).length})
              </span>
              <div className="ml-auto flex items-center gap-2">
                {catEditMode && catPrefs.hidden.length > 0 && (
                  <button
                    onClick={() => persistCatPrefs({ ...catPrefs, hidden: [] })}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border border-primary/40 text-primary hover:bg-primary/10 transition-all"
                  >
                    <PlusCircle className="h-3 w-3" /> Restore all
                  </button>
                )}
                <button
                  onClick={() => setCatEditMode(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                    catEditMode
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "border-border/60 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  {catEditMode ? <><Check className="h-3 w-3" /> Done</> : <><Pencil className="h-3 w-3" /> Customise</>}
                </button>
              </div>
            </div>

            {catEditMode && (
              <p className="text-[10px] text-muted-foreground mb-3 bg-muted/50 rounded-lg px-3 py-2">
                Drag to reorder · click <EyeOff className="h-3 w-3 inline" /> to hide a category · restore hidden ones with "Restore all"
              </p>
            )}

            {/* Category tile grid — visible tiles */}
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-1 sm:gap-2 w-full max-w-full">
              {orderedCats
                .filter(c => catEditMode || !catPrefs.hidden.includes(c.key))
                .map(({ key, emoji, label }, idx) => {
                  const img = categoryImages[key] || "";
                  const isHidden = catPrefs.hidden.includes(key);
                  return (
                    <div
                      key={key}
                      draggable={catEditMode}
                      onDragStart={() => { catDragIdx.current = idx; }}
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={() => {
                        if (catDragIdx.current === null || catDragIdx.current === idx) return;
                        const visibleKeys = orderedCats
                          .filter(c => catEditMode || !catPrefs.hidden.includes(c.key))
                          .map(c => c.key);
                        const from = catDragIdx.current;
                        const to = idx;
                        const newVisible = [...visibleKeys];
                        const [moved] = newVisible.splice(from, 1);
                        newVisible.splice(to, 0, moved);
                        const hiddenItems = orderedCats.filter(c => catPrefs.hidden.includes(c.key)).map(c => c.key);
                        persistCatPrefs({ ...catPrefs, order: [...newVisible, ...hiddenItems] });
                        catDragIdx.current = null;
                      }}
                      className={`relative group min-w-0 ${catEditMode ? "cursor-grab active:cursor-grabbing" : ""} ${isHidden ? "opacity-40" : ""}`}
                      style={{ aspectRatio: "4 / 3" }}
                    >
                      <button
                        onClick={() => {
                          if (catEditMode) return;
                          navigate(`/?category=${key}`);
                        }}
                        data-testid={`cat-tile-${key}`}
                        className="w-full h-full relative overflow-hidden rounded-lg sm:rounded-xl border-2 border-transparent hover:border-primary/70 hover:scale-[1.05] active:scale-95 transition-all duration-150 shadow-md hover:shadow-xl"
                      >
                        {img
                          ? <img src={img} alt={label} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                          : <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-primary/10" />
                        }
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent group-hover:from-primary/80 group-hover:via-primary/10 transition-all duration-300" />
                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1 sm:pb-1.5 px-0.5 gap-0">
                          <span className="text-base sm:text-2xl leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] filter">{emoji}</span>
                          <span className="text-[8px] sm:text-[11px] font-black text-white text-center leading-tight w-full px-0.5 drop-shadow-[0_1px_3px_rgba(0,0,0,1)] tracking-tight truncate">{label}</span>
                        </div>
                        {catEditMode && (
                          <div className="absolute top-1 left-1 w-4 h-4 rounded bg-black/50 flex items-center justify-center">
                            <GripVertical className="h-2.5 w-2.5 text-white/80" />
                          </div>
                        )}
                      </button>
                      {/* Hide button (only in edit mode) */}
                      {catEditMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const hidden = catPrefs.hidden.includes(key)
                              ? catPrefs.hidden.filter(h => h !== key)
                              : [...catPrefs.hidden, key];
                            persistCatPrefs({ ...catPrefs, hidden });
                          }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive border-2 border-background flex items-center justify-center shadow-md z-10 hover:bg-destructive/80 transition-colors"
                          title={isHidden ? "Show" : "Hide"}
                        >
                          {isHidden ? <PlusCircle className="h-2.5 w-2.5 text-white" /> : <XIcon className="h-2.5 w-2.5 text-white" />}
                        </button>
                      )}
                    </div>
                  );
              })}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
