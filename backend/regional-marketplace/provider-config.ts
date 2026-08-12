export type MarketplaceMapConfig = {
  mapProvider: "osm" | "google" | "custom";
  tileUrl: string;
  tileAttribution: string;
  geocodingProvider: "nominatim" | "google" | "custom";
  geocodingConfigured: boolean;
  googleMapsApiKey?: string;
  regionDataVersion: string;
};

function configured(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

export function marketplaceMapConfig(): MarketplaceMapConfig {
  const mapProvider = configured(process.env.MAP_PROVIDER, "osm").toLowerCase();
  const geocodingProvider = configured(process.env.GEOCODING_PROVIDER, "nominatim").toLowerCase();
  return {
    mapProvider: mapProvider === "google" || mapProvider === "custom" ? mapProvider : "osm",
    tileUrl: configured(process.env.MAP_TILE_URL, "https://tile.openstreetmap.org/{z}/{x}/{y}.png"),
    tileAttribution: configured(process.env.MAP_TILE_ATTRIBUTION, "© OpenStreetMap contributors"),
    geocodingProvider: geocodingProvider === "google" || geocodingProvider === "custom" ? geocodingProvider : "nominatim",
    geocodingConfigured: geocodingProvider === "nominatim" || Boolean(process.env.GEOCODING_API_KEY?.trim()),
    ...(mapProvider === "google" && process.env.GOOGLE_MAPS_BROWSER_API_KEY?.trim()
      ? { googleMapsApiKey: process.env.GOOGLE_MAPS_BROWSER_API_KEY.trim() }
      : {}),
    regionDataVersion: configured(process.env.REGION_DATA_VERSION, "2026-08"),
  };
}
