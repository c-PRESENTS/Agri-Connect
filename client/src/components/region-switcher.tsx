import { useState, useEffect, useMemo } from "react";
import { Globe, ChevronDown, MapPin, Search, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { regions } from "@/lib/categories";
import type { Region } from "@shared/schema";
import { useTranslation } from "react-i18next";

interface RegionSwitcherProps {
  onRegionChange?: (region: Region) => void;
}

const STORAGE_KEY = "agriconnect-region";

const continentLabels: Record<string, string> = {
  "europe": "Europe",
  "asia": "Asia & Middle East",
  "africa": "Africa",
  "north-america": "North America",
  "south-america": "South America",
  "oceania": "Oceania & Pacific",
};

function getCountryFlag(code: string) {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

const defaultPopularCodes = ["GB", "IN", "US", "AE", "NG", "BR"];

/** Map IANA timezones to ISO country codes for regions where browser locale
 *  alone is ambiguous (e.g. "en" without a country tag). Covers the major
 *  regions present in our region list. */
const TZ_TO_COUNTRY: Record<string, string> = {
  "Europe/London": "GB", "Europe/Dublin": "IE", "Europe/Paris": "FR",
  "Europe/Berlin": "DE", "Europe/Madrid": "ES", "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL", "Europe/Brussels": "BE", "Europe/Lisbon": "PT",
  "Europe/Vienna": "AT", "Europe/Zurich": "CH", "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO", "Europe/Copenhagen": "DK", "Europe/Helsinki": "FI",
  "Europe/Warsaw": "PL", "Europe/Athens": "GR", "Europe/Moscow": "RU",
  "Europe/Kiev": "UA", "Europe/Prague": "CZ", "Europe/Bucharest": "RO",
  "Europe/Budapest": "HU",
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US",
  "America/Los_Angeles": "US", "America/Phoenix": "US",
  "America/Toronto": "CA", "America/Vancouver": "CA",
  "America/Mexico_City": "MX", "America/Sao_Paulo": "BR",
  "America/Argentina/Buenos_Aires": "AR",
  "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Asia/Dubai": "AE",
  "Asia/Tokyo": "JP", "Asia/Shanghai": "CN", "Asia/Singapore": "SG",
  "Asia/Hong_Kong": "HK", "Asia/Seoul": "KR", "Asia/Bangkok": "TH",
  "Asia/Jakarta": "ID", "Asia/Manila": "PH", "Asia/Karachi": "PK",
  "Asia/Dhaka": "BD", "Asia/Riyadh": "SA",
  "Africa/Lagos": "NG", "Africa/Nairobi": "KE", "Africa/Johannesburg": "ZA",
  "Africa/Cairo": "EG", "Africa/Casablanca": "MA",
  "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Pacific/Auckland": "NZ",
};

function detectRegionFromBrowser(): Region | undefined {
  try {
    // 1) Browser locale country tag (e.g. "en-GB" → "GB").
    const lang = typeof navigator !== "undefined" ? navigator.language : "";
    const langCode = lang.split("-")[1]?.toUpperCase();
    if (langCode) {
      const r = regions.find((x) => x.code === langCode);
      if (r) return r;
    }
    // 2) Fall back to IANA timezone mapping.
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const country = TZ_TO_COUNTRY[tz];
    if (country) {
      const r = regions.find((x) => x.code === country);
      if (r) return r;
    }
  } catch {
    /* ignore — non-browser env or restricted Intl */
  }
  return undefined;
}

export function RegionSwitcher({ onRegionChange }: RegionSwitcherProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [detectedRegion, setDetectedRegion] = useState<Region | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const found = regions.find(r => r.code === saved);
        if (found) return found;
      }
      // No saved choice: default to GB/£ for the global marketplace baseline.
      // Auto-detected regions are still offered as a one-click suggestion below.
    }
    return regions.find(r => r.code === "GB") || regions[0];
  });

  useEffect(() => {
    const auto = detectRegionFromBrowser();
    if (auto && auto.code !== selectedRegion.code) {
      setDetectedRegion(auto);
    }
    // Notify parent of the initial selection so prices render in the right
    // currency immediately on first load (e.g. right after login).
    onRegionChange?.(selectedRegion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegionChange = (region: Region) => {
    setSelectedRegion(region);
    localStorage.setItem(STORAGE_KEY, region.code);
    onRegionChange?.(region);
    setOpen(false);
    setSearchQuery("");
  };

  const popularRegions = useMemo(() => {
    const withFlag = regions.filter(r => r.isPopular === true);
    if (withFlag.length > 0) return withFlag;
    return regions.filter(r => defaultPopularCodes.includes(r.code));
  }, []);

  const filteredRegions = useMemo(() => {
    if (!searchQuery) return regions;
    const query = searchQuery.toLowerCase();
    return regions.filter(r => 
      r.name.toLowerCase().includes(query) ||
      r.code.toLowerCase().includes(query) ||
      r.currency.toLowerCase().includes(query) ||
      r.language?.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const groupedRegions = useMemo(() => {
    const grouped: Record<string, Region[]> = {};
    filteredRegions.forEach(region => {
      const continent = region.continent || "other";
      if (!grouped[continent]) grouped[continent] = [];
      grouped[continent].push(region);
    });
    return grouped;
  }, [filteredRegions]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          className="gap-2 px-2 sm:px-3" 
          data-testid="button-region-switcher"
          aria-label={t("region.current_label", { region: selectedRegion.name })}
        >
          <span className="text-base" aria-hidden="true">{getCountryFlag(selectedRegion.code)}</span>
          <span className="hidden md:inline text-sm">{selectedRegion.code}</span>
          <span className="font-semibold text-sm">{selectedRegion.currencySymbol}</span>
          <ChevronDown className="h-3 w-3 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <Label htmlFor="region-search" className="sr-only">{t("region.search_aria_label")}</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="region-search"
              placeholder={t("region.search_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
              data-testid="input-region-search"
              aria-label={t("region.search_aria_label")}
            />
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {detectedRegion && !searchQuery && (
            <div className="p-3 border-b bg-muted/30">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                <span>{t("region.detected_location")}</span>
              </div>
              <Button
                variant="ghost"
                onClick={() => handleRegionChange(detectedRegion)}
                className="w-full flex items-center gap-3 h-auto py-2 justify-start"
                data-testid="button-detected-region"
              >
                <span className="text-xl" aria-hidden="true">{getCountryFlag(detectedRegion.code)}</span>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium text-sm">{detectedRegion.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {detectedRegion.currency} ({detectedRegion.currencySymbol})
                  </p>
                </div>
                {selectedRegion.code === detectedRegion.code && (
                  <Check className="h-4 w-4 text-primary" aria-label="Currently selected" />
                )}
              </Button>
            </div>
          )}

          {!searchQuery && (
            <div className="p-3 border-b">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Star className="h-3 w-3" aria-hidden="true" />
                <span>{t("region.popular_regions")}</span>
              </div>
              <div className="space-y-0.5">
                {popularRegions.map((region) => (
                  <Button
                    key={region.code}
                    variant="ghost"
                    onClick={() => handleRegionChange(region)}
                    className="w-full flex items-center gap-3 h-auto py-2 justify-start"
                    data-testid={`button-popular-region-${region.code}`}
                  >
                    <span className="text-lg" aria-hidden="true">{getCountryFlag(region.code)}</span>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-medium text-sm">{region.name}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{region.currencySymbol}</span>
                    {selectedRegion.code === region.code && (
                      <Check className="h-4 w-4 text-primary" aria-label="Currently selected" />
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Globe className="h-3 w-3" aria-hidden="true" />
              <span>{searchQuery ? t("region.results_for", { query: searchQuery }) : t("region.all_countries")}</span>
              <Badge variant="secondary" className="ml-auto text-[10px]">
                {filteredRegions.length}
              </Badge>
            </div>
            
            {Object.entries(groupedRegions).map(([continent, continentRegions]) => (
              <div key={continent} className="mb-4" role="group" aria-label={continentLabels[continent] || continent}>
                {!searchQuery && (
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-2">
                    {continentLabels[continent] || continent}
                  </p>
                )}
                <div className="space-y-0.5">
                  {continentRegions.map((region) => (
                    <Button
                      key={region.code}
                      variant="ghost"
                      onClick={() => handleRegionChange(region)}
                      className="w-full flex items-center gap-3 h-auto py-2 justify-start"
                      data-testid={`button-region-${region.code}`}
                    >
                      <span className="text-lg" aria-hidden="true">{getCountryFlag(region.code)}</span>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-medium text-sm truncate">{region.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {region.currency} {region.language ? `• ${region.language}` : ''}
                        </p>
                      </div>
                      <span className="text-xs font-medium">{region.currencySymbol}</span>
                      {selectedRegion.code === region.code && (
                        <Check className="h-4 w-4 text-primary shrink-0" aria-label="Currently selected" />
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            ))}

            {filteredRegions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground" role="status">
                <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
                <p className="text-sm">{t("region.no_results")}</p>
                <p className="text-xs">{t("region.try_different")}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-2 border-t bg-muted/30 text-center">
          <p className="text-[10px] text-muted-foreground">
            {t("region.countries_supported", { count: regions.length })}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
