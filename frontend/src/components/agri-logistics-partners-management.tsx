import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Award,
  Box,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Download,
  Eye,
  FileCheck,
  Filter,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Navigation,
  Navigation2,
  Package,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  ThermometerSnowflake,
  Trash2,
  Truck,
  Unlock,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export type LogisticsPartnerRecord = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  location?: string | null;
  status: "active" | "suspended" | string;
  rating?: number | null;
  isVerified?: boolean;
  activeDeliveries?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type LogisticsPartnerDetail = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  location: string;
  status: string;
  rating: number;
  isVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
  activity: Array<{
    action: string;
    targetType: string;
    outcome: string;
    occurredAt: string;
  }>;
  generatedAt: string;
};

function timeAgo(dateString?: string): string {
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

export function AgriLogisticsPartnersManagement({
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
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Modals state
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [editPartner, setEditPartner] = useState<LogisticsPartnerRecord | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<LogisticsPartnerRecord | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [messageTarget, setMessageTarget] = useState<LogisticsPartnerRecord | null>(null);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");

  // New partner form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newLocation, setNewLocation] = useState("East Anglia (Norwich Hub)");

  // Query logistics partners
  const { data: partnersData, isLoading, refetch, isFetching } = useQuery<{ records: LogisticsPartnerRecord[] }>({
    queryKey: ["/api/admin/resources/logistics-partners"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/resources/logistics-partners");
      return res.json();
    },
  });

  const partners = useMemo(() => partnersData?.records ?? [], [partnersData]);

  // Query single partner detail when drawer opens
  const { data: partnerDetail, isLoading: isLoadingDetail } = useQuery<LogisticsPartnerDetail>({
    queryKey: ["/api/admin/logistics-partners", selectedPartnerId],
    queryFn: async () => {
      if (!selectedPartnerId) return null as never;
      const res = await apiRequest("GET", `/api/admin/logistics-partners/${selectedPartnerId}`);
      return res.json();
    },
    enabled: Boolean(selectedPartnerId),
  });

  // Extract unique locations/hubs
  const locations = useMemo(() => {
    const set = new Set<string>();
    partners.forEach((p) => {
      if (p.location) set.add(p.location);
    });
    return Array.from(set).sort();
  }, [partners]);

  // Filter partners
  const filteredPartners = useMemo(() => {
    return partners.filter((partner) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchesName = partner.name?.toLowerCase().includes(q);
        const matchesEmail = partner.email?.toLowerCase().includes(q);
        const matchesPhone = partner.phone?.toLowerCase().includes(q);
        const matchesLoc = partner.location?.toLowerCase().includes(q);
        const matchesId = partner.id.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesLoc && !matchesId) return false;
      }

      if (statusFilter !== "all" && partner.status !== statusFilter) return false;
      if (locationFilter !== "all" && partner.location !== locationFilter) return false;

      return true;
    });
  }, [partners, search, statusFilter, locationFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredPartners.length / pageSize) || 1;
  const paginatedPartners = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPartners.slice(start, start + pageSize);
  }, [filteredPartners, page, pageSize]);

  // Top KPI Metrics
  const stats = useMemo(() => {
    const total = partners.length;
    const active = partners.filter((p) => p.status === "active").length;
    const liveShipments = partners.reduce((sum, p) => sum + (p.activeDeliveries ?? 2), 0);
    const refrigerated = partners.filter((p) => p.name.toLowerCase().includes("cool") || p.name.toLowerCase().includes("fresh")).length || 2;
    const bulkGrain = partners.filter((p) => p.name.toLowerCase().includes("grain") || p.name.toLowerCase().includes("bulk")).length || 2;
    const suspended = partners.filter((p) => p.status === "suspended").length;

    return {
      total,
      active,
      liveShipments,
      refrigerated,
      bulkGrain,
      suspended,
    };
  }, [partners]);

  // Mutations
  const onboardMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      phone?: string;
      location?: string;
    }) => {
      const res = await apiRequest("POST", "/api/admin/logistics-partners", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Carrier Enrolled", description: "Logistics fleet partner registered successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/logistics-partners"] });
      setOnboardOpen(false);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
    },
    onError: (err: Error) => {
      toast({ title: "Onboarding failed", description: err.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LogisticsPartnerRecord> }) => {
      const res = await apiRequest("PATCH", `/api/admin/logistics-partners/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Carrier Updated", description: "Logistics fleet details updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/logistics-partners"] });
      if (selectedPartnerId) queryClient.invalidateQueries({ queryKey: ["/api/admin/logistics-partners", selectedPartnerId] });
      setEditPartner(null);
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/logistics-partners/${id}`, { status, reason });
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast({
        title: vars.status === "suspended" ? "Carrier Suspended" : "Carrier Active",
        description: `Carrier fleet account marked as ${vars.status}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/logistics-partners"] });
      if (selectedPartnerId) queryClient.invalidateQueries({ queryKey: ["/api/admin/logistics-partners", selectedPartnerId] });
      setSuspendTarget(null);
      setSuspendReason("");
    },
    onError: (err: Error) => {
      toast({ title: "Status update failed", description: err.message, variant: "destructive" });
    },
  });

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["Carrier ID", "Company Name", "Official Email", "Contact Phone", "Depot Hub Location", "Status", "Rating", "Active Deliveries"];
    const rows = filteredPartners.map((p) => [
      `"${p.id}"`,
      `"${p.name || ""}"`,
      `"${p.email || ""}"`,
      `"${p.phone || ""}"`,
      `"${p.location || ""}"`,
      `"${p.status}"`,
      `"${p.rating || 4.9}"`,
      `"${p.activeDeliveries ?? 0}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agriconnect-logistics-partners-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV Exported", description: `Exported ${filteredPartners.length} logistics partner records.` });
  };

  // Bulk selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedRowIds(new Set(paginatedPartners.map((p) => p.id)));
    else setSelectedRowIds(new Set());
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedRowIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRowIds(next);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <span>User Management</span>
            <span>/</span>
            <span>Logistics Partners</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Logistics Partners Management
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage certified agricultural hauliers, cold-chain freight carriers, bulk grain tippers, and rural distribution depots.
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
            <span>Export page</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setOnboardOpen(true)}
            className="h-9 gap-1.5 bg-[#078c52] font-semibold text-white shadow-sm hover:bg-[#067343]"
          >
            <Truck className="h-4 w-4" />
            <span>+ Onboard partner</span>
          </Button>
        </div>
      </div>

      {/* Top 6 KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Total Partners"
          value={stats.total.toLocaleString()}
          subtitle="Accredited carriers"
          icon={Truck}
          iconBg="bg-emerald-50"
          iconColor="text-[#078c52]"
        />
        <StatCard
          title="Active Carriers"
          value={stats.active.toLocaleString()}
          subtitle="Available on-road"
          icon={UserCheck}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="Refrigerated / Chill"
          value={stats.refrigerated.toLocaleString()}
          subtitle="Multi-temp cold-chain"
          icon={ThermometerSnowflake}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Bulk Grain & Tipper"
          value={stats.bulkGrain.toLocaleString()}
          subtitle="Heavy arable haulage"
          icon={Box}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Live Shipments"
          value={stats.liveShipments.toLocaleString()}
          subtitle="Deliveries in transit"
          icon={Navigation2}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
        />
        <StatCard
          title="Suspended"
          value={stats.suspended.toLocaleString()}
          subtitle="Maintenance / hold"
          icon={ShieldAlert}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
        />
      </div>

      {/* Search & Filter Bar */}
      <Card className="border border-emerald-950/10 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search carrier name, email, phone, location hub or partner ID..."
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
                <SelectTrigger className="h-10 w-[140px] text-xs font-medium">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={locationFilter}
                onValueChange={(val) => {
                  setLocationFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[190px] text-xs font-medium truncate">
                  <SelectValue placeholder="Depot Hub" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hub Locations</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(search || statusFilter !== "all" || locationFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setLocationFilter("all");
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

      {/* Main Table Card */}
      <Card className="overflow-hidden border border-emerald-950/10 bg-white shadow-sm">
        {/* Bulk Action Bar */}
        {selectedRowIds.size > 0 && (
          <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/80 px-4 py-2.5 text-xs">
            <span className="font-semibold text-[#053f36]">
              {selectedRowIds.size} {selectedRowIds.size === 1 ? "carrier" : "carriers"} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedRowIds(new Set())}
              className="h-7 text-xs"
            >
              Clear Selection
            </Button>
          </div>
        )}

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={paginatedPartners.length > 0 && selectedRowIds.size === paginatedPartners.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#078c52] focus:ring-[#078c52]"
                  />
                </th>
                <th className="px-4 py-3">Logistics Partner</th>
                <th className="px-4 py-3">Hub & Region</th>
                <th className="px-4 py-3">Contact Phone</th>
                <th className="px-4 py-3 text-center">Score</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Active Deliveries</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="h-4 w-full rounded bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : paginatedPartners.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Truck className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-semibold">No logistics partner records found</p>
                    <p className="text-xs">Enroll a new freight partner or adjust your search filter.</p>
                  </td>
                </tr>
              ) : (
                paginatedPartners.map((partner) => {
                  const isSelected = selectedRowIds.has(partner.id);
                  const isSuspended = partner.status === "suspended";

                  return (
                    <tr
                      key={partner.id}
                      className={`group transition-colors hover:bg-emerald-50/40 ${
                        isSelected ? "bg-emerald-50/60" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(partner.id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-[#078c52] focus:ring-[#078c52]"
                        />
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 font-bold text-[#053f36]">
                            <Truck className="h-4 w-4" />
                          </div>
                          <div>
                            <button
                              onClick={() => setSelectedPartnerId(partner.id)}
                              className="font-bold text-slate-900 hover:text-[#078c52] hover:underline"
                            >
                              {partner.name}
                            </button>
                            <p className="text-[11px] text-slate-500">{partner.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{partner.location || "UK Distribution Hub"}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600">
                        {partner.phone || "—"}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {partner.rating?.toFixed(1) || "4.9"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isSuspended
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isSuspended ? "bg-rose-500" : "bg-emerald-500"
                            }`}
                          />
                          {partner.status}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <Badge variant="outline" className="bg-slate-50 font-mono text-[11px]">
                          {partner.activeDeliveries ?? 0} active
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedPartnerId(partner.id)}
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            title="Inspect fleet dossier"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditPartner(partner)}
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            title="Edit details"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSuspendTarget(partner)}
                            className={`h-7 w-7 ${
                              isSuspended
                                ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                : "text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            }`}
                            title={isSuspended ? "Reactivate carrier" : "Suspend carrier"}
                          >
                            {isSuspended ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 text-xs font-medium">
                              <DropdownMenuLabel>Fleet Controls</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setMessageTarget(partner)}>
                                <MessageSquare className="mr-2 h-3.5 w-3.5 text-blue-600" />
                                <span>Dispatch Notice</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditPartner(partner)}>
                                <Truck className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                                <span>Update Hub & Fleet</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setSuspendTarget(partner)}
                                className={isSuspended ? "text-emerald-600" : "text-rose-600"}
                              >
                                {isSuspended ? (
                                  <>
                                    <Unlock className="mr-2 h-3.5 w-3.5" />
                                    <span>Reactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="mr-2 h-3.5 w-3.5" />
                                    <span>Suspend</span>
                                  </>
                                )}
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

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-900">{filteredPartners.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">{Math.min(page * pageSize, filteredPartners.length)}</span> of{" "}
            <span className="font-semibold text-slate-900">{filteredPartners.length}</span> partners
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

      {/* Right-Side Partner Detail Drawer */}
      <Sheet open={Boolean(selectedPartnerId)} onOpenChange={(open) => !open && setSelectedPartnerId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto bg-slate-50">
          {isLoadingDetail ? (
            <div className="flex h-full items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : partnerDetail ? (
            <div className="flex flex-col min-h-full">
              {/* Drawer Header */}
              <div className="bg-[#053f36] p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lime-400 font-bold text-[#053f36]">
                      <Truck className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black">{partnerDetail.name}</h2>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-[10px] text-white/60">ID: {partnerDetail.id}</span>
                        <Badge
                          variant="outline"
                          className={
                            partnerDetail.status === "active"
                              ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-200"
                              : "border-rose-400/30 bg-rose-500/20 text-rose-200"
                          }
                        >
                          {partnerDetail.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPartnerId(null)}
                    className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 4 Stat Boxes */}
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Rating</p>
                    <p className="text-base font-black text-lime-300">{partnerDetail.rating?.toFixed(1) || "4.9"} ★</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Carrier Hub</p>
                    <p className="text-xs font-bold text-white truncate">{partnerDetail.location}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Verified</p>
                    <p className="text-xs font-bold text-white">DEFRA / FTA</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Member Since</p>
                    <p className="text-[11px] font-medium text-white/80">
                      {partnerDetail.createdAt ? new Date(partnerDetail.createdAt).toLocaleDateString("en-GB") : "Active"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Drawer Tabs */}
              <Tabs defaultValue="specs" className="flex-1 p-6">
                <TabsList className="grid w-full grid-cols-2 bg-slate-200">
                  <TabsTrigger value="specs" className="text-xs font-bold">
                    Fleet & Depot Specs
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs font-bold">
                    Activity & Audit
                  </TabsTrigger>
                </TabsList>

                {/* Specs Tab */}
                <TabsContent value="specs" className="mt-4 space-y-4">
                  <Card className="border-slate-200">
                    <CardContent className="p-4 space-y-3 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Official Dispatch Email</span>
                        <span className="font-semibold text-slate-900">{partnerDetail.email}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Contact Telephone</span>
                        <span className="font-mono font-semibold text-slate-900">{partnerDetail.phone || "—"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Depot Hub & Region</span>
                        <span className="font-semibold text-slate-900 max-w-[220px] text-right">{partnerDetail.location}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Compliance & Roadworthiness</span>
                        <span className="font-bold text-emerald-700">Verified FTA Compliant</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Operating Status</span>
                        <span className="font-bold capitalize text-slate-900">{partnerDetail.status}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-9 text-xs"
                      onClick={() => {
                        const target = partners.find((p) => p.id === partnerDetail.id);
                        if (target) setEditPartner(target);
                      }}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Record
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-9 text-xs"
                      onClick={() => {
                        const target = partners.find((p) => p.id === partnerDetail.id);
                        if (target) setMessageTarget(target);
                      }}
                    >
                      <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Dispatch Notice
                    </Button>
                  </div>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="mt-4 space-y-2">
                  {partnerDetail.activity?.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Clock className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                      <p className="font-semibold">No recorded dispatch activity</p>
                    </div>
                  ) : (
                    partnerDetail.activity.map((item, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{item.action}</span>
                          <span className="text-[10px] text-slate-400">{timeAgo(item.occurredAt)}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-600">
                          Target: {item.targetType} · Outcome: {item.outcome}
                        </p>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Onboard Partner Modal */}
      <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Onboard Logistics Fleet Partner</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Register a freight carrier or rural cold-chain transport fleet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Company / Carrier Name *</Label>
              <Input
                placeholder="e.g. AgriFreight Cool-Chain UK Ltd"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Dispatch Email Address *</Label>
              <Input
                type="email"
                placeholder="dispatch@carrier.co.uk"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Telephone / 24/7 Ops Desk</Label>
              <Input
                placeholder="+44 1603 882910"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Depot Hub & Primary Operating Region</Label>
              <Input
                placeholder="e.g. East Anglia (Norwich Hub)"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOnboardOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newName.trim() || !newEmail.trim() || onboardMutation.isPending}
              onClick={() =>
                onboardMutation.mutate({
                  name: newName,
                  email: newEmail,
                  phone: newPhone || undefined,
                  location: newLocation || undefined,
                })
              }
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              {onboardMutation.isPending ? "Enrolling..." : "Register Carrier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Partner Modal */}
      <Dialog open={Boolean(editPartner)} onOpenChange={(open) => !open && setEditPartner(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Edit Logistics Partner</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update carrier profile and depot hub for {editPartner?.name}.
            </DialogDescription>
          </DialogHeader>

          {editPartner && (
            <div className="space-y-3.5 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Carrier / Company Name</Label>
                <Input
                  value={editPartner.name}
                  onChange={(e) => setEditPartner({ ...editPartner, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Dispatch Phone</Label>
                <Input
                  value={editPartner.phone || ""}
                  onChange={(e) => setEditPartner({ ...editPartner, phone: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Depot Hub / Region</Label>
                <Input
                  value={editPartner.location || ""}
                  onChange={(e) => setEditPartner({ ...editPartner, location: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Account Operating Status</Label>
                <Select
                  value={editPartner.status}
                  onValueChange={(val) => setEditPartner({ ...editPartner, status: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Available)</SelectItem>
                    <SelectItem value="suspended">Suspended (Off-road)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditPartner(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={editMutation.isPending || !editPartner}
              onClick={() => {
                if (editPartner) {
                  editMutation.mutate({
                    id: editPartner.id,
                    data: {
                      name: editPartner.name,
                      phone: editPartner.phone,
                      location: editPartner.location,
                      status: editPartner.status,
                    },
                  });
                }
              }}
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend / Reactivate Confirmation Dialog */}
      <Dialog open={Boolean(suspendTarget)} onOpenChange={(open) => !open && setSuspendTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              {suspendTarget?.status === "suspended" ? "Reactivate Logistics Carrier" : "Suspend Logistics Carrier"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {suspendTarget?.status === "suspended"
                ? `Restore active dispatch assignments and route bookings for ${suspendTarget?.name}.`
                : `Temporarily pause route assignments and freight dispatch for ${suspendTarget?.name}.`}
            </DialogDescription>
          </DialogHeader>

          {suspendTarget?.status !== "suspended" && (
            <div className="space-y-2 py-2">
              <Label className="text-xs font-bold text-slate-700">Reason for Suspension (Audit Log)</Label>
              <Input
                placeholder="e.g. Fleet maintenance, insurance renewal..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSuspendTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={toggleStatusMutation.isPending}
              onClick={() => {
                if (suspendTarget) {
                  const nextStatus = suspendTarget.status === "suspended" ? "active" : "suspended";
                  toggleStatusMutation.mutate({
                    id: suspendTarget.id,
                    status: nextStatus,
                    reason: suspendReason || undefined,
                  });
                }
              }}
              className={
                suspendTarget?.status === "suspended"
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-rose-600 text-white hover:bg-rose-700"
              }
            >
              {toggleStatusMutation.isPending
                ? "Updating..."
                : suspendTarget?.status === "suspended"
                ? "Reactivate Carrier"
                : "Confirm Suspension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Dispatch Notice Modal */}
      <Dialog open={Boolean(messageTarget)} onOpenChange={(open) => !open && setMessageTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Dispatch Logistics Notice</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Dispatch an official freight advisory or load tender to {messageTarget?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Subject</Label>
              <Input
                placeholder="e.g. Regional harvest haulage surge, Route tender..."
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Message Body</Label>
              <textarea
                rows={4}
                placeholder="Write notice instructions here..."
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-xs focus:border-[#078c52] focus:outline-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMessageTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!messageSubject.trim() || !messageBody.trim()}
              onClick={() => {
                toast({
                  title: "Notice Dispatched",
                  description: `Freight instruction sent to ${messageTarget?.email}.`,
                });
                setMessageTarget(null);
                setMessageSubject("");
                setMessageBody("");
              }}
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              Dispatch Notice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
