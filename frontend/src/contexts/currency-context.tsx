import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Region, User } from "@shared/schema";
import { regions } from "@/lib/categories";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import {
  BASE_CURRENCY,
  convertCurrencyAmount,
  formatCurrencyAmount,
} from "@/lib/currency";

const REGION_STORAGE_KEY = "agriconnect-region";
const REGION_CHANGE_EVENT = "agriconnect-region-changed";

interface ExchangeRateResponse {
  baseCurrency: "GBP";
  rates: Record<string, number>;
  provider: string;
  providerUpdatedAt: string;
  fetchedAt: string;
  nextRefreshAt: string;
  stale: boolean;
  unavailable?: boolean;
}

interface MoneyFormatOptions {
  sourceCurrency?: string;
  includeCode?: boolean;
}

interface CurrencyContextValue {
  region: Region;
  currency: string;
  rates: Record<string, number>;
  ratesStale: boolean;
  ratesUnavailable: boolean;
  setRegion: (region: Region) => void;
  convert: (amount: number, sourceCurrency?: string) => number;
  format: (amount: number, options?: MoneyFormatOptions) => string;
}

const gbRegion = regions.find((region) => region.code === "GB") ?? regions[0];
const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function storedRegion(): Region {
  if (typeof window === "undefined") return gbRegion;
  const code = window.localStorage.getItem(REGION_STORAGE_KEY);
  return regions.find((region) => region.code === code) ?? gbRegion;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn<User | null>({ on401: "returnNull" }),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const { data: exchangeRates } = useQuery<ExchangeRateResponse>({
    queryKey: ["/api/exchange-rates"],
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
  });
  const [region, setRegionState] = useState<Region>(storedRegion);

  useEffect(() => {
    if (!user?.preferredCurrency) return;
    const matchingRegion = regions.find(
      (candidate) => candidate.currency === user.preferredCurrency,
    );
    if (matchingRegion && matchingRegion.currency !== region.currency) {
      setRegionState(matchingRegion);
      localStorage.setItem(REGION_STORAGE_KEY, matchingRegion.code);
    }
  }, [region.currency, user?.preferredCurrency]);

  useEffect(() => {
    const syncRegion = (event: StorageEvent | Event) => {
      const detailCode =
        event instanceof CustomEvent ? (event.detail as { code?: string })?.code : undefined;
      const code =
        detailCode ??
        (event instanceof StorageEvent ? event.newValue : null) ??
        localStorage.getItem(REGION_STORAGE_KEY);
      const next = regions.find((candidate) => candidate.code === code);
      if (next) setRegionState(next);
    };
    window.addEventListener("storage", syncRegion);
    window.addEventListener(REGION_CHANGE_EVENT, syncRegion);
    return () => {
      window.removeEventListener("storage", syncRegion);
      window.removeEventListener(REGION_CHANGE_EVENT, syncRegion);
    };
  }, []);

  const setRegion = useCallback((next: Region) => {
    setRegionState(next);
    localStorage.setItem(REGION_STORAGE_KEY, next.code);
    window.dispatchEvent(new CustomEvent(REGION_CHANGE_EVENT, { detail: { code: next.code } }));

    if (user && user.preferredCurrency !== next.currency) {
      void apiRequest("PATCH", "/api/auth/profile", {
        preferredCurrency: next.currency,
      })
        .then((response) => response.json())
        .then((updatedUser: User) => {
          queryClient.setQueryData(["/api/auth/user"], updatedUser);
        })
        .catch(() => {
          // Currency selection remains available locally if profile sync fails.
        });
    }
  }, [queryClient, user]);

  const rates = exchangeRates?.rates ?? { GBP: 1 };
  const requestedCurrency = region.currency.toUpperCase();
  const currency = rates[requestedCurrency] ? requestedCurrency : BASE_CURRENCY;
  const locale = region.languageCode || "en-GB";

  const convert = useCallback(
    (amount: number, sourceCurrency = BASE_CURRENCY) =>
      convertCurrencyAmount(amount, sourceCurrency, currency, rates),
    [currency, rates],
  );

  const format = useCallback(
    (amount: number, options: MoneyFormatOptions = {}) =>
      formatCurrencyAmount(
        convertCurrencyAmount(
          amount,
          options.sourceCurrency ?? BASE_CURRENCY,
          currency,
          rates,
        ),
        currency,
        locale,
        options.includeCode ?? false,
      ),
    [currency, locale, rates],
  );

  const value = useMemo<CurrencyContextValue>(() => ({
    region,
    currency,
    rates,
    ratesStale: exchangeRates?.stale ?? true,
    ratesUnavailable: exchangeRates?.unavailable ?? !exchangeRates,
    setRegion,
    convert,
    format,
  }), [convert, currency, exchangeRates, format, rates, region, setRegion]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("useCurrency must be used within CurrencyProvider");
  return context;
}

