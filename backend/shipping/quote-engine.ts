import type { QuoteShipmentInput, ShipQuote, ShipServiceType, ShipAddress } from "@shared/schema";

/**
 * Coverage type for a partner.
 *  - "uk_only": domestic UK (and Crown deps) — ignored if either endpoint is non-UK
 *  - "europe": ships within Europe (incl. UK) — ignored if either endpoint is outside Europe
 *  - "worldwide": ships anywhere
 */
export type Coverage = "uk_only" | "europe" | "worldwide";

export interface RateCard {
  partnerId: string;
  partnerName: string;
  partnerLogo?: string;
  service: ShipServiceType;
  baseFare: number;
  perKm: number;
  perKg: number;
  coldChainSurchargePct: number;
  fragileSurcharge: number;
  speedKmh: number;
  minPrice: number;
  rating: number;
  co2PerKgPerKm: number;
  coldChainCapable: boolean;
  notes?: string;
  coverage: Coverage;
  /** Optional flat customs/handling fee added when crossing borders. */
  intlSurcharge?: number;
}

/**
 * Rate cards are based on real-world 3rd-party carrier published minimums
 * (Apr 2026). AgriConnect aggregates these — we don't operate trucks ourselves
 * (apart from the community-organised Farmer Milk Run network).
 */
export const RATE_CARDS: RateCard[] = [
  {
    partnerId: "royal-mail",
    partnerName: "Royal Mail",
    service: "standard",
    baseFare: 3.5,
    perKm: 0.04,
    perKg: 0.6,
    coldChainSurchargePct: 0,
    fragileSurcharge: 1.5,
    speedKmh: 55,
    minPrice: 4.99,
    rating: 4.3,
    co2PerKgPerKm: 0.00012,
    coldChainCapable: false,
    notes: "Tracked 24/48 · 1–2 working days",
    coverage: "uk_only",
  },
  {
    partnerId: "evri",
    partnerName: "Evri",
    service: "standard",
    baseFare: 2.99,
    perKm: 0.035,
    perKg: 0.55,
    coldChainSurchargePct: 0,
    fragileSurcharge: 1.5,
    speedKmh: 50,
    minPrice: 3.95,
    rating: 4.0,
    co2PerKgPerKm: 0.00011,
    coldChainCapable: false,
    notes: "Cheapest UK courier · 2–4 days",
    coverage: "uk_only",
  },
  {
    partnerId: "dpd",
    partnerName: "DPD Local",
    service: "express",
    baseFare: 6.5,
    perKm: 0.18,
    perKg: 0.8,
    coldChainSurchargePct: 0,
    fragileSurcharge: 2.0,
    speedKmh: 80,
    minPrice: 9.99,
    rating: 4.7,
    co2PerKgPerKm: 0.00018,
    coldChainCapable: false,
    notes: "Next-day · 1-hour delivery window",
    coverage: "europe",
  },
  {
    partnerId: "ups",
    partnerName: "UPS",
    service: "express",
    baseFare: 8.0,
    perKm: 0.2,
    perKg: 0.9,
    coldChainSurchargePct: 0,
    fragileSurcharge: 2.5,
    speedKmh: 85,
    minPrice: 12.5,
    rating: 4.5,
    co2PerKgPerKm: 0.00018,
    coldChainCapable: false,
    notes: "Tracked next-day · signature on delivery",
    coverage: "worldwide",
    intlSurcharge: 8,
  },
  {
    partnerId: "agri-cold",
    partnerName: "AgriConnect Cold-Chain Network",
    service: "cold_chain",
    baseFare: 12.0,
    perKm: 0.38,
    perKg: 0.85,
    coldChainSurchargePct: 25,
    fragileSurcharge: 2.5,
    speedKmh: 70,
    minPrice: 18.0,
    rating: 4.6,
    co2PerKgPerKm: 0.00022,
    coldChainCapable: true,
    notes: "Refrigerated 2–8°C · partner cold-fleet aggregator",
    coverage: "europe",
  },
  {
    partnerId: "fedex",
    partnerName: "FedEx International Priority",
    service: "express",
    baseFare: 14.0,
    perKm: 0.12,
    perKg: 1.4,
    coldChainSurchargePct: 0,
    fragileSurcharge: 3.0,
    speedKmh: 600,
    minPrice: 25.0,
    rating: 4.6,
    co2PerKgPerKm: 0.00045,
    coldChainCapable: false,
    notes: "International · 1–3 day air delivery",
    coverage: "worldwide",
    intlSurcharge: 12,
  },
  {
    partnerId: "dhl",
    partnerName: "DHL Express Worldwide",
    service: "express",
    baseFare: 16.0,
    perKm: 0.13,
    perKg: 1.5,
    coldChainSurchargePct: 30,
    fragileSurcharge: 3.0,
    speedKmh: 650,
    minPrice: 28.0,
    rating: 4.7,
    co2PerKgPerKm: 0.00045,
    coldChainCapable: true,
    notes: "International · cold-chain capable · door-to-door",
    coverage: "worldwide",
    intlSurcharge: 15,
  },
  {
    partnerId: "stuart",
    partnerName: "Stuart Same-Day",
    service: "same_day",
    baseFare: 9.0,
    perKm: 0.5,
    perKg: 0.7,
    coldChainSurchargePct: 0,
    fragileSurcharge: 2.0,
    speedKmh: 65,
    minPrice: 14.99,
    rating: 4.4,
    co2PerKgPerKm: 0.00016,
    coldChainCapable: false,
    notes: "Order before 11:00 · same-day local courier",
    coverage: "uk_only",
  },
  {
    partnerId: "agri-milk-run",
    partnerName: "Farmer Milk Run",
    service: "milk_run",
    baseFare: 4.5,
    perKm: 0.08,
    perKg: 0.25,
    coldChainSurchargePct: 0,
    fragileSurcharge: 0.5,
    speedKmh: 50,
    minPrice: 6.99,
    rating: 4.8,
    co2PerKgPerKm: 0.00006,
    coldChainCapable: true,
    notes: "Shared scheduled route · operated by farmer co-op · lowest CO₂",
    coverage: "uk_only",
  },
];

const EARTH_R = 6371;
function deg(d: number) { return (d * Math.PI) / 180; }
export function haversineKm(a: { lat?: number; lng?: number }, b: { lat?: number; lng?: number }): number {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return 0;
  const dLat = deg(b.lat - a.lat);
  const dLng = deg(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(deg(a.lat)) * Math.cos(deg(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(x));
}

// UK postcode-area centroids for fine-grained domestic distance
const UK_POSTCODE_AREA: Record<string, [number, number]> = {
  EX: [50.7184, -3.5339], BS: [51.4545, -2.5879], CF: [51.4816, -3.1791], BA: [51.3811, -2.3590],
  TQ: [50.4619, -3.5253], PL: [50.3755, -4.1427], SW: [51.4875, -0.1687], SE: [51.4875, -0.0739],
  N1: [51.5380, -0.1003], E1: [51.5169, -0.0593], W1: [51.5145, -0.1447], NW: [51.5400, -0.1900],
  EC: [51.5155, -0.0922], WC: [51.5152, -0.1196], M1: [53.4808, -2.2426], M2: [53.4830, -2.2417],
  L1: [53.4084, -2.9916], B1: [52.4862, -1.8904], LS: [53.8008, -1.5491], NE: [54.9784, -1.6174],
  G1: [55.8642, -4.2518], EH: [55.9533, -3.1883], BT: [54.5973, -5.9301], OX: [51.7520, -1.2577],
  CB: [52.2053, 0.1218], NR: [52.6309, 1.2974], IP: [52.0567, 1.1482], CM: [51.7356, 0.4685],
  CT: [51.2787, 1.0789], BN: [50.8225, -0.1372], YO: [53.9590, -1.0815], LN: [53.2344, -0.5383],
};

// Country (capital city) centroids for international routing fallback.
const COUNTRY_CENTROID: Record<string, [number, number]> = {
  GB: [51.5074, -0.1278], IE: [53.3498, -6.2603], US: [38.9072, -77.0369], CA: [45.4215, -75.6972],
  FR: [48.8566, 2.3522], DE: [52.52, 13.405], ES: [40.4168, -3.7038], IT: [41.9028, 12.4964],
  NL: [52.3676, 4.9041], BE: [50.8503, 4.3517], PT: [38.7223, -9.1393], CH: [46.948, 7.4474],
  AT: [48.2082, 16.3738], DK: [55.6761, 12.5683], SE: [59.3293, 18.0686], NO: [59.9139, 10.7522],
  FI: [60.1699, 24.9384], PL: [52.2297, 21.0122], CZ: [50.0755, 14.4378], GR: [37.9838, 23.7275],
  RO: [44.4268, 26.1025], HU: [47.4979, 19.0402], TR: [39.9334, 32.8597], RU: [55.7558, 37.6173],
  UA: [50.4501, 30.5234], IL: [31.7683, 35.2137], AE: [24.4539, 54.3773], SA: [24.7136, 46.6753],
  QA: [25.276987, 51.520008], EG: [30.0444, 31.2357], ZA: [-25.7479, 28.2293], NG: [9.0765, 7.3986],
  KE: [-1.2921, 36.8219], GH: [5.6037, -0.1870], MA: [33.9716, -6.8498], ET: [9.0320, 38.7469],
  TZ: [-6.3690, 34.8888], UG: [0.3476, 32.5825], IN: [28.6139, 77.2090], PK: [33.6844, 73.0479],
  BD: [23.8103, 90.4125], LK: [6.9271, 79.8612], CN: [39.9042, 116.4074], HK: [22.3193, 114.1694],
  JP: [35.6762, 139.6503], KR: [37.5665, 126.9780], TW: [25.0330, 121.5654], SG: [1.3521, 103.8198],
  MY: [3.1390, 101.6869], TH: [13.7563, 100.5018], VN: [21.0285, 105.8542], PH: [14.5995, 120.9842],
  ID: [-6.2088, 106.8456], AU: [-35.2809, 149.1300], NZ: [-41.2865, 174.7762], MX: [19.4326, -99.1332],
  BR: [-15.7975, -47.8919], AR: [-34.6037, -58.3816], CL: [-33.4489, -70.6693], CO: [4.7110, -74.0721],
  PE: [-12.0464, -77.0428], VE: [10.4806, -66.9036], UY: [-34.9011, -56.1645],
};

const UK_NAMES = new Set([
  "GB", "UK", "GBR", "GREATBRITAIN", "GREATBRITAIN&NI",
  "UNITEDKINGDOM", "ENGLAND", "SCOTLAND", "WALES", "NORTHERNIRELAND",
]);

const EUROPE_CODES = new Set([
  "GB", "IE", "FR", "DE", "ES", "IT", "NL", "BE", "PT", "CH", "AT", "DK",
  "SE", "NO", "FI", "PL", "CZ", "GR", "RO", "HU", "UA",
]);

/** Normalise a free-text country field into an ISO-2 country code where possible. */
export function normaliseCountry(country: string | undefined | null): string | undefined {
  if (!country) return undefined;
  const cleaned = country.trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (!cleaned) return undefined;
  if (UK_NAMES.has(cleaned)) return "GB";
  if (cleaned.length === 2 && COUNTRY_CENTROID[cleaned]) return cleaned;
  // Common name → code mapping for the larger destinations.
  const map: Record<string, string> = {
    UNITEDSTATES: "US", USA: "US", AMERICA: "US",
    UNITEDARABEMIRATES: "AE", UAE: "AE",
    SOUTHKOREA: "KR", KOREA: "KR",
    SOUTHAFRICA: "ZA",
    SAUDIARABIA: "SA",
    NEWZEALAND: "NZ",
    HONGKONG: "HK",
  };
  if (map[cleaned]) return map[cleaned];
  // Try first 2 letters as ISO-2 last (e.g. "FRANCE" → "FR" matches France centroid by coincidence; safer to match by code only)
  return undefined;
}

function isUk(country?: string | null): boolean {
  return normaliseCountry(country) === "GB";
}

/** Server-side geocoder. Ignores any client-supplied lat/lng to prevent price tampering. */
export function geocodePostcode(addr: Pick<ShipAddress, "postcode" | "country">): { lat: number; lng: number } {
  const code = normaliseCountry(addr.country);
  // International: country centroid only (postcode formats vary too widely without a real geocoder).
  if (code && code !== "GB") {
    const c = COUNTRY_CENTROID[code];
    if (c) return { lat: c[0], lng: c[1] };
  }
  const pc = (addr.postcode || "").toUpperCase().replace(/\s+/g, "");
  for (const key of Object.keys(UK_POSTCODE_AREA)) {
    if (pc.startsWith(key)) {
      const [lat, lng] = UK_POSTCODE_AREA[key];
      const seed = pc.charCodeAt(pc.length - 1) || 0;
      return { lat: lat + (seed % 7) * 0.01, lng: lng + (seed % 5) * 0.01 };
    }
  }
  // Fallback: UK centre
  return { lat: 52.3, lng: -1.0 };
}

function partnerCoversRoute(card: RateCard, pickupCC: string, dropCC: string): boolean {
  const isInternational = pickupCC !== dropCC;
  switch (card.coverage) {
    case "uk_only":
      return pickupCC === "GB" && dropCC === "GB";
    case "europe":
      return EUROPE_CODES.has(pickupCC) && EUROPE_CODES.has(dropCC);
    case "worldwide":
      // Worldwide carriers are pricier — only show when route is genuinely cross-border or non-UK.
      return isInternational || pickupCC !== "GB" || dropCC !== "GB";
  }
}

export function calculateQuotes(input: QuoteShipmentInput): { distanceKm: number; weightKg: number; quotes: ShipQuote[] } {
  // Always derive coords from postcode/country server-side (ignore any client lat/lng)
  const pickupLL = geocodePostcode({ postcode: input.pickup.postcode, country: input.pickup.country });
  const dropLL = geocodePostcode({ postcode: input.drop.postcode, country: input.drop.country });
  const pickupCC = normaliseCountry(input.pickup.country);
  const dropCC = normaliseCountry(input.drop.country);
  if (!pickupCC) throw new Error(`Unsupported pickup country: ${input.pickup.country}`);
  if (!dropCC) throw new Error(`Unsupported destination country: ${input.drop.country}`);
  const isInternational = pickupCC !== dropCC;
  const distanceKm = Math.max(1, Math.round(haversineKm(pickupLL, dropLL) * 10) / 10);
  const weightKg = Math.max(0.1, input.items.reduce((s, i) => s + i.weightKg * i.quantity, 0));
  const needsCold = input.items.some((i) => i.coldChain);
  const hasFragile = input.items.some((i) => i.fragile);
  const requestedService = input.service;
  const now = Date.now();
  const expiresAt = new Date(now + 15 * 60_000).toISOString();

  const quotes: ShipQuote[] = RATE_CARDS
    .filter((r) => partnerCoversRoute(r, pickupCC, dropCC))
    .filter((r) => (needsCold ? r.coldChainCapable : true))
    .filter((r) => (requestedService ? r.service === requestedService : true))
    .map((r) => {
      let price = r.baseFare + r.perKm * distanceKm + r.perKg * weightKg;
      if (needsCold && r.coldChainSurchargePct > 0) price *= 1 + r.coldChainSurchargePct / 100;
      if (hasFragile) price += r.fragileSurcharge;
      if (isInternational && r.intlSurcharge) price += r.intlSurcharge;
      price = Math.max(r.minPrice, price);
      price = Math.round(price * 100) / 100;
      const etaHours = Math.max(2, Math.round((distanceKm / r.speedKmh) * 10) / 10 + (r.service === "express" || r.service === "same_day" ? 1 : 6));
      const co2Kg = Math.round(weightKg * distanceKm * r.co2PerKgPerKm * 1000) / 1000;
      const etaWindow = etaHours <= 12 ? `~${Math.round(etaHours)}h` : `${Math.ceil(etaHours / 24)}–${Math.ceil(etaHours / 24) + 1} days`;
      return {
        id: `q_${r.partnerId}_${now}`,
        partnerId: r.partnerId,
        partnerName: r.partnerName,
        partnerLogo: r.partnerLogo,
        service: r.service,
        price,
        currency: "GBP",
        etaHours,
        etaWindow,
        coldChain: r.coldChainCapable,
        co2Kg,
        rating: r.rating,
        notes: r.notes,
        expiresAt,
      };
    })
    .sort((a, b) => a.price - b.price);

  return { distanceKm, weightKg, quotes };
}

export function rateCardById(partnerId: string): RateCard | undefined {
  return RATE_CARDS.find((r) => r.partnerId === partnerId);
}

/**
 * Variant of calculateQuotes that takes pre-resolved coordinates (e.g.
 * a farmer's stored lat/lng) instead of geocoding from postcode. Used by
 * the cart → shipping handoff so we can quote based on the actual farm
 * location even when we don't have a structured postcode for it.
 *
 * Note: country codes are still required because partner coverage
 * (uk_only / europe / worldwide) and intlSurcharge depend on them.
 */
export function calculateQuotesFromCoords(input: {
  pickup: { lat: number; lng: number; country: string };
  drop: { lat: number; lng: number; country: string };
  items: { name: string; quantity: number; weightKg: number; coldChain?: boolean; fragile?: boolean }[];
  service?: ShipServiceType;
}): { distanceKm: number; weightKg: number; quotes: ShipQuote[] } {
  const pickupCC = normaliseCountry(input.pickup.country);
  const dropCC = normaliseCountry(input.drop.country);
  if (!pickupCC) throw new Error(`Unsupported pickup country: ${input.pickup.country}`);
  if (!dropCC) throw new Error(`Unsupported destination country: ${input.drop.country}`);
  const isInternational = pickupCC !== dropCC;
  const distanceKm = Math.max(1, Math.round(haversineKm(input.pickup, input.drop) * 10) / 10);
  const weightKg = Math.max(0.1, input.items.reduce((s, i) => s + i.weightKg * i.quantity, 0));
  const needsCold = input.items.some((i) => i.coldChain);
  const hasFragile = input.items.some((i) => i.fragile);
  const requestedService = input.service;
  const now = Date.now();
  const expiresAt = new Date(now + 15 * 60_000).toISOString();
  const quotes: ShipQuote[] = RATE_CARDS
    .filter((r) => partnerCoversRoute(r, pickupCC, dropCC))
    .filter((r) => (needsCold ? r.coldChainCapable : true))
    .filter((r) => (requestedService ? r.service === requestedService : true))
    .map((r) => {
      let price = r.baseFare + r.perKm * distanceKm + r.perKg * weightKg;
      if (needsCold && r.coldChainSurchargePct > 0) price *= 1 + r.coldChainSurchargePct / 100;
      if (hasFragile) price += r.fragileSurcharge;
      if (isInternational && r.intlSurcharge) price += r.intlSurcharge;
      price = Math.max(r.minPrice, price);
      price = Math.round(price * 100) / 100;
      const etaHours = Math.max(2, Math.round((distanceKm / r.speedKmh) * 10) / 10 + (r.service === "express" || r.service === "same_day" ? 1 : 6));
      const co2Kg = Math.round(weightKg * distanceKm * r.co2PerKgPerKm * 1000) / 1000;
      const etaWindow = etaHours <= 12 ? `~${Math.round(etaHours)}h` : `${Math.ceil(etaHours / 24)}–${Math.ceil(etaHours / 24) + 1} days`;
      return {
        id: `q_${r.partnerId}_${now}`,
        partnerId: r.partnerId,
        partnerName: r.partnerName,
        partnerLogo: r.partnerLogo,
        service: r.service,
        price, currency: "GBP", etaHours, etaWindow,
        coldChain: r.coldChainCapable, co2Kg, rating: r.rating,
        notes: r.notes, expiresAt,
      };
    })
    .sort((a, b) => a.price - b.price);
  return { distanceKm, weightKg, quotes };
}
