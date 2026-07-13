/**
 * Map views consume the already-public location fields returned with a product.
 * Keep coordinate validation in one place so incomplete seller records never
 * reach Leaflet (which throws when given invalid positions).
 */
export function hasValidPublicCoordinates(latitude: unknown, longitude: unknown): latitude is number {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

/** Only show the public city/region label, never raw coordinates or an address. */
export function getPublicLocationLabel(location: unknown): string {
  return typeof location === "string" && location.trim()
    ? location.trim()
    : "Location not specified";
}
