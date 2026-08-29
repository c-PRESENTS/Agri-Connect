import { useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  BadgePoundSterling,
  Box,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Heart,
  Leaf,
  MapPin,
  Package,
  PackageCheck,
  PackagePlus,
  RefreshCw,
  Settings,
  ShoppingBag,
  Star,
  Store,
  Truck,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Order, OrderStatus, Product } from "@shared/schema";
import { TopNavigation } from "@/components/top-navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import { resolveProductImageForOrderItem, resolveProductImageForProduct } from "@/lib/product-images";
import { useCurrency } from "@/contexts/currency-context";
import { SafeProductImage } from "@/components/safe-product-image";
import { OrderAgainButton } from "@/components/order-again-button";

type SellerDashboardData = {
  products: Product[];
  orders: Order[];
  summary: {
    productCount: number;
    orderCount: number;
    activeOrderCount: number;
    salesTotal: number;
  };
};

type Metric = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
};

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "order_placed",
  "payment_confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
];

const ACTION_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "order_placed",
  "payment_confirmed",
  "processing",
];

const STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-800 border-amber-200" },
  confirmed: { label: "Confirmed", className: "bg-blue-100 text-blue-800 border-blue-200" },
  order_placed: { label: "Order placed", className: "bg-blue-100 text-blue-800 border-blue-200" },
  payment_confirmed: { label: "Payment confirmed", className: "bg-violet-100 text-violet-800 border-violet-200" },
  processing: { label: "Processing", className: "bg-orange-100 text-orange-800 border-orange-200" },
  shipped: { label: "Shipped", className: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  out_for_delivery: { label: "Out for delivery", className: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  delivered: { label: "Delivered", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800 border-red-200" },
  refunded: { label: "Refunded", className: "bg-slate-100 text-slate-700 border-slate-200" },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function userInitials(name?: string | null) {
  return (name || "AgriConnect user")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  return (
    <Card className="border border-slate-200/80 dark:border-border/60 bg-white dark:bg-card rounded-2xl shadow-2xs">
      <CardContent className="flex items-center gap-3.5 p-3.5 sm:p-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${metric.tone}`}>
          <Icon className="h-5 w-5 font-black" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xl sm:text-2xl font-black leading-tight text-foreground font-mono">{metric.value}</p>
          <p className="mt-0.5 text-xs font-extrabold text-foreground truncate">{metric.label}</p>
          <p className="truncate text-[11px] font-bold text-muted-foreground">{metric.detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeading({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-2.5 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-[11px] sm:text-xs font-bold text-muted-foreground">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <Button variant="ghost" size="sm" onClick={onAction} className="h-7 px-2 shrink-0 gap-1 font-black text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 hover:bg-amber-400/10">
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-20 items-center gap-3.5 rounded-2xl border border-slate-200/80 dark:border-border/60 bg-white dark:bg-card p-3.5 sm:p-4 text-left shadow-2xs transition-all hover:border-emerald-400 hover:bg-emerald-50/40 hover:shadow-xs"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500/25">
        <Icon className="h-5 w-5 font-black" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm sm:text-base font-black text-foreground">{title}</p>
        <p className="mt-0.5 text-[11px] sm:text-xs font-bold text-muted-foreground truncate">{description}</p>
      </div>
      <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-700" />
    </button>
  );
}

function DashboardLoading() {
  return (
    <div className="w-full max-w-[1700px] mx-auto space-y-3 px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
      <Skeleton className="h-32 rounded-2xl" />
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-20 rounded-2xl" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center shadow-2xs">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-base sm:text-lg font-black text-foreground">{title}</p>
      <p className="mt-1 max-w-md text-xs font-bold text-muted-foreground">{description}</p>
      <Button size="sm" className="mt-3.5 h-8 px-4 text-xs font-black uppercase tracking-wider bg-amber-400 hover:bg-amber-500 text-black shadow-2xs rounded-xl" onClick={onAction}>{actionLabel}</Button>
    </div>
  );
}

function BuyerDashboard() {
  const [, navigate] = useLocation();
  const { format } = useCurrency();
  const { user } = useAuth();
  const { productIds, sellerIds } = useFavorites();
  const { data: orders = [], isLoading, isError, refetch } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [orders],
  );
  const activeOrders = orders.filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status));
  const deliveredOrders = orders.filter((order) => order.status === "delivered");
  const favoriteCount = productIds.length + sellerIds.length;
  const displayName = user?.firstName || user?.name?.split(" ")[0] || "there";
  const recentOrders = sortedOrders.slice(0, 3);
  const profileFields = [user?.name || user?.firstName, user?.email, user?.phone, user?.location];
  const completedFields = profileFields.filter(Boolean).length;
  const profilePercent = Math.round((completedFields / profileFields.length) * 100);

  if (isLoading) return <DashboardLoading />;

  const metrics: Metric[] = [
    { label: "Active orders", value: String(activeOrders.length), detail: "Currently being fulfilled", icon: Truck, tone: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" },
    { label: "Total orders", value: String(orders.length), detail: "Your purchase history", icon: ShoppingBag, tone: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" },
    { label: "Favourites", value: String(favoriteCount), detail: "Products and farmers saved", icon: Heart, tone: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400" },
    { label: "Delivered", value: String(deliveredOrders.length), detail: "Completed purchases", icon: PackageCheck, tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" },
  ];

  return (
    <main id="main-content" className="w-full max-w-[1700px] mx-auto space-y-3 px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
      <section className="overflow-hidden rounded-2xl border border-emerald-900/20 bg-gradient-to-r from-emerald-950 via-emerald-900 to-green-800 p-4 sm:p-5 text-white shadow-md">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-white/40 shadow-xs">
              <AvatarImage src={user?.avatar || user?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-white/20 font-black text-white text-base">
                {userInitials(user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`)}
              </AvatarFallback>
            </Avatar>
            <div>
              <Badge className="mb-1 border-amber-300 bg-amber-400 px-2.5 py-0.5 font-black text-emerald-950 shadow-2xs hover:bg-amber-400 text-[11px] uppercase tracking-wider rounded-full">
                Buyer account
              </Badge>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">Hello, {displayName}</h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-bold">Track purchases and return to your favourite farm produce.</p>
            </div>
          </div>
          <Button onClick={() => navigate("/")} className="gap-1.5 h-8 sm:h-9 px-3.5 bg-amber-400 font-black text-black hover:bg-amber-500 text-xs uppercase tracking-wider rounded-xl shadow-2xs border border-amber-500/40">
            <ShoppingBag className="h-4 w-4 text-black" />
            Continue shopping
          </Button>
        </div>
      </section>

      {isError && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/40 p-3.5 text-xs sm:text-sm font-bold text-red-900 dark:text-red-200 shadow-2xs">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <span className="flex-1">We could not load your latest orders.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 px-2.5 gap-1 font-black uppercase text-xs">
            <RefreshCw className="h-3 w-3" /> Try again
          </Button>
        </div>
      )}

      <section className="grid gap-2.5 grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
      </section>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <SectionHeading
            title="Your orders"
            description="The most recent updates from your purchases"
            actionLabel="View all orders"
            onAction={() => navigate("/orders")}
          />
          <Card className="border border-slate-200/80 dark:border-border/60 rounded-2xl shadow-2xs bg-card overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              {recentOrders.length === 0 ? (
                <EmptyState
                  icon={ShoppingBag}
                  title="No orders yet"
                  description="When you make a purchase, delivery updates and order details will appear here."
                  actionLabel="Browse products"
                  onAction={() => navigate("/")}
                />
              ) : (
                <div className="divide-y divide-border/40">
                  {recentOrders.map((order) => {
                    const firstItem = order.items[0];
                    const image = firstItem ? resolveProductImageForOrderItem(firstItem).src : undefined;
                    return (
                      <div key={order.id} className="flex items-center rounded-xl transition-colors hover:bg-muted/60">
                        <button
                          type="button"
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="flex min-w-0 flex-1 items-center gap-3 px-2.5 py-3 text-left"
                        >
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted shadow-2xs">
                            {image ? (
                              <img src={image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Package className="m-3 h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-xs sm:text-sm font-black text-foreground">{order.orderNumber}</p>
                              <Badge variant="outline" className={`font-black text-[10px] px-1.5 py-0 ${STATUS_META[order.status].className}`}>
                                {STATUS_META[order.status].label}
                              </Badge>
                            </div>
                            <p className="mt-0.5 truncate text-[11px] font-bold text-muted-foreground">
                              {order.items.map((item) => item.productName).join(", ")}
                            </p>
                            <p className="text-[10px] font-extrabold text-muted-foreground">{formatDate(order.createdAt)}</p>
                          </div>
                          <div className="hidden shrink-0 text-right lg:block">
                            <p className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">{format(order.total, { includeCode: true })}</p>
                            <p className="text-[10px] font-black text-primary hover:underline">View details</p>
                          </div>
                          <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
                        </button>
                        <OrderAgainButton
                          orderId={order.id}
                          className="mr-2 shrink-0 h-7.5 px-2 text-xs font-bold"
                          testId={`button-dashboard-order-again-${order.id}`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <SectionHeading title="Quick actions" description="Common account tasks" />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <QuickAction icon={ShoppingBag} title="Browse marketplace" description="Discover fresh products from farmers." onClick={() => navigate("/")} />
            <QuickAction icon={Heart} title="Your favourites" description="Return to products and sellers you saved." onClick={() => navigate("/favorites")} />
            <QuickAction icon={CircleUserRound} title="Account settings" description="Update your contact and location details." onClick={() => navigate("/settings")} />
          </div>
        </section>
      </div>

      <section className="pt-1">
        <SectionHeading title="Your account" description="Keep your details ready for a faster checkout" />
        <Card className="overflow-hidden border border-slate-200/80 dark:border-border/60 rounded-2xl bg-card shadow-2xs">
          <CardContent className="grid gap-0 p-0 md:grid-cols-[1fr_1fr_auto]">
            <div className="flex items-center gap-3 border-b border-border/40 p-4 md:border-b-0 md:border-r">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                <MapPin className="h-5 w-5 font-black" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-black text-foreground">Delivery location</p>
                <p className="truncate text-xs font-bold text-muted-foreground">{user?.location || "Add your location"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-b border-border/40 p-4 md:border-b-0 md:border-r">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                <CheckCircle2 className="h-5 w-5 font-black" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-black text-foreground">Profile completeness</p>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted border border-border/40">
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${profilePercent}%` }} />
                </div>
                <p className="mt-1 text-[11px] font-bold text-muted-foreground">{profilePercent}% complete</p>
              </div>
            </div>
            <div className="flex items-center p-3.5 sm:p-4">
              <Button variant="outline" size="sm" onClick={() => navigate("/settings")} className="w-full h-8 px-3.5 font-bold text-xs gap-1.5 md:w-auto border-border/80 rounded-xl">
                <Settings className="h-3.5 w-3.5" /> Manage account
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function FarmerDashboard() {
  const [, navigate] = useLocation();
  const { format } = useCurrency();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery<SellerDashboardData>({
    queryKey: ["/api/dashboard/seller"],
  });

  const orders = data?.orders ?? [];
  const products = data?.products ?? [];
  const actionOrders = orders.filter((order) => ACTION_ORDER_STATUSES.includes(order.status));
  const lowStockProducts = [...products]
    .filter((product) => product.stock <= 5)
    .sort((a, b) => a.stock - b.stock);
  const averageRating = products.length
    ? products.reduce((total, product) => total + (product.rating || 0), 0) / products.length
    : 0;
  const displayName = user?.firstName || user?.name?.split(" ")[0] || "Farmer";

  if (isLoading) return <DashboardLoading />;

  const metrics: Metric[] = [
    { label: "Sales value", value: format(data?.summary.salesTotal ?? 0, { includeCode: true }), detail: "Open and completed orders", icon: BadgePoundSterling, tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" },
    { label: "Orders to action", value: String(actionOrders.length), detail: "Need fulfilment updates", icon: Clock3, tone: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" },
    { label: "Active listings", value: String(data?.summary.productCount ?? 0), detail: `${lowStockProducts.length} low in stock`, icon: Box, tone: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" },
    { label: "Product rating", value: averageRating ? averageRating.toFixed(1) : "—", detail: averageRating ? "Average across listings" : "No ratings yet", icon: Star, tone: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400" },
  ];

  return (
    <main id="main-content" className="w-full max-w-[1700px] mx-auto space-y-3 px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
      <section className="overflow-hidden rounded-2xl border border-emerald-900/20 bg-gradient-to-r from-emerald-950 via-emerald-900 to-green-800 p-4 sm:p-5 text-white shadow-md">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-white/40 shadow-xs">
              <AvatarImage src={user?.avatar || user?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-white/20 font-black text-white text-base">{userInitials(user?.name)}</AvatarFallback>
            </Avatar>
            <div>
              <Badge className="mb-1 border-white/30 bg-white/15 text-white hover:bg-white/20 font-black text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-2xs">Farmer workspace</Badge>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">Welcome back, {displayName}</h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-bold">Manage today&apos;s orders, stock, and farm sales.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/photo-sell")} className="gap-1.5 h-8 sm:h-9 px-3 border-white/40 bg-white/15 text-white hover:bg-white/30 hover:text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-2xs">
              <Camera className="h-3.5 w-3.5 text-white" /> Photo-Sell
            </Button>
            <Button size="sm" onClick={() => navigate("/dashboard/list-product")} className="gap-1.5 h-8 sm:h-9 px-3.5 bg-amber-400 font-black text-black hover:bg-amber-500 text-xs uppercase tracking-wider rounded-xl shadow-2xs border border-amber-500/40">
              <PackagePlus className="h-4 w-4 text-black" /> Add product
            </Button>
          </div>
        </div>
      </section>

      {isError && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/40 p-3.5 text-xs sm:text-sm font-bold text-red-900 dark:text-red-200 shadow-2xs">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <span className="flex-1">We could not load your seller dashboard.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 px-2.5 gap-1 font-black uppercase text-xs">
            <RefreshCw className="h-3 w-3" /> Try again
          </Button>
        </div>
      )}

      {(actionOrders.length > 0 || lowStockProducts.length > 0) && (
        <Card className="border border-amber-300 bg-amber-50/90 dark:bg-amber-950/40 shadow-2xs rounded-2xl">
          <CardContent className="flex flex-col gap-2.5 p-3.5 sm:flex-row sm:items-center">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/30 text-amber-900 dark:text-amber-200 border border-amber-400/50 shadow-2xs">
              <AlertCircle className="h-4.5 w-4.5 font-black" />
            </div>
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-100">Your attention is needed</p>
              <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
                {actionOrders.length} order{actionOrders.length === 1 ? "" : "s"} to fulfil
                {lowStockProducts.length > 0 ? ` · ${lowStockProducts.length} listing${lowStockProducts.length === 1 ? "" : "s"} low in stock` : ""}
              </p>
            </div>
            <Button size="sm" onClick={() => navigate("/seller")} className="h-7.5 px-3 font-black uppercase text-xs tracking-wider bg-amber-400 text-black hover:bg-amber-500 rounded-xl shadow-2xs">
              Review now
            </Button>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-2.5 grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
      </section>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <SectionHeading
            title="Orders to fulfil"
            description="Prioritised orders waiting for your action"
            actionLabel="Open order workspace"
            onAction={() => navigate("/seller")}
          />
          <Card className="border border-slate-200/80 dark:border-border/60 rounded-2xl shadow-2xs bg-card overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              {actionOrders.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="You are all caught up"
                  description="New paid orders that need fulfilment will appear here."
                  actionLabel="View all orders"
                  onAction={() => navigate("/seller")}
                />
              ) : (
                <div className="divide-y divide-border/40">
                  {actionOrders.slice(0, 4).map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => navigate("/seller")}
                      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-3 text-left transition-colors hover:bg-muted/60"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-700 dark:text-amber-400 border border-amber-400/40">
                        <Package className="h-5 w-5 font-black" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-xs sm:text-sm font-black text-foreground">{order.orderNumber}</p>
                          <Badge variant="outline" className={`font-black text-[10px] px-1.5 py-0 ${STATUS_META[order.status].className}`}>
                            {STATUS_META[order.status].label}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] font-bold text-muted-foreground">
                          {order.items.length} item{order.items.length === 1 ? "" : "s"} · {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <p className="hidden shrink-0 text-sm font-black text-amber-600 dark:text-amber-400 font-mono sm:block">{format(order.total, { includeCode: true })}</p>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <SectionHeading title="Quick actions" description="Run your farm storefront" />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <QuickAction icon={Store} title="Seller workspace" description="Manage listings, orders, payouts, and fulfilment." onClick={() => navigate("/seller")} />
            <QuickAction icon={PackagePlus} title="List a product" description="Add produce, set price, and update stock." onClick={() => navigate("/dashboard/list-product")} />
            <QuickAction icon={WalletCards} title="Payments and payouts" description="Review protected balances and payout history." onClick={() => navigate("/seller")} />
          </div>
        </section>
      </div>

      <section className="pt-1">
        <SectionHeading
          title="Inventory health"
          description="Listings that may need a stock update"
          actionLabel="Manage listings"
          onAction={() => navigate("/seller")}
        />
        <Card className="border border-slate-200/80 dark:border-border/60 rounded-2xl shadow-2xs bg-card overflow-hidden">
          <CardContent className="p-3 sm:p-4">
            {products.length === 0 ? (
              <EmptyState
                icon={Leaf}
                title="Start your storefront"
                description="List your first farm product so buyers can discover it."
                actionLabel="Add your first product"
                onAction={() => navigate("/dashboard/list-product")}
              />
            ) : lowStockProducts.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3.5 text-emerald-950 dark:text-emerald-100 shadow-2xs">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 font-black" />
                <div>
                  <p className="text-xs sm:text-sm font-black text-foreground">Stock levels look healthy</p>
                  <p className="text-[11px] font-bold text-muted-foreground">None of your current listings are at or below 5 units.</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {lowStockProducts.slice(0, 8).map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => navigate("/seller")}
                    className="flex items-center gap-3 rounded-xl border border-slate-200/80 dark:border-border/60 p-2.5 text-left transition-all hover:border-amber-400 hover:bg-amber-500/10 shadow-2xs"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted border border-border/60">
                      <SafeProductImage
                        src={resolveProductImageForProduct(product).src}
                        fallbackSrc={resolveProductImageForProduct(product).fallbackSrc}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs sm:text-sm font-black text-foreground">{product.name}</p>
                      <p className={`mt-0.5 text-[11px] font-black ${product.stock === 0 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {product.stock === 0 ? "Out of stock" : `${product.stock} ${product.unit} left`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#f8faf6] dark:bg-background text-foreground pb-12">
      <TopNavigation />
      {isLoading ? (
        <DashboardLoading />
      ) : !user ? (
        <div className="mx-auto max-w-lg px-4 py-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CircleUserRound className="h-5 w-5 text-primary" />
                Sign in to view your dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Your orders, favourites, and account tools are available after sign in.</p>
              <Button className="mt-5 w-full" onClick={() => navigate("/login")}>Sign in</Button>
            </CardContent>
          </Card>
        </div>
      ) : user.role === "farmer" ? (
        <FarmerDashboard />
      ) : (
        <BuyerDashboard />
      )}
    </div>
  );
}
