import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
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
  Coins,
  Compass,
  CreditCard,
  DollarSign,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Flame,
  Globe,
  Globe2,
  Handshake,
  Layers,
  Leaf,
  LocateFixed,
  Lock,
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
  ShieldAlert,
  ShieldCheck,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  Store,
  Tag,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Truck,
  User,
  Users,
  Warehouse,
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

export function AgriGlobalOperations({
  permissions = [],
}: {
  permissions?: string[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [country, setCountry] = useState("ALL");
  const [selectedRegionId, setSelectedRegionId] = useState<string>("all");
  const [selectedHub, setSelectedHub] = useState<GlobalRegionMarker | null>(null);

  // Operational Override Form
  const [organisationId, setOrganisationId] = useState("");
  const [sourceCurrency, setSourceCurrency] = useState("");
  const [targetCurrency, setTargetCurrency] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [shippingFee, setShippingFee] = useState("");
  const [auditReason, setAuditReason] = useState("");

  // Query global map data
  const endpoint = `/api/admin/global-operations/map?country=${country}&regionId=${selectedRegionId}`;
  const { data: mapData, isLoading, isError, refetch, isFetching } = useQuery<GlobalMapData>({
    queryKey: [endpoint],
    queryFn: async () => {
      const res = await apiRequest("GET", endpoint);
      return res.json();
    },
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
        title: "Operational Override Saved",
        description: `Successfully applied and audited '${vars.settingKey}' for organization.`,
      });
      setAuditReason("");
      queryClient.invalidateQueries({ queryKey: [endpoint] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save override", description: err.message, variant: "destructive" });
    },
  });

  const canManage = permissions.includes("settings.manage") || permissions.includes("dashboard.view");

  const circuitBreakers = [
    { key: "trading_engine_enabled", label: "Marketplace Trading", description: "Live order matching engine" },
    { key: "vat_engine_active", label: "Cross-Border VAT Engine", description: "Reverse-charge automation" },
    { key: "ai_matchmaker_active", label: "AI Autonomous Matchmaker", description: "Intelligent harvest dispatch" },
    { key: "escrow_auto_settlement", label: "Escrow Auto-Settlement", description: "Automated settlement processing" },
  ];

  if (isLoading) {
    return (
      <Card className="border border-emerald-950/10 bg-white shadow-sm">
        <CardContent className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading operational data…
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border border-rose-200 bg-white shadow-sm">
        <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          <AlertCircle className="h-6 w-6 text-rose-600" />
          <p className="text-sm font-semibold text-slate-800">Operational data could not be loaded.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <span>Platform Super-Admin</span>
            <span>/</span>
            <span>Global Operations</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Global Control Centre & Trade Lanes
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor sovereign market zones, configure high-security multi-currency fx corridors, adjust regional freight rules, and govern cross-border compliance.
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
            <span>Refresh Telemetry</span>
          </Button>
        </div>
      </div>

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Global Volume"
          value={formatCurrency(mapData?.totals.revenue ?? 0, mapData?.currency)}
          subtitle="All trade lanes"
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-[#078c52]"
        />
        <StatCard
          title="Total Orders"
          value={(mapData?.totals.orders ?? 0).toLocaleString()}
          subtitle="Executed trade contracts"
          icon={PackageCheck}
          iconBg="bg-slate-100"
          iconColor="text-slate-700"
        />
        <StatCard
          title="Active Hubs"
          value={regions.length.toLocaleString()}
          subtitle="Sovereign market zones"
          icon={Globe2}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Regional Sellers"
          value={(mapData?.totals.sellers ?? 0).toLocaleString()}
          subtitle="Verified farm enterprises"
          icon={Users}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Listed Products"
          value={(mapData?.totals.products ?? 0).toLocaleString()}
          subtitle="Active commodities"
          icon={Store}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
        />
        <StatCard
          title="Active Overrides"
          value={operationalSettings.length.toLocaleString()}
          subtitle="Audited rule overrides"
          icon={SlidersHorizontal}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
      </div>

      {/* Country / Region Filter Bar */}
      <Card className="border border-emerald-950/10 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Country:</span>
                <Select
                  value={country}
                  onValueChange={(val) => {
                    setCountry(val);
                    setSelectedRegionId("all");
                  }}
                >
                  <SelectTrigger className="h-9 w-[150px] text-xs font-semibold">
                    <SelectValue placeholder="Country" />
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

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Regional Hub:</span>
                <Select
                  value={selectedRegionId}
                  onValueChange={(val) => {
                    setSelectedRegionId(val);
                    const target = regions.find((r) => r.id === val);
                    setSelectedHub(target || null);
                  }}
                >
                  <SelectTrigger className="h-9 min-w-[240px] text-xs font-semibold">
                    <SelectValue placeholder="All Regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regional Market Hubs ({regions.length})</SelectItem>
                    {regions.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Database telemetry loaded
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Operations Visual Radar Map */}
      <Card className="overflow-hidden border border-emerald-950/10 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <MapPinned className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-black text-slate-900">
                  Regional Operations Telemetry & Geo-Distribution
                </CardTitle>
                <p className="text-[11px] text-slate-500">
                  Geo-referenced market hubs and freight trade corridors recorded in the platform database.
                </p>
              </div>
            </div>

            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px] font-bold">
              {regions.length} Sovereign Zones Active
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          {/* Interactive Visual Map Canvas */}
          <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-emerald-200 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/70 via-teal-50/50 to-emerald-950/5 shadow-inner">
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#053f360a_1px,transparent_1px),linear-gradient(to_bottom,#053f360a_1px,transparent_1px)] bg-[size:24px_24px]" />

            {/* Region Markers */}
            {regions.map((marker) => {
              // Convert lat/long to relative percentage coordinates inside container
              // UK bounds: Lat ~50 to ~58.5, Lng ~-6 to ~2
              const minLat = 50.0;
              const maxLat = 58.5;
              const minLng = -6.0;
              const maxLng = 2.0;

              const topPercent = marker.latitude != null
                ? Math.min(90, Math.max(10, ((maxLat - marker.latitude) / (maxLat - minLat)) * 80 + 10))
                : 50;
              const leftPercent = marker.longitude != null
                ? Math.min(90, Math.max(10, ((marker.longitude - minLng) / (maxLng - minLng)) * 80 + 10))
                : 50;

              const isSelected = selectedHub?.id === marker.id || selectedRegionId === marker.id;

              return (
                <button
                  key={marker.id}
                  type="button"
                  onClick={() => {
                    setSelectedHub(marker);
                    setSelectedRegionId(marker.id);
                  }}
                  className={`group absolute -translate-x-1/2 -translate-y-1/2 rounded-xl transition-all duration-200 z-10 flex items-center gap-1.5 px-2.5 py-1.5 shadow-md ${
                    isSelected
                      ? "bg-[#053f36] text-white ring-4 ring-lime-400 scale-110"
                      : "bg-white text-slate-800 border border-emerald-300 hover:bg-emerald-50 hover:scale-105"
                  }`}
                  style={{ top: `${topPercent}%`, left: `${leftPercent}%` }}
                >
                  <span className={`h-2 w-2 rounded-full ${isSelected ? "bg-lime-400 animate-ping" : "bg-emerald-600"}`} />
                  <div className="text-left">
                    <p className="text-[10px] font-black leading-none">{marker.name.split(" ")[0]}</p>
                    <p className={`text-[8px] font-mono leading-none mt-0.5 ${isSelected ? "text-lime-200" : "text-slate-400"}`}>
                      {marker.products} prods · {marker.sellers} farms
                    </p>
                  </div>
                </button>
              );
            })}

            {regions.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-slate-500">
                <MapPin className="h-7 w-7 text-emerald-700" />
                <p className="text-sm font-bold text-slate-700">No regional market hubs configured</p>
                <p className="max-w-md text-xs">The map will populate when real regions with coordinates are added to the database.</p>
              </div>
            )}

            {selectedHub && (
              <div className="absolute top-3 right-3 rounded-lg bg-[#053f36] text-white p-3 text-xs shadow-lg max-w-xs border border-lime-400/30">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-black text-lime-300">{selectedHub.name}</p>
                    <p className="text-[10px] text-white/70">{selectedHub.code} · {selectedHub.country}</p>
                  </div>
                  <button onClick={() => setSelectedHub(null)} className="text-white/60 hover:text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-center text-[10px] pt-2 border-t border-white/10">
                  <div className="bg-white/10 p-1.5 rounded">
                    <span className="font-bold text-lime-300">{selectedHub.sellers}</span> Sellers
                  </div>
                  <div className="bg-white/10 p-1.5 rounded">
                    <span className="font-bold text-lime-300">{selectedHub.products}</span> Products
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Regional Hubs Cards Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {regions.map((hub) => {
              const isSelected = selectedHub?.id === hub.id || selectedRegionId === hub.id;
              return (
                <div
                  key={hub.id}
                  onClick={() => {
                    setSelectedHub(hub);
                    setSelectedRegionId(hub.id);
                  }}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? "border-[#053f36] bg-emerald-50/70 ring-2 ring-[#053f36]/20 shadow-sm"
                      : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{hub.name}</p>
                      <p className="text-[10px] font-mono text-slate-400">{hub.code} · {hub.country}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-bold border-emerald-200 bg-white text-emerald-800">
                      {hub.type?.replaceAll("_", " ") || "—"}
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2 text-center text-xs">
                    <div>
                      <span className="block font-black text-slate-900">{hub.sellers}</span>
                      <span className="text-[10px] text-slate-500">Farmers</span>
                    </div>
                    <div>
                      <span className="block font-black text-slate-900">{hub.products}</span>
                      <span className="text-[10px] text-slate-500">Products</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {regions.length === 0 && (
              <p className="col-span-full py-3 text-center text-xs text-slate-500">No regional hub records are available.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Operational Overrides & Platform Switches Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Currency & Freight Overrides Form (2 Columns) */}
        <Card className="border border-emerald-950/10 bg-white shadow-sm lg:col-span-2">
          <CardHeader className="border-b border-slate-100 bg-slate-50/70 p-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-emerald-700" />
              <CardTitle className="text-sm font-black text-slate-900">
                Auditable Operational Overrides & FX Corridors
              </CardTitle>
            </div>
            <p className="text-[11px] text-slate-500">
              Changes are server-validated, attributed per organization, and permanently immutably logged in the platform audit trail.
            </p>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-xs">
            {/* Target Organisation Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Target Organisation *</Label>
              <Select value={activeOrganisation} onValueChange={setOrganisationId}>
                <SelectTrigger className="h-10 text-xs font-medium">
                  <SelectValue placeholder="Select Organisation" />
                </SelectTrigger>
                <SelectContent>
                  {organisations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} ({org.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Currency FX Matrix Row */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-600" />
                <span className="font-bold text-slate-900">Multi-Currency FX Corridor Override</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Source Currency</Label>
                  <Input
                    value={sourceCurrency}
                    onChange={(e) => setSourceCurrency(e.target.value.toUpperCase())}
                    maxLength={3}
                    placeholder="GBP"
                    className="h-9 font-mono font-bold text-xs uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Target Currency</Label>
                  <Input
                    value={targetCurrency}
                    onChange={(e) => setTargetCurrency(e.target.value.toUpperCase())}
                    maxLength={3}
                    placeholder="EUR"
                    className="h-9 font-mono font-bold text-xs uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Exchange Rate</Label>
                  <Input
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    inputMode="decimal"
                    placeholder="Enter rate"
                    className="h-9 font-mono font-bold text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Freight Fee Override Row */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-slate-900">Logistics Flat-Fee Freight Override</span>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Flat Shipping Fee (Minor Units)</Label>
                <Input
                  value={shippingFee}
                  onChange={(e) => setShippingFee(e.target.value)}
                  inputMode="numeric"
                  placeholder="Enter fee"
                  className="h-9 font-mono font-bold text-xs"
                />
              </div>
            </div>

            {/* Audit Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Required Audit Justification *</Label>
              <Input
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                placeholder="Explain why this administrative override is required"
                className="h-10 text-xs"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2.5 pt-2">
              <Button
                disabled={
                  !activeOrganisation ||
                  !auditReason ||
                  !/^[A-Z]{3}$/.test(sourceCurrency) ||
                  !/^[A-Z]{3}$/.test(targetCurrency) ||
                  !(Number(exchangeRate) > 0) ||
                  saveSettingMutation.isPending
                }
                onClick={() =>
                  saveSettingMutation.mutate({
                    organisationId: activeOrganisation,
                    settingKey: "currency_conversion",
                    value: {
                      type: "currency_conversion",
                      sourceCurrency,
                      targetCurrency,
                      rate: Number(exchangeRate),
                      enabled: true,
                    },
                    reason: auditReason,
                  })
                }
                className="bg-[#078c52] text-white hover:bg-[#067343] h-9 text-xs"
              >
                <Coins className="mr-1.5 h-3.5 w-3.5" /> Save Currency Conversion
              </Button>

              <Button
                variant="outline"
                disabled={
                  !activeOrganisation ||
                  !auditReason ||
                  (shippingFee !== "" && (!Number.isInteger(Number(shippingFee)) || Number(shippingFee) < 0)) ||
                  saveSettingMutation.isPending
                }
                onClick={() =>
                  saveSettingMutation.mutate({
                    organisationId: activeOrganisation,
                    settingKey: "shipping_rule_override",
                    value: {
                      type: "shipping_rule_override",
                      enabled: true,
                      ...(shippingFee === "" ? {} : { flatFeeMinor: Number(shippingFee) }),
                    },
                    reason: auditReason,
                  })
                }
                className="h-9 text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Truck className="mr-1.5 h-3.5 w-3.5" /> Save Shipping Override
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Global Master Circuit Breakers (1 Column) */}
        <Card className="border border-emerald-950/10 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/70 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              <CardTitle className="text-sm font-black text-slate-900">
                Platform Circuit Breakers
              </CardTitle>
            </div>
            <p className="text-[11px] text-slate-500">
              Immediate platform-wide security and trade controls.
            </p>
          </CardHeader>

          <CardContent className="p-4 space-y-4 text-xs">
            {circuitBreakers.map((breaker) => {
              const setting = operationalSettings.find((item) => item.settingKey === breaker.key);
              const enabled = setting?.value?.enabled === true;
              return (
                <div key={breaker.key} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <p className="font-bold text-slate-900">{breaker.label}</p>
                    <p className="text-[10px] text-slate-500">{breaker.description}</p>
                  </div>
                  <Switch
                    checked={enabled}
                    disabled={!canManage || !activeOrganisation || !auditReason || saveSettingMutation.isPending}
                    onCheckedChange={(checked) =>
                      saveSettingMutation.mutate({
                        organisationId: activeOrganisation,
                        settingKey: breaker.key,
                        value: { ...(setting?.value ?? {}), enabled: checked },
                        reason: auditReason,
                      })
                    }
                  />
                </div>
              );
            })}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
              Enter an audit justification before changing a circuit breaker. Unconfigured controls remain off.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Operational Overrides Audit Table */}
      {operationalSettings.length > 0 && (
        <Card className="overflow-hidden border border-emerald-950/10 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/70 p-4">
            <CardTitle className="text-sm font-black text-slate-900">
              Active Administrative Override Rules
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Setting Key</th>
                  <th className="px-4 py-3">Organisation</th>
                  <th className="px-4 py-3">Configured Values</th>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3 text-right">Updated At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {operationalSettings.map((setting) => (
                  <tr key={setting.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{setting.settingKey}</td>
                    <td className="px-4 py-3">{setting.organisationName || setting.organisationId}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600 max-w-md truncate">
                      {JSON.stringify(setting.value)}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-800">v{setting.version}</td>
                    <td className="px-4 py-3 text-right text-[10px] text-slate-400">{timeAgo(setting.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
