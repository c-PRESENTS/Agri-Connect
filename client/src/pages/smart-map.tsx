import "leaflet/dist/leaflet.css";
import { useState, useEffect, useCallback, useRef } from "react";
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
  Star, Leaf, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TopNavigation } from "@/components/top-navigation";

import { getProductImage } from "@/lib/product-images";
import { isSellerOnline } from "@/lib/seller-presence";
import type { Product, LocalNeed } from "@shared/schema";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
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
type RightPanelType = "farmers" | "food" | "needs" | "post" | "shapes";

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

/** Haversine distance in km. */
function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
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

const RIGHT_PANEL_TABS: { id: RightPanelType; icon: any; label: string; shortLabel: string; color: string }[] = [
  { id: "farmers", icon: Users, label: "Farmers", shortLabel: "Farm", color: "text-green-600" },
  { id: "food", icon: Wheat, label: "Available Food", shortLabel: "Food", color: "text-amber-600" },
  { id: "needs", icon: Radio, label: "Live Needs", shortLabel: "Need", color: "text-red-500" },
  { id: "post", icon: Plus, label: "Post Need", shortLabel: "Post", color: "text-blue-600" },
  { id: "shapes", icon: PenTool, label: "My Parcels", shortLabel: "Plot", color: "text-purple-600" },
];

export default function SmartMapPage() {
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
  const [rightPanel, setRightPanel] = useState<RightPanelType>("farmers");
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      // Roughly half of remaining width after vertical tab rail (~36px) + handle (~6px)
      return Math.max(150, Math.floor((window.innerWidth - 44) / 2));
    }
    return 360;
  });
  const draggingRight = useRef<{ startX: number; startW: number } | null>(null);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([52.3, -1.0]);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [isLocating, setIsLocating] = useState(false);
  const [expandedFarmer, setExpandedFarmer] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);

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
    addressLine: "", city: "", postcode: "", location: "",
    urgency: "medium" as "high" | "medium" | "low",
    buyerType: "individual" as any, description: "", deadline: "",
  });

  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: localNeeds = [], refetch: refetchNeeds } = useQuery<LocalNeed[]>({ queryKey: ["/api/local-needs"] });

  const postNeedMutation = useMutation({
    mutationFn: (data: typeof postForm) => apiRequest("POST", "/api/local-needs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/local-needs"] });
      refetchNeeds();
      toast({ title: "Demand posted!", description: "Farmers in your area will see your need." });
      setPostForm({ productName: "", quantity: "", unit: "kg", priceRange: "", addressLine: "", city: "", postcode: "", location: "", urgency: "medium", buyerType: "individual", description: "", deadline: "" });
      setRightPanel("needs");
    },
    onError: () => toast({ title: "Failed to post demand", variant: "destructive" }),
  });

  const farmerMarkers: FarmerMarker[] = products.reduce((acc, product) => {
    const existing = acc.find(m => m.id === product.farmerId);
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
        name: product.farmerName,
        avatar: product.farmerAvatar,
        latitude: product.farmerLatitude,
        longitude: product.farmerLongitude,
        isOnline: isSellerOnline(product.farmerId),
        productCount: 1,
        rating: product.farmerRating,
        products: [product.name],
        location: product.farmerLocation,
        totalStock: product.stock,
        productItems: [product],
      });
    }
    return acc;
  }, [] as FarmerMarker[]);

  // Reference point used to sort right-panel lists by proximity:
  // 1. user's GPS location if they clicked "My Location"
  // 2. otherwise the current center of the map (updates as the user pans/zooms)
  const refPoint: [number, number] = userLocation ?? mapCenter;

  const filteredNeeds = localNeeds
    .filter(n => {
      if (urgencyFilter !== "all" && n.urgency !== urgencyFilter) return false;
      if (searchQuery && !n.productName.toLowerCase().includes(searchQuery.toLowerCase()) && !n.location.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .map(n => ({ ...n, _distanceKm: haversineKm(refPoint, [n.latitude, n.longitude]) }))
    .sort((a, b) => a._distanceKm - b._distanceKm);

  const sortedFarmerMarkers = [...farmerMarkers]
    .map(f => ({ ...f, _distanceKm: haversineKm(refPoint, [f.latitude, f.longitude]) }))
    .sort((a, b) => a._distanceKm - b._distanceKm);

  const sortedProducts = [...products]
    .map(p => ({ ...p, _distanceKm: haversineKm(refPoint, [p.farmerLatitude, p.farmerLongitude]) }))
    .sort((a, b) => a._distanceKm - b._distanceKm);

  const handleLocate = useCallback(() => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(loc); setFlyTo(loc); setIsLocating(false);
        toast({ title: "Location found!" });
      },
      () => { setIsLocating(false); toast({ title: "Could not get location", variant: "destructive" }); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [toast]);

  const handleDrawPoint = useCallback((latlng: [number, number]) => setDrawnPoints(prev => [...prev, latlng]), []);
  const handleUndoPoint = useCallback(() => setDrawnPoints(prev => prev.slice(0, -1)), []);

  const handleSavePolygon = () => {
    if (drawnPoints.length < 3) { toast({ title: "Need at least 3 points", variant: "destructive" }); return; }
    const area = calcArea(drawnPoints);
    const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
    setSavedPolygons(prev => [...prev, { id: `poly-${Date.now()}`, coords: [...drawnPoints], label: `Land Parcel ${prev.length + 1}`, area, color: colors[prev.length % colors.length] }]);
    setDrawnPoints([]); setDrawMode("none");
    toast({ title: "Land parcel saved!", description: `Area: ${area.toFixed(2)} ha` });
  };

  const handleExportGDB = () => {
    const geoJson = { type: "FeatureCollection", features: savedPolygons.map(p => ({ type: "Feature", properties: { id: p.id, label: p.label, area_ha: p.area.toFixed(2) }, geometry: { type: "Polygon", coordinates: [[...p.coords.map(c => [c[1], c[0]]), [p.coords[0][1], p.coords[0][0]]]] } })) };
    const blob = new Blob([JSON.stringify(geoJson, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "land-parcels.geojson"; a.click();
    toast({ title: "Exported GeoJSON / GDB format" });
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
            toast({ title: `Imported ${imported.length} parcels` });
          }
        } catch { toast({ title: "Invalid GeoJSON file", variant: "destructive" }); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const currentArea = drawnPoints.length >= 3 ? calcArea(drawnPoints) : 0;
  const LayerIcon = TILE_LAYERS[activeLayer].icon;

  const toggleGroup = (g: string) => setOpenGroup(prev => prev === g ? null : g);

  return (
    <div className="flex flex-col h-screen bg-background">
      <TopNavigation />

      {/* ── Toolbar ── */}
      <div ref={toolbarRef} className="flex items-center gap-1 lg:gap-1.5 px-1.5 lg:px-3 py-1 lg:py-1.5 bg-background/95 backdrop-blur-sm border-b border-border/50 flex-none z-[1001] relative overflow-x-auto no-scrollbar">

        {/* Layers dropdown */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => toggleGroup("layers")}
            className={`flex items-center gap-1 lg:gap-1.5 px-1.5 lg:px-3 py-1 lg:py-1.5 rounded-md lg:rounded-lg text-[10px] lg:text-xs whitespace-nowrap font-medium border transition-all ${openGroup === "layers" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted text-foreground"}`}
            data-testid="btn-group-layers"
          >
            <LayerIcon className="h-3.5 w-3.5" />
            <span>Layers</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${openGroup === "layers" ? "rotate-180" : ""}`} />
          </button>
          {openGroup === "layers" && (
            <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-xl shadow-xl z-[1002] p-1.5 min-w-[160px]">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1">Map Style</div>
              {(Object.keys(TILE_LAYERS) as Array<keyof typeof TILE_LAYERS>).map(key => {
                const layer = TILE_LAYERS[key];
                const Icon = layer.icon;
                return (
                  <button key={key} onClick={() => { setActiveLayer(key); setOpenGroup(null); }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all ${activeLayer === key ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground"}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {layer.label}
                    {activeLayer === key && <span className="ml-auto text-primary">✓</span>}
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
            className={`flex items-center gap-1 lg:gap-1.5 px-1.5 lg:px-3 py-1 lg:py-1.5 rounded-md lg:rounded-lg text-[10px] lg:text-xs whitespace-nowrap font-medium border transition-all ${openGroup === "overlays" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted text-foreground"}`}
            data-testid="btn-group-overlays"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Overlays</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${openGroup === "overlays" ? "rotate-180" : ""}`} />
          </button>
          {openGroup === "overlays" && (
            <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-xl shadow-xl z-[1002] p-1.5 min-w-[180px]">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1">Toggle Overlays</div>
              {[
                { label: "Farmers", state: showFarmers, set: setShowFarmers, color: "text-green-600", icon: Users },
                { label: "Demand Pins", state: showDemand, set: setShowDemand, color: "text-amber-600", icon: ShoppingBag },
                { label: "Heatmap", state: showHeatmap, set: setShowHeatmap, color: "text-red-500", icon: BarChart3 },
                { label: "Survey Layer", state: showSurveyLayer, set: setShowSurveyLayer, color: "text-purple-600", icon: FileText },
                { label: "Irrigation", state: showIrrigationLayer, set: setShowIrrigationLayer, color: "text-blue-500", icon: Droplets },
              ].map(({ label, state, set, color, icon: Icon }) => (
                <button key={label} onClick={() => set(v => !v)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all ${state ? "bg-muted font-medium" : "hover:bg-muted text-muted-foreground"}`}>
                  <Icon className={`h-3.5 w-3.5 ${state ? color : ""}`} />
                  <span className={state ? "text-foreground" : ""}>{label}</span>
                  <div className={`ml-auto w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${state ? "bg-primary border-primary" : "border-border"}`}>
                    {state && <span className="text-white text-[9px] font-bold">✓</span>}
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
            className={`flex items-center gap-1 lg:gap-1.5 px-1.5 lg:px-3 py-1 lg:py-1.5 rounded-md lg:rounded-lg text-[10px] lg:text-xs whitespace-nowrap font-medium border transition-all ${drawMode !== "none" ? "bg-green-600 text-white border-green-600" : openGroup === "drawing" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted text-foreground"}`}
            data-testid="btn-group-drawing"
          >
            <PenTool className="h-3.5 w-3.5" />
            <span>Drawing</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${openGroup === "drawing" ? "rotate-180" : ""}`} />
          </button>
          {openGroup === "drawing" && (
            <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-xl shadow-xl z-[1002] p-1.5 min-w-[180px]">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1">Land Parcel Tools</div>
              <button onClick={() => { setDrawMode(drawMode === "polygon" ? "none" : "polygon"); setDrawnPoints([]); setOpenGroup(null); }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all ${drawMode === "polygon" ? "bg-green-100 text-green-700 font-semibold dark:bg-green-900 dark:text-green-300" : "hover:bg-muted text-foreground"}`}>
                <PenTool className="h-3.5 w-3.5" />
                {drawMode === "polygon" ? "Stop Drawing" : "Draw Polygon"}
              </button>
              {drawMode !== "none" && (
                <>
                  <button onClick={() => { handleUndoPoint(); setOpenGroup(null); }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs hover:bg-muted text-foreground">
                    <span className="text-base leading-none">↩</span> Undo Last Point
                  </button>
                  <button onClick={() => { handleSavePolygon(); setOpenGroup(null); }} disabled={drawnPoints.length < 3}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs bg-primary/10 text-primary font-semibold disabled:opacity-40">
                    Save ({drawnPoints.length} pts)
                  </button>
                  <button onClick={() => { setDrawnPoints([]); setDrawMode("none"); setOpenGroup(null); }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-destructive hover:bg-red-50 dark:hover:bg-red-950">
                    <X className="h-3.5 w-3.5" /> Clear Drawing
                  </button>
                </>
              )}
              <div className="border-t border-border/40 my-1" />
              <button onClick={() => { handleExportGDB(); setOpenGroup(null); }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs hover:bg-muted text-muted-foreground">
                <Download className="h-3.5 w-3.5" /> Export GeoJSON
              </button>
              <button onClick={() => { handleImportGDB(); setOpenGroup(null); }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs hover:bg-muted text-muted-foreground">
                <Upload className="h-3.5 w-3.5" /> Import GeoJSON
              </button>
            </div>
          )}
        </div>

        {/* Locate */}
        <button
          onClick={handleLocate}
          disabled={isLocating}
          className="flex-shrink-0 flex items-center gap-1 lg:gap-1.5 px-1.5 lg:px-3 py-1 lg:py-1.5 rounded-md lg:rounded-lg text-[10px] lg:text-xs whitespace-nowrap border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700 font-medium transition-all"
          data-testid="btn-locate"
        >
          {isLocating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
          <span>My Location</span>
        </button>

        {/* Live stats */}
        <div className="ml-auto flex-shrink-0 flex items-center gap-1 lg:gap-2 text-[10px] lg:text-xs text-muted-foreground">
          <div className="flex-shrink-0 flex items-center gap-1 lg:gap-1.5 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md lg:rounded-lg px-1.5 lg:px-2.5 py-0.5 lg:py-1 whitespace-nowrap">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="font-semibold text-green-700 dark:text-green-300">{farmerMarkers.filter(f => f.isOnline).length}</span>
            <span className="text-green-600 dark:text-green-400">on</span>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1 bg-muted rounded-md lg:rounded-lg px-1.5 lg:px-2.5 py-0.5 lg:py-1 whitespace-nowrap">
            <span className="font-semibold text-foreground">{products.length}</span><span className="hidden lg:inline">products</span><span className="lg:hidden">prod</span>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1 bg-muted rounded-md lg:rounded-lg px-1.5 lg:px-2.5 py-0.5 lg:py-1 whitespace-nowrap">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-semibold text-foreground">{localNeeds.length}</span><span>need</span>
          </div>
        </div>
      </div>

      {/* ── Map + Right Panel ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Drawing mode hint */}
        {drawMode !== "none" && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-background/90 backdrop-blur-sm border border-border rounded-xl px-4 py-2 shadow-xl text-sm font-medium flex items-center gap-3">
            <PenTool className="h-4 w-4 text-primary animate-pulse" />
            <span>Click map to add points</span>
            {drawnPoints.length >= 3 && <Badge className="bg-primary/10 text-primary border-primary/20">{currentArea.toFixed(2)} ha</Badge>}
            <span className="text-xs text-muted-foreground">{drawnPoints.length} pts</span>
          </div>
        )}

        {/* MAP */}
        <div className="flex-1 relative" style={{ cursor: drawMode !== "none" ? "crosshair" : "grab" }}>
          <MapContainer center={[52.3, -1.0]} zoom={7} style={{ width: "100%", height: "100%" }} zoomControl={false} ref={mapRef as any} doubleClickZoom={false}>
            <TileLayer key={activeLayer} url={TILE_LAYERS[activeLayer].url} attribution={TILE_LAYERS[activeLayer].attribution} maxZoom={19} />
            <InvalidateSizeOnMount />
            <DrawController mode={drawMode} onPoint={handleDrawPoint} onUndo={handleUndoPoint} />
            <FlyToLocation location={flyTo} />
            <MapCenterTracker onChange={setMapCenter} />

            <div className="leaflet-top leaflet-right" style={{ zIndex: 1000 }}>
              <div className="leaflet-control flex flex-col gap-1 mr-3 mt-3">
                <button onClick={() => mapRef.current?.zoomIn()} className="w-8 h-8 bg-background border border-border rounded-lg shadow flex items-center justify-center hover:bg-muted"><ZoomIn className="h-4 w-4" /></button>
                <button onClick={() => mapRef.current?.zoomOut()} className="w-8 h-8 bg-background border border-border rounded-lg shadow flex items-center justify-center hover:bg-muted"><ZoomOut className="h-4 w-4" /></button>
              </div>
            </div>

            {userLocation && (
              <>
                <Marker position={userLocation} icon={userIcon}><Popup><strong>Your Location</strong></Popup></Marker>
                <Circle center={userLocation} radius={15000} pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.05, weight: 1, dashArray: "4" }} />
              </>
            )}

            {showFarmers && farmerMarkers.map(farmer => (
              <Marker key={farmer.id} position={[farmer.latitude, farmer.longitude]} icon={farmerIcon(farmer.isOnline)}>
                <Popup minWidth={220}>
                  <div className="p-1">
                    <div className="flex items-center gap-2 mb-2">
                      <img src={farmer.avatar} alt={farmer.name} className="w-8 h-8 rounded-full" />
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
                    <div className="text-xs text-gray-500">{farmer.products.slice(0, 3).join(", ")}{farmer.products.length > 3 ? ` +${farmer.products.length - 3} more` : ""}</div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {showHeatmap && farmerMarkers.map(farmer => {
              const intensity = Math.min(farmer.totalStock / 500, 1);
              const color = intensity > 0.6 ? "#22c55e" : intensity > 0.3 ? "#f59e0b" : "#ef4444";
              return <Circle key={`heat-${farmer.id}`} center={[farmer.latitude, farmer.longitude]} radius={3000 + farmer.totalStock * 5} pathOptions={{ color, fillColor: color, fillOpacity: 0.2, weight: 1 }} />;
            })}

            {showDemand && localNeeds.map(need => (
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
                    {need.description && <div className="text-xs text-gray-500 mt-1 border-t pt-1">{need.description}</div>}
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

          {/* Map legend — tiny */}
          <div className="absolute bottom-2 left-2 z-[1000] bg-background/90 backdrop-blur-sm border border-border rounded-md lg:rounded-xl px-1.5 py-1 lg:p-3 shadow-md text-[8px] lg:text-xs space-y-0.5 lg:space-y-1.5">
            <div className="font-semibold text-[7px] lg:text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5 lg:mb-1">Legend</div>
            {showFarmers && <div className="flex items-center gap-1 lg:gap-2"><div className="w-1.5 h-1.5 lg:w-3 lg:h-3 rounded-full bg-green-500" /><span>Online</span></div>}
            {showFarmers && <div className="flex items-center gap-1 lg:gap-2"><div className="w-1.5 h-1.5 lg:w-3 lg:h-3 rounded-full bg-gray-400" /><span>Offline</span></div>}
            {showDemand && <div className="flex items-center gap-1 lg:gap-2"><div className="w-1.5 h-1.5 lg:w-3 lg:h-3 rounded-full bg-red-500" /><span>High Need</span></div>}
            {showDemand && <div className="flex items-center gap-1 lg:gap-2"><div className="w-1.5 h-1.5 lg:w-3 lg:h-3 rounded-full bg-amber-500" /><span>Med Need</span></div>}
            {showHeatmap && <div className="flex items-center gap-1 lg:gap-2"><div className="w-1.5 h-1.5 lg:w-3 lg:h-3 rounded-full bg-green-400 opacity-60" /><span>Heatmap</span></div>}
            {showSurveyLayer && <div className="flex items-center gap-1 lg:gap-2"><div className="w-1.5 h-1.5 lg:w-3 lg:h-3 rounded bg-purple-500 opacity-50" /><span>Survey</span></div>}
            {showIrrigationLayer && <div className="flex items-center gap-1 lg:gap-2"><div className="w-1.5 h-1.5 lg:w-3 lg:h-3 rounded bg-blue-400 opacity-50" /><span>Irrigation</span></div>}
            {savedPolygons.length > 0 && <div className="flex items-center gap-1 lg:gap-2"><div className="w-1.5 h-1.5 lg:w-3 lg:h-3 rounded bg-primary opacity-50" /><span>Parcel</span></div>}
          </div>
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
          <div className="flex flex-col gap-0.5 lg:gap-1 p-0.5 lg:p-1.5 bg-background border-l border-border z-[500] flex-shrink-0">
            {RIGHT_PANEL_TABS.map(tab => {
              const Icon = tab.icon;
              const active = rightPanel === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setRightPanel(tab.id)}
                  title={tab.label}
                  className={`flex flex-col items-center gap-0.5 w-8 lg:w-12 py-1 lg:py-2.5 rounded-md lg:rounded-xl text-[7px] lg:text-[9px] font-semibold transition-all ${active ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted text-muted-foreground"}`}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className={`h-3 w-3 lg:h-4 lg:w-4 ${active ? "" : tab.color}`} />
                  <span className="leading-tight text-center w-full lg:hidden">{tab.shortLabel}</span>
                  <span className="leading-tight text-center hidden lg:block" style={{ maxWidth: 44 }}>{tab.label.split(" ").map((w, i) => <span key={i} className="block">{w}</span>)}</span>
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
            {/* ── FARMERS panel ── */}
            {rightPanel === "farmers" && (
              <div className="flex flex-col h-full">
                <div className="p-2 lg:p-4 border-b border-border/50 flex-shrink-0">
                  <h2 className="font-bold text-xs lg:text-base flex items-center gap-1.5 lg:gap-2">
                    <Users className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-green-600" />
                    Farmers & Products
                  </h2>
                  <p className="text-[10px] lg:text-xs text-muted-foreground mt-0.5">{farmerMarkers.filter(f => f.isOnline).length} online · {farmerMarkers.length} total · sorted by distance{userLocation ? " from you" : " from map view"}</p>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-1.5 lg:p-3 space-y-1.5 lg:space-y-2">
                    {sortedFarmerMarkers.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Loading farmers...</p>
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
                                  <img
                                    src={getProductImage(product.name, product.categoryId)}
                                    alt={product.name}
                                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                                    onError={e => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1518977676405-d4e4e7c23d14?w=64&q=75`; }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium truncate">{product.name}</div>
                                    <div className="text-[10px] text-muted-foreground">£{product.price}/{product.unit} · {product.stock} in stock</div>
                                  </div>
                                  {product.isFree && <Badge className="text-[9px] bg-green-100 text-green-700 border-none">Free</Badge>}
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
                    Available Food with Farmers
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{products.length} products from {farmerMarkers.length} local farmers</p>
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
                              <button
                                key={product.id}
                                className="flex items-center gap-2 p-2 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/40 transition-all text-left"
                                onClick={() => { if (mapRef.current) mapRef.current.flyTo([product.farmerLatitude, product.farmerLongitude], 12, { duration: 1 }); }}
                                data-testid={`food-product-${product.id}`}
                              >
                                <img
                                  src={getProductImage(product.name, product.categoryId)}
                                  alt={product.name}
                                  className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                                  onError={e => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1518977676405-d4e4e7c23d14?w=64&q=75`; }}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-[11px] font-medium truncate leading-tight">{product.name}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {product.isFree ? <span className="text-green-600 font-semibold">Free</span> : `£${product.price}/${product.unit}`}
                                  </div>
                                  <div className="text-[9px] text-muted-foreground truncate">{product.farmerName}</div>
                                </div>
                              </button>
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
                <div className="p-4 border-b border-border/50 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="font-bold text-base flex items-center gap-2">
                        <Radio className="h-4 w-4 text-red-500 animate-pulse" />
                        Live Local Needs
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Real-time buyer demand in your area</p>
                    </div>
                    <Button size="sm" className="text-xs h-7" onClick={() => setRightPanel("post")}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Post
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input placeholder="Search needs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-7 h-8 text-xs" />
                    </div>
                    <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                      <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="high">🔴 High</SelectItem>
                        <SelectItem value="medium">🟡 Medium</SelectItem>
                        <SelectItem value="low">🟢 Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-2">
                    {filteredNeeds.map((need, idx) => (
                      <motion.div key={need.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}>
                        <Card className={`border ${need.urgency === "high" ? "border-red-200 dark:border-red-900" : need.urgency === "medium" ? "border-amber-200 dark:border-amber-900" : "border-green-200 dark:border-green-900"} hover:shadow-md transition-all cursor-pointer`}
                          onClick={() => { setFlyTo([need.latitude, need.longitude]); mapRef.current?.flyTo([need.latitude, need.longitude], 12, { duration: 1 }); }}>
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{BUYER_ICONS[need.buyerType]}</span>
                                <div>
                                  <div className="font-semibold text-sm leading-tight">{need.productName}</div>
                                  <div className="text-xs text-muted-foreground">{need.buyerName}</div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-0.5">
                                <Badge className={`text-[10px] px-1.5 py-0.5 capitalize ${URGENCY_COLORS[need.urgency]}`}>{need.urgency}</Badge>
                                <span className="text-[9px] text-muted-foreground whitespace-nowrap">{need._distanceKm < 1 ? `${Math.round(need._distanceKm * 1000)} m` : `${need._distanceKm.toFixed(1)} km`}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                              <span>📦 {need.quantity} {need.unit}</span>
                              <span>💰 {need.priceRange}</span>
                              <span className="col-span-2">📍 {need.location}</span>
                              {need.deadline && <span className="col-span-2">⏰ By {need.deadline}</span>}
                            </div>
                            {need.description && <p className="text-xs text-muted-foreground border-t border-border/40 pt-1.5 line-clamp-2">{need.description}</p>}
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{need.timePosted}</span>
                              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={(e) => { e.stopPropagation(); toast({ title: `Contact sent to ${need.buyerName}!` }); }}>Contact</Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                    {filteredNeeds.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No needs match your filters</p>
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
                    <h2 className="font-bold text-base">Post a Need</h2>
                    <p className="text-xs text-muted-foreground">Let farmers know what you need</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setRightPanel("needs")}>
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />Back
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Product Name *</Label>
                      <Input placeholder="e.g. Organic Tomatoes" value={postForm.productName} onChange={e => setPostForm(p => ({ ...p, productName: e.target.value }))} className="h-9 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label className="text-xs">Quantity *</Label>
                        <Input type="number" placeholder="100" value={postForm.quantity} onChange={e => setPostForm(p => ({ ...p, quantity: e.target.value }))} className="h-9 text-sm" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Unit</Label>
                        <Select value={postForm.unit} onValueChange={v => setPostForm(p => ({ ...p, unit: v }))}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["kg", "liter", "units", "bundle", "bag", "dozen"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Price Range</Label>
                      <Input placeholder="e.g. £1.50-2.00/kg" value={postForm.priceRange} onChange={e => setPostForm(p => ({ ...p, priceRange: e.target.value }))} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Address Line</Label>
                      <Input placeholder="e.g. 14 High Street (optional)" value={postForm.addressLine} onChange={e => setPostForm(p => ({ ...p, addressLine: e.target.value }))} className="h-9 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label className="text-xs">City / Town *</Label>
                        <Input placeholder="e.g. Bristol" value={postForm.city} onChange={e => {
                          const city = e.target.value;
                          const loc = [postForm.addressLine, city, postForm.postcode].filter(Boolean).join(", ");
                          setPostForm(p => ({ ...p, city, location: loc || city }));
                        }} className="h-9 text-sm" data-testid="input-city" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Postcode</Label>
                        <Input placeholder="e.g. BS1 1AA" value={postForm.postcode} onChange={e => {
                          const postcode = e.target.value;
                          const loc = [postForm.addressLine, postForm.city, postcode].filter(Boolean).join(", ");
                          setPostForm(p => ({ ...p, postcode, location: loc || postForm.city }));
                        }} className="h-9 text-sm" data-testid="input-postcode" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label className="text-xs">Urgency</Label>
                        <Select value={postForm.urgency} onValueChange={v => setPostForm(p => ({ ...p, urgency: v as any }))}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">🔴 High</SelectItem>
                            <SelectItem value="medium">🟡 Medium</SelectItem>
                            <SelectItem value="low">🟢 Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Buyer Type</Label>
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
                      <Label className="text-xs">Deadline</Label>
                      <Input type="date" value={postForm.deadline} onChange={e => setPostForm(p => ({ ...p, deadline: e.target.value }))} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Description</Label>
                      <Textarea placeholder="Additional requirements, quality specs, delivery info..." value={postForm.description} onChange={e => setPostForm(p => ({ ...p, description: e.target.value }))} className="text-sm resize-none" rows={3} />
                    </div>
                    <Button className="w-full" onClick={() => postNeedMutation.mutate(postForm)}
                      disabled={!postForm.productName || !postForm.quantity || !postForm.city || postNeedMutation.isPending}>
                      {postNeedMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                      Post to Live Feed
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
                    <h2 className="font-bold text-base">My Land Parcels</h2>
                    <p className="text-xs text-muted-foreground">{savedPolygons.length} parcel{savedPolygons.length !== 1 ? "s" : ""} saved</p>
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
