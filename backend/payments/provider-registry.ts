import type { PaymentProviderAdapter, ProviderName } from "./types";
import { MockPaymentAdapter } from "./providers/mock";
import { StripePaymentAdapter } from "./providers/stripe";
import { PayPalPaymentAdapter } from "./providers/paypal";
import { RazorpayPaymentAdapter } from "./providers/razorpay";

export class ProviderRegistry {
  private readonly adapters = new Map<ProviderName, PaymentProviderAdapter>();

  register(adapter: PaymentProviderAdapter): void {
    if (this.adapters.has(adapter.name)) {
      throw new Error(`Payment provider already registered: ${adapter.name}`);
    }
    this.adapters.set(adapter.name, adapter);
  }

  get(provider: ProviderName): PaymentProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new Error(`Payment provider is not available: ${provider}`);
    return adapter;
  }

  has(provider: ProviderName): boolean {
    return this.adapters.has(provider);
  }
}

export const providerRegistry = new ProviderRegistry();
providerRegistry.register(new MockPaymentAdapter());
providerRegistry.register(new StripePaymentAdapter());
providerRegistry.register(new PayPalPaymentAdapter());
providerRegistry.register(new RazorpayPaymentAdapter());
