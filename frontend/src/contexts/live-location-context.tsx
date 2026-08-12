import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { regions } from "@/lib/categories";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/contexts/currency-context";

const REGION_SOURCE_KEY = "agriconnect-region-source";
export const LIVE_LOCATION_EVENT = "agriconnect-live-location-changed";

export type LiveLocationStatus =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "unavailable";

export interface LiveLocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  label: string;
  countryCode: string | null;
  updatedAt: string;
  source: "device" | "profile";
}

interface LiveLocationContextValue {
  location: LiveLocation | null;
  status: LiveLocationStatus;
  error: string | null;
  refresh(): void;
}

const LiveLocationContext = createContext<LiveLocationContextValue | null>(null);

function profileFallback(user: User | null): LiveLocation | null {
  if (
    !user?.location ||
    user.latitude == null ||
    user.longitude == null ||
    !Number.isFinite(user.latitude) ||
    !Number.isFinite(user.longitude)
  ) return null;
  return {
    latitude: user.latitude,
    longitude: user.longitude,
    accuracyMeters: null,
    label: user.location,
    countryCode: null,
    updatedAt: user.updatedAt?.toString() ?? new Date().toISOString(),
    source: "profile",
  };
}

function movementKm(first: LiveLocation | null, latitude: number, longitude: number): number {
  if (!first) return Number.POSITIVE_INFINITY;
  const radius = 6371;
  const latitudeDelta = (latitude - first.latitude) * Math.PI / 180;
  const longitudeDelta = (longitude - first.longitude) * Math.PI / 180;
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(first.latitude * Math.PI / 180)
    * Math.cos(latitude * Math.PI / 180)
    * Math.sin(longitudeDelta / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function LiveLocationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { setRegion } = useCurrency();
  const queryClient = useQueryClient();
  const [location, setLocation] = useState<LiveLocation | null>(null);
  const [status, setStatus] = useState<LiveLocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const watchIdRef = useRef<number>();
  const latestLocationRef = useRef<LiveLocation | null>(null);
  const lastServerSyncRef = useRef(0);

  const applyServerLocation = useCallback((serverLocation: Omit<LiveLocation, "source">) => {
    const next: LiveLocation = { ...serverLocation, source: "device" };
    latestLocationRef.current = next;
    setLocation(next);
    setStatus("active");
    setError(null);
    window.dispatchEvent(new CustomEvent(LIVE_LOCATION_EVENT, { detail: next }));

    if (
      next.countryCode &&
      localStorage.getItem(REGION_SOURCE_KEY) !== "manual"
    ) {
      const region = regions.find((candidate) => candidate.code === next.countryCode);
      if (region) {
        localStorage.setItem(REGION_SOURCE_KEY, "live-location");
        setRegion(region);
      }
    }

    void queryClient.invalidateQueries({
      predicate: (query) => {
        const key = String(query.queryKey[0] ?? "");
        return key.startsWith("/api/products") || key.startsWith("/api/local-needs");
      },
    });
  }, [queryClient, setRegion]);

  const syncPosition = useCallback(async (position: GeolocationPosition) => {
    const now = Date.now();
    const { latitude, longitude, accuracy } = position.coords;
    const moved = movementKm(latestLocationRef.current, latitude, longitude);
    if (now - lastServerSyncRef.current < 60_000 && moved < 0.25) {
      setStatus("active");
      return;
    }
    lastServerSyncRef.current = now;

    try {
      const response = await apiRequest("PUT", "/api/auth/live-location", {
        latitude,
        longitude,
        accuracyMeters: Number.isFinite(accuracy) ? accuracy : null,
      });
      const serverLocation = await response.json();
      applyServerLocation(serverLocation);
    } catch {
      const next: LiveLocation = {
        latitude,
        longitude,
        accuracyMeters: Number.isFinite(accuracy) ? accuracy : null,
        label: "Current device location",
        countryCode: null,
        updatedAt: new Date().toISOString(),
        source: "device",
      };
      latestLocationRef.current = next;
      setLocation(next);
      setStatus("active");
      setError("Live location is active locally but could not be synchronized.");
      window.dispatchEvent(new CustomEvent(LIVE_LOCATION_EVENT, { detail: next }));
    }
  }, [applyServerLocation]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) {
      if (watchIdRef.current !== undefined) navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = undefined;
      latestLocationRef.current = null;
      setLocation(null);
      setStatus("idle");
      setError(null);
      window.dispatchEvent(new CustomEvent(LIVE_LOCATION_EVENT, { detail: null }));
      return;
    }

    const fallback = profileFallback(user);
    if (!("geolocation" in navigator)) {
      latestLocationRef.current = fallback;
      setLocation(fallback);
      setStatus("unavailable");
      setError("This browser does not support live location. Using your saved profile location.");
      window.dispatchEvent(new CustomEvent(LIVE_LOCATION_EVENT, { detail: fallback }));
      return;
    }

    setStatus(latestLocationRef.current?.source === "device" ? "active" : "requesting");
    setError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => void syncPosition(position),
      (geolocationError) => {
        latestLocationRef.current = fallback;
        setLocation(fallback);
        setStatus(geolocationError.code === geolocationError.PERMISSION_DENIED ? "denied" : "unavailable");
        setError(
          geolocationError.code === geolocationError.PERMISSION_DENIED
            ? "Location permission was denied. Using your saved profile location."
            : "Live location is unavailable. Using your saved profile location.",
        );
        window.dispatchEvent(new CustomEvent(LIVE_LOCATION_EVENT, { detail: fallback }));
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );

    return () => {
      if (watchIdRef.current !== undefined) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = undefined;
    };
  }, [isAuthenticated, isLoading, requestVersion, syncPosition, user]);

  const refresh = useCallback(() => {
    lastServerSyncRef.current = 0;
    setRequestVersion((current) => current + 1);
  }, []);

  const value = useMemo<LiveLocationContextValue>(() => ({
    location,
    status,
    error,
    refresh,
  }), [error, location, refresh, status]);

  return <LiveLocationContext.Provider value={value}>{children}</LiveLocationContext.Provider>;
}

export function useLiveLocation(): LiveLocationContextValue {
  const context = useContext(LiveLocationContext);
  if (!context) throw new Error("useLiveLocation must be used inside LiveLocationProvider");
  return context;
}
