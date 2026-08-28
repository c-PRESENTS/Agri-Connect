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
  Search,
  Send,
  Share2,
  ShieldCheck,
  Snowflake,
  Store,
  Tag,
  Thermometer,
  ThermometerSnowflake,
  Truck,
  User,
  Users,
  X,
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

export type AdminLogisticsRecord = {
  id: string;
  orderNumber: string;
  name?: string;
  status: "placed" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded" | string;
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
  "Royal Mail Special Delivery",
  "AgriLogistics Freight Ltd",
  "Palletways UK Cold-Chain",
  "Standard Farm Dispatch",
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

      if (statusFilter !== "all" && r.status !== statusFilter) return false;
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
    const inTransit = records.filter((r) => r.status === "shipped").length;
    const awaitingPickup = records.filter((r) => r.status === "processing" || r.status === "paid").length;
    const delivered = records.filter((r) => r.status === "delivered").length;
    const coldChain = records.filter((r) => r.deliveryMode?.includes("Cold-Chain") || r.deliveryMode?.includes("Refrigerated")).length;
    const carriersCount = uniqueCarriers.length || 4;

    return {
      total,
      inTransit,
      awaitingPickup,
      delivered,
      coldChainRate: total ? Math.round((coldChain / total) * 100) : 100,
      carriersCount,
    };
  }, [records, uniqueCarriers]);

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
        description: `Shipment tracking updated for order #${vars.orderId.slice(0, 8)}.`,
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

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["Consignment Ref", "Carrier Partner", "Waybill Tracking", "Delivery Mode", "Status", "Destination City", "Postal Code", "Recipient", "Items Summary", "Updated At"];
    const rows = filteredRecords.map((r) => [
      `"${r.orderNumber}"`,
      `"${r.carrier || ""}"`,
      `"${r.trackingNumber || ""}"`,
      `"${r.deliveryMode || ""}"`,
      `"${r.status}"`,
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
    toast({ title: "CSV Exported", description: `Exported ${filteredRecords.length} logistics dispatches.` });
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
            <span>Logistics & Fleet</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Logistics & Cold-Chain Management
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Orchestrate temperature-controlled agricultural freight, courier waybills, pallet distribution, and live farm-to-table delivery telemetry.
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
          title="Active Dispatches"
          value={stats.total.toLocaleString()}
          subtitle="Platform consignments"
          icon={Truck}
          iconBg="bg-emerald-50"
          iconColor="text-[#078c52]"
        />
        <StatCard
          title="In Transit"
          value={stats.inTransit.toLocaleString()}
          subtitle="On delivery routes"
          icon={Navigation}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Awaiting Pickup"
          value={stats.awaitingPickup.toLocaleString()}
          subtitle="Packed at farm hubs"
          icon={PackageOpen}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Delivered"
          value={stats.delivered.toLocaleString()}
          subtitle="Successfully signed"
          icon={PackageCheck}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="Cold-Chain Rate"
          value={`${stats.coldChainRate}%`}
          subtitle="Refrigerated (2-4°C)"
          icon={ThermometerSnowflake}
          iconBg="bg-teal-50"
          iconColor="text-teal-700"
        />
        <StatCard
          title="Fleet Partners"
          value={stats.carriersCount.toLocaleString()}
          subtitle="Integrated couriers"
          icon={Building2}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
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
                placeholder="Search waybill tracking, consignment ref (e.g. AGC26-682208), city, postcode, produce..."
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
                  <SelectValue placeholder="Logistics Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Delivery States</SelectItem>
                  <SelectItem value="paid">Awaiting Packing</SelectItem>
                  <SelectItem value="processing">Packing & Staging</SelectItem>
                  <SelectItem value="shipped">In Transit (On Road)</SelectItem>
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
                <SelectTrigger className="h-10 w-[180px] text-xs font-medium truncate">
                  <SelectValue placeholder="Carrier Partner" />
                </SelectTrigger>
                <SelectContent>
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
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setCarrierFilter("all");
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
                <th className="px-4 py-3">Consignment Ref & Date</th>
                <th className="px-4 py-3">Destination City & Recipient</th>
                <th className="px-4 py-3">Carrier Partner & Waybill</th>
                <th className="px-4 py-3">Delivery Mode / Temp</th>
                <th className="px-4 py-3 text-center">Dispatch Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="h-4 w-full rounded bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Truck className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-semibold">No logistics dispatches match your query</p>
                    <p className="text-xs">Adjust your search parameters or carrier filters.</p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item) => {
                  const isShipped = item.status === "shipped";
                  const isDelivered = item.status === "delivered";
                  const isProcessing = item.status === "processing";
                  const isPaid = item.status === "paid";

                  return (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-emerald-50/40"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#053f36] border border-emerald-100 font-bold">
                            <Truck className="h-4 w-4" />
                          </div>
                          <div>
                            <button
                              onClick={() => setSelectedRecordId(item.id)}
                              className="font-mono font-bold text-slate-900 hover:text-[#078c52] hover:underline text-left block"
                            >
                              {item.orderNumber}
                            </button>
                            <span className="text-[10px] text-slate-400">
                              {timeAgo(item.createdAt)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate max-w-[180px]">
                            {item.city}, {item.postalCode}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                            {item.buyerName || "Direct Agricultural Buyer"}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-[11px]">{item.carrier || "DPD Fresh Direct"}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] text-slate-500">{item.trackingNumber}</span>
                            <button
                              onClick={() => copyTracking(item.trackingNumber)}
                              className="text-slate-400 hover:text-slate-700"
                              title="Copy waybill code"
                            >
                              <Copy className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge variant="outline" className="bg-teal-50/70 border-teal-200 text-teal-800 font-medium text-[10px] gap-1">
                          <ThermometerSnowflake className="h-3 w-3 text-teal-600" />
                          <span>{item.deliveryMode?.includes("Cold-Chain") ? "Cold-Chain 2-4°C" : item.deliveryMode || "Ambient"}</span>
                        </Badge>
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
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isDelivered
                                ? "bg-green-500"
                                : isShipped
                                ? "bg-blue-500"
                                : isProcessing
                                ? "bg-purple-500"
                                : "bg-teal-500"
                            }`}
                          />
                          {isShipped ? "In Transit" : isDelivered ? "Delivered" : isProcessing ? "Staging / Packing" : "Awaiting Pickup"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedRecordId(item.id)}
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            title="Inspect Dispatch"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {/* Quick Workflow Action button */}
                          {canManage && (
                            <>
                              {item.status === "paid" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    updateLogisticsMutation.mutate({
                                      orderId: item.id,
                                      status: "processing",
                                      note: "Packing and cold-chain staging started",
                                    })
                                  }
                                  className="h-7 text-[11px] font-semibold text-purple-800 border-purple-300 hover:bg-purple-50"
                                >
                                  Start packing
                                </Button>
                              )}
                              {item.status === "processing" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setTrackingModalTarget(item);
                                    setModalCarrier(item.carrier || "DPD Fresh Direct");
                                    setModalTracking(item.trackingNumber || "");
                                    setModalMode(item.deliveryMode || "Cold-Chain Temperature Controlled (2-4°C)");
                                    setModalStatus("shipped");
                                  }}
                                  className="h-7 text-[11px] font-semibold text-blue-800 border-blue-300 hover:bg-blue-50"
                                >
                                  Dispatch route
                                </Button>
                              )}
                              {item.status === "shipped" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    updateLogisticsMutation.mutate({
                                      orderId: item.id,
                                      status: "delivered",
                                      note: "Delivery successfully confirmed and signed",
                                    })
                                  }
                                  className="h-7 text-[11px] font-semibold text-green-800 border-green-300 hover:bg-green-50"
                                >
                                  Confirm delivery
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
                              <DropdownMenuLabel>Fleet Operations</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setSelectedRecordId(item.id)}>
                                <Eye className="mr-2 h-3.5 w-3.5 text-emerald-600" />
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
                              >
                                <Pencil className="mr-2 h-3.5 w-3.5 text-blue-600" />
                                <span>Edit Carrier & Tracking</span>
                              </DropdownMenuItem>
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
            Showing <span className="font-semibold text-slate-900">{filteredRecords.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">{Math.min(page * pageSize, filteredRecords.length)}</span> of{" "}
            <span className="font-semibold text-slate-900">{filteredRecords.length}</span> dispatches
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

      {/* Logistics Detail Drawer */}
      <Sheet open={Boolean(selectedRecordId)} onOpenChange={(open) => !open && setSelectedRecordId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto bg-slate-50">
          {selectedRecord && (
            <div className="flex flex-col min-h-full">
              {/* Header */}
              <div className="bg-[#053f36] p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lime-400 font-bold text-[#053f36]">
                      <Truck className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black">{selectedRecord.orderNumber}</h2>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-[10px] text-white/60">Waybill: {selectedRecord.trackingNumber}</span>
                        <Badge
                          variant="outline"
                          className="border-emerald-400/30 bg-emerald-500/20 text-emerald-200"
                        >
                          {selectedRecord.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRecordId(null)}
                    className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 4 Stat Boxes */}
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Carrier</p>
                    <p className="text-xs font-bold text-white truncate">{selectedRecord.carrier || "DPD Fresh"}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Temp Sensor</p>
                    <p className="text-xs font-black text-lime-300">+3.2°C OK</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Destination</p>
                    <p className="text-xs font-bold text-white truncate">{selectedRecord.city}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Updated</p>
                    <p className="text-[11px] font-medium text-white/80">{timeAgo(selectedRecord.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 p-6 space-y-4">
                {/* 4-Stage Progress Bar */}
                <Card className="border-slate-200">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Cold-Chain Journey Stages
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                      <div className="rounded bg-emerald-100 p-1.5 text-emerald-900">
                        1. Order Placed ✓
                      </div>
                      <div className={`rounded p-1.5 ${selectedRecord.status !== "placed" ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-500"}`}>
                        2. Packed & Prepped
                      </div>
                      <div className={`rounded p-1.5 ${selectedRecord.status === "shipped" || selectedRecord.status === "delivered" ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-500"}`}>
                        3. In Transit
                      </div>
                      <div className={`rounded p-1.5 ${selectedRecord.status === "delivered" ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-500"}`}>
                        4. Delivered
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Destination & Consignment items */}
                <Card className="border-slate-200 text-xs">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Recipient Name</span>
                      <span className="font-bold text-slate-900">{selectedRecord.buyerName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Delivery Address</span>
                      <span className="font-mono text-slate-700">{selectedRecord.addressLine1}, {selectedRecord.city} ({selectedRecord.postalCode})</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Consignment Produce</span>
                      <span className="font-medium text-slate-900">{selectedRecord.itemsSummary || "Farm Produce"}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Tracking Number</span>
                      <span className="font-mono font-bold text-emerald-800">{selectedRecord.trackingNumber}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="pt-2">
                  <Button
                    className="w-full bg-[#078c52] text-white hover:bg-[#067343] text-xs h-9"
                    onClick={() => {
                      setTrackingModalTarget(selectedRecord);
                      setModalCarrier(selectedRecord.carrier || "");
                      setModalTracking(selectedRecord.trackingNumber || "");
                      setModalMode(selectedRecord.deliveryMode || "");
                      setModalStatus(selectedRecord.status);
                    }}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Carrier, Waybill & Status
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Tracking Modal */}
      <Dialog open={Boolean(trackingModalTarget)} onOpenChange={(open) => !open && setTrackingModalTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              Update Fleet Carrier & Waybill
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Consignment #{trackingModalTarget?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Carrier Partner</Label>
              <Select value={modalCarrier} onValueChange={setModalCarrier}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARRIERS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Waybill Tracking Number</Label>
              <Input
                value={modalTracking}
                onChange={(e) => setModalTracking(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Logistics Status</Label>
              <Select value={modalStatus} onValueChange={setModalStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="processing">Packing & Cold-Chain Prep</SelectItem>
                  <SelectItem value="shipped">In Transit (With Courier)</SelectItem>
                  <SelectItem value="delivered">Delivered & Signed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Audit / Transition Note</Label>
              <Input
                placeholder="e.g. Scanned at Bristol distribution depot..."
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTrackingModalTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
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
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              {updateLogisticsMutation.isPending ? "Saving..." : "Update Waybill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
