import { useMutation } from "@tanstack/react-query";
import { createCheckoutQuote, createMockCheckoutIntent } from "@/lib/payment-client";

export function usePaymentCheckout() {
  return useMutation({
    mutationFn: async (input: {
      deliveryAddress: string;
      shippingChoices: Record<string, { partnerId: string; service: string }>;
      deliveryAddressStruct: {
        name: string; phone: string; email?: string; line1: string; line2?: string;
        city: string; county?: string; postcode: string; country: string;
      };
    }) => {
      const quote = await createCheckoutQuote({
        deliveryMethod: "standard",
        shippingChoices: input.shippingChoices,
        deliveryAddressStruct: input.deliveryAddressStruct,
      });
      const idempotencyKey = crypto.randomUUID();
      return createMockCheckoutIntent(quote.id, input.deliveryAddress, idempotencyKey);
    },
  });
}
