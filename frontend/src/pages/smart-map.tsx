import "leaflet/dist/leaflet.css";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMapEvents, useMap
} from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers, Map, Satellite, Mountain, Droplets, BarChart3, PenTool, Trash2,
  Download, Upload, Search, ZoomIn, ZoomOut, X, Plus,
  Clock, Users, ShoppingBag, ChevronRight, ChevronLeft, ChevronDown,
  RefreshCw, FileText, Globe, Crosshair, Radio, Wheat, Package,
  Star, Leaf, AlertTriangle, Store, ShieldCheck, Filter, SlidersHorizontal,
  Globe2, Loader2, CheckCircle2, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TopNavigation } from "@/components/top-navigation";
import { SafeProductImage } from "@/components/safe-product-image";
import { ProductCard } from "@/components/product-card";
import { useCatalogCategories } from "@/hooks/use-catalog-categories";
import { useTranslation } from "react-i18next";
import { useLocation, useSearch } from "wouter";

import { resolveProductImageForProduct } from "@/lib/product-images";
import { distanceKm, isWithinRadius } from "@/lib/nearby-distance";
import { isSellerOnline } from "@/lib/seller-presence";
import { getPublicLocationLabel, hasValidPublicCoordinates } from "@/lib/public-map-location";
import type { Product, LocalNeed } from "@shared/schema";
import { FavoriteProductButton } from "@/components/favorite-product-button";
import { useCurrency } from "@/contexts/currency-context";
import { useLiveLocation } from "@/contexts/live-location-context";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

type Region = { id: string; parentId: string | null; code: string; name: string; countryCode: string; type: string; latitude: number | null; longitude: number | null; activeSellerCount: number };
type Organisation = { id: string; name: string; slug: string; regionId: string; regionName: string };
type MarketplaceMarker = {
  sellerId: string;
  sellerName: string;
  latitude: number;
  longitude: number;
  location: string;
  productCount: number;
  minimumPrice: number;
  rating: number;
  productIds: string[];
  isLocal?: boolean;
};
type MarketplaceResponse = {
  products: Product[];
  markers: MarketplaceMarker[];
  pagination: { page: number; pageSize: number; total: number; pageCount: number };
  summary: { localCount: number; globalCount: number };
};

const marketplaceSellerIcon = (isLocal: boolean) => L.divIcon({
  html: `<div style="width:34px;height:34px;border-radius:50%;background:${isLocal ? '#059669' : '#2563eb'};border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:white;">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>
  </div>`,
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -36],
});

const farmerIcon = (online: boolean) => L.divIcon({
  html: `<div style="width:36px;height:36px;border-radius:50%;background:${online ? '#22c55e' : '#9ca3af'};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  </div>`,
  className: "", iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -38],
});

const needIcon = (urgency: string) => {
  const colors: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };
  const color = colors[urgency] || "#6b7280";
  return L.divIcon({
    html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
    </div>`,
    className: "", iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -34],
  });
};

const userIcon = L.divIcon({
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3)">
    <div style="width:6px;height:6px;border-radius:50%;background:white;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)"></div>
  </div>`,
  className: "", iconSize: [20, 20], iconAnchor: [10, 10],
});

const TILE_LAYERS = {
  standard: { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: '© <a href="https://osm.org">OpenStreetMap</a>', label: "Standard", icon: Map },
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "© Esri", label: "Satellite", icon: Satellite },
  terrain: { url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", attribution: '© <a href="https://opentopomap.org">OpenTopoMap</a>', label: "Terrain / 3D", icon: Mountain },
  hybrid: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", attribution: "© Esri", label: "Hybrid Topo", icon: Globe },
};

const SURVEY_PARCELS = [
  { id: "TN-001", coords: [[52.5, -1.2], [52.5, -0.9], [52.3, -0.9], [52.3, -1.2]] as [number, number][], label: "Survey Block A - Arable", type: "arable", area: 245 },
  { id: "TN-002", coords: [[51.8, -1.5], [51.8, -1.1], [51.6, -1.1], [51.6, -1.5]] as [number, number][], label: "Survey Block B - Horticultural", type: "horticultural", area: 180 },
  { id: "TN-003", coords: [[53.1, -0.8], [53.1, -0.4], [52.9, -0.4], [52.9, -0.8]] as [number, number][], label: "Survey Block C - Mixed Farm", type: "mixed", area: 320 },
];

const IRRIGATION_ZONES = [
  { id: "IR-001", coords: [[52.4, -1.0], [52.4, -0.7], [52.2, -0.7], [52.2, -1.0]] as [number, number][], label: "Irrigation Zone 1 - Canal Fed", capacity: "2,400 m³/day" },
  { id: "IR-002", coords: [[51.9, -1.3], [51.9, -0.9], [51.7, -0.9], [51.7, -1.3]] as [number, number][], label: "Irrigation Zone 2 - Borewell", capacity: "800 m³/day" },
];

type DrawMode = "none" | "polygon";
type RightPanelType = "marketplace" | "farmers" | "food" | "needs" | "all" | "post" | "shapes";
type NearbyRadius = 10 | 25 | 50 | 100 | "all";

function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    const t3 = setTimeout(() => map.invalidateSize(), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [map]);
  return null;
}

function DrawController({ mode, onPoint, onUndo }: { mode: DrawMode; onPoint: (latlng: [number, number]) => void; onUndo?: () => void }) {
  useMapEvents({
    click(e) { if (mode !== "none") onPoint([e.latlng.lat, e.latlng.lng]); },
    dblclick(e) { e.originalEvent.preventDefault(); },
  });
  return null;
}

function FlyToLocation({ location }: { location: [number, number] | null }) {
  const map = useMap();
  useEffect(() => { if (location) map.flyTo(location, 13, { duration: 1.5 }); }, [location, map]);
  return null;
}

function MapCenterTracker({ onChange }: { onChange: (c: [number, number]) => void }) {
  const map = useMapEvents({
    moveend() { const c = map.getCenter(); onChange([c.lat, c.lng]); },
  });
  useEffect(() => { const c = map.getCenter(); onChange([c.lat, c.lng]); }, [map, onChange]);
  return null;
}

function calcArea(coords: [number, number][]): number {
  if (coords.length < 3) return 0;
  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const [lat1, lon1] = coords[i];
    const [lat2, lon2] = coords[j];
    const avgLat = ((lat1 + lat2) / 2) * (Math.PI / 180);
    area += (lon2 - lon1) * Math.cos(avgLat);
  }
  return Math.abs(area) * 111.32 * 111.32 / 2 * 100;
}

interface FarmerMarker {
  id: string; name: string; avatar: string;
  latitude: number; longitude: number;
  isOnline: boolean; productCount: number; rating: number;
  products: string[]; location: string; totalStock: number;
  productItems: Product[];
}

const URGENCY_COLORS = { high: "bg-red-100 text-red-700 border-red-200", medium: "bg-amber-100 text-amber-700 border-amber-200", low: "bg-green-100 text-green-700 border-green-200" };
const BUYER_ICONS: Record<string, string> = { restaurant: "🍽️", retailer: "🏪", individual: "👤", processor: "🏭", school: "🏫", hospital: "🏥" };

const RIGHT_PANEL_TABS: { id: RightPanelType; icon: any; labelKey: string; shortLabelKey: string; color: string }[] = [
  { id: "marketplace", icon: Store, labelKey: "map.tab_marketplace", shortLabelKey: "map.tab_marketplace_short", color: "text-emerald-600" },
  { id: "farmers", icon: Users, labelKey: "map.tab_farmers", shortLabelKey: "map.tab_farmers_short", color: "text-green-600" },
  { id: "food", icon: Wheat, labelKey: "map.tab_food", shortLabelKey: "map.tab_food_short", color: "text-amber-600" },
  { id: "needs", icon: Radio, labelKey: "map.tab_needs", shortLabelKey: "map.tab_needs_short", color: "text-red-500" },
  { id: "all", icon: Globe, labelKey: "map.tab_all", shortLabelKey: "map.tab_all", color: "text-emerald-600" },
  { id: "post", icon: Plus, labelKey: "map.tab_post", shortLabelKey: "map.tab_post_short", color: "text-blue-600" },
  { id: "shapes", icon: PenTool, labelKey: "map.tab_parcels", shortLabelKey: "map.tab_parcels_short", color: "text-purple-600" },
];

export default function SmartMapPage() {
  const { data: publishedCategories = [] } = useCatalogCategories("buyer");
  const { format } = useCurrency();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { location: liveLocation, status: liveLocationStatus, refresh: refreshLiveLocation } = useLiveLocation();
  const [, setLocation] = useLocation();
  const routeSearch = useSearch();
  const { toast } = useToast();
  const [activeLayer, setActiveLayer] = useState<keyof typeof TILE_LAYERS>("standard");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showDemand, setShowDemand] = useState(true);
  const [showFarmers, setShowFarmers] = useState(true);
  const [showSurveyLayer, setShowSurveyLayer] = useState(false);
  const [showIrrigationLayer, setShowIrrigationLayer] = useState(false);
  const [drawMode, setDrawMode] = useState<DrawMode>("none");
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]);
  const [savedPolygons, setSavedPolygons] = useState<{ id: string; coords: [number, number][]; label: string; area: number; color: string }[]>([]);
  const initialParams = useMemo(() => new URLSearchParams(window.location.search), [routeSearch]);
  const isMarketplaceRoute = typeof window !== "undefined" && (window.location.pathname.startsWith("/marketplace") || initialParams.get("tab") === "marketplace" || !!initialParams.get("category") || !!initialParams.get("regionId"));

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [usingDeviceLocation, setUsingDeviceLocation] = useState(false);
  const [nearbyRadius, setNearbyRadius] = useState<NearbyRadius>(50);
  const [mapCenter, setMapCenter] = useState<[number, number]>([52.3, -1.0]);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [isLocating, setIsLocating] = useState(false);
  const [expandedFarmer, setExpandedFarmer] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const lastFocusedFarmerId = useRef<string | null>(null);
  const roleDefaultsApplied = useRef(false);

  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      // Roughly half of remaining width after vertical tab rail (~36px) + handle (~6px)
      return Math.max(150, Math.floor((window.innerWidth - 44) / 2));
    }
    return 360;
  });
  const draggingRight = useRef<{ startX: number; startW: number } | null>(null);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);

  const [marketFilters, setMarketFilters] = useState({
    search: initialParams.get("search") || "",
    categoryId: initialParams.get("category") || "",
    subcategoryId: initialParams.get("subcategory") || "",
    regionId: initialParams.get("regionId") || "",
    quantity: "",
    qualityGrade: "",
    minPrice: "",
    maxPrice: "",
    minRating: "",
    scope: "global",
    sortBy: initialParams.get("sortBy") || "distance",
  });

  const [rightPanel, setRightPanel] = useState<RightPanelType>(() => {
    if (isMarketplaceRoute) return "marketplace";
    const tab = initialParams.get("tab") as RightPanelType;
    if (tab && ["marketplace", "farmers", "food", "needs", "all", "post", "shapes"].includes(tab)) return tab;
    return "marketplace";
  });

  const { data: marketplaceRegions = [] } = useQuery<Region[]>({ queryKey: ["/api/marketplace/regions"] });
  const { data: marketplaceOrganisations = [] } = useQuery<Organisation[]>({
    queryKey: [`/api/marketplace/organisations${marketFilters.regionId ? `?regionId=${marketFilters.regionId}` : ""}`],
  });

  const marketQuery = new URLSearchParams();
  Object.entries(marketFilters).forEach(([key, value]) => {
    if (value) marketQuery.set(key === "minRating" ? "rating" : key, value);
  });
  if (userLocation) {
    marketQuery.set("latitude", String(userLocation[0]));
    marketQuery.set("longitude", String(userLocation[1]));
  }
  const marketResultKey = `/api/marketplace/search?${marketQuery.toString()}`;
  const { data: marketData, isLoading: isMarketLoading } = useQuery<MarketplaceResponse>({
    queryKey: [marketResultKey],
  });

  const addToCart = useMutation({
    mutationFn: async (product: Product) => {
      await apiRequest("POST", "/api/cart", { productId: product.id, quantity: 1 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({ title: "Added to cart" });
    },
    onError: () => toast({ title: "Sign in to add this product", variant: "destructive" }),
  });

  useEffect(() => {
    if (!marketFilters.regionId) return;
    const reg = marketplaceRegions.find((r) => r.id === marketFilters.regionId);
    if (reg && reg.latitude && reg.longitude) {
      setFlyTo([reg.latitude, reg.longitude]);
      setMapCenter([reg.latitude, reg.longitude]);
      mapRef.current?.flyTo([reg.latitude, reg.longitude], 10, { duration: 1.5 });
    }
  }, [marketFilters.regionId, marketplaceRegions]);

  useEffect(() => {
    const next = new URLSearchParams(window.location.search);
    next.set("tab", rightPanel);
    if (rightPanel === "marketplace") {
      if (marketFilters.search) next.set("search", marketFilters.search); else next.delete("search");
      if (marketFilters.categoryId) next.set("category", marketFilters.categoryId); else next.delete("category");
      if (marketFilters.subcategoryId) next.set("subcategory", marketFilters.subcategoryId); else next.delete("subcategory");
      if (marketFilters.regionId) next.set("regionId", marketFilters.regionId); else next.delete("regionId");
      if (marketFilters.sortBy && marketFilters.sortBy !== "distance") next.set("sortBy", marketFilters.sortBy); else next.delete("sortBy");
    }
    const currentPath = window.location.pathname.startsWith("/marketplace") ? "/map" : window.location.pathname;
    window.history.replaceState(null, "", `${currentPath}${next.size ? `?${next.toString()}` : ""}`);
  }, [rightPanel, marketFilters]);

  useEffect(() => {
    const handleUrlSync = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as RightPanelType | null;
      const isMarket = typeof window !== "undefined" && (window.location.pathname.startsWith("/marketplace") || tabParam === "marketplace" || !!params.get("category") || !!params.get("regionId"));
      if (isMarket) {
        setRightPanel("marketplace");
        if (params.get("search")) setMarketFilters((prev) => ({ ...prev, search: params.get("search") || "" }));
        if (params.get("category")) setMarketFilters((prev) => ({ ...prev, categoryId: params.get("category") || "" }));
        if (params.get("subcategory")) setMarketFilters((prev) => ({ ...prev, subcategoryId: params.get("subcategory") || "" }));
        if (params.get("regionId")) setMarketFilters((prev) => ({ ...prev, regionId: params.get("regionId") || "" }));
      } else if (tabParam && ["farmers", "food", "needs", "all", "post", "shapes"].includes(tabParam)) {
        setRightPanel(tabParam);
      }
    };
    handleUrlSync();
    window.addEventListener("popstate", handleUrlSync);
    return () => window.removeEventListener("popstate", handleUrlSync);
  }, [routeSearch]);

  useEffect(() => {
    if (!liveLocation) return;
    const currentLocation: [number, number] = [liveLocation.latitude, liveLocation.longitude];
    setUsingDeviceLocation(liveLocation.source === "device");
    setUserLocation(currentLocation);
    setMapCenter(currentLocation);
    setFlyTo(currentLocation);
  }, [liveLocation]);

  useEffect(() => {
    if (liveLocationStatus !== "requesting") setIsLocating(false);
  }, [liveLocationStatus]);

  // Toolbar group open state
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!roleDefaultsApplied.current) {
      const currentParams = new URLSearchParams(window.location.search);
      const hasExplicitTab = currentParams.has("tab") || currentParams.has("category") || currentParams.has("regionId") || (typeof window !== "undefined" && window.location.pathname.startsWith("/marketplace"));
      if (!hasExplicitTab) {
        setRightPanel(user.role === "farmer" ? "needs" : "farmers");
      }
      roleDefaultsApplied.current = true;
    }
    if (
      !usingDeviceLocation &&
      hasValidPublicCoordinates(user.latitude, user.longitude)
    ) {
      const savedLocation: [number, number] = [user.latitude, user.longitude!];
      setUserLocation(savedLocation);
      setMapCenter(savedLocation);
      setFlyTo(savedLocation);
    }
  }, [user, usingDeviceLocation]);

  const startRightDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = rightPanelRef.current ? rightPanelRef.current.offsetWidth : rightPanelWidth;
    draggingRight.current = { startX, startW };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (ev: MouseEvent) => {
      if (!draggingRight.current || !rightPanelRef.current) return;
      const w = Math.max(280, Math.min(560, draggingRight.current.startW - (ev.clientX - draggingRight.current.startX)));
      rightPanelRef.current.style.width = w + "px";
    };
    const onUp = (ev: MouseEvent) => {
      if (draggingRight.current && rightPanelRef.current) {
        const w = Math.max(280, Math.min(560, draggingRight.current.startW - (ev.clientX - draggingRight.current.startX)));
        setRightPanelWidth(w);
      }
      draggingRight.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const [postForm, setPostForm] = useState({
    productName: "", quantity: "", unit: "kg", priceRange: "",
    location: "",
    urgency: "medium" as "high" | "medium" | "low",
    buyerType: "individual" as any, description: "", deadline: "",
  });

  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: localNeeds = [], refetch: refetchNeeds } = useQuery<LocalNeed[]>({ queryKey: ["/api/local-needs"] });
  const activeProducts = products.filter((product) => product.stock > 0);

  const postNeedMutation = useMutation({
    mutationFn: (data: typeof postForm) => apiRequest("POST", "/api/local-needs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/local-needs"] });
      refetchNeeds();
      toast({ title: t("map.demand_posted"), description: t("map.demand_posted_desc") });
      setPostForm({ productName: "", quantity: "", unit: "kg", priceRange: "", location: "", urgency: "medium", buyerType: "individual", description: "", deadline: "" });
      setRightPanel("needs");
    },
    onError: (error: Error) => toast({ title: t("map.demand_posted_failed"), description: error.message, variant: "destructive" }),
  });

  const farmerMarkers: FarmerMarker[] = activeProducts.reduce((acc, product) => {
    if (!hasValidPublicCoordinates(product.farmerLatitude, product.farmerLongitude)) return acc;
    const existing = acc.find((m) => m.id === product.farmerId);
    if (existing) {
      if (!existing.products.includes(product.name)) {
        existing.products.push(product.name);
        existing.productCount++;
        existing.totalStock += product.stock;
        existing.productItems.push(product);
      }
    } else {
      acc.push({
        id: product.farmerId,
        name: product.farmerName?.trim() || "Seller not specified",
        avatar: product.farmerAvatar || "",
        latitude: product.farmerLatitude,
        longitude: product.farmerLongitude,
        isOnline: isSellerOnline(product.farmerId),
        productCount: 1,
        rating: Number.isFinite(product.farmerRating) ? product.farmerRating : 0,
        products: [product.name],
        location: getPublicLocationLabel(product.farmerLocation),
        totalStock: product.stock,
        productItems: [product],
      });
    }
    return acc;
  }, [] as FarmerMarker[]);

  const validProducts = activeProducts.filter((product) =>
    hasValidPublicCoordinates(product.farmerLatitude, product.farmerLongitude)
  );
  const validLocalNeeds = localNeeds.filter((need) =>
    hasValidPublicCoordinates(need.latitude, need.longitude)
  );
  const unmappedFarmerCount = new Set(activeProducts.map((product) => product.farmerId)).size - farmerMarkers.length;

  // Reference point used to sort right-panel lists by proximity:
  // 1. user's GPS location if they clicked "My Location"
  // 2. otherwise the current center of the map (updates as the user pans/zooms)
  const refPoint: [number, number] = userLocation ?? mapCenter;

  const filteredNeeds = validLocalNeeds
    .filter(n => {
      if (urgencyFilter !== "all" && n.urgency !== urgencyFilter) return false;
      if (searchQuery && !n.productName.toLowerCase().includes(searchQuery.toLowerCase()) && !n.location.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .map(n => ({ ...n, _distanceKm: distanceKm(refPoint, [n.latitude, n.longitude]) }))
    .filter(n => isWithinRadius(n._distanceKm, nearbyRadius))
    .sort((a, b) => a._distanceKm - b._distanceKm);

  const sortedFarmerMarkers = [...farmerMarkers]
    .map(f => ({ ...f, _distanceKm: distanceKm(refPoint, [f.latitude, f.longitude]) }))
    .filter(f => isWithinRadius(f._distanceKm, nearbyRadius))
    .sort((a, b) => a._distanceKm - b._distanceKm);

  const sortedProducts = [...validProducts]
    .map(p => ({ ...p, _distanceKm: distanceKm(refPoint, [p.farmerLatitude, p.farmerLongitude]) }))
    .filter(p => isWithinRadius(p._distanceKm, nearbyRadius))
    .sort((a, b) => a._distanceKm - b._distanceKm);

  const nearbyAll = [
    ...sortedFarmerMarkers.map((farmer) => ({
      id: `farmer-${farmer.id}`,
      kind: "farmer" as const,
      name: farmer.name,
      location: farmer.location,
      distanceKm: farmer._distanceKm,
      latitude: farmer.latitude,
      longitude: farmer.longitude,
      detail: `${farmer.productCount} active product${farmer.productCount === 1 ? "" : "s"}`,
    })),
    ...filteredNeeds.map((need) => ({
      id: `need-${need.id}`,
      kind: "buyer" as const,
      name: need.buyerName,
      location: need.location,
      distanceKm: need._distanceKm,
      latitude: need.latitude,
      longitude: need.longitude,
      detail: `Needs ${need.quantity} ${need.unit} ${need.productName}`,
    })),
  ].sort((first, second) => first.distanceKm - second.distanceKm);

  const handleNearbyRadiusChange = useCallback((value: string) => {
    const nextRadius: NearbyRadius = value === "all"
      ? "all"
      : Number(value) as Exclude<NearbyRadius, "all">;
    setNearbyRadius(nextRadius);

    const map = mapRef.current;
    if (!map) return;
    map.stop();

    if (nextRadius === "all") {
      const allLocations: [number, number][] = [
        ...farmerMarkers.map((farmer) => [farmer.latitude, farmer.longitude] as [number, number]),
        ...validLocalNeeds.map((need) => [need.latitude, need.longitude] as [number, number]),
      ];
      if (allLocations.length > 0) {
        map.fitBounds(L.latLngBounds(allLocations), {
          animate: true,
          duration: 0.6,
          padding: [36, 36],
          maxZoom: 12,
        });
      } else {
        map.setView(userLocation ?? mapCenter, 5, { animate: true });
      }
      return;
    }

    const currentMapCenter = map.getCenter();
    const radiusCenter: [number, number] = userLocation ?? [currentMapCenter.lat, currentMapCenter.lng];
    const radiusBounds = L.circle(radiusCenter, { radius: nextRadius * 1000 }).getBounds();
    map.fitBounds(radiusBounds, {
      animate: true,
      duration: 0.6,
      padding: [36, 36],
    });
  }, [farmerMarkers, mapCenter, userLocation, validLocalNeeds]);

  useEffect(() => {
    const requestedFarmerId = new URLSearchParams(routeSearch).get("farmer");
    if (!requestedFarmerId) {
      lastFocusedFarmerId.current = null;
      return;
    }
    if (lastFocusedFarmerId.current === requestedFarmerId) return;
    const farmer = farmerMarkers.find((marker) => marker.id === requestedFarmerId);
    if (!farmer) return;
    lastFocusedFarmerId.current = farmer.id;
    setExpandedFarmer(farmer.id);
    setRightPanel("farmers");
    setFlyTo([farmer.latitude, farmer.longitude]);
  }, [routeSearch, farmerMarkers]);

  const handleLocate = useCallback(() => {
    refreshLiveLocation();
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUsingDeviceLocation(true);
        setUserLocation(loc); setMapCenter(loc); setFlyTo(loc); setIsLocating(false);
        toast({ title: t("map.location_found") });
      },
      () => { setIsLocating(false); toast({ title: t("map.location_failed"), variant: "destructive" }); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [refreshLiveLocation, toast]);

  const handleDrawPoint = useCallback((latlng: [number, number]) => setDrawnPoints(prev => [...prev, latlng]), []);
  const handleUndoPoint = useCallback(() => setDrawnPoints(prev => prev.slice(0, -1)), []);

  const handleSavePolygon = () => {
    if (drawnPoints.length < 3) { toast({ title: t("map.need_3_points"), variant: "destructive" }); return; }
    const area = calcArea(drawnPoints);
    const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
    setSavedPolygons(prev => [...prev, { id: `poly-${Date.now()}`, coords: [...drawnPoints], label: `Land Parcel ${prev.length + 1}`, area, color: colors[prev.length % colors.length] }]);
    setDrawnPoints([]); setDrawMode("none");
    toast({ title: t("map.parcel_saved"), description: `Area: ${area.toFixed(2)} ha` });
  };

  const handleExportGDB = () => {
    const geoJson = { type: "FeatureCollection", features: savedPolygons.map(p => ({ type: "Feature", properties: { id: p.id, label: p.label, area_ha: p.area.toFixed(2) }, geometry: { type: "Polygon", coordinates: [[...p.coords.map(c => [c[1], c[0]]), [p.coords[0][1], p.coords[0][0]]]] } })) };
    const blob = new Blob([JSON.stringify(geoJson, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "land-parcels.geojson"; a.click();
    toast({ title: t("map.exported_geojson") });
  };

  const handleImportGDB = () => {
    const input = document.createElement("input"); input.type = "file"; input.accept = ".geojson,.json,.gdb";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.type === "FeatureCollection") {
            const imported = data.features.filter((f: any) => f.geometry?.type === "Polygon").map((f: any, i: number) => ({ id: `imported-${Date.now()}-${i}`, coords: f.geometry.coordinates[0].slice(0, -1).map((c: number[]) => [c[1], c[0]] as [number, number]), label: f.properties?.label || `Imported ${i + 1}`, area: f.properties?.area_ha ? Number(f.properties.area_ha) : 0, color: "#8b5cf6" }));
            setSavedPolygons(prev => [...prev, ...imported]);
            toast({ title: t("map.imported_count", { count: imported.length }) });
          }
        } catch { toast({ title: t("map.invalid_geojson"), variant: "destructive" }); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const currentArea = drawnPoints.length >= 3 ? calcArea(drawnPoints) : 0;
  const LayerIcon = TILE_LAYERS[activeLayer].icon;
  const hasSavedProfileLocation =
    !!user && hasValidPublicCoordinates(user.latitude, user.longitude);
  const currentLocationLabel = usingDeviceLocation
    ? liveLocation?.label || "Current device location"
    : user?.location || "Your location";

  const toggleGroup = (g: string) => setOpenGroup(prev => prev === g ? null : g);

  return (
    <div className="flex flex-col h-screen bg-background">
      <TopNavigation />

      {/* ── Toolbar ── */}
      <div ref={toolbarRef} className="flex items-center gap-2 lg:gap-3 px-3 lg:px-5 py-2 lg:py-2.5 bg-background/95 backdrop-blur-sm border-b-2 border-border/60 flex-none z-[1001] relative overflow-x-auto no-scrollbar">

        {/* Layers dropdown */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => toggleGroup("layers")}
            className={`flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 rounded-xl text-xs lg:text-sm whitespace-nowrap font-black border-2 transition-all shadow-xs ${openGroup === "layers" ? "bg-primary text-primary-foreground border-primary" : "border-border/80 hover:bg-muted text-foreground"}`}
            data-testid="btn-group-layers"
          >
            <LayerIcon className="h-4.5 w-4.5 stroke-[2.2]" />
            <span>{t('map.layers')}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${openGroup === "layers" ? "rotate-180" : ""}`} />
          </button>
          {openGroup === "layers" && (
            <div className="absolute top-full left-0 mt-2 bg-background border-2 border-border/80 rounded-2xl shadow-2xl z-[1002] p-2 min-w-[190px]">
              <div className="text-xs font-black text-muted-foreground uppercase tracking-wider px-3 py-1.5">{t('map.style')}</div>
              {(Object.keys(TILE_LAYERS) as Array<keyof typeof TILE_LAYERS>).map(key => {
                const layer = TILE_LAYERS[key];
                const Icon = layer.icon;
                return (
                  <button key={key} onClick={() => { setActiveLayer(key); setOpenGroup(null); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeLayer === key ? "bg-primary/15 text-primary font-black" : "hover:bg-muted text-foreground"}`}>
                    <Icon className="h-4.5 w-4.5" />
                    {layer.label}
                    {activeLayer === key && <span className="ml-auto text-primary font-black">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Overlays dropdown */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => toggleGroup("overlays")}
            className={`flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 rounded-xl text-xs lg:text-sm whitespace-nowrap font-black border-2 transition-all shadow-xs ${openGroup === "overlays" ? "bg-primary text-primary-foreground border-primary" : "border-border/80 hover:bg-muted text-foreground"}`}
            data-testid="btn-group-overlays"
          >
            <Layers className="h-4.5 w-4.5 stroke-[2.2]" />
            <span>{t('map.overlays')}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${openGroup === "overlays" ? "rotate-180" : ""}`} />
          </button>
          {openGroup === "overlays" && (
            <div className="absolute top-full left-0 mt-2 bg-background border-2 border-border/80 rounded-2xl shadow-2xl z-[1002] p-2 min-w-[220px]">
              <div className="text-xs font-black text-muted-foreground uppercase tracking-wider px-3 py-1.5">{t('map.toggle_overlays')}</div>
              {[
                { label: t('map.tab_farmers'), state: showFarmers, set: setShowFarmers, color: "text-green-600", icon: Users },
                { label: t('map.demand_pins'), state: showDemand, set: setShowDemand, color: "text-amber-600", icon: ShoppingBag },
                { label: t('map.heatmap_legend'), state: showHeatmap, set: setShowHeatmap, color: "text-red-500", icon: BarChart3 },
                { label: t('map.survey_layer'), state: showSurveyLayer, set: setShowSurveyLayer, color: "text-purple-600", icon: FileText },
                { label: t('map.irrigation_legend'), state: showIrrigationLayer, set: setShowIrrigationLayer, color: "text-blue-500", icon: Droplets },
              ].map(({ label, state, set, color, icon: Icon }) => (
                <button key={label} onClick={() => set(v => !v)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${state ? "bg-muted font-black" : "hover:bg-muted text-muted-foreground"}`}>
                  <Icon className={`h-4.5 w-4.5 ${state ? color : ""}`} />
                  <span className={state ? "text-foreground" : ""}>{label}</span>
                  <div className={`ml-auto w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${state ? "bg-primary border-primary" : "border-border"}`}>
                    {state && <span className="text-white text-xs font-black">✓</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Drawing dropdown */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => toggleGroup("drawing")}
            className={`flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 rounded-xl text-xs lg:text-sm whitespace-nowrap font-black border-2 transition-all shadow-xs ${drawMode !== "none" ? "bg-green-600 text-white border-green-600" : openGroup === "drawing" ? "bg-primary text-primary-foreground border-primary" : "border-border/80 hover:bg-muted text-foreground"}`}
            data-testid="btn-group-drawing"
          >
            <PenTool className="h-4.5 w-4.5 stroke-[2.2]" />
            <span>{t('map.drawing')}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${openGroup === "drawing" ? "rotate-180" : ""}`} />
          </button>
          {openGroup === "drawing" && (
            <div className="absolute top-full left-0 mt-2 bg-background border-2 border-border/80 rounded-2xl shadow-2xl z-[1002] p-2 min-w-[210px]">
              <div className="text-xs font-black text-muted-foreground uppercase tracking-wider px-3 py-1.5">{t('map.land_parcel_tools')}</div>
              <button onClick={() => { setDrawMode(drawMode === "polygon" ? "none" : "polygon"); setDrawnPoints([]); setOpenGroup(null); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${drawMode === "polygon" ? "bg-green-100 text-green-800 font-black dark:bg-green-900/60 dark:text-green-200" : "hover:bg-muted text-foreground"}`}>
                <PenTool className="h-4.5 w-4.5" />
                {drawMode === "polygon" ? t('map.stop_drawing') : t('map.draw_polygon')}
              </button>
              {drawMode !== "none" && (
                <>
                  <button onClick={() => { handleUndoPoint(); setOpenGroup(null); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-muted text-foreground">
                    <span className="text-lg leading-none">↩</span> {t('map.undo_last_point')}
                  </button>
                  <button onClick={() => { handleSavePolygon(); setOpenGroup(null); }} disabled={drawnPoints.length < 3}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm bg-primary/15 text-primary font-black disabled:opacity-40">
                    {t('common.save')} ({drawnPoints.length} pts)
                  </button>
                  <button onClick={() => { setDrawnPoints([]); setDrawMode("none"); setOpenGroup(null); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-destructive hover:bg-red-50 dark:hover:bg-red-950">
                    <X className="h-4.5 w-4.5" /> {t('map.clear_drawing')}
                  </button>
                </>
              )}
              <div className="border-t border-border/60 my-1" />
              <button onClick={() => { handleExportGDB(); setOpenGroup(null); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-muted text-foreground/80">
                <Download className="h-4.5 w-4.5" /> {t('map.export_geojson')}
              </button>
              <button onClick={() => { handleImportGDB(); setOpenGroup(null); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-muted text-foreground/80">
                <Upload className="h-4.5 w-4.5" /> {t('map.import_geojson')}
              </button>
            </div>
          )}
        </div>

        {/* Locate */}
        <button
          onClick={handleLocate}
          disabled={isLocating}
          className="flex-shrink-0 flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 rounded-xl text-xs lg:text-sm whitespace-nowrap border-2 border-blue-400 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-700 font-black transition-all shadow-xs"
          data-testid="btn-locate"
        >
          {isLocating ? <RefreshCw className="h-4.5 w-4.5 animate-spin" /> : <Crosshair className="h-4.5 w-4.5 stroke-[2.2]" />}
          <span>{t('map.my_location')}</span>
        </button>

        <Select
          value={String(nearbyRadius)}
          onValueChange={handleNearbyRadiusChange}
        >
          <SelectTrigger
            className="h-9 w-[110px] flex-shrink-0 rounded-xl border-2 text-xs font-black lg:h-10 lg:w-[130px] lg:text-sm"
            aria-label="Nearby search distance"
            title="Change nearby search distance and map area"
            data-testid="select-nearby-radius"
          >
            <SelectValue placeholder="Distance" />
          </SelectTrigger>
          <SelectContent className="!z-[2000] rounded-xl border-2">
            {[10, 25, 50, 100].map((radius) => (
              <SelectItem key={radius} value={String(radius)} className="text-sm font-bold">{radius} km</SelectItem>
            ))}
            <SelectItem value="all" className="text-sm font-bold">All</SelectItem>
          </SelectContent>
        </Select>

        {/* Live stats */}
        <div className="ml-auto flex-shrink-0 flex items-center gap-2 text-xs lg:text-sm font-black">
          <div className="flex-shrink-0 flex items-center gap-2 bg-green-50 dark:bg-green-950 border-2 border-green-300 dark:border-green-800 rounded-xl px-3 py-1.5 whitespace-nowrap shadow-2xs">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="font-black text-green-800 dark:text-green-200">{sortedFarmerMarkers.filter(f => f.isOnline).length}</span>
            <span className="text-green-700 dark:text-green-300 font-bold">{t('map.on_label')}</span>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1.5 bg-muted/80 border-2 border-border/60 rounded-xl px-3 py-1.5 whitespace-nowrap shadow-2xs">
            <span className="font-black text-foreground">{sortedProducts.length}</span><span className="hidden lg:inline font-bold">{t('map.products_count')}</span><span className="lg:hidden font-bold">{t('map.prod_short')}</span>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1.5 bg-muted/80 border-2 border-border/60 rounded-xl px-3 py-1.5 whitespace-nowrap shadow-2xs">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-black text-foreground">{filteredNeeds.length}</span><span className="font-bold">{t('map.need_count')}</span>
          </div>
        </div>
      </div>

      {/* ── Map + Right Panel ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Drawing mode hint */}
        {drawMode !== "none" && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-background/90 backdrop-blur-sm border border-border rounded-xl px-4 py-2 shadow-xl text-sm font-medium flex items-center gap-3">
            <PenTool className="h-4 w-4 text-primary animate-pulse" />
            <span>{t('map.click_to_add_points')}</span>
            {drawnPoints.length >= 3 && <Badge className="bg-primary/10 text-primary border-primary/20">{currentArea.toFixed(2)} ha</Badge>}
            <span className="text-xs text-muted-foreground">{drawnPoints.length} pts</span>
          </div>
        )}

        {/* MAP */}
        <div className="flex-1 relative" style={{ cursor: drawMode !== "none" ? "crosshair" : "grab" }}>
          {user && !hasSavedProfileLocation && !usingDeviceLocation && (
            <div className="absolute left-1/2 top-4 z-[1001] w-[min(94%,480px)] -translate-x-1/2 rounded-2xl border-2 border-amber-400 bg-background/95 p-4 shadow-2xl backdrop-blur-md" data-testid="map-profile-location-prompt">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-base sm:text-lg font-black text-foreground">Add your city to discover nearby marketplace activity</p>
                  <p className="mt-1 text-xs sm:text-sm font-bold text-foreground/80">Save a City, Country location or use device location for this session.</p>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    <Button size="sm" className="h-9 px-4 text-xs sm:text-sm font-black uppercase tracking-wide shadow-xs" onClick={() => setLocation("/settings")}>Account Settings</Button>
                    <Button size="sm" variant="outline" className="h-9 px-4 text-xs sm:text-sm font-black uppercase tracking-wide border-2" onClick={handleLocate} disabled={isLocating}>
                      <Crosshair className="mr-1.5 h-4 w-4 stroke-[2.5]" />Use device location
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <MapContainer center={[52.3, -1.0]} zoom={7} style={{ width: "100%", height: "100%" }} zoomControl={false} ref={mapRef as any} doubleClickZoom={false}>
            <TileLayer key={activeLayer} url={TILE_LAYERS[activeLayer].url} attribution={TILE_LAYERS[activeLayer].attribution} maxZoom={19} />
            <InvalidateSizeOnMount />
            <DrawController mode={drawMode} onPoint={handleDrawPoint} onUndo={handleUndoPoint} />
            <FlyToLocation location={flyTo} />
            <MapCenterTracker onChange={setMapCenter} />

            <div className="leaflet-top leaflet-right" style={{ zIndex: 1000 }}>
              <div className="leaflet-control flex flex-col gap-1.5 mr-3 mt-3">
                <button onClick={() => mapRef.current?.zoomIn()} className="w-10 h-10 bg-background border-2 border-border/80 rounded-xl shadow-md flex items-center justify-center hover:bg-muted font-black"><ZoomIn className="h-5 w-5" /></button>
                <button onClick={() => mapRef.current?.zoomOut()} className="w-10 h-10 bg-background border-2 border-border/80 rounded-xl shadow-md flex items-center justify-center hover:bg-muted font-black"><ZoomOut className="h-5 w-5" /></button>
              </div>
            </div>

            {userLocation && (
              <Marker position={userLocation} icon={userIcon}><Popup><strong>Your location</strong><div>{currentLocationLabel}</div></Popup></Marker>
            )}
            {nearbyRadius !== "all" && (
              <Circle center={refPoint} radius={nearbyRadius * 1000} pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.05, weight: 1, dashArray: "4" }} />
            )}

            {showFarmers && sortedFarmerMarkers.map(farmer => (
              <Marker key={farmer.id} position={[farmer.latitude, farmer.longitude]} icon={farmerIcon(farmer.isOnline)}>
                <Popup minWidth={220}>
                  <div className="p-1">
                    <div className="flex items-center gap-2 mb-2">
                      {farmer.avatar ? (
                        <img src={farmer.avatar} alt={farmer.name} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{farmer.name.slice(0, 1).toUpperCase()}</div>
                      )}
                      <div>
                        <div className="font-bold text-sm">{farmer.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <span>⭐ {farmer.rating.toFixed(1)}</span>
                          <span>·</span>
                          <span className={`w-2 h-2 rounded-full inline-block ${farmer.isOnline ? "bg-green-500" : "bg-gray-400"}`} />
                          {farmer.isOnline ? "Online" : "Offline"}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">📍 {farmer.location}</div>
                    <div className="text-xs text-gray-600 mb-2">🛒 {farmer.productCount} products · 📦 {farmer.totalStock} units stock</div>
                    <div className="mb-1 text-xs font-semibold text-primary">{farmer._distanceKm.toFixed(1)} km away</div>
                    <div className="text-xs text-gray-500">{farmer.products.slice(0, 3).join(", ")}{farmer.products.length > 3 ? ` +${farmer.products.length - 3} more` : ""}</div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {showHeatmap && sortedFarmerMarkers.map(farmer => {
              const intensity = Math.min(farmer.totalStock / 500, 1);
              const color = intensity > 0.6 ? "#22c55e" : intensity > 0.3 ? "#f59e0b" : "#ef4444";
              return <Circle key={`heat-${farmer.id}`} center={[farmer.latitude, farmer.longitude]} radius={3000 + farmer.totalStock * 5} pathOptions={{ color, fillColor: color, fillOpacity: 0.2, weight: 1 }} />;
            })}

            {showDemand && filteredNeeds.map(need => (
              <Marker key={need.id} position={[need.latitude, need.longitude]} icon={needIcon(need.urgency)}>
                <Popup minWidth={240}>
                  <div className="p-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">{need.productName}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${need.urgency === "high" ? "bg-red-100 text-red-700" : need.urgency === "medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>{need.urgency}</span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-0.5">
                      <div>📦 {need.quantity} {need.unit}</div>
                      <div>💰 {need.priceRange}</div>
                      <div>📍 {need.location}</div>
                      <div>{BUYER_ICONS[need.buyerType]} {need.buyerName}</div>
                      {need.deadline && <div>⏰ Needed by {need.deadline}</div>}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-primary">{need._distanceKm.toFixed(1)} km away</div>
                    {need.description && <div className="text-xs text-gray-500 mt-1 border-t pt-1">{need.description}</div>}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Approved Marketplace Seller Markers */}
            {(rightPanel === "marketplace" || rightPanel === "all") && marketData?.markers?.map((marker) => (
              <Marker
                key={`market-${marker.sellerId}`}
                position={[marker.latitude, marker.longitude]}
                icon={marketplaceSellerIcon(marker.isLocal ?? true)}
              >
                <Popup minWidth={220}>
                  <div className="p-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-sm">
                        <Store className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground">{marker.sellerName}</div>
                        <div className="text-xs text-muted-foreground">⭐ {(marker.rating ?? 5).toFixed(1)} · Approved Seller</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">📍 {marker.location}</div>
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                      🛒 {marker.productCount} approved product{marker.productCount !== 1 ? "s" : ""}
                    </div>
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => {
                        setRightPanel("marketplace");
                        setMarketFilters((prev) => ({ ...prev, search: marker.sellerName }));
                      }}
                    >
                      View Seller Listings
                    </Button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {showSurveyLayer && SURVEY_PARCELS.map(parcel => (
              <Polygon key={parcel.id} positions={parcel.coords}
                pathOptions={{ color: parcel.type === "arable" ? "#8b5cf6" : parcel.type === "horticultural" ? "#ec4899" : "#f59e0b", fillColor: parcel.type === "arable" ? "#8b5cf6" : parcel.type === "horticultural" ? "#ec4899" : "#f59e0b", fillOpacity: 0.2, weight: 2, dashArray: "6 3" }}>
                <Popup><div className="text-sm font-bold">{parcel.label}</div><div className="text-xs text-gray-500">Area: {parcel.area} ha · Type: {parcel.type}</div></Popup>
              </Polygon>
            ))}

            {showIrrigationLayer && IRRIGATION_ZONES.map(zone => (
              <Polygon key={zone.id} positions={zone.coords} pathOptions={{ color: "#0ea5e9", fillColor: "#0ea5e9", fillOpacity: 0.15, weight: 2.5 }}>
                <Popup><div className="text-sm font-bold">{zone.label}</div><div className="text-xs text-gray-500">💧 {zone.capacity}</div></Popup>
              </Polygon>
            ))}

            {drawnPoints.length > 0 && (
              <>
                {drawnPoints.map((pt, i) => <Circle key={`pt-${i}`} center={pt} radius={100} pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.8, weight: 2 }} />)}
                {drawnPoints.length >= 2 && <Polygon positions={drawnPoints} pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.15, weight: 2, dashArray: "8 4" }} />}
              </>
            )}

            {savedPolygons.map(poly => (
              <Polygon key={poly.id} positions={poly.coords} pathOptions={{ color: poly.color, fillColor: poly.color, fillOpacity: 0.2, weight: 2 }}>
                <Popup><div className="text-sm font-bold">{poly.label}</div><div className="text-xs text-gray-500">Area: {poly.area.toFixed(2)} ha</div></Popup>
              </Polygon>
            ))}
          </MapContainer>

          {/* Map legend */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-background/95 backdrop-blur-md border-2 border-border/80 rounded-2xl p-3 shadow-xl text-xs sm:text-sm space-y-1.5">
            <div className="font-black text-xs uppercase tracking-wider text-foreground mb-1.5 pb-1 border-b">Legend</div>
            {(rightPanel === "marketplace" || rightPanel === "all") && (
              <div className="flex items-center gap-2.5 font-bold"><div className="w-3.5 h-3.5 rounded-full bg-emerald-600 border border-white shadow-xs" /><span>Approved Seller</span></div>
            )}
            {showFarmers && <div className="flex items-center gap-2.5 font-bold"><div className="w-3.5 h-3.5 rounded-full bg-green-500 border border-white shadow-xs" /><span>Online</span></div>}
            {showFarmers && <div className="flex items-center gap-2.5 font-bold"><div className="w-3.5 h-3.5 rounded-full bg-gray-400 border border-white shadow-xs" /><span>Offline</span></div>}
            {showDemand && <div className="flex items-center gap-2.5 font-bold"><div className="w-3.5 h-3.5 rounded-full bg-red-500 border border-white shadow-xs" /><span>High Need</span></div>}
            {showDemand && <div className="flex items-center gap-2.5 font-bold"><div className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-white shadow-xs" /><span>Med Need</span></div>}
            {showHeatmap && <div className="flex items-center gap-2.5 font-bold"><div className="w-3.5 h-3.5 rounded-full bg-green-400 opacity-60" /><span>Heatmap</span></div>}
            {showSurveyLayer && <div className="flex items-center gap-2.5 font-bold"><div className="w-3.5 h-3.5 rounded bg-purple-500 opacity-50" /><span>Survey</span></div>}
            {showIrrigationLayer && <div className="flex items-center gap-2.5 font-bold"><div className="w-3.5 h-3.5 rounded bg-blue-400 opacity-50" /><span>Irrigation</span></div>}
            {savedPolygons.length > 0 && <div className="flex items-center gap-2.5 font-bold"><div className="w-3.5 h-3.5 rounded bg-primary opacity-50" /><span>Parcel</span></div>}
          </div>
          {unmappedFarmerCount > 0 && (
            <div className="absolute top-3 left-3 z-[1000] max-w-[280px] rounded-xl border-2 border-border/80 bg-background/95 p-3 text-xs font-bold text-foreground/85 shadow-lg backdrop-blur-md" data-testid="map-location-fallback">
              {unmappedFarmerCount} seller {unmappedFarmerCount === 1 ? "location is" : "locations are"} not mapped because public coordinates are unavailable. Location not specified.
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL with vertical tab rail ── */}
        <>
          {/* RIGHT DRAG HANDLE — sits between map and right side (rail + panel) */}
          <div
            onMouseDown={startRightDrag}
            onTouchStart={startRightDrag as any}
            className="group relative w-2 lg:w-2.5 h-full bg-gradient-to-b from-primary/15 via-primary/25 to-primary/15 hover:bg-primary/40 cursor-col-resize flex-shrink-0 transition-colors active:bg-primary/60 flex items-center justify-center z-[600] border-x border-primary/20"
            title="Drag to resize panel"
            data-testid="resize-handle-right-panel"
          >
            {/* Visible vertical grip lines */}
            <div className="flex flex-col items-center gap-0.5 pointer-events-none">
              <div className="w-0.5 h-1 bg-primary/70 rounded-full" />
              <div className="w-0.5 h-1 bg-primary/70 rounded-full" />
              <div className="w-0.5 h-1 bg-primary/70 rounded-full" />
              <div className="w-0.5 h-1 bg-primary/70 rounded-full" />
              <div className="w-0.5 h-1 bg-primary/70 rounded-full" />
            </div>
            {/* Hover tooltip pill */}
            <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap transition-opacity">
              ⇔ Drag
            </div>
          </div>

          {/* Vertical tab rail */}
          <div className="flex flex-col gap-1 lg:gap-1.5 p-1 lg:p-2 bg-background border-l-2 border-border/80 z-[500] flex-shrink-0 shadow-sm">
            {RIGHT_PANEL_TABS.filter((tab) => tab.id !== "post" || user?.role === "buyer").map(tab => {
              const Icon = tab.icon;
              const active = rightPanel === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setRightPanel(tab.id)}
                  title={t(tab.labelKey)}
                  className={`flex flex-col items-center justify-center gap-1 w-11 lg:w-[68px] py-2 lg:py-3 rounded-xl lg:rounded-2xl text-[9px] font-black transition-all ${
                    active 
                      ? "bg-amber-400 text-amber-950 shadow-md scale-105 ring-2 ring-amber-500/80" 
                      : "bg-emerald-50/90 text-emerald-900 ring-1 ring-emerald-300 hover:bg-emerald-100 hover:text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200"
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className={`h-4.5 w-4.5 lg:h-5 lg:w-5 stroke-[2.2] ${active ? "text-amber-950" : tab.color}`} />
                  <span className="leading-tight text-center w-full lg:hidden font-black text-[9px] truncate px-0.5">
                    {t(tab.shortLabelKey)}
                  </span>
                  <span className="leading-tight text-center hidden lg:block font-black text-[9.5px] tracking-tighter w-full px-0.5">
                    {t(tab.labelKey).split(" ").map((w, i) => (
                      <span key={i} className="block truncate">
                        {w}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Panel content */}
          <div
            ref={rightPanelRef}
            className="h-full bg-background flex flex-col overflow-hidden flex-shrink-0"
            style={{ width: rightPanelWidth }}
          >
            {/* ── REGIONAL MARKETPLACE panel ── */}
            {rightPanel === "marketplace" && (
              <div className="flex h-full flex-col">
                <div className="flex-shrink-0 border-b-2 border-border/80 p-3 lg:p-4 bg-card">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div>
                      <h2 className="flex items-center gap-2 text-sm lg:text-base font-black uppercase tracking-wider text-foreground">
                        <Store className="h-4.5 w-4.5 text-emerald-600 stroke-[2.5]" />
                        {t("map.tab_marketplace", "Regional Marketplace")}
                      </h2>
                      <p className="text-[11px] sm:text-xs font-bold text-muted-foreground mt-0.5">
                        {t("map.approved_sellers_near_you", "Approved sellers & regional inventory")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs font-black uppercase border-2">
                            <Filter className="h-3.5 w-3.5 mr-1" /> Filters
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[320px] sm:w-[380px] overflow-y-auto">
                          <SheetHeader>
                            <SheetTitle className="text-base font-black uppercase tracking-wider">Advanced Filters</SheetTitle>
                          </SheetHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-black uppercase">Quantity</Label>
                              <Input
                                type="number"
                                min="1"
                                placeholder="e.g. 50"
                                value={marketFilters.quantity}
                                onChange={(e) => setMarketFilters((prev) => ({ ...prev, quantity: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-black uppercase">Quality Grade</Label>
                              <Select
                                value={marketFilters.qualityGrade || "any"}
                                onValueChange={(val) => setMarketFilters((prev) => ({ ...prev, qualityGrade: val === "any" ? "" : val }))}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="any">Any Grade</SelectItem>
                                  <SelectItem value="A">Grade A (Premium)</SelectItem>
                                  <SelectItem value="B">Grade B (Standard)</SelectItem>
                                  <SelectItem value="C">Grade C (Processing)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-black uppercase">Min Price</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={marketFilters.minPrice}
                                  onChange={(e) => setMarketFilters((prev) => ({ ...prev, minPrice: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-black uppercase">Max Price</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={marketFilters.maxPrice}
                                  onChange={(e) => setMarketFilters((prev) => ({ ...prev, maxPrice: e.target.value }))}
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-black uppercase">Seller Rating</Label>
                              <Select
                                value={marketFilters.minRating || "any"}
                                onValueChange={(val) => setMarketFilters((prev) => ({ ...prev, minRating: val === "any" ? "" : val }))}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="any">Any Rating</SelectItem>
                                  <SelectItem value="4">4+ Stars</SelectItem>
                                  <SelectItem value="4.5">4.5+ Stars</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-black uppercase">Visibility &amp; Fulfilment</Label>
                              <Select
                                value={marketFilters.scope}
                                onValueChange={(val) => setMarketFilters((prev) => ({ ...prev, scope: val }))}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="global">Local First + Global Discovery</SelectItem>
                                  <SelectItem value="local">Local Fulfilment Only</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              variant="outline"
                              className="w-full text-xs font-black uppercase"
                              onClick={() => setMarketFilters({
                                search: "",
                                categoryId: "",
                                subcategoryId: "",
                                regionId: "",
                                quantity: "",
                                qualityGrade: "",
                                minPrice: "",
                                maxPrice: "",
                                minRating: "",
                                scope: "global",
                                sortBy: "distance",
                              })}
                            >
                              Reset All Filters
                            </Button>
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </div>

                  {/* Search input */}
                  <div className="relative mb-2.5">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search Rice, Tomato, Seeds, Seller..."
                      value={marketFilters.search}
                      onChange={(e) => setMarketFilters((prev) => ({ ...prev, search: e.target.value }))}
                      className="pl-9 h-9 text-xs sm:text-sm font-bold rounded-xl border-2"
                    />
                  </div>

                  {/* Region & Sort controls */}
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={marketFilters.regionId || "global"}
                      onValueChange={(val) => setMarketFilters((prev) => ({ ...prev, regionId: val === "global" ? "" : val }))}
                    >
                      <SelectTrigger className="h-8.5 text-[11px] font-bold rounded-xl border-2">
                        <SelectValue placeholder="Region" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 rounded-xl border-2">
                        <SelectItem value="global" className="font-bold">🌍 Global Marketplace</SelectItem>
                        {marketplaceRegions.map((region) => (
                          <SelectItem key={region.id} value={region.id} className="font-bold">
                            📍 {region.name}, {region.countryCode} ({region.activeSellerCount || 0})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={marketFilters.sortBy}
                      onValueChange={(val) => setMarketFilters((prev) => ({ ...prev, sortBy: val }))}
                    >
                      <SelectTrigger className="h-8.5 text-[11px] font-bold rounded-xl border-2">
                        <SelectValue placeholder="Sort" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-2">
                        <SelectItem value="distance" className="font-bold">Nearest First</SelectItem>
                        <SelectItem value="price_asc" className="font-bold">Price: Low to High</SelectItem>
                        <SelectItem value="price_desc" className="font-bold">Price: High to Low</SelectItem>
                        <SelectItem value="rating" className="font-bold">Highest Rating</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category Selection: ALL Button + Select Dropdown */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={!marketFilters.categoryId ? "default" : "outline"}
                      className={`h-9 px-3.5 text-xs font-black uppercase tracking-wider rounded-xl border-2 flex-shrink-0 transition-all ${!marketFilters.categoryId ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs" : "border-border/80 text-foreground hover:bg-muted"}`}
                      onClick={() => setMarketFilters((prev) => ({ ...prev, categoryId: "", subcategoryId: "" }))}
                      data-testid="category-btn-all"
                    >
                      ALL
                    </Button>
                    <Select
                      value={marketFilters.categoryId || "all"}
                      onValueChange={(val) => setMarketFilters((prev) => ({
                        ...prev,
                        categoryId: val === "all" ? "" : val,
                        subcategoryId: "",
                      }))}
                    >
                      <SelectTrigger className="h-9 flex-1 text-xs font-bold rounded-xl border-2 bg-background shadow-2xs">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent className="max-h-80 rounded-xl border-2">
                        <SelectItem value="all" className="font-bold">
                          All Categories (Complete Catalogue)
                        </SelectItem>
                        {publishedCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id} className="font-bold">
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subcategories Dropdown if category selected */}
                  {(() => {
                    const selectedCat = publishedCategories.find((c) => c.id === marketFilters.categoryId);
                    if (!selectedCat || !selectedCat.subcategories?.length) return null;
                    return (
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={!marketFilters.subcategoryId ? "default" : "outline"}
                          className={`h-9 px-3 text-xs font-black uppercase tracking-wider rounded-xl border-2 flex-shrink-0 transition-all ${
                            !marketFilters.subcategoryId
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs"
                              : "border-border/80 text-foreground hover:bg-muted"
                          }`}
                          onClick={() => setMarketFilters((prev) => ({ ...prev, subcategoryId: "" }))}
                          data-testid="subcategory-btn-all"
                        >
                          ALL {selectedCat.name.split(" ")[0]}
                        </Button>
                        <Select
                          value={marketFilters.subcategoryId || "all"}
                          onValueChange={(val) =>
                            setMarketFilters((prev) => ({
                              ...prev,
                              subcategoryId: val === "all" ? "" : val,
                            }))
                          }
                        >
                          <SelectTrigger
                            className="h-9 flex-1 text-xs font-bold rounded-xl border-2 bg-background shadow-2xs"
                            data-testid="select-marketplace-subcategory"
                          >
                            <SelectValue placeholder={`Select Sub-category`} />
                          </SelectTrigger>
                          <SelectContent className="max-h-72 rounded-xl border-2">
                            <SelectItem value="all" className="font-bold">
                              All {selectedCat.name} (All Sub-categories)
                            </SelectItem>
                            {selectedCat.subcategories.map((sub) => (
                              <SelectItem key={sub.id} value={sub.id} className="font-bold">
                                {sub.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })()}

                  {/* Summary badges */}
                  <div className="mt-2.5 flex items-center justify-between text-[11px] font-bold text-muted-foreground border-t border-border/50 pt-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-black px-2 py-0.5 border-emerald-300 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {marketData?.summary?.localCount ?? 0} Local
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-black px-2 py-0.5 border-blue-300 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30">
                        <Globe2 className="mr-1 h-3 w-3" />
                        {marketData?.summary?.globalCount ?? 0} Global
                      </Badge>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-foreground/80">
                      {marketData?.pagination?.total ?? 0} products
                    </span>
                  </div>
                </div>

                {/* Trusted regional partners list if present */}
                {marketplaceOrganisations.length > 0 && (
                  <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
                    <div className="flex items-center gap-1.5 text-[11px] font-black text-foreground mb-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Trusted Regional Partners</span>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {marketplaceOrganisations.map((org) => (
                        <div key={org.id} className="flex-shrink-0 rounded-lg border bg-background px-2.5 py-1 text-[10px] font-bold shadow-2xs">
                          <span className="text-foreground">{org.name}</span>
                          <span className="text-muted-foreground ml-1.5 text-[9px]">({org.regionName})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Marketplace Products List */}
                <ScrollArea className="flex-1 p-2 lg:p-3">
                  {isMarketLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-2" />
                      <p className="text-xs font-bold">Loading approved regional listings...</p>
                    </div>
                  ) : marketData?.products && marketData.products.length > 0 ? (
                    <div className="space-y-3">
                      {marketData.products.map((product) => (
                        <div
                          key={product.id}
                          className={`rounded-2xl border-2 transition-all p-3 bg-card ${product.localFulfilmentEligible ? "border-emerald-300 dark:border-emerald-800 shadow-sm hover:shadow-md" : "border-border/70 hover:border-primary/40 shadow-2xs"}`}
                        >
                          <div className="flex items-start gap-3">
                            <SafeProductImage
                              src={resolveProductImageForProduct(product).src}
                              fallbackSrc={resolveProductImageForProduct(product).fallbackSrc}
                              alt={product.name}
                              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover flex-shrink-0 border"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <Badge className={`text-[9px] font-black px-1.5 py-0.5 uppercase ${product.localFulfilmentEligible ? "bg-emerald-600 text-white" : "bg-slate-600 text-white"}`}>
                                  {product.localFulfilmentEligible ? "Local Fulfilment" : "Global Discovery"}
                                </Badge>
                                {product.regionName && (
                                  <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[120px]">
                                    📍 {product.regionName}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                className="font-black text-sm text-foreground hover:underline text-left mt-1 block truncate w-full"
                                onClick={() => setLocation(`/products/${product.id}`)}
                              >
                                {product.name}
                              </button>
                              <div className="text-xs font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                                {format(product.price, { sourceCurrency: product.currency || "GBP" })}
                                <span className="text-[10px] font-bold text-muted-foreground">/{product.unit}</span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground mt-1">
                                <span>{product.farmerName}</span>
                                <span>{product.stock} in stock</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-border/50">
                            <Button
                              size="sm"
                              className="flex-1 h-8 text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                              onClick={() => addToCart.mutate(product)}
                              disabled={addToCart.isPending}
                            >
                              {addToCart.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                              Add to Cart
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-xs font-black uppercase border-2"
                              onClick={() => setLocation(`/products/${product.id}`)}
                            >
                              Details
                            </Button>
                            <FavoriteProductButton
                              productId={product.id}
                              productName={product.name}
                              className="h-8 w-8 bg-background border-2 shadow-xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center text-muted-foreground">
                      <Store className="mx-auto mb-3 h-10 w-10 opacity-30 text-emerald-600" />
                      <p className="text-sm font-black text-foreground">No approved products match these filters</p>
                      <p className="text-xs mt-1 text-muted-foreground">Try selecting another category, changing the region, or clearing search filters.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-4 text-xs font-black uppercase border-2"
                        onClick={() => setMarketFilters({
                          search: "",
                          categoryId: "",
                          subcategoryId: "",
                          regionId: "",
                          quantity: "",
                          qualityGrade: "",
                          minPrice: "",
                          maxPrice: "",
                          minRating: "",
                          scope: "global",
                          sortBy: "distance",
                        })}
                      >
                        Reset All Filters
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
            {rightPanel === "all" && (
              <div className="flex h-full flex-col">
                <div className="flex-shrink-0 border-b border-border/50 p-3 lg:p-4">
                  <h2 className="flex items-center gap-2 text-sm font-bold lg:text-base">
                    <Globe className="h-4 w-4 text-emerald-600" />
                    Nearby marketplace
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {nearbyAll.length} active farmer and buyer result{nearbyAll.length === 1 ? "" : "s"}
                  </p>
                </div>
                <ScrollArea className="flex-1">
                  <div className="space-y-2 p-2 lg:p-3">
                    {nearbyAll.map((item) => (
                      <button
                        key={item.id}
                        className="w-full rounded-xl border border-border/60 p-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/40"
                        onClick={() => {
                          setFlyTo([item.latitude, item.longitude]);
                          mapRef.current?.flyTo([item.latitude, item.longitude], 12, { duration: 1 });
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className={item.kind === "farmer" ? "border-green-300 text-green-700" : "border-red-300 text-red-700"}>
                                {item.kind === "farmer" ? "Farmer" : "Buyer"}
                              </Badge>
                              <span className="truncate text-sm font-semibold">{item.name}</span>
                            </div>
                            <p className="mt-1 truncate text-xs text-muted-foreground">{item.location}</p>
                            <p className="mt-1 text-xs">{item.detail}</p>
                          </div>
                          <span className="whitespace-nowrap rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            {item.distanceKm < 1 ? `${Math.round(item.distanceKm * 1000)} m` : `${item.distanceKm.toFixed(1)} km`}
                          </span>
                        </div>
                      </button>
                    ))}
                    {nearbyAll.length === 0 && (
                      <div className="py-10 text-center text-muted-foreground">
                        <Globe className="mx-auto mb-2 h-8 w-8 opacity-30" />
                        <p className="text-sm font-medium">No marketplace activity within this radius</p>
                        <Button size="sm" variant="outline" className="mt-3" onClick={() => setNearbyRadius("all")}>View all results</Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
            {/* ── FARMERS panel ── */}
            {rightPanel === "farmers" && (
              <div className="flex flex-col h-full">
                <div className="p-2 lg:p-4 border-b border-border/50 flex-shrink-0">
                  <h2 className="font-bold text-xs lg:text-base flex items-center gap-1.5 lg:gap-2">
                    <Users className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-green-600" />
                    {t("map.farmers_and_products")}
                  </h2>
                  <p className="text-[10px] lg:text-xs text-muted-foreground mt-0.5">{sortedFarmerMarkers.filter(f => f.isOnline).length} {t("map.on_label")} · {sortedFarmerMarkers.length} {t("map.total")} · {t(userLocation ? "map.sorted_by_distance_you" : "map.sorted_by_distance_map")}</p>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-1.5 lg:p-3 space-y-1.5 lg:space-y-2">
                    {sortedFarmerMarkers.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-medium">No active farmers within this radius</p>
                        <Button size="sm" variant="outline" className="mt-3" onClick={() => setNearbyRadius("all")}>View all farmers</Button>
                      </div>
                    )}
                    {sortedFarmerMarkers.map(farmer => (
                      <div key={farmer.id} className="rounded-lg lg:rounded-xl border border-border/60 overflow-hidden hover:border-primary/30 transition-all">
                        <button
                          className="w-full text-left p-1.5 lg:p-3 flex items-center gap-1.5 lg:gap-3 hover:bg-muted/40 transition-colors"
                          onClick={() => {
                            setExpandedFarmer(expandedFarmer === farmer.id ? null : farmer.id);
                            if (mapRef.current) mapRef.current.flyTo([farmer.latitude, farmer.longitude], 12, { duration: 1 });
                          }}
                          data-testid={`farmer-card-${farmer.id}`}
                        >
                          <div className="relative flex-shrink-0">
                            <img src={farmer.avatar} alt={farmer.name} className="w-7 h-7 lg:w-10 lg:h-10 rounded-full object-cover border-2 border-border" />
                            <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 lg:w-3 lg:h-3 rounded-full border-2 border-background ${farmer.isOnline ? "bg-green-500" : "bg-gray-400"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-[11px] lg:text-sm truncate">{farmer.name}</div>
                            <div className="text-[10px] lg:text-xs text-muted-foreground truncate">📍 {farmer.location}</div>
                            <div className="flex items-center gap-1 lg:gap-2 mt-0.5">
                              <span className="text-[9px] lg:text-[10px] text-amber-500 font-medium flex items-center gap-0.5">
                                <Star className="h-2 w-2 lg:h-2.5 lg:w-2.5 fill-amber-400 text-amber-400" />{farmer.rating.toFixed(1)}
                              </span>
                              <span className="text-[9px] lg:text-[10px] text-muted-foreground">{farmer.productCount}p</span>
                              <span className="text-[9px] lg:text-[10px] text-muted-foreground">{farmer.totalStock}u</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            <span className="text-[9px] lg:text-[10px] font-semibold text-primary whitespace-nowrap bg-primary/10 px-1.5 py-0.5 rounded">{farmer._distanceKm < 1 ? `${Math.round(farmer._distanceKm * 1000)} m` : `${farmer._distanceKm.toFixed(1)} km`}</span>
                            <ChevronDown className={`h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground transition-transform ${expandedFarmer === farmer.id ? "rotate-180" : ""}`} />
                          </div>
                        </button>

                        {expandedFarmer === farmer.id && (
                          <div className="px-3 pb-3 border-t border-border/40 bg-muted/20">
                            <div className="pt-2 space-y-1.5">
                              {farmer.productItems.slice(0, 6).map(product => (
                                <div key={product.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-background border border-border/40">
                                  <SafeProductImage
                                    src={resolveProductImageForProduct(product).src}
                                    fallbackSrc={resolveProductImageForProduct(product).fallbackSrc}
                                    alt={product.name}
                                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium truncate">{product.name}</div>
                                    <div className="text-[10px] text-muted-foreground">{format(product.price, { sourceCurrency: product.currency || "GBP" })}/{product.unit} · {product.stock} in stock</div>
                                  </div>
                                  {product.price === 0 && <Badge className="text-[9px] bg-green-100 text-green-700 border-none">Free</Badge>}
                                  <FavoriteProductButton
                                    productId={product.id}
                                    productName={product.name}
                                    className="h-7 w-7 bg-background shadow-sm hover:bg-background"
                                    data-testid={`button-map-farmer-favorite-${product.id}`}
                                  />
                                </div>
                              ))}
                              {farmer.productItems.length > 6 && (
                                <div className="text-[10px] text-center text-muted-foreground py-1">+{farmer.productItems.length - 6} more products</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* ── AVAILABLE FOOD panel ── */}
            {rightPanel === "food" && (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-border/50 flex-shrink-0">
                  <h2 className="font-bold text-base flex items-center gap-2">
                    <Wheat className="h-4 w-4 text-amber-600" />
                    {t("map.available_food_with_farmers")}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("map.products_from_farmers", { count: sortedProducts.length, farmers: sortedFarmerMarkers.length })}</p>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-3">
                    {/* Group products by category */}
                    {Array.from(new Set(sortedProducts.map(p => p.categoryId))).slice(0, 10).map(catId => {
                      const catProducts = sortedProducts.filter(p => p.categoryId === catId).slice(0, 8);
                      if (catProducts.length === 0) return null;
                      const catLabel = catId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                      return (
                        <div key={catId}>
                          <div className="flex items-center gap-2 mb-2">
                            <Leaf className="h-3 w-3 text-green-600" />
                            <span className="text-xs font-semibold text-foreground">{catLabel}</span>
                            <span className="text-[10px] text-muted-foreground">({catProducts.length})</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {catProducts.map(product => (
                              <div key={product.id} className="relative">
                                <button
                                  className="flex w-full items-center gap-2 rounded-lg border border-border/50 p-2 pr-10 text-left transition-all hover:border-primary/30 hover:bg-muted/40"
                                  onClick={() => { if (mapRef.current) mapRef.current.flyTo([product.farmerLatitude, product.farmerLongitude], 12, { duration: 1 }); }}
                                  data-testid={`food-product-${product.id}`}
                                >
                                <SafeProductImage
                                  src={resolveProductImageForProduct(product).src}
                                  fallbackSrc={resolveProductImageForProduct(product).fallbackSrc}
                                  alt={product.name}
                                  className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-[11px] font-medium truncate leading-tight">{product.name}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {product.price === 0 ? <span className="text-green-600 font-semibold">Free</span> : `${format(product.price, { sourceCurrency: product.currency || "GBP" })}/${product.unit}`}
                                  </div>
                                  <div className="text-[9px] text-muted-foreground truncate">{product.farmerName}</div>
                                </div>
                                </button>
                                <FavoriteProductButton
                                  productId={product.id}
                                  productName={product.name}
                                  className="!absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2 bg-background shadow-md hover:bg-red-50"
                                  data-testid={`button-map-food-favorite-${product.id}`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* ── LIVE NEEDS panel ── */}
            {rightPanel === "needs" && (
              <div className="flex flex-col h-full">
                <div className="p-4 lg:p-5 border-b-2 border-border/80 flex-shrink-0 bg-card">
                  <div className="flex items-center justify-between mb-3.5">
                    <div>
                      <h2 className="font-black text-base lg:text-lg uppercase tracking-wider flex items-center gap-2 text-foreground">
                        <Radio className="h-5 w-5 text-red-500 animate-pulse stroke-[2.5]" />
                        {t("map.live_local_needs")}
                      </h2>
                      <p className="text-xs sm:text-sm font-bold text-foreground/80 mt-1">{t("map.realtime_buyer_demand")}</p>
                    </div>
                    {user?.role === "buyer" && (
                      <Button size="sm" className="text-xs sm:text-sm font-black uppercase tracking-wide h-9 px-3.5 bg-amber-400 text-black hover:bg-amber-500 shadow-md" onClick={() => setRightPanel("post")}>
                        <Plus className="h-4 w-4 mr-1 stroke-[2.5]" />{t("map.post_btn")}
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2.5">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder={t("map.search_needs")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-10 text-xs sm:text-sm font-bold rounded-xl border-2" />
                    </div>
                    <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                      <SelectTrigger className="w-28 h-10 text-xs sm:text-sm font-black rounded-xl border-2"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl border-2">
                        <SelectItem value="all" className="font-bold">{t("common.all")}</SelectItem>
                        <SelectItem value="high" className="font-bold">🔴 {t("map.urgency_high")}</SelectItem>
                        <SelectItem value="medium" className="font-bold">🟡 {t("map.urgency_medium")}</SelectItem>
                        <SelectItem value="low" className="font-bold">🟢 {t("map.urgency_low")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <ScrollArea className="flex-1 p-3 lg:p-4">
                  <div className="space-y-3">
                    {filteredNeeds.map((need, idx) => (
                      <motion.div key={need.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}>
                        <Card className={`border-2 ${need.urgency === "high" ? "border-red-300 dark:border-red-900" : need.urgency === "medium" ? "border-amber-300 dark:border-amber-900" : "border-green-300 dark:border-green-900"} hover:shadow-lg transition-all cursor-pointer rounded-2xl`}
                          onClick={() => { setFlyTo([need.latitude, need.longitude]); mapRef.current?.flyTo([need.latitude, need.longitude], 12, { duration: 1 }); }}>
                          <CardContent className="p-4 space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <span className="text-2xl">{BUYER_ICONS[need.buyerType]}</span>
                                <div>
                                  <div className="font-black text-base text-foreground leading-tight">{need.productName}</div>
                                  <div className="text-xs sm:text-sm font-bold text-muted-foreground mt-0.5">{need.buyerName}</div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge className={`text-xs font-black px-2.5 py-0.5 uppercase tracking-wider ${URGENCY_COLORS[need.urgency]}`}>{need.urgency}</Badge>
                                <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md whitespace-nowrap">{need._distanceKm < 1 ? `${Math.round(need._distanceKm * 1000)} m` : `${need._distanceKm.toFixed(1)} km`}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 text-xs sm:text-sm font-bold text-foreground/80">
                              <span>📦 {need.quantity} {need.unit}</span>
                              <span>💰 {need.priceRange}</span>
                              <span className="col-span-2">📍 {need.location}</span>
                              {need.deadline && <span className="col-span-2">⏰ By {need.deadline}</span>}
                            </div>
                            {need.description && <p className="text-xs sm:text-sm font-bold text-muted-foreground border-t border-border/60 pt-2 line-clamp-2">{need.description}</p>}
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{need.timePosted}</span>
                              <Button size="sm" variant="outline" className="h-8 text-xs font-black uppercase px-3.5 border-2 rounded-xl" onClick={(e) => { e.stopPropagation(); toast({ title: `Contact sent to ${need.buyerName}!` }); }}>Contact</Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                    {filteredNeeds.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-medium">{t("map.no_needs_match")}</p>
                        <Button size="sm" variant="outline" className="mt-3" onClick={() => setNearbyRadius("all")}>View all buyer needs</Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* ── POST NEED panel ── */}
            {rightPanel === "post" && (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-border/50 flex-shrink-0 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-base">{t("map.post_a_need")}</h2>
                    <p className="text-xs text-muted-foreground">{t("map.post_need_desc")}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setRightPanel("needs")}>
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />{t("common.back")}
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">{t("map.product_name")}</Label>
                      <Input placeholder={t("map.product_name_placeholder")} value={postForm.productName} onChange={e => setPostForm(p => ({ ...p, productName: e.target.value }))} className="h-9 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label className="text-xs">{t("map.quantity")}</Label>
                        <Input type="number" placeholder="100" value={postForm.quantity} onChange={e => setPostForm(p => ({ ...p, quantity: e.target.value }))} className="h-9 text-sm" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">{t("map.unit")}</Label>
                        <Select value={postForm.unit} onValueChange={v => setPostForm(p => ({ ...p, unit: v }))}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["kg", "liter", "units", "bundle", "bag", "dozen"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t("map.price_range")}</Label>
                      <Input placeholder={t("map.price_range_placeholder")} value={postForm.priceRange} onChange={e => setPostForm(p => ({ ...p, priceRange: e.target.value }))} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">City, Country</Label>
                      <Input
                        placeholder={user?.location || "e.g. Mumbai, India"}
                        value={postForm.location}
                        onChange={e => setPostForm(p => ({ ...p, location: e.target.value }))}
                        className="h-9 text-sm"
                        data-testid="input-need-location"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Leave blank to use your saved profile location. Only the city-level location is published.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label className="text-xs">{t("map.urgency")}</Label>
                        <Select value={postForm.urgency} onValueChange={v => setPostForm(p => ({ ...p, urgency: v as any }))}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">🔴 {t("map.urgency_high")}</SelectItem>
                            <SelectItem value="medium">🟡 {t("map.urgency_medium")}</SelectItem>
                            <SelectItem value="low">🟢 {t("map.urgency_low")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">{t("map.buyer_type")}</Label>
                        <Select value={postForm.buyerType} onValueChange={v => setPostForm(p => ({ ...p, buyerType: v }))}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[["restaurant", "🍽️ Restaurant"], ["retailer", "🏪 Retailer"], ["individual", "👤 Individual"], ["processor", "🏭 Processor"], ["school", "🏫 School"], ["hospital", "🏥 Hospital"]].map(([v, l]) => (
                              <SelectItem key={v} value={v}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t("map.deadline")}</Label>
                      <Input type="date" value={postForm.deadline} onChange={e => setPostForm(p => ({ ...p, deadline: e.target.value }))} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">{t("map.description")}</Label>
                      <Textarea placeholder={t("map.description_placeholder")} value={postForm.description} onChange={e => setPostForm(p => ({ ...p, description: e.target.value }))} className="text-sm resize-none" rows={3} />
                    </div>
                    <Button className="w-full" onClick={() => postNeedMutation.mutate(postForm)}
                      disabled={!postForm.productName || !postForm.quantity || (!postForm.location && !hasSavedProfileLocation) || postNeedMutation.isPending}>
                      {postNeedMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                      {t("map.post_to_live_feed")}
                    </Button>
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* ── MY PARCELS panel ── */}
            {rightPanel === "shapes" && (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-border/50 flex-shrink-0 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-base">{t("map.my_land_parcels")}</h2>
                    <p className="text-xs text-muted-foreground">{savedPolygons.length} {t("map.parcel")}{savedPolygons.length !== 1 ? "s" : ""} {t("map.saved")}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={handleExportGDB}><Download className="h-3.5 w-3.5 mr-1" />Export</Button>
                    <Button size="sm" className="text-xs h-7" onClick={() => { setDrawMode("polygon"); }}><PenTool className="h-3.5 w-3.5 mr-1" />Draw</Button>
                  </div>
                </div>
                <ScrollArea className="flex-1 p-3">
                  {savedPolygons.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <PenTool className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No parcels yet</p>
                      <p className="text-xs mt-1">Use Drawing → Draw Polygon to mark land areas</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {savedPolygons.map(poly => (
                        <Card key={poly.id} className="border-border/50">
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className="w-4 h-4 rounded-sm flex-none" style={{ background: poly.color }} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{poly.label}</div>
                              <div className="text-xs text-muted-foreground">{poly.area.toFixed(2)} ha · {poly.coords.length} points</div>
                            </div>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => setSavedPolygons(p => p.filter(x => x.id !== poly.id))}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
                        <div className="font-semibold text-foreground">Total Area</div>
                        <div className="text-lg font-bold text-primary">{savedPolygons.reduce((sum, p) => sum + p.area, 0).toFixed(2)} ha</div>
                        <div>{(savedPolygons.reduce((sum, p) => sum + p.area, 0) * 2.471).toFixed(2)} acres</div>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
        </>
      </div>
    </div>
  );
}
