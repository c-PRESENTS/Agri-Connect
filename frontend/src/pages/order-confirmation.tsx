import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  CheckCircle, Package, Truck, MapPin, Clock, ArrowRight,
  ShoppingBag, Home, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Order } from "@shared/schema";
import { TopNavigation } from "@/components/top-navigation";
import { getProductImage } from "@/lib/product-images";

export default function OrderConfirmationPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ["/api/orders", id],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Order not found");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation />
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation />
        <div className="text-center py-20">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold">{t("order_detail.error_title")}</h2>
          <Button onClick={() => navigate("/")} className="mt-4">{t("order_detail.continue_shopping")}</Button>
        </div>
      </div>
    );
  }

  const estimatedDate = order.estimatedDelivery
    ? new Date(order.estimatedDelivery).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
    : "5–7 business days";

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Success header */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="text-center mb-8"
        >
          <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-black text-foreground mb-2">{t("order_detail.confirmation_title")}</h1>
          <p className="text-muted-foreground">
            {t("order_detail.confirmation_description")}
          </p>
        </motion.div>

        {/* Order number card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-4 border-primary/30 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t("payment_success.order_number")}</p>
                  <p className="text-2xl font-black text-primary font-mono tracking-wide">{order.orderNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{t("order_detail.payment_status")}</p>
                  <p className="text-sm font-semibold">
                    {order.paymentStatus === "manual" ? "Manual payment pending" : order.paymentStatus}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Delivery info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-4">
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">{t("order_detail.estimated_delivery")}</p>
                    <p className="text-sm font-bold">{estimatedDate}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Truck className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">{t("order_detail.delivery_method")}</p>
                    <p className="text-sm font-bold capitalize">{order.deliveryMethod || t("cart.standard_delivery")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">{t("checkout.deliver_to")}</p>
                    <p className="text-sm font-bold truncate max-w-[120px]">{order.deliveryAddress.split(",")[0]}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="mb-4">
            <CardContent className="p-5">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                {t("cart.order_items")} ({order.items.length})
              </h3>
              <div className="space-y-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <img
                      src={item.productImage || getProductImage(item.productName, "", "sm")}
                      alt={item.productName}
                      loading="lazy"
                      className="h-12 w-12 rounded-xl object-cover border border-border/50 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.farmerName} · Qty: {item.quantity}</p>
                    </div>
                    <span className="font-bold text-sm">£{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("cart.subtotal")}</span><span>£{order.subtotal?.toFixed(2) || "—"}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("cart.delivery")}</span>
                  <span>{(order.deliveryFee ?? 0) === 0 ? <span className="text-green-600">{t("cart.free_delivery")}</span> : `£${order.deliveryFee?.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("checkout.vat")}</span><span>£{order.tax?.toFixed(2) || "—"}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>{t("cart.total")}</span><span>£{order.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Button
            onClick={() => navigate(`/orders/${order.id}`)}
            className="flex-1 gap-2"
            data-testid="btn-track-order"
          >
            <Truck className="h-4 w-4" /> {t("order_detail.view_products")}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/orders")}
            className="flex-1 gap-2"
          >
            <ShoppingBag className="h-4 w-4" /> {t("orders.title")}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="flex-1 gap-2"
          >
            <Home className="h-4 w-4" /> {t("order_detail.continue_shopping")}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
