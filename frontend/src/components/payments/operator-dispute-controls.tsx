import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Scale } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface OperatorDispute {
  id: string;
  order_id: string;
  reason: string;
  status: string;
  currency: string;
  seller_net_minor: string;
  response_due_at?: string | null;
}

export function OperatorDisputeControls() {
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});
  const { data } = useQuery<{ items: OperatorDispute[] }>({
    queryKey: ["/api/payments/operator/disputes"],
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/payments/operator/disputes"] });
  const review = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/payments/operator/disputes/${id}/review`, {}),
    onSuccess: invalidate,
  });
  const resolve = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: "buyer" | "seller" | "split" }) =>
      apiRequest("POST", `/api/payments/operator/disputes/${id}/resolve`, {
        resolution,
        ...(resolution === "split" ? { refundAmountMinor: splitAmounts[id] } : {}),
      }),
    onSuccess: invalidate,
  });
  const disputes = data?.items ?? [];
  return (
    <Card className="mt-5">
      <CardContent className="p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Scale className="h-4 w-4 text-primary" /> Marketplace dispute review
        </h2>
        {disputes.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No marketplace disputes.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {disputes.map((dispute) => (
              <div key={dispute.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Order {dispute.order_id}</p>
                  <Badge variant="secondary">{dispute.status.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {dispute.reason.replaceAll("_", " ")} · seller balance{" "}
                  {new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency: dispute.currency,
                  }).format(Number(dispute.seller_net_minor) / 100)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {dispute.status !== "under_review" && (
                    <Button size="sm" variant="outline" onClick={() => review.mutate(dispute.id)}>
                      Start review
                    </Button>
                  )}
                  <Button size="sm" onClick={() => resolve.mutate({ id: dispute.id, resolution: "buyer" })}>
                    Resolve for buyer
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => resolve.mutate({ id: dispute.id, resolution: "seller" })}>
                    Resolve for seller
                  </Button>
                  <Input
                    className="h-9 w-32"
                    inputMode="numeric"
                    placeholder="Split, minor units"
                    value={splitAmounts[dispute.id] ?? ""}
                    onChange={(event) =>
                      setSplitAmounts((current) => ({ ...current, [dispute.id]: event.target.value.replace(/\D/g, "") }))
                    }
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!splitAmounts[dispute.id]}
                    onClick={() => resolve.mutate({ id: dispute.id, resolution: "split" })}
                  >
                    Split resolution
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
