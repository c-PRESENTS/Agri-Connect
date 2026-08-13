import { useMutation } from "@tanstack/react-query";
import { createCheckoutQuote, createCheckoutIntent, type CheckoutProvider } from "@/lib/payment-client";

export function usePaymentCheckout() {
  return useMutation({
    mutationFn: async (input: {
      deliveryAddress: string;
      provider: CheckoutProvider;
      captchaToken: string;
      currency: "GBP";
      deliveryMethod: "standard" | "pickup";
      sellerIds: string[];
      shippingChoices: Record<string, { partnerId: string; service: string }>;
      deliveryAddressStruct: {
        name: string; phone: string; email?: string; line1: string; line2?: string;
        city: string; county?: string; postcode: string; country: string;
      };
    }) => {
      const quote = await createCheckoutQuote({
        currency: input.currency,
        deliveryMethod: input.deliveryMethod,
        sellerIds: input.sellerIds,
        shippingChoices: input.shippingChoices,
        deliveryAddressStruct: input.deliveryAddressStruct,
      });
      const idempotencyKey = crypto.randomUUID();
      return createCheckoutIntent(
        quote.id,
        idempotencyKey,
        input.provider,
        input.captchaToken,
      );
    },
  });
}
