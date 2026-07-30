import { useQuery } from "@tanstack/react-query";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { hasStripeTestPublishableKey } from "@/lib/stripe-config";

export type CheckoutPaymentMethod = "mock" | "stripe" | "paypal" | "razorpay" | "manual";

interface MethodEligibility {
  provider: "mock" | "stripe" | "paypal" | "razorpay";
  eligible: boolean;
  reasons: string[];
  previewOnly?: boolean;
}

export function PaymentMethodSelector({
  value,
  onChange,
  currency,
}: {
  value: CheckoutPaymentMethod;
  onChange(value: CheckoutPaymentMethod, options?: { previewOnly: boolean }): void;
  currency: "GBP" | "INR";
}) {
  const { data } = useQuery<{ methods: MethodEligibility[] }>({
    queryKey: ["/api/payments/methods", currency],
    queryFn: async () => {
      const response = await fetch(`/api/payments/methods?currency=${currency}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Could not load payment methods");
      return response.json();
    },
  });
  const methods = new Map((data?.methods ?? []).map((method) => [method.provider, method]));
  const mockEnabled = methods.get("mock")?.eligible === true;
  const stripePublishableKeyConfigured = hasStripeTestPublishableKey();
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => {
        const method = next as CheckoutPaymentMethod;
        onChange(method, {
          previewOnly: method === "manual" ? false : methods.get(method)?.previewOnly === true,
        });
      }}
      className="space-y-3"
    >
      {mockEnabled && (
        <label className="flex items-start gap-3 rounded-xl border border-border p-4 cursor-pointer hover:border-primary/60">
          <RadioGroupItem value="mock" className="mt-0.5" />
          <span>
            <span className="block font-semibold text-sm">Protected payment (test mode)</span>
            <span className="block text-xs text-muted-foreground mt-1">
              Uses the provider-neutral test flow. No real money is collected.
            </span>
          </span>
        </label>
      )}
      {([
        ["stripe", "Stripe"],
        ["paypal", "PayPal"],
        ["razorpay", "Razorpay"],
      ] as const).map(([provider, label]) => {
        const eligibility = methods.get(provider);
        const enabled =
          eligibility?.eligible === true &&
          (provider !== "stripe" || stripePublishableKeyConfigured);
        return (
        <label
          key={provider}
          className={`flex items-start gap-3 rounded-xl border border-border p-4 ${enabled ? "cursor-pointer hover:border-primary/60" : "opacity-60"}`}
          aria-disabled={!enabled}
        >
          <RadioGroupItem value={provider} disabled={!enabled} className="mt-0.5" />
          <span>
            <span className="block font-semibold text-sm">{label}</span>
            <span className="block text-xs text-muted-foreground mt-1">
              {enabled
                ? eligibility?.previewOnly
                  ? `${label} UI preview — simulated locally with no provider call`
                  : "Protected sandbox payment"
                : eligibility?.reasons.includes("seller_payment_account_ineligible")
                  ? "One or more sellers have not completed provider onboarding"
                  : provider === "stripe" && !stripePublishableKeyConfigured
                    ? "Stripe checkout is not configured"
                  : "Not available for this checkout"}
            </span>
          </span>
        </label>
        );
      })}
      <label className="flex items-start gap-3 rounded-xl border border-border p-4 cursor-pointer hover:border-primary/60">
        <RadioGroupItem value="manual" className="mt-0.5" />
        <span>
          <span className="block font-semibold text-sm">Arrange payment with seller</span>
          <span className="block text-xs text-muted-foreground mt-1">Manual payments are not protected by the online payment flow.</span>
        </span>
      </label>
    </RadioGroup>
  );
}
