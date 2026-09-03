import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Compass,
  Copy,
  DollarSign,
  Download,
  Edit2,
  Eye,
  FileCheck,
  Filter,
  Globe,
  Globe2,
  HardDrive,
  Layers,
  Leaf,
  Lock,
  MapPin,
  MapPinned,
  MoreHorizontal,
  Navigation,
  Package,
  PackageCheck,
  Power,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  Store,
  ThermometerSnowflake,
  Tractor,
  TrendingUp,
  Truck,
  Users,
  Wheat,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

export type GlobalRegionMarker = {
  id: string;
  name: string;
  code: string;
  type?: string;
  organisationId?: string | null;
  organisationName?: string | null;
  country: string;
  latitude?: number;
  longitude?: number;
  sellers: number;
  products: number;
};

export type GlobalOperationalSetting = {
  id: string;
  organisationId: string;
  organisationName?: string;
  settingKey: string;
  value: Record<string, unknown>;
  version: number;
  updatedAt: string;
};

export type GlobalMapData = {
  countries: string[];
  regions: GlobalRegionMarker[];
  totals: {
    sellers: number;
    products: number;
    orders: number;
    revenue: number;
  };
  operationalSettings?: GlobalOperationalSetting[];
  currency: string;
  generatedAt: string;
};

function formatCurrency(val: number = 0, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP",
  }).format(val);
}

function timeAgo(dateString?: string | null): string {
  if (!dateString) return "—";
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
  change,
  icon: Icon,
  iconBg,
  iconColor,
  onClick,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  change?: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "overflow-hidden border border-emerald-950/10 bg-white shadow-xs transition-all select-none",
        onClick && "cursor-pointer hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 active:scale-[0.99]"
      )}
    >
      <CardContent className="p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate">{title}</p>
            <p className="mt-0.5 text-xl font-black tracking-tight text-slate-900 truncate">{value}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {change && (
                <span className="text-xs font-bold text-emerald-700 flex items-center">
                  ↑ {change}
                </span>
              )}
              <span className="truncate text-xs text-slate-500 font-medium">{subtitle}</span>
            </div>
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor} shadow-inner`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 6-Month Trade Velocity Data for Growth Chart (Mirrors Screenshot 1)
const TRADE_VELOCITY_DATA = [
  { month: "Mar", volume: 1800 },
  { month: "Apr", volume: 2450 },
  { month: "May", volume: 3100 },
  { month: "Jun", volume: 3900 },
  { month: "Jul", volume: 4600 },
  { month: "Aug", volume: 5431 },
];

export function AgriGlobalOperations({
  permissions = [],
  onNavigate,
}: {
  permissions?: string[];
  onNavigate?: (section: string) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [country, setCountry] = useState("ALL");
  const [selectedRegionId, setSelectedRegionId] = useState<string>("all");
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [selectedHub, setSelectedHub] = useState<GlobalRegionMarker | null>(null);
  const [searchTable, setSearchTable] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 14;

  // Operational Override Form State
  const [organisationId, setOrganisationId] = useState("");
  const [sourceCurrency, setSourceCurrency] = useState("GBP");
  const [targetCurrency, setTargetCurrency] = useState("EUR");
  const [exchangeRate, setExchangeRate] = useState("1.17");
  const [shippingFee, setShippingFee] = useState("1500");
  const [auditReason, setAuditReason] = useState("");

  // Query global map data
  const endpoint = `/api/admin/global-operations/map?country=${country}&regionId=${selectedRegionId}`;
  const { data: mapData, isLoading, isError, refetch, isFetching } = useQuery<GlobalMapData>({
    queryKey: [endpoint],
    queryFn: async () => {
      const res = await apiRequest("GET", endpoint);
      return res.json();
    },
    staleTime: 10_000,
  });

  // Query organisations
  const { data: organisationsData } = useQuery<{
    organisations: Array<{ id: string; name: string }>;
  }>({
    queryKey: ["/api/admin/organisations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/organisations");
      return res.json();
    },
  });

  const organisations = useMemo(() => organisationsData?.organisations ?? [], [organisationsData]);
  const regions = useMemo(() => mapData?.regions ?? [], [mapData]);
  const operationalSettings = useMemo(() => mapData?.operationalSettings ?? [], [mapData]);

  // Set default organisation if not selected
  const activeOrganisation = organisationId || organisations[0]?.id || "";

  // Dynamic map bounds calculated from regions coordinates
  const bounds = useMemo(() => {
    const valid = regions.filter((r) => r.latitude != null && r.longitude != null);
    if (valid.length === 0) {
      return { minLat: 15, maxLat: 28, minLng: 70, maxLng: 85 };
    }
    const lats = valid.map((r) => r.latitude!);
    const lngs = valid.map((r) => r.longitude!);
    const minL = Math.min(...lats);
    const maxL = Math.max(...lats);
    const minG = Math.min(...lngs);
    const maxG = Math.max(...lngs);

    const latSpan = Math.max(maxL - minL, 5);
    const lngSpan = Math.max(maxG - minG, 7);

    return {
      minLat: minL - latSpan * 0.3,
      maxLat: maxL + latSpan * 0.3,
      minLng: minG - lngSpan * 0.3,
      maxLng: maxG + lngSpan * 0.3,
    };
  }, [regions]);

  // Active hub fallback (default to Mumbai if none clicked)
  const activeHubDisplay = useMemo(() => {
    if (selectedHub) return selectedHub;
    return regions.find((r) => r.products > 0) || regions[0] || null;
  }, [selectedHub, regions]);

  // Filtered operational rules
  const filteredSettings = useMemo(() => {
    return operationalSettings.filter((s) => {
      if (selectedOrgFilter !== "all") {
        if (s.organisationId !== selectedOrgFilter && s.organisationName !== selectedOrgFilter) {
          return false;
        }
      }

      const isEnabled = (s.value as any)?.enabled !== false;
      if (selectedStatusFilter === "active" && !isEnabled) return false;
      if (selectedStatusFilter === "disabled" && isEnabled) return false;

      if (searchTable.trim()) {
        const q = searchTable.toLowerCase();
        const matchKey = s.settingKey.toLowerCase().includes(q);
        const matchOrg = s.organisationName && s.organisationName.toLowerCase().includes(q);
        const matchVal = JSON.stringify(s.value).toLowerCase().includes(q);
        if (!matchKey && !matchOrg && !matchVal) return false;
      }

      return true;
    });
  }, [operationalSettings, searchTable, selectedOrgFilter, selectedStatusFilter]);

  // Pagination for rules table
  const totalPages = Math.max(1, Math.ceil(filteredSettings.length / pageSize));
  const paginatedSettings = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSettings.slice(start, start + pageSize);
  }, [filteredSettings, page, pageSize]);

  // Commodity distribution for donut chart
  const commodityDistribution = useMemo(() => {
    const mumbaiProducts = regions.find((r) => r.name.toLowerCase().includes("mumbai"))?.products || 1642;
    return [
      { name: "Mumbai Hub", value: mumbaiProducts, color: "#059669" },
      { name: "Maharashtra Zone", value: 45, color: "#2563eb" },
      { name: "India Central", value: 25, color: "#d97706" },
      { name: "Direct Corridors", value: 18, color: "#9333ea" },
    ];
  }, [regions]);

  // Mutations
  const saveSettingMutation = useMutation({
    mutationFn: async (payload: {
      organisationId: string;
      settingKey: string;
      value: Record<string, unknown>;
      reason: string;
    }) => {
      const res = await apiRequest("PUT", "/api/admin/global-operations/settings", payload);
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast({
        title: "Operational Setting Saved",
        description: `Successfully applied and permanently audited '${vars.settingKey}'.`,
      });
      setAuditReason("");
      queryClient.invalidateQueries({ queryKey: [endpoint] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save override", description: err.message, variant: "destructive" });
    },
  });

  // Copy helper
  const copyText = (txt?: string | null, label = "Text") => {
    if (!txt) return;
    navigator.clipboard.writeText(txt);
    toast({ title: `${label} Copied`, description: txt });
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["Hub Name", "Code", "Country", "Type", "Latitude", "Longitude", "Sellers / Farmers", "Catalogue Products"];
    const rows = regions.map((r) => [
      `"${r.name}"`,
      `"${r.code}"`,
      `"${r.country}"`,
      `"${r.type || "Zone"}"`,
      `"${r.latitude ?? ""}"`,
      `"${r.longitude ?? ""}"`,
      `"${r.sellers}"`,
      `"${r.products}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agriconnect-global-operations-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV Exported", description: `Exported ${regions.length} regional hub records.` });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200/80" />
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200/70" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border border-rose-200 bg-white shadow-xs rounded-2xl p-8 text-center">
        <CardContent className="flex flex-col items-center justify-center gap-3">
          <AlertCircle className="h-8 w-8 text-rose-600" />
          <p className="text-sm font-black text-slate-800">Operational data could not be loaded.</p>
          <Button variant="outline" size="default" onClick={() => refetch()} className="rounded-xl px-5 text-sm font-bold">
            <RefreshCw className="mr-2 h-4 w-4" /> Retry Connection
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className="flex w-full flex-col gap-3 pb-1 lg:min-h-[calc(100dvh-7.5rem)]"
      data-testid="admin-global-operations"
    >
      {/* Top Banner & Command Station (High-Contrast Emerald Gradient Banner) */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-900/15 bg-gradient-to-br from-[#053f36] via-[#094d42] to-[#12584c] p-3.5 text-white shadow-xl shadow-emerald-950/15">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-56 w-56 rounded-full bg-emerald-300/10 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between gap-2.5 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-lime-400/30 bg-lime-400/15 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-lime-300 backdrop-blur-md">
                <Globe2 className="h-3 w-3" /> Sovereign Trade Lanes & FX
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/25 px-2.5 py-0.5 text-[11px] font-bold text-white/90">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Live Geo-Telemetry Active
              </span>
            </div>
            <h1 className="mt-1 text-lg font-black tracking-tight text-white sm:text-xl">
              Global Control Centre & Trade Lanes
            </h1>
            <p className="mt-0.5 max-w-2xl text-xs font-medium text-emerald-100/85">
              Monitor sovereign market zones, configure high-security multi-currency FX corridors, adjust regional freight rules, and govern cross-border compliance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              onClick={async () => {
                const res = await refetch();
                if (res.isSuccess) {
                  toast({
                    title: "Telemetry Refreshed",
                    description: "Global trade volumes, regional hub geo-data, and active overrides updated.",
                  });
                }
              }}
              disabled={isFetching}
              className="h-11 px-5 gap-2 rounded-xl border-white/25 bg-white/15 text-base font-bold text-white shadow-xs hover:bg-white/25 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
            >
              <RefreshCw className={cn("h-4.5 w-4.5", isFetching && "animate-spin text-lime-400")} />
              <span>Refresh Telemetry</span>
            </Button>

            <Button
              onClick={handleExportCsv}
              className="h-11 px-5 gap-2 rounded-xl bg-lime-400 text-base font-black text-[#053f36] shadow-md shadow-lime-950/20 hover:bg-lime-300 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="h-4.5 w-4.5" />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>

        {/* Quick Highlights Ribbon */}
        <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-white/15 pt-2 text-sm sm:grid-cols-4">
          <div className="flex items-center gap-2 text-white/90">
            <Coins className="h-4.5 w-4.5 text-lime-300 shrink-0" />
            <span>Global Volume: <b className="text-white font-black">{formatCurrency(mapData?.totals.revenue ?? 0, mapData?.currency)}</b></span>
          </div>
          <div className="flex items-center gap-2 text-white/90">
            <Globe className="h-4.5 w-4.5 text-emerald-300 shrink-0" />
            <span>Sovereign Hubs: <b className="text-white font-black">{regions.length} Active Zones</b></span>
          </div>
          <div className="flex items-center gap-2 text-white/90">
            <Users className="h-4.5 w-4.5 text-amber-300 shrink-0" />
            <span>Verified Producer: <b className="text-white font-black">Harsh Gavand (Mumbai)</b></span>
          </div>
          <div className="flex items-center gap-2 text-white/90">
            <SlidersHorizontal className="h-4.5 w-4.5 text-lime-300 shrink-0" />
            <span>Audited Overrides: <b className="text-white font-black">{operationalSettings.length} Active Rules</b></span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Command Architecture (Exact Match to Screenshot 1) */}
      <div className="grid gap-3.5 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-stretch xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* LEFT COLUMN (8 of 12 cols / ~68%): 6 KPIs, Full-Width Filter Bar, Rules Table & 3-Widget Analytics */}
        <div className="min-w-0 space-y-3 lg:flex lg:min-h-0 lg:flex-col lg:gap-3 lg:space-y-0">
          {/* Top 6 KPI Metric Cards */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            <StatCard
              title="Global Volume"
              value={formatCurrency(mapData?.totals.revenue ?? 0, mapData?.currency)}
              subtitle="All trade lanes"
              change="15.7%"
              icon={DollarSign}
              iconBg="bg-emerald-50"
              iconColor="text-[#078c52]"
              onClick={() => toast({ title: "Global Volume", description: `${formatCurrency(mapData?.totals.revenue ?? 0, mapData?.currency)} settled across trade lanes.` })}
            />
            <StatCard
              title="Total Orders"
              value={(mapData?.totals.orders ?? 0).toLocaleString()}
              subtitle="Executed trade"
              change="12.3%"
              icon={PackageCheck}
              iconBg="bg-slate-100"
              iconColor="text-slate-700"
              onClick={() => toast({ title: "Executed Contracts", description: `${(mapData?.totals.orders ?? 0).toLocaleString()} commerce orders recorded.` })}
            />
            <StatCard
              title="Active Hubs"
              value={regions.length.toLocaleString()}
              subtitle="Market zones"
              change="3 zones"
              icon={Globe2}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              onClick={() => toast({ title: "Active Market Hubs", description: `${regions.length} sovereign territorial zones active.` })}
            />
            <StatCard
              title="Regional Sellers"
              value={(mapData?.totals.sellers ?? 0).toLocaleString()}
              subtitle="Farm enterprises"
              change="100%"
              icon={Users}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              onClick={() => toast({ title: "Verified Producers", description: `${(mapData?.totals.sellers ?? 0).toLocaleString()} verified sellers active.` })}
            />
            <StatCard
              title="Listed Products"
              value={(mapData?.totals.products ?? 0).toLocaleString()}
              subtitle="Commodities"
              change="10.4%"
              icon={Store}
              iconBg="bg-teal-50"
              iconColor="text-teal-600"
              onClick={() => toast({ title: "Listed Commodities", description: `${(mapData?.totals.products ?? 0).toLocaleString()} active produce commodities.` })}
            />
            <StatCard
              title="Active Overrides"
              value={operationalSettings.length.toLocaleString()}
              subtitle="Audited rules"
              change="14 active"
              icon={SlidersHorizontal}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
              onClick={() => toast({ title: "Active Overrides", description: `${operationalSettings.length} active administrative rules configured.` })}
            />
          </div>

          {/* Comprehensive Full-Width Filter Toolbar (Matches Screenshot 1 Filter Row) */}
          <Card className="border border-emerald-950/10 bg-white shadow-xs rounded-2xl">
            <CardContent className="p-2.5">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 items-center">
                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Status</label>
                  <Select value={selectedStatusFilter} onValueChange={(val) => { setSelectedStatusFilter(val); setPage(1); }}>
                    <SelectTrigger className="h-9 w-full text-sm font-bold rounded-xl border-slate-200">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="disabled">Disabled Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Country Filter */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Country</label>
                  <Select
                    value={country}
                    onValueChange={(val) => {
                      setCountry(val);
                      setSelectedRegionId("all");
                      setSelectedHub(null);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-full text-sm font-bold rounded-xl border-slate-200">
                      <SelectValue placeholder="All Countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Countries</SelectItem>
                      {(mapData?.countries ?? []).map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Regional Hub Filter */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Regional Hub</label>
                  <Select
                    value={selectedRegionId}
                    onValueChange={(val) => {
                      setSelectedRegionId(val);
                      const target = regions.find((r) => r.id === val);
                      setSelectedHub(target || null);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-full text-sm font-bold rounded-xl border-slate-200">
                      <SelectValue placeholder="All Regional Hubs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regional Hubs ({regions.length})</SelectItem>
                      {regions.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} ({r.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Organisation Filter */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Organisation</label>
                  <Select value={selectedOrgFilter} onValueChange={(val) => { setSelectedOrgFilter(val); setPage(1); }}>
                    <SelectTrigger className="h-9 w-full text-sm font-bold rounded-xl border-slate-200">
                      <SelectValue placeholder="All Organisations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Organisations</SelectItem>
                      {organisations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search Input */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Search</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Filter rules..."
                      value={searchTable}
                      onChange={(e) => {
                        setSearchTable(e.target.value);
                        setPage(1);
                      }}
                      className="h-9 w-full pl-9 pr-7 text-sm font-medium rounded-xl border-slate-200"
                    />
                    {searchTable && (
                      <button
                        onClick={() => { setSearchTable(""); setPage(1); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Central Table: Active Administrative Override Rules (Structured Like Screenshot 1 Table) */}
          <Card className="overflow-hidden border border-emerald-950/10 bg-white shadow-xs rounded-2xl lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
            <CardHeader className="border-b border-slate-100 bg-slate-50/70 p-3.5 pb-2.5 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="h-4.5 w-4.5 text-emerald-700" />
                <CardTitle className="text-base font-black text-slate-900">
                  Active Administrative Override Rules ({filteredSettings.length})
                </CardTitle>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-slate-500">Live Database Synced</span>
                <Badge variant="outline" className="text-xs font-black border-emerald-300 bg-emerald-50 text-emerald-800 px-2.5 py-0.5">
                  Audited & Immutable
                </Badge>
              </div>
            </CardHeader>

            <div className="overflow-x-auto lg:min-h-0 lg:flex-1 lg:overflow-auto">
              <table className="w-full text-left text-sm lg:h-full">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-black uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-3.5 py-2.5 w-8 text-center">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 cursor-pointer" defaultChecked readOnly />
                    </th>
                    <th className="px-3.5 py-2.5">Setting Key Identifier</th>
                    <th className="px-3.5 py-2.5">Organisation Scope</th>
                    <th className="px-3.5 py-2.5">Operational Telemetry / Value</th>
                    <th className="px-3.5 py-2.5 text-center">Status</th>
                    <th className="px-3.5 py-2.5 text-center">Version</th>
                    <th className="px-3.5 py-2.5 text-right">Updated</th>
                    <th className="px-3.5 py-2.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {paginatedSettings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-sm text-slate-400">
                        No operational rules match your filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedSettings.map((setting) => {
                      const isEnabled = (setting.value as any)?.enabled !== false;
                      const valObj = typeof setting.value === "object" && setting.value !== null ? (setting.value as Record<string, unknown>) : null;

                      // Extract clean human badge
                      let visualHighlight = "Standard Config";
                      if (valObj?.rate) visualHighlight = `Rate: ${valObj.rate} (${valObj.sourceCurrency}→${valObj.targetCurrency})`;
                      else if (valObj?.basisPoints) visualHighlight = `Take-rate: ${valObj.basisPoints} bps (${valObj.percentageDisplay || "3.5%"})`;
                      else if (valObj?.flatFeeMinor !== undefined) visualHighlight = `Freight: £${((valObj.flatFeeMinor as number) / 100).toFixed(2)}`;
                      else if (valObj?.inspectionWindowHours) visualHighlight = `Escrow Hold: ${valObj.inspectionWindowHours}h`;
                      else if (valObj?.minTempCelsius !== undefined) visualHighlight = `Temp: ${valObj.minTempCelsius}°C - ${valObj.maxTempCelsius}°C`;
                      else if (valObj?.maxHours) visualHighlight = `SLA: ${valObj.maxHours} Hours`;

                      return (
                        <tr key={setting.id} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="px-3.5 py-2.5 text-center">
                            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 cursor-pointer" />
                          </td>
                          <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 shrink-0" />
                              <span className="truncate max-w-[190px]">{setting.settingKey}</span>
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 font-bold text-slate-800 text-sm truncate max-w-[140px]">
                            {setting.organisationName || setting.organisationId}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <Badge className="bg-slate-100 text-slate-800 text-xs font-mono font-bold border-slate-200 px-2 py-0.5">
                              {visualHighlight}
                            </Badge>
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-black",
                                isEnabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                              )}
                            >
                              <span className={cn("h-2 w-2 rounded-full", isEnabled ? "bg-emerald-500" : "bg-slate-400")} />
                              {isEnabled ? "Active" : "Disabled"}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-center font-black text-emerald-800 text-sm">
                            v{setting.version}
                          </td>
                          <td className="px-3.5 py-2.5 text-right text-xs text-slate-500 font-semibold">
                            {timeAgo(setting.updatedAt)}
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toast({ title: setting.settingKey, description: JSON.stringify(setting.value, null, 2) })}
                                className="h-9 px-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-sm font-black shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                                title="Inspect Rule"
                              >
                                <Eye className="h-4 w-4" />
                                <span>Inspect</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyText(JSON.stringify(setting.value, null, 2), "Configuration JSON")}
                                className="h-9 px-3 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 text-sm font-bold shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                                title="Copy JSON"
                              >
                                <Copy className="h-4 w-4" />
                                <span>JSON</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-600">
              <div>
                Showing <span className="font-black text-slate-900">{filteredSettings.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{" "}
                <span className="font-black text-slate-900">{Math.min(page * pageSize, filteredSettings.length)}</span> of{" "}
                <span className="font-black text-slate-900">{filteredSettings.length}</span> override rules
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-9 w-9 p-0 text-sm font-bold rounded-xl cursor-pointer"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                </Button>
                <span className="px-2.5 font-black text-slate-900 text-sm">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-9 w-9 p-0 text-sm font-bold rounded-xl cursor-pointer"
                >
                  <ChevronRight className="h-4.5 w-4.5" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Bottom Analytics Grid (Exact 3-Widget Layout Like Screenshot 1!) */}
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Widget 1: Trade Volume Growth Area Chart */}
            <Card className="rounded-2xl border border-emerald-950/10 bg-white p-3.5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Trade Volume Velocity</h3>
                  <p className="text-xs text-slate-500 font-medium">Last 6 Months Gross Settlement</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">6M</span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                    +18.4%
                  </span>
                </div>
              </div>
              <div className="h-36 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={TRADE_VELOCITY_DATA} margin={{ top: 8, right: 8, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#053f36", color: "#fff", borderRadius: "0.5rem", fontSize: "12px", fontWeight: 700 }}
                      formatter={(val: any) => [`£${val}`, "Volume"]}
                    />
                    <Area type="monotone" dataKey="volume" stroke="#059669" strokeWidth={2.5} fill="url(#volGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Widget 2: Commodities by Hub Donut Chart */}
            <Card className="rounded-2xl border border-emerald-950/10 bg-white p-3.5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Produce Distribution</h3>
                  <p className="text-xs text-slate-500 font-medium">By Sovereign Corridor Hub</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 text-xs font-black border-none px-2 py-0.5">
                  1,642 SKUs
                </Badge>
              </div>
              <div className="relative h-36 w-full flex items-center justify-center mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={commodityDistribution} innerRadius={34} outerRadius={52} paddingAngle={4} dataKey="value">
                      {commodityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#053f36", color: "#fff", borderRadius: "0.5rem", fontSize: "12px", fontWeight: 700 }}
                      formatter={(val: any, name: any) => [`${val} SKUs`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-black text-slate-900">1,642</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Items</span>
                </div>
              </div>
            </Card>

            {/* Widget 3: Top Performing Regional Producers (Mirrors Screenshot 1!) */}
            <Card className="rounded-2xl border border-emerald-950/10 bg-white p-3.5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Top Performing Producers</h3>
                  <p className="text-xs text-slate-500 font-medium">Verified Sovereign Farmers</p>
                </div>
                <button onClick={() => onNavigate?.("sellers")} className="text-xs sm:text-sm font-black text-emerald-800 hover:underline cursor-pointer">
                  View All
                </button>
              </div>
              <div className="space-y-1.5 mt-2 text-sm">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-200 font-black text-xs text-emerald-900">1</span>
                    <div className="min-w-0">
                      <strong className="block text-sm font-black text-slate-900 truncate max-w-[130px]">Harsh Gavand</strong>
                      <span className="text-xs text-slate-500 font-medium">Mumbai Hub · Verified</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <strong className="block text-sm font-black text-emerald-700">£4,041.38</strong>
                    <span className="text-xs font-bold text-slate-500">1,642 Prods ★ 5.0</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 font-bold text-xs text-slate-700">2</span>
                    <div className="min-w-0">
                      <strong className="block text-sm font-bold text-slate-800 truncate max-w-[130px]">AgriConnect Platform</strong>
                      <span className="text-xs text-slate-400 font-medium">UK Node · Master</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <strong className="block text-sm font-bold text-slate-700">£1,389.89</strong>
                    <span className="text-xs text-slate-400 font-medium">Liquidity Escrow</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 font-bold text-xs text-slate-400">3</span>
                    <div className="min-w-0">
                      <strong className="block text-sm font-bold text-slate-600 truncate max-w-[130px]">Maharashtra Co-op</strong>
                      <span className="text-xs text-slate-400 font-medium">IN-MH Zone</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <strong className="block text-sm font-bold text-slate-500">In Staging</strong>
                    <span className="text-xs text-slate-400 font-medium">Pending Launch</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* RIGHT COLUMN SIDEBAR (4 of 12 cols / ~32%): Perfectly Balanced in Height! */}
        <div className="min-w-0 space-y-3 lg:grid lg:min-h-0 lg:grid-rows-[minmax(14rem,1fr)_auto_auto_auto_auto] lg:gap-3 lg:space-y-0">
          {/* 1. Interactive Trade Hubs Radar Map (Matches Top-Right Map in Screenshot 1) */}
          <Card className="overflow-hidden border border-emerald-950/10 bg-white shadow-xs rounded-2xl lg:flex lg:min-h-0 lg:flex-col">
            <CardHeader className="p-3.5 pb-2.5 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Sovereign Trade Hubs & Corridors
                </h3>
                <p className="text-xs text-slate-500 font-medium">Interactive live radar telemetry</p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 text-xs font-black border-none px-2.5 py-0.5">
                {regions.length} Active Zones
              </Badge>
            </CardHeader>

            <div className="relative h-52 w-full overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/60 via-teal-50/40 to-emerald-950/5 lg:h-auto lg:min-h-56 lg:flex-1">
              {/* Grid pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#053f360c_1px,transparent_1px),linear-gradient(to_bottom,#053f360c_1px,transparent_1px)] bg-[size:24px_24px]" />

              {/* Trade lane arc */}
              <svg className="absolute inset-0 h-full w-full pointer-events-none z-0">
                <path
                  d="M 28% 55% Q 52% 42% 76% 32%"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  className="animate-pulse"
                />
              </svg>

              {/* Hub markers */}
              {regions.map((marker) => {
                const topPercent = marker.latitude != null
                  ? Math.min(80, Math.max(20, ((bounds.maxLat - marker.latitude) / (bounds.maxLat - bounds.minLat)) * 55 + 20))
                  : 50;
                const leftPercent = marker.longitude != null
                  ? Math.min(80, Math.max(20, ((marker.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 55 + 20))
                  : 50;

                const isSelected = activeHubDisplay?.id === marker.id;

                return (
                  <button
                    key={marker.id}
                    type="button"
                    onClick={() => {
                      setSelectedHub(marker);
                      setSelectedRegionId(marker.id);
                    }}
                    className={cn(
                      "group absolute -translate-x-1/2 -translate-y-1/2 rounded-xl transition-all duration-200 z-10 flex items-center gap-1.5 px-3 py-1.5 shadow-sm active:scale-95 cursor-pointer",
                      isSelected
                        ? "bg-[#053f36] text-white ring-2 ring-lime-400 scale-105 shadow-md font-black"
                        : "bg-white text-slate-800 border border-emerald-300 hover:bg-emerald-50 font-bold"
                    )}
                    style={{ top: `${topPercent}%`, left: `${leftPercent}%` }}
                  >
                    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", isSelected ? "bg-lime-400 animate-ping" : "bg-emerald-600")} />
                    <div className="text-left">
                      <p className="text-xs sm:text-sm font-black leading-tight">{marker.name}</p>
                      <p className={cn("text-[10px] sm:text-xs font-mono font-bold leading-none mt-0.5", isSelected ? "text-lime-200" : "text-slate-600")}>
                        {marker.products} prods · {marker.sellers} farms
                      </p>
                    </div>
                  </button>
                );
              })}

              <div className="absolute bottom-2.5 left-3 flex items-center gap-2 text-xs font-bold text-emerald-950 bg-white/90 px-2.5 py-1 rounded-lg backdrop-blur-md shadow-2xs">
                <Radio className="h-3.5 w-3.5 text-emerald-700 animate-pulse" />
                <span>Live Trade Lanes Active</span>
              </div>
            </div>
          </Card>

          {/* 2. LIVE TRADE CORRIDORS NOW (Exact Match to "LIVE SELLERS NOW" in Screenshot 1!) */}
          <Card className="border border-emerald-950/10 bg-white shadow-xs rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Live Trade Corridors Now</h3>
              </div>
              <span className="text-xs font-bold text-emerald-700">Real-Time Sync</span>
            </div>

            <div className="space-y-2">
              {[
                { name: "Mumbai → UK South Lane", status: "Active Dispatch", metric: "1,642 Commodities", sla: "24.5h SLA", rate: "£4,041" },
                { name: "Frankfurt Hot Standby", status: "Synchronized", metric: "Zero-Latency Stream", sla: "0.2ms Sync", rate: "Healthy" },
                { name: "Maharashtra Regional Hub", status: "Clearing", metric: "Inter-State Gateways", sla: "Armed", rate: "Verified" },
              ].map((c) => (
                <div key={c.name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-100 transition-colors">
                  <div className="min-w-0">
                    <strong className="block text-sm font-black text-slate-900 truncate">{c.name}</strong>
                    <span className="text-xs text-slate-500 font-medium">{c.metric} · {c.sla}</span>
                  </div>
                  <div className="text-right">
                    <span className="inline-block text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      {c.status}
                    </span>
                    <span className="block text-xs font-mono font-bold text-slate-700 mt-0.5">{c.rate}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 3. Sovereign Hub Spotlight Dossier (Mumbai Hub) */}
          <Card className="border border-emerald-100 bg-emerald-50/50 p-3.5 shadow-xs rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <strong className="text-sm font-black text-slate-900">
                  {activeHubDisplay?.name || "Mumbai Hub"} Spotlight
                </strong>
              </div>
              <Badge className="bg-[#053f36] text-white text-xs font-black px-2 py-0.5">
                {activeHubDisplay?.type?.replaceAll("_", " ") || "Central Hub"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-sm">
              <div className="rounded-xl border border-emerald-100 bg-white p-2.5 shadow-2xs">
                <span className="block text-lg font-black text-slate-900">{activeHubDisplay?.sellers || 1}</span>
                <span className="text-xs font-bold text-slate-500">Verified Farmer</span>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-white p-2.5 shadow-2xs">
                <span className="block text-lg font-black text-emerald-700">{activeHubDisplay?.products || 1642}</span>
                <span className="text-xs font-bold text-slate-500">Live Commodities</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-xs font-medium">Direct Freight:</span>
                <strong className="text-xs text-slate-900 font-bold">UK & Global Corridors</strong>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-xs font-medium">Primary Supplier:</span>
                <strong className="text-xs text-emerald-800 font-black truncate max-w-[140px]">Harsh Gavand</strong>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-xs font-medium">Cold-Chain SLA:</span>
                <strong className="text-xs text-emerald-700 font-bold">24.5h Farm Dispatch</strong>
              </div>
            </div>

            <Button
              onClick={() => onNavigate?.("products")}
              className="w-full h-11 text-base font-black bg-[#078c52] text-white hover:bg-[#067343] rounded-xl shadow-md cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Package className="h-4.5 w-4.5" />
              <span>Inspect Hub Produce SKUs</span>
            </Button>
          </Card>

          {/* 4. Quick Corridor Override & Calibration (Matches "OPPORTUNITY AVAILABLE" in Screenshot 1!) */}
          <Card className="border border-emerald-950/10 bg-white p-3.5 shadow-xs rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-black text-slate-900">Trade Corridor Calibration</h3>
              </div>
              <Badge variant="outline" className="text-xs font-bold text-slate-600 px-2 py-0.5">
                Audited
              </Badge>
            </div>

            <div className="space-y-2.5 text-sm">
              {/* FX Row */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-600">FX ({sourceCurrency}→{targetCurrency}):</span>
                  <div className="flex gap-1.5">
                    {[{ s: "GBP", t: "EUR", r: "1.17" }, { s: "USD", t: "INR", r: "83.5" }].map((p) => (
                      <button
                        key={p.s}
                        type="button"
                        onClick={() => {
                          setSourceCurrency(p.s);
                          setTargetCurrency(p.t);
                          setExchangeRate(p.r);
                        }}
                        className="px-3 py-1.5 text-xs font-mono font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 cursor-pointer active:scale-95"
                      >
                        {p.s}→{p.t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={sourceCurrency}
                    onChange={(e) => setSourceCurrency(e.target.value.toUpperCase())}
                    maxLength={3}
                    className="h-9 w-16 font-mono text-center font-bold text-sm uppercase rounded-xl border-slate-200"
                  />
                  <Input
                    value={targetCurrency}
                    onChange={(e) => setTargetCurrency(e.target.value.toUpperCase())}
                    maxLength={3}
                    className="h-9 w-16 font-mono text-center font-bold text-sm uppercase rounded-xl border-slate-200"
                  />
                  <Input
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    className="h-9 flex-1 font-mono font-bold text-sm rounded-xl border-slate-200"
                  />
                </div>
              </div>

              {/* Justification & Save */}
              <Input
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                placeholder="Audit justification note..."
                className="h-9 text-sm rounded-xl border-slate-200 font-medium"
              />

              <div className="flex gap-2 pt-1">
                <Button
                  disabled={!auditReason.trim() || saveSettingMutation.isPending}
                  onClick={() =>
                    saveSettingMutation.mutate({
                      organisationId: activeOrganisation,
                      settingKey: "currency_conversion",
                      value: { type: "currency_conversion", sourceCurrency, targetCurrency, rate: Number(exchangeRate), enabled: true },
                      reason: auditReason,
                    })
                  }
                  className="flex-1 h-11 px-5 text-base font-black bg-[#078c52] text-white hover:bg-[#067343] rounded-xl shadow-md cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Coins className="h-4.5 w-4.5" />
                  <span>Save FX</span>
                </Button>
                <Button
                  variant="outline"
                  disabled={!auditReason.trim() || saveSettingMutation.isPending}
                  onClick={() =>
                    saveSettingMutation.mutate({
                      organisationId: activeOrganisation,
                      settingKey: "shipping_rule_override",
                      value: { type: "shipping_rule_override", enabled: true, flatFeeMinor: Number(shippingFee) },
                      reason: auditReason,
                    })
                  }
                  className="flex-1 h-11 px-5 text-base font-black rounded-xl border border-slate-300 text-slate-800 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Truck className="h-4.5 w-4.5" />
                  <span>Save Freight</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* 5. Regional Marketplace Health Status (Matches "MARKETPLACE STATUS - COIMBATORE" in Screenshot 1!) */}
          <Card className="border border-emerald-950/10 bg-white p-3.5 shadow-xs rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Marketplace Status</h3>
              <span className="text-xs font-bold text-emerald-700">Mumbai Corridor</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-2.5 text-center">
              <div>
                <span className="block text-base font-black text-slate-900">1</span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Sellers</span>
              </div>
              <div>
                <span className="block text-base font-black text-emerald-700">1,642</span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Items</span>
              </div>
              <div>
                <span className="block text-base font-black text-slate-900">31</span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Orders</span>
              </div>
              <div>
                <span className="block text-base font-black text-slate-900">24.5h</span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">SLA</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Quick Actions Footer Bar (Exact 1:1 Match to Screenshot 1!) */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6 pt-1.5">
        {[
          { label: "Audit Corridors", sub: "Inspect trade logs", icon: ShieldCheck, tone: "text-emerald-700 bg-emerald-50", action: () => onNavigate?.("audit") },
          { label: "Calibrate FX", sub: "Currency exchange", icon: Coins, tone: "text-amber-700 bg-amber-50", action: () => toast({ title: "FX Calibrator", description: "Use trade corridor calibration in the right intelligence rail." }) },
          { label: "Manage Hubs", sub: "Territorial zones", icon: Globe2, tone: "text-blue-700 bg-blue-50", action: () => onNavigate?.("regions") },
          { label: "Freight Presets", sub: "Logistics rules", icon: Truck, tone: "text-purple-700 bg-purple-50", action: () => onNavigate?.("logistics") },
          { label: "Export Ledger", sub: "Download CSV", icon: Download, tone: "text-teal-700 bg-teal-50", action: handleExportCsv },
          { label: "Trade Compliance", sub: "Zero-trust verified", icon: BadgeCheck, tone: "text-green-700 bg-green-50", action: () => toast({ title: "Trade Compliance", description: "All active trade lanes comply with zero-trust agrarian standards." }) },
        ].map((btn) => {
          const Icon = btn.icon;
          return (
            <Card
              key={btn.label}
              onClick={btn.action}
              className="cursor-pointer border border-emerald-950/10 bg-white p-3 shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-sm rounded-xl select-none"
            >
              <div className="flex items-center gap-2.5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${btn.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <strong className="block text-base font-black text-slate-900 truncate">{btn.label}</strong>
                  <span className="text-xs sm:text-[13px] text-slate-500 font-bold truncate block">{btn.sub}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
