import type { CartItem } from "@shared/schema";
import type { Money } from "./types";
import type { PaymentCurrency } from "./config";

export interface CheckoutPricing {
  subtotal: Money;
  tax: Money;
  shipping: Money;
  platformFee: Money;
  total: Money;
}

export class PricingService {
  quote(
    items: CartItem[],
    currency: PaymentCurrency,
    shippingMinor: bigint,
    platformFeeBps: number,
  ): CheckoutPricing {
    const subtotalMinor = items.reduce(
      (sum, item) =>
        sum +
        BigInt(Math.round((item.unitPrice ?? item.product.price) * 100)) *
          BigInt(item.quantity),
      BigInt(0),
    );
    // Lean MVP catalog prices are tax-inclusive. Do not add a blanket tax
    // percentage across products with different tax treatment.
    const taxMinor = BigInt(0);
    const platformFeeMinor = (subtotalMinor * BigInt(platformFeeBps)) / BigInt(10000);
    const totalMinor = subtotalMinor + taxMinor + shippingMinor + platformFeeMinor;
    const money = (amountMinor: bigint): Money => ({ currency, amountMinor: amountMinor.toString() });
    return {
      subtotal: money(subtotalMinor),
      tax: money(taxMinor),
      shipping: money(shippingMinor),
      platformFee: money(platformFeeMinor),
      total: money(totalMinor),
    };
  }
}

export const pricingService = new PricingService();
