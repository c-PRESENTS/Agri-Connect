import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  AlertCircle,
  ArrowRight,
  BadgePoundSterling,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Heart,
  Loader2,
  MapPin,
  Package,
  PackageCheck,
  Plus,
  RefreshCw,
  Settings,
  ShoppingBag,
  Star,
  SwitchCamera,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Order, Product } from "@shared/schema";
import { TopNavigation } from "@/components/top-navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SafeProductImage } from "@/components/safe-product-image";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import { resolveProductImageForOrderItem, resolveProductImageForProduct } from "@/lib/product-images";
import { useCurrency } from "@/contexts/currency-context";
import { useToast } from "@/hooks/use-toast";
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

type SummaryMetric = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
};

const ACTIVE_ORDER_STATUSES = new Set([
  "pending",
  "confirmed",
  "order_placed",
  "payment_confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
]);

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  order_placed: "Order placed",
  payment_confirmed: "Payment confirmed",
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function initials(value?: string | null) {
  return (value || "AgriConnect user")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function safePrice(product: Product, format: ReturnType<typeof useCurrency>["format"]) {
  return Number.isFinite(product.price) && product.price >= 0
    ? format(product.price, { sourceCurrency: product.currency || "GBP", includeCode: true })
    : "Price not set";
}

function safeCategory(product: Product) {
  return product.categoryId?.trim().replace(/-/g, " ") || "Daily Needs";
}

function SummaryCard({ metric }: { metric: SummaryMetric }) {
  const Icon = metric.icon;
  return (
    <Card className="border border-slate-200/80 dark:border-border/60 bg-white dark:bg-card shadow-2xs rounded-2xl">
      <CardContent className="flex items-center gap-3 p-3.5 sm:p-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${metric.tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg sm:text-xl font-black leading-tight text-slate-900 dark:text-slate-100">{metric.value}</p>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate mt-0.5">{metric.label}</p>
          <p className="truncate text-[11px] text-muted-foreground">{metric.detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickLink({
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
      className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200/80 dark:border-border/60 bg-white dark:bg-card p-3.5 text-left shadow-2xs transition-all hover:border-emerald-400 hover:bg-emerald-50/40 hover:shadow-xs"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">{title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-700" />
    </button>
  );
}

function ProfileHeader() {
  const [, navigate] = useLocation();
  const { user, switchAccountMode } = useAuth();
  const { toast } = useToast();
  const isFarmer = user?.role === "farmer";
  const fullName =
    user?.name?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "AgriConnect user";
  const contact = user?.email || user?.phone || "Add contact details";

  const handleAccountSwitch = async () => {
    const targetMode = isFarmer ? "buyer" : "seller";
    try {
      await switchAccountMode.mutateAsync(targetMode);
      toast({
        title: targetMode === "seller" ? "Seller account is active" : "Buyer account is active",
        description: targetMode === "seller"
          ? "Your seller workspace is ready. Complete verification before publishing listings."
          : "You can keep shopping while your seller information remains safely saved.",
      });
      navigate(targetMode === "seller" ? "/seller" : "/my-profile");
    } catch (error) {
      toast({
        title: "Could not switch account",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-gradient-to-r from-emerald-950 via-emerald-900 to-green-800 p-4 sm:p-5 text-white shadow-md">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
          <Avatar className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 border-2 border-white/40 shadow-xs">
            <AvatarImage src={user?.avatar || user?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-white/20 text-base font-black text-white">
              {initials(fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="truncate text-xl sm:text-2xl font-black tracking-tight">{fullName}</h1>
              <Badge
                className={`px-2.5 py-0.5 text-[11px] font-black shadow-2xs ${
                  isFarmer
                    ? "border-emerald-300 bg-emerald-100 text-emerald-950 hover:bg-emerald-100"
                    : "border-amber-300 bg-amber-400 text-emerald-950 hover:bg-amber-400"
                }`}
              >
                {isFarmer ? "Farmer account" : `${user?.role || "buyer"} account`}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-emerald-100/90 font-medium">
              <span className="truncate">{contact}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {user?.location || "Location not added"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <Button
            size="sm"
            onClick={handleAccountSwitch}
            disabled={switchAccountMode.isPending}
            className="h-8 sm:h-9 px-3 text-xs gap-1.5 bg-amber-400 font-black text-emerald-950 hover:bg-amber-300 shadow-2xs"
            data-testid="button-switch-account-mode"
          >
            {switchAccountMode.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <SwitchCamera className="h-3.5 w-3.5" />
            )}
            {isFarmer ? "Switch to Buyer Account" : "Switch to Seller Account"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/settings")}
            className="h-8 sm:h-9 px-3 text-xs gap-1.5 border-white/30 bg-white/10 font-bold text-white hover:bg-white/20 hover:text-white"
          >
            <Settings className="h-3.5 w-3.5" />
            Edit profile
          </Button>
          {isFarmer && (
            <Button
              size="sm"
              onClick={() => navigate("/dashboard/list-product")}
              className="h-8 sm:h-9 px-3 text-xs gap-1.5 border-white/30 bg-white/10 font-bold text-white hover:bg-white/20 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add product
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function AccountReadiness() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const profileName = Boolean(user?.name || user?.firstName);
  const contact = Boolean(user?.email || user?.phone);
  const location = Boolean(user?.location);
  const checks = [
    { label: "Basic profile", complete: profileName },
    { label: "Contact details", complete: contact },
    { label: "Location", complete: location },
  ];
  const completed = checks.filter((item) => item.complete).length;
  const percent = Math.round((completed / checks.length) * 100);

  if (percent === 100) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-2.5 text-emerald-950">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
        <div className="flex-1 flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs font-bold text-emerald-900">Account details ready for marketplace transactions</p>
          <span className="text-[11px] font-black text-emerald-800">100% Complete</span>
        </div>
      </div>
    );
  }

  return (
    <Card className="border border-emerald-200/80 shadow-2xs rounded-2xl bg-white dark:bg-card">
      <CardContent className="p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">Complete your profile</p>
            <p className="text-[11px] text-muted-foreground">
              Add remaining details for faster checkout and delivery updates.
            </p>
          </div>
          <span className="text-xs font-black text-emerald-700">{percent}%</span>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-emerald-100">
          <div className="h-full rounded-full bg-emerald-700 transition-all duration-300" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {checks.map((item) => (
              <Badge
                key={item.label}
                variant="outline"
                className={`text-[10px] py-0.5 px-2 font-bold ${item.complete ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "text-muted-foreground"}`}
              >
                {item.complete ? <Check className="mr-1 h-2.5 w-2.5 text-emerald-600" /> : <AlertCircle className="mr-1 h-2.5 w-2.5" />}
                {item.label}
              </Badge>
            ))}
          </div>
          <Button size="sm" onClick={() => navigate("/settings")} className="h-7 px-3 text-xs bg-emerald-700 font-bold hover:bg-emerald-800 rounded-lg">
            Complete profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BuyerProfile() {
  const [, navigate] = useLocation();
  const { format } = useCurrency();
  const { productIds, sellerIds } = useFavorites();
  const { data: orders = [], isLoading, isError, refetch } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });
  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [orders],
  );
  const activeOrders = orders.filter((order) => ACTIVE_ORDER_STATUSES.has(order.status));
  const deliveredOrders = orders.filter((order) => order.status === "delivered");
  const metrics: SummaryMetric[] = [
    { label: "Active orders", value: String(activeOrders.length), detail: "Currently in progress", icon: Truck, tone: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" },
    { label: "Total orders", value: String(orders.length), detail: "Complete purchase history", icon: ShoppingBag, tone: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" },
    { label: "Favourites", value: String(productIds.length + sellerIds.length), detail: "Saved products & farmers", icon: Heart, tone: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400" },
    { label: "Delivered", value: String(deliveredOrders.length), detail: "Completed purchases", icon: PackageCheck, tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" },
  ];

  return (
    <div className="space-y-4">
      <section className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => <SummaryCard key={metric.label} metric={metric} />)}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">Recent orders</h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground">Your latest marketplace purchases</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/orders")} className="h-8 px-2.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </div>

          {isLoading ? (
            <Card className="rounded-2xl"><CardContent className="space-y-2.5 p-3.5">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-14 rounded-xl" />)}</CardContent></Card>
          ) : isError ? (
            <Card className="rounded-2xl">
              <CardContent className="flex min-h-40 flex-col items-center justify-center p-5 text-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <p className="mt-2 text-xs font-bold">Orders could not be loaded</p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2 h-7 px-3 text-xs gap-1">
                  <RefreshCw className="h-3 w-3" /> Try again
                </Button>
              </CardContent>
            </Card>
          ) : sortedOrders.length === 0 ? (
            <Card className="rounded-2xl border border-slate-200/80 shadow-2xs">
              <CardContent className="flex min-h-44 flex-col items-center justify-center p-5 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <h3 className="mt-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">No orders yet</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Your purchases and delivery updates will appear here.</p>
                <Button onClick={() => navigate("/")} className="mt-3 h-8 px-4 text-xs bg-emerald-800 font-bold hover:bg-emerald-900 rounded-xl">Browse products</Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-2xs rounded-2xl border border-slate-200/80 dark:border-border/60">
              <CardContent className="divide-y divide-slate-100 dark:divide-border/40 p-2 sm:p-3">
                {sortedOrders.slice(0, 3).map((order) => {
                  const firstItem = order.items[0];
                  const image = firstItem ? resolveProductImageForOrderItem(firstItem).src : undefined;
                  return (
                    <div key={order.id} className="flex items-center rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-muted/40">
                      <button
                        type="button"
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2.5 text-left"
                      >
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-muted">
                          {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <Package className="m-2.5 h-5 w-5 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">{order.orderNumber}</p>
                            <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">{ORDER_STATUS_LABELS[order.status] || order.status}</Badge>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {order.items.map((item) => item.productName).join(", ")}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{formatDate(order.createdAt)}</p>
                        </div>
                        <p className="hidden shrink-0 text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 sm:block">{format(order.total, { includeCode: true })}</p>
                        <ChevronRight className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" />
                      </button>
                      <OrderAgainButton
                        orderId={order.id}
                        label="Order again"
                        className="mr-1.5 shrink-0 h-8 px-2.5 text-xs font-bold rounded-xl"
                        testId={`button-profile-order-again-${order.id}`}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </section>

        <section>
          <div className="mb-2.5">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">Account shortcuts</h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground">Common buyer actions</p>
          </div>
          <div className="space-y-2">
            <QuickLink icon={Heart} title="Your favourites" description="View saved products and farmers." onClick={() => navigate("/favorites")} />
            <QuickLink icon={ShoppingBag} title="All orders" description="Track, review, or manage purchases." onClick={() => navigate("/orders")} />
            <QuickLink icon={Settings} title="Account settings" description="Update contact and delivery details." onClick={() => navigate("/settings")} />
          </div>
        </section>
      </div>
    </div>
  );
}

function FarmerProfile() {
  const [, navigate] = useLocation();
  const { format } = useCurrency();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery<SellerDashboardData>({
    queryKey: ["/api/dashboard/seller"],
  });
  const products = data?.products ?? [];
  const averageRating = products.length
    ? products.reduce((sum, product) => sum + (product.rating || 0), 0) / products.length
    : 0;
  const sellerEssentials = [
    { label: "Profile", complete: Boolean(user?.name || user?.firstName) },
    { label: "Contact", complete: Boolean(user?.email || user?.phone) },
    { label: "Location", complete: Boolean(user?.location) },
  ];
  const sellerReady = sellerEssentials.every((item) => item.complete);
  const metrics: SummaryMetric[] = [
    { label: "Listings", value: String(data?.summary.productCount ?? 0), detail: "Products in your storefront", icon: Package, tone: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" },
    { label: "Active orders", value: String(data?.summary.activeOrderCount ?? 0), detail: "Orders requiring fulfilment", icon: Truck, tone: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" },
    { label: "Sales value", value: format(data?.summary.salesTotal ?? 0, { includeCode: true }), detail: "Open and completed orders", icon: BadgePoundSterling, tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" },
    { label: "Product rating", value: averageRating ? averageRating.toFixed(1) : "—", detail: averageRating ? "Average listing rating" : "No ratings yet", icon: Star, tone: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400" },
  ];

  return (
    <div className="space-y-3">
      {/* Sleek Compact Seller Readiness Card */}
      <Card className="border border-emerald-200/80 dark:border-emerald-900/40 bg-white dark:bg-card shadow-2xs rounded-2xl">
        <CardContent className="p-3 sm:p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-black text-slate-900 dark:text-slate-100">Seller readiness:</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {sellerEssentials.map((item) => (
                <Badge
                  key={item.label}
                  variant="outline"
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                    item.complete
                      ? "border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                      : "bg-amber-50 text-amber-900 border-amber-200"
                  }`}
                >
                  {item.complete ? <Check className="h-3 w-3 text-emerald-600" /> : <AlertCircle className="h-3 w-3 text-amber-600" />}
                  <span>{item.label}</span>
                </Badge>
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground hidden lg:inline">
              · Verification details ready for marketplace transactions
            </span>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <Badge className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${sellerReady ? "bg-emerald-700 text-white" : "bg-amber-400 text-amber-950"}`}>
              {sellerReady ? "Ready to Sell" : "Action Needed"}
            </Badge>
            {!sellerReady && (
              <Button size="sm" onClick={() => navigate("/settings")} className="h-7 px-2.5 text-xs bg-emerald-700 font-bold hover:bg-emerald-800 rounded-lg">
                Complete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metrics Row */}
      <section className="grid gap-2.5 grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => <SummaryCard key={metric.label} metric={metric} />)}
      </section>

      {/* Listed Products Section */}
      <section className="space-y-2.5 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-slate-100">
              <Package className="h-4 w-4 text-emerald-700" />
              My listed products
            </h2>
            <p className="text-[11px] text-muted-foreground">Products published from your farmer account</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/seller")}
              className="h-8 px-3 text-xs border-emerald-600 font-bold text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 rounded-xl"
            >
              Seller dashboard
            </Button>
            {products.length > 0 && (
              <Button
                size="sm"
                onClick={() => navigate("/dashboard/list-product")}
                className="h-8 px-3 text-xs bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-2xs gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add product
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
            {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-64 rounded-2xl" />)}
          </div>
        ) : isError ? (
          <Card className="rounded-2xl">
            <CardContent className="flex min-h-44 flex-col items-center justify-center p-5 text-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="mt-2 text-xs font-bold">Your listings could not be loaded</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2 h-7 px-3 text-xs gap-1">
                <RefreshCw className="h-3 w-3" /> Try again
              </Button>
            </CardContent>
          </Card>
        ) : products.length === 0 ? (
          <Card className="rounded-2xl border border-slate-200/80 shadow-2xs">
            <CardContent className="flex min-h-52 flex-col items-center justify-center p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                <Package className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-black text-slate-900 dark:text-slate-100">Start your farmer storefront</h3>
              <p className="mt-0.5 max-w-sm text-xs text-muted-foreground">Create your first listing so buyers can discover your fresh produce.</p>
              <Button onClick={() => navigate("/dashboard/list-product")} className="mt-4 h-9 px-4 text-xs bg-emerald-800 font-black hover:bg-emerald-900 rounded-xl shadow-2xs gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add your first product
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
            {products.map((product) => {
              const name = product.name?.trim() || "Unnamed product";
              const unit = product.unit?.trim() || "kg";
              return (
                <Card
                  key={product.id}
                  className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-border/60 bg-white dark:bg-card shadow-2xs transition-all hover:shadow-md hover:border-emerald-500/50 group flex flex-col"
                >
                  {/* Expanded Edge-to-Edge Image container */}
                  <div className="relative aspect-[16/11] w-full overflow-hidden bg-slate-100 dark:bg-muted shrink-0">
                    <SafeProductImage
                      src={resolveProductImageForProduct(product, { imageOwnership: "seller" }).src}
                      alt={`${name} product image`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-white/95 dark:bg-card/95 backdrop-blur-xs text-[10px] font-black shadow-2xs uppercase tracking-wide px-2 py-0.5 border border-slate-200/60 text-slate-800 dark:text-slate-200">
                        {safeCategory(product)}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-3 flex flex-col justify-between flex-1 space-y-2">
                    <div className="space-y-0.5">
                      <h3 className="truncate font-black text-sm text-slate-900 dark:text-slate-100">{name}</h3>
                      <p className="text-sm font-black text-emerald-800 dark:text-emerald-400">
                        {safePrice(product, format)} <span className="text-[11px] text-muted-foreground font-semibold">/ {unit}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 text-xs pt-1.5 border-t border-slate-100 dark:border-border/40">
                      <span className="inline-flex items-center gap-1 text-muted-foreground text-[11px] truncate">
                        <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                        <span className="truncate">{product.farmerLocation || "Location not provided"}</span>
                      </span>
                      <Badge
                        className={`text-[10px] font-bold px-1.5 py-0 shrink-0 ${
                          product.stock > 0
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                        }`}
                      >
                        {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                      </Badge>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/products/${product.id}`)}
                      className="h-7.5 w-full border-slate-200/90 dark:border-border/80 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-400 rounded-xl gap-1"
                    >
                      <span>View listing</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function MyProfilePage() {
  const { user, isLoading } = useAuth();
  const isFarmer = user?.role === "farmer";

  return (
    <div className="min-h-screen bg-[#f8faf6] dark:bg-background text-foreground pb-12">
      <TopNavigation />
      <main id="main-content" className="w-full max-w-[1700px] mx-auto space-y-3 px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
        {isLoading ? (
          <>
            <Skeleton className="h-32 rounded-2xl" />
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-16 rounded-xl" />)}
            </div>
            <Skeleton className="h-64 rounded-2xl" />
          </>
        ) : !user ? (
          <Card className="rounded-2xl">
            <CardContent className="flex min-h-56 flex-col items-center justify-center p-6 text-center">
              <CircleUserRound className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 font-bold text-sm">Sign in to view your profile</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <ProfileHeader />
            {!isFarmer && <AccountReadiness />}
            {isFarmer ? <FarmerProfile /> : <BuyerProfile />}
          </>
        )}
      </main>
    </div>
  );
}
