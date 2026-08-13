import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MarketplaceMarker = {
  sellerId: string;
  sellerName: string;
  latitude: number;
  longitude: number;
  location: string;
  productCount: number;
  minimumPrice: number;
  rating: number;
  productIds: string[];
};

const sellerIcon = L.divIcon({
  className: "",
  html: '<div style="height:28px;width:28px;border-radius:999px;background:#16a34a;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);display:grid;place-items:center;color:white;font-size:14px">●</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function FitMarkers({ markers, fallback }: { markers: MarketplaceMarker[]; fallback: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) {
      map.setView(fallback, 8);
      return;
    }
    const bounds = L.latLngBounds(markers.map((marker) => [marker.latitude, marker.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 12 });
  }, [fallback, map, markers]);
  return null;
}

export function MarketplaceResultsMap({ markers, center, tileUrl, attribution, provider = "osm", googleMapsApiKey, onSellerSelect }: {
  markers: MarketplaceMarker[];
  center: [number, number];
  tileUrl: string;
  attribution: string;
  provider?: string;
  googleMapsApiKey?: string;
  onSellerSelect(sellerId: string): void;
}) {
  const signature = useMemo(() => markers.map((marker) => `${marker.sellerId}:${marker.latitude}:${marker.longitude}`).join("|"), [markers]);
  if (provider === "google" && googleMapsApiKey) {
    return <GoogleMarketplaceMap markers={markers} center={center} apiKey={googleMapsApiKey} onSellerSelect={onSellerSelect} />;
  }
  return (
    <MapContainer center={center} zoom={8} className="h-full min-h-[300px] w-full" scrollWheelZoom>
      <TileLayer url={tileUrl} attribution={attribution} />
      <FitMarkers key={signature} markers={markers} fallback={center} />
      {markers.map((marker) => (
        <Marker key={marker.sellerId} position={[marker.latitude, marker.longitude]} icon={sellerIcon} eventHandlers={{ click: () => onSellerSelect(marker.sellerId) }}>
          <Popup>
            <button type="button" className="text-left" onClick={() => onSellerSelect(marker.sellerId)}>
              <strong>{marker.sellerName}</strong><br />
              <span>{marker.location}</span><br />
              <span>{marker.productCount} matching {marker.productCount === 1 ? "product" : "products"}</span>
            </button>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

let googleMapsLoader: Promise<void> | undefined;
function ensureGoogleMaps(apiKey: string): Promise<void> {
  const browser = window as typeof window & { google?: any };
  if (browser.google?.maps) return Promise.resolve();
  if (!googleMapsLoader) googleMapsLoader = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });
  return googleMapsLoader;
}

function GoogleMarketplaceMap({ markers, center, apiKey, onSellerSelect }: { markers: MarketplaceMarker[]; center: [number, number]; apiKey: string; onSellerSelect(sellerId: string): void }) {
  const id = useMemo(() => `marketplace-google-${Math.random().toString(36).slice(2)}`, []);
  useEffect(() => {
    let active = true;
    const createdMarkers: any[] = [];
    void ensureGoogleMaps(apiKey).then(() => {
      if (!active) return;
      const google = (window as typeof window & { google?: any }).google;
      const element = document.getElementById(id);
      if (!google?.maps || !element) return;
      const map = new google.maps.Map(element, { center: { lat: center[0], lng: center[1] }, zoom: 8, mapTypeControl: false, streetViewControl: false });
      const bounds = new google.maps.LatLngBounds();
      for (const marker of markers) {
        const position = { lat: marker.latitude, lng: marker.longitude };
        const instance = new google.maps.Marker({ map, position, title: marker.sellerName });
        instance.addListener("click", () => onSellerSelect(marker.sellerId));
        createdMarkers.push(instance);
        bounds.extend(position);
      }
      if (markers.length > 0) map.fitBounds(bounds, 36);
    }).catch(() => undefined);
    return () => { active = false; createdMarkers.forEach((marker) => marker.setMap(null)); };
  }, [apiKey, center, id, markers, onSellerSelect]);
  return <div id={id} className="h-full min-h-[300px] w-full" aria-label="Google marketplace map" />;
}
