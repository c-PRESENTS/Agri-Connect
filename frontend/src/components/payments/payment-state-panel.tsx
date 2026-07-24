import { AlertCircle, CheckCircle2, Loader2, XCircle } from "lucide-react";

export function PaymentStatePanel({ status }: { status: string }) {
  const succeeded = status === "succeeded";
  const failed = status === "failed" || status === "cancelled" || status === "expired";
  const Icon = succeeded ? CheckCircle2 : failed ? XCircle : status === "processing" || status === "created" ? Loader2 : AlertCircle;
  return (
    <div className="text-center">
      <Icon className={`h-12 w-12 mx-auto mb-4 ${!succeeded && !failed ? "animate-spin text-primary" : succeeded ? "text-green-600" : "text-destructive"}`} />
      <h1 className="text-2xl font-black capitalize" data-testid="payment-state">{status.replaceAll("_", " ")}</h1>
      <p className="text-sm text-muted-foreground mt-2">
        {succeeded
          ? "Payment was verified by the server."
          : failed
            ? "No successful payment was confirmed."
            : "AgriConnect is checking the provider result."}
      </p>
    </div>
  );
}
