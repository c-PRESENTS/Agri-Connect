export const BASE_CURRENCY = "GBP";

const digitsCache = new Map<string, number>();
const formatterCache = new Map<string, Intl.NumberFormat>();

export function currencyFractionDigits(currency: string, locale = "en-GB"): number {
  const key = `${currency}_${locale}`;
  const cached = digitsCache.get(key);
  if (cached !== undefined) return cached;

  try {
    const digits = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
    digitsCache.set(key, digits);
    return digits;
  } catch {
    digitsCache.set(key, 2);
    return 2;
  }
}

export function convertCurrencyAmount(
  amount: number,
  sourceCurrency: string,
  targetCurrency: string,
  rates: Record<string, number>,
): number {
  if (!Number.isFinite(amount)) return amount;
  const source = sourceCurrency.toUpperCase();
  const target = targetCurrency.toUpperCase();
  if (source === target) return amount;

  const sourceRate = source === BASE_CURRENCY ? 1 : rates[source];
  const targetRate = target === BASE_CURRENCY ? 1 : rates[target];
  if (!sourceRate || !targetRate) return amount;

  // Normalize the source amount to minor units before conversion. This avoids
  // propagating binary floating-point noise from product prices.
  const sourceDigits = currencyFractionDigits(source);
  const sourceScale = 10 ** sourceDigits;
  const sourceMinor = Math.round(amount * sourceScale);
  const baseMajor = sourceMinor / sourceScale / sourceRate;
  return baseMajor * targetRate;
}

function getFormatter(currency: string, locale: string): Intl.NumberFormat {
  const key = `${currency}_${locale || "en-GB"}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(locale || "en-GB", {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
      });
    } catch {
      formatter = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
        currencyDisplay: "narrowSymbol",
      });
    }
    formatterCache.set(key, formatter);
  }
  return formatter;
}

export function formatCurrencyAmount(
  amount: number,
  currency: string,
  locale: string,
  includeCode = false,
): string {
  if (!Number.isFinite(amount)) return "Price on request";
  const formatter = getFormatter(currency, locale);
  const formatted = formatter.format(amount);
  return includeCode ? `${formatted}\u00A0·\u00A0${currency}` : formatted;
}
