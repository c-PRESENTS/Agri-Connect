import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MessageSquareWarning } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface SellerDispute {
  id: string;
  order_id: string;
  reason: string;
  status: string;
  response_due_at?: string | null;
}

export function SellerDisputes() {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const { data } = useQuery<{ items: SellerDispute[] }>({
    queryKey: ["/api/payments/seller/disputes"],
  });
  const submit = useMutation({
    mutationFn: ({ disputeId, text }: { disputeId: string; text: string }) =>
      apiRequest("POST", `/api/payments/disputes/${disputeId}/evidence`, {
        evidenceType: "seller_statement",
        text,
      }),
    onSuccess: async (_, input) => {
      setResponses((current) => ({ ...current, [input.disputeId]: "" }));
      await queryClient.invalidateQueries({ queryKey: ["/api/payments/seller/disputes"] });
    },
  });
  const disputes = data?.items ?? [];
  return (
    <section aria-labelledby="seller-disputes-heading">
      <h2 id="seller-disputes-heading" className="mb-3 text-base font-bold">Payment disputes</h2>
      <Card>
        <CardContent className="p-4">
          {disputes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No marketplace disputes require your response.</p>
          ) : (
            <div className="space-y-3">
              {disputes.map((dispute) => (
                <div key={dispute.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <MessageSquareWarning className="h-4 w-4 text-amber-500" />
                      Order {dispute.order_id}
                    </p>
                    <Badge variant="secondary">{dispute.status.replaceAll("_", " ")}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {dispute.reason.replaceAll("_", " ")}
                    {dispute.response_due_at ? ` · respond by ${new Date(dispute.response_due_at).toLocaleString()}` : ""}
                  </p>
                  {["open", "under_review", "needs_action"].includes(dispute.status) && (
                    <div className="mt-3 flex gap-2">
                      <Textarea
                        value={responses[dispute.id] ?? ""}
                        onChange={(event) =>
                          setResponses((current) => ({ ...current, [dispute.id]: event.target.value }))
                        }
                        placeholder="Provide your response and evidence"
                        className="min-h-16"
                      />
                      <Button
                        size="sm"
                        disabled={(responses[dispute.id]?.trim().length ?? 0) < 10 || submit.isPending}
                        onClick={() => submit.mutate({ disputeId: dispute.id, text: responses[dispute.id] })}
                      >
                        Respond
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
