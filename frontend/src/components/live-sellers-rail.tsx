import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { LeafletFarmerMap } from "@/components/leaflet-farmer-map";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  MapPin,
  Map as MapIcon,
  List as ListIcon,
  Maximize2,
  Minimize2,
  Users,
  Clock,
  ChevronRight,
  Package,
  Layers,
  X,
  Radio,
} from "lucide-react";
import { getPublicLocationLabel, hasValidPublicCoordinates } from "@/lib/public-map-location";
import { resolveProductImageForProduct } from "@/lib/product-images";
import type { Product, DemandAlert } from "@shared/schema";
import { useLiveLocation } from "@/contexts/live-location-context";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

interface SellerEntry {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  location: string;
  productCount: number;
  isOnline: boolean;
  latitude: number;
  longitude: number;
  distanceKm: number;
  topProducts: Product[];
  isVerified?: boolean;
}

function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export interface LiveSellersRailProps {
  mapHeight?: number;
  listHeight?: number;
  layout?: "stacked" | "wide";
  initialExpanded?: boolean;
}

export function LiveSellersRail({
  mapHeight = 270,
  listHeight = 320,
  layout = "stacked",
  initialExpanded = false,
}: LiveSellersRailProps) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { location: liveLoc } = useLiveLocation();
  const { user, isAuthenticated } = useAuth();
  const isSeller = isAuthenticated && (user?.role === "farmer" || user?.role === "seller");

  const [activeTab, setActiveTab] = useState<"map" | "list">("map");
  const [showSellers, setShowSellers] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(initialExpanded);

  const cityName = liveLoc?.label || "Mumbai, India";

  // 1. Fetch real verified sellers from backend database
  const { data: rawSellers = [], isLoading: isSellersLoading } = useQuery<SellerEntry[]>({
    queryKey: ["/api/sellers"],
    refetchInterval: 30_000,
  });

  // 2. Fetch real demand alerts from backend database
  const { data: demandAlerts = [] } = useQuery<DemandAlert[]>({
    queryKey: ["/api/demand-alerts"],
    refetchInterval: 60_000,
  });

  // 3. Filter and localize sellers dynamically with distance calculations
  const sellers: SellerEntry[] = useMemo(() => {
    const list = rawSellers
      .filter((s) => s.id && !s.id.startsWith("farmer-") && !s.id.startsWith("catalog-") && s.name && s.name !== "Verified Seller")
      .map((s) => {
        let dist = s.distanceKm || 0;
        if (liveLoc?.latitude && liveLoc?.longitude && s.latitude && s.longitude) {
          dist = calculateHaversineKm(liveLoc.latitude, liveLoc.longitude, s.latitude, s.longitude);
        }
        return {
          ...s,
          distanceKm: dist,
        };
      });

    if (isSeller && user && !list.some((s) => s.id === user.id)) {
      const userLat = user.latitude || liveLoc?.latitude || 0;
      const userLng = user.longitude || liveLoc?.longitude || 0;
      let dist = 0;
      if (liveLoc?.latitude && liveLoc?.longitude && userLat && userLng) {
        dist = calculateHaversineKm(liveLoc.latitude, liveLoc.longitude, userLat, userLng);
      }
      list.unshift({
        id: user.id,
        name: user.name || "My Verified Farm Store",
        avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name || "Seller")}`,
        rating: 5.0,
        location: user.location || cityName,
        latitude: userLat,
        longitude: userLng,
        isOnline: true,
        isVerified: true,
        productCount: 0,
        distanceKm: dist,
        topProducts: [],
      });
    }

    return list.sort((a, b) => b.productCount - a.productCount);
  }, [rawSellers, liveLoc, isSeller, user, cityName]);

  // 4. Resolve local demand opportunity from database
  const topOpportunity = useMemo(() => {
    if (demandAlerts.length > 0) {
      const match = demandAlerts.find(
        (a) =>
          a.location &&
          (a.location.toLowerCase().includes(cityName.toLowerCase()) ||
            cityName.toLowerCase().includes(a.location.toLowerCase()))
      );
      return match || demandAlerts[0];
    }
    return null;
  }, [demandAlerts, cityName]);

  const handleSellerClick = (sellerId: string) => {
    setSelectedId(sellerId);
    setLocation(`/sellers/${encodeURIComponent(sellerId)}`);
  };

  const mapCenter: [number, number] = useMemo(() => {
    if (liveLoc?.latitude && liveLoc?.longitude) {
      return [liveLoc.latitude, liveLoc.longitude];
    }
    const firstSellerWithCoords = sellers.find((s) => hasValidPublicCoordinates(s.latitude, s.longitude));
    if (firstSellerWithCoords) {
      return [firstSellerWithCoords.latitude, firstSellerWithCoords.longitude];
    }
    return [19.0760, 72.8777]; // Mumbai coordinates
  }, [liveLoc, sellers]);

  useEffect(() => {
    if (isFullScreen) {
      window.dispatchEvent(new Event("agri-subcategory-close"));
    }
  }, [isFullScreen]);

  // ─── FULL PAGE VIEW ───
  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-50 dark:bg-background overflow-y-auto flex flex-col p-4 sm:p-6 select-none animate-in fade-in duration-200">
        {/* Full-Page Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-card p-4 rounded-2xl border border-slate-200 dark:border-border/80 shadow-sm mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <MapIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Live Sellers & Interactive Smart Map
                <span className="text-xs bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                  {sellers.length} Sellers in {cityName}
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                Explore local producers, coordinates, inventory, and distance in real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-muted p-1 rounded-xl border border-slate-200/60 dark:border-border/40">
              <button
                onClick={() => setActiveTab("map")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "map"
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" />
                <span>Map View</span>
              </button>
              <button
                onClick={() => setActiveTab("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "list"
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <ListIcon className="h-3.5 w-3.5" />
                <span>List View</span>
              </button>
            </div>

            {/* Show Sellers Switch */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-muted px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-border/40">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Show Sellers</span>
              <Switch
                checked={showSellers}
                onCheckedChange={setShowSellers}
                className="data-[state=checked]:bg-emerald-700 h-5 w-9"
              />
            </div>

            {/* Exit Full Page Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullScreen(false)}
              className="font-bold text-xs rounded-xl h-9 px-3.5 flex items-center gap-1.5 border-slate-300 dark:border-border/80 shadow-xs"
            >
              <Minimize2 className="h-4 w-4" />
              <span>Exit Full Page</span>
            </Button>
          </div>
        </div>

        {/* Full Page Map Section */}
        {activeTab === "map" && (
          <div className="w-full h-[55vh] min-h-[420px] rounded-2xl overflow-hidden border border-slate-200 dark:border-border/80 shadow-sm relative mb-4 bg-white dark:bg-card">
            <LeafletFarmerMap
              products={showSellers ? sellers.flatMap((s) => s.topProducts || []) : []}
              onFarmerClick={handleSellerClick}
              selectedFarmerId={selectedId}
              height="100%"
              initialZoom={12}
              center={mapCenter}
              showControls={true}
              showLayerSwitcher={true}
              tileStyle="standard"
            />
          </div>
        )}

        {/* Full-Page Sellers Directory Grid */}
        <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-border/80 p-4 shadow-sm flex-1">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-border/40">
            <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              Verified Local Producers & Sellers ({sellers.length})
            </h3>
            <span className="text-xs font-semibold text-slate-400">
              Real-time verified database sellers
            </span>
          </div>

          {sellers.length === 0 ? (
            <div className="py-16 text-center text-xs font-semibold text-muted-foreground space-y-3">
              <div className="h-12 w-12 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
                <Users className="h-6 w-6 opacity-80" />
              </div>
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">
                {isSeller ? "No other active sellers registered in this region yet" : "No active sellers registered in this region yet"}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isSeller
                  ? "Verified farmers and producers will be displayed here. You can manage your listings and profile from your Seller Hub."
                  : "Verified farmers and producers will be displayed here as soon as they register and list products."}
              </p>
              {isSeller ? (
                <Link
                  href="/seller"
                  className="inline-flex items-center gap-1.5 mt-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-2xs"
                >
                  <span>Go to Seller Hub</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <Link
                  href="/auth?role=farmer&returnTo=/seller"
                  className="inline-flex items-center gap-1.5 mt-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-2xs"
                >
                  <span>Register as Seller</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {sellers.map((s) => (
              <div
                key={s.id}
                onClick={() => handleSellerClick(s.id)}
                className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200/80 dark:border-border/60 hover:border-emerald-500 dark:hover:border-emerald-500/80 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all cursor-pointer group shadow-2xs"
              >
                <div className="relative shrink-0">
                  <img
                    src={s.avatar}
                    alt={s.name}
                    className="h-12 w-12 rounded-xl object-cover border border-slate-200 dark:border-border/80 shadow-2xs group-hover:scale-105 transition-transform bg-slate-100 dark:bg-muted"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(s.name)}`;
                    }}
                  />
                  {s.isOnline && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-card" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-700 transition-colors">
                      {s.name}
                    </h4>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                    • {s.location}
                  </p>

                  <div className="flex items-center justify-between gap-1 mt-2 text-xs font-bold">
                    <span className="flex items-center gap-1 text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span>{s.rating.toFixed(1)}</span>
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {s.distanceKm} km
                    </span>
                  </div>

                  <div className="mt-1 text-[11px] font-black text-emerald-800 dark:text-emerald-400">
                    {s.productCount} Product{s.productCount !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    );
  }

  // ─── STANDARD / EMBEDDED RAIL VIEW ───
  return (
    <div className="flex flex-col gap-3 w-full select-none" data-testid="rail-live-sellers">
      {/* ─── CARD 1: INTERACTIVE MAP CARD ─── */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-border/60 bg-white dark:bg-card overflow-hidden shadow-xs">
        {/* Controls Bar */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-border/40">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-muted p-0.5 rounded-xl border border-slate-200/60 dark:border-border/40">
            <button
              onClick={() => setActiveTab("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "map"
                  ? "bg-emerald-800 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span>Map View</span>
            </button>
            <button
              onClick={() => setActiveTab("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "list"
                  ? "bg-emerald-800 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ListIcon className="h-3.5 w-3.5" />
              <span>List View</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Show Sellers</span>
            <Switch
              checked={showSellers}
              onCheckedChange={setShowSellers}
              className="data-[state=checked]:bg-emerald-700 h-5 w-9"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullScreen(true)}
              className="h-8 w-8 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-muted"
              title="Expand to Whole Page"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Map Container */}
        {activeTab === "map" ? (
          <div className="relative w-full overflow-hidden" style={{ height: mapHeight }}>
            <LeafletFarmerMap
              products={showSellers ? sellers.flatMap((s) => s.topProducts || []) : []}
              onFarmerClick={handleSellerClick}
              selectedFarmerId={selectedId}
              height="100%"
              initialZoom={11}
              center={mapCenter}
              showControls={true}
              showLayerSwitcher={false}
              tileStyle="standard"
            />

            {/* Bottom Overlay Bar inside map */}
            <div className="absolute bottom-2.5 inset-x-2.5 z-[500] flex items-center justify-between gap-2 pointer-events-auto">
              <div className="flex items-center gap-2 bg-white/90 dark:bg-card/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-border/60 shadow-xs text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-400" /> Offline
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Online
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Busy
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsFullScreen(true)}
                className="flex items-center gap-1 bg-white/95 dark:bg-card/95 hover:bg-white dark:hover:bg-card text-slate-800 dark:text-slate-200 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-border/60 text-xs font-bold shadow-xs transition-colors"
              >
                <Maximize2 className="h-3 w-3" />
                <span>Expand to Whole Page</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ height: mapHeight }} className="overflow-y-auto p-3 space-y-2">
            {sellers.length === 0 ? (
              <div className="p-4 text-center text-xs font-semibold text-muted-foreground space-y-1.5">
                <p>{isSeller ? "No other active sellers in this area yet." : "No active sellers in this area yet."}</p>
                {isSeller ? (
                  <Link
                    href="/seller"
                    className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 hover:underline font-bold"
                  >
                    <span>Go to Seller Hub</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                ) : (
                  <Link
                    href="/auth?role=farmer&returnTo=/seller"
                    className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 hover:underline font-bold"
                  >
                    <span>Become a Seller</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ) : (
              sellers.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSellerClick(s.id)}
                  className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-border/40 hover:bg-slate-50 dark:hover:bg-muted/40 cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-2 w-2 rounded-full ${s.isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
                    <span className="text-xs font-bold truncate">{s.name}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">{s.location}</span>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

      {/* ─── CARD 2: LIVE SELLERS LIST CARD (REAL DATABASE SELLERS) ─── */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-border/60 bg-white dark:bg-card overflow-hidden shadow-xs">
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-border/40">
          <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 tracking-tight">
            Live Sellers in {cityName} ({sellers.length})
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullScreen(true)}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-1 transition-colors"
            >
              <span>View</span>
              <Users className="h-3.5 w-3.5" />
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        <ScrollArea style={{ maxHeight: listHeight }} className="divide-y divide-slate-100 dark:divide-border/40">
          <div className="p-1 space-y-0.5">
            {isSellersLoading ? (
              <div className="p-3 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-2.5 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sellers.length === 0 ? (
              <div className="p-6 text-center text-xs font-semibold text-muted-foreground space-y-2">
                <div className="h-10 w-10 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
                  <Users className="h-5 w-5 opacity-80" />
                </div>
                <p className="font-bold text-slate-800 dark:text-slate-200">No live sellers in {cityName} yet</p>
                <p className="text-[11px] text-slate-500">
                  {isSeller
                    ? "You are active as a verified seller. Manage your listings and incoming demand from your Seller Hub."
                    : "Verified farmers and producers will appear here once registered."}
                </p>
                {isSeller ? (
                  <Link
                    href="/seller"
                    className="inline-flex items-center gap-1.5 mt-1 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors shadow-2xs"
                  >
                    <span>Go to Seller Hub</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                ) : (
                  <Link
                    href="/auth?role=farmer&returnTo=/seller"
                    className="inline-flex items-center gap-1.5 mt-1 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors shadow-2xs"
                  >
                    <span>Register as Seller</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ) : (
              sellers.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSellerClick(s.id)}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-muted/60 transition-all cursor-pointer group"
                  data-testid={`seller-row-${s.id}`}
                >
                  {/* Real Seller Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={s.avatar}
                      alt={s.name}
                      className="h-10 w-10 rounded-xl object-cover border border-slate-200 dark:border-border/80 shadow-2xs group-hover:scale-105 transition-transform bg-slate-100 dark:bg-muted"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(s.name)}`;
                      }}
                    />
                    {s.isOnline && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-card" />
                    )}
                  </div>

                  {/* Real Seller Name & DB Location */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${s.isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
                      <h4 className="font-black text-xs sm:text-sm md:text-base text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {s.name}
                      </h4>
                    </div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate pl-3.5">
                      • {s.location}
                    </p>
                  </div>

                  {/* Rating, Distance & Product Count */}
                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1.5 text-xs font-black">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-slate-900 dark:text-slate-100">{s.rating.toFixed(1)}</span>
                      <span className="text-slate-400 text-xs ml-1 font-bold">
                        {s.distanceKm} km
                      </span>
                    </div>
                    <p className="text-xs font-black text-emerald-800 dark:text-emerald-400 mt-0.5">
                      {s.productCount} Product{s.productCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* ─── CARD 3: REAL DATABASE OPPORTUNITY CARD ─── */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-border/60 bg-gradient-to-br from-emerald-50 via-white to-slate-50 dark:from-emerald-950/20 dark:via-card dark:to-card p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-1 rounded-full">
            Active Demand Opportunity
          </span>
          <span className="text-xs font-black text-slate-500 dark:text-slate-400">
            {topOpportunity?.buyerType || "Commercial Buyer"}
          </span>
        </div>

        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
          Looking for:{" "}
          <span className="font-black text-slate-950 dark:text-slate-50">
            {topOpportunity?.productName || "Organic Fresh Produce"} ({topOpportunity?.quantity || "500 kg"})
          </span>{" "}
          in {cityName}
        </p>

        <div className="mt-3.5 flex items-center justify-between gap-2">
          <span className="text-xs sm:text-sm font-black text-emerald-800 dark:text-emerald-400">
            {topOpportunity?.priceRange || "Competitive Price"}
          </span>
          <Link
            href={`/dashboard/photo-sell?crop=${encodeURIComponent(topOpportunity?.productName || "Produce")}`}
            className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black px-3.5 py-2 rounded-xl shadow-2xs transition-colors"
          >
            Accept Opportunity
          </Link>
        </div>
      </Card>
    </div>
  );
}
