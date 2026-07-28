import { useMutation } from "@tanstack/react-query";
import { createCheckoutQuote, createCheckoutIntent, type CheckoutProvider } from "@/lib/payment-client";

export function usePaymentCheckout() {
  return useMutation({
    mutationFn: async (input: {
      deliveryAddress: string;
      provider: CheckoutProvider;
      currency: "GBP" | "INR";
      deliveryMethod: "standard" | "pickup";
      shippingChoices: Record<string, { partnerId: string; service: string }>;
      deliveryAddressStruct: {
        name: string; phone: string; email?: string; line1: string; line2?: string;
        city: string; county?: string; postcode: string; country: string;
      };
    }) => {
      const quote = await createCheckoutQuote({
        currency: input.currency,
        deliveryMethod: input.deliveryMethod,
        shippingChoices: input.shippingChoices,
        deliveryAddressStruct: input.deliveryAddressStruct,
      });
      const idempotencyKey = crypto.randomUUID();
      return createCheckoutIntent(
        quote.id,
        input.deliveryAddress,
        idempotencyKey,
        input.provider,
      );
    },
  });
}
