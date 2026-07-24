import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type CheckoutPaymentMethod = "mock" | "manual";

export function PaymentMethodSelector({
  value,
  onChange,
}: {
  value: CheckoutPaymentMethod;
  onChange(value: CheckoutPaymentMethod): void;
}) {
  return (
    <RadioGroup value={value} onValueChange={(next) => onChange(next as CheckoutPaymentMethod)} className="space-y-3">
      <label className="flex items-start gap-3 rounded-xl border border-border p-4 cursor-pointer hover:border-primary/60">
        <RadioGroupItem value="mock" className="mt-0.5" />
        <span>
          <span className="block font-semibold text-sm">Protected payment (test mode)</span>
          <span className="block text-xs text-muted-foreground mt-1">
            Uses the provider-neutral sandbox flow. No real money is collected.
          </span>
        </span>
      </label>
      {["Stripe", "PayPal", "Razorpay"].map((provider) => (
        <div key={provider} className="flex items-start gap-3 rounded-xl border border-border p-4 opacity-60" aria-disabled="true">
          <RadioGroupItem value={provider.toLowerCase()} disabled className="mt-0.5" />
          <span>
            <span className="block font-semibold text-sm">{provider}</span>
            <span className="block text-xs text-muted-foreground mt-1">Not activated for the new checkout architecture</span>
          </span>
        </div>
      ))}
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
