import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, FileText, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Allocation {
  id: string;
  seller_id: string;
  currency: string;
  seller_net_minor: string;
  status: string;
}

interface Dispute {
  id: string;
  allocation_id: string;
  status: string;
  reason: string;
  response_due_at?: string | null;
  resolution_data?: { details?: string };
  evidence: Array<{
    id: string;
    evidenceType: string;
    evidenceData?: { text?: string; url?: string };
    createdAt: string;
  }>;
}

const activeStatuses = new Set(["open", "under_review", "resolution_pending", "needs_action"]);

export function OrderDisputes({ orderId, paid }: { orderId: string; paid: boolean }) {
  const { toast } = useToast();
  const [allocationId, setAllocationId] = useState("");
  const [reason, setReason] = useState("not_as_described");
  const [details, setDetails] = useState("");
  const [evidenceText, setEvidenceText] = useState<Record<string, string>>({});
  const { data: allocationData } = useQuery<{ allocations: Allocation[] }>({
    queryKey: ["/api/payments/orders", orderId, "allocations"],
    queryFn: async () => {
      const response = await fetch(`/api/payments/orders/${orderId}/allocations`, { credentials: "include" });
      if (!response.ok) return { allocations: [] };
      return response.json();
    },
    enabled: paid,
  });
  const { data: disputeData } = useQuery<{ disputes: Dispute[] }>({
    queryKey: ["/api/payments/orders", orderId, "disputes"],
    queryFn: async () => {
      const response = await fetch(`/api/payments/orders/${orderId}/disputes`, { credentials: "include" });
      if (!response.ok) return { disputes: [] };
      return response.json();
    },
    enabled: paid,
  });
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/payments/orders", orderId, "allocations"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/payments/orders", orderId, "disputes"] }),
    ]);
  };
  const open = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/payments/orders/${orderId}/disputes`, {
        allocationId,
        reason,
        details,
        evidence: {
          evidenceType: "buyer_statement",
          text: details,
        },
      }),
    onSuccess: async () => {
      setDetails("");
      setAllocationId("");
      await invalidate();
      toast({ title: "Dispute opened", description: "Seller payout is blocked while it is reviewed." });
    },
    onError: (error: Error) =>
      toast({ title: "Could not open dispute", description: error.message, variant: "destructive" }),
  });
  const addEvidence = useMutation({
    mutationFn: ({ disputeId, text }: { disputeId: string; text: string }) =>
      apiRequest("POST", `/api/payments/disputes/${disputeId}/evidence`, {
        evidenceType: "buyer_statement",
        text,
      }),
    onSuccess: async (_, input) => {
      setEvidenceText((current) => ({ ...current, [input.disputeId]: "" }));
      await invalidate();
    },
  });
  const withdraw = useMutation({
    mutationFn: (disputeId: string) =>
      apiRequest("POST", `/api/payments/disputes/${disputeId}/withdraw`, {}),
    onSuccess: invalidate,
  });
  if (!paid) return null;
  const disputes = disputeData?.disputes ?? [];
  const blocked = new Set(
    disputes.filter((dispute) => activeStatuses.has(dispute.status)).map((dispute) => dispute.allocation_id),
  );
  const available = (allocationData?.allocations ?? []).filter(
    (allocation) => !blocked.has(allocation.id) && allocation.status !== "refunded",
  );
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Marketplace disputes
        </h2>
        {disputes.length > 0 && (
          <div className="mt-3 space-y-3">
            {disputes.map((dispute) => (
              <div key={dispute.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{dispute.reason.replaceAll("_", " ")}</p>
                  <Badge variant="secondary">{dispute.status.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{dispute.resolution_data?.details}</p>
                {dispute.response_due_at && activeStatuses.has(dispute.status) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Response due {new Date(dispute.response_due_at).toLocaleString()}
                  </p>
                )}
                {activeStatuses.has(dispute.status) && (
                  <div className="mt-3 flex gap-2">
                    <Textarea
                      value={evidenceText[dispute.id] ?? ""}
                      onChange={(event) =>
                        setEvidenceText((current) => ({ ...current, [dispute.id]: event.target.value }))
                      }
                      placeholder="Add evidence or an update"
                      className="min-h-16"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={(evidenceText[dispute.id]?.trim().length ?? 0) < 10 || addEvidence.isPending}
                      onClick={() => addEvidence.mutate({ disputeId: dispute.id, text: evidenceText[dispute.id] })}
                    >
                      <FileText className="mr-1 h-3.5 w-3.5" /> Add
                    </Button>
                  </div>
                )}
                {dispute.status === "open" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2"
                    onClick={() => withdraw.mutate(dispute.id)}
                  >
                    Withdraw dispute
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        {available.length > 0 && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <Label>Seller allocation</Label>
            <Select value={allocationId} onValueChange={setAllocationId}>
              <SelectTrigger><SelectValue placeholder="Select affected seller payment" /></SelectTrigger>
              <SelectContent>
                {available.map((allocation) => (
                  <SelectItem key={allocation.id} value={allocation.id}>
                    {allocation.seller_id} · {new Intl.NumberFormat("en-GB", {
                      style: "currency",
                      currency: allocation.currency,
                    }).format(Number(allocation.seller_net_minor) / 100)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="non_delivery">Not delivered</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="not_as_described">Not as described</SelectItem>
                <SelectItem value="quality">Quality issue</SelectItem>
                <SelectItem value="quantity">Quantity issue</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Label>What happened?</Label>
            <Textarea value={details} onChange={(event) => setDetails(event.target.value)} minLength={20} maxLength={5000} />
            <Button
              disabled={!allocationId || details.trim().length < 20 || open.isPending}
              onClick={() => open.mutate()}
            >
              {open.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Open dispute
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
