import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Package, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TopNavigation } from "@/components/top-navigation";
import { queryClient } from "@/lib/queryClient";
import type { Order } from "@shared/schema";

export default function PaymentSuccessPage() {
  const [, navigate] = useLocation();

  const sessionId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("session_id");
  }, []);

  const { data: order, isLoading, error, refetch } = useQuery<Order>({
    queryKey: ["/api/stripe/session", sessionId],
    queryFn: () =>
      fetch(`/api/stripe/session/${sessionId}`, { credentials: "include" }).then((r) => {
        if (!r.ok) throw new Error("Failed to load order");
        return r.json();
      }),
    enabled: !!sessionId,
    refetchInterval: (q) => (q.state.data?.paymentStatus === "pending" ? 1500 : false),
  });

  useEffect(() => {
    if (order?.paymentStatus === "paid") {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    }
  }, [order?.paymentStatus]);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation />
        <div className="max-w-xl mx-auto px-3 sm:px-4 py-10 sm:py-16 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h1 className="text-xl font-bold mb-2">No payment session found</h1>
          <Button onClick={() => navigate("/")} data-testid="button-home">Back home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <div className="max-w-xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <Card>
          <CardContent className="p-5 sm:p-8 text-center">
            {isLoading || order?.paymentStatus === "pending" ? (
              <>
                <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
                <h1 className="text-xl font-bold mb-2">Confirming your payment…</h1>
                <p className="text-sm text-muted-foreground">This usually takes a couple of seconds.</p>
              </>
            ) : error || !order ? (
              <>
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <h1 className="text-xl font-bold mb-2">We couldn't load your order</h1>
                <p className="text-sm text-muted-foreground mb-6">Please try again in a moment.</p>
                <Button onClick={() => refetch()} data-testid="button-retry">Retry</Button>
              </>
            ) : order.paymentStatus === "paid" ? (
              <>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                  <CheckCircle2 className="h-9 w-9 text-green-600" />
                </div>
                <h1 className="text-2xl font-black mb-2" data-testid="text-payment-success">Payment successful</h1>
                <p className="text-sm text-muted-foreground mb-1">
                  Order <span className="font-semibold text-foreground">{order.orderNumber}</span>
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Total <span className="font-semibold text-foreground">£{order.total.toFixed(2)}</span> · {order.items.length} item{order.items.length === 1 ? "" : "s"}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button
                    onClick={() => navigate(`/orders/${order.id}`)}
                    data-testid="button-view-order"
                  >
                    <Package className="h-4 w-4 mr-2" /> View order
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/")} data-testid="button-keep-shopping">
                    Keep shopping <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <h1 className="text-xl font-bold mb-2">Payment {order.paymentStatus}</h1>
                <p className="text-sm text-muted-foreground mb-6">
                  Your order {order.orderNumber} was not charged. You can try again from your cart.
                </p>
                <Button onClick={() => navigate("/cart")} data-testid="button-back-cart">Back to cart</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
