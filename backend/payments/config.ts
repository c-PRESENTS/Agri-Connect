import { z } from "zod";

export const paymentProviderSchema = z.enum(["stripe", "paypal", "razorpay"]);
export type PaymentProvider = z.infer<typeof paymentProviderSchema>;

export const paymentCurrencySchema = z.enum(["GBP", "INR"]);
export type PaymentCurrency = z.infer<typeof paymentCurrencySchema>;

const paymentModeSchema = z.enum(["mock", "sandbox", "live"]);

function commaSeparated<T extends string>(
  value: string | undefined,
  schema: z.ZodType<T>,
): T[] {
  if (!value?.trim()) return [];
  const values = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return Array.from(new Set(values.map((entry) => schema.parse(entry))));
}

function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received "${value}"`);
  }
  return parsed;
}

function nonNegativeInteger(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Expected a non-negative integer, received "${value}"`);
  }
  return parsed;
}

export interface PaymentRuntimeConfig {
  mode: z.infer<typeof paymentModeSchema>;
  requestedProviders: PaymentProvider[];
  supportedCurrencies: PaymentCurrency[];
  defaultCurrency: PaymentCurrency;
  returnBaseUrl?: string;
  platformFeeBps: number;
  quoteTtlMinutes: number;
  reservationTtlMinutes: number;
  reconciliationIntervalMinutes: number;
  webhookRetentionDays: number;
  releaseDelayHours: number;
  /**
   * Phase 0-2 are deliberately inert. Phase 3 must replace this guard with
   * server-authoritative provider activation and capability checks.
   */
  providerExecutionEnabled: false;
}

export function loadPaymentRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env,
): PaymentRuntimeConfig {
  const mode = paymentModeSchema.parse(environment.PAYMENTS_MODE ?? "mock");
  const requestedProviders = commaSeparated(
    environment.PAYMENTS_ENABLED_PROVIDERS,
    paymentProviderSchema,
  );
  const supportedCurrencies = commaSeparated(
    environment.PAYMENT_SUPPORTED_CURRENCIES ?? "GBP,INR",
    paymentCurrencySchema,
  );
  const defaultCurrency = paymentCurrencySchema.parse(
    environment.PAYMENT_DEFAULT_CURRENCY ?? "GBP",
  );

  if (!supportedCurrencies.includes(defaultCurrency)) {
    throw new Error("PAYMENT_DEFAULT_CURRENCY must be included in PAYMENT_SUPPORTED_CURRENCIES");
  }

  const returnBaseUrl = environment.PAYMENT_RETURN_BASE_URL?.trim() || undefined;
  if (returnBaseUrl) {
    const parsedUrl = new URL(returnBaseUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("PAYMENT_RETURN_BASE_URL must use http or https");
    }
  }

  if (mode === "live" && requestedProviders.length > 0) {
    throw new Error(
      "Live payment providers remain disabled through Phase 2; provider activation belongs to Phase 3 or later",
    );
  }

  return {
    mode,
    requestedProviders,
    supportedCurrencies,
    defaultCurrency,
    returnBaseUrl,
    platformFeeBps: nonNegativeInteger(environment.PAYMENT_PLATFORM_FEE_BPS, 0),
    quoteTtlMinutes: positiveInteger(environment.PAYMENT_QUOTE_TTL_MINUTES, 15),
    reservationTtlMinutes: positiveInteger(environment.PAYMENT_RESERVATION_TTL_MINUTES, 20),
    reconciliationIntervalMinutes: positiveInteger(
      environment.PAYMENT_RECONCILIATION_INTERVAL_MINUTES,
      15,
    ),
    webhookRetentionDays: positiveInteger(environment.PAYMENT_WEBHOOK_RETENTION_DAYS, 90),
    releaseDelayHours: positiveInteger(environment.ESCROW_RELEASE_DELAY_HOURS, 48),
    providerExecutionEnabled: false,
  };
}

export const paymentRuntimeConfig = loadPaymentRuntimeConfig();
