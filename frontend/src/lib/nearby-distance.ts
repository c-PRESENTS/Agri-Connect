export type DistancePoint = readonly [number, number];
export type DistanceRadius = number | "all";

export function distanceKm(from: DistancePoint, to: DistancePoint): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6_371;
  const latitudeDelta = toRadians(to[0] - from[0]);
  const longitudeDelta = toRadians(to[1] - from[1]);
  const fromLatitude = toRadians(from[0]);
  const toLatitude = toRadians(to[0]);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.sin(longitudeDelta / 2) ** 2 *
      Math.cos(fromLatitude) *
      Math.cos(toLatitude);
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(value)));
}

export function isWithinRadius(distance: number, radius: DistanceRadius): boolean {
  return radius === "all" || distance <= radius;
}
