import "leaflet/dist/leaflet.css";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Star, Package, MapPin, Wifi, Map, Mountain, Globe,
  Satellite, Navigation, Plus, X, Users, ShoppingBag,
  BarChart3, Flame, Clock, Phone, CheckCircle2, AlertCircle,
  Locate, AlertTriangle
} from "lucide-react";
import { getProductImage } from "@/lib/product-images";
import { isSellerOnline } from "@/lib/seller-presence";
import { getPublicLocationLabel, hasValidPublicCoordinates } from "@/lib/public-map-location";
import type { Product, LocalNeed } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const TILE_LAYERS = {
  standard: { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "© OpenStreetMap", icon: Map },
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "© Esri", icon: Satellite },
  terrain: { url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", attribution: "© OpenTopoMap", icon: Mountain },
  hybrid: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", attribution: "© Esri", icon: Globe },
} as const;

type LayerKey = keyof typeof TILE_LAYERS;

interface FarmerMarker {
  id: string; name: string; avatar: string;
  latitude: number; longitude: number;
  isOnline: boolean; productCount: number; rating: number;
  products: string[]; location: string; totalStock: number;
  topProduct?: Product;
}

export interface LeafletFarmerMapProps {
  products: Product[];
  onFarmerClick?: (farmerId: string) => void;
  height?: string;
  showControls?: boolean;
  initialZoom?: number;
  center?: [number, number];
  tileStyle?: LayerKey;
  showLayerSwitcher?: boolean;
  showHeatmap?: boolean;
  mapOverlays?: { farmers?: boolean; needs?: boolean; heatmap?: boolean };
  /** When set, the map flies to this farmer and opens their popup. Used to
   *  sync external selection (e.g. clicking a row in the seller list) with
   *  the map view. */
  selectedFarmerId?: string | null;
}

const makeFarmerIcon = (isOnline: boolean, selected: boolean = false) => L.divIcon({
  html: `<div style="width:${selected ? 32 : 22}px;height:${selected ? 32 : 22}px;border-radius:50%;background:${isOnline ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#9ca3af,#6b7280)"};border:${selected ? 2.5 : 2}px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3),0 0 0 ${selected ? 4 : 2}px ${selected ? "rgba(59,130,246,0.45)" : isOnline ? "rgba(34,197,94,0.2)" : "rgba(156,163,175,0.2)"}${selected ? ",0 0 14px rgba(59,130,246,0.6)" : ""};display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;${selected ? "animation:selectedPulse 1.6s ease-out infinite;" : ""}"><svg width="${selected ? 14 : 10}" height="${selected ? 14 : 10}" viewBox="0 0 24 24" fill="white"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${isOnline ? `<div style="position:absolute;top:-1px;right:-1px;width:${selected ? 8 : 7}px;height:${selected ? 8 : 7}px;border-radius:50%;background:#22c55e;border:1.5px solid white;"></div>` : ""}</div><style>@keyframes selectedPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}</style>`,
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 22],
  popupAnchor: [0, -24],
});

const makeNeedIcon = (urgency: string) => {
  const colors = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };
  const color = colors[urgency as keyof typeof colors] || "#6b7280";
  return L.divIcon({
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;position:relative;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>${urgency === "high" ? '<div style="position:absolute;top:-2px;right:-2px;width:7px;height:7px;border-radius:50%;background:#ef4444;border:1.5px solid white;animation:pulse 1.5s infinite;"></div>' : ""}</div>`,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 20],
    popupAnchor: [0, -22],
  });
};

const makeUserLocationIcon = (heading?: number | null) => L.divIcon({
  html: `
    <div style="position:relative;width:20px;height:20px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.2);animation:userPulse 2s ease-out infinite;"></div>
      <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:11px;height:11px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>
      ${heading != null ? `<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-100%) rotate(${heading}deg);transform-origin:50% 100%;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:10px solid #3b82f6;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));"></div>` : ""}
    </div>
    <style>@keyframes userPulse{0%{transform:scale(0.8);opacity:1}100%{transform:scale(2.4);opacity:0}}</style>
  `,
  className: "",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const distanceKm = (from: [number, number], to: [number, number]) => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(to[0] - from[0]);
  const longitudeDelta = toRadians(to[1] - from[1]);
  const value = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from[0])) * Math.cos(toRadians(to[0])) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(value)));
};

function MapController({ flyTo }: { flyTo: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (flyTo) map.flyTo(flyTo, 14, { animate: true, duration: 1.5 });
  }, [flyTo, map]);
  return null;
}

function SelectedFarmerController({
  selectedId,
  lat,
  lng,
  markerRefs,
}: {
  selectedId: string | null;
  lat: number | null;
  lng: number | null;
  markerRefs: React.MutableRefObject<Record<string, L.Marker | null>>;
}) {
  const map = useMap();
  const lastIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedId || lat == null || lng == null) {
      lastIdRef.current = null;
      return;
    }
    if (lastIdRef.current === selectedId) return;
    lastIdRef.current = selectedId;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 11), { animate: true, duration: 1.2 });
    const t = setTimeout(() => {
      const m = markerRefs.current[selectedId];
      if (m && !m.isPopupOpen()) m.openPopup();
    }, 650);
    return () => clearTimeout(t);
  }, [selectedId, lat, lng, map, markerRefs]);
  return null;
}

function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    const t3 = setTimeout(() => map.invalidateSize(), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [map]);
  return null;
}

export function LeafletFarmerMap({
  products, onFarmerClick,
  height = "100%",
  showControls = true,
  initialZoom = 7,
  center = [52.3, -1.0],
  tileStyle = "standard",
  showLayerSwitcher = true,
  mapOverlays,
  selectedFarmerId,
}: LeafletFarmerMapProps) {
  const { t } = useTranslation();
  const markersRef = useRef<Record<string, L.Marker>>({});
  const [activeLayer, setActiveLayer] = useState<LayerKey>(tileStyle);
  const layerLabel = (key: LayerKey) => t(`map.layer_${key}`);
  const [_showFarmers, _setShowFarmers] = useState(true);
  const [_showNeeds, _setShowNeeds] = useState(true);
  const [_showHeatmap, _setShowHeatmap] = useState(false);
  const showFarmers = mapOverlays !== undefined ? (mapOverlays.farmers ?? true) : _showFarmers;
  const showNeeds = mapOverlays !== undefined ? (mapOverlays.needs ?? false) : _showNeeds;
  const showHeatmap = mapOverlays !== undefined ? (mapOverlays.heatmap ?? false) : _showHeatmap;
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [userAccuracy, setUserAccuracy] = useState<number | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(null);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [postPanel, setPostPanel] = useState(false);
  const [form, setForm] = useState({ productName: "", quantity: "", unit: "kg", priceRange: "", addressLine: "", city: "Chelmsford", postcode: "", location: "Chelmsford", urgency: "medium" as "high" | "medium" | "low", buyerType: "individual" as any, buyerName: "", description: "" });
  const [postSuccess, setPostSuccess] = useState<LocalNeed | null>(null);

  const { data: localNeeds = [], refetch } = useQuery<LocalNeed[]>({
    queryKey: ["/api/local-needs"],
  });

  const postNeed = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/local-needs", data),
    onSuccess: async (res) => {
      const created = await res.json();
      setPostSuccess(created);
      setPostPanel(false);
      setForm({ productName: "", quantity: "", unit: "kg", priceRange: "", addressLine: "", city: "Chelmsford", postcode: "", location: "Chelmsford", urgency: "medium", buyerType: "individual", buyerName: "", description: "" });
      refetch();
      if (created.latitude && created.longitude) setFlyTo([created.latitude, created.longitude]);
      setTimeout(() => setPostSuccess(null), 5000);
    },
  });

  // Stop any active geolocation watcher.
  const stopTracking = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    setLocating(false);
  };

  // Toggle Google-Maps-style continuous live tracking. First press requests
  // permission + flies to current location and starts watchPosition; second
  // press stops tracking. Accuracy circle + pulsing dot + heading arrow are
  // updated on every position event.
  const handleLocate = () => {
    if (!("geolocation" in navigator)) {
      setLocateError(t("map.geolocation_not_supported"));
      return;
    }
    if (tracking) {
      stopTracking();
      return;
    }
    setLocateError(null);
    setLocating(true);
    let firstFix = true;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(latlng);
        setUserAccuracy(pos.coords.accuracy ?? null);
        setUserHeading(typeof pos.coords.heading === "number" && !isNaN(pos.coords.heading) ? pos.coords.heading : null);
        setLocating(false);
        setTracking(true);
        if (firstFix) {
          setFlyTo(latlng);
          firstFix = false;
        }
      },
      (err) => {
        setLocating(false);
        setTracking(false);
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? t("map.location_permission_denied")
            : err.code === err.POSITION_UNAVAILABLE
              ? t("map.location_unavailable")
              : t("map.location_get_failed")
        );
        if (watchIdRef.current != null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 }
    );
    watchIdRef.current = id;
  };

  // Clean up the geolocation watcher when the map unmounts.
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // Auto-clear the error message after 5s.
  useEffect(() => {
    if (!locateError) return;
    const t = setTimeout(() => setLocateError(null), 5000);
    return () => clearTimeout(t);
  }, [locateError]);

  const farmerMarkers: FarmerMarker[] = products.reduce((acc, product) => {
    if (!hasValidPublicCoordinates(product.farmerLatitude, product.farmerLongitude)) return acc;
    const existing = acc.find(m => m.id === product.farmerId);
    if (existing) {
      if (!existing.products.includes(product.name)) {
        existing.products.push(product.name);
        existing.productCount++;
        existing.totalStock += product.stock;
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
        topProduct: product,
      });
    }
    return acc;
  }, [] as FarmerMarker[]);

  const unmappedFarmerCount = new Set(products.map((product) => product.farmerId))
    .size - farmerMarkers.length;
  const visibleFarmerMarkers = nearbyOnly && userPos
    ? farmerMarkers.filter((farmer) => distanceKm(userPos, [farmer.latitude, farmer.longitude]) <= 50)
    : farmerMarkers;
  const onlineFarmers = visibleFarmerMarkers.filter(f => f.isOnline).length;
  const currentTile = TILE_LAYERS[activeLayer];

  return (
    <div style={{ width: "100%", height }} className="relative select-none">

      {/* ── TOP TOOLBAR OVERLAY ── */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-[1000] flex items-center gap-1.5 flex-wrap pointer-events-none">

        {/* Layer switcher */}
        {showLayerSwitcher && (
          <div className="flex gap-0.5 bg-background/96 backdrop-blur-md border border-border/60 rounded-xl p-0.5 shadow-lg pointer-events-auto">
            {(Object.entries(TILE_LAYERS) as [LayerKey, typeof TILE_LAYERS[LayerKey]][]).map(([key, layer]) => {
              const Icon = layer.icon;
              return (
                <button key={key} onClick={() => setActiveLayer(key)} data-testid={`map-layer-${key}`}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wide transition-all ${activeLayer === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{layerLabel(key)}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1 pointer-events-none" />

        {/* Overlay toggles — hidden when externally controlled */}
        <div className={`flex gap-1 pointer-events-auto ${mapOverlays !== undefined ? "hidden" : ""}`}>
          <button onClick={() => _setShowFarmers(v => !v)} data-testid="toggle-farmers"
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-[9px] font-bold border shadow-sm transition-all backdrop-blur-md ${showFarmers ? "bg-green-100 border-green-300 text-green-700 dark:bg-green-900/60 dark:border-green-600 dark:text-green-300" : "bg-background/90 border-border/60 text-muted-foreground"}`}>
            <Users className="h-3 w-3" />
            <span className="hidden sm:inline">{t("map.tab_farmers")}</span>
          </button>
          <button onClick={() => _setShowNeeds(v => !v)} data-testid="toggle-needs"
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-[9px] font-bold border shadow-sm transition-all backdrop-blur-md ${showNeeds ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/60 dark:border-amber-600 dark:text-amber-300" : "bg-background/90 border-border/60 text-muted-foreground"}`}>
            <ShoppingBag className="h-3 w-3" />
            <span className="hidden sm:inline">{t("map.needs_label")} ({localNeeds.length})</span>
          </button>
          <button onClick={() => _setShowHeatmap(v => !v)} data-testid="toggle-heatmap"
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-[9px] font-bold border shadow-sm transition-all backdrop-blur-md ${showHeatmap ? "bg-red-100 border-red-300 text-red-700 dark:bg-red-900/60 dark:border-red-600 dark:text-red-300" : "bg-background/90 border-border/60 text-muted-foreground"}`}>
            <BarChart3 className="h-3 w-3" />
            <span className="hidden sm:inline">{t("map.heatmap_legend")}</span>
          </button>
        </div>
      </div>

      {/* Geolocation error toast */}
      {locateError && (
        <div
          className="absolute top-14 left-1/2 -translate-x-1/2 z-[1100] bg-red-50 dark:bg-red-950/90 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 px-3 py-1.5 rounded-lg shadow-lg text-[11px] font-medium flex items-center gap-1.5 max-w-[90%]"
          data-testid="toast-locate-error"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{locateError}</span>
        </div>
      )}

      {/* ── RIGHT SIDE BUTTONS ── */}
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-1.5">
        {/* Locate me / Live tracking toggle (Google-Maps-style) */}
        <button
          onClick={handleLocate}
          data-testid="btn-locate-me"
          className={`w-9 h-9 flex items-center justify-center rounded-xl backdrop-blur-md border shadow-md transition-all relative ${
            tracking
              ? "bg-blue-500 text-white border-blue-400 hover:bg-blue-600"
              : "bg-background/95 border-border/60 hover:bg-primary hover:text-primary-foreground hover:border-primary"
          }`}
          title={tracking ? t("map.stop_tracking") : t("map.track_location")}
        >
          {locating ? (
            <Navigation className="h-4 w-4 animate-spin text-blue-500" />
          ) : (
            <Locate className="h-4 w-4" />
          )}
          {tracking && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 ring-2 ring-background" />
            </span>
          )}
        </button>
        <button
          onClick={() => setNearbyOnly((current) => !current)}
          disabled={!userPos}
          data-testid="btn-located-filter"
          className={`w-9 h-9 flex items-center justify-center rounded-xl backdrop-blur-md border shadow-md transition-all ${
            nearbyOnly ? "bg-blue-500 text-white border-blue-400" : "bg-background/95 border-border/60 hover:bg-primary hover:text-primary-foreground hover:border-primary"
          } disabled:cursor-not-allowed disabled:opacity-50`}
          title={userPos ? "Show public farm markers within 50 km" : "Locate yourself to filter nearby public farm markers"}
        >
          <MapPin className="h-4 w-4" />
        </button>
        {/* Post a Need */}
        <button onClick={() => setPostPanel(true)} data-testid="btn-post-need"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-primary-foreground border border-primary/50 shadow-md hover:bg-primary/90 transition-all"
          title={t("map.post_a_need")}>
          <Plus className="h-4 w-4" />
        </button>
        {/* Zoom to Chelmsford */}
        <button onClick={() => setFlyTo([51.7356, 0.4685])} data-testid="btn-chelmsford"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-background/95 backdrop-blur-md border border-border/60 shadow-md hover:bg-amber-50 hover:border-amber-300 transition-all"
          title="Fly to Chelmsford">
          <MapPin className="h-3.5 w-3.5 text-amber-600" />
        </button>
      </div>

      {/* ── MAP ── */}
      <MapContainer center={center} zoom={initialZoom} style={{ width: "100%", height: "100%" }} zoomControl={false} attributionControl={false}>
        <TileLayer key={activeLayer} url={currentTile.url} attribution={currentTile.attribution} maxZoom={19} />
        <MapController flyTo={flyTo} />
        <InvalidateSizeOnMount />
        {(() => {
          const selF = selectedFarmerId ? farmerMarkers.find((m) => m.id === selectedFarmerId) : null;
          return (
            <SelectedFarmerController
              selectedId={selectedFarmerId ?? null}
              lat={selF?.latitude ?? null}
              lng={selF?.longitude ?? null}
              markerRefs={markersRef}
            />
          );
        })()}

        {/* Heatmap circles */}
        {showHeatmap && visibleFarmerMarkers.map(f => (
          <Circle key={`heat-${f.id}`} center={[f.latitude, f.longitude]} radius={f.totalStock * 10}
            pathOptions={{ color: f.totalStock > 150 ? "#22c55e" : f.totalStock > 80 ? "#f59e0b" : "#ef4444", fillColor: f.totalStock > 150 ? "#22c55e" : f.totalStock > 80 ? "#f59e0b" : "#ef4444", fillOpacity: 0.12, weight: 1.5, opacity: 0.45 }} />
        ))}

        {/* Farmer markers */}
        {showFarmers && visibleFarmerMarkers.map(farmer => (
          <Marker
            key={farmer.id}
            position={[farmer.latitude, farmer.longitude]}
            icon={makeFarmerIcon(farmer.isOnline, farmer.id === selectedFarmerId)}
            ref={(ref) => {
              if (ref) markersRef.current[farmer.id] = ref;
              else delete markersRef.current[farmer.id];
            }}
          >
            <Popup minWidth={240} maxWidth={280}>
              <div className="p-0.5">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="relative">
                    {farmer.avatar ? (
                      <img src={farmer.avatar} alt={farmer.name} className="w-10 h-10 rounded-full border-2 border-primary/20" />
                    ) : (
                      <div className="w-10 h-10 rounded-full border-2 border-primary/20 bg-muted flex items-center justify-center text-xs font-bold">{farmer.name.slice(0, 1).toUpperCase()}</div>
                    )}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${farmer.isOnline ? "bg-green-500" : "bg-gray-400"}`} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">{farmer.name}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />{farmer.location}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-semibold">{farmer.rating.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">· {farmer.productCount} {t("map.products_short")}</span>
                    </div>
                  </div>
                </div>
                {farmer.topProduct && (
                  <div className="mb-2 rounded-lg overflow-hidden border bg-muted/20">
                    <img src={getProductImage(farmer.topProduct.name, farmer.topProduct.categoryId, "sm")} alt={farmer.topProduct.name} className="w-full h-16 object-cover" />
                    <div className="px-2 py-1 flex items-center justify-between">
                      <span className="text-[11px] font-medium truncate">{farmer.topProduct.name}</span>
                      <Badge className="text-[9px] bg-primary/10 text-primary border-none">£{farmer.topProduct.price}/{farmer.topProduct.unit}</Badge>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-1 mb-2">
                  {farmer.products.slice(0, 3).map((p, i) => (
                    <span key={i} className="text-[9px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{p.length > 14 ? p.slice(0, 14) + "…" : p}</span>
                  ))}
                  {farmer.products.length > 3 && <span className="text-[9px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{t("map.more_products", { count: farmer.products.length - 3 })}</span>}
                </div>
                <div className="flex gap-1.5 text-xs text-muted-foreground mb-2">
                  <Package className="h-3.5 w-3.5" />
                  <span>{farmer.totalStock} units</span>
                  <span>·</span>
                  <Wifi className={`h-3.5 w-3.5 ${farmer.isOnline ? "text-green-500" : ""}`} />
                  <span className={farmer.isOnline ? "text-green-600 font-medium" : ""}>{farmer.isOnline ? t("map.online_status") : t("map.offline_status")}</span>
                </div>
                <button onClick={() => onFarmerClick?.(farmer.id)}
                  className="w-full bg-primary text-primary-foreground text-xs font-bold py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
                  {t("map.view_all_products")}
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Demand/Need markers */}
        {showNeeds && localNeeds.map(need => (
          <Marker key={need.id} position={[need.latitude, need.longitude]} icon={makeNeedIcon(need.urgency)}>
            <Popup minWidth={230} maxWidth={270}>
              <div className="p-0.5">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${need.urgency === "high" ? "bg-red-100 text-red-600" : need.urgency === "medium" ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"}`}>
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{need.productName}</div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />{need.location}
                    </div>
                  </div>
                  <Badge className={`text-[9px] uppercase font-bold border-none ${need.urgency === "high" ? "bg-red-100 text-red-700" : need.urgency === "medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                    {need.urgency}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-1 mb-2 text-[10px]">
                  <div className="bg-muted/40 rounded-md p-1.5"><span className="text-muted-foreground">Qty:</span> <span className="font-semibold">{need.quantity} {need.unit}</span></div>
                  <div className="bg-muted/40 rounded-md p-1.5"><span className="text-muted-foreground">Price:</span> <span className="font-semibold text-primary">{need.priceRange}</span></div>
                  <div className="bg-muted/40 rounded-md p-1.5 col-span-2"><span className="text-muted-foreground">Buyer:</span> <span className="font-semibold">{need.buyerName}</span></div>
                </div>
                {need.description && <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">{need.description}</p>}
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-2">
                  <Clock className="h-3 w-3" />{need.timePosted}
                  {need.deadline && <><span className="mx-1">·</span><AlertTriangle className="h-3 w-3 text-amber-500" />Due {need.deadline}</>}
                </div>
                <a
                  href="/map"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Phone className="h-3 w-3" /> {t("map.respond_to_need")}
                </a>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* User location: GPS accuracy halo + pulsing dot */}
        {userPos && userAccuracy && userAccuracy < 5000 && (
          <Circle
            center={userPos}
            radius={userAccuracy}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.12,
              weight: 1,
              opacity: 0.5,
            }}
          />
        )}
        {userPos && (
          <Marker position={userPos} icon={makeUserLocationIcon(userHeading)}>
            <Popup>
              <div className="text-xs font-bold flex items-center gap-1.5 mb-1">
                <Locate className="h-3.5 w-3.5 text-blue-500" />
                {t("map.your_current_location")}
              </div>
              {userAccuracy && (
                <div className="text-[10px] text-muted-foreground">
                  {t("map.accuracy", { value: Math.round(userAccuracy) })}
                </div>
              )}
              {tracking && (
                <div className="text-[10px] text-green-600 font-semibold flex items-center gap-1 mt-0.5">
                  <span className="relative inline-flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                  </span>
                  {t("map.tracking_live")}
                </div>
              )}
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* ── BOTTOM STATUS BAR ── */}
      {showControls && (
        <div className="absolute bottom-2.5 left-2.5 z-[1000] flex items-center gap-1.5">
          <div className="bg-background/95 backdrop-blur-md border border-border/60 rounded-xl px-2.5 py-1.5 shadow-md text-[10px] flex items-center gap-2">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="font-bold text-green-700 dark:text-green-400">{onlineFarmers}</span><span className="text-muted-foreground">{t("map.online_status")}</span></div>
            <span className="text-border/80">·</span>
            <div className="flex items-center gap-1"><ShoppingBag className="h-3 w-3 text-amber-500" /><span className="font-bold text-amber-600 dark:text-amber-400">{localNeeds.length}</span><span className="text-muted-foreground">{t("map.needs_label")}</span></div>
          </div>
        </div>
      )}

      {unmappedFarmerCount > 0 && (
        <div className="absolute bottom-2.5 left-2.5 z-[1000] translate-y-10 sm:translate-y-0 sm:left-auto sm:right-2.5 sm:bottom-12 max-w-[230px] rounded-lg border border-border/60 bg-background/95 px-2 py-1.5 text-[10px] text-muted-foreground shadow-md" data-testid="map-location-fallback">
          {unmappedFarmerCount} seller {unmappedFarmerCount === 1 ? "location is" : "locations are"} not mapped because public coordinates are unavailable. Location not specified.
        </div>
      )}

      {/* Active layer badge — hidden on mobile */}
      <div className="absolute bottom-2.5 right-2.5 z-[1000] hidden sm:block">
        <div className="bg-background/95 backdrop-blur-md border border-border/60 rounded-xl px-2 py-1.5 shadow-md flex items-center gap-1.5">
          {(() => { const Icon = TILE_LAYERS[activeLayer].icon; return <Icon className="h-3 w-3 text-primary" />; })()}
          <span className="text-[9px] font-bold text-primary uppercase tracking-wide">{layerLabel(activeLayer)}</span>
        </div>
      </div>

      {/* ── POST A NEED PANEL ── */}
      {postPanel && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-2xl shadow-2xl p-5 w-[320px] max-h-[85%] overflow-y-auto mx-3">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-foreground">{t("map.post_a_need")}</h3>
                <p className="text-[10px] text-muted-foreground">{t("map.post_need_desc")}</p>
              </div>
              <button onClick={() => setPostPanel(false)} className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">{t("map.product_needed")}</label>
                <input
                  value={form.productName}
                  onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
                  placeholder={t("map.product_needed_placeholder")}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:border-primary"
                  data-testid="input-product-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">{t("map.quantity")}</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    placeholder="100"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:border-primary"
                    data-testid="input-quantity"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">{t("map.unit")}</label>
                  <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:border-primary">
                    {["kg", "liter", "units", "bunch", "box", "tonne"].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">{t("map.address_line")}</label>
                <input
                  value={form.addressLine}
                  onChange={e => setForm(f => ({ ...f, addressLine: e.target.value }))}
                  placeholder={t("map.address_placeholder")}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:border-primary"
                  data-testid="input-address-line"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">{t("map.city_town")}</label>
                  <input
                    value={form.city}
                    onChange={e => {
                      const city = e.target.value;
                      const loc = [form.addressLine, city, form.postcode].filter(Boolean).join(", ");
                      setForm(f => ({ ...f, city, location: loc || city }));
                    }}
                    placeholder={t("map.city_placeholder")}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:border-primary"
                    data-testid="input-city"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">{t("map.postcode")}</label>
                  <input
                    value={form.postcode}
                    onChange={e => {
                      const postcode = e.target.value;
                      const loc = [form.addressLine, form.city, postcode].filter(Boolean).join(", ");
                      setForm(f => ({ ...f, postcode, location: loc || form.city }));
                    }}
                    placeholder="CM1 1AA"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:border-primary"
                    data-testid="input-postcode"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">{t("map.price_range")}</label>
                <input
                  value={form.priceRange}
                  onChange={e => setForm(f => ({ ...f, priceRange: e.target.value }))}
                  placeholder={t("map.price_range_placeholder")}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:border-primary"
                  data-testid="input-price-range"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">{t("map.your_name_business")}</label>
                <input
                  value={form.buyerName}
                  onChange={e => setForm(f => ({ ...f, buyerName: e.target.value }))}
                  placeholder={t("map.your_name_placeholder")}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:border-primary"
                  data-testid="input-buyer-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">{t("map.urgency")}</label>
                  <select value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value as any }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:border-primary" data-testid="select-urgency">
                    <option value="high">{t("map.urgency_high")}</option>
                    <option value="medium">{t("map.urgency_medium")}</option>
                    <option value="low">{t("map.urgency_low")}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">{t("map.buyer_type")}</label>
                  <select value={form.buyerType} onChange={e => setForm(f => ({ ...f, buyerType: e.target.value as any }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:border-primary" data-testid="select-buyer-type">
                    <option value="individual">Individual</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="retailer">Retailer</option>
                    <option value="school">School</option>
                    <option value="hospital">Hospital</option>
                    <option value="processor">Processor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 block">{t("map.description")}</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder={t("map.any_requirements")}
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:border-primary resize-none"
                  data-testid="input-description"
                />
              </div>

              <Button
                onClick={() => postNeed.mutate(form)}
                disabled={!form.productName || !form.quantity || !form.city || postNeed.isPending}
                className="w-full h-9 text-xs font-bold bg-primary hover:bg-primary/90 rounded-xl"
                data-testid="btn-submit-need"
              >
                {postNeed.isPending ? t("map.posting") : t("map.post_to_live_map")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── POST SUCCESS TOAST ── */}
      {postSuccess && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[2000] bg-green-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4" />
          {t("map.posted_successfully", { location: postSuccess.location })}
          <button onClick={() => setPostSuccess(null)}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
    </div>
  );
}
