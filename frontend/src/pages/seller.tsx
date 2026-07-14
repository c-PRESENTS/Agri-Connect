import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { TopNavigation } from "@/components/top-navigation";
import { motion } from "framer-motion";
import {
  Store, Camera, BarChart3, Package, ShoppingBag,
  Star, TrendingUp, Truck, ArrowRight, Plus, DollarSign,
  ClipboardList, MessageSquare, Settings, Zap, ChevronRight,
  CheckCircle, Clock, RefreshCw, XCircle, Loader2, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product, Order, OrderStatus } from "@shared/schema";
import { getProductImage } from "@/lib/product-images";

type SellerDashboard = {
  products: Product[];
  orders: Order[];
  summary: { productCount: number; orderCount: number; activeOrderCount: number; salesTotal: number };
};

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: typeof Package }> = {
  pending:           { label: "Pending",           color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",       icon: Clock },
  confirmed:         { label: "Confirmed",         color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", icon: CheckCircle },
  order_placed:      { label: "Order Placed",      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",       icon: Package },
  payment_confirmed: { label: "Payment Confirmed", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", icon: CheckCircle },
  processing:        { label: "Processing",        color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",     icon: RefreshCw },
  shipped:           { label: "Shipped",           color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: Truck },
  out_for_delivery:  { label: "Out for Delivery",  color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",        icon: Truck },
  delivered:         { label: "Delivered",         color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",     icon: CheckCircle },
  cancelled:         { label: "Cancelled",         color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",            icon: XCircle },
  refunded:          { label: "Refunded",          color: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",    icon: RefreshCw },
};

const SELLER_STATUSES: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"];

const quickActions = [
  { icon: Camera,        label: "Photo-Sell",    desc: "Snap & list in seconds",        path: "/dashboard/photo-sell", color: "from-violet-500 to-purple-600" },
  { icon: Package,       label: "My Listings",   desc: "Manage active products",         path: "/dashboard",            color: "from-green-500 to-emerald-600" },
  { icon: Truck,         label: "Logistics",     desc: "Delivery & shipping partners",   path: "/logistics",            color: "from-teal-500 to-green-600" },
  { icon: ClipboardList, label: "Fulfillment",   desc: "Prepare and update orders",       path: "/fulfillment",          color: "from-sky-500 to-blue-600" },
  { icon: MessageSquare, label: "Demand Alerts", desc: "Real-time buyer requests",       path: "/dashboard",            color: "from-rose-500 to-pink-600" },
  { icon: DollarSign,    label: "Govt Schemes",  desc: "Subsidies & financial aid",      path: "/government-schemes",   color: "from-indigo-500 to-blue-600" },
  { icon: Settings,      label: "Settings",      desc: "Profile & payment setup",        path: "/settings",             color: "from-slate-500 to-gray-600" },
];

const tips = [
  { icon: Camera,     title: "Use Photo-Sell",       body: "Take a photo of your produce — AI detects the product, quantity and suggests a price in seconds." },
  { icon: Zap,        title: "Set Demand Alerts",    body: "Get notified instantly when buyers near you search a product you grow." },
  { icon: Star,       title: "Build Your Rating",    body: "Prompt delivery and fresh produce earns 5-star reviews, boosting your visibility." },
  { icon: TrendingUp, title: "Track Market Prices",  body: "Check the Farmers Help Point daily for live market prices before you list." },
 ];

type TabId = "overview" | "orders";

export default function SellerPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const { data: sellerDashboard, isLoading: ordersLoading, isError: ordersError, refetch: refetchOrders } = useQuery<SellerDashboard>({
    queryKey: ["/api/dashboard/seller"],
    enabled: isAuthenticated,
  });
  const myProducts = sellerDashboard?.products ?? [];
  const sellerOrders = sellerDashboard?.orders ?? [];

  const [trackingDialog, setTrackingDialog] = useState<{ orderId: string; status: OrderStatus } | null>(null);
  const [trackingForm, setTrackingForm] = useState({ trackingNumber: "", carrier: "", trackingUrl: "" });

  const updateStatusMutation = useMutation({
    mutationFn: async (vars: {
      orderId: string;
      status: OrderStatus;
      trackingNumber?: string;
      carrier?: string;
      trackingUrl?: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/orders/${vars.orderId}/status`, vars);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seller/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/seller"] });
      setUpdatingOrderId(null);
      setTrackingDialog(null);
      setTrackingForm({ trackingNumber: "", carrier: "", trackingUrl: "" });
      toast({ title: "Order status updated" });
    },
    onError: () => {
      setUpdatingOrderId(null);
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  function handleStatusChange(orderId: string, status: OrderStatus) {
    if (status === "shipped" || status === "out_for_delivery") {
      setTrackingForm({ trackingNumber: "", carrier: "", trackingUrl: "" });
      setTrackingDialog({ orderId, status });
      return;
    }
    setUpdatingOrderId(orderId);
    updateStatusMutation.mutate({ orderId, status });
  }

  const filteredOrders = sellerOrders.filter((o) =>
    statusFilter === "all" || o.status === statusFilter
  );

  // Revenue stats
  const totalRevenue = sellerDashboard?.summary.salesTotal ?? 0;

  const pendingOrders = sellerOrders.filter((o) =>
    ["pending", "confirmed", "processing", "order_placed", "payment_confirmed"].includes(o.status)
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      {/* Hero */}
      <div className="bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
              <Store className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-white/60 text-sm">{t("seller.title")}{user?.name ? `, ${user.name}` : ""}</div>
              <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">{t("seller.title")}</h1>
            </div>
            {isAuthenticated && (
              <Badge className="ml-auto bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                {t("seller.title")}
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t("seller.total_products"),    value: myProducts.length || "0",          icon: Package,    color: "text-emerald-400" },
              { label: t("seller.pending_orders"), value: pendingOrders || "—",              icon: Clock,      color: "text-amber-400" },
              { label: t("seller.total_revenue"),        value: totalRevenue > 0 ? `£${totalRevenue.toFixed(0)}` : "—", icon: DollarSign, color: "text-sky-400" },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 border border-white/15 rounded-xl px-3 py-2.5 flex items-center gap-2">
                <s.icon className={`h-5 w-5 ${s.color} flex-shrink-0`} />
                <div>
                  <div className="text-white font-black text-lg leading-none">{s.value}</div>
                  <div className="text-white/50 text-[10px]">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-5 bg-white/10 rounded-xl p-1">
            {(["overview", "orders"] as TabId[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                data-testid={`tab-${tab}`}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all capitalize ${
                  activeTab === tab
                    ? "bg-white text-green-900 shadow"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {tab === "orders" ? `${t("seller.orders_title")}${sellerOrders.length > 0 ? ` (${sellerOrders.length})` : ""}` : t("seller.performance_title")}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* ====== OVERVIEW TAB ====== */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold">{t("seller.quick_actions")}</h2>
                <Button size="sm" onClick={() => setLocation("/dashboard/photo-sell")} className="gap-1.5 rounded-full h-8 text-xs">
                  <Plus className="h-3.5 w-3.5" /> {t("seller.list_product_button")}
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {quickActions.map((a, i) => (
                  <motion.button
                    key={a.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setLocation(a.path)}
                    className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-card hover:border-primary/40 hover:bg-muted/60 transition-all text-left group"
                  >
                    <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                      <a.icon className="h-[18px] w-[18px] text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold leading-snug text-foreground group-hover:text-primary transition-colors">{a.label}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{a.desc}</div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold">{t("seller.orders_title")}</h2>
                <Button size="sm" variant="outline" onClick={() => setActiveTab("orders")} className="gap-1.5 h-8 text-xs">
                  <ClipboardList className="h-3.5 w-3.5" /> {t("seller.view_all_orders")}
                </Button>
              </div>
              <Card className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-base">{t("seller.orders_title")}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("seller.orders_description")}
                    </p>
                  </div>
                  <Button onClick={() => setActiveTab("orders")} size="sm" className="rounded-full gap-2 flex-shrink-0">
                    {t("seller.performance_title")} <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            </section>

            <section>
              <h2 className="text-base font-bold mb-3">{t("seller.performance_metrics")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tips.map((t, i) => (
                  <motion.div
                    key={t.title}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.06 }}
                    className="flex gap-3 p-4 rounded-xl border border-border/30 bg-card/60"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <t.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-bold mb-0.5">{t.title}</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{t.body}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            <Card className="p-5 bg-gradient-to-r from-primary/10 to-emerald-500/10 border-primary/20">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-base">{t("seller.cta_title")}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("seller.cta_description")}
                  </p>
                </div>
                <Button onClick={() => setLocation("/dashboard/photo-sell")} className="rounded-full gap-2 flex-shrink-0">
                  {t("seller.cta_button")} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ====== ORDERS TAB ====== */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-base font-bold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" /> {t("seller.orders_title")}
                <Badge variant="secondary">{sellerOrders.length}</Badge>
              </h2>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] h-8 text-xs" data-testid="select-order-filter">
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue placeholder={t("filters.title")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filters.clear_all")}</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {ordersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : ordersError ? (
              <div className="text-center py-16" data-testid="seller-orders-error-state">
                <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
                <p className="font-semibold">Unable to load orders</p>
                <Button size="sm" variant="outline" onClick={() => refetchOrders()} className="mt-4">Try again</Button>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="font-semibold text-muted-foreground">
                  {sellerOrders.length === 0 ? t("seller.no_orders_yet") : t("seller.no_orders_yet")}
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {sellerOrders.length === 0 ? t("seller.your_orders_will_appear") : t("seller.your_orders_will_appear")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order, idx) => {
                  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  const StatusIcon = cfg.icon;
                  const myItems = order.items;
                  const myTotal = order.total;

                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                    >
                      <Card className="overflow-hidden" data-testid={`seller-order-${order.id}`}>
                        <CardContent className="p-0">
                          {/* Order header */}
                          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-black text-sm font-mono">{order.orderNumber}</span>
                              <Badge className={`${cfg.color} border-none text-[10px] h-5 px-2 gap-1`}>
                                <StatusIcon className="h-2.5 w-2.5" />
                                {cfg.label}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">£{myTotal.toFixed(2)}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              </p>
                            </div>
                          </div>

                          {/* Items */}
                          <div className="px-4 py-3">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="flex -space-x-2">
                                {myItems.slice(0, 3).map((item, i) => (
                                  <img
                                    key={i}
                                    src={item.productImage || getProductImage(item.productName, "", "sm")}
                                    alt={item.productName}
                                    className="h-8 w-8 rounded-lg object-cover border-2 border-background"
                                  />
                                ))}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {myItems.map((i) => `${i.productName} ×${i.quantity}`).join(", ")}
                                </p>
                                {order.buyerName && (
                                  <p className="text-[10px] text-muted-foreground">Buyer: {order.buyerName}</p>
                                )}
                              </div>
                            </div>

                            {/* Delivery address */}
                            <p className="text-[11px] text-muted-foreground mb-3 truncate">
                              📍 {order.deliveryAddress}
                            </p>

                            {/* Status update */}
                            {order.status !== "cancelled" && order.status !== "delivered" && order.status !== "refunded" && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground flex-shrink-0">{t("seller.performance_title")}:</span>
                                <Select
                                  value={order.status}
                                  onValueChange={(val) => handleStatusChange(order.id, val as OrderStatus)}
                                  disabled={updateStatusMutation.isPending && updatingOrderId === order.id}
                                >
                                  <SelectTrigger className="h-7 text-xs flex-1" data-testid={`status-select-${order.id}`}>
                                    {updateStatusMutation.isPending && updatingOrderId === order.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <SelectValue />
                                    )}
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SELLER_STATUSES.map((s) => (
                                      <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {(order.status === "delivered" || order.status === "cancelled" || order.status === "refunded") && (
                              <div className={`flex items-center gap-1.5 text-xs ${order.status === "delivered" ? "text-green-600" : "text-destructive"}`}>
                                {order.status === "delivered"
                                  ? <><CheckCircle className="h-3.5 w-3.5" /> {t("seller.delivered")}</>
                                  : <><XCircle className="h-3.5 w-3.5" /> {order.status === "refunded" ? "Refunded" : t("seller.pending")}</>
                                }
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!trackingDialog} onOpenChange={(open) => !open && setTrackingDialog(null)}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-tracking">
          <DialogHeader>
            <DialogTitle>
              {t("seller.orders_title")}
            </DialogTitle>
            <DialogDescription>
              {t("seller.orders_description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tracking-carrier" className="text-xs">{t("ship.carrier")}</Label>
              <Input
                id="tracking-carrier"
                placeholder="e.g. Royal Mail, DPD, Local courier"
                value={trackingForm.carrier}
                onChange={(e) => setTrackingForm((f) => ({ ...f, carrier: e.target.value }))}
                data-testid="input-tracking-carrier"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tracking-number" className="text-xs">{t("ship.tracking_number")}</Label>
              <Input
                id="tracking-number"
                placeholder="e.g. AB123456789GB"
                value={trackingForm.trackingNumber}
                onChange={(e) => setTrackingForm((f) => ({ ...f, trackingNumber: e.target.value }))}
                data-testid="input-tracking-number"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tracking-url" className="text-xs">Tracking URL (optional)</Label>
              <Input
                id="tracking-url"
                placeholder="https://..."
                value={trackingForm.trackingUrl}
                onChange={(e) => setTrackingForm((f) => ({ ...f, trackingUrl: e.target.value }))}
                data-testid="input-tracking-url"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setTrackingDialog(null)}
              data-testid="btn-tracking-cancel"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (!trackingDialog) return;
                setUpdatingOrderId(trackingDialog.orderId);
                updateStatusMutation.mutate({
                  orderId: trackingDialog.orderId,
                  status: trackingDialog.status,
                  trackingNumber: trackingForm.trackingNumber.trim() || undefined,
                  carrier: trackingForm.carrier.trim() || undefined,
                  trackingUrl: trackingForm.trackingUrl.trim() || undefined,
                });
              }}
              disabled={updateStatusMutation.isPending}
              data-testid="btn-tracking-save"
            >
              {updateStatusMutation.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> {t("common.save")}…</>
              ) : (
                t("common.save")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
