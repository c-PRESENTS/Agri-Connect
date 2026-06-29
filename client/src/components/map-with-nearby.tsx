import "leaflet/dist/leaflet.css";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L, { LatLngBounds } from "leaflet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Star, Store, Navigation, Layers } from "lucide-react";
import { getProductImage } from "@/lib/product-images";
import type { Product } from "@shared/schema";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const TILE_LAYERS = {
  standard: { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "© OpenStreetMap" },
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "© Esri" },
} as const;

type TileKey = keyof typeof TILE_LAYERS;

const sellerIcon = (online: boolean) =>
  L.divIcon({
    html: `<div style="width:32px;height:32px;border-radius:50%;background:${
      online ? "linear-gradient(135deg,#22c55e,#16a34a)" : "linear-gradient(135deg,#9ca3af,#6b7280)"
    };border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/></svg></div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  });

interface SellerGroup {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  isOnline: boolean;
  latitude: number;
  longitude: number;
  location: string;
  productCount: number;
  topProduct: Product;
  products: Product[];
}

function groupBySeller(products: Product[]): SellerGroup[] {
  const map = new Map<string, SellerGroup>();
  for (const p of products) {
    if (!p.farmerLatitude || !p.farmerLongitude) continue;
    const existing = map.get(p.farmerId);
    if (existing) {
      existing.products.push(p);
      existing.productCount += 1;
      if (p.price < existing.topProduct.price) existing.topProduct = p;
    } else {
      map.set(p.farmerId, {
        id: p.farmerId,
        name: p.farmerName,
        avatar: p.farmerAvatar,
        rating: p.farmerRating,
        isOnline: (p as any).isOnline ?? true,
        latitude: p.farmerLatitude,
        longitude: p.farmerLongitude,
        location: p.farmerLocation || "",
        productCount: 1,
        topProduct: p,
        products: [p],
      });
    }
  }
  return Array.from(map.values());
}

function BoundsListener({ onChange }: { onChange: (b: LatLngBounds) => void }) {
  const map = useMapEvents({
    moveend: () => onChange(map.getBounds()),
    zoomend: () => onChange(map.getBounds()),
  });
  return null;
}

function InvalidateOnMount() {
  const map = useMap();
  useMemo(() => {
    setTimeout(() => map.invalidateSize(), 100);
    setTimeout(() => map.invalidateSize(), 600);
  }, [map]);
  return null;
}

export interface MapWithNearbyProps {
  /** Optional pre-filtered products (e.g. from a category). Defaults to all. */
  products?: Product[];
  /** Initial map center, defaults to UK midpoint. */
  center?: [number, number];
  /** Initial zoom. */
  zoom?: number;
  /** Title shown above the map. */
  title?: string;
  /** Description / subtitle. */
  subtitle?: string;
  /** Pixel height of the map portion. */
  mapHeight?: number;
  /** Pixel height of the "In view" seller list. */
  listHeight?: number;
  /** Compact preset — smaller map + tighter list, suitable for side rails. */
  compact?: boolean;
  className?: string;
}

export function MapWithNearby({
  products: providedProducts,
  center = [54.0, -2.5],
  zoom = 6,
  title = "Sellers near you",
  subtitle = "Browse live listings from the map area below",
  mapHeight,
  listHeight,
  compact = false,
  className = "",
}: MapWithNearbyProps) {
  const effectiveMapHeight = mapHeight ?? (compact ? 220 : 320);
  const effectiveListHeight = listHeight ?? (compact ? 260 : 420);
  const { data: fetched = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: !providedProducts,
  });
  const products = providedProducts ?? fetched;

  const sellers = useMemo(() => groupBySeller(products), [products]);

  const [bounds, setBounds] = useState<LatLngBounds | null>(null);
  const [tile, setTile] = useState<TileKey>("standard");

  const visibleSellers = useMemo(() => {
    if (!bounds) return sellers;
    return sellers.filter((s) => bounds.contains([s.latitude, s.longitude]));
  }, [sellers, bounds]);

  return (
    <div className={`flex flex-col gap-3 ${className}`} data-testid="widget-map-with-nearby">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
            <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setTile(tile === "standard" ? "satellite" : "standard")}
            data-testid="button-toggle-map-tile"
          >
            <Layers className="w-3.5 h-3.5 mr-1" />
            {tile === "standard" ? "Satellite" : "Standard"}
          </Button>
        </div>
        <div style={{ height: effectiveMapHeight }} className="relative">
          <MapContainer
            center={center}
            zoom={zoom}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={false}
            zoomControl
          >
            <TileLayer url={TILE_LAYERS[tile].url} attribution={TILE_LAYERS[tile].attribution} />
            <InvalidateOnMount />
            <BoundsListener onChange={setBounds} />
            {sellers.map((s) => (
              <Marker key={s.id} position={[s.latitude, s.longitude]} icon={sellerIcon(s.isOnline)}>
                <Popup>
                  <div className="min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <Store className="w-4 h-4 text-primary" />
                      <Link href={`/sellers/${s.id}`} className="font-semibold hover:underline" data-testid={`popup-seller-${s.id}`}>
                        {s.name}
                      </Link>
                    </div>
                    {s.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                        <MapPin className="w-3 h-3" />
                        {s.location}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                        {s.rating.toFixed(1)}
                      </span>
                      <span>·</span>
                      <span>{s.productCount} listings</span>
                    </div>
                    <Link href={`/sellers/${s.id}`}>
                      <Button size="sm" className="mt-2 w-full h-7 text-xs" data-testid={`button-view-seller-${s.id}`}>
                        View shop
                      </Button>
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </Card>

      <Card className="flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-2 min-w-0">
            <Navigation className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm font-semibold truncate">In view</p>
          </div>
          <Badge variant="secondary" className="text-[11px]" data-testid="badge-nearby-count">
            {visibleSellers.length} sellers
          </Badge>
        </div>
        <ScrollArea style={{ height: effectiveListHeight }}>
          <div className="divide-y">
            {visibleSellers.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <MapPin className="w-6 h-6 mx-auto mb-2 opacity-50" />
                Pan or zoom the map to find sellers in another area.
              </div>
            ) : (
              visibleSellers.map((s) => {
                const img = getProductImage(s.topProduct.name, s.topProduct.categoryId, "sm");
                return (
                  <Link
                    key={s.id}
                    href={`/sellers/${s.id}`}
                    className="flex gap-3 p-3 hover-elevate active-elevate-2 cursor-pointer"
                    data-testid={`row-nearby-seller-${s.id}`}
                  >
                      <img
                        src={img}
                        alt={s.topProduct.name}
                        className="w-14 h-14 rounded-md object-cover shrink-0 bg-muted"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold truncate">{s.name}</p>
                          {s.isOnline && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Live
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {s.location || "UK"}
                        </p>
                        <div className="flex items-center gap-2 text-xs mt-1">
                          <span className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                            {s.rating.toFixed(1)}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">{s.productCount} listings</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="font-semibold text-primary">
                            from £{s.topProduct.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                  </Link>
                );
              })
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
