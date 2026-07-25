import { useMutation, useQuery } from "@tanstack/react-query";
import { Activity, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OperatorProviderConfiguration } from "./operator-provider-configuration";

interface ProviderHealth {
  provider: string;
  mode: string;
  status: string;
  suspension_reason?: string | null;
  last_webhook_received_at?: string | null;
  capabilities_expires_at?: string | null;
}

interface ReconciliationItem {
  id: string;
  provider: string;
  payment_status: string;
  provider_call_status: string;
  reconciliation_status: string;
}

interface RecoveryCase {
  id: string;
  case_type: string;
  aggregate_id: string;
  status: string;
}

interface ProviderReadiness {
  provider: "stripe" | "paypal" | "razorpay";
  ready: boolean;
  reasons: string[];
  checks: Record<string, boolean>;
  checkedAt: string;
}

export function OperatorPaymentOperations() {
  const { data: overview } = useQuery<{
    providers: ProviderHealth[];
    counts: Record<string, number>;
  }>({ queryKey: ["/api/payments/operator/overview"] });
  const { data: reconciliation } = useQuery<{ items: ReconciliationItem[] }>({
    queryKey: ["/api/payments/operator/reconciliation"],
  });
  const { data: recoveries } = useQuery<{ items: RecoveryCase[] }>({
    queryKey: ["/api/payments/operator/recovery-cases"],
  });
  const { data: readiness } = useQuery<{ mode: string; providers: ProviderReadiness[] }>({
    queryKey: ["/api/payments/operator/providers/readiness"],
  });
  const runReconciliation = useMutation({
    mutationFn: (attemptId: string) =>
      apiRequest("POST", `/api/payments/operator/reconciliation/${attemptId}/run`, {}),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["/api/payments/operator/reconciliation"] }),
  });
  const updateRecovery = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "acknowledged" | "resolved" }) =>
      apiRequest("PATCH", `/api/payments/operator/recovery-cases/${id}`, { status }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["/api/payments/operator/recovery-cases"] }),
  });
  const providerAction = useMutation({
    mutationFn: ({ provider, action }: { provider: string; action: "validate" | "activate" }) =>
      apiRequest("POST", `/api/payments/operator/providers/${provider}/${action}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/operator/providers/readiness"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/operator/overview"] });
    },
  });
  const runDrill = useMutation({
    mutationFn: () => apiRequest("POST", "/api/payments/operator/recovery-drill", {}),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/operator/recovery-cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/operator/overview"] });
    },
  });
  const suspendProvider = useMutation({
    mutationFn: ({ provider, reason }: { provider: string; reason: string }) =>
      apiRequest("POST", `/api/payments/operator/providers/${provider}/suspend`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/operator/providers/readiness"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/operator/overview"] });
    },
  });
  return (
    <section className="mt-5 space-y-5" aria-labelledby="operator-payment-health-heading">
      <Card>
        <CardContent className="p-4">
          <h2 id="operator-payment-health-heading" className="flex items-center gap-2 font-semibold">
            <Activity className="h-4 w-4 text-primary" /> Payment provider health
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {(overview?.providers ?? []).map((provider) => (
              <div key={provider.provider} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium capitalize">{provider.provider}</p>
                  <Badge variant={provider.status === "active" ? "default" : "secondary"}>
                    {provider.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{provider.mode}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Webhook: {provider.last_webhook_received_at
                    ? new Date(provider.last_webhook_received_at).toLocaleString()
                    : "no verified delivery"}
                </p>
                {provider.suspension_reason && (
                  <p className="mt-1 text-xs text-destructive">{provider.suspension_reason}</p>
                )}
              </div>
            ))}
          </div>
          {overview?.counts && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(overview.counts).map(([label, count]) => (
                <Badge key={label} variant={count > 0 ? "destructive" : "secondary"}>
                  {label.replaceAll("_", " ")}: {count}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <OperatorProviderConfiguration />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="h-4 w-4 text-primary" /> Provider readiness
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Mode: {readiness?.mode ?? "loading"}. Activation checks credentials, approvals,
                capabilities, and registered webhooks on the server.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={runDrill.isPending}
              onClick={() => runDrill.mutate()}
            >
              Run recovery drill
            </Button>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {(readiness?.providers ?? []).map((provider) => (
              <div key={provider.provider} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium capitalize">{provider.provider}</p>
                  <Badge variant={provider.ready ? "default" : "secondary"}>
                    {provider.ready ? "ready" : "blocked"}
                  </Badge>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {provider.reasons.length === 0 ? (
                    <li>All configured checks passed.</li>
                  ) : (
                    provider.reasons.slice(0, 5).map((reason) => (
                      <li key={reason}>{reason.replaceAll("_", " ")}</li>
                    ))
                  )}
                </ul>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={providerAction.isPending}
                    onClick={() => providerAction.mutate({ provider: provider.provider, action: "validate" })}
                  >
                    Validate
                  </Button>
                  <Button
                    size="sm"
                    disabled={providerAction.isPending}
                    onClick={() => providerAction.mutate({ provider: provider.provider, action: "activate" })}
                  >
                    Activate
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={suspendProvider.isPending}
                    onClick={() => {
                      const reason = window.prompt(
                        `Reason for suspending ${provider.provider} (minimum 10 characters):`,
                      );
                      if (reason && reason.trim().length >= 10) {
                        suspendProvider.mutate({ provider: provider.provider, reason: reason.trim() });
                      }
                    }}
                  >
                    Suspend
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <RefreshCw className="h-4 w-4 text-primary" /> Reconciliation attention
          </h2>
          {(reconciliation?.items ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No payment attempts require reconciliation.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {reconciliation!.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.provider} · {item.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.payment_status} / {item.provider_call_status} / {item.reconciliation_status}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={runReconciliation.isPending}
                    onClick={() => runReconciliation.mutate(item.id)}
                  >
                    Reconcile
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-4 w-4 text-amber-500" /> Recovery cases
          </h2>
          {(recoveries?.items ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No open recovery cases.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {recoveries!.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.case_type.replaceAll("_", " ")}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.aggregate_id}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateRecovery.mutate({ id: item.id, status: "acknowledged" })}
                  >
                    Acknowledge
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateRecovery.mutate({ id: item.id, status: "resolved" })}
                  >
                    Resolve
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
