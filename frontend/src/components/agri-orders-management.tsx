import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  Award,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Layers,
  Leaf,
  MapPin,
  MoreHorizontal,
  Package,
  PackageCheck,
  PackageOpen,
  Pencil,
  Plus,
  Power,
  Receipt,
  RefreshCw,
  Search,
  Send,
  Share2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  ThumbsDown,
  ThumbsUp,
  Truck,
  Undo2,
  User,
  Users,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export type AdminCommerceOrder = {
  id: string;
  orderNumber: string;
  name?: string;
  status: "placed" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded" | string;
  paymentStatus: "paid" | "pending" | "refunded" | string;
  paymentMethod?: string | null;
  currency: string;
  subtotalMinor?: string | number;
  deliveryFeeMinor?: string | number;
  totalMinor: string | number;
  orderData?: {
    customerName?: string;
    customerEmail?: string;
    shippingAddress?: {
      line1?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    };
    carrier?: string;
    trackingNumber?: string;
    cancellationReason?: string;
  } | null;
  buyerName?: string | null;
  buyerEmail?: string | null;
  itemCount?: number;
  itemsSummary?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderDetailResponse = {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    currency: string;
    subtotalMinor: number;
    taxMinor: number;
    deliveryFeeMinor: number;
    totalMinor: number;
    orderData?: Record<string, unknown>;
    buyerId?: string;
    buyerName?: string;
    buyerEmail?: string;
    buyerPhone?: string;
    createdAt: string;
    updatedAt: string;
  };
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    sellerId: string;
    sellerName: string;
    quantity: number;
    unitPriceMinor: number;
    currency: string;
    itemData?: Record<string, unknown>;
  }>;
  history: Array<{
    id: string;
    status: string;
    note?: string | null;
    createdAt: string;
  }>;
};

function formatCurrency(minor: number | string = 0, currency = "GBP"): string {
  const num = typeof minor === "string" ? parseFloat(minor) : minor;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP",
  }).format(num / 100);
}

function timeAgo(dateString?: string | null): string {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card className="overflow-hidden border border-emerald-950/10 bg-white/95 shadow-sm transition-all hover:shadow-md">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
            <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{value}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{subtitle}</p>
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor} shadow-inner`}>
            <Icon className="h-5 w-5" strokeWidth={2.2} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AgriOrdersManagement({
  initialSearch = "",
  permissions = [],
}: {
  initialSearch?: string;
  permissions?: string[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Status transition modal
  const [statusModalTarget, setStatusModalTarget] = useState<AdminCommerceOrder | null>(null);
  const [modalNewStatus, setModalNewStatus] = useState<string>("processing");
  const [modalPaymentStatus, setModalPaymentStatus] = useState<string>("paid");
  const [modalCarrier, setModalCarrier] = useState("");
  const [modalTracking, setModalTracking] = useState("");
  const [modalNote, setModalNote] = useState("");

  // Query orders
  const { data: ordersData, isLoading, refetch, isFetching } = useQuery<{
    records: AdminCommerceOrder[];
    generatedAt: string;
  }>({
    queryKey: ["/api/admin/control-centre/resources/orders"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/control-centre/resources/orders");
      return res.json();
    },
  });

  const orders = useMemo(() => ordersData?.records ?? [], [ordersData]);

  // Query single order detail
  const { data: detailData, isLoading: isLoadingDetail } = useQuery<OrderDetailResponse>({
    queryKey: ["/api/admin/orders", selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return null as never;
      const res = await apiRequest("GET", `/api/admin/orders/${selectedOrderId}`);
      return res.json();
    },
    enabled: Boolean(selectedOrderId),
  });

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchNum = o.orderNumber?.toLowerCase().includes(q);
        const matchBuyer = o.buyerName?.toLowerCase().includes(q);
        const matchEmail = o.buyerEmail?.toLowerCase().includes(q);
        const matchSummary = o.itemsSummary?.toLowerCase().includes(q);
        const matchTracking = o.orderData?.trackingNumber?.toLowerCase().includes(q);
        const matchCarrier = o.orderData?.carrier?.toLowerCase().includes(q);
        if (!matchNum && !matchBuyer && !matchEmail && !matchSummary && !matchTracking && !matchCarrier) return false;
      }

      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (paymentFilter !== "all" && o.paymentStatus !== paymentFilter) return false;

      return true;
    });
  }, [orders, search, statusFilter, paymentFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, page, pageSize]);

  // KPI Metrics
  const stats = useMemo(() => {
    const total = orders.length;
    const totalRevenueMinor = orders
      .filter((o) => o.status !== "cancelled" && o.status !== "refunded")
      .reduce((sum, o) => sum + (Number(o.totalMinor) || 0), 0);
    const paid = orders.filter((o) => o.status === "paid" || o.paymentStatus === "paid").length;
    const processing = orders.filter((o) => o.status === "processing").length;
    const shipped = orders.filter((o) => o.status === "shipped").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const refunded = orders.filter((o) => o.status === "refunded" || o.status === "cancelled").length;

    return {
      total,
      totalRevenueMinor,
      paid,
      processing,
      shipped,
      delivered,
      refunded,
    };
  }, [orders]);

  // Status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
      paymentStatus,
      carrier,
      trackingNumber,
      note,
    }: {
      orderId: string;
      status: string;
      paymentStatus?: string;
      carrier?: string;
      trackingNumber?: string;
      note?: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/admin/orders/${orderId}/status`, {
        status,
        paymentStatus,
        carrier,
        trackingNumber,
        note,
      });
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast({
        title: "Order Status Updated",
        description: `Order successfully updated to ${vars.status}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/control-centre/resources/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/revenue"] });
      if (selectedOrderId) queryClient.invalidateQueries({ queryKey: ["/api/admin/orders", selectedOrderId] });
      setStatusModalTarget(null);
      setModalNote("");
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["Order Number", "Date", "Customer Name", "Customer Email", "Status", "Payment Status", "Total (GBP)", "Items Summary", "Carrier", "Tracking Number"];
    const rows = filteredOrders.map((o) => [
      `"${o.orderNumber}"`,
      `"${o.createdAt}"`,
      `"${o.buyerName || o.orderData?.customerName || ""}"`,
      `"${o.buyerEmail || o.orderData?.customerEmail || ""}"`,
      `"${o.status}"`,
      `"${o.paymentStatus}"`,
      `"${((Number(o.totalMinor) || 0) / 100).toFixed(2)}"`,
      `"${(o.itemsSummary || "").replaceAll('"', '""')}"`,
      `"${o.orderData?.carrier || ""}"`,
      `"${o.orderData?.trackingNumber || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agriconnect-orders-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV Exported", description: `Exported ${filteredOrders.length} orders.` });
  };

  const canManage = permissions.includes("orders.manage") || permissions.includes("dashboard.view");

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <span>Operations</span>
            <span>/</span>
            <span>Commerce & Fulfillment</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Orders & Fulfillment Management
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor agricultural produce orders, confirm buyer payments, orchestrate cold-chain dispatch, and audit escrow releases.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 gap-1.5 border-slate-300 bg-white font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 gap-1.5 border-slate-300 bg-white font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Gross Volume"
          value={formatCurrency(stats.totalRevenueMinor)}
          subtitle="Settled trading"
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-[#078c52]"
        />
        <StatCard
          title="Total Orders"
          value={stats.total.toLocaleString()}
          subtitle="All platform orders"
          icon={ShoppingBag}
          iconBg="bg-slate-100"
          iconColor="text-slate-700"
        />
        <StatCard
          title="Paid & Confirmed"
          value={stats.paid.toLocaleString()}
          subtitle="Awaiting packing"
          icon={CreditCard}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="In Processing"
          value={stats.processing.toLocaleString()}
          subtitle="Harvest & packing"
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="In Transit"
          value={stats.shipped.toLocaleString()}
          subtitle="With freight courier"
          icon={Truck}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Delivered / Fulfilled"
          value={stats.delivered.toLocaleString()}
          subtitle="Completed sales"
          icon={PackageCheck}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
        />
      </div>

      {/* Filter Matrix Card */}
      <Card className="border border-emerald-950/10 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search */}
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search order number (e.g. AGC26-682208), customer name, email, produce..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-10 pl-9 pr-8 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[170px] text-xs font-medium">
                  <SelectValue placeholder="Workflow Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workflow States</SelectItem>
                  <SelectItem value="placed">Order Placed</SelectItem>
                  <SelectItem value="paid">Payment Confirmed</SelectItem>
                  <SelectItem value="processing">In Processing</SelectItem>
                  <SelectItem value="shipped">In Transit (Shipped)</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={paymentFilter}
                onValueChange={(val) => {
                  setPaymentFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[160px] text-xs font-medium">
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="paid">Paid (Settled)</SelectItem>
                  <SelectItem value="pending">Pending Payment</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>

              {(search || statusFilter !== "all" || paymentFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setPaymentFilter("all");
                    setPage(1);
                  }}
                  className="h-10 text-xs text-slate-500 hover:text-slate-900"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="overflow-hidden border border-emerald-950/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Order Number & Date</th>
                <th className="px-4 py-3">Buyer / Customer</th>
                <th className="px-4 py-3">Produce Items Summary</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3 text-center">Payment</th>
                <th className="px-4 py-3 text-center">Fulfillment Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="h-4 w-full rounded bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ShoppingBag className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-semibold">No orders match your query</p>
                    <p className="text-xs">Adjust your search parameters or filter criteria.</p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const isPaid = order.paymentStatus === "paid" || order.status === "paid";
                  const isPending = order.paymentStatus === "pending" || order.status === "placed";
                  const isRefunded = order.paymentStatus === "refunded" || order.status === "refunded" || order.status === "cancelled";

                  const isShipped = order.status === "shipped";
                  const isDelivered = order.status === "delivered";
                  const isProcessing = order.status === "processing";

                  return (
                    <tr
                      key={order.id}
                      className="group transition-colors hover:bg-emerald-50/40"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#053f36] border border-emerald-100 font-bold">
                            <ShoppingBag className="h-4 w-4" />
                          </div>
                          <div>
                            <button
                              onClick={() => setSelectedOrderId(order.id)}
                              className="font-mono font-bold text-slate-900 hover:text-[#078c52] hover:underline text-left block"
                            >
                              {order.orderNumber}
                            </button>
                            <span className="text-[10px] text-slate-400">
                              {timeAgo(order.createdAt)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate max-w-[180px]">
                            {order.buyerName || order.orderData?.customerName || "Direct Buyer"}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                            {order.buyerEmail || order.orderData?.customerEmail || "N/A"}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="line-clamp-1 text-slate-700 font-medium">
                          {order.itemsSummary || "Agricultural items"}
                        </p>
                        {order.orderData?.carrier && (
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Truck className="h-2.5 w-2.5" />
                            {order.orderData.carrier} {order.orderData.trackingNumber ? `· ${order.orderData.trackingNumber}` : ""}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 text-xs">
                        {formatCurrency(order.totalMinor, order.currency)}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isPaid
                              ? "bg-emerald-100 text-emerald-800"
                              : isPending
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isPaid ? "bg-emerald-500" : isPending ? "bg-amber-500" : "bg-rose-500"
                            }`}
                          />
                          {order.paymentStatus}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isDelivered
                              ? "bg-green-100 text-green-800"
                              : isShipped
                              ? "bg-blue-100 text-blue-800"
                              : isProcessing
                              ? "bg-purple-100 text-purple-800"
                              : isPaid
                              ? "bg-teal-100 text-teal-800"
                              : isRefunded
                              ? "bg-slate-100 text-slate-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {order.status.replaceAll("_", " ")}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedOrderId(order.id)}
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            title="Inspect Order"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {/* Quick Workflow Action button */}
                          {canManage && (
                            <>
                              {order.status === "placed" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      orderId: order.id,
                                      status: "paid",
                                      paymentStatus: "paid",
                                      note: "Payment manually verified by admin",
                                    })
                                  }
                                  className="h-7 text-[11px] font-semibold text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                                >
                                  Confirm payment
                                </Button>
                              )}
                              {order.status === "paid" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      orderId: order.id,
                                      status: "processing",
                                      note: "Dispatch packing started",
                                    })
                                  }
                                  className="h-7 text-[11px] font-semibold text-purple-800 border-purple-300 hover:bg-purple-50"
                                >
                                  Start processing
                                </Button>
                              )}
                              {order.status === "processing" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setStatusModalTarget(order);
                                    setModalNewStatus("shipped");
                                    setModalCarrier(order.orderData?.carrier || "DPD Fresh Direct");
                                    setModalTracking(order.orderData?.trackingNumber || "");
                                  }}
                                  className="h-7 text-[11px] font-semibold text-blue-800 border-blue-300 hover:bg-blue-50"
                                >
                                  Mark shipped
                                </Button>
                              )}
                              {order.status === "shipped" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      orderId: order.id,
                                      status: "delivered",
                                      note: "Order delivery confirmed",
                                    })
                                  }
                                  className="h-7 text-[11px] font-semibold text-green-800 border-green-300 hover:bg-green-50"
                                >
                                  Mark delivered
                                </Button>
                              )}
                            </>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs font-medium">
                              <DropdownMenuLabel>Order Management</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setSelectedOrderId(order.id)}>
                                <Eye className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                                <span>Inspect Full Dossier</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setStatusModalTarget(order);
                                  setModalNewStatus(order.status);
                                  setModalPaymentStatus(order.paymentStatus);
                                  setModalCarrier(order.orderData?.carrier || "");
                                  setModalTracking(order.orderData?.trackingNumber || "");
                                  setModalNote("");
                                }}
                              >
                                <Pencil className="mr-2 h-3.5 w-3.5 text-blue-600" />
                                <span>Update Status & Tracking</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {order.status !== "refunded" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setStatusModalTarget(order);
                                    setModalNewStatus("refunded");
                                    setModalPaymentStatus("refunded");
                                    setModalNote("Refund authorized by platform administrator.");
                                  }}
                                  className="text-rose-600"
                                >
                                  <Undo2 className="mr-2 h-3.5 w-3.5" />
                                  <span>Issue Refund</span>
                                </DropdownMenuItem>
                              )}
                              {order.status !== "cancelled" && order.status !== "delivered" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setStatusModalTarget(order);
                                    setModalNewStatus("cancelled");
                                    setModalPaymentStatus(order.paymentStatus);
                                    setModalNote("Order cancelled by administrator.");
                                  }}
                                  className="text-rose-600"
                                >
                                  <XCircle className="mr-2 h-3.5 w-3.5" />
                                  <span>Cancel Order</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-900">{filteredOrders.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">{Math.min(page * pageSize, filteredOrders.length)}</span> of{" "}
            <span className="font-semibold text-slate-900">{filteredOrders.length}</span> orders
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 font-bold text-slate-700">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Order Detail Drawer */}
      <Sheet open={Boolean(selectedOrderId)} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto bg-slate-50">
          {isLoadingDetail ? (
            <div className="flex h-full items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : detailData ? (
            <div className="flex flex-col min-h-full">
              {/* Header */}
              <div className="bg-[#053f36] p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lime-400 font-bold text-[#053f36]">
                      <Receipt className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black">{detailData.order.orderNumber}</h2>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            detailData.order.status === "delivered" || detailData.order.status === "paid"
                              ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-200"
                              : "border-amber-400/30 bg-amber-500/20 text-amber-200"
                          }
                        >
                          {detailData.order.status}
                        </Badge>
                        <span className="text-[10px] text-white/60">
                          {timeAgo(detailData.order.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedOrderId(null)}
                    className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 4 Stat Boxes */}
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Total</p>
                    <p className="text-sm font-black text-lime-300">
                      {formatCurrency(detailData.order.totalMinor, detailData.order.currency)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Payment</p>
                    <p className="text-xs font-bold text-white capitalize">{detailData.order.paymentStatus}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Method</p>
                    <p className="text-xs font-bold text-emerald-300 capitalize">{detailData.order.paymentMethod?.replaceAll("_", " ")}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Items</p>
                    <p className="text-xs font-bold text-white">{detailData.items?.length || 0} Lines</p>
                  </div>
                </div>
              </div>

              {/* Sub-Tabs */}
              <Tabs defaultValue="items" className="flex-1 p-6">
                <TabsList className="grid w-full grid-cols-3 bg-slate-200">
                  <TabsTrigger value="items" className="text-xs font-bold">
                    Order Items ({detailData.items?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="buyer" className="text-xs font-bold">
                    Customer & Shipping
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-xs font-bold">
                    Audit Trail
                  </TabsTrigger>
                </TabsList>

                {/* Items Tab */}
                <TabsContent value="items" className="mt-4 space-y-3">
                  <div className="space-y-2">
                    {detailData.items?.map((it) => (
                      <div key={it.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{it.productName}</p>
                          <p className="text-[10px] text-slate-500">Producer: {it.sellerName}</p>
                          <span className="font-mono text-[10px] text-slate-400">Qty: {it.quantity} × {formatCurrency(it.unitPriceMinor, it.currency)}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">
                          {formatCurrency(it.quantity * it.unitPriceMinor, it.currency)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Card className="border-slate-200 text-xs">
                    <CardContent className="p-4 space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal</span>
                        <span className="font-mono">{formatCurrency(detailData.order.subtotalMinor, detailData.order.currency)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Delivery Fee</span>
                        <span className="font-mono">{formatCurrency(detailData.order.deliveryFeeMinor, detailData.order.currency)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-100">
                        <span>Total Paid</span>
                        <span className="font-mono text-emerald-800">{formatCurrency(detailData.order.totalMinor, detailData.order.currency)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <div className="pt-2">
                    <Button
                      className="w-full bg-[#078c52] text-white hover:bg-[#067343] text-xs h-9"
                      onClick={() => {
                        const target = orders.find((o) => o.id === detailData.order.id);
                        if (target) {
                          setStatusModalTarget(target);
                          setModalNewStatus(detailData.order.status);
                          setModalPaymentStatus(detailData.order.paymentStatus);
                          setModalCarrier((detailData.order.orderData as Record<string, string>)?.carrier || "");
                          setModalTracking((detailData.order.orderData as Record<string, string>)?.trackingNumber || "");
                        }
                      }}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Progress Workflow & Shipping
                    </Button>
                  </div>
                </TabsContent>

                {/* Buyer Tab */}
                <TabsContent value="buyer" className="mt-4 space-y-3 text-xs">
                  <Card className="border-slate-200">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Buyer Name</span>
                        <span className="font-bold text-slate-900">{detailData.order.buyerName || "Direct Buyer"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Contact Email</span>
                        <span className="font-mono text-slate-700">{detailData.order.buyerEmail || "N/A"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Phone</span>
                        <span className="font-mono text-slate-700">{detailData.order.buyerPhone || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1">Shipping Destination</span>
                        <p className="font-mono text-slate-800 bg-slate-100 p-2 rounded">
                          {(detailData.order.orderData as Record<string, any>)?.shippingAddress?.line1 || "Main Farm Road"},{" "}
                          {(detailData.order.orderData as Record<string, any>)?.shippingAddress?.city || "London"},{" "}
                          {(detailData.order.orderData as Record<string, any>)?.shippingAddress?.postalCode || "UK"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="mt-4 space-y-2">
                  {detailData.history?.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Clock className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                      <p className="font-semibold">No status transitions recorded</p>
                    </div>
                  ) : (
                    detailData.history.map((h) => (
                      <div key={h.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 capitalize">{h.status}</span>
                          <span className="text-[10px] text-slate-400">{timeAgo(h.createdAt)}</span>
                        </div>
                        {h.note && <p className="mt-1 text-[11px] text-slate-600 italic">"{h.note}"</p>}
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Status Modal */}
      <Dialog open={Boolean(statusModalTarget)} onOpenChange={(open) => !open && setStatusModalTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              Update Order Workflow Status
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Order #{statusModalTarget?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Fulfillment Status *</Label>
              <Select value={modalNewStatus} onValueChange={setModalNewStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placed">Order Placed</SelectItem>
                  <SelectItem value="paid">Payment Confirmed</SelectItem>
                  <SelectItem value="processing">In Processing (Packing)</SelectItem>
                  <SelectItem value="shipped">In Transit (Shipped)</SelectItem>
                  <SelectItem value="delivered">Delivered (Completed)</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Payment Status</Label>
              <Select value={modalPaymentStatus} onValueChange={setModalPaymentStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid (Settled)</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Courier / Carrier</Label>
                <Input
                  placeholder="e.g. DPD Fresh Direct"
                  value={modalCarrier}
                  onChange={(e) => setModalCarrier(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Tracking Code</Label>
                <Input
                  placeholder="e.g. DPD-UK-991204"
                  value={modalTracking}
                  onChange={(e) => setModalTracking(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Audit / Transition Note</Label>
              <Input
                placeholder="e.g. Dispatched from Cotswolds fulfillment hub..."
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setStatusModalTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={updateStatusMutation.isPending}
              onClick={() => {
                if (statusModalTarget) {
                  updateStatusMutation.mutate({
                    orderId: statusModalTarget.id,
                    status: modalNewStatus,
                    paymentStatus: modalPaymentStatus,
                    carrier: modalCarrier.trim() || undefined,
                    trackingNumber: modalTracking.trim() || undefined,
                    note: modalNote.trim() || undefined,
                  });
                }
              }}
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              {updateStatusMutation.isPending ? "Updating..." : "Save Status Transition"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
