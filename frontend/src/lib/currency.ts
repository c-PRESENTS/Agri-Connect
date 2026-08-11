export const BASE_CURRENCY = "GBP";

export function currencyFractionDigits(currency: string, locale = "en-GB"): number {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
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

export function formatCurrencyAmount(
  amount: number,
  currency: string,
  locale: string,
  includeCode = false,
): string {
  if (!Number.isFinite(amount)) return "Price on request";
  const formatted = new Intl.NumberFormat(locale || "en-GB", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(amount);
  return includeCode ? `${formatted}\u00A0·\u00A0${currency}` : formatted;
}
