import { pool } from "../config/db";

const OPEN_RATES_URL =
  process.env.EXCHANGE_RATE_API_URL?.trim() ||
  "https://open.er-api.com/v6/latest/GBP";
const CACHE_KEY = "GBP:open-er-api";
const configuredCacheHours = Number(process.env.EXCHANGE_RATE_CACHE_TTL_HOURS ?? 24);
// The Open Access feed updates once daily. Do not allow configuration to poll
// it more frequently than the provider's supported 24-hour cadence.
const CACHE_TTL_HOURS = Number.isFinite(configuredCacheHours)
  ? Math.max(24, configuredCacheHours)
  : 24;
const CACHE_TTL_MS = CACHE_TTL_HOURS * 60 * 60 * 1000;

export interface ExchangeRateSnapshot {
  baseCurrency: "GBP";
  rates: Record<string, number>;
  provider: "ExchangeRate-API";
  providerUpdatedAt: string;
  fetchedAt: string;
  nextRefreshAt: string;
  stale: boolean;
  unavailable?: boolean;
}

interface OpenRatesResponse {
  result?: string;
  base_code?: string;
  time_last_update_unix?: number;
  time_next_update_unix?: number;
  rates?: Record<string, number>;
}

let memorySnapshot: ExchangeRateSnapshot | null = null;
let refreshPromise: Promise<ExchangeRateSnapshot> | null = null;

function normalizeRates(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const rates: Record<string, number> = {};
  for (const [code, rate] of Object.entries(value)) {
    if (/^[A-Z]{3}$/.test(code) && typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
      rates[code] = rate;
    }
  }
  rates.GBP = 1;
  return rates;
}

function withFreshness(snapshot: ExchangeRateSnapshot): ExchangeRateSnapshot {
  return {
    ...snapshot,
    stale: Date.parse(snapshot.nextRefreshAt) <= Date.now(),
  };
}

async function readPersistedSnapshot(): Promise<ExchangeRateSnapshot | null> {
  try {
    const result = await pool.query(
      `SELECT base_currency, rates, provider, provider_updated_at, fetched_at, next_refresh_at
         FROM exchange_rate_cache
        WHERE cache_key = $1
        LIMIT 1`,
      [CACHE_KEY],
    );
    const row = result.rows[0];
    if (!row) return null;
    const rates = normalizeRates(row.rates);
    if (Object.keys(rates).length <= 1) return null;
    return withFreshness({
      baseCurrency: "GBP",
      rates,
      provider: "ExchangeRate-API",
      providerUpdatedAt: new Date(row.provider_updated_at).toISOString(),
      fetchedAt: new Date(row.fetched_at).toISOString(),
      nextRefreshAt: new Date(row.next_refresh_at).toISOString(),
      stale: false,
    });
  } catch (error: any) {
    // Deployments can start before the migration has been applied. The
    // in-memory cache still provides correct conversion for that process.
    if (error?.code !== "42P01") {
      console.warn("[currency] Could not read persistent rate cache", error?.message ?? error);
    }
    return null;
  }
}

async function persistSnapshot(snapshot: ExchangeRateSnapshot): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO exchange_rate_cache
         (cache_key, base_currency, rates, provider, provider_updated_at, fetched_at, next_refresh_at)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7)
       ON CONFLICT (cache_key) DO UPDATE SET
         base_currency = EXCLUDED.base_currency,
         rates = EXCLUDED.rates,
         provider = EXCLUDED.provider,
         provider_updated_at = EXCLUDED.provider_updated_at,
         fetched_at = EXCLUDED.fetched_at,
         next_refresh_at = EXCLUDED.next_refresh_at`,
      [
        CACHE_KEY,
        snapshot.baseCurrency,
        JSON.stringify(snapshot.rates),
        snapshot.provider,
        snapshot.providerUpdatedAt,
        snapshot.fetchedAt,
        snapshot.nextRefreshAt,
      ],
    );
  } catch (error: any) {
    if (error?.code !== "42P01") {
      console.warn("[currency] Could not persist rate cache", error?.message ?? error);
    }
  }
}

async function fetchFreshSnapshot(): Promise<ExchangeRateSnapshot> {
  const response = await fetch(OPEN_RATES_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Exchange-rate provider returned ${response.status}`);

  const body = (await response.json()) as OpenRatesResponse;
  const rates = normalizeRates(body.rates);
  if (body.result !== "success" || body.base_code !== "GBP" || Object.keys(rates).length <= 1) {
    throw new Error("Exchange-rate provider returned an invalid response");
  }

  const now = Date.now();
  const providerUpdatedAt = body.time_last_update_unix
    ? new Date(body.time_last_update_unix * 1000).toISOString()
    : new Date(now).toISOString();
  // The open endpoint updates daily. Never poll more frequently than 24 hours,
  // even when a provider timestamp is absent or malformed.
  const providerNext = body.time_next_update_unix
    ? body.time_next_update_unix * 1000
    : now + CACHE_TTL_MS;
  const nextRefresh = Math.max(now + CACHE_TTL_MS, providerNext);
  const snapshot: ExchangeRateSnapshot = {
    baseCurrency: "GBP",
    rates,
    provider: "ExchangeRate-API",
    providerUpdatedAt,
    fetchedAt: new Date(now).toISOString(),
    nextRefreshAt: new Date(nextRefresh).toISOString(),
    stale: false,
  };
  memorySnapshot = snapshot;
  await persistSnapshot(snapshot);
  return snapshot;
}

export async function getExchangeRateSnapshot(): Promise<ExchangeRateSnapshot> {
  if (memorySnapshot && Date.parse(memorySnapshot.nextRefreshAt) > Date.now()) {
    return memorySnapshot;
  }

  if (!refreshPromise) {
    // Database hydration is part of the single-flight operation. Otherwise,
    // simultaneous cold-start requests can all complete their SELECT before
    // any one caller establishes the shared provider-refresh promise.
    refreshPromise = (async () => {
      if (!memorySnapshot) {
        memorySnapshot = await readPersistedSnapshot();
        if (memorySnapshot && Date.parse(memorySnapshot.nextRefreshAt) > Date.now()) {
          return memorySnapshot;
        }
      }

      try {
        return await fetchFreshSnapshot();
      } catch (error: any) {
        console.warn("[currency] Rate refresh failed; using the last known rates", error?.message ?? error);
        const retryAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
        memorySnapshot = memorySnapshot
          ? { ...memorySnapshot, nextRefreshAt: retryAt, stale: true }
          : {
              baseCurrency: "GBP",
              rates: { GBP: 1 },
              provider: "ExchangeRate-API",
              providerUpdatedAt: new Date(0).toISOString(),
              fetchedAt: new Date().toISOString(),
              nextRefreshAt: retryAt,
              stale: true,
              unavailable: true,
            };
        // Throttle failures too: a provider outage must not turn every
        // frontend request into another external fetch attempt.
        return memorySnapshot;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}
