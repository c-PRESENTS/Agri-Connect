import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PayoutFailure {
  id: string;
  order_id: string;
  provider: string;
  failure_code?: string | null;
}

interface RefundFailure {
  id: string;
  order_id: string;
  provider: string;
  failure_code?: string | null;
}

export function OperatorPayoutRecovery() {
  const { data } = useQuery<{ failures: PayoutFailure[] }>({
    queryKey: ["/api/payments/operator/payout-failures"],
  });
  const retry = useMutation({
    mutationFn: (allocationId: string) =>
      apiRequest("POST", `/api/payments/operator/payouts/${allocationId}/retry`, {}),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["/api/payments/operator/payout-failures"] }),
  });
  const { data: refundData } = useQuery<{ failures: RefundFailure[] }>({
    queryKey: ["/api/payments/operator/refund-failures"],
  });
  const retryRefund = useMutation({
    mutationFn: (refundId: string) =>
      apiRequest("POST", `/api/payments/operator/refunds/${refundId}/retry`, {}),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["/api/payments/operator/refund-failures"] }),
  });
  const failures = data?.failures ?? [];
  const refundFailures = refundData?.failures ?? [];
  return (
    <Card className="mt-5">
      <CardContent className="p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Payout recovery
        </h2>
        {failures.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No failed seller payouts.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {failures.map((failure) => (
              <div key={failure.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {failure.provider} · order {failure.order_id}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {failure.failure_code || "Provider payout failed"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={retry.isPending}
                  onClick={() => retry.mutate(failure.id)}
                >
                  <RefreshCw className="mr-1 h-3.5 w-3.5" /> Retry
                </Button>
              </div>
            ))}
          </div>
        )}
        <h3 className="mt-5 font-medium">Refund recovery</h3>
        {refundFailures.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No failed refunds.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {refundFailures.map((failure) => (
              <div key={failure.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {failure.provider} · order {failure.order_id}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {failure.failure_code || "Provider refund failed"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={retryRefund.isPending}
                  onClick={() => retryRefund.mutate(failure.id)}
                >
                  <RefreshCw className="mr-1 h-3.5 w-3.5" /> Retry
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
