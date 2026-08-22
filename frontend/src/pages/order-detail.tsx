import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Package, Truck, CheckCircle, MapPin, Clock, XCircle,
  ArrowLeft, Star, MessageSquare, Loader2, RefreshCw,
  ShoppingBag, Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import type { Order, OrderStatus } from "@shared/schema";
import { TopNavigation } from "@/components/top-navigation";
import { resolveProductImageForOrderItem } from "@/lib/product-images";
import { OrderDisputes } from "@/components/payments/order-disputes";
import { useCurrency } from "@/contexts/currency-context";
import { OrderAgainButton } from "@/components/order-again-button";

interface PaymentRefund {
  id: string;
  currency: string;
  amount_minor: string;
  status: string;
  failure_code?: string | null;
}

const ORDER_STAGES: { status: OrderStatus; label: string; desc: string; icon: typeof Package }[] = [
  { status: "pending",           label: "Pending",           desc: "Waiting for the seller to confirm", icon: Clock },
  { status: "confirmed",         label: "Confirmed",         desc: "Seller has confirmed your order",   icon: CheckCircle },
  { status: "processing",        label: "Processing",        desc: "Seller is preparing your items",   icon: Package },
  { status: "shipped",           label: "Shipped",           desc: "Your order is on the way",         icon: Truck },
  { status: "delivered",         label: "Delivered",         desc: "Order successfully delivered",     icon: CheckCircle },
];

const STATUS_ORDER: OrderStatus[] = [
  "pending", "confirmed", "processing", "shipped", "delivered"
];

function paymentStatusLabel(status: Order["paymentStatus"]): string {
  switch (status) {
    case "manual": return "Manual payment pending";
    case "pending": return "Payment pending";
    case "paid": return "Paid";
    case "failed": return "Payment failed";
    case "refunded": return "Refunded";
  }
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
          className="transition-transform hover:scale-110"
          data-testid={`star-${s}`}
        >
          <Star
            className={`h-7 w-7 transition-colors ${
              s <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function OrderDetailPage() {
  const { format } = useCurrency();
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewingProductId, setReviewingProductId] = useState<string | null>(null);
  const [submittedReviews, setSubmittedReviews] = useState<Set<string>>(new Set());

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ["/api/orders", id],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/orders/${id}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Order cancelled", description: "Your order has been cancelled." });
    },
    onError: () => {
      toast({ title: "Cannot cancel", description: "This order cannot be cancelled.", variant: "destructive" });
    },
  });
  const { data: refundData } = useQuery<{ refunds: PaymentRefund[] }>({
    queryKey: ["/api/payments/orders", id, "refunds"],
    queryFn: async () => {
      const response = await fetch(`/api/payments/orders/${id}/refunds`, {
        credentials: "include",
      });
      if (!response.ok) return { refunds: [] };
      return response.json();
    },
  });

  const confirmDeliveryMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/payments/orders/${id}/confirm-delivery`, {}),
    onSuccess: () => {
      toast({
        title: "Delivery confirmed",
        description: "Seller payout is on hold until the protected release time.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not confirm delivery",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const refundMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/payments/orders/${id}/refunds`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `buyer-full-refund-${id}`,
        },
        body: "{}",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Refund could not be created");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/orders", id, "refunds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
      toast({ title: "Refund submitted", description: "Provider verification is in progress." });
    },
    onError: (error: Error) => {
      toast({ title: "Refund failed", description: error.message, variant: "destructive" });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ productId, rating, comment }: { productId: string; rating: number; comment: string }) => {
      const res = await apiRequest("POST", "/api/reviews", { productId, orderId: id, rating, comment });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      setSubmittedReviews((prev) => {
        const next = new Set(Array.from(prev));
        next.add(vars.productId);
        return next;
      });
      setReviewingProductId(null);
      setReviewComment("");
      setReviewRating(5);
      toast({ title: "Review submitted!", description: "Thank you for your feedback." });
    },
    onError: (e: any) => {
      toast({ title: "Review failed", description: e.message, variant: "destructive" });
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
        <div className="text-center py-10 sm:py-16">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold">{t("order_detail.error_title")}</h2>
          <Button onClick={() => navigate("/orders")} className="mt-4">{t("orders.title")}</Button>
        </div>
      </div>
    );
  }

  const currentStageIdx = order.status === "cancelled" ? -1 : STATUS_ORDER.indexOf(order.status);
  const estimatedDate = order.estimatedDelivery
    ? new Date(order.estimatedDelivery).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
    : null;
  const deliveryCharge = (order.deliveryFee ?? 0) + (order.shippingTotal ?? 0);
  const displayedPaymentStatus = paymentStatusLabel(order.paymentStatus);

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/orders")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-black font-mono">{order.orderNumber}</h1>
              <p className="text-xs text-muted-foreground">
                {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
            <OrderAgainButton
              orderId={order.id}
              variant="default"
              testId={`button-order-again-${order.id}`}
            />
            <Badge variant="outline" className="h-8 gap-1.5 px-2.5" data-testid="text-payment-status">
              <span className="text-muted-foreground">{t("order_detail.payment_status")}:</span>
              <span>{displayedPaymentStatus}</span>
            </Badge>
            {(order.status === "pending" || order.status === "confirmed" || order.status === "processing" || order.status === "order_placed" || order.status === "payment_confirmed") && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  const refundNotice = order.paymentStatus === "paid"
                    ? `This will cancel your order and refund your payment via ${order.paymentProvider === "paypal" ? "PayPal" : order.paymentProvider === "razorpay" ? "Razorpay" : "Stripe"}. Continue?`
                    : "Are you sure you want to cancel this order?";
                  if (window.confirm(refundNotice)) cancelMutation.mutate();
                }}
                disabled={cancelMutation.isPending}
                data-testid="btn-cancel-order"
                className="gap-1"
              >
                {cancelMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                {t("common.cancel")}
              </Button>
            )}
            {order.status === "delivered" && order.paymentStatus === "paid" && (
              <Button
                size="sm"
                onClick={() => confirmDeliveryMutation.mutate()}
                disabled={confirmDeliveryMutation.isPending}
                className="gap-1"
              >
                {confirmDeliveryMutation.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <CheckCircle className="h-3.5 w-3.5" />}
                Confirm delivery
              </Button>
            )}
            {order.status === "delivered" && order.paymentStatus === "paid" && (
              <Button
                size="sm"
                variant="destructive"
                disabled={refundMutation.isPending}
                onClick={() => {
                  if (window.confirm("Request a full refund for this protected payment?")) {
                    refundMutation.mutate();
                  }
                }}
              >
                {refundMutation.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                Request refund
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/support?orderId=${order.id}&orderNumber=${encodeURIComponent(order.orderNumber)}`)}
              data-testid="btn-contact-support"
              className="gap-1"
            >
              <MessageSquare className="h-3.5 w-3.5" /> {t("support.title")}
            </Button>
          </div>
        </div>

        {(refundData?.refunds.length ?? 0) > 0 && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold">Refund status</h2>
              <div className="mt-2 space-y-2">
                {refundData!.refunds.map((refund) => (
                  <div key={refund.id} className="flex items-center justify-between gap-3 text-sm">
                    <span>
                      {format(Number(refund.amount_minor) / 100, {
                        sourceCurrency: refund.currency,
                        includeCode: true,
                      })}
                    </span>
                    <Badge variant={refund.status === "succeeded" ? "default" : "secondary"}>
                      {refund.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        <OrderDisputes orderId={order.id} paid={order.paymentStatus === "paid"} />

        {/* Tracking info */}
        {(order.trackingNumber || order.carrier || order.trackingUrl) && order.status !== "cancelled" && (
          <Card className="mb-4 border-primary/30 bg-primary/5" data-testid="card-tracking">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm mb-1">{t("ship.tracking_description")}</p>
                  {order.carrier && (
                    <p className="text-xs text-muted-foreground">
                      {t("ship.carrier")}: <span className="font-medium text-foreground" data-testid="text-carrier">{order.carrier}</span>
                    </p>
                  )}
                  {order.trackingNumber && (
                    <p className="text-xs text-muted-foreground">
                      {t("ship.tracking_number")}: <span className="font-mono font-medium text-foreground" data-testid="text-tracking-number">{order.trackingNumber}</span>
                    </p>
                  )}
                  {order.trackingUrl && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                      data-testid="link-tracking-url"
                    >
                      {t("ship.tracking_title")} →
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Refunded notice */}
        {order.paymentStatus === "refunded" && (
          <Card className="mb-4 border-amber-500/30 bg-amber-50 dark:bg-amber-950/20" data-testid="card-refunded">
            <CardContent className="p-3 flex items-center gap-2 text-sm">
              <RefreshCw className="h-4 w-4 text-amber-600" />
              <span>{t("payment_success.title")}</span>
            </CardContent>
          </Card>
        )}

        {/* Cancelled notice */}
        {order.status === "cancelled" && (
          <Card className="mb-4 border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <div>
                <p className="font-semibold text-destructive">{t("orders.status_cancelled")}</p>
                <p className="text-xs text-muted-foreground">{t("order_detail.error_description")}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress tracker */}
        {order.status !== "cancelled" && (
          <Card className="mb-4">
            <CardContent className="p-5">
              <h3 className="font-bold mb-5 flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" /> {t("ship.tracking_title")}
              </h3>
              <div className="space-y-0">
                {ORDER_STAGES.map((stage, idx) => {
                  const completed = idx <= currentStageIdx;
                  const current = idx === currentStageIdx;
                  const historyEntry = order.statusHistory?.find((h) => h.status === stage.status);
                  const Icon = stage.icon;
                  return (
                    <div key={stage.status} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          completed
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground"
                        } ${current ? "ring-4 ring-primary/20 shadow-lg" : ""}`}>
                          {completed ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                        </div>
                        {idx < ORDER_STAGES.length - 1 && (
                          <div className={`w-0.5 h-10 transition-all ${completed && idx < currentStageIdx ? "bg-primary" : "bg-border"}`} />
                        )}
                      </div>
                      <div className={`pb-2 flex-1 min-w-0 ${idx === ORDER_STAGES.length - 1 ? "pb-0" : ""}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold text-sm ${completed ? "text-foreground" : "text-muted-foreground/60"}`}>
                            {stage.label}
                          </span>
                          {current && (
                            <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px] h-4 px-1.5 animate-pulse">
                              {t("order_detail.current_status", "Current")}
                            </Badge>
                          )}
                        </div>
                        <p className={`text-xs ${completed ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                          {stage.desc}
                        </p>
                        {historyEntry && (
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                            {new Date(historyEntry.timestamp).toLocaleString("en-GB", {
                              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {estimatedDate && order.status !== "delivered" && (
                <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground">{t("order_detail.estimated_delivery")}:</span>
                  <span className="font-bold">{estimatedDate}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Delivery info */}
        <Card className="mb-4">
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-0.5">{t("order_detail.delivery_details")}</p>
                  <p className="text-sm">{order.deliveryAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Truck className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-0.5">{t("order_detail.delivery_method")}</p>
                  <p className="text-sm capitalize">{order.deliveryMethod || t("cart.standard_delivery")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items + review */}
        <Card className="mb-4">
          <CardContent className="p-5">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> {t("cart.order_items")}
              {order.status === "delivered" && (
                <span className="ml-auto text-xs text-muted-foreground font-normal">
                  ✓ {t("orders.status_delivered")}
                </span>
              )}
            </h3>
            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center gap-3">
                    <img
                      src={resolveProductImageForOrderItem(item).src}
                      alt={item.productName}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = resolveProductImageForOrderItem(item).fallbackSrc ?? resolveProductImageForOrderItem(item).src;
                      }}
                      className="h-14 w-14 rounded-xl object-cover border border-border/50 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.farmerName}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity} · {format(item.price, { includeCode: true })} each</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold">{format(item.price * item.quantity, { includeCode: true })}</p>
                      <OrderAgainButton
                        orderId={order.id}
                        productIds={[item.productId]}
                        label="Order item again"
                        variant="ghost"
                        className="mt-1 ml-auto h-7 px-2 text-[11px] text-primary"
                        testId={`button-order-item-again-${order.id}-${item.productId}`}
                      />
                      {order.status === "delivered" && !submittedReviews.has(item.productId) && (
                        <button
                          onClick={() => {
                            if (reviewingProductId === item.productId) {
                              setReviewingProductId(null);
                            } else {
                              setReviewingProductId(item.productId);
                              setReviewRating(5);
                              setReviewComment("");
                            }
                          }}
                          className="text-[11px] text-primary hover:underline flex items-center gap-0.5 mt-1 ml-auto"
                          data-testid={`btn-review-${item.productId}`}
                        >
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {reviewingProductId === item.productId ? t("common.cancel") : t("product_detail.write_review")}
                        </button>
                      )}
                      {submittedReviews.has(item.productId) && (
                        <p className="text-[11px] text-green-600 mt-1 ml-auto flex items-center gap-0.5">
                          <CheckCircle className="h-3 w-3" /> {t("product_detail.verified_badge")}
                        </p>
                      )}
                    </div>
                  </div>

                  {reviewingProductId === item.productId && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="h-4 w-4 text-amber-600" />
                        <span className="font-semibold text-sm">{t("product_detail.write_review")} {item.productName}</span>
                      </div>
                      <div className="mb-3">
                        <Label className="text-xs text-muted-foreground mb-2 block">{t("filters.rating")}</Label>
                        <StarRating value={reviewRating} onChange={setReviewRating} />
                      </div>
                      <div className="mb-3">
                        <Label htmlFor="review-comment" className="text-xs text-muted-foreground mb-1 block">{t("product_detail.write_review")}</Label>
                        <Textarea
                          id="review-comment"
                          data-testid="input-review-comment"
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder={t("support.message_placeholder")}
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => reviewMutation.mutate({ productId: item.productId, rating: reviewRating, comment: reviewComment })}
                          disabled={!reviewComment.trim() || reviewMutation.isPending}
                          data-testid="btn-submit-review"
                          className="gap-2"
                        >
                          {reviewMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Star className="h-3 w-3" />}
                          {t("product_detail.write_review")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setReviewingProductId(null)}>
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>

            <Separator className="my-4" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{t("cart.subtotal")}</span><span>{format(order.subtotal ?? order.total, { includeCode: true })}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t("cart.delivery")}</span>
                <span>{deliveryCharge === 0 ? <span className="text-green-600 font-medium">{t("cart.free_delivery")}</span> : format(deliveryCharge, { includeCode: true })}</span>
              </div>
              {order.tax !== undefined && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Taxes</span>
                  <span>{order.tax > 0 ? format(order.tax, { includeCode: true }) : "Included where applicable"}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>{t("cart.total")}</span><span>{format(order.total, { includeCode: true })}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={() => navigate("/orders")} className="gap-2 flex-1">
            <ShoppingBag className="h-4 w-4" /> {t("orders.title")}
          </Button>
          <Button variant="outline" onClick={() => navigate("/")} className="gap-2 flex-1">
            <Home className="h-4 w-4" /> {t("order_detail.continue_shopping")}
          </Button>
        </div>
      </div>
    </div>
  );
}
