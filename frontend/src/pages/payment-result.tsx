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
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    refetchOnReconnect: true,
    refetchInterval: (state) => {
      const paymentStatus = state.state.data?.attempt.paymentStatus;
      return !paymentStatus || ["created", "processing", "requires_action"].includes(paymentStatus)
        ? 1500
        : false;
    },
  });
  const status = query.data?.attempt.paymentStatus ?? "processing";
  useEffect(() => {
    if (status === "succeeded" && query.data) {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.removeQueries({ queryKey: ["/api/checkout/quotes"] });
      queryClient.removeQueries({ queryKey: ["/api/payments/methods"] });
      navigate(`/order-confirmation/${query.data.order.id}`, { replace: true });
    }
  }, [navigate, query.data, status]);
  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <div className="max-w-xl mx-auto px-4 py-10">
        <Card>
          <CardContent className="p-8">
            <PaymentStatePanel status={query.isError ? "unavailable" : status} />
            <div className="flex gap-2 justify-center mt-6">
              {status !== "succeeded" && (
                <Button variant="outline" onClick={() => query.refetch()}>Check again</Button>
              )}
              {status !== "succeeded" && (
                <Button onClick={() => navigate("/checkout")}>Choose another payment method</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
