import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TopNavigation } from "@/components/top-navigation";
import { PaymentStatePanel } from "@/components/payments/payment-state-panel";
import { getPaymentAttempt } from "@/lib/payment-client";
import { queryClient } from "@/lib/queryClient";
import { useEffect } from "react";

export default function PaymentResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [, navigate] = useLocation();
  const query = useQuery({
    queryKey: ["/api/payments/attempts", attemptId],
    queryFn: () => getPaymentAttempt(attemptId),
    refetchInterval: (state) =>
      ["created", "processing", "requires_action"].includes(state.state.data?.attempt.paymentStatus ?? "")
        ? 1500
        : false,
  });
  const status = query.data?.attempt.paymentStatus ?? "processing";
  useEffect(() => {
    if (status === "succeeded") {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    }
  }, [status]);
  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <div className="max-w-xl mx-auto px-4 py-10">
        <Card>
          <CardContent className="p-8">
            <PaymentStatePanel status={query.isError ? "failed" : status} />
            <div className="flex gap-2 justify-center mt-6">
              {status === "succeeded" && query.data ? (
                <Button onClick={() => navigate(`/orders/${query.data.order.id}`)}>View order</Button>
              ) : (
                <Button variant="outline" onClick={() => query.refetch()}>Check again</Button>
              )}
              <Button variant="outline" onClick={() => navigate(status === "succeeded" ? "/" : "/checkout")}>
                {status === "succeeded" ? "Continue shopping" : "Return to checkout"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
