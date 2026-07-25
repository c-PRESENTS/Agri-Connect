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
  idempotencyRetentionDays: number;
  operationalRetentionDays: number;
  providerReviewIntervalMinutes: number;
  maintenanceIntervalHours: number;
  releaseDelayHours: number;
  disputeFilingDays: number;
  disputeResponseDays: number;
  providerExecutionEnabled: boolean;
  uiPreviewEnabled: boolean;
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
    idempotencyRetentionDays: positiveInteger(environment.PAYMENT_IDEMPOTENCY_RETENTION_DAYS, 30),
    operationalRetentionDays: positiveInteger(environment.PAYMENT_OPERATIONAL_RETENTION_DAYS, 365),
    providerReviewIntervalMinutes: positiveInteger(
      environment.PAYMENT_PROVIDER_REVIEW_INTERVAL_MINUTES,
      60,
    ),
    maintenanceIntervalHours: positiveInteger(environment.PAYMENT_MAINTENANCE_INTERVAL_HOURS, 1),
    releaseDelayHours: positiveInteger(environment.ESCROW_RELEASE_DELAY_HOURS, 48),
    disputeFilingDays: positiveInteger(environment.PAYMENT_DISPUTE_FILING_DAYS, 30),
    disputeResponseDays: positiveInteger(environment.PAYMENT_DISPUTE_RESPONSE_DAYS, 7),
    providerExecutionEnabled: requestedProviders.length > 0,
    uiPreviewEnabled:
      environment.NODE_ENV !== "production" &&
      mode !== "live" &&
      environment.PAYMENT_UI_PREVIEW_ENABLED === "true",
  };
}

export const paymentRuntimeConfig = loadPaymentRuntimeConfig();
