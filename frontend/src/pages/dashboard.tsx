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
  Loader2,
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
import { resolveProductImageForOrderItem } from "@/lib/product-images";
import { useCurrency } from "@/contexts/currency-context";

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
    <Card className="border-border/70 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="flex items-start gap-3 p-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${metric.tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-black leading-none tracking-tight">{metric.value}</p>
          <p className="mt-1 text-sm font-bold">{metric.label}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{metric.detail}</p>
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
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-black tracking-tight">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <Button variant="ghost" size="sm" onClick={onAction} className="shrink-0 gap-1 text-primary">
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
      className="group flex min-h-24 items-start gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="ml-auto mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
      <Skeleton className="h-36 rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
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
    <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-3 font-bold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      <Button size="sm" className="mt-4" onClick={onAction}>{actionLabel}</Button>
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
    { label: "Active orders", value: String(activeOrders.length), detail: "Currently being fulfilled", icon: Truck, tone: "bg-blue-50 text-blue-700" },
    { label: "Total orders", value: String(orders.length), detail: "Your purchase history", icon: ShoppingBag, tone: "bg-amber-50 text-amber-700" },
    { label: "Favourites", value: String(favoriteCount), detail: "Products and farmers saved", icon: Heart, tone: "bg-rose-50 text-rose-700" },
    { label: "Delivered", value: String(deliveredOrders.length), detail: "Completed purchases", icon: PackageCheck, tone: "bg-emerald-50 text-emerald-700" },
  ];

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
      <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-gradient-to-r from-emerald-950 via-emerald-900 to-green-800 p-5 text-white shadow-lg sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-white/30">
              <AvatarImage src={user?.avatar || user?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-white/15 font-black text-white">
                {userInitials(user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`)}
              </AvatarFallback>
            </Avatar>
            <div>
              <Badge className="mb-2 border-amber-300 bg-amber-400 px-3 py-1 font-black text-emerald-950 shadow-sm hover:bg-amber-400">
                Buyer account
              </Badge>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Hello, {displayName}</h1>
              <p className="mt-1 text-sm text-emerald-100">Track purchases and quickly return to what matters.</p>
            </div>
          </div>
          <Button onClick={() => navigate("/")} className="gap-2 bg-amber-400 font-bold text-slate-950 hover:bg-amber-300">
            <ShoppingBag className="h-4 w-4" />
            Continue shopping
          </Button>
        </div>
      </section>

      {isError && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5" />
          <span className="flex-1">We could not load your latest orders.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </Button>
        </div>
      )}

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <SectionHeading
            title="Your orders"
            description="The most recent updates from your purchases"
            actionLabel="View all orders"
            onAction={() => navigate("/orders")}
          />
          <Card className="shadow-sm">
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
                <div className="divide-y">
                  {recentOrders.map((order) => {
                    const firstItem = order.items[0];
                    const image = firstItem ? resolveProductImageForOrderItem(firstItem).src : undefined;
                    return (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-muted/60 sm:gap-4"
                      >
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
                          {image ? (
                            <img src={image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Package className="m-4 h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-bold">{order.orderNumber}</p>
                            <Badge variant="outline" className={STATUS_META[order.status].className}>
                              {STATUS_META[order.status].label}
                            </Badge>
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {order.items.map((item) => item.productName).join(", ")}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                        </div>
                        <div className="hidden shrink-0 text-right sm:block">
                           <p className="text-sm font-black">{format(order.total, { includeCode: true })}</p>
                          <p className="mt-1 text-xs text-primary">View details</p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <SectionHeading title="Quick actions" description="Common account tasks" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <QuickAction icon={ShoppingBag} title="Browse marketplace" description="Discover fresh products from farmers." onClick={() => navigate("/")} />
            <QuickAction icon={Heart} title="Your favourites" description="Return to products and sellers you saved." onClick={() => navigate("/favorites")} />
            <QuickAction icon={CircleUserRound} title="Account settings" description="Update your contact and location details." onClick={() => navigate("/settings")} />
          </div>
        </section>
      </div>

      <section className="mt-6">
        <SectionHeading title="Your account" description="Keep your details ready for a faster checkout" />
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="grid gap-0 p-0 md:grid-cols-[1fr_1fr_auto]">
            <div className="flex items-center gap-3 border-b p-5 md:border-b-0 md:border-r">
              <MapPin className="h-5 w-5 shrink-0 text-emerald-700" />
              <div className="min-w-0">
                <p className="text-sm font-bold">Delivery location</p>
                <p className="truncate text-xs text-muted-foreground">{user?.location || "Add your location"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-b p-5 md:border-b-0 md:border-r">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
              <div className="min-w-0">
                <p className="text-sm font-bold">Profile completeness</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${profilePercent}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{profilePercent}% complete</p>
              </div>
            </div>
            <div className="flex items-center p-4">
              <Button variant="outline" onClick={() => navigate("/settings")} className="w-full gap-2 md:w-auto">
                <Settings className="h-4 w-4" /> Manage account
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
    { label: "Sales value", value: format(data?.summary.salesTotal ?? 0, { includeCode: true }), detail: "Open and completed orders", icon: BadgePoundSterling, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Orders to action", value: String(actionOrders.length), detail: "Need fulfilment updates", icon: Clock3, tone: "bg-amber-50 text-amber-700" },
    { label: "Active listings", value: String(data?.summary.productCount ?? 0), detail: `${lowStockProducts.length} low in stock`, icon: Box, tone: "bg-blue-50 text-blue-700" },
    { label: "Product rating", value: averageRating ? averageRating.toFixed(1) : "—", detail: averageRating ? "Average across listings" : "No ratings yet", icon: Star, tone: "bg-violet-50 text-violet-700" },
  ];

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
      <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-gradient-to-r from-emerald-950 via-emerald-900 to-green-800 p-5 text-white shadow-lg sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-white/30">
              <AvatarImage src={user?.avatar || user?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-white/15 font-black text-white">{userInitials(user?.name)}</AvatarFallback>
            </Avatar>
            <div>
              <Badge className="mb-2 border-white/20 bg-white/10 text-white hover:bg-white/10">Farmer workspace</Badge>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Welcome back, {displayName}</h1>
              <p className="mt-1 text-sm text-emerald-100">Manage today&apos;s orders, stock, and farm sales.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard/photo-sell")} className="gap-2 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Camera className="h-4 w-4" /> Photo-Sell
            </Button>
            <Button onClick={() => navigate("/dashboard/list-product")} className="gap-2 bg-amber-400 font-bold text-slate-950 hover:bg-amber-300">
              <PackagePlus className="h-4 w-4" /> Add product
            </Button>
          </div>
        </div>
      </section>

      {isError && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5" />
          <span className="flex-1">We could not load your seller dashboard.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Try again
          </Button>
        </div>
      )}

      {(actionOrders.length > 0 || lowStockProducts.length > 0) && (
        <Card className="mt-4 border-amber-200 bg-amber-50/70 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-amber-950">Your attention is needed</p>
              <p className="mt-0.5 text-xs text-amber-800">
                {actionOrders.length} order{actionOrders.length === 1 ? "" : "s"} to fulfil
                {lowStockProducts.length > 0 ? ` · ${lowStockProducts.length} listing${lowStockProducts.length === 1 ? "" : "s"} low in stock` : ""}
              </p>
            </div>
            <Button size="sm" onClick={() => navigate("/seller")} className="bg-amber-500 text-slate-950 hover:bg-amber-400">
              Review now
            </Button>
          </CardContent>
        </Card>
      )}

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <SectionHeading
            title="Orders to fulfil"
            description="Prioritised orders waiting for your action"
            actionLabel="Open order workspace"
            onAction={() => navigate("/seller")}
          />
          <Card className="shadow-sm">
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
                <div className="divide-y">
                  {actionOrders.slice(0, 4).map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => navigate("/seller")}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-muted/60"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold">{order.orderNumber}</p>
                          <Badge variant="outline" className={STATUS_META[order.status].className}>
                            {STATUS_META[order.status].label}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {order.items.length} item{order.items.length === 1 ? "" : "s"} · {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <p className="hidden shrink-0 text-sm font-black sm:block">{format(order.total, { includeCode: true })}</p>
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <QuickAction icon={Store} title="Seller workspace" description="Manage listings, orders, payouts, and fulfilment." onClick={() => navigate("/seller")} />
            <QuickAction icon={PackagePlus} title="List a product" description="Add produce, set price, and update stock." onClick={() => navigate("/dashboard/list-product")} />
            <QuickAction icon={WalletCards} title="Payments and payouts" description="Review protected balances and payout history." onClick={() => navigate("/seller")} />
          </div>
        </section>
      </div>

      <section className="mt-6">
        <SectionHeading
          title="Inventory health"
          description="Listings that may need a stock update"
          actionLabel="Manage listings"
          onAction={() => navigate("/seller")}
        />
        <Card className="shadow-sm">
          <CardContent className="p-4">
            {products.length === 0 ? (
              <EmptyState
                icon={Leaf}
                title="Start your storefront"
                description="List your first farm product so buyers can discover it."
                actionLabel="Add your first product"
                onAction={() => navigate("/dashboard/list-product")}
              />
            ) : lowStockProducts.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-900">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
                <div>
                  <p className="text-sm font-bold">Stock levels look healthy</p>
                  <p className="mt-0.5 text-xs text-emerald-800">None of your current listings are at or below 5 units.</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lowStockProducts.slice(0, 6).map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => navigate("/seller")}
                    className="flex items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:border-amber-300 hover:bg-amber-50/50"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {product.images[0] ? (
                        <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Leaf className="m-3 h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{product.name}</p>
                      <p className={`mt-1 text-xs font-semibold ${product.stock === 0 ? "text-red-700" : "text-amber-700"}`}>
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
    <div className="min-h-screen bg-muted/20">
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
