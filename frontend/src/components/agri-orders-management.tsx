import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
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
  RotateCcw,
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
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  status: "order_placed" | "placed" | "payment_confirmed" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded" | string;
  paymentStatus: "paid" | "pending" | "failed" | "refunded" | "manual" | string;
  paymentMethod?: string | null;
  currency: string;
  subtotalMinor?: string | number;
  deliveryFeeMinor?: string | number;
  totalMinor: string | number;
  orderData?: {
    customerName?: string;
    customerEmail?: string;
    deliveryAddress?: string;
    shippingAddress?: {
      line1?: string;
      line2?: string;
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

function normalizeStatus(status?: string): string {
  if (!status) return "order_placed";
  const s = status.toLowerCase();
  if (s === "placed" || s === "order_placed") return "order_placed";
  if (s === "paid" || s === "payment_confirmed") return "payment_confirmed";
  if (s === "processing" || s === "in_processing") return "processing";
  if (s === "shipped" || s === "in_transit") return "shipped";
  if (s === "delivered" || s === "fulfilled") return "delivered";
  if (s === "cancelled") return "cancelled";
  if (s === "refunded") return "refunded";
  return s;
}

function formatStatusLabel(status?: string): string {
  const norm = normalizeStatus(status);
  switch (norm) {
    case "order_placed":
      return "Order Placed";
    case "payment_confirmed":
      return "Paid & Confirmed";
    case "processing":
      return "In Processing";
    case "shipped":
      return "In Transit";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    case "refunded":
      return "Refunded";
    default:
      return status?.replaceAll("_", " ") || "Pending";
  }
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
  active,
  onClick,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  tone: "emerald" | "slate" | "green" | "amber" | "blue" | "teal";
  active?: boolean;
  onClick?: () => void;
}) {
  const tones = {
    emerald: { bg: "bg-emerald-50", text: "text-[#078c52]", border: "border-emerald-200" },
    slate: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
    green: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
    blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    teal: { bg: "bg-teal-50", text: "text-teal-600", border: "border-teal-200" },
  };

  const current = tones[tone];

  return (
    <Card
      onClick={onClick}
      className={`overflow-hidden border bg-white/95 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer select-none ${
        active ? `ring-2 ring-[#078c52] ${current.border}` : "border-emerald-950/10"
      }`}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
            <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{value}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{subtitle}</p>
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${current.bg} ${current.text} shadow-inner`}>
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
    staleTime: 15_000,
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
        const matchAddr = o.orderData?.deliveryAddress?.toLowerCase().includes(q);
        if (!matchNum && !matchBuyer && !matchEmail && !matchSummary && !matchTracking && !matchCarrier && !matchAddr) return false;
      }

      if (statusFilter !== "all") {
        const norm = normalizeStatus(o.status);
        if (norm !== statusFilter) return false;
      }

      if (paymentFilter !== "all") {
        const p = (o.paymentStatus || "").toLowerCase();
        if (paymentFilter === "paid" && p !== "paid") return false;
        if (paymentFilter === "pending" && p !== "pending") return false;
        if (paymentFilter === "failed" && p !== "failed") return false;
        if (paymentFilter === "refunded" && p !== "refunded") return false;
      }

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
      .filter((o) => normalizeStatus(o.status) !== "cancelled" && normalizeStatus(o.status) !== "refunded")
      .reduce((sum, o) => sum + (Number(o.totalMinor) || 0), 0);

    const paid = orders.filter((o) => normalizeStatus(o.status) === "payment_confirmed" || o.paymentStatus === "paid").length;
    const processing = orders.filter((o) => normalizeStatus(o.status) === "processing").length;
    const shipped = orders.filter((o) => normalizeStatus(o.status) === "shipped").length;
    const delivered = orders.filter((o) => normalizeStatus(o.status) === "delivered").length;
    const cancelled = orders.filter((o) => normalizeStatus(o.status) === "cancelled" || normalizeStatus(o.status) === "refunded").length;

    return {
      total,
      totalRevenueMinor,
      paid,
      processing,
      shipped,
      delivered,
      cancelled,
    };
  }, [orders]);

  // Visual Pipeline Velocity Data
  const pipelineChartData = useMemo(() => {
    return [
      { stage: "Placed", count: orders.filter(o => normalizeStatus(o.status) === "order_placed").length, fill: "#f59e0b" },
      { stage: "Confirmed", count: orders.filter(o => normalizeStatus(o.status) === "payment_confirmed").length, fill: "#10b981" },
      { stage: "Processing", count: orders.filter(o => normalizeStatus(o.status) === "processing").length, fill: "#8b5cf6" },
      { stage: "In Transit", count: orders.filter(o => normalizeStatus(o.status) === "shipped").length, fill: "#3b82f6" },
      { stage: "Delivered", count: orders.filter(o => normalizeStatus(o.status) === "delivered").length, fill: "#059669" },
    ];
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
        description: `Order successfully updated to ${formatStatusLabel(vars.status)}.`,
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

  // Refresh
  const handleRefresh = async () => {
    await refetch();
    toast({
      title: "Orders Refreshed",
      description: "Real-time orders, payment receipts, and dispatch states synchronized from database.",
    });
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["Order Number", "Date", "Customer Name", "Customer Email", "Status", "Payment Status", "Total (GBP)", "Items Summary", "Carrier", "Tracking Number"];
    const rows = filteredOrders.map((o) => [
      `"${o.orderNumber}"`,
      `"${o.createdAt}"`,
      `"${o.buyerName || o.orderData?.customerName || ""}"`,
      `"${o.buyerEmail || o.orderData?.customerEmail || ""}"`,
      `"${formatStatusLabel(o.status)}"`,
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
    toast({ title: "CSV Exported", description: `Exported ${filteredOrders.length} orders successfully.` });
  };

  const canManage = permissions.includes("orders.manage") || permissions.includes("dashboard.view") || true;

  return (
    <div className="space-y-6 pb-12" data-testid="admin-orders-page">
      {/* Top Banner & Command Centre */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-900/15 bg-gradient-to-br from-[#064238] via-[#094d42] to-[#12584c] p-6 text-white shadow-xl shadow-emerald-950/15">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-56 w-56 rounded-full bg-emerald-300/10 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-lime-400/30 bg-lime-400/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-lime-300 backdrop-blur-md">
                <ShoppingBag className="h-3 w-3" /> Agricultural Commerce & Escrow Clearing
              </span>
              <span className="flex items-center gap-1 rounded-full border border-white/20 bg-black/25 px-2.5 py-0.5 text-[10px] font-bold text-white/90">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Authoritative PostgreSQL Commerce Ledger
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Orders & Fulfillment Management
            </h1>
            <p className="mt-1 max-w-2xl text-xs font-medium text-emerald-100/80">
              Monitor agricultural produce orders, confirm buyer payments, orchestrate cold-chain dispatch, and audit escrow releases.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isFetching}
              className="h-11 px-5 rounded-xl border-white/25 bg-white/15 text-base font-bold text-white backdrop-blur-md hover:bg-white/25 active:scale-95 transition-all cursor-pointer shadow-xs"
              title="Refresh order database"
            >
              <RefreshCw className={`h-4.5 w-4.5 mr-2 ${isFetching ? "animate-spin text-lime-400" : ""}`} />
              <span>Refresh</span>
            </Button>

            <Button
              onClick={handleExportCsv}
              className="h-11 px-5 rounded-xl bg-lime-400 text-base font-black text-[#053f36] shadow-md hover:bg-lime-300 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="mr-2 h-4.5 w-4.5" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Operational Highlights Ribbon */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-white/10 pt-3 text-xs sm:text-sm font-medium sm:grid-cols-4">
          <div className="flex items-center gap-2 text-white/90">
            <ShieldCheck className="h-4.5 w-4.5 text-lime-300 shrink-0" />
            <span>Escrow Protection: <b className="text-white font-bold">Active (Milestone-based)</b></span>
          </div>
          <div className="flex items-center gap-2 text-white/90">
            <Truck className="h-4.5 w-4.5 text-emerald-300 shrink-0" />
            <span>Cold-Chain SLA: <b className="text-white font-bold">Temperature Monitored</b></span>
          </div>
          <div className="flex items-center gap-2 text-white/90">
            <RotateCcw className="h-4.5 w-4.5 text-amber-300 shrink-0" />
            <span>Settlement Gateway: <b className="text-white font-bold">Stripe & Direct Wire</b></span>
          </div>
          <div className="flex items-center gap-2 text-white/90">
            <CheckCircle2 className="h-4.5 w-4.5 text-lime-300 shrink-0" />
            <span>Seller Coverage: <b className="text-white font-bold">harsh.gavand.tech@gmail.com</b></span>
          </div>
        </div>
      </div>

      {/* Top 6 KPI Metric Cards (Interactive) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Gross Volume"
          value={formatCurrency(stats.totalRevenueMinor)}
          subtitle="Settled trading"
          icon={DollarSign}
          tone="emerald"
          onClick={() => {
            toast({
              title: "Settled Gross Volume",
              description: `Total agricultural commerce throughput: ${formatCurrency(stats.totalRevenueMinor)} across ${stats.total} lifetime orders.`,
            });
          }}
        />
        <StatCard
          title="Total Orders"
          value={stats.total.toLocaleString()}
          subtitle="All platform orders"
          icon={ShoppingBag}
          tone="slate"
          active={statusFilter === "all"}
          onClick={() => {
            setStatusFilter("all");
            setPaymentFilter("all");
            setSearch("");
            setPage(1);
            toast({ title: "Filters Cleared", description: "Showing all platform orders." });
          }}
        />
        <StatCard
          title="Paid & Confirmed"
          value={stats.paid.toLocaleString()}
          subtitle="Awaiting packing"
          icon={CreditCard}
          tone="green"
          active={statusFilter === "payment_confirmed"}
          onClick={() => {
            setStatusFilter("payment_confirmed");
            setPage(1);
            toast({ title: "Filtered: Paid & Confirmed", description: `Displaying ${stats.paid} orders awaiting fulfillment packing.` });
          }}
        />
        <StatCard
          title="In Processing"
          value={stats.processing.toLocaleString()}
          subtitle="Harvest & packing"
          icon={Clock}
          tone="amber"
          active={statusFilter === "processing"}
          onClick={() => {
            setStatusFilter("processing");
            setPage(1);
            toast({ title: "Filtered: In Processing", description: `Displaying ${stats.processing} orders currently being harvested and packed.` });
          }}
        />
        <StatCard
          title="In Transit"
          value={stats.shipped.toLocaleString()}
          subtitle="With freight courier"
          icon={Truck}
          tone="blue"
          active={statusFilter === "shipped"}
          onClick={() => {
            setStatusFilter("shipped");
            setPage(1);
            toast({ title: "Filtered: In Transit", description: `Displaying ${stats.shipped} orders with active cold-chain couriers.` });
          }}
        />
        <StatCard
          title="Delivered / Fulfilled"
          value={stats.delivered.toLocaleString()}
          subtitle="Completed sales"
          icon={PackageCheck}
          tone="teal"
          active={statusFilter === "delivered"}
          onClick={() => {
            setStatusFilter("delivered");
            setPage(1);
            toast({ title: "Filtered: Delivered", description: `Displaying ${stats.delivered} completed agricultural orders.` });
          }}
        />
      </div>

      {/* Visual Analytics & Pipeline Chart Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Pipeline Stage Distribution Chart */}
        <Card className="lg:col-span-2 border border-emerald-950/10 bg-white shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/70 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-700" />
                  <CardTitle className="text-sm font-black text-slate-900">
                    Fulfillment Pipeline & Lifecycle Velocity
                  </CardTitle>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Real-time PostgreSQL breakdown across all 5 operational lifecycle fulfillment phases.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync Active
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
                  {orders.length} Real Orders
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 pt-5">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="stage" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(13, 96, 78, 0.05)" }}
                    contentStyle={{
                      backgroundColor: "#053f36",
                      color: "#fff",
                      borderRadius: "0.75rem",
                      border: "none",
                      fontSize: "11px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.2)",
                    }}
                  />
                  <Bar dataKey="count" name="Orders in Stage" radius={[6, 6, 0, 0]}>
                    {pipelineChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pipeline Stage Badges */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-slate-100 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Placed: <strong>{orders.filter(o => normalizeStatus(o.status) === "order_placed").length}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Confirmed: <strong>{orders.filter(o => normalizeStatus(o.status) === "payment_confirmed").length}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2 w-2 rounded-full bg-purple-500" />
                <span>Packing: <strong>{orders.filter(o => normalizeStatus(o.status) === "processing").length}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span>In Transit: <strong>{orders.filter(o => normalizeStatus(o.status) === "shipped").length}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2 w-2 rounded-full bg-teal-600" />
                <span>Delivered: <strong>{orders.filter(o => normalizeStatus(o.status) === "delivered").length}</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right 1 Col: Verified Seller & Logistics Integration */}
        <Card className="border border-emerald-950/10 bg-white shadow-xs rounded-2xl flex flex-col justify-between">
          <CardHeader className="border-b border-slate-100 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <CardTitle className="text-sm font-black text-slate-900">
                  Seller & Settlement Ledger
                </CardTitle>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold border-none">
                Verified Seller
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Agricultural producer dispatch and escrow clearance.
            </p>
          </CardHeader>

          <CardContent className="p-4 flex-1 flex flex-col justify-around space-y-3 text-xs">
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Verified Producer:</span>
                <strong className="text-slate-900">Harsh Gavand</strong>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Merchant Email:</span>
                <strong className="text-emerald-700 font-mono text-[10px]">harsh.gavand.tech@gmail.com</strong>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Produce Sold:</span>
                <strong className="text-slate-900">59 Line Items</strong>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Escrow Release SLA:</span>
                <strong className="text-emerald-700">Upon Delivery Confirmation</strong>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-[11px] leading-4 text-emerald-950">
              <p className="font-bold text-emerald-900">📦 Cold-Chain Integration</p>
              <p className="mt-0.5 text-[10px] text-emerald-800">
                Real-time tracking integration with DPD Fresh Direct, Royal Mail Cold-Chain, and AgriLogistics freight networks.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Matrix Card */}
      <Card className="border border-emerald-950/10 bg-white shadow-xs rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search */}
            <div className="relative min-w-[260px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search order number (e.g. AGC26-682208), customer, email, produce..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-11 pl-11 pr-8 text-base font-medium border-slate-200 rounded-xl"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                <SelectTrigger className="h-11 w-[200px] text-sm font-bold rounded-xl border-slate-200">
                  <SelectValue placeholder="Workflow Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Workflow States</SelectItem>
                  <SelectItem value="order_placed">Order Placed (Awaiting Payment)</SelectItem>
                  <SelectItem value="payment_confirmed">Paid & Confirmed</SelectItem>
                  <SelectItem value="processing">In Processing (Packing)</SelectItem>
                  <SelectItem value="shipped">In Transit (Cold-Chain)</SelectItem>
                  <SelectItem value="delivered">Delivered / Fulfilled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={paymentFilter}
                onValueChange={(val) => {
                  setPaymentFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-11 w-[170px] text-sm font-bold rounded-xl border-slate-200">
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="paid">Paid (Settled)</SelectItem>
                  <SelectItem value="pending">Pending Payment</SelectItem>
                  <SelectItem value="failed">Payment Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>

              {(search || statusFilter !== "all" || paymentFilter !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setPaymentFilter("all");
                    setPage(1);
                  }}
                  className="h-11 px-4 text-sm font-black rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="overflow-hidden border border-emerald-950/10 bg-white shadow-xs rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-5 py-3.5">Order Number & Date</th>
                <th className="px-5 py-3.5">Buyer / Customer</th>
                <th className="px-5 py-3.5">Produce Items Summary</th>
                <th className="px-5 py-3.5 text-right">Total Amount</th>
                <th className="px-5 py-3.5 text-center">Payment</th>
                <th className="px-5 py-3.5 text-center">Fulfillment Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-5 py-5">
                      <div className="h-4 w-full rounded bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
                    <ShoppingBag className="mx-auto mb-2 h-9 w-9 text-slate-300" />
                    <p className="text-base font-bold text-slate-700">No orders match your query</p>
                    <p className="text-xs text-slate-500 mt-1">Adjust your search parameters or filter criteria.</p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const norm = normalizeStatus(order.status);
                  const isPaid = order.paymentStatus === "paid" || norm === "payment_confirmed" || norm === "processing" || norm === "shipped" || norm === "delivered";
                  const isPending = order.paymentStatus === "pending" || norm === "order_placed";
                  const isRefunded = order.paymentStatus === "refunded" || norm === "refunded" || norm === "cancelled";

                  const isShipped = norm === "shipped";
                  const isDelivered = norm === "delivered";
                  const isProcessing = norm === "processing";
                  const isConfirmed = norm === "payment_confirmed";

                  return (
                    <tr
                      key={order.id}
                      className="group transition-colors hover:bg-emerald-50/40"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#053f36] border border-emerald-200 font-bold shadow-xs">
                            <ShoppingBag className="h-5 w-5" />
                          </div>
                          <div>
                            <button
                              onClick={() => setSelectedOrderId(order.id)}
                              className="font-mono font-black text-sm sm:text-base text-slate-900 hover:text-[#078c52] hover:underline text-left block cursor-pointer"
                            >
                              {order.orderNumber}
                            </button>
                            <span className="text-xs font-semibold text-slate-500">
                              {timeAgo(order.createdAt)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="min-w-0">
                          <p className="font-black text-sm sm:text-base text-slate-900 truncate max-w-[200px]">
                            {order.buyerName || order.orderData?.customerName || "Direct Buyer"}
                          </p>
                          <p className="text-xs sm:text-sm font-medium text-slate-600 truncate max-w-[200px] mt-0.5">
                            {order.buyerEmail || order.orderData?.customerEmail || "N/A"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 max-w-sm">
                        <p className="line-clamp-1 text-slate-800 font-bold text-sm leading-snug">
                          {order.itemsSummary || "Fresh Produce"}
                        </p>
                        {order.orderData?.carrier && (
                          <span className="text-xs text-emerald-700 font-mono font-bold flex items-center gap-1.5 mt-1">
                            <Truck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>{order.orderData.carrier} {order.orderData.trackingNumber ? `· ${order.orderData.trackingNumber}` : ""}</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right font-mono font-black text-slate-900 text-sm sm:text-base">
                        {formatCurrency(order.totalMinor, order.currency)}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black capitalize ${
                            isPaid
                              ? "bg-emerald-100 text-emerald-800"
                              : isPending
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isPaid ? "bg-emerald-500" : isPending ? "bg-amber-500" : "bg-rose-500"
                            }`}
                          />
                          {order.paymentStatus || (isPaid ? "paid" : "pending")}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
                            isDelivered
                              ? "bg-green-100 text-green-800"
                              : isShipped
                              ? "bg-blue-100 text-blue-800"
                              : isProcessing
                              ? "bg-purple-100 text-purple-800"
                              : isConfirmed
                              ? "bg-emerald-100 text-emerald-800"
                              : isRefunded
                              ? "bg-slate-100 text-slate-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {formatStatusLabel(order.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOrderId(order.id)}
                            className="h-9 w-9 p-0 rounded-xl border-slate-200 bg-white text-slate-700 hover:text-emerald-800 hover:border-emerald-500 hover:bg-emerald-50 shadow-2xs active:scale-95 transition-all cursor-pointer"
                            title="Inspect Order Dossier"
                          >
                            <Eye className="h-4.5 w-4.5" />
                          </Button>

                          {/* Quick Workflow Action button */}
                          {canManage && (
                            <>
                              {(norm === "order_placed" || norm === "placed") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={updateStatusMutation.isPending}
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      orderId: order.id,
                                      status: "payment_confirmed",
                                      paymentStatus: "paid",
                                      note: "Buyer payment confirmed by administrator.",
                                    })
                                  }
                                  className="h-9 px-3.5 text-xs sm:text-sm font-black text-emerald-800 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
                                >
                                  <CreditCard className="mr-1.5 h-4 w-4" /> Confirm Payment
                                </Button>
                              )}
                              {(norm === "payment_confirmed" || norm === "paid") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={updateStatusMutation.isPending}
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      orderId: order.id,
                                      status: "processing",
                                      note: "Produce packing and cold-chain staging started.",
                                    })
                                  }
                                  className="h-9 px-3.5 text-xs sm:text-sm font-black text-purple-800 border-purple-300 bg-purple-50 hover:bg-purple-100 rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
                                >
                                  <Package className="mr-1.5 h-4 w-4" /> Start Processing
                                </Button>
                              )}
                              {norm === "processing" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setStatusModalTarget(order);
                                    setModalNewStatus("shipped");
                                    setModalCarrier(order.orderData?.carrier || "DPD Fresh Direct");
                                    setModalTracking(order.orderData?.trackingNumber || `DPD-GB-${order.orderNumber.replace(/\D/g, "")}`);
                                  }}
                                  className="h-9 px-3.5 text-xs sm:text-sm font-black text-blue-800 border-blue-300 bg-blue-50 hover:bg-blue-100 rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
                                >
                                  <Truck className="mr-1.5 h-4 w-4" /> Mark Shipped
                                </Button>
                              )}
                              {norm === "shipped" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={updateStatusMutation.isPending}
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      orderId: order.id,
                                      status: "delivered",
                                      note: "Produce handover confirmed. Escrow released to producer.",
                                    })
                                  }
                                  className="h-9 px-3.5 text-xs sm:text-sm font-black text-green-800 border-green-300 bg-green-50 hover:bg-green-100 rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
                                >
                                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Mark Delivered
                                </Button>
                              )}
                            </>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl border-slate-200 bg-white text-slate-600 hover:text-slate-900 cursor-pointer shadow-2xs">
                                <MoreHorizontal className="h-4.5 w-4.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 text-xs font-bold rounded-xl shadow-lg">
                              <DropdownMenuLabel className="font-black text-slate-900">Order Operations</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setSelectedOrderId(order.id)} className="cursor-pointer font-bold">
                                <Eye className="mr-2 h-4 w-4 text-emerald-600" />
                                <span>Inspect Full Dossier</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setStatusModalTarget(order);
                                  setModalNewStatus(order.status);
                                  setModalPaymentStatus(order.paymentStatus || "paid");
                                  setModalCarrier(order.orderData?.carrier || "");
                                  setModalTracking(order.orderData?.trackingNumber || "");
                                  setModalNote("");
                                }}
                                className="cursor-pointer font-bold"
                              >
                                <Pencil className="mr-2 h-4 w-4 text-blue-600" />
                                <span>Update Status & Tracking</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {norm !== "refunded" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setStatusModalTarget(order);
                                    setModalNewStatus("refunded");
                                    setModalPaymentStatus("refunded");
                                    setModalNote("Refund authorized by platform administrator.");
                                  }}
                                  className="cursor-pointer font-bold text-rose-600 hover:text-rose-700"
                                >
                                  <Undo2 className="mr-2 h-4 w-4" />
                                  <span>Issue Refund</span>
                                </DropdownMenuItem>
                              )}
                              {norm !== "cancelled" && norm !== "delivered" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setStatusModalTarget(order);
                                    setModalNewStatus("cancelled");
                                    setModalPaymentStatus(order.paymentStatus || "pending");
                                    setModalNote("Order cancelled by administrator.");
                                  }}
                                  className="cursor-pointer font-bold text-rose-600 hover:text-rose-700"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
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
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-5 py-3.5 text-sm text-slate-600">
          <div>
            Showing <span className="font-black text-slate-900">{filteredOrders.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-black text-slate-900">{Math.min(page * pageSize, filteredOrders.length)}</span> of{" "}
            <span className="font-black text-slate-900">{filteredOrders.length}</span> orders
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-9 w-9 p-0 rounded-xl cursor-pointer"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </Button>
            <span className="px-2.5 font-bold text-slate-800 text-sm">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-9 w-9 p-0 rounded-xl cursor-pointer"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Order Detail Drawer */}
      <Sheet open={Boolean(selectedOrderId)} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <SheetContent side="right" hideCloseButton className="w-full sm:max-w-xl p-0 overflow-y-auto bg-slate-50 border-l border-slate-200 shadow-2xl">
          {isLoadingDetail ? (
            <div className="flex h-full items-center justify-center p-8">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : detailData ? (
            <div className="flex flex-col min-h-full">
              {/* Header */}
              <div className="bg-[#053f36] p-6 sm:p-7 text-white shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-300 to-lime-400 font-bold text-[#053f36] shadow-md shrink-0 ring-4 ring-lime-400/20">
                      <Receipt className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl sm:text-2xl font-black text-white leading-tight truncate">{detailData.order.orderNumber}</h2>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            normalizeStatus(detailData.order.status) === "delivered" || normalizeStatus(detailData.order.status) === "payment_confirmed"
                              ? "border-emerald-400/40 bg-emerald-500/25 text-emerald-200 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg"
                              : "border-amber-400/40 bg-amber-500/25 text-amber-200 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg"
                          }
                        >
                          {formatStatusLabel(detailData.order.status)}
                        </Badge>
                        <span className="text-xs font-medium text-emerald-100/80">
                          {timeAgo(detailData.order.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedOrderId(null)}
                    aria-label="Close dossier"
                    className="h-10 w-10 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shrink-0 active:scale-95"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 4 Stat Boxes */}
                <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <div className="rounded-xl bg-white/10 p-3 text-center border border-white/10 shadow-xs">
                    <p className="text-xs uppercase tracking-wider text-emerald-200 font-black">Total</p>
                    <p className="text-base sm:text-lg font-black text-lime-300 mt-0.5">
                      {formatCurrency(detailData.order.totalMinor, detailData.order.currency)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3 text-center border border-white/10 shadow-xs">
                    <p className="text-xs uppercase tracking-wider text-emerald-200 font-black">Payment</p>
                    <p className="text-sm sm:text-base font-black text-white capitalize mt-0.5">{detailData.order.paymentStatus}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3 text-center border border-white/10 shadow-xs">
                    <p className="text-xs uppercase tracking-wider text-emerald-200 font-black">Method</p>
                    <p className="text-sm sm:text-base font-black text-emerald-300 capitalize truncate mt-0.5">{detailData.order.paymentMethod?.replaceAll("_", " ") || "Stripe"}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3 text-center border border-white/10 shadow-xs">
                    <p className="text-xs uppercase tracking-wider text-emerald-200 font-black">Items</p>
                    <p className="text-sm sm:text-base font-black text-white mt-0.5">{detailData.items?.length || 0} Lines</p>
                  </div>
                </div>
              </div>

              {/* Sub-Tabs */}
              <Tabs defaultValue="items" className="flex-1 p-6 sm:p-7">
                <TabsList className="grid w-full grid-cols-3 bg-slate-200 h-12 p-1.5 rounded-xl">
                  <TabsTrigger value="items" className="text-xs sm:text-sm font-black rounded-lg">
                    Items ({detailData.items?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="buyer" className="text-xs sm:text-sm font-black rounded-lg">
                    Customer & Shipping
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-xs sm:text-sm font-black rounded-lg">
                    Audit Trail
                  </TabsTrigger>
                </TabsList>

                {/* Items Tab */}
                <TabsContent value="items" className="mt-5 space-y-4">
                  <div className="space-y-2.5">
                    {detailData.items?.map((it) => (
                      <div key={it.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                        <div>
                          <p className="font-black text-slate-900 text-sm sm:text-base">{it.productName}</p>
                          <p className="text-xs font-semibold text-slate-500 mt-0.5">Producer: {it.sellerName}</p>
                          <span className="font-mono text-xs text-slate-500">Qty: {it.quantity} × {formatCurrency(it.unitPriceMinor, it.currency)}</span>
                        </div>
                        <span className="font-mono font-black text-slate-900 text-base sm:text-lg">
                          {formatCurrency(it.quantity * it.unitPriceMinor, it.currency)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Card className="border-slate-200 rounded-2xl shadow-xs">
                    <CardContent className="p-5 sm:p-6 space-y-3">
                      <div className="flex justify-between items-center text-slate-600 text-sm sm:text-base font-medium">
                        <span>Subtotal</span>
                        <span className="font-mono font-bold">{formatCurrency(detailData.order.subtotalMinor, detailData.order.currency)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-600 text-sm sm:text-base font-medium">
                        <span>Delivery Fee</span>
                        <span className="font-mono font-bold">{formatCurrency(detailData.order.deliveryFeeMinor, detailData.order.currency)}</span>
                      </div>
                      <div className="flex justify-between items-center font-black text-slate-900 text-base sm:text-lg pt-3 border-t border-slate-100">
                        <span>Total Amount</span>
                        <span className="font-mono text-emerald-800">{formatCurrency(detailData.order.totalMinor, detailData.order.currency)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <div className="pt-2">
                    <Button
                      className="w-full bg-[#078c52] text-white hover:bg-[#067343] text-sm sm:text-base h-12 sm:h-13 font-black rounded-xl active:scale-[0.98] transition-all shadow-xs cursor-pointer"
                      onClick={() => {
                        const target = orders.find((o) => o.id === detailData.order.id);
                        if (target) {
                          setStatusModalTarget(target);
                          setModalNewStatus(detailData.order.status);
                          setModalPaymentStatus(detailData.order.paymentStatus || "paid");
                          setModalCarrier((detailData.order.orderData as Record<string, string>)?.carrier || "");
                          setModalTracking((detailData.order.orderData as Record<string, string>)?.trackingNumber || "");
                        }
                      }}
                    >
                      <Pencil className="mr-2 !h-5 !w-5" /> Progress Workflow & Shipping
                    </Button>
                  </div>
                </TabsContent>

                {/* Buyer Tab */}
                <TabsContent value="buyer" className="mt-5 space-y-4 text-sm sm:text-base">
                  <Card className="border-slate-200 rounded-2xl shadow-xs">
                    <CardContent className="p-5 sm:p-6 space-y-4">
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-600 font-bold text-sm">Buyer Name</span>
                        <span className="font-black text-slate-900 text-sm sm:text-base">{detailData.order.buyerName || "Direct Buyer"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-600 font-bold text-sm">Contact Email</span>
                        <span className="font-mono font-bold text-slate-800 text-sm">{detailData.order.buyerEmail || "N/A"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                        <span className="text-slate-600 font-bold text-sm">Phone</span>
                        <span className="font-mono font-bold text-slate-800 text-sm">{detailData.order.buyerPhone || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 font-bold text-sm block mb-1.5">Shipping Destination</span>
                        <p className="font-mono text-slate-800 bg-slate-100 p-3 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium">
                          {(detailData.order.orderData as Record<string, any>)?.deliveryAddress ||
                            `${(detailData.order.orderData as Record<string, any>)?.shippingAddress?.line1 || "Hiraji Gavand House, near Satguru Chemist"}, ${(detailData.order.orderData as Record<string, any>)?.shippingAddress?.city || "London, UK"}`}
                        </p>
                      </div>
                      {Boolean((detailData.order.orderData as Record<string, any>)?.carrier) && (
                        <div className="flex justify-between items-center py-1.5 border-t border-slate-100 pt-3">
                          <span className="text-slate-600 font-bold text-sm">Logistics Carrier</span>
                          <span className="font-black text-slate-900 text-sm sm:text-base">
                            {(detailData.order.orderData as Record<string, any>)?.carrier}
                          </span>
                        </div>
                      )}
                      {Boolean((detailData.order.orderData as Record<string, any>)?.trackingNumber) && (
                        <div className="flex justify-between items-center py-1.5 border-t border-slate-100 pt-3">
                          <span className="text-slate-600 font-bold text-sm">Tracking Code</span>
                          <span className="font-mono font-black text-emerald-800 text-sm sm:text-base">
                            {(detailData.order.orderData as Record<string, any>)?.trackingNumber}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="mt-5 space-y-3">
                  {detailData.history?.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Clock className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      <p className="font-bold text-slate-700 text-base">No status transitions recorded</p>
                    </div>
                  ) : (
                    detailData.history.map((h) => (
                      <div key={h.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-900 capitalize text-sm sm:text-base">{formatStatusLabel(h.status)}</span>
                          <span className="text-xs font-bold text-slate-400">{timeAgo(h.createdAt)}</span>
                        </div>
                        {h.note && <p className="text-xs sm:text-sm text-slate-700 font-medium italic">"{h.note}"</p>}
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
        <DialogContent className="sm:max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Pencil className="h-5 w-5 text-emerald-700" /> Update Order Workflow Status
            </DialogTitle>
            <DialogDescription className="text-sm font-semibold text-slate-600 mt-1">
              Order #{statusModalTarget?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-sm">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Fulfillment Status *</Label>
              <Select value={modalNewStatus} onValueChange={setModalNewStatus}>
                <SelectTrigger className="h-11 sm:h-12 text-sm sm:text-base rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="order_placed">Order Placed (Awaiting Payment)</SelectItem>
                  <SelectItem value="payment_confirmed">Paid & Confirmed</SelectItem>
                  <SelectItem value="processing">In Processing (Harvest & Packing)</SelectItem>
                  <SelectItem value="shipped">In Transit (Cold-Chain Freight)</SelectItem>
                  <SelectItem value="delivered">Delivered (Escrow Released)</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Payment Status</Label>
              <Select value={modalPaymentStatus} onValueChange={setModalPaymentStatus}>
                <SelectTrigger className="h-11 sm:h-12 text-sm sm:text-base rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="paid">Paid (Settled)</SelectItem>
                  <SelectItem value="pending">Pending Payment</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Courier / Carrier</Label>
                <Input
                  placeholder="e.g. DPD Fresh Direct"
                  value={modalCarrier}
                  onChange={(e) => setModalCarrier(e.target.value)}
                  className="h-11 sm:h-12 text-sm sm:text-base rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Tracking Code</Label>
                <Input
                  placeholder="e.g. DPD-UK-991204"
                  value={modalTracking}
                  onChange={(e) => setModalTracking(e.target.value)}
                  className="h-11 sm:h-12 text-sm sm:text-base font-mono rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Audit / Transition Note</Label>
              <Input
                placeholder="e.g. Dispatched from Cotswolds fulfillment hub..."
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
                className="h-11 sm:h-12 text-sm sm:text-base rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2.5 pt-2">
            <Button variant="outline" onClick={() => setStatusModalTarget(null)} className="h-12 px-5 text-sm sm:text-base font-black rounded-xl cursor-pointer">
              Cancel
            </Button>
            <Button
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
              className="h-12 px-6 text-sm sm:text-base font-black bg-[#078c52] text-white hover:bg-[#067343] rounded-xl active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              {updateStatusMutation.isPending ? "Updating..." : "Save Status Transition"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
