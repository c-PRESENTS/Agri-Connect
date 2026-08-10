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
import { resolveProductImageForOrderItem } from "@/lib/product-images";
import { useCurrency } from "@/contexts/currency-context";
import { CheckoutProgress } from "@/components/checkout-progress";

function confirmationCopy(status: Order["status"]): { title: string; description: string } {
  switch (status) {
    case "pending":
    case "order_placed":
      return { title: "Order received!", description: "Your order is pending seller confirmation." };
    case "confirmed":
    case "payment_confirmed":
      return { title: "Order confirmed!", description: "The seller has confirmed your order." };
    case "processing":
      return { title: "Order is being prepared", description: "The seller is preparing your items for dispatch." };
    case "shipped":
    case "out_for_delivery":
      return { title: "Order shipped!", description: "Your order is on its way." };
    case "delivered":
      return { title: "Order delivered!", description: "This order has been marked as delivered." };
    case "cancelled":
      return { title: "Order cancelled", description: "This order is no longer active." };
    case "refunded":
      return { title: "Order refunded", description: "A refund has been recorded for this order." };
  }
}

export default function OrderConfirmationPage() {
  const { t } = useTranslation();
  const { format } = useCurrency();
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
  const deliveryCharge = (order.deliveryFee ?? 0) + (order.shippingTotal ?? 0);
  const statusCopy = confirmationCopy(order.status);
  const isCashOrder = order.paymentMethod === "cod";

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />

      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        <div className="mb-8 rounded-3xl border-2 border-border/80 bg-card px-4 py-6 shadow-md sm:px-8">
          <CheckoutProgress currentStep={4} />
        </div>

        {/* Success header */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="text-center mb-10"
        >
          <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-green-100 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700 flex items-center justify-center mx-auto mb-5 shadow-lg">
            <CheckCircle className="h-12 w-12 sm:h-14 sm:w-14 text-green-600 dark:text-green-400 stroke-[2.5]" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground mb-3 tracking-tight">
            {isCashOrder ? "Order placed!" : order.paymentStatus === "paid" ? "Payment confirmed!" : statusCopy.title}
          </h1>
          <p className="text-base sm:text-lg font-bold text-foreground/85 max-w-xl mx-auto leading-relaxed">
            {isCashOrder
              ? "Pay each farmer when collecting or receiving their part of the order."
              : statusCopy.description}
          </p>
        </motion.div>

        {/* Order number card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6 border-2 border-primary/40 bg-primary/10 rounded-3xl shadow-md p-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-widest font-black">{t("payment_success.order_number")}</p>
                  <p className="text-3xl sm:text-4xl font-black text-primary font-mono tracking-wide mt-1">{order.orderNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">{t("order_detail.payment_status")}</p>
                  <p className="text-base sm:text-lg font-black text-foreground mt-0.5">
                    {isCashOrder
                      ? "Cash due at handover"
                      : order.paymentStatus === "manual"
                        ? "Manual payment pending"
                        : order.paymentStatus}
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-muted-foreground mt-1">
                    {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {isCashOrder && (
          <Card className="mb-6 border-2 border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 rounded-3xl p-2 shadow-sm">
            <CardContent className="p-6">
              <h2 className="text-lg sm:text-xl font-black text-amber-950 dark:text-amber-200">Payment due at handover · {format(order.total, { includeCode: true })}</h2>
              <p className="mt-2 text-sm sm:text-base font-bold text-amber-900 dark:text-amber-300 leading-relaxed">
                Cash orders are not protected by Stripe and do not support automatic online refunds.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Delivery info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-6 border-2 border-border/80 rounded-3xl shadow-md p-2">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 border border-blue-300 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">{t("order_detail.estimated_delivery")}</p>
                    <p className="text-base font-black text-foreground mt-0.5">{estimatedDate}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-green-100 dark:bg-green-900/40 border border-green-300 flex items-center justify-center flex-shrink-0">
                    <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">{t("order_detail.delivery_method")}</p>
                    <p className="text-base font-black capitalize text-foreground mt-0.5">{order.deliveryMethod || t("cart.standard_delivery")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-purple-100 dark:bg-purple-900/40 border border-purple-300 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">{t("checkout.deliver_to")}</p>
                    <p className="text-base font-black text-foreground truncate max-w-[140px] mt-0.5">{order.deliveryAddress.split(",")[0]}</p>
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
          <Card className="mb-8 border-2 border-border/80 rounded-3xl shadow-md p-2">
            <CardContent className="p-6">
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-wider mb-5 flex items-center gap-2.5 text-foreground">
                <Package className="h-6 w-6 text-primary" />
                {t("cart.order_items")} ({order.items.length})
              </h3>
              <div className="space-y-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl bg-muted/30 border">
                    <img
                      src={resolveProductImageForOrderItem(item).src}
                      alt={item.productName}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = resolveProductImageForOrderItem(item).fallbackSrc ?? resolveProductImageForOrderItem(item).src;
                      }}
                      className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl object-cover border flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-base sm:text-lg text-foreground truncate">{item.productName}</p>
                      <p className="text-xs sm:text-sm font-bold text-muted-foreground mt-0.5">{item.farmerName} · Qty: {item.quantity}</p>
                    </div>
                    <span className="font-black text-base sm:text-lg text-foreground">{format(item.price * item.quantity, { includeCode: true })}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-6 h-0.5" />
              <div className="space-y-3 text-base">
                <div className="flex justify-between items-center text-muted-foreground font-bold">
                  <span>{t("cart.subtotal")}</span><span className="font-black text-foreground">{order.subtotal == null ? "—" : format(order.subtotal, { includeCode: true })}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground font-bold">
                  <span>{t("cart.delivery")}</span>
                  <span className="font-black">{deliveryCharge === 0 ? <span className="text-green-600">{t("cart.free_delivery")}</span> : format(deliveryCharge, { includeCode: true })}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground font-bold">
                  <span>Taxes</span>
                  <span className="font-bold text-xs">{order.tax > 0 ? format(order.tax, { includeCode: true }) : "Included where applicable"}</span>
                </div>
                <Separator className="my-2 h-0.5" />
                <div className="flex justify-between items-center font-black text-lg sm:text-xl uppercase">
                  <span>{t("cart.total")}</span><span className="text-2xl sm:text-3xl text-primary">{format(order.total, { includeCode: true })}</span>
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
          className="flex flex-col sm:flex-row gap-4"
        >
          <Button
            onClick={() => navigate(`/orders/${order.id}`)}
            className="flex-1 gap-2.5 h-13 sm:h-14 text-sm sm:text-base font-black uppercase tracking-wider bg-amber-400 hover:bg-amber-500 text-black shadow-lg"
            data-testid="btn-track-order"
          >
            <Truck className="h-5 w-5 stroke-[2.5]" /> {t("order_detail.view_products")}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/orders")}
            className="flex-1 gap-2.5 h-13 sm:h-14 text-sm sm:text-base font-black uppercase tracking-wider border-2"
          >
            <ShoppingBag className="h-5 w-5 stroke-[2.5]" /> {t("orders.title")}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="flex-1 gap-2.5 h-13 sm:h-14 text-sm sm:text-base font-black uppercase tracking-wider border-2"
          >
            <Home className="h-5 w-5 stroke-[2.5]" /> {t("order_detail.continue_shopping")}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
