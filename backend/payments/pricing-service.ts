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
      (sum, item) => sum + BigInt(Math.round(item.product.price * 100)) * BigInt(item.quantity),
      BigInt(0),
    );
    const taxMinor = (subtotalMinor * BigInt(2000)) / BigInt(10000);
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
