import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Package, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TopNavigation } from "@/components/top-navigation";
import { queryClient } from "@/lib/queryClient";
import type { Order } from "@shared/schema";

export default function PaymentSuccessPage() {
  const { t } = useTranslation();
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
          <h1 className="text-xl font-bold mb-2">{t("payment_success.error_title")}</h1>
          <Button onClick={() => navigate("/")} data-testid="button-home">{t("common.back")}</Button>
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
                <h1 className="text-xl font-bold mb-2">{t("payment_success.loading")}</h1>
                <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
              </>
            ) : error || !order ? (
              <>
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <h1 className="text-xl font-bold mb-2">{t("payment_success.error_title")}</h1>
                <p className="text-sm text-muted-foreground mb-6">{t("payment_success.error_description")}</p>
                <Button onClick={() => refetch()} data-testid="button-retry">{t("payment_success.view_order")}</Button>
              </>
            ) : order.paymentStatus === "paid" ? (
              <>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                  <CheckCircle2 className="h-9 w-9 text-green-600" />
                </div>
                <h1 className="text-2xl font-black mb-2" data-testid="text-payment-success">{t("payment_success.title")}</h1>
                <p className="text-sm text-muted-foreground mb-1">
                  {t("payment_success.order_number")} <span className="font-semibold text-foreground">{order.orderNumber}</span>
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  {t("payment_success.total")} <span className="font-semibold text-foreground">£{order.total.toFixed(2)}</span>
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button
                    onClick={() => navigate(`/orders/${order.id}`)}
                    data-testid="button-view-order"
                  >
                    <Package className="h-4 w-4 mr-2" /> {t("payment_success.view_order")}
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/")} data-testid="button-keep-shopping">
                    {t("payment_success.continue_shopping")} <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <h1 className="text-xl font-bold mb-2">{t("payment_success.error_title")}</h1>
                <p className="text-sm text-muted-foreground mb-6">
                  {t("payment_success.error_description")}
                </p>
                <Button onClick={() => navigate("/cart")} data-testid="button-back-cart">{t("payment_success.go_to_orders")}</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
