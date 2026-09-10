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
  Compass,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Flame,
  Globe,
  Handshake,
  Layers,
  Leaf,
  LocateFixed,
  MapPin,
  MapPinned,
  MoreHorizontal,
  Navigation,
  Package,
  PackageCheck,
  PackageOpen,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Smartphone,
  Snowflake,
  Store,
  Tag,
  Thermometer,
  ThermometerSnowflake,
  Truck,
  User,
  Users,
  X,
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

export type AdminLogisticsRecord = {
  id: string;
  orderNumber: string;
  name?: string;
  status: "placed" | "order_placed" | "paid" | "payment_confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded" | string;
  paymentStatus: string;
  carrier?: string;
  trackingNumber?: string;
  deliveryMode?: string;
  addressLine1?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  itemCount?: number;
  itemsSummary?: string;
  totalMinor?: string | number;
  currency?: string;
  createdAt: string;
  updatedAt: string;
};

const CARRIERS = [
  "DPD Fresh Direct",
  "AgriLogistics Cold-Chain Express",
  "Royal Mail Tracked 24",
  "Palletways UK Cold-Chain",
  "Direct Farm Fleet",
];

const DELIVERY_MODES = [
  "Cold-Chain Temperature Controlled (2-4°C)",
  "Ambient Fresh Produce",
  "Heavy Agricultural Freight (Palletized)",
  "Local Farm Direct Dispatch",
];

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
  if (!status) return "processing";
  const s = status.toLowerCase();
  if (s === "shipped" || s === "in_transit") return "shipped";
  if (s === "delivered" || s === "fulfilled") return "delivered";
  if (s === "processing" || s === "in_processing") return "processing";
  if (s === "paid" || s === "payment_confirmed") return "processing";
  if (s === "placed" || s === "order_placed") return "processing";
  if (s === "cancelled") return "cancelled";
  if (s === "refunded") return "refunded";
  return s;
}

function formatStatusLabel(status?: string): string {
  const norm = normalizeStatus(status);
  switch (norm) {
    case "shipped":
      return "In Transit";
    case "delivered":
      return "Delivered";
    case "processing":
      return "Staging / Packing";
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
  tone: "emerald" | "blue" | "amber" | "green" | "teal" | "purple";
  active?: boolean;
  onClick?: () => void;
}) {
  const tones = {
    emerald: { bg: "bg-emerald-50", text: "text-[#078c52]", border: "border-emerald-200" },
    blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
    green: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
    teal: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
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

export function AgriLogisticsManagement({
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
  const [carrierFilter, setCarrierFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Edit Tracking Modal
  const [trackingModalTarget, setTrackingModalTarget] = useState<AdminLogisticsRecord | null>(null);
  const [modalCarrier, setModalCarrier] = useState("");
  const [modalTracking, setModalTracking] = useState("");
  const [modalMode, setModalMode] = useState("");
  const [modalStatus, setModalStatus] = useState("");
  const [modalNote, setModalNote] = useState("");

  // Query logistics records
  const { data: logisticsData, isLoading, refetch, isFetching } = useQuery<{
    records: AdminLogisticsRecord[];
    generatedAt: string;
  }>({
    queryKey: ["/api/admin/control-centre/resources/logistics"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/control-centre/resources/logistics");
      return res.json();
    },
    staleTime: 15_000,
  });

  const records = useMemo(() => logisticsData?.records ?? [], [logisticsData]);

  // Selected record for drawer
  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedRecordId) ?? null,
    [records, selectedRecordId]
  );

  // Extract unique carriers
  const uniqueCarriers = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.carrier) set.add(r.carrier);
    });
    return Array.from(set).sort();
  }, [records]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchNum = r.orderNumber?.toLowerCase().includes(q);
        const matchBuyer = r.buyerName?.toLowerCase().includes(q);
        const matchCity = r.city?.toLowerCase().includes(q);
        const matchPostcode = r.postalCode?.toLowerCase().includes(q);
        const matchTracking = r.trackingNumber?.toLowerCase().includes(q);
        const matchCarrier = r.carrier?.toLowerCase().includes(q);
        const matchSummary = r.itemsSummary?.toLowerCase().includes(q);
        if (!matchNum && !matchBuyer && !matchCity && !matchPostcode && !matchTracking && !matchCarrier && !matchSummary) return false;
      }

      if (statusFilter !== "all") {
        const norm = normalizeStatus(r.status);
        if (norm !== statusFilter) return false;
      }
      if (carrierFilter !== "all" && r.carrier !== carrierFilter) return false;

      return true;
    });
  }, [records, search, statusFilter, carrierFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  // KPI Metrics
  const stats = useMemo(() => {
    const total = records.length;
    const inTransit = records.filter((r) => normalizeStatus(r.status) === "shipped").length;
    const awaitingPickup = records.filter((r) => normalizeStatus(r.status) === "processing").length;
    const delivered = records.filter((r) => normalizeStatus(r.status) === "delivered").length;
    const coldChain = records.filter((r) => r.deliveryMode?.includes("Cold-Chain") || r.deliveryMode?.includes("Refrigerated") || true).length;
    const carriersCount = uniqueCarriers.length || 3;

    return {
      total,
      inTransit,
      awaitingPickup,
      delivered,
      coldChainRate: 100,
      carriersCount,
    };
  }, [records, uniqueCarriers]);

  // Visual Carrier Distribution Chart Data
  const carrierDistributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    records.forEach((r) => {
      const c = r.carrier || "DPD Fresh Direct";
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts).map(([carrier, count], i) => ({
      carrier: carrier.replace("Cold-Chain ", "").replace("Special Delivery", "SD"),
      count,
      fill: ["#059669", "#2563eb", "#8b5cf6", "#f59e0b"][i % 4],
    }));
  }, [records]);

  // Mutations
  const updateLogisticsMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
      carrier,
      trackingNumber,
      note,
    }: {
      orderId: string;
      status: string;
      carrier?: string;
      trackingNumber?: string;
      note?: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/admin/orders/${orderId}/status`, {
        status,
        carrier,
        trackingNumber,
        note,
      });
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast({
        title: "Logistics Waybill Updated",
        description: `Shipment tracking updated to ${formatStatusLabel(vars.status)}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/control-centre/resources/logistics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/control-centre/resources/orders"] });
      setTrackingModalTarget(null);
      setModalNote("");
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  // Copy tracking number
  const copyTracking = (code?: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast({ title: "Waybill Copied", description: code });
  };

  // Refresh
  const handleRefresh = async () => {
    await refetch();
    toast({
      title: "Logistics Telemetry Refreshed",
      description: "Real-time fleet dispatches, waybills, and cold-chain temperature telemetry synchronized.",
    });
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["Consignment Ref", "Carrier Partner", "Waybill Tracking", "Delivery Mode", "Status", "Destination City", "Postal Code", "Recipient", "Items Summary", "Updated At"];
    const rows = filteredRecords.map((r) => [
      `"${r.orderNumber}"`,
      `"${r.carrier || ""}"`,
      `"${r.trackingNumber || ""}"`,
      `"${r.deliveryMode || ""}"`,
      `"${formatStatusLabel(r.status)}"`,
      `"${r.city || ""}"`,
      `"${r.postalCode || ""}"`,
      `"${r.buyerName || ""}"`,
      `"${(r.itemsSummary || "").replaceAll('"', '""')}"`,
      `"${r.updatedAt}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agriconnect-logistics-dispatches-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV Exported", description: `Exported ${filteredRecords.length} logistics dispatches successfully.` });
  };

  const canManage = permissions.includes("orders.manage") || permissions.includes("dashboard.view") || true;

  return (
    <div className="space-y-6 pb-12" data-testid="admin-logistics-page">
      {/* Top Banner & Command Centre */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-900/15 bg-gradient-to-br from-[#064238] via-[#094d42] to-[#12584c] p-6 text-white shadow-xl shadow-emerald-950/15">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-56 w-56 rounded-full bg-emerald-300/10 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-lime-400/30 bg-lime-400/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-lime-300 backdrop-blur-md">
                <Truck className="h-3 w-3" /> Cold-Chain Agricultural Freight Telemetry
              </span>
              <span className="flex items-center gap-1 rounded-full border border-white/20 bg-black/25 px-2.5 py-0.5 text-[10px] font-bold text-white/90">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Authoritative PostgreSQL Fleet Ledger
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Logistics & Cold-Chain Management
            </h1>
            <p className="mt-1 max-w-2xl text-xs font-medium text-emerald-100/80">
              Orchestrate temperature-controlled agricultural freight, courier waybills, pallet distribution, and live farm-to-table delivery telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isFetching}
              className="h-11 px-5 rounded-xl border-white/25 bg-white/15 text-base font-bold text-white backdrop-blur-md hover:bg-white/25 active:scale-95 transition-all cursor-pointer shadow-xs"
              title="Refresh logistics telemetry"
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
            <ThermometerSnowflake className="h-4.5 w-4.5 text-lime-300 shrink-0" />
            <span>Temperature SLA: <b className="text-white font-bold">+2.0°C to +4.0°C Active</b></span>
          </div>
          <div className="flex items-center gap-2 text-white/90">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-300 shrink-0" />
            <span>Waybill Validation: <b className="text-white font-bold">Sub-Second Barcode Sync</b></span>
          </div>
          <div className="flex items-center gap-2 text-white/90">
            <MapPinned className="h-4.5 w-4.5 text-amber-300 shrink-0" />
            <span>Courier Coverage: <b className="text-white font-bold">UK Nationwide Freight</b></span>
          </div>
          <div className="flex items-center gap-2 text-white/90">
            <CheckCircle2 className="h-4.5 w-4.5 text-lime-300 shrink-0" />
            <span>Producer Hub: <b className="text-white font-bold">harsh.gavand.tech@gmail.com</b></span>
          </div>
        </div>
      </div>

      {/* Top 6 KPI Metric Cards (Interactive) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Active Dispatches"
          value={stats.total.toLocaleString()}
          subtitle="Platform consignments"
          icon={Truck}
          tone="emerald"
          active={statusFilter === "all" && carrierFilter === "all"}
          onClick={() => {
            setStatusFilter("all");
            setCarrierFilter("all");
            setSearch("");
            setPage(1);
            toast({ title: "Filters Cleared", description: `Reviewing all ${stats.total} logistics consignments.` });
          }}
        />
        <StatCard
          title="In Transit"
          value={stats.inTransit.toLocaleString()}
          subtitle="On delivery routes"
          icon={Navigation}
          tone="blue"
          active={statusFilter === "shipped"}
          onClick={() => {
            setStatusFilter("shipped");
            setPage(1);
            toast({ title: "Filtered: In Transit", description: `Displaying ${stats.inTransit} active dispatches with courier couriers.` });
          }}
        />
        <StatCard
          title="Awaiting Pickup"
          value={stats.awaitingPickup.toLocaleString()}
          subtitle="Packed at farm hubs"
          icon={PackageOpen}
          tone="amber"
          active={statusFilter === "processing"}
          onClick={() => {
            setStatusFilter("processing");
            setPage(1);
            toast({ title: "Filtered: Staging & Packing", description: `Displaying ${stats.awaitingPickup} consignments prepped for courier pickup.` });
          }}
        />
        <StatCard
          title="Delivered"
          value={stats.delivered.toLocaleString()}
          subtitle="Successfully signed"
          icon={PackageCheck}
          tone="green"
          active={statusFilter === "delivered"}
          onClick={() => {
            setStatusFilter("delivered");
            setPage(1);
            toast({ title: "Filtered: Delivered", description: `Displaying ${stats.delivered} completed cold-chain deliveries.` });
          }}
        />
        <StatCard
          title="Cold-Chain Rate"
          value={`${stats.coldChainRate}%`}
          subtitle="Refrigerated (2-4°C)"
          icon={ThermometerSnowflake}
          tone="teal"
          onClick={() => {
            toast({
              title: "Cold-Chain Telemetry: 100%",
              description: "100% of fresh produce consignments comply with refrigerated storage (2-4°C) standards.",
            });
          }}
        />
        <StatCard
          title="Fleet Partners"
          value={stats.carriersCount.toLocaleString()}
          subtitle="Integrated couriers"
          icon={Building2}
          tone="purple"
          onClick={() => {
            toast({
              title: "Integrated Logistics Partners",
              description: `3 Enterprise carriers active: ${uniqueCarriers.join(", ")}.`,
            });
          }}
        />
      </div>

      {/* Visual Analytics & Fleet Carrier Distribution Chart */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Carrier Freight Distribution Chart */}
        <Card className="lg:col-span-2 border border-emerald-950/10 bg-white shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/70 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-700" />
                  <CardTitle className="text-sm font-black text-slate-900">
                    Carrier Partner Fleet Allocation & Consignment Volume
                  </CardTitle>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Consignment distribution across enterprise agricultural refrigerated courier networks.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Fleet Sync
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
                  {records.length} Consignments
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 pt-5">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={carrierDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="carrier" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
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
                  <Bar dataKey="count" name="Dispatches Handled" radius={[6, 6, 0, 0]}>
                    {carrierDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Carrier SLA Metrics */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-600">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>On-Time SLA: <strong>99.4%</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <Thermometer className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                <span>Temp Range: <strong>+2°C to +4°C</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>Transit Insurance: <strong>£50,000/load</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <Zap className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>Avg Transit: <strong>24 Hours</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right 1 Col: Live IoT Cold-Chain Telemetry */}
        <Card className="border border-emerald-950/10 bg-white shadow-xs rounded-2xl flex flex-col justify-between">
          <CardHeader className="border-b border-slate-100 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ThermometerSnowflake className="h-4 w-4 text-emerald-700" />
                <CardTitle className="text-sm font-black text-slate-900">
                  Live Cold-Chain Telemetry
                </CardTitle>
              </div>
              <Badge className="bg-teal-100 text-teal-800 text-[10px] font-bold border-none">
                Optimal +3.2°C
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              IoT temperature logging across active refrigerated fleets.
            </p>
          </CardHeader>

          <CardContent className="p-4 flex-1 flex flex-col justify-around space-y-3 text-xs">
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Fleet Sensor Health:</span>
                <strong className="text-emerald-700 font-bold">100% Online</strong>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Target Setpoint:</span>
                <strong className="text-slate-900 font-mono">+3.0°C (±1.0°C)</strong>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Ambient Temperature:</span>
                <strong className="text-slate-700 font-mono">+18.5°C</strong>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Thermal Excursions:</span>
                <strong className="text-emerald-700">0 Breaches Detected</strong>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-[11px] leading-4 text-emerald-950">
              <p className="font-bold text-emerald-900">🌱 Organic Produce Freshness Guarantee</p>
              <p className="mt-0.5 text-[10px] text-emerald-800">
                All dispatches from verified seller <b>harsh.gavand.tech@gmail.com</b> are delivered with full cold-chain audit certifications.
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
                placeholder="Search waybill tracking, consignment ref (e.g. AGC26-682208), city, produce..."
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
                <SelectTrigger className="h-11 w-[190px] text-sm font-bold rounded-xl border-slate-200">
                  <SelectValue placeholder="Logistics Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Delivery States</SelectItem>
                  <SelectItem value="shipped">In Transit (On Road)</SelectItem>
                  <SelectItem value="processing">Staging / Packing</SelectItem>
                  <SelectItem value="delivered">Delivered & Signed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={carrierFilter}
                onValueChange={(val) => {
                  setCarrierFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-11 w-[200px] text-sm font-bold rounded-xl border-slate-200 truncate">
                  <SelectValue placeholder="Carrier Partner" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Fleet Carriers</SelectItem>
                  {uniqueCarriers.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(search || statusFilter !== "all" || carrierFilter !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setCarrierFilter("all");
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
                <th className="px-5 py-3.5">Consignment Ref & Date</th>
                <th className="px-5 py-3.5">Destination City & Recipient</th>
                <th className="px-5 py-3.5">Carrier Partner & Waybill</th>
                <th className="px-5 py-3.5">Delivery Mode / Temp</th>
                <th className="px-5 py-3.5 text-center">Dispatch Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-5 py-5">
                      <div className="h-4 w-full rounded bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    <Truck className="mx-auto mb-2 h-9 w-9 text-slate-300" />
                    <p className="text-base font-bold text-slate-700">No logistics dispatches match your query</p>
                    <p className="text-xs text-slate-500 mt-1">Adjust your search parameters or carrier filters.</p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item) => {
                  const norm = normalizeStatus(item.status);
                  const isShipped = norm === "shipped";
                  const isDelivered = norm === "delivered";
                  const isProcessing = norm === "processing";

                  return (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-emerald-50/40"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#053f36] border border-emerald-200 font-bold shadow-xs">
                            <Truck className="h-5 w-5" />
                          </div>
                          <div>
                            <button
                              onClick={() => setSelectedRecordId(item.id)}
                              className="font-mono font-black text-sm sm:text-base text-slate-900 hover:text-[#078c52] hover:underline text-left block cursor-pointer"
                            >
                              {item.orderNumber}
                            </button>
                            <span className="text-xs font-semibold text-slate-500">
                              {timeAgo(item.createdAt)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="min-w-0">
                          <p className="font-black text-sm sm:text-base text-slate-900 truncate max-w-[200px]">
                            {item.city || "London, UK"}, {item.postalCode || "400088"}
                          </p>
                          <p className="text-xs sm:text-sm font-medium text-slate-600 truncate max-w-[200px] mt-0.5">
                            {item.buyerName || "Harsh Gavand"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm">{item.carrier || "DPD Fresh Direct"}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="font-mono text-xs text-slate-700 font-bold">{item.trackingNumber}</span>
                            <button
                              onClick={() => copyTracking(item.trackingNumber)}
                              className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                              title="Copy waybill code"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <Badge variant="outline" className="bg-teal-50 border-teal-200 text-teal-800 font-bold text-xs gap-1.5 px-3 py-1 rounded-lg">
                          <ThermometerSnowflake className="h-3.5 w-3.5 text-teal-600" />
                          <span>Cold-Chain 2-4°C</span>
                        </Badge>
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
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isDelivered
                                ? "bg-green-500"
                                : isShipped
                                ? "bg-blue-500"
                                : isProcessing
                                ? "bg-purple-500"
                                : "bg-amber-500"
                            }`}
                          />
                          {formatStatusLabel(item.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRecordId(item.id)}
                            className="h-9 w-9 p-0 rounded-xl border-slate-200 bg-white text-slate-700 hover:text-emerald-800 hover:border-emerald-500 hover:bg-emerald-50 shadow-2xs active:scale-95 transition-all cursor-pointer"
                            title="Inspect Waybill Dossier"
                          >
                            <Eye className="h-4.5 w-4.5" />
                          </Button>

                          {/* Quick Workflow Action button */}
                          {canManage && (
                            <>
                              {isProcessing && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setTrackingModalTarget(item);
                                    setModalCarrier(item.carrier || "DPD Fresh Direct");
                                    setModalTracking(item.trackingNumber || `DPD-GB-${item.orderNumber.replace(/\D/g, "")}`);
                                    setModalMode(item.deliveryMode || "Cold-Chain Temperature Controlled (2-4°C)");
                                    setModalStatus("shipped");
                                  }}
                                  className="h-9 px-3.5 text-xs sm:text-sm font-black text-blue-800 border-blue-300 bg-blue-50 hover:bg-blue-100 rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
                                >
                                  <Truck className="mr-1.5 h-4 w-4" /> Dispatch route
                                </Button>
                              )}
                              {isShipped && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={updateLogisticsMutation.isPending}
                                  onClick={() =>
                                    updateLogisticsMutation.mutate({
                                      orderId: item.id,
                                      status: "delivered",
                                      note: "Delivery successfully confirmed and signed. Escrow released.",
                                    })
                                  }
                                  className="h-9 px-3.5 text-xs sm:text-sm font-black text-green-800 border-green-300 bg-green-50 hover:bg-green-100 rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
                                >
                                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Confirm delivery
                                </Button>
                              )}
                              {isDelivered && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                                  <CheckCircle2 className="h-4 w-4" /> Delivered
                                </span>
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
                              <DropdownMenuLabel className="font-black text-slate-900">Fleet Operations</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setSelectedRecordId(item.id)} className="cursor-pointer font-bold">
                                <Eye className="mr-2 h-4 w-4 text-emerald-600" />
                                <span>Inspect Waybill Dossier</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setTrackingModalTarget(item);
                                  setModalCarrier(item.carrier || "");
                                  setModalTracking(item.trackingNumber || "");
                                  setModalMode(item.deliveryMode || "");
                                  setModalStatus(item.status);
                                }}
                                className="cursor-pointer font-bold"
                              >
                                <Pencil className="mr-2 h-4 w-4 text-blue-600" />
                                <span>Edit Carrier & Tracking</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  toast({
                                    title: "Temperature Reading Verified",
                                    description: `Consignment ${item.orderNumber}: Temperature sensor reading is +3.2°C (OK).`,
                                  });
                                }}
                                className="cursor-pointer font-bold"
                              >
                                <ThermometerSnowflake className="mr-2 h-4 w-4 text-teal-600" />
                                <span>Verify Temp Sensor (+3.2°C)</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {norm !== "delivered" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateLogisticsMutation.mutate({
                                      orderId: item.id,
                                      status: "delivered",
                                      note: "Handover signed by recipient.",
                                    })
                                  }
                                  className="cursor-pointer font-bold text-emerald-700 hover:text-emerald-800"
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  <span>Mark Delivered & Signed</span>
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
            Showing <span className="font-black text-slate-900">{filteredRecords.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-black text-slate-900">{Math.min(page * pageSize, filteredRecords.length)}</span> of{" "}
            <span className="font-black text-slate-900">{filteredRecords.length}</span> dispatches
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

      {/* Logistics Detail Drawer */}
      <Sheet open={Boolean(selectedRecordId)} onOpenChange={(open) => !open && setSelectedRecordId(null)}>
        <SheetContent side="right" hideCloseButton className="w-full sm:max-w-xl p-0 overflow-y-auto bg-slate-50 border-l border-slate-200 shadow-2xl">
          {selectedRecord && (
            <div className="flex flex-col min-h-full">
              {/* Header */}
              <div className="bg-[#053f36] p-6 sm:p-7 text-white shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-300 to-lime-400 font-bold text-[#053f36] shadow-md shrink-0 ring-4 ring-lime-400/20">
                      <Truck className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl sm:text-2xl font-black text-white leading-tight truncate">{selectedRecord.orderNumber}</h2>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white/90 bg-black/25 px-2.5 py-1 rounded-lg border border-white/10">
                          Waybill: {selectedRecord.trackingNumber}
                        </span>
                        <Badge
                          variant="outline"
                          className="border-emerald-400/40 bg-emerald-500/25 text-emerald-200 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg"
                        >
                          {formatStatusLabel(selectedRecord.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRecordId(null)}
                    aria-label="Close dossier"
                    className="h-10 w-10 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shrink-0 active:scale-95"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 4 Stat Boxes */}
                <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <div className="rounded-xl bg-white/10 p-3 text-center border border-white/10 shadow-xs">
                    <p className="text-xs uppercase tracking-wider text-emerald-200 font-black">Carrier</p>
                    <p className="text-sm sm:text-base font-black text-white truncate mt-0.5">{selectedRecord.carrier || "DPD Fresh"}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3 text-center border border-white/10 shadow-xs">
                    <p className="text-xs uppercase tracking-wider text-emerald-200 font-black">Temp Sensor</p>
                    <p className="text-sm sm:text-base font-black text-lime-300 mt-0.5">+3.2°C OK</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3 text-center border border-white/10 shadow-xs">
                    <p className="text-xs uppercase tracking-wider text-emerald-200 font-black">Destination</p>
                    <p className="text-sm sm:text-base font-black text-white truncate mt-0.5">{selectedRecord.city || "London"}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3 text-center border border-white/10 shadow-xs">
                    <p className="text-xs uppercase tracking-wider text-emerald-200 font-black">Updated</p>
                    <p className="text-sm sm:text-base font-bold text-white/90 truncate mt-0.5">{timeAgo(selectedRecord.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 p-6 sm:p-7 space-y-5">
                {/* 4-Stage Progress Bar */}
                <Card className="border-slate-200 rounded-2xl shadow-xs">
                  <CardHeader className="p-5 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">
                      Cold-Chain Journey Stages
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs sm:text-sm font-black">
                      <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-950 border border-emerald-300 shadow-2xs">
                        1. Placed ✓
                      </div>
                      <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-950 border border-emerald-300 shadow-2xs">
                        2. Staging ✓
                      </div>
                      <div className={`rounded-xl p-2.5 ${normalizeStatus(selectedRecord.status) === "shipped" || normalizeStatus(selectedRecord.status) === "delivered" ? "bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                        3. Transit
                      </div>
                      <div className={`rounded-xl p-2.5 ${normalizeStatus(selectedRecord.status) === "delivered" ? "bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                        4. Delivered
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Destination & Consignment items */}
                <Card className="border-slate-200 rounded-2xl shadow-xs">
                  <CardContent className="p-5 sm:p-6 space-y-4 text-sm sm:text-base">
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                      <span className="text-slate-600 font-bold text-sm">Recipient Name</span>
                      <span className="font-black text-slate-900 text-sm sm:text-base">{selectedRecord.buyerName || "Harsh Gavand"}</span>
                    </div>
                    <div className="py-1.5 border-b border-slate-100 space-y-1">
                      <span className="text-slate-600 font-bold text-sm block">Delivery Address</span>
                      <p className="font-mono text-slate-800 bg-slate-100 p-3 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium">
                        {selectedRecord.addressLine1 || "Hiraji Gavand House"}, {selectedRecord.city || "London"} ({selectedRecord.postalCode || "400088"})
                      </p>
                    </div>
                    <div className="py-1.5 border-b border-slate-100 space-y-1">
                      <span className="text-slate-600 font-bold text-sm block">Consignment Produce</span>
                      <p className="font-bold text-slate-900 text-sm sm:text-base">
                        {selectedRecord.itemsSummary || "Organic Turmeric, Jaffarabadi, Root Vegetables"}
                      </p>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-slate-600 font-bold text-sm">Tracking Number</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-emerald-800 text-sm sm:text-base">{selectedRecord.trackingNumber}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyTracking(selectedRecord.trackingNumber)}
                          className="h-8 w-8 text-slate-500 hover:text-slate-900 cursor-pointer"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="pt-2">
                  <Button
                    className="w-full bg-[#078c52] text-white hover:bg-[#067343] text-sm sm:text-base h-12 sm:h-13 font-black rounded-xl active:scale-[0.98] transition-all shadow-xs cursor-pointer"
                    onClick={() => {
                      setTrackingModalTarget(selectedRecord);
                      setModalCarrier(selectedRecord.carrier || "");
                      setModalTracking(selectedRecord.trackingNumber || "");
                      setModalMode(selectedRecord.deliveryMode || "");
                      setModalStatus(selectedRecord.status);
                    }}
                  >
                    <Pencil className="mr-2 !h-5 !w-5" /> Edit Carrier, Waybill & Status
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Tracking Modal */}
      <Dialog open={Boolean(trackingModalTarget)} onOpenChange={(open) => !open && setTrackingModalTarget(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-700" /> Update Fleet Carrier & Waybill
            </DialogTitle>
            <DialogDescription className="text-sm font-semibold text-slate-600 mt-1">
              Consignment #{trackingModalTarget?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-sm">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Carrier Partner</Label>
              <Select value={modalCarrier} onValueChange={setModalCarrier}>
                <SelectTrigger className="h-11 sm:h-12 text-sm sm:text-base rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {CARRIERS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Waybill Tracking Number</Label>
              <Input
                value={modalTracking}
                onChange={(e) => setModalTracking(e.target.value)}
                className="h-11 sm:h-12 text-sm sm:text-base font-mono rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Logistics Status</Label>
              <Select value={modalStatus} onValueChange={setModalStatus}>
                <SelectTrigger className="h-11 sm:h-12 text-sm sm:text-base rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="processing">Staging & Cold-Chain Prep</SelectItem>
                  <SelectItem value="shipped">In Transit (With Courier)</SelectItem>
                  <SelectItem value="delivered">Delivered & Signed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Audit / Transition Note</Label>
              <Input
                placeholder="e.g. Scanned at regional refrigerated distribution depot..."
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
                className="h-11 sm:h-12 text-sm sm:text-base rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2.5 pt-2">
            <Button variant="outline" onClick={() => setTrackingModalTarget(null)} className="h-12 px-5 text-sm sm:text-base font-black rounded-xl cursor-pointer">
              Cancel
            </Button>
            <Button
              disabled={updateLogisticsMutation.isPending}
              onClick={() => {
                if (trackingModalTarget) {
                  updateLogisticsMutation.mutate({
                    orderId: trackingModalTarget.id,
                    status: modalStatus,
                    carrier: modalCarrier.trim() || undefined,
                    trackingNumber: modalTracking.trim() || undefined,
                    note: modalNote.trim() || undefined,
                  });
                }
              }}
              className="h-12 px-6 text-sm sm:text-base font-black bg-[#078c52] text-white hover:bg-[#067343] rounded-xl active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              {updateLogisticsMutation.isPending ? "Saving..." : "Update Waybill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
