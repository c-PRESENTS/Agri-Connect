import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  ArrowLeft,
  Filter,
  Search,
  RefreshCw,
  Copy,
  Check,
  CreditCard,
  Receipt,
  Sparkles,
  ArrowUpDown,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Order, OrderStatus } from "@shared/schema";
import { TopNavigation } from "@/components/top-navigation";
import { resolveProductImageForOrderItem } from "@/lib/product-images";
import { BuyerTransactionHistory } from "@/components/payments/buyer-transaction-history";
import { useCurrency } from "@/contexts/currency-context";
import { OrderAgainButton } from "@/components/order-again-button";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; icon: typeof Package }
> = {
  pending: {
    label: "Pending",
    color: "text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmed",
    color: "text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40",
    icon: CheckCircle2,
  },
  order_placed: {
    label: "Order Placed",
    color: "text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40",
    icon: Package,
  },
  payment_confirmed: {
    label: "Payment Confirmed",
    color: "text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40",
    icon: CheckCircle2,
  },
  processing: {
    label: "Processing",
    color: "text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/60 bg-violet-50 dark:bg-violet-950/40",
    icon: RefreshCw,
  },
  shipped: {
    label: "Shipped",
    color: "text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/60 bg-orange-50 dark:bg-orange-950/40",
    icon: Truck,
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60 bg-cyan-50 dark:bg-cyan-950/40",
    icon: Truck,
  },
  delivered: {
    label: "Delivered",
    color: "text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40",
    icon: XCircle,
  },
  refunded: {
    label: "Refunded",
    color: "text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/40",
    icon: RefreshCw,
  },
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

const ACTIVE_STATUSES = new Set([
  "pending",
  "confirmed",
  "order_placed",
  "payment_confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
]);

export default function OrdersPage() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const {
    data: orders = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 30_000,
  });

  const metrics = useMemo(() => {
    const totalCount = orders.length;
    const activeCount = orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length;
    const deliveredCount = orders.filter((o) => o.status === "delivered").length;
    const totalSpent = orders
      .filter((o) => o.status !== "cancelled" && o.status !== "refunded")
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    return { totalCount, activeCount, deliveredCount, totalSpent };
  }, [orders]);

  const tabCounts = useMemo(() => {
    return {
      all: orders.length,
      active: orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      cancelled: orders.filter((o) => o.status === "cancelled" || o.status === "refunded").length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let result = orders.filter((o) => {
      if (activeTab === "active" && !ACTIVE_STATUSES.has(o.status)) return false;
      if (activeTab === "delivered" && o.status !== "delivered") return false;
      if (activeTab === "cancelled" && o.status !== "cancelled" && o.status !== "refunded")
        return false;

      if (statusFilter !== "all" && o.status !== statusFilter) return false;

      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const matchNum = o.orderNumber?.toLowerCase().includes(query);
        const matchItem = o.items.some((i) => i.productName.toLowerCase().includes(query));
        if (!matchNum && !matchItem) return false;
      }

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "highest") {
        return (Number(b.total) || 0) - (Number(a.total) || 0);
      }
      if (sortBy === "lowest") {
        return (Number(a.total) || 0) - (Number(b.total) || 0);
      }
      return 0;
    });

    return result;
  }, [orders, activeTab, statusFilter, search, sortBy]);

  const handleCopyOrderId = (e: React.MouseEvent, orderNumber: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(orderNumber);
    setCopiedOrderId(orderNumber);
    toast({
      title: "Order ID copied",
      description: `${orderNumber} copied to clipboard.`,
    });
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setActiveTab("all");
    setSortBy("newest");
  };

  return (
    <div className="min-h-screen bg-[#f8faf6] dark:bg-background text-foreground pb-16">
      <TopNavigation />

      <main className="w-full max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-4 space-y-3 sm:space-y-3.5">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  window.history.back();
                } else {
                  navigate("/");
                }
              }}
              className="h-9 w-9 rounded-xl bg-white dark:bg-card border border-slate-200/80 dark:border-border/60 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-emerald-500 shadow-2xs transition-all"
              data-testid="button-back"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-emerald-700 dark:text-emerald-500" />
                  {t("orders.title", "Your Orders")}
                </h1>
                <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40 text-[11px] font-black px-2 py-0 rounded-full">
                  {orders.length}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-muted-foreground">
                Track your active shipments, delivery status, and payment receipts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 px-3 rounded-xl border-slate-200 dark:border-border text-xs font-bold gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin text-emerald-600" : ""}`} />
              <span>Refresh</span>
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/")}
              className="h-8 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold gap-1.5 shadow-2xs"
            >
              <Sparkles className="h-3 w-3" />
              <span>Explore Marketplace</span>
            </Button>
          </div>
        </div>

        {/* Quick Summary Metric Cards */}
        {orders.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <Card className="rounded-2xl border border-slate-200/80 dark:border-border/60 bg-white dark:bg-card shadow-2xs">
              <CardContent className="p-3 sm:p-3.5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                  <ShoppingBag className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-muted-foreground">Total Orders</p>
                  <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 leading-tight">{metrics.totalCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-200/80 dark:border-border/60 bg-white dark:bg-card shadow-2xs">
              <CardContent className="p-3 sm:p-3.5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 flex items-center justify-center text-cyan-700 dark:text-cyan-400 shrink-0">
                  <Truck className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-muted-foreground">In Transit / Active</p>
                  <p className="text-lg sm:text-xl font-black text-cyan-700 dark:text-cyan-400 leading-tight">{metrics.activeCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-200/80 dark:border-border/60 bg-white dark:bg-card shadow-2xs">
              <CardContent className="p-3 sm:p-3.5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-muted-foreground">Delivered</p>
                  <p className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-400 leading-tight">{metrics.deliveredCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-200/80 dark:border-border/60 bg-white dark:bg-card shadow-2xs">
              <CardContent className="p-3 sm:p-3.5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                  <Receipt className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-muted-foreground">Total Value</p>
                  <p className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 truncate leading-tight">
                    {format(metrics.totalSpent, { includeCode: true })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Primary Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 dark:border-border/60 pb-2.5">
            <TabsList className="h-9 bg-slate-200/60 dark:bg-muted p-0.5 rounded-xl gap-1">
              <TabsTrigger
                value="all"
                className="rounded-lg px-3 py-1 text-xs font-black data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:text-emerald-800 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-2xs transition-all gap-1"
              >
                <span>All Orders</span>
                <span className="text-[10px] bg-slate-200 dark:bg-muted px-1.5 py-0.2 rounded-full font-bold">
                  {tabCounts.all}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="active"
                className="rounded-lg px-3 py-1 text-xs font-black data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:text-cyan-700 dark:data-[state=active]:text-cyan-400 data-[state=active]:shadow-2xs transition-all gap-1"
              >
                <span>In-Transit</span>
                {tabCounts.active > 0 && (
                  <span className="text-[10px] bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 px-1.5 py-0.2 rounded-full font-bold">
                    {tabCounts.active}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="delivered"
                className="rounded-lg px-3 py-1 text-xs font-black data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:text-emerald-800 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-2xs transition-all gap-1"
              >
                <span>Delivered</span>
                <span className="text-[10px] bg-slate-200 dark:bg-muted px-1.5 py-0.2 rounded-full font-bold">
                  {tabCounts.delivered}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="cancelled"
                className="rounded-lg px-3 py-1 text-xs font-black data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:text-rose-700 dark:data-[state=active]:text-rose-400 data-[state=active]:shadow-2xs transition-all gap-1"
              >
                <span>Cancelled</span>
              </TabsTrigger>
              <TabsTrigger
                value="transactions"
                className="rounded-lg px-3 py-1 text-xs font-black data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-2xs transition-all gap-1"
              >
                <CreditCard className="h-3 w-3" />
                <span>Payment History</span>
              </TabsTrigger>
            </TabsList>

            {activeTab !== "transactions" && (
              <span className="text-xs font-semibold text-slate-500 dark:text-muted-foreground self-end sm:self-auto">
                Showing {filteredOrders.length} of {orders.length} orders
              </span>
            )}
          </div>

          {/* Tab Content 1: Orders (All / Active / Delivered / Cancelled) */}
          {activeTab !== "transactions" && (
            <div className="space-y-3">
              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by order ID (e.g. AGC26-...), crop name, or farmer..."
                    className="pl-9 h-9 rounded-xl border-slate-200/80 dark:border-border/60 bg-white dark:bg-card text-xs font-semibold shadow-2xs focus-visible:ring-emerald-500"
                    data-testid="input-order-search"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger
                      className="w-[140px] sm:w-[150px] h-9 rounded-xl border-slate-200/80 dark:border-border/60 bg-white dark:bg-card text-xs font-bold shadow-2xs"
                      data-testid="select-status-filter"
                    >
                      <Filter className="h-3 w-3 mr-1 text-slate-400" />
                      <SelectValue placeholder="Status: All" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">Status: All</SelectItem>
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key} className="text-xs font-semibold">
                          {t(statusKeyMap[key] || cfg.label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                    <SelectTrigger className="w-[130px] sm:w-[150px] h-9 rounded-xl border-slate-200/80 dark:border-border/60 bg-white dark:bg-card text-xs font-bold shadow-2xs">
                      <ArrowUpDown className="h-3 w-3 mr-1 text-slate-400" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="newest" className="text-xs font-semibold">
                        Newest First
                      </SelectItem>
                      <SelectItem value="oldest" className="text-xs font-semibold">
                        Oldest First
                      </SelectItem>
                      <SelectItem value="highest" className="text-xs font-semibold">
                        Highest Amount
                      </SelectItem>
                      <SelectItem value="lowest" className="text-xs font-semibold">
                        Lowest Amount
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Orders List / Loading / Error / Empty States */}
              {isLoading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-44 bg-white dark:bg-card rounded-2xl border border-slate-200/80 animate-pulse p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="h-4 w-32 bg-muted rounded-md" />
                        <div className="h-4 w-20 bg-muted rounded-md" />
                      </div>
                      <div className="h-12 bg-muted/50 rounded-xl" />
                      <div className="flex justify-between items-center pt-2">
                        <div className="h-4 w-24 bg-muted rounded-md" />
                        <div className="h-7 w-20 bg-muted rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <Card className="rounded-2xl border-destructive/30 p-8 text-center space-y-3 bg-rose-50/20 dark:bg-rose-950/10">
                  <XCircle className="h-10 w-10 text-destructive mx-auto opacity-80" />
                  <div>
                    <h2 className="text-base font-black text-slate-900 dark:text-slate-100">Unable to load orders</h2>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      There was a network problem fetching your order history. Please check your connection.
                    </p>
                  </div>
                  <Button onClick={() => refetch()} variant="outline" size="sm" className="rounded-xl font-bold text-xs gap-1.5">
                    <RefreshCw className="h-3 w-3" /> Try Again
                  </Button>
                </Card>
              ) : filteredOrders.length === 0 ? (
                <Card className="rounded-2xl border border-slate-200/80 dark:border-border/60 p-8 text-center space-y-3 bg-white dark:bg-card shadow-2xs">
                  <div className="h-12 w-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
                    <ShoppingBag className="h-6 w-6 opacity-80" />
                  </div>
                  <div className="space-y-1 max-w-sm mx-auto">
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      {orders.length === 0
                        ? "You haven't placed any orders yet"
                        : "No orders match your filter criteria"}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {orders.length === 0
                        ? "Browse our fresh farm catalog, discover verified producers, and place your first direct order."
                        : "Try adjusting your search keywords or resetting your status filters to view all orders."}
                    </p>
                  </div>
                  <div>
                    {orders.length === 0 ? (
                      <Button
                        onClick={() => navigate("/")}
                        size="sm"
                        className="rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-4 shadow-2xs"
                      >
                        Start Shopping Now
                      </Button>
                    ) : (
                      <Button
                        onClick={handleClearFilters}
                        variant="outline"
                        size="sm"
                        className="rounded-xl font-bold text-xs px-3.5"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </Card>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  <AnimatePresence>
                    {filteredOrders.map((order, idx) => {
                      const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                      const StatusIcon = cfg.icon;
                      const isDelivered = order.status === "delivered";
                      const isCancelled = order.status === "cancelled" || order.status === "refunded";
                      const isTransit = !isDelivered && !isCancelled;

                      return (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.2, delay: idx * 0.02 }}
                          className="flex flex-col"
                        >
                          <Card
                            className="rounded-2xl border border-slate-200/80 dark:border-border/60 bg-white dark:bg-card shadow-2xs hover:shadow-md hover:border-emerald-500/50 dark:hover:border-emerald-500/40 transition-all overflow-hidden group flex flex-col flex-1"
                            data-testid={`order-card-${order.id}`}
                          >
                            {/* Card Top Header */}
                            <div className="p-3 sm:p-3.5 bg-slate-50/70 dark:bg-muted/20 border-b border-slate-100 dark:border-border/40 flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 bg-white dark:bg-card px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-border/60 shadow-2xs">
                                  <span className="text-[11px] text-muted-foreground font-semibold">Order</span>
                                  <span className="font-mono font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                                    {order.orderNumber}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyOrderId(e, order.orderNumber)}
                                    className="text-slate-400 hover:text-emerald-700 transition-colors ml-0.5"
                                    title="Copy order number"
                                    aria-label="Copy order number"
                                  >
                                    {copiedOrderId === order.orderNumber ? (
                                      <Check className="h-3 w-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </button>
                                </div>

                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                                  <Calendar className="h-3 w-3 text-slate-400" />
                                  <span>
                                    {new Date(order.createdAt).toLocaleDateString("en-GB", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Badge
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 shadow-2xs ${cfg.color}`}
                                >
                                  <StatusIcon className="h-2.5 w-2.5" />
                                  <span>{t(statusKeyMap[order.status] || cfg.label)}</span>
                                </Badge>
                                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                                  {format(order.total, { includeCode: true })}
                                </span>
                              </div>
                            </div>

                            {/* Card Body */}
                            <CardContent className="p-3 sm:p-3.5 space-y-2.5 flex flex-col justify-between flex-1">
                              {/* Order Delivery Status Bar for Active Orders */}
                              {isTransit && (
                                <div className="rounded-xl border border-cyan-100 dark:border-cyan-900/40 bg-cyan-50/50 dark:bg-cyan-950/20 px-2.5 py-1.5 flex items-center justify-between gap-2 flex-wrap text-xs">
                                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-900 dark:text-cyan-300">
                                    <Truck className="h-3.5 w-3.5 text-cyan-600 animate-pulse" />
                                    <span>
                                      {order.status === "shipped" || order.status === "out_for_delivery"
                                        ? "Package is on the way"
                                        : "Seller is preparing your order"}
                                    </span>
                                  </div>
                                  {order.estimatedDelivery && (
                                    <div className="text-[10px] text-cyan-800 dark:text-cyan-400 font-semibold flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span>
                                        Est:{" "}
                                        {new Date(order.estimatedDelivery).toLocaleDateString("en-GB", {
                                          weekday: "short",
                                          day: "numeric",
                                          month: "short",
                                        })}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Items List Preview */}
                              <div className="space-y-1.5 flex-1">
                                {order.items.slice(0, 4).map((item, i) => {
                                  const imgRes = resolveProductImageForOrderItem(item);
                                  return (
                                    <div
                                      key={i}
                                      className="flex items-center justify-between gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-muted/30 transition-colors"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <img
                                          src={imgRes.src}
                                          alt={item.productName}
                                          loading="lazy"
                                          onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = imgRes.fallbackSrc ?? imgRes.src;
                                          }}
                                          className="h-9 w-9 rounded-lg object-cover border border-slate-200/80 dark:border-border/60 bg-slate-100 shrink-0"
                                        />
                                        <div className="min-w-0">
                                          <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                                            {item.productName}
                                          </p>
                                          <p className="text-[11px] text-muted-foreground">
                                            Qty: <span className="font-bold text-slate-700 dark:text-slate-300">{item.quantity}</span>
                                            {item.price ? ` · ${format(item.price, { includeCode: true })}` : ""}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="text-right shrink-0">
                                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                          {format((Number(item.price) || 0) * (Number(item.quantity) || 1), {
                                            includeCode: true,
                                          })}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                                {order.items.length > 4 && (
                                  <p className="text-[11px] text-muted-foreground font-semibold pl-2">
                                    +{order.items.length - 4} more item{order.items.length - 4 > 1 ? "s" : ""}
                                  </p>
                                )}
                              </div>

                              {/* Card Action Row */}
                              <div className="pt-2 border-t border-slate-100 dark:border-border/40 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0">
                                    {order.paymentMethod || "Direct Escrow"}
                                  </Badge>
                                  <span>· {order.items.length} item{order.items.length !== 1 ? "s" : ""}</span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <OrderAgainButton
                                    orderId={order.id}
                                    className="h-7.5 px-2.5 rounded-xl text-xs font-bold shadow-2xs"
                                    testId={`button-order-again-${order.id}`}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => navigate(`/orders/${order.id}`)}
                                    className="h-7.5 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-2xs gap-1"
                                    data-testid={`button-view-order-${order.id}`}
                                  >
                                    <span>View Details</span>
                                    <ChevronRight className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {/* Tab Content 2: Payment History */}
          <TabsContent value="transactions" className="mt-0">
            <BuyerTransactionHistory />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
