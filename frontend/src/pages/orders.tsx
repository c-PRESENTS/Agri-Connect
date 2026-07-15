import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  ShoppingBag, Package, Truck, CheckCircle, Clock, XCircle,
  ChevronRight, ArrowLeft, Filter, Search, RefreshCw
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Order, OrderStatus } from "@shared/schema";
import { TopNavigation } from "@/components/top-navigation";
import { getProductImage } from "@/lib/product-images";

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: typeof Package }> = {
  pending:            { label: "Pending",            color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",     icon: Clock },
  confirmed:          { label: "Confirmed",          color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", icon: CheckCircle },
  order_placed:       { label: "Order Placed",       color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",     icon: Package },
  payment_confirmed:  { label: "Payment Confirmed",  color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", icon: CheckCircle },
  processing:         { label: "Processing",         color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",   icon: RefreshCw },
  shipped:            { label: "Shipped",            color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: Truck },
  out_for_delivery:   { label: "Out for Delivery",   color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",      icon: Truck },
  delivered:          { label: "Delivered",          color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",   icon: CheckCircle },
  cancelled:          { label: "Cancelled",          color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",          icon: XCircle },
  refunded:           { label: "Refunded",           color: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",  icon: RefreshCw },
};

const statusKeyMap: Record<string, string> = {
  pending: "orders.status_pending",
  confirmed: "orders.status_confirmed",
  order_placed: "orders.status_pending",
  payment_confirmed: "orders.status_confirmed",
  processing: "orders.status_confirmed",
  shipped: "orders.status_shipped",
  out_for_delivery: "orders.status_out_for_delivery",
  delivered: "orders.status_delivered",
  cancelled: "orders.status_cancelled",
  refunded: "orders.status_refunded",
};

export default function OrdersPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: orders = [], isLoading, isError, refetch } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const filtered = orders.filter((o) => {
    const matchSearch = !search ||
      o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some((i) => i.productName.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
              else navigate("/");
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-primary" /> {t("orders.title")}
            </h1>
            <p className="text-sm text-muted-foreground">{orders.length} {t("orders.title").toLowerCase()}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("orders.search_placeholder")}
              className="pl-9"
              data-testid="input-order-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t("orders.tab_all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("orders.tab_all")}</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{t(statusKeyMap[key] || key)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Orders list */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-10 sm:py-16" data-testid="orders-error-state">
            <XCircle className="h-14 w-14 text-destructive mx-auto mb-4 opacity-70" />
            <h2 className="text-xl font-bold mb-2">Unable to load orders</h2>
            <p className="text-muted-foreground text-sm mb-6">Please check your connection and try again.</p>
            <Button onClick={() => refetch()} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" /> Try again
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 sm:py-16">
            <ShoppingBag className="h-14 w-14 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h2 className="text-xl font-bold mb-2">
              {orders.length === 0 ? t("orders.empty_title") : t("orders.empty_title")}
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              {orders.length === 0
                ? t("orders.empty_description")
                : t("orders.search_placeholder")}
            </p>
            {orders.length === 0 && (
              <Button onClick={() => navigate("/")} className="gap-2">
                <ShoppingBag className="h-4 w-4" /> {t("orders.start_shopping")}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order, idx) => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const StatusIcon = cfg.icon;
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <Card
                    className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all"
                    onClick={() => navigate(`/orders/${order.id}`)}
                    data-testid={`order-card-${order.id}`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm font-mono">{order.orderNumber}</span>
                            <Badge className={`${cfg.color} border-none text-[10px] h-5 px-2 gap-1`}>
                              <StatusIcon className="h-2.5 w-2.5" />
                              {t(statusKeyMap[order.status] || order.status)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric", month: "short", year: "numeric"
                            })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-black text-lg">£{order.total.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                        </div>
                      </div>

                      {/* Item thumbnails */}
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {order.items.slice(0, 4).map((item, i) => (
                            <img
                              key={i}
                              src={item.productImage || getProductImage(item.productName, "", "sm")}
                              alt={item.productName}
                              loading="lazy"
                              className="h-9 w-9 rounded-lg object-cover border-2 border-background"
                            />
                          ))}
                          {order.items.length > 4 && (
                            <div className="h-9 w-9 rounded-lg bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                              +{order.items.length - 4}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground truncate">
                            {order.items.map((i) => i.productName).join(" · ")}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>

                      {/* Estimated delivery */}
                      {order.estimatedDelivery && order.status !== "delivered" && order.status !== "cancelled" && (
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {t("order_detail.estimated_delivery")}: {new Date(order.estimatedDelivery).toLocaleDateString("en-GB", {
                            weekday: "short", day: "numeric", month: "short"
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
