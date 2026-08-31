import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Award,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileCheck,
  Filter,
  Flame,
  Globe,
  Handshake,
  Layers,
  Leaf,
  LocateFixed,
  Map,
  MapPin,
  MapPinned,
  MoreHorizontal,
  Navigation,
  Package,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Truck,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export type AdminRegion = {
  id: string;
  name: string;
  code: string;
  country: string;
  type: string;
  active: boolean;
  status: "active" | "inactive" | string;
  latitude?: number | null;
  longitude?: number | null;
  activeSellers?: number;
  productsCount?: number;
  organisationCount?: number;
  updatedAt: string;
};

export type RegionDetailResponse = {
  region: AdminRegion & {
    createdAt?: string | null;
  };
  sellers: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    accountStatus: string;
    canPublish: boolean;
    status: string;
  }>;
  organisations: Array<{
    id: string;
    name: string;
    slug: string;
    officialEmail: string;
    status: string;
    canApproveSellers: boolean;
    canApproveProducts: boolean;
  }>;
  activity: Array<{
    id: string;
    action: string;
    outcome: string;
    occurredAt: string;
    metadata?: Record<string, unknown>;
  }>;
};

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

export function AgriRegionsManagement({
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
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createCode, setCreateCode] = useState("");
  const [createCountryCode, setCreateCountryCode] = useState("GB");
  const [createType, setCreateType] = useState("market_zone");
  const [createLat, setCreateLat] = useState("");
  const [createLng, setCreateLng] = useState("");

  const [editTarget, setEditTarget] = useState<AdminRegion | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editType, setEditType] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");

  // Query regions list
  const { data: regionsData, isLoading, refetch, isFetching } = useQuery<{
    records: AdminRegion[];
    generatedAt: string;
  }>({
    queryKey: ["/api/admin/control-centre/resources/regions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/control-centre/resources/regions");
      return res.json();
    },
  });

  const regions = useMemo(() => regionsData?.records ?? [], [regionsData]);

  // Query single region detail
  const { data: detailData, isLoading: isLoadingDetail } = useQuery<RegionDetailResponse>({
    queryKey: ["/api/admin/regions", selectedRegionId],
    queryFn: async () => {
      if (!selectedRegionId) return null as never;
      const res = await apiRequest("GET", `/api/admin/regions/${selectedRegionId}`);
      return res.json();
    },
    enabled: Boolean(selectedRegionId),
  });

  // Extract unique types
  const types = useMemo(() => {
    const set = new Set<string>();
    regions.forEach((r) => {
      if (r.type) set.add(r.type);
    });
    return Array.from(set).sort();
  }, [regions]);

  // Filter regions
  const filteredRegions = useMemo(() => {
    return regions.filter((r) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchName = r.name.toLowerCase().includes(q);
        const matchCode = r.code.toLowerCase().includes(q);
        const matchId = r.id.toLowerCase().includes(q);
        const matchType = r.type?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchId && !matchType) return false;
      }

      if (statusFilter !== "all" && (r.status || (r.active ? "active" : "inactive")) !== statusFilter) return false;
      if (typeFilter !== "all" && r.type !== typeFilter) return false;

      return true;
    });
  }, [regions, search, statusFilter, typeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRegions.length / pageSize) || 1;
  const paginatedRegions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRegions.slice(start, start + pageSize);
  }, [filteredRegions, page, pageSize]);

  // KPI Metrics
  const stats = useMemo(() => {
    const total = regions.length;
    const active = regions.filter((r) => r.active || r.status === "active").length;
    const regionalHubs = regions.filter((r) => r.type === "regional_hub" || r.type === "logistics_hub" || r.type === "state").length;
    const marketZones = regions.filter((r) => r.type === "market_zone" || r.type === "city" || r.type === "country" || r.type === "district").length;
    const totalSellers = regions.reduce((sum, r) => sum + (r.activeSellers || 0), 0);
    const totalOrganisations = regions.reduce((sum, r) => sum + (r.organisationCount || 0), 0);

    return {
      total,
      active,
      regionalHubs,
      marketZones,
      totalSellers,
      totalOrganisations,
    };
  }, [regions]);

  // Mutations
  const createRegionMutation = useMutation({
    mutationFn: async (payload: unknown) => {
      const res = await apiRequest("POST", "/api/admin/regions", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Region Created", description: "Agricultural territory registered." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/control-centre/resources/regions"] });
      setCreateModalOpen(false);
      setCreateName("");
      setCreateCode("");
      setCreateLat("");
      setCreateLng("");
    },
    onError: (err: Error) => {
      toast({ title: "Creation failed", description: err.message, variant: "destructive" });
    },
  });

  const updateRegionMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: unknown }) => {
      const res = await apiRequest("PATCH", `/api/admin/regions/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Region Updated", description: "Market territory updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/control-centre/resources/regions"] });
      if (selectedRegionId) queryClient.invalidateQueries({ queryKey: ["/api/admin/regions", selectedRegionId] });
      setEditTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const toggleRegionStatusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/regions/${id}`, { active });
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast({
        title: vars.active ? "Region Activated" : "Region Deactivated",
        description: "Operating state updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/control-centre/resources/regions"] });
      if (selectedRegionId) queryClient.invalidateQueries({ queryKey: ["/api/admin/regions", selectedRegionId] });
    },
    onError: (err: Error) => {
      toast({ title: "Status update failed", description: err.message, variant: "destructive" });
    },
  });

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["Region ID", "Region Name", "Code", "Country", "Type", "Status", "Latitude", "Longitude", "Active Producers", "Products", "Partner Orgs"];
    const rows = filteredRegions.map((r) => [
      `"${r.id}"`,
      `"${r.name}"`,
      `"${r.code}"`,
      `"${r.country}"`,
      `"${r.type}"`,
      `"${r.active || r.status === "active" ? "Active" : "Inactive"}"`,
      `"${r.latitude ?? ""}"`,
      `"${r.longitude ?? ""}"`,
      `"${r.activeSellers || 0}"`,
      `"${r.productsCount || 0}"`,
      `"${r.organisationCount || 0}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agriconnect-market-regions-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV Exported", description: `Exported ${filteredRegions.length} market regions.` });
  };

  const canManage = permissions.includes("regions.manage") || permissions.includes("dashboard.view");

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <span>Management</span>
            <span>/</span>
            <span>Territory Operations</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Market Region & Territory Management
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage agricultural market zones, logistics distribution corridors, GPS hubs, and producer operating boundaries.
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

          {canManage && (
            <Button
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="h-9 gap-1.5 bg-[#078c52] font-semibold text-white shadow-sm hover:bg-[#067343]"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add Region</span>
            </Button>
          )}
        </div>
      </div>

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Market Regions"
          value={stats.total.toLocaleString()}
          subtitle="Operating territories"
          icon={MapPinned}
          iconBg="bg-emerald-50"
          iconColor="text-[#078c52]"
        />
        <StatCard
          title="Active Trading"
          value={stats.active.toLocaleString()}
          subtitle="Open for orders"
          icon={CheckCircle2}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="Logistics Hubs"
          value={stats.regionalHubs.toLocaleString()}
          subtitle="Freight terminals"
          icon={Truck}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Farming Zones"
          value={stats.marketZones.toLocaleString()}
          subtitle="Producer districts"
          icon={Leaf}
          iconBg="bg-lime-50"
          iconColor="text-lime-700"
        />
        <StatCard
          title="Active Sellers"
          value={stats.totalSellers.toLocaleString()}
          subtitle="Mapped farmers"
          icon={Users}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
        />
        <StatCard
          title="Partner Orgs"
          value={stats.totalOrganisations.toLocaleString()}
          subtitle="Regional delegators"
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
                placeholder="Search territory name, code (e.g. UK-ENG-CS), type or ID..."
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
                <SelectTrigger className="h-10 w-[150px] text-xs font-medium">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active (Open)</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={typeFilter}
                onValueChange={(val) => {
                  setTypeFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[170px] text-xs font-medium truncate">
                  <SelectValue placeholder="Territory Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Territory Types</SelectItem>
                  {types.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(search || statusFilter !== "all" || typeFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setTypeFilter("all");
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
                <th className="px-4 py-3">Region Name & Code</th>
                <th className="px-4 py-3">Territory Type</th>
                <th className="px-4 py-3 text-center">Country</th>
                <th className="px-4 py-3">GPS Coordinates</th>
                <th className="px-4 py-3 text-center">Active Producers</th>
                <th className="px-4 py-3 text-center">Products</th>
                <th className="px-4 py-3 text-center">Operating Status</th>
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
              ) : paginatedRegions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <MapPinned className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-semibold">No market regions match your query</p>
                    <p className="text-xs">Adjust your search parameters or register a new region.</p>
                  </td>
                </tr>
              ) : (
                paginatedRegions.map((region) => {
                  const isActive = region.active || region.status === "active";

                  return (
                    <tr
                      key={region.id}
                      className="group transition-colors hover:bg-emerald-50/40"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#053f36] border border-emerald-100 font-bold">
                            <MapPin className="h-4 w-4" />
                          </div>
                          <div>
                            <button
                              onClick={() => setSelectedRegionId(region.id)}
                              className="font-bold text-slate-900 hover:text-[#078c52] hover:underline text-left block"
                            >
                              {region.name}
                            </button>
                            <span className="font-mono text-[10px] text-slate-400">
                              Code: {region.code} · ID: {region.id.slice(0, 12)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 capitalize font-medium text-[10px]">
                          {region.type?.replaceAll("_", " ")}
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {region.country === "GB" ? "🇬🇧 UK" : region.country}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600">
                        {region.latitude && region.longitude ? (
                          <span>
                            {region.latitude.toFixed(3)}°, {region.longitude.toFixed(3)}°
                          </span>
                        ) : (
                          <span className="text-slate-400">Not set</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {region.activeSellers || 0} farmers
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className="font-mono text-xs font-black text-emerald-800">
                          {region.productsCount || 0} listings
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedRegionId(region.id)}
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            title="Inspect territory"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditTarget(region);
                                setEditName(region.name);
                                setEditCode(region.code);
                                setEditType(region.type);
                                setEditActive(region.active || region.status === "active");
                                setEditLat(region.latitude?.toString() || "");
                                setEditLng(region.longitude?.toString() || "");
                              }}
                              className="h-7 w-7 text-slate-500 hover:text-slate-900"
                              title="Edit Region"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs font-medium">
                              <DropdownMenuLabel>Territory Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setSelectedRegionId(region.id)}>
                                <Eye className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                                <span>Inspect Hub Dossier</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditTarget(region);
                                  setEditName(region.name);
                                  setEditCode(region.code);
                                  setEditType(region.type);
                                  setEditActive(region.active || region.status === "active");
                                  setEditLat(region.latitude?.toString() || "");
                                  setEditLng(region.longitude?.toString() || "");
                                }}
                              >
                                <Pencil className="mr-2 h-3.5 w-3.5 text-blue-600" />
                                <span>Edit Coordinates & Code</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleRegionStatusMutation.mutate({
                                    id: region.id,
                                    active: !isActive,
                                  })
                                }
                                className={isActive ? "text-rose-600" : "text-emerald-600"}
                              >
                                <Power className="mr-2 h-3.5 w-3.5" />
                                <span>{isActive ? "Deactivate Territory" : "Activate Territory"}</span>
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
            Showing <span className="font-semibold text-slate-900">{filteredRegions.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">{Math.min(page * pageSize, filteredRegions.length)}</span> of{" "}
            <span className="font-semibold text-slate-900">{filteredRegions.length}</span> regions
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

      {/* Region Detail Drawer */}
      <Sheet open={Boolean(selectedRegionId)} onOpenChange={(open) => !open && setSelectedRegionId(null)}>
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
                      <MapPinned className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black">{detailData.region.name}</h2>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-[10px] text-white/60">Code: {detailData.region.code}</span>
                        <Badge
                          variant="outline"
                          className={
                            detailData.region.active
                              ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-200"
                              : "border-slate-400/30 bg-slate-500/20 text-slate-200"
                          }
                        >
                          {detailData.region.active ? "Active Hub" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRegionId(null)}
                    className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 4 Stat Boxes */}
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Producers</p>
                    <p className="text-sm font-black text-lime-300">{detailData.region.activeSellers || 0}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Products</p>
                    <p className="text-xs font-bold text-white">{detailData.region.productsCount || 0}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Partners</p>
                    <p className="text-xs font-bold text-emerald-300">{detailData.region.organisationCount || 0}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Coordinates</p>
                    <p className="text-[10px] font-mono text-white/80">
                      {detailData.region.latitude ? `${detailData.region.latitude.toFixed(2)}°, ${detailData.region.longitude?.toFixed(2)}°` : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sub-Tabs */}
              <Tabs defaultValue="sellers" className="flex-1 p-6">
                <TabsList className="grid w-full grid-cols-3 bg-slate-200">
                  <TabsTrigger value="sellers" className="text-xs font-bold">
                    Producers ({detailData.sellers?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="organisations" className="text-xs font-bold">
                    Partners ({detailData.organisations?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-xs font-bold">
                    Audit Trail
                  </TabsTrigger>
                </TabsList>

                {/* Sellers Tab */}
                <TabsContent value="sellers" className="mt-4 space-y-2">
                  {detailData.sellers?.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Users className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                      <p className="font-semibold">No assigned producers</p>
                    </div>
                  ) : (
                    detailData.sellers.map((s) => (
                      <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{s.name}</p>
                          <p className="text-[10px] text-slate-400">{s.email}</p>
                        </div>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-800 text-[10px]">
                          {s.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Organisations Tab */}
                <TabsContent value="organisations" className="mt-4 space-y-2">
                  {detailData.organisations?.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Building2 className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                      <p className="font-semibold">No assigned organisations</p>
                    </div>
                  ) : (
                    detailData.organisations.map((org) => (
                      <div key={org.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-900">{org.name}</p>
                          <Badge variant="outline" className="text-[10px]">{org.status}</Badge>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500">{org.officialEmail}</p>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="mt-4 space-y-2">
                  {detailData.activity?.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Clock className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                      <p className="font-semibold">No audit events</p>
                    </div>
                  ) : (
                    detailData.activity.map((event) => (
                      <div key={event.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 capitalize">{event.action}</span>
                          <span className="text-[10px] text-slate-400">{timeAgo(event.occurredAt)}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-600">Outcome: {event.outcome}</p>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Create Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Register Market Region</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Establish a new agricultural territory or logistics distribution hub.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Region Name *</Label>
              <Input
                placeholder="e.g. East Anglia & Fens Arable Corridor"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Territory Code *</Label>
                <Input
                  placeholder="UK-ENG-EA"
                  value={createCode}
                  onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Country Code *</Label>
                <Input
                  placeholder="GB"
                  value={createCountryCode}
                  onChange={(e) => setCreateCountryCode(e.target.value.toUpperCase())}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Territory Type</Label>
              <Select value={createType} onValueChange={setCreateType}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market_zone">Market Zone (Growing District)</SelectItem>
                  <SelectItem value="regional_hub">Regional Hub</SelectItem>
                  <SelectItem value="logistics_hub">Logistics & Freight Hub</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Latitude (GPS)</Label>
                <Input
                  placeholder="e.g. 52.400"
                  value={createLat}
                  onChange={(e) => setCreateLat(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Longitude (GPS)</Label>
                <Input
                  placeholder="e.g. 0.500"
                  value={createLng}
                  onChange={(e) => setCreateLng(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!createName.trim() || !createCode.trim() || createRegionMutation.isPending}
              onClick={() =>
                createRegionMutation.mutate({
                  name: createName.trim(),
                  code: createCode.trim(),
                  countryCode: createCountryCode.trim(),
                  type: createType,
                  latitude: createLat ? parseFloat(createLat) : undefined,
                  longitude: createLng ? parseFloat(createLng) : undefined,
                })
              }
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              {createRegionMutation.isPending ? "Registering..." : "Register Region"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={Boolean(editTarget)} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Edit Region Attributes</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update {editTarget?.name} territory specifications.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Region Name *</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Territory Code</Label>
                <Input
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Type</Label>
                <Select value={editType} onValueChange={setEditType}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market_zone">Market Zone</SelectItem>
                    <SelectItem value="regional_hub">Regional Hub</SelectItem>
                    <SelectItem value="logistics_hub">Logistics Hub</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Latitude (GPS)</Label>
                <Input
                  value={editLat}
                  onChange={(e) => setEditLat(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Longitude (GPS)</Label>
                <Input
                  value={editLng}
                  onChange={(e) => setEditLng(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5">
              <div>
                <Label className="text-xs font-bold text-slate-800">Operating Status</Label>
                <p className="text-[10px] text-slate-500">Allow sellers and orders in this territory</p>
              </div>
              <Switch checked={editActive} onCheckedChange={setEditActive} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!editName.trim() || updateRegionMutation.isPending}
              onClick={() => {
                if (editTarget) {
                  updateRegionMutation.mutate({
                    id: editTarget.id,
                    payload: {
                      name: editName.trim(),
                      code: editCode.trim(),
                      type: editType,
                      active: editActive,
                      latitude: editLat ? parseFloat(editLat) : null,
                      longitude: editLng ? parseFloat(editLng) : null,
                    },
                  });
                }
              }}
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              {updateRegionMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
