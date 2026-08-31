import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CloudRain,
  DollarSign,
  Download,
  Droplets,
  Eye,
  FileCheck2,
  Filter,
  Flame,
  Gauge,
  Layers,
  Leaf,
  LineChart,
  MapPin,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Store,
  Sun,
  Target,
  Tractor,
  Trees,
  TrendingUp,
  Truck,
  Users,
  Wheat,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

export type AdminSection =
  | "overview" | "users" | "farmers" | "sellers" | "buyers" | "students" | "researchers"
  | "service-providers" | "logistics-partners" | "organisations" | "employees" | "products"
  | "categories" | "verification" | "regions" | "opportunities" | "content" | "orders"
  | "logistics" | "analytics" | "revenue" | "data" | "security" | "audit" | "settings" | "global-operations";

type OverviewData = {
  summary: {
    totalUsers: number;
    farmers: number;
    sellers: number;
    verifiedFarmers: number;
    pendingFarmers: number;
    products: number;
    orders: number;
    revenue: number;
    newUsers: number;
    activeUsers: number;
    newOrders: number;
    gmv: number;
    regions: number;
    activeSessions: number;
  };
  orderStatuses: Array<{ status: string; count: number }>;
  trends: Array<{ day: string; orders: number; revenue: number }>;
  recentActivity: Array<{ id: string; action: string; targetType: string; targetId?: string; outcome: string; occurredAt: string }>;
  topCategories: Array<{ category: string; products: number; value: number }>;
  topFarmers: Array<{ id: string; name: string; avatar?: string; rating: number; products: number; revenue: number }>;
  regions: Array<{ region: string; farmers: number }>;
  farmerGrowth: Array<{ label: string; farmers: number }>;
  scoring: Array<{ label: string; value: number; color: string }>;
};

type AnalyticsData = {
  metrics: Array<{ id: string; name: string; value: number; status: string }>;
  trends: Array<{ day: string; orders: number; revenue: number }>;
  overview?: OverviewData;
  categoryYields?: Array<{
    category: string;
    products: number;
    totalStock: number;
    growers: number;
    revenue: number;
  }>;
  localDemandAlerts?: Array<{
    id: string;
    productName: string;
    quantity: number;
    unit: string;
    urgency: string;
    location: string;
    buyerName?: string;
    createdAt?: string;
  }>;
  fulfillmentRate?: number | null;
  organicRatio?: number | null;
  estimatedLocalMilesSaved?: number | null;
  currency?: string;
  reportingWindowDays?: number;
  generatedAt?: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);

const compact = (value: number) =>
  new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(value);

function initials(value: string) {
  return value
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AG";
}

const SECTOR_INFO: Record<
  string,
  { label: string; icon: LucideIcon; color: string; bg: string; border: string; exampleCrops: string }
> = {
  grains: {
    label: "Grains & Cereals",
    icon: Wheat,
    color: "text-amber-700",
    bg: "bg-amber-50/80",
    border: "border-amber-200",
    exampleCrops: "Wheat, Barley, Oats, Rye, Lentils",
  },
  produce: {
    label: "Fresh Produce & Greens",
    icon: Leaf,
    color: "text-emerald-700",
    bg: "bg-emerald-50/80",
    border: "border-emerald-200",
    exampleCrops: "Apples, Berries, Root Veg, Heirloom Tomatoes",
  },
  biofertilizers: {
    label: "Bio-Fertilizers & Pest Tech",
    icon: Sprout,
    color: "text-lime-800",
    bg: "bg-lime-50/80",
    border: "border-lime-200",
    exampleCrops: "Rhizobium, Trichoderma, Cold-Pressed Neem Oil",
  },
  bioenergy: {
    label: "Bio-Energy & Biomass",
    icon: Flame,
    color: "text-orange-700",
    bg: "bg-orange-50/80",
    border: "border-orange-200",
    exampleCrops: "Straw Pellets, Wood Biomass, Biogas Starters",
  },
  commercial: {
    label: "Commercial & Cash Crops",
    icon: Trees,
    color: "text-teal-800",
    bg: "bg-teal-50/80",
    border: "border-teal-200",
    exampleCrops: "Arabica Beans, Orthodox Tea, Natural Rubber, Sugarcane",
  },
  agritech: {
    label: "AgriTech & Smart Farming",
    icon: Tractor,
    color: "text-blue-800",
    bg: "bg-blue-50/80",
    border: "border-blue-200",
    exampleCrops: "Soil Sensors, Drip Irrigation, Precision Kits",
  },
};

export function AgriAnalyticsDashboard({ onNavigate }: { onNavigate: (section: AdminSection) => void }) {
  const [days, setDays] = useState("30");
  const [activeTab, setActiveTab] = useState<"velocity" | "crops" | "regional" | "growers" | "almanac">("velocity");
  const [chartMetric, setChartMetric] = useState<"combined" | "revenue" | "orders">("combined");
  const [sectorFilter, setSectorFilter] = useState("all");

  const endpoint = `/api/admin/analytics?days=${days}`;
  const { data, isLoading, isError, isFetching, refetch } = useQuery<AnalyticsData>({
    queryKey: [endpoint],
    staleTime: 15_000,
  });

  const overview = data?.overview;
  const summary = overview?.summary;

  const chartData = useMemo(() => {
    if (data?.trends && data.trends.length > 0) {
      return data.trends.map((item) => ({
        day: item.day,
        formattedDay: item.day.length >= 10 ? item.day.slice(5) : item.day,
        orders: item.orders,
        revenue: item.revenue,
      }));
    }
    return [];
  }, [data?.trends]);

  const categories = useMemo(() => {
    if (data?.categoryYields && data.categoryYields.length > 0) {
      return data.categoryYields;
    }
    return [];
  }, [data?.categoryYields]);

  const filteredCategories = useMemo(() => {
    if (sectorFilter === "all") return categories;
    return categories.filter((c) => c.category.toLowerCase().includes(sectorFilter.toLowerCase()));
  }, [categories, sectorFilter]);

  const orderStatuses = useMemo(() => {
    if (overview?.orderStatuses && overview.orderStatuses.length > 0) {
      return overview.orderStatuses;
    }
    return [];
  }, [overview?.orderStatuses]);

  const regionsList = useMemo(() => {
    return overview?.regions ?? [];
  }, [overview?.regions]);

  const topFarmersList = useMemo(() => {
    return overview?.topFarmers ?? [];
  }, [overview?.topFarmers]);

  const localDemandList = useMemo(() => {
    return data?.localDemandAlerts ?? [];
  }, [data?.localDemandAlerts]);

  const exportCSV = () => {
    const rows = [
      ["AgriConnect Agricultural Intelligence Export"],
      ["Generated At", new Date().toISOString()],
      ["Reporting Window", `Last ${days} days`],
      [""],
      ["Platform Summary Metrics"],
      ["Gross Agricultural Trade (GMV)", summary?.gmv ?? summary?.revenue ?? 0],
      ["Recorded Revenue (GBP)", summary?.revenue ?? 0],
      ["Total Registered Growers", summary?.farmers ?? 0],
      ["Verified Producers", summary?.verifiedFarmers ?? 0],
      ["Total Recorded Orders", summary?.orders ?? 0],
      ["Catalogue Produce SKUs", summary?.products ?? 0],
      ["Active Market Regions", summary?.regions ?? 0],
      [""],
      ["Daily Trade Velocity Trends"],
      ["Date", "Orders Count", "Revenue (GBP)"],
      ...chartData.map((d) => [d.day, d.orders, d.revenue]),
      [""],
      ["Produce Category Breakdown"],
      ["Category", "Products Listed", "Total Stock", "Growers", "Revenue (GBP)"],
      ...categories.map((c) => [c.category, c.products, c.totalStock, c.growers, c.revenue]),
      [""],
      ["Regional Market Hubs"],
      ["Region", "Active Farmers"],
      ...regionsList.map((r) => [r.region, r.farmers]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AgriConnect_Analytics_${days}days_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200/80" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200/70" />
      </div>
    );
  }

  if (isError && !data) {
    return (
      <Card className="rounded-2xl border-rose-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <Activity className="h-6 w-6" />
        </div>
        <h2 className="mt-3 text-lg font-black text-slate-800">Agricultural Analytics Temporarily Unavailable</h2>
        <p className="mt-1 text-xs text-slate-500">The platform intelligence telemetry stream could not be loaded.</p>
        <Button className="mt-4 rounded-xl bg-[#0d604e] text-xs font-bold text-white hover:bg-[#084c3e]" onClick={() => refetch()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reconnect Telemetry
        </Button>
      </Card>
    );
  }

  const gmvValue = summary?.gmv ?? summary?.revenue ?? 0;
  const totalFarmers = summary?.farmers ?? 0;
  const verifiedFarmers = summary?.verifiedFarmers ?? 0;
  const totalOrders = summary?.orders ?? 0;
  const totalProducts = summary?.products ?? 0;
  const totalRegions = summary?.regions ?? 0;
  const fulfillmentRate = data?.fulfillmentRate;
  const organicRatio = data?.organicRatio;

  const statusColors = ["#059669", "#84cc16", "#f59e0b", "#0284c7", "#8b5cf6", "#64748b"];

  return (
    <div className="space-y-5">
      {/* Top Banner & Control Station */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-900/15 bg-gradient-to-br from-[#053f36] via-[#094d42] to-[#12584c] p-5 text-white shadow-xl shadow-emerald-950/15">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-56 w-56 rounded-full bg-emerald-300/10 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-lime-400/30 bg-lime-400/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-lime-300 backdrop-blur-md">
                <Sprout className="h-3 w-3" /> AgriConnect Intelligence Suite
              </span>
              <span className="flex items-center gap-1 rounded-full border border-white/20 bg-black/25 px-2.5 py-0.5 text-[10px] font-bold text-white/90">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Live Telemetry Active
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Agricultural Analytics & Intelligence
            </h1>
            <p className="mt-1 max-w-2xl text-xs font-medium text-emerald-100/80">
              Live farm yield telemetry, market trade velocity, regional supply chains, and producer ecosystem health across all active agricultural zones.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 p-1 backdrop-blur-md">
              <span className="pl-2 text-[10px] font-bold uppercase tracking-wider text-white/70">Window:</span>
              {(["7", "30", "90"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setDays(option)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-black transition ${
                    days === option
                      ? "bg-lime-400 text-[#053f36] shadow-sm"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {option}d
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-9 rounded-xl border-white/20 bg-white/10 text-xs font-bold text-white backdrop-blur-md hover:bg-white/20"
              title="Refresh live telemetry stream"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Button
              onClick={exportCSV}
              className="h-9 rounded-xl bg-lime-400 px-3.5 text-xs font-black text-[#053f36] shadow-lg shadow-lime-950/20 hover:bg-lime-300"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export Report
            </Button>
          </div>
        </div>

        {/* Quick Highlights Bar */}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-[11px] sm:grid-cols-4">
          <div className="flex items-center gap-2 text-white/80">
            <ShieldCheck className="h-4 w-4 text-lime-300" />
            <span>Producer Verification: <b className="text-white">{Math.round((verifiedFarmers / Math.max(1, totalFarmers)) * 100)}%</b></span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <Truck className="h-4 w-4 text-emerald-300" />
            <span>Fulfillment rate: <b className="text-white">{fulfillmentRate == null ? "No data" : `${fulfillmentRate}%`}</b></span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <Leaf className="h-4 w-4 text-lime-300" />
            <span>Organic catalogue: <b className="text-white">{organicRatio == null ? "No data" : `${organicRatio}%`}</b></span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <Activity className="h-4 w-4 text-amber-300" />
            <span>Active sessions: <b className="text-white">{summary?.activeSessions ?? 0}</b></span>
          </div>
        </div>
      </div>

      {/* Top 6 Agrarian KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <AgrarianKpiCard
          label="Gross Agricultural Trade"
          value={money(gmvValue)}
          context={`${summary?.orders ?? 0} recorded orders`}
          sub="Database-recorded GMV"
          icon={DollarSign}
          tone="emerald"
        />
        <AgrarianKpiCard
          label="Registered Producers"
          value={compact(totalFarmers)}
          context={`${compact(verifiedFarmers)} verified`}
          sub="Registered farmer accounts"
          icon={Sprout}
          tone="lime"
        />
        <AgrarianKpiCard
          label="Harvest Orders Velocity"
          value={compact(totalOrders)}
          context={`${summary?.newOrders ?? 0} new this period`}
          sub="Persisted order records"
          icon={Tractor}
          tone="amber"
        />
        <AgrarianKpiCard
          label="Catalogue Produce"
          value={compact(totalProducts)}
          context={organicRatio == null ? "No organic metadata" : `${organicRatio}% organic`}
          sub="Approved catalogue products"
          icon={Leaf}
          tone="teal"
        />
        <AgrarianKpiCard
          label="Agricultural Hubs"
          value={`${totalRegions} Hubs`}
          context={`${regionsList.length} recorded regions`}
          sub="Configured market regions"
          icon={MapPin}
          tone="sky"
        />
        <AgrarianKpiCard
          label="Active Platform Users"
          value={compact(summary?.activeUsers ?? 0)}
          context={`${summary?.activeSessions ?? 0} active sessions`}
          sub="Authenticated activity"
          icon={Users}
          tone="mint"
        />
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-2">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "velocity", label: "Trade & Harvest Velocity", icon: TrendingUp },
            { id: "crops", label: "Crop Yields & Sectors", icon: Wheat },
            { id: "regional", label: "Regional Hubs & Logistics", icon: MapPin },
            { id: "growers", label: "Growers & Producers", icon: Users },
            { id: "almanac", label: "Demand Signals & Almanac", icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as never)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition ${
                  active
                    ? "bg-[#0d604e] text-white shadow-md shadow-emerald-950/15"
                    : "bg-white/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="hidden items-center gap-2 text-xs font-bold text-slate-500 md:flex">
          <Filter className="h-3.5 w-3.5 text-emerald-700" />
          <span>Active Window: <strong className="text-slate-800">Last {days} Days</strong></span>
        </div>
      </div>

      {/* TAB CONTENT 1: Trade & Harvest Velocity */}
      {activeTab === "velocity" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(16rem,0.95fr)]">
            {/* Main Interactive Chart */}
            <Card className="rounded-2xl border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md">
              <CardHeader className="flex-row items-start justify-between space-y-0 p-5 pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                    <CardTitle className="text-base font-black text-slate-900">
                      Produce Trade Velocity & Revenue Trajectory
                    </CardTitle>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Day-by-day throughput of recorded farm orders and monetary exchange in GBP.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1 text-[10px] font-bold">
                  {(["combined", "revenue", "orders"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setChartMetric(m)}
                      className={`rounded-md px-2 py-1 capitalize transition ${
                        chartMetric === m ? "bg-white text-emerald-800 shadow-xs" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-2">
                <div className="grid grid-cols-3 gap-2 pb-4 pt-1">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Daily Average GMV</span>
                    <p className="mt-0.5 text-lg font-black text-emerald-950">
                      {money(Math.round(gmvValue / (Number(days) || 30)))}
                    </p>
                    <span className="text-[9px] font-bold text-emerald-600">Per 24h operational window</span>
                  </div>
                  <div className="rounded-xl border border-lime-100 bg-lime-50/50 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-lime-800">Peak Order Day</span>
                    <p className="mt-0.5 text-lg font-black text-lime-950">
                      {Math.max(...chartData.map((d) => d.orders), 1)} orders
                    </p>
                    <span className="text-[9px] font-bold text-lime-700">Highest daily harvest draw</span>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Catalog Stock Units</span>
                    <p className="mt-0.5 text-lg font-black text-amber-950">
                      {compact((data?.categoryYields ?? []).reduce((sum, category) => sum + category.totalStock, 0))} units
                    </p>
                    <span className="text-[9px] font-bold text-amber-700">Current database inventory</span>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#84cc16" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#84cc16" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#f0f4f1" />
                      <XAxis
                        dataKey="formattedDay"
                        tickLine={false}
                        axisLine={false}
                        fontSize={10}
                        stroke="#64748b"
                      />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        tickLine={false}
                        axisLine={false}
                        fontSize={10}
                        stroke="#64748b"
                        tickFormatter={(v) => `£${compact(v)}`}
                        hide={chartMetric === "orders"}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        fontSize={10}
                        stroke="#84cc16"
                        hide={chartMetric === "revenue"}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 14,
                          border: "1px solid #d1fae5",
                          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                        formatter={(value, name) => [
                          name === "revenue" ? money(Number(value)) : `${value} units`,
                          name === "revenue" ? "Recorded Trade (£)" : "Harvest Orders",
                        ]}
                      />
                      {(chartMetric === "combined" || chartMetric === "revenue") && (
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="revenue"
                          stroke="#059669"
                          strokeWidth={2.5}
                          fill="url(#colorRevenue)"
                          name="revenue"
                        />
                      )}
                      {(chartMetric === "combined" || chartMetric === "orders") && (
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="orders"
                          stroke="#84cc16"
                          strokeWidth={2}
                          fill="url(#colorOrders)"
                          name="orders"
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {chartData.length === 0 && (
                  <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
                    No order or revenue trend records are available for this window.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Side Column: Order Pipeline & Fresh Picks Engine */}
            <div className="space-y-4">
              <Card className="rounded-2xl border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md">
                <CardHeader className="p-4 pb-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-black text-slate-900">Order Fulfillment Pipeline</CardTitle>
                    <Badge className="bg-emerald-100 text-[10px] font-bold text-emerald-800">
                      {compact(totalOrders)} Total
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-400">Live operational order lifecycle distribution</p>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="relative mx-auto h-40 w-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={orderStatuses}
                          dataKey="count"
                          nameKey="status"
                          innerRadius={50}
                          outerRadius={72}
                          paddingAngle={3}
                        >
                          {orderStatuses.map((entry, index) => (
                            <Cell key={entry.status} fill={statusColors[index % statusColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-slate-900">{compact(totalOrders)}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Orders</span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {orderStatuses.slice(0, 4).map((item, idx) => (
                      <div key={item.status} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 font-semibold capitalize text-slate-600">
                          <i
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: statusColors[idx % statusColors.length] }}
                          />
                          {item.status.replaceAll("_", " ")}
                        </span>
                        <b className="font-bold text-slate-900">{compact(item.count)}</b>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md">
                <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
                  <div>
                    <CardTitle className="text-sm font-black text-slate-900">Marketplace Ranking Configuration</CardTitle>
                    <p className="mt-0.5 text-[10px] text-slate-400">Persisted ranking rules</p>
                  </div>
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                    No marketplace ranking configuration is recorded for this analytics endpoint.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: Crop Yields & Sector Distribution */}
      {activeTab === "crops" && (
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-black text-slate-900">Agricultural Sector & Commodity Breakdown</h2>
              <p className="text-xs text-slate-500">
                Detailed inventory reserves, participating producers, and sales value across all 6 core agricultural domains.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Filter Sector:</span>
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm"
              >
                <option value="all">All Agricultural Sectors</option>
                <option value="grains">Grains & Cereals</option>
                <option value="produce">Fresh Produce & Greens</option>
                <option value="bio_fertilizers">Bio-Fertilizers & Biopesticides</option>
                <option value="bio_energy">Bio-Energy & Biomass</option>
                <option value="commercial">Commercial & Cash Crops</option>
                <option value="agritech">AgriTech & Smart Farming</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCategories.map((match) => {
              const key = match.category;
              const info = Object.entries(SECTOR_INFO).find(([sectorKey]) => key.toLowerCase().includes(sectorKey))?.[1] ?? {
                label: key.replaceAll("_", " "),
                icon: Package,
                color: "text-emerald-700",
                bg: "bg-emerald-50/80",
                border: "border-emerald-200",
                exampleCrops: "Recorded catalogue category",
              };
              const Icon = info.icon;
              const productCount = match.products;
              const stockUnits = match.totalStock;
              const growersCount = match.growers;
              const revenueVal = match.revenue;

              return (
                <Card
                  key={key}
                  className={`overflow-hidden rounded-2xl border ${info.border} bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
                >
                  <CardHeader className="flex-row items-start justify-between space-y-0 p-4 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`rounded-xl p-2.5 ${info.bg} ${info.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-black text-slate-900">{info.label}</CardTitle>
                        <p className="text-[10px] text-slate-400">{info.exampleCrops}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-black">
                      {compact(productCount)} SKUs
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4 pt-2">
                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400">Stock Reserves</span>
                        <p className="font-black text-slate-800">{compact(stockUnits)}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400">Growers</span>
                        <p className="font-black text-slate-800">{growersCount}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400">Trade Value</span>
                        <p className="font-black text-emerald-700">{money(revenueVal)}</p>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500">All values above are aggregated from current database records.</p>
                  </CardContent>
                </Card>
              );
            })}
            {filteredCategories.length === 0 && (
              <Card className="col-span-full rounded-2xl border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                No category analytics are available for the selected filter.
              </Card>
            )}
          </div>

          <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-black text-slate-900">
                Top Performing Agricultural Commodities
              </CardTitle>
              <p className="text-[10px] text-slate-400">Ranked by overall platform liquidity and stock velocity</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Commodity & Sector</th>
                      <th className="px-4 py-3">Catalogue SKUs</th>
                      <th className="px-4 py-3">Stock Units</th>
                      <th className="px-4 py-3">Participating Growers</th>
                      <th className="px-4 py-3">Gross Sales Value</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCategories.map((cat, idx) => (
                      <tr key={cat.category} className="hover:bg-emerald-50/30">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 font-mono text-[10px] font-black text-emerald-800">
                              0{idx + 1}
                            </span>
                            <div>
                              <strong className="block text-xs font-black capitalize text-slate-800">
                                {cat.category.replaceAll("_", " ")}
                              </strong>
                              <span className="text-[10px] text-slate-400">Agricultural Domain</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-700">{cat.products} products</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-600">{compact(cat.totalStock)} units</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-600">{cat.growers} farmers</td>
                        <td className="px-4 py-3.5 font-black text-emerald-800">{money(cat.revenue)}</td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Active Trade
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB CONTENT 3: Regional Hubs & Logistics Flow */}
      {activeTab === "regional" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="rounded-2xl border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Cold-Chain Dispatch</p>
                  <p className="text-xl font-black text-slate-900">No data</p>
                  <span className="text-[10px] text-slate-500">Dispatch telemetry is not recorded</span>
                </div>
              </div>
            </Card>
            <Card className="rounded-2xl border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cold-Chain Integrity</p>
                  <p className="text-xl font-black text-slate-900">No data</p>
                  <span className="text-[10px] text-slate-500">Temperature events are not recorded</span>
                </div>
              </div>
            </Card>
            <Card className="rounded-2xl border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Farm Proximity Radius</p>
                  <p className="text-xl font-black text-slate-900">No data</p>
                  <span className="text-[10px] text-slate-500">Route distance is not recorded</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
              <div>
                <CardTitle className="text-sm font-black text-slate-900">Regional Agricultural Hubs & Trade Flow</CardTitle>
                <p className="text-[10px] text-slate-400">Active grower clusters and logistics corridor performance</p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800">{regionsList.length} Active Zones</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Agricultural Zone / Region</th>
                      <th className="px-4 py-3">Active Producers</th>
                      <th className="px-4 py-3">Market Share</th>
                      <th className="px-4 py-3">Logistics Route SLA</th>
                      <th className="px-4 py-3 text-right">Operational Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {regionsList.map((r) => {
                      const maxFarmers = Math.max(...regionsList.map((item) => item.farmers), 1);
                      const share = Math.round((r.farmers / maxFarmers) * 100);
                      return (
                        <tr key={r.region} className="hover:bg-emerald-50/30">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                              <strong className="text-xs font-bold text-slate-800">{r.region}</strong>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-700">{r.farmers} growers</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <Progress value={share} className="h-1.5 w-24 bg-slate-100" />
                              <span className="text-[10px] font-bold text-slate-600">{share}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-slate-400">—</td>
                          <td className="px-4 py-3.5 text-right">
                            <Badge className="bg-emerald-100 text-[10px] font-black text-emerald-800">
                              Recorded
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                    {regionsList.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No regional records are available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB CONTENT 4: Growers & Producers */}
      {activeTab === "growers" && (
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-black text-slate-900">Producer & Cooperative Ecosystem</h2>
              <p className="text-xs text-slate-500">
                Performance rankings, verification compliance status, and grower onboarding momentum.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => onNavigate("farmers")}
              className="h-9 rounded-xl border-slate-200 bg-white text-xs font-bold text-emerald-800 hover:bg-emerald-50"
            >
              Open Farmers Management Centre <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-black text-slate-900">Top Verified Producers</CardTitle>
                <p className="text-[10px] text-slate-400">Ranked by volume, quality rating, and fulfillment consistency</p>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100 p-4 pt-0">
                {topFarmersList.map((farmer, idx) => (
                  <div key={farmer.id} className="flex items-center gap-3 py-3">
                    <span className="w-4 text-xs font-black text-slate-400">{idx + 1}</span>
                    <Avatar className="h-9 w-9 border border-emerald-100">
                      <AvatarImage src={farmer.avatar} />
                      <AvatarFallback className="bg-emerald-100 text-[10px] font-black text-emerald-800">
                        {initials(farmer.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-800">{farmer.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="font-bold text-amber-600">★ {farmer.rating.toFixed(1)}</span>
                        <span>·</span>
                        <span>{farmer.products} products listed</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-black text-emerald-800">{money(farmer.revenue)}</span>
                      <span className="text-[9px] font-semibold text-slate-400">Total Trade</span>
                    </div>
                  </div>
                ))}
                {topFarmersList.length === 0 && (
                  <p className="py-8 text-center text-xs text-slate-500">No verified producer performance records are available.</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-black text-slate-900">Verification & Compliance Pipeline</CardTitle>
                <p className="text-[10px] text-slate-400">Producer authentication, soil audit, and organic certification</p>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-1">
                {[
                  { label: "Account Verification", count: verifiedFarmers, total: totalFarmers, status: "Database status" },
                ].map((audit) => {
                  const pct = Math.round((audit.count / Math.max(1, audit.total)) * 100);
                  return (
                    <div key={audit.label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">{audit.label}</span>
                        <Badge className="bg-emerald-100 text-[9px] font-bold text-emerald-800">{audit.status}</Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                        <span>{audit.count} of {audit.total} growers certified</span>
                        <span className="font-black text-emerald-700">{pct}%</span>
                      </div>
                      <Progress value={pct} className="mt-1 h-1.5 bg-slate-200/70" />
                    </div>
                  );
                })}
                {totalFarmers === 0 && <p className="py-4 text-center text-xs text-slate-500">No farmer accounts are recorded.</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: Demand Signals & Almanac */}
      {activeTab === "almanac" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,1fr)]">
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
              <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
                <div>
                  <CardTitle className="text-sm font-black text-slate-900">Active Local Demand Signals</CardTitle>
                  <p className="text-[10px] text-slate-400">Direct buyer requests & urgent procurement opportunities</p>
                </div>
                <Badge className="bg-amber-100 text-[10px] font-black text-amber-800">
                  {localDemandList.length} Live Alerts
                </Badge>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100 p-4 pt-0">
                {localDemandList.map((demand) => (
                  <div key={demand.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-slate-800">{demand.productName}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                            demand.urgency === "high"
                              ? "bg-rose-100 text-rose-700"
                              : demand.urgency === "medium"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {demand.urgency} Urgency
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {demand.quantity} {demand.unit} · {demand.location} · Requested by {demand.buyerName || "—"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onNavigate("opportunities")}
                      className="h-8 rounded-lg text-[10px] font-bold text-emerald-800 hover:bg-emerald-50"
                    >
                      Match Grower
                    </Button>
                  </div>
                ))}
                {localDemandList.length === 0 && (
                  <p className="py-8 text-center text-xs text-slate-500">No active local demand records are available.</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-black text-slate-900">Seasonal Harvest Almanac</CardTitle>
                <p className="text-[10px] text-slate-400">Crop cycle phases & harvest calendar guidance</p>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                  No seasonal crop-cycle or climate telemetry is stored in the current backend.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* System Telemetry & Provenance Footer */}
      <div className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <TelemetryBadge icon={CheckCircle2} label="Data Provenance" value="Live PostgreSQL Telemetry" tone="green" />
        <TelemetryBadge icon={DollarSign} label="Financial Scope" value="GBP Recorded Settlements" tone="blue" />
        <TelemetryBadge icon={ShieldCheck} label="Access Boundary" value="Super Admin Platform Auth" tone="purple" />
        <TelemetryBadge icon={Users} label="Active Sessions" value={`${summary?.activeSessions || 0} active administrators`} tone="orange" />
        <TelemetryBadge icon={Droplets} label="Generated At" value={data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : "No data"} tone="lime" />
      </div>
    </div>
  );
}

function AgrarianKpiCard({
  label,
  value,
  context,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  context: string;
  sub: string;
  icon: LucideIcon;
  tone: "emerald" | "lime" | "amber" | "teal" | "sky" | "mint";
}) {
  const tones = {
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
    lime: { bg: "bg-lime-50", text: "text-lime-700", border: "border-lime-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
    teal: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-100" },
    sky: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-100" },
    mint: { bg: "bg-emerald-50", text: "text-teal-700", border: "border-teal-100" },
  };

  const currentTone = tones[tone];

  return (
    <Card className={`overflow-hidden rounded-2xl border ${currentTone.border} bg-white/90 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}>
      <CardContent className="p-3.5">
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-400">{label}</span>
            <p className="mt-1 truncate text-xl font-black tracking-tight text-slate-900">{value}</p>
          </div>
          <div className={`rounded-xl p-2 ${currentTone.bg} ${currentTone.text}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-emerald-700">
          <ArrowUpRight className="h-3 w-3 shrink-0" />
          <span className="truncate">{context}</span>
        </div>
        <p className="mt-0.5 truncate text-[9px] text-slate-400">{sub}</p>
      </CardContent>
    </Card>
  );
}

function TelemetryBadge({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: string;
}) {
  const tones: Record<string, string> = {
    green: "text-emerald-600 bg-emerald-50",
    blue: "text-blue-600 bg-blue-50",
    purple: "text-violet-600 bg-violet-50",
    orange: "text-orange-600 bg-orange-50",
    lime: "text-lime-700 bg-lime-50",
  };

  return (
    <div className="flex items-center gap-3 px-2 py-1">
      <div className={`rounded-xl p-2 ${tones[tone] || tones.green}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400">{label}</p>
        <p className="truncate text-[11px] font-black text-slate-700">{value}</p>
      </div>
    </div>
  );
}
