import { getCode } from "country-list";
import { pool } from "../config/db";

export interface GeocodedLocation {
  label: string;
  latitude: number;
  longitude: number;
  countryCode: string | null;
  provider: string;
}

export class LocationNotFoundError extends Error {
  constructor() {
    super("We could not find that city and country. Check the spelling and try again.");
    this.name = "LocationNotFoundError";
  }
}

export class GeocodingUnavailableError extends Error {
  constructor() {
    super("Location lookup is temporarily unavailable. Please try again shortly.");
    this.name = "GeocodingUnavailableError";
  }
}

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
};

const COUNTRY_ALIASES: Record<string, string> = {
  uk: "GB",
  "u.k.": "GB",
  britain: "GB",
  "great britain": "GB",
  usa: "US",
  "u.s.a.": "US",
  america: "US",
  uae: "AE",
  "u.a.e.": "AE",
  emirates: "AE",
};

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_PROVIDER_INTERVAL_MS = 1_100;
const inflight = new Map<string, Promise<GeocodedLocation>>();
let providerQueue: Promise<void> = Promise.resolve();
let lastProviderRequestAt = 0;

export function normalizeLocationQuery(value: string): string {
  return value
    .split(",")
    .map((part) => part.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .join(", ");
}

function locationCacheKey(query: string): string {
  return normalizeLocationQuery(query).toLocaleLowerCase("en");
}

function inferCountryCode(query: string): string | null {
  const country = query.split(",").at(-1)?.trim() ?? "";
  if (!country) return null;
  const normalized = country.toLocaleLowerCase("en");
  return COUNTRY_ALIASES[normalized] ?? getCode(country) ?? null;
}

export function buildNominatimSearchUrl(
  query: string,
  baseUrl = process.env.GEOCODER_BASE_URL ?? "https://nominatim.openstreetmap.org",
): URL {
  const url = new URL(`${baseUrl.replace(/\/+$/, "")}/search`);
  url.searchParams.set("q", normalizeLocationQuery(query));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  const countryCode = inferCountryCode(query);
  if (countryCode) url.searchParams.set("countrycodes", countryCode.toLowerCase());
  if (process.env.GEOCODER_EMAIL) url.searchParams.set("email", process.env.GEOCODER_EMAIL);
  return url;
}

async function readCache(cacheKey: string): Promise<GeocodedLocation | null> {
  const result = await pool.query(
    `SELECT canonical_label, latitude, longitude, country_code, provider
       FROM geocoding_cache
      WHERE cache_key=$1 AND expires_at > now()`,
    [cacheKey],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    label: row.canonical_label,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    countryCode: row.country_code ?? null,
    provider: row.provider,
  };
}

async function writeCache(cacheKey: string, query: string, result: GeocodedLocation): Promise<void> {
  await pool.query(
    `INSERT INTO geocoding_cache
       (cache_key, query, canonical_label, country_code, latitude, longitude, provider, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (cache_key) DO UPDATE SET
       query=EXCLUDED.query,
       canonical_label=EXCLUDED.canonical_label,
       country_code=EXCLUDED.country_code,
       latitude=EXCLUDED.latitude,
       longitude=EXCLUDED.longitude,
       provider=EXCLUDED.provider,
       expires_at=EXCLUDED.expires_at,
       updated_at=now()`,
    [
      cacheKey,
      query,
      result.label,
      result.countryCode,
      result.latitude,
      result.longitude,
      result.provider,
      new Date(Date.now() + CACHE_TTL_MS),
    ],
  );
}

async function waitForProviderSlot(): Promise<void> {
  const previous = providerQueue;
  let release!: () => void;
  providerQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  const delay = Math.max(0, MIN_PROVIDER_INTERVAL_MS - (Date.now() - lastProviderRequestAt));
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
  lastProviderRequestAt = Date.now();
  release();
}

function canonicalLabel(result: NominatimResult, fallback: string): string {
  const address = result.address;
  const locality =
    address?.city ??
    address?.town ??
    address?.village ??
    address?.municipality ??
    address?.county ??
    address?.state;
  const country = address?.country;
  if (locality && country) return `${locality}, ${country}`;
  if (country) return `${normalizeLocationQuery(fallback).split(",")[0]}, ${country}`;
  return normalizeLocationQuery(result.display_name ?? fallback)
    .split(",")
    .slice(0, 3)
    .join(", ");
}

async function fetchFromNominatim(query: string): Promise<GeocodedLocation> {
  await waitForProviderSlot();
  const url = buildNominatimSearchUrl(query);
  const countryCode = inferCountryCode(query);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent":
          process.env.GEOCODER_USER_AGENT ??
          "AgriConnect-MVP/1.0 (support@agriconnect.app)",
      },
    });
    if (!response.ok) throw new GeocodingUnavailableError();
    const candidates = (await response.json()) as NominatimResult[];
    const match = candidates.find((candidate) => {
      const latitude = Number(candidate.lat);
      const longitude = Number(candidate.lon);
      return Number.isFinite(latitude) && Number.isFinite(longitude);
    });
    if (!match) throw new LocationNotFoundError();
    return {
      label: canonicalLabel(match, query),
      latitude: Number(match.lat),
      longitude: Number(match.lon),
      countryCode: match.address?.country_code?.toUpperCase() ?? countryCode,
      provider: "nominatim",
    };
  } catch (error) {
    if (error instanceof LocationNotFoundError || error instanceof GeocodingUnavailableError) throw error;
    throw new GeocodingUnavailableError();
  } finally {
    clearTimeout(timeout);
  }
}

export async function geocodeLocation(value: string): Promise<GeocodedLocation> {
  const query = normalizeLocationQuery(value);
  if (!query) throw new LocationNotFoundError();
  const cacheKey = locationCacheKey(query);
  const cached = await readCache(cacheKey);
  if (cached) return cached;

  const existing = inflight.get(cacheKey);
  if (existing) return existing;

  const request = fetchFromNominatim(query)
    .then(async (result) => {
      await writeCache(cacheKey, query, result);
      return result;
    })
    .finally(() => {
      inflight.delete(cacheKey);
    });
  inflight.set(cacheKey, request);
  return request;
}
