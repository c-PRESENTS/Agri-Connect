import { AlertCircle, CheckCircle2, Loader2, XCircle } from "lucide-react";

export function PaymentStatePanel({ status }: { status: string }) {
  const succeeded = status === "succeeded";
  const failed = status === "failed" || status === "cancelled" || status === "expired";
  const unavailable = status === "unavailable";
  const checking = status === "processing" || status === "created" || status === "requires_action";
  const Icon = succeeded ? CheckCircle2 : failed ? XCircle : checking ? Loader2 : AlertCircle;
  return (
    <div className="text-center">
      <Icon className={`h-12 w-12 mx-auto mb-4 ${checking ? "animate-spin text-primary" : succeeded ? "text-green-600" : failed ? "text-destructive" : "text-amber-600"}`} />
      <h1 className="text-2xl font-black capitalize" data-testid="payment-state">{status.replaceAll("_", " ")}</h1>
      <p className="text-sm text-muted-foreground mt-2">
        {succeeded
          ? "Payment was verified by the server. Opening your order confirmation…"
          : failed
            ? "Stripe did not confirm a successful payment. AgriConnect has not marked this order as paid."
            : unavailable
              ? "AgriConnect cannot reach the payment service. Your payment has not been marked as failed."
              : "AgriConnect is checking the provider result."}
      </p>
    </div>
  );
}
