import type { ProviderName } from "./types";

type MetricName =
  | "provider_calls"
  | "webhooks"
  | "reconciliations"
  | "refunds"
  | "payouts"
  | "provider_reviews";

interface MetricKey {
  name: MetricName;
  provider: ProviderName | "system";
  outcome: string;
}

function keyOf(metric: MetricKey): string {
  return `${metric.name}|${metric.provider}|${metric.outcome}`;
}

class PaymentMetrics {
  private readonly counters = new Map<string, number>();

  increment(name: MetricName, provider: ProviderName | "system", outcome: string): void {
    const key = keyOf({ name, provider, outcome });
    this.counters.set(key, (this.counters.get(key) ?? 0) + 1);
  }

  snapshot(): Array<MetricKey & { count: number }> {
    return Array.from(this.counters, ([key, count]) => {
      const [name, provider, outcome] = key.split("|");
      return {
        name: name as MetricName,
        provider: provider as ProviderName | "system",
        outcome,
        count,
      };
    });
  }
}

export const paymentMetrics = new PaymentMetrics();

