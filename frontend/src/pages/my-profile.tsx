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
  Store,
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

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(value);
}

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

function safePrice(product: Product) {
  return Number.isFinite(product.price) && product.price >= 0
    ? formatMoney(product.price)
    : "Price not set";
}

function safeCategory(product: Product) {
  return product.categoryId?.trim().replace(/-/g, " ") || "Uncategorised";
}

function SummaryCard({ metric }: { metric: SummaryMetric }) {
  const Icon = metric.icon;
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex items-start gap-3 p-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${metric.tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-black leading-none">{metric.value}</p>
          <p className="mt-1 text-sm font-bold">{metric.label}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{metric.detail}</p>
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
      className="group flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-md"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-emerald-700 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function ProfileHeader() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isFarmer = user?.role === "farmer";
  const fullName =
    user?.name?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "AgriConnect user";
  const contact = user?.email || user?.phone || "Add contact details";

  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-gradient-to-r from-emerald-950 via-emerald-900 to-green-800 p-5 text-white shadow-lg sm:p-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="h-16 w-16 shrink-0 border-2 border-white/30">
            <AvatarImage src={user?.avatar || user?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-white/15 text-lg font-black text-white">
              {initials(fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Badge
              className={`mb-2 px-3 py-1 font-black shadow-sm ${
                isFarmer
                  ? "border-emerald-300 bg-emerald-100 text-emerald-950 hover:bg-emerald-100"
                  : "border-amber-300 bg-amber-400 text-emerald-950 hover:bg-amber-400"
              }`}
            >
              {isFarmer ? "Farmer account" : `${user?.role || "buyer"} account`}
            </Badge>
            <h1 className="truncate text-2xl font-black tracking-tight sm:text-3xl">{fullName}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-emerald-100">
              <span className="truncate">{contact}</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {user?.location || "Location not added"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/settings")}
            className="gap-2 border-white/30 bg-white/10 font-bold text-white hover:bg-white/20 hover:text-white"
          >
            <Settings className="h-4 w-4" />
            Edit profile
          </Button>
          {isFarmer && (
            <Button
              onClick={() => navigate("/dashboard/list-product")}
              className="gap-2 bg-amber-400 font-black text-emerald-950 hover:bg-amber-300"
            >
              <Plus className="h-4 w-4" />
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
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
        <div>
          <p className="text-sm font-extrabold">Your account details are ready</p>
          <p className="text-xs text-emerald-800">Contact and location details are available for marketplace activity.</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-emerald-200 shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-extrabold">Complete your profile</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add the remaining information for smoother orders and account activity.
            </p>
          </div>
          <span className="text-sm font-black text-emerald-700">{percent}%</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-emerald-100">
          <div className="h-full rounded-full bg-emerald-700" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {checks.map((item) => (
            <Badge
              key={item.label}
              variant="outline"
              className={item.complete ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "text-muted-foreground"}
            >
              {item.complete ? <Check className="mr-1 h-3 w-3" /> : <AlertCircle className="mr-1 h-3 w-3" />}
              {item.label}
            </Badge>
          ))}
        </div>
        <Button size="sm" onClick={() => navigate("/settings")} className="mt-4 bg-emerald-700 font-bold hover:bg-emerald-800">
          Complete profile
        </Button>
      </CardContent>
    </Card>
  );
}

function BuyerProfile() {
  const [, navigate] = useLocation();
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
    { label: "Active orders", value: String(activeOrders.length), detail: "Currently in progress", icon: Truck, tone: "bg-blue-50 text-blue-700" },
    { label: "Total orders", value: String(orders.length), detail: "Complete purchase history", icon: ShoppingBag, tone: "bg-amber-50 text-amber-700" },
    { label: "Favourites", value: String(productIds.length + sellerIds.length), detail: "Saved products and farmers", icon: Heart, tone: "bg-rose-50 text-rose-700" },
    { label: "Delivered", value: String(deliveredOrders.length), detail: "Completed purchases", icon: PackageCheck, tone: "bg-emerald-50 text-emerald-700" },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => <SummaryCard key={metric.label} metric={metric} />)}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Recent orders</h2>
              <p className="text-xs text-muted-foreground">Your latest marketplace purchases</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/orders")} className="gap-1 font-bold text-emerald-700 hover:text-emerald-900">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {isLoading ? (
            <Card><CardContent className="space-y-3 p-4">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-16" />)}</CardContent></Card>
          ) : isError ? (
            <Card>
              <CardContent className="flex min-h-44 flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="h-7 w-7 text-destructive" />
                <p className="mt-3 text-sm font-bold">Orders could not be loaded</p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3 gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Try again
                </Button>
              </CardContent>
            </Card>
          ) : sortedOrders.length === 0 ? (
            <Card>
              <CardContent className="flex min-h-52 flex-col items-center justify-center p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <h3 className="mt-3 font-extrabold">No orders yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">Your purchases and delivery updates will appear here.</p>
                <Button onClick={() => navigate("/")} className="mt-4 bg-emerald-700 font-bold hover:bg-emerald-800">Browse products</Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm">
              <CardContent className="divide-y p-3">
                {sortedOrders.slice(0, 3).map((order) => {
                  const firstItem = order.items[0];
                  const image = firstItem ? resolveProductImageForOrderItem(firstItem).src : undefined;
                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-emerald-50/50"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-muted">
                        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <Package className="m-3 h-6 w-6 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-extrabold">{order.orderNumber}</p>
                          <Badge variant="secondary" className="text-[10px]">{ORDER_STATUS_LABELS[order.status] || order.status}</Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {order.items.map((item) => item.productName).join(", ")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                      </div>
                      <p className="hidden shrink-0 text-sm font-black sm:block">{formatMoney(order.total)}</p>
                      <ChevronRight className="h-4 w-4 shrink-0 text-emerald-700" />
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-lg font-black">Account shortcuts</h2>
            <p className="text-xs text-muted-foreground">Common buyer actions</p>
          </div>
          <div className="space-y-3">
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
    { label: "Listings", value: String(data?.summary.productCount ?? 0), detail: "Products in your storefront", icon: Package, tone: "bg-blue-50 text-blue-700" },
    { label: "Active orders", value: String(data?.summary.activeOrderCount ?? 0), detail: "Orders requiring fulfilment", icon: Truck, tone: "bg-amber-50 text-amber-700" },
    { label: "Sales value", value: formatMoney(data?.summary.salesTotal ?? 0), detail: "Open and completed orders", icon: BadgePoundSterling, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Product rating", value: averageRating ? averageRating.toFixed(1) : "—", detail: averageRating ? "Average listing rating" : "No ratings yet", icon: Star, tone: "bg-violet-50 text-violet-700" },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-emerald-200 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-black">Seller readiness</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Essential account details used for listings and fulfilment.</p>
            </div>
            <Badge className={sellerReady ? "bg-emerald-700 font-bold" : "bg-amber-100 font-bold text-amber-900 hover:bg-amber-100"}>
              {sellerReady ? "Ready to sell" : "Action needed"}
            </Badge>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {sellerEssentials.map((item) => (
              <div key={item.label} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-bold ${item.complete ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "bg-muted/30 text-muted-foreground"}`}>
                {item.complete ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <AlertCircle className="h-4 w-4" />}
                {item.label}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className={`h-4 w-4 ${user?.isVerified ? "text-emerald-700" : ""}`} />
              {user?.isVerified ? "Verified seller" : "Seller verification is optional during the MVP"}
            </div>
            {!sellerReady && (
              <Button size="sm" onClick={() => navigate("/settings")} className="bg-emerald-700 font-bold hover:bg-emerald-800">
                Complete details
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => <SummaryCard key={metric.label} metric={metric} />)}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black">
              <Package className="h-5 w-5 text-emerald-700" />
              My listed products
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Products published from your farmer account</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/seller")} className="border-emerald-600 font-bold text-emerald-800 hover:bg-emerald-50">
              Seller dashboard
            </Button>
            {products.length > 0 && (
              <Button size="sm" onClick={() => navigate("/dashboard/list-product")} className="bg-emerald-700 font-bold hover:bg-emerald-800">
                <Plus className="mr-1.5 h-4 w-4" /> Add product
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => <Skeleton key={item} className="h-72 rounded-xl" />)}
          </div>
        ) : isError ? (
          <Card>
            <CardContent className="flex min-h-52 flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="h-7 w-7 text-destructive" />
              <p className="mt-3 font-bold">Your listings could not be loaded</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3 gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Try again
              </Button>
            </CardContent>
          </Card>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <Package className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-black">Start your farmer storefront</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">Create your first listing so buyers can discover your products.</p>
              <Button onClick={() => navigate("/dashboard/list-product")} className="mt-5 bg-emerald-700 font-black hover:bg-emerald-800">
                <Plus className="mr-2 h-4 w-4" /> Add your first product
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">No listing fee is collected during the MVP.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const name = product.name?.trim() || "Unnamed product";
              const unit = product.unit?.trim() || "unit";
              return (
                <Card key={product.id} className="overflow-hidden shadow-sm transition-shadow hover:shadow-md">
                  <div className="aspect-[16/10] overflow-hidden bg-muted">
                    <SafeProductImage
                      src={resolveProductImageForProduct(product, { imageOwnership: "seller" }).src}
                      alt={`${name} product image`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-extrabold">{name}</h3>
                        <p className="mt-1 text-sm font-bold text-emerald-700">{safePrice(product)} / {unit}</p>
                      </div>
                      <Badge variant="outline" className="max-w-28 truncate capitalize">{safeCategory(product)}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="max-w-40 truncate">{product.farmerLocation || "Location not specified"}</span>
                      </span>
                      <Badge className={product.stock > 0 ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-red-100 text-red-800 hover:bg-red-100"}>
                        {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/products/${product.id}`)}
                      className="mt-4 w-full border-emerald-600 font-bold text-emerald-800 hover:bg-emerald-50 hover:text-emerald-950"
                    >
                      View listing <ArrowRight className="ml-2 h-3.5 w-3.5" />
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
    <div className="min-h-screen bg-muted/20">
      <TopNavigation />
      <main id="main-content" className="mx-auto max-w-6xl space-y-6 px-4 py-5 sm:px-6 sm:py-7">
        {isLoading ? (
          <>
            <Skeleton className="h-40 rounded-2xl" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-24 rounded-xl" />)}
            </div>
            <Skeleton className="h-72 rounded-xl" />
          </>
        ) : !user ? (
          <Card>
            <CardContent className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
              <CircleUserRound className="h-9 w-9 text-muted-foreground" />
              <p className="mt-3 font-bold">Sign in to view your profile</p>
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
