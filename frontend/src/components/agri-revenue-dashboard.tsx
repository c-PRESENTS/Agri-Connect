import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Filter,
  Flame,
  HelpCircle,
  History,
  Layers,
  Leaf,
  LineChart,
  Lock,
  MapPin,
  Package,
  PiggyBank,
  Receipt,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Sprout,
  Store,
  Tractor,
  Trees,
  TrendingUp,
  Truck,
  Users,
  Wallet,
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
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export type AdminSection =
  | "overview" | "users" | "farmers" | "sellers" | "buyers" | "students" | "researchers"
  | "service-providers" | "logistics-partners" | "organisations" | "employees" | "products"
  | "categories" | "verification" | "regions" | "opportunities" | "content" | "orders"
  | "logistics" | "analytics" | "revenue" | "data" | "security" | "audit" | "settings" | "global-operations";

type CurrencySummary = {
  id: string;
  name: string;
  currency: string;
  orders: number;
  grossMinor: string;
  refundedMinor: string;
  subtotalMinor?: string;
  deliveryMinor?: string;
  status: string;
};

type RevenueResponse = {
  currencies: CurrencySummary[];
  summary: {
    totalOrders: number;
    validOrders: number;
    settledOrders: number;
    grossMinor: number;
    subtotalMinor: number;
    deliveryMinor: number;
    refundedMinor: number;
    producerNetMinor: number;
    platformFeeMinor: number;
  };
  escrowAllocations?: Array<{
    currency: string;
    status: string;
    count: number;
    sellerNetMinor: string;
    platformFeeMinor: string;
    refundedMinor: string;
  }>;
  dailyTrends?: Array<{
    day: string;
    currency: string;
    orders: number;
    grossMinor: number;
    subtotalMinor: number;
    deliveryMinor: number;
    platformFeeMinor: number;
    producerNetMinor: number;
  }>;
  sectorTurnover?: Array<{
    categoryId: string;
    currency: string;
    itemsSold: number;
    unitsSold: number;
    grossMinor: number;
    producerShareMinor: number | null;
    platformFeeMinor: number | null;
  }>;
  topFarmerEarners?: Array<{
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    location?: string;
    currency: string;
    ordersCount: number;
    grossMinor: number;
    netEarningsMinor: number;
    status: string;
  }>;
  recentTransactions?: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    currency: string;
    totalMinor: number;
    subtotalMinor: number;
    deliveryFeeMinor: number;
    producerNetMinor: number;
    buyerName: string;
    buyerEmail?: string;
    sellerName: string;
    createdAt: string;
  }>;
  gatewayPerformance?: Array<{
    provider: string;
    paymentStatus: string;
    currency: string;
    count: number;
    totalAmountMinor: number;
  }>;
  reportingWindowDays: number;
  selectedCurrency: string;
  generatedAt: string;
};

function formatMoney(amountMinor: number, currency: string = "GBP"): string {
  const code = currency.toUpperCase();
  const major = amountMinor / 100;
  if (code === "INR") {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(major);
  }
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(major);
}

function formatCompactMoney(amountMinor: number, currency: string = "GBP"): string {
  const code = currency.toUpperCase();
  const major = amountMinor / 100;
  if (code === "INR") {
    return `₹${new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(major)}`;
  }
  return `£${new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(major)}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

function initials(value: string) {
  return value
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AG";
}

const CATEGORY_NAMES: Record<string, { label: string; sector: string }> = {
  "fresh-produce": { label: "Fresh Produce & Greens", sector: "Horticulture" },
  "inputs-tools": { label: "Bio-Inputs & Ag Tools", sector: "Farm Inputs" },
  "dietary": { label: "Organic Cereals & Pulses", sector: "Staple Crops" },
  "modern-farming": { label: "AgriTech & Smart Farming", sector: "Equipment" },
  "specialty": { label: "Specialty & Cash Crops", sector: "Commercial" },
  "livestock": { label: "Livestock & Dairy Care", sector: "Animal Husbandry" },
  "other-agri": { label: "Bio-Energy & Biomass", sector: "Renewable Feedstock" },
  "processed": { label: "Value-Added Farm Goods", sector: "Agro-Processing" },
  "supermarket": { label: "Bulk Wholesale Produce", sector: "Commercial Trade" },
  "daily-needs": { label: "Farm Fresh Essentials", sector: "Daily Harvest" },
  "commercial_crops": { label: "Commercial Cash Crops", sector: "Commodity Trade" },
  "bio_fertilizers": { label: "Bio-Fertilizers & Biopesticides", sector: "Agronomy" },
  "agricultural_produce": { label: "General Agricultural Produce", sector: "Farm Gate" },
};

export function AgriRevenueDashboard({ onNavigate }: { onNavigate: (section: AdminSection) => void }) {
  const [days, setDays] = useState("30");
  const [selectedCurrency, setSelectedCurrency] = useState<"all" | "GBP" | "INR">("all");
  const [activeTab, setActiveTab] = useState<"velocity" | "sectors" | "growers" | "journal">("velocity");
  const [journalSearch, setJournalSearch] = useState("");
  const [journalFilter, setJournalFilter] = useState("all");

  const endpoint = `/api/admin/revenue?days=${days}&currency=${selectedCurrency}`;
  const { data, isLoading, isError, isFetching, refetch } = useQuery<RevenueResponse>({
    queryKey: [endpoint],
    staleTime: 15_000,
  });

  const currencies = data?.currencies ?? [];
  const gbpRecord = currencies.find((c) => c.currency === "GBP");
  const inrRecord = currencies.find((c) => c.currency === "INR");

  const gbpGrossMinor = Number(gbpRecord?.grossMinor || 0);
  const inrGrossMinor = Number(inrRecord?.grossMinor || 0);
  const gbpOrders = gbpRecord?.orders || 0;
  const inrOrders = inrRecord?.orders || 0;

  // Selected Scope Totals
  const scopeOrders = selectedCurrency === "GBP" ? gbpOrders : selectedCurrency === "INR" ? inrOrders : gbpOrders + inrOrders;
  const primaryCurrencyCode = selectedCurrency === "INR" ? "INR" : "GBP";

  const totalGmvDisplay = useMemo(() => {
    if (selectedCurrency === "GBP") return formatMoney(gbpGrossMinor, "GBP");
    if (selectedCurrency === "INR") return formatMoney(inrGrossMinor, "INR");
    return `${formatMoney(gbpGrossMinor, "GBP")} + ${formatMoney(inrGrossMinor, "INR")}`;
  }, [selectedCurrency, gbpGrossMinor, inrGrossMinor]);

  const producerNetDisplay = useMemo(() => {
    const gbpNet = (data?.escrowAllocations ?? []).filter((item) => item.currency === "GBP").reduce((sum, item) => sum + Number(item.sellerNetMinor), 0);
    const inrNet = (data?.escrowAllocations ?? []).filter((item) => item.currency === "INR").reduce((sum, item) => sum + Number(item.sellerNetMinor), 0);
    if (selectedCurrency === "GBP") return formatMoney(gbpNet, "GBP");
    if (selectedCurrency === "INR") return formatMoney(inrNet, "INR");
    return `${formatMoney(gbpNet, "GBP")} + ${formatMoney(inrNet, "INR")}`;
  }, [data?.escrowAllocations, selectedCurrency]);

  const platformFeeDisplay = useMemo(() => {
    const gbpFee = (data?.escrowAllocations ?? []).filter((item) => item.currency === "GBP").reduce((sum, item) => sum + Number(item.platformFeeMinor), 0);
    const inrFee = (data?.escrowAllocations ?? []).filter((item) => item.currency === "INR").reduce((sum, item) => sum + Number(item.platformFeeMinor), 0);
    if (selectedCurrency === "GBP") return formatMoney(gbpFee, "GBP");
    if (selectedCurrency === "INR") return formatMoney(inrFee, "INR");
    return `${formatMoney(gbpFee, "GBP")} + ${formatMoney(inrFee, "INR")}`;
  }, [data?.escrowAllocations, selectedCurrency]);

  // Escrow Calculations
  const escrowAllocations = data?.escrowAllocations ?? [];
  const gbpEscrowMinor = escrowAllocations
    .filter((a) => a.currency === "GBP" && a.status === "held")
    .reduce((sum, a) => sum + Number(a.sellerNetMinor), 0);
  const inrEscrowMinor = escrowAllocations
    .filter((a) => a.currency === "INR" && a.status === "held")
    .reduce((sum, a) => sum + Number(a.sellerNetMinor), 0);

  const escrowDisplay = useMemo(() => {
    if (selectedCurrency === "GBP") return formatMoney(gbpEscrowMinor, "GBP");
    if (selectedCurrency === "INR") return formatMoney(inrEscrowMinor, "INR");
    return `${formatMoney(gbpEscrowMinor, "GBP")} + ${formatMoney(inrEscrowMinor, "INR")}`;
  }, [selectedCurrency, gbpEscrowMinor, inrEscrowMinor]);

  // Average Order Value
  const aovDisplay = useMemo(() => {
    if (selectedCurrency === "GBP") {
      const avg = gbpOrders > 0 ? gbpGrossMinor / gbpOrders : 0;
      return formatMoney(avg, "GBP");
    }
    if (selectedCurrency === "INR") {
      const avg = inrOrders > 0 ? inrGrossMinor / inrOrders : 0;
      return formatMoney(avg, "INR");
    }
    const avgGbp = gbpOrders > 0 ? gbpGrossMinor / gbpOrders : 0;
    return `~${formatMoney(avgGbp, "GBP")} / order`;
  }, [selectedCurrency, gbpOrders, inrOrders, gbpGrossMinor, inrGrossMinor]);

  // Time Series Chart Data
  const chartData = useMemo(() => {
    const trends = data?.dailyTrends ?? [];
    const filtered = selectedCurrency === "all" ? trends : trends.filter((t) => t.currency === selectedCurrency);

    if (filtered.length > 0) {
      // Group by day if multiple currencies
      const grouped: Record<string, { day: string; formattedDay: string; grossGBP: number; grossINR: number; orders: number; producerNet: number }> = {};
      for (const item of filtered) {
        if (!grouped[item.day]) {
          grouped[item.day] = {
            day: item.day,
            formattedDay: item.day.length >= 10 ? item.day.slice(5) : item.day,
            grossGBP: 0,
            grossINR: 0,
            orders: 0,
            producerNet: 0,
          };
        }
        if (item.currency === "GBP") grouped[item.day].grossGBP += item.grossMinor / 100;
        if (item.currency === "INR") grouped[item.day].grossINR += item.grossMinor / 100;
        grouped[item.day].orders += item.orders;
        grouped[item.day].producerNet += item.producerNetMinor / 100;
      }
      return Object.values(grouped);
    }

    return [];
  }, [data?.dailyTrends, selectedCurrency]);

  // Sector Breakdown
  const sectors = useMemo(() => {
    const list = data?.sectorTurnover ?? [];
    if (selectedCurrency === "all") return list;
    return list.filter((s) => s.currency === selectedCurrency);
  }, [data?.sectorTurnover, selectedCurrency]);

  // Top Growers Ledger
  const topGrowers = useMemo(() => {
    const list = data?.topFarmerEarners ?? [];
    if (selectedCurrency === "all") return list;
    return list.filter((g) => g.currency === selectedCurrency);
  }, [data?.topFarmerEarners, selectedCurrency]);

  // Real Transactions Journal
  const transactions = useMemo(() => {
    const list = data?.recentTransactions ?? [];
    return list.filter((tx) => {
      if (selectedCurrency !== "all" && tx.currency !== selectedCurrency) return false;
      if (journalFilter !== "all" && tx.status !== journalFilter && tx.paymentStatus !== journalFilter) return false;
      if (journalSearch.trim()) {
        const q = journalSearch.toLowerCase();
        return (
          tx.orderNumber.toLowerCase().includes(q) ||
          tx.buyerName.toLowerCase().includes(q) ||
          tx.sellerName.toLowerCase().includes(q) ||
          (tx.buyerEmail && tx.buyerEmail.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [data?.recentTransactions, selectedCurrency, journalFilter, journalSearch]);

  // Gateway Performance
  const gateways = useMemo(() => {
    return data?.gatewayPerformance ?? [];
  }, [data?.gatewayPerformance]);

  const exportCSV = () => {
    const rows = [
      ["AgriConnect Agricultural Financial & Settlement Audit Export"],
      ["Generated At", new Date().toISOString()],
      ["Reporting Window", `Last ${days} days`],
      ["Currency Scope", selectedCurrency.toUpperCase()],
      [""],
      ["Executive Settlement Summary"],
      ["GBP Recorded Gross Orders", formatMoney(gbpGrossMinor, "GBP")],
      ["INR Recorded Gross Orders", formatMoney(inrGrossMinor, "INR")],
      ["Total Recorded Orders", scopeOrders],
      ["Recorded Producer Allocations", data?.summary.producerNetMinor ?? 0],
      ["Recorded Platform Fees", data?.summary.platformFeeMinor ?? 0],
      ["Protected Escrow Balance (GBP)", formatMoney(gbpEscrowMinor, "GBP")],
      ["Protected Escrow Balance (INR)", formatMoney(inrEscrowMinor, "INR")],
      [""],
      ["Commodity Sector Revenue Breakdown"],
      ["Category", "Currency", "Items Sold", "Volume Units", "Gross Minor", "Gross Major", "Farmer Share (£/₹)"],
      ...sectors.map((s) => [
        CATEGORY_NAMES[s.categoryId]?.label || s.categoryId,
        s.currency,
        s.itemsSold,
        s.unitsSold,
        s.grossMinor,
        (s.grossMinor / 100).toFixed(2),
        s.producerShareMinor == null ? "" : (s.producerShareMinor / 100).toFixed(2),
      ]),
      [""],
      ["Top Producer Settlement Ledger"],
      ["Farmer Name", "Location", "Currency", "Fulfilled Orders", "Gross Total", "Net Farmer Payout", "Settlement Status"],
      ...topGrowers.map((g) => [
        g.name,
        g.location,
        g.currency,
        g.ordersCount,
        (g.grossMinor / 100).toFixed(2),
        (g.netEarningsMinor / 100).toFixed(2),
        g.status,
      ]),
      [""],
      ["Recent Authoritative Order Transactions"],
      ["Order Number", "Buyer", "Primary Farm", "Currency", "Gross Total", "Farmer Net", "Delivery Fee", "Payment Method", "Status", "Timestamp"],
      ...transactions.map((t) => [
        t.orderNumber,
        t.buyerName,
        t.sellerName,
        t.currency,
        (t.totalMinor / 100).toFixed(2),
        (t.producerNetMinor / 100).toFixed(2),
        (t.deliveryFeeMinor / 100).toFixed(2),
        t.paymentMethod,
        t.status,
        t.createdAt,
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AgriConnect_Revenue_Audit_${selectedCurrency}_${days}d_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200/80" />
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
        <h2 className="mt-3 text-lg font-black text-slate-800">Financial Telemetry Stream Unavailable</h2>
        <p className="mt-1 text-xs text-slate-500">The authoritative settlement ledger could not be connected.</p>
        <Button className="mt-4 rounded-xl bg-[#0d604e] text-xs font-bold text-white hover:bg-[#084c3e]" onClick={() => refetch()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reconnect Ledger
        </Button>
      </Card>
    );
  }

  const settlementColors = ["#059669", "#84cc16", "#f59e0b", "#ef4444", "#0284c7"];
  const settlementDonut = escrowAllocations.map((allocation, index) => ({
    name: allocation.status.replaceAll("_", " "),
    value: allocation.count,
    color: settlementColors[index % settlementColors.length],
  }));
  const allocationCount = escrowAllocations.reduce((sum, allocation) => sum + allocation.count, 0);
  const grossMinor = data?.summary.grossMinor ?? 0;
  const producerPayoutRate = selectedCurrency !== "all" && grossMinor > 0 ? ((data?.summary.producerNetMinor ?? 0) / grossMinor) * 100 : null;
  const refundRate = selectedCurrency !== "all" && grossMinor > 0 ? ((data?.summary.refundedMinor ?? 0) / grossMinor) * 100 : null;

  return (
    <div className="space-y-5">
      {/* Top Banner & Financial Command Centre */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-900/15 bg-gradient-to-br from-[#064238] via-[#094d42] to-[#12584c] p-5 text-white shadow-xl shadow-emerald-950/15">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-56 w-56 rounded-full bg-emerald-300/10 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-lime-400/30 bg-lime-400/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-lime-300 backdrop-blur-md">
                <PiggyBank className="h-3 w-3" /> Escrow-Protected Settlement Engine
              </span>
              <span className="flex items-center gap-1 rounded-full border border-white/20 bg-black/25 px-2.5 py-0.5 text-[10px] font-bold text-white/90">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Authoritative PostgreSQL Ledger
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Agricultural Revenue & Settlement Command
            </h1>
            <p className="mt-1 max-w-2xl text-xs font-medium text-emerald-100/80">
              Real-time farm-gate transactions, automated producer escrow allocations, multi-currency trade flows, and financial audit reconciliation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Currency Selector */}
            <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-white/10 p-1 backdrop-blur-md">
              <span className="pl-2 text-[10px] font-bold uppercase tracking-wider text-white/70">Currency:</span>
              {(["all", "GBP", "INR"] as const).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setSelectedCurrency(curr)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-black transition ${
                    selectedCurrency === curr
                      ? "bg-lime-400 text-[#053f36] shadow-sm"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {curr === "all" ? "All" : curr === "GBP" ? "GBP (£)" : "INR (₹)"}
                </button>
              ))}
            </div>

            {/* Window Selector */}
            <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-white/10 p-1 backdrop-blur-md">
              <span className="pl-2 text-[10px] font-bold uppercase tracking-wider text-white/70">Window:</span>
              {(["7", "30", "90"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setDays(option)}
                  className={`rounded-lg px-2 py-1 text-xs font-black transition ${
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
              title="Refresh ledger stream"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Button
              onClick={exportCSV}
              className="h-9 rounded-xl bg-lime-400 px-3.5 text-xs font-black text-[#053f36] shadow-lg shadow-lime-950/20 hover:bg-lime-300"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Financial Audit Export
            </Button>
          </div>
        </div>

        {/* Financial Highlights Ribbon */}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-[11px] sm:grid-cols-4">
          <div className="flex items-center gap-2 text-white/80">
            <BadgeCheck className="h-4 w-4 text-lime-300" />
            <span>Producer allocation rate: <b className="text-white">{producerPayoutRate == null ? "No data" : `${producerPayoutRate.toFixed(1)}%`}</b></span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <Lock className="h-4 w-4 text-emerald-300" />
            <span>Protected allocations: <b className="text-white">{allocationCount}</b></span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <Scale className="h-4 w-4 text-amber-300" />
            <span>Recorded refund rate: <b className="text-white">{refundRate == null ? "No data" : `${refundRate.toFixed(1)}%`}</b></span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <Clock className="h-4 w-4 text-lime-300" />
            <span>Settled orders: <b className="text-white">{data?.summary.settledOrders ?? 0}</b></span>
          </div>
        </div>
      </div>

      {/* Top 6 Agrarian Financial KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <FinancialKpiCard
          label="Gross Agricultural GMV"
          value={totalGmvDisplay}
          context={`${scopeOrders} total harvest orders`}
          sub="Recorded trade turnover"
          icon={DollarSign}
          tone="emerald"
        />
        <FinancialKpiCard
          label="Direct Producer Payouts"
          value={producerNetDisplay}
          context={allocationCount ? `${allocationCount} allocation records` : "No allocations"}
          sub="Recorded seller-net allocations"
          icon={Sprout}
          tone="lime"
        />
        <FinancialKpiCard
          label="Protected Escrow Reserves"
          value={escrowDisplay}
          context="Held in safe escrow"
          sub="Awaiting delivery sign-off"
          icon={Lock}
          tone="amber"
        />
        <FinancialKpiCard
          label="Platform & Co-op Share"
          value={platformFeeDisplay}
          context={allocationCount ? "Recorded allocation fees" : "No allocation fees"}
          sub="Persisted platform fees"
          icon={Building2}
          tone="teal"
        />
        <FinancialKpiCard
          label="Recorded Farm Orders"
          value={`${scopeOrders} Orders`}
          context={`${data?.summary?.settledOrders ?? 0} settled & paid`}
          sub="Non-cancelled transactions"
          icon={ShoppingCart}
          tone="sky"
        />
        <FinancialKpiCard
          label="Avg Harvest Order Value"
          value={aovDisplay}
          context="Per fulfilled transaction"
          sub="Standard basket ticket"
          icon={Receipt}
          tone="mint"
        />
      </div>

      {/* Financial Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-2">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "velocity", label: "Cash Velocity & Trajectory", icon: TrendingUp },
            { id: "sectors", label: "Commodity Sector Turnover", icon: Wheat },
            { id: "growers", label: "Producer Settlement Ledger", icon: Users },
            { id: "journal", label: "Live Order Journal", icon: History },
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
          <span>Active Scope: <strong className="text-slate-800">{selectedCurrency.toUpperCase()} · Last {days} Days</strong></span>
        </div>
      </div>

      {/* TAB CONTENT 1: Cash Velocity & Escrow Trajectory */}
      {activeTab === "velocity" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(16rem,0.95fr)]">
            {/* Main Interactive Recharts Chart */}
            <Card className="rounded-2xl border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md">
              <CardHeader className="flex-row items-start justify-between space-y-0 p-5 pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                    <CardTitle className="text-base font-black text-slate-900">
                      Farm Trade Volume & Net Producer Payout Trajectory
                    </CardTitle>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Real-time timeline of gross merchandise volume and net farmer payouts recorded in PostgreSQL.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <i className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Gross Trade (£/₹)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="h-2.5 w-2.5 rounded-full bg-lime-500" /> Recorded Farmer Net
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-2">
                <div className="grid grid-cols-3 gap-2 pb-4 pt-1">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Gross Trade (GBP)</span>
                    <p className="mt-0.5 text-lg font-black text-emerald-950">{formatMoney(gbpGrossMinor, "GBP")}</p>
                    <span className="text-[9px] font-bold text-emerald-600">{gbpOrders} orders recorded</span>
                  </div>
                  <div className="rounded-xl border border-lime-100 bg-lime-50/50 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-lime-800">Gross Trade (INR)</span>
                    <p className="mt-0.5 text-lg font-black text-lime-950">{formatMoney(inrGrossMinor, "INR")}</p>
                    <span className="text-[9px] font-bold text-lime-700">{inrOrders} orders recorded</span>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Total Valid Orders</span>
                    <p className="mt-0.5 text-lg font-black text-amber-950">{scopeOrders} Orders</p>
                    <span className="text-[9px] font-bold text-amber-700">Database order records</span>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#84cc16" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#84cc16" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#f0f4f1" />
                      <XAxis dataKey="formattedDay" tickLine={false} axisLine={false} fontSize={10} stroke="#64748b" />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        fontSize={10}
                        stroke="#64748b"
                        tickFormatter={(v) => (selectedCurrency === "INR" ? `₹${formatNumber(v)}` : `£${formatNumber(v)}`)}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 14,
                          border: "1px solid #d1fae5",
                          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                        formatter={(val, name) => [
                          selectedCurrency === "INR" ? `₹${formatNumber(Number(val))}` : `£${formatNumber(Number(val))}`,
                          name === "grossGBP" || name === "grossINR" ? "Gross Farm Trade" : "Net Farmer Payout",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey={selectedCurrency === "INR" ? "grossINR" : "grossGBP"}
                        stroke="#059669"
                        strokeWidth={2.5}
                        fill="url(#colorGross)"
                        name={selectedCurrency === "INR" ? "grossINR" : "grossGBP"}
                      />
                      <Area
                        type="monotone"
                        dataKey="producerNet"
                        stroke="#84cc16"
                        strokeWidth={2}
                        fill="url(#colorNet)"
                        name="producerNet"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {chartData.length === 0 && (
                  <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
                    No order or allocation trends are available for this window.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Side Column: Settlement Lifecycle & Protection Telemetry */}
            <div className="space-y-4">
              <Card className="rounded-2xl border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md">
                <CardHeader className="p-4 pb-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-black text-slate-900">Settlement Lifecycle</CardTitle>
                    <Badge className="bg-emerald-100 text-[10px] font-bold text-emerald-800">
                      Live Escrow
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-400">Funds distribution and escrow states</p>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="relative mx-auto h-40 w-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={settlementDonut}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={72}
                          paddingAngle={3}
                        >
                          {settlementDonut.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-black text-slate-900">{allocationCount}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Allocations</span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {settlementDonut.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 font-semibold text-slate-600">
                          <i className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                          {item.name}
                        </span>
                        <b className="font-bold text-slate-900">{item.value}</b>
                      </div>
                    ))}
                    {settlementDonut.length === 0 && <p className="py-3 text-center text-xs text-slate-500">No protected allocation records.</p>}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md">
                <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-2">
                  <div>
                    <CardTitle className="text-sm font-black text-slate-900">Settlement Data Coverage</CardTitle>
                    <p className="mt-0.5 text-[10px] text-slate-400">Persisted payment and allocation records</p>
                  </div>
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                    {allocationCount > 0
                      ? `${allocationCount} protected allocation records are included in this reporting scope.`
                      : "No escrow or producer allocation records exist for this reporting scope."}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: Commodity Sector Turnover */}
      {activeTab === "sectors" && (
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-black text-slate-900">Commodity Sector & Crop Category Revenue</h2>
              <p className="text-xs text-slate-500">
                Authoritative transaction breakdown grouped by crop categories directly from sold line items.
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-bold text-emerald-800">
              {sectors.length} Active Crop Categories
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sectors.slice(0, 6).map((sector) => {
              const info = CATEGORY_NAMES[sector.categoryId] || { label: sector.categoryId.replaceAll("-", " "), sector: "General Agriculture" };
              const grossFmt = formatMoney(sector.grossMinor, sector.currency);
              const farmerFmt = sector.producerShareMinor == null ? "No allocation" : formatMoney(sector.producerShareMinor, sector.currency);

              return (
                <Card key={`${sector.categoryId}-${sector.currency}`} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md">
                  <CardHeader className="flex-row items-start justify-between space-y-0 p-4 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                        <Wheat className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-black text-slate-900 capitalize">{info.label}</CardTitle>
                        <p className="text-[10px] text-slate-400">{info.sector} · {sector.currency}</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-[9px] font-black text-emerald-800">
                      {sector.itemsSold} items sold
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4 pt-2">
                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 text-center">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400">Gross Sales</span>
                        <p className="font-black text-slate-800">{grossFmt}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400">Recorded Grower Payout</span>
                        <p className="font-black text-emerald-700">{farmerFmt}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-500">Volume Output</span>
                        <span className="text-emerald-700">{sector.unitsSold} units shipped</span>
                      </div>
                      <p className="text-[9px] text-slate-400">Database-recorded order item quantity</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {sectors.length === 0 && (
              <Card className="col-span-full rounded-2xl border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No sector turnover records are available.</Card>
            )}
          </div>

          <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-black text-slate-900">
                Complete Sector Revenue & Allocation Breakdown
              </CardTitle>
              <p className="text-[10px] text-slate-400">Server-authoritative sums from database order items</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Crop / Commodity Domain</th>
                      <th className="px-4 py-3">Currency</th>
                      <th className="px-4 py-3">Items Sold</th>
                      <th className="px-4 py-3">Units Output</th>
                      <th className="px-4 py-3">Gross Turnover</th>
                      <th className="px-4 py-3">Direct Farmer Share</th>
                      <th className="px-4 py-3 text-right">Settlement State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sectors.map((s, idx) => {
                      const info = CATEGORY_NAMES[s.categoryId] || { label: s.categoryId.replaceAll("-", " "), sector: "General Agriculture" };
                      return (
                        <tr key={`${s.categoryId}-${s.currency}-${idx}`} className="hover:bg-emerald-50/30">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 font-mono text-[10px] font-black text-emerald-800">
                                0{idx + 1}
                              </span>
                              <div>
                                <strong className="block text-xs font-black capitalize text-slate-800">
                                  {info.label}
                                </strong>
                                <span className="text-[10px] text-slate-400">{info.sector}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-600">{s.currency}</td>
                          <td className="px-4 py-3.5 font-semibold text-slate-700">{s.itemsSold} items</td>
                          <td className="px-4 py-3.5 font-semibold text-slate-700">{s.unitsSold} units</td>
                          <td className="px-4 py-3.5 font-black text-slate-900">{formatMoney(s.grossMinor, s.currency)}</td>
                          <td className="px-4 py-3.5 font-black text-emerald-700">{s.producerShareMinor == null ? "—" : formatMoney(s.producerShareMinor, s.currency)}</td>
                          <td className="px-4 py-3.5 text-right">
                            <Badge className="bg-slate-100 text-[10px] font-black text-slate-700">
                              {s.producerShareMinor == null ? "Unallocated" : "Allocated"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                    {sectors.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No sector turnover records are available.</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB CONTENT 3: Producer Settlement Ledger */}
      {activeTab === "growers" && (
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-black text-slate-900">Producer & Cooperative Settlement Ledger</h2>
              <p className="text-xs text-slate-500">
                Direct farm earners ranked by recorded order volume with payout readiness indicators.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => onNavigate("farmers")}
              className="h-9 rounded-xl border-slate-200 bg-white text-xs font-bold text-emerald-800 hover:bg-emerald-50"
            >
              Open Farmers Directory <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>

          <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-black text-slate-900">Top Farm Producers by Revenue</CardTitle>
              <p className="text-[10px] text-slate-400">Authoritative records derived from database sales</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Producer & Location</th>
                      <th className="px-4 py-3">Currency</th>
                      <th className="px-4 py-3">Fulfilled Orders</th>
                      <th className="px-4 py-3">Gross Turnover</th>
                      <th className="px-4 py-3">Recorded Farmer Payout</th>
                      <th className="px-4 py-3">Allocation Difference</th>
                      <th className="px-4 py-3 text-right">Settlement Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topGrowers.map((grower, idx) => (
                      <tr key={`${grower.id}-${grower.currency}-${idx}`} className="hover:bg-emerald-50/30">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="w-4 font-mono text-[10px] font-black text-slate-400">{idx + 1}</span>
                            <Avatar className="h-8 w-8 border border-emerald-100">
                              <AvatarImage src={grower.avatar} />
                              <AvatarFallback className="bg-emerald-100 text-[10px] font-black text-emerald-800">
                                {initials(grower.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <strong className="block truncate text-xs font-black text-slate-900">{grower.name}</strong>
                              <span className="text-[10px] text-slate-400">{grower.location || "—"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-600">{grower.currency}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-700">{grower.ordersCount} orders</td>
                        <td className="px-4 py-3.5 font-black text-slate-900">{formatMoney(grower.grossMinor, grower.currency)}</td>
                        <td className="px-4 py-3.5 font-black text-emerald-700">{formatMoney(grower.netEarningsMinor, grower.currency)}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-500">
                          {grower.netEarningsMinor > 0 ? formatMoney(grower.grossMinor - grower.netEarningsMinor, grower.currency) : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700">
                            {grower.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {topGrowers.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No producer settlement records are available.</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB CONTENT 4: Live Order Journal */}
      {activeTab === "journal" && (
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-black text-slate-900">Authoritative Transactions & Settlement Journal</h2>
              <p className="text-xs text-slate-500">
                Inspect live database transactions with real order numbers, buyers, farm suppliers, and payment states.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={journalSearch}
                  onChange={(e) => setJournalSearch(e.target.value)}
                  placeholder="Search order #, buyer, farm..."
                  className="h-9 w-52 rounded-xl pl-8 text-xs"
                />
              </div>

              <select
                value={journalFilter}
                onChange={(e) => setJournalFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm"
              >
                <option value="all">All Statuses</option>
                <option value="payment_confirmed">Payment Confirmed</option>
                <option value="order_placed">Order Placed</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Order Number & Date</th>
                      <th className="px-4 py-3">Buyer</th>
                      <th className="px-4 py-3">Primary Farm / Producer</th>
                      <th className="px-4 py-3">Payment Method</th>
                      <th className="px-4 py-3">Gross Total</th>
                      <th className="px-4 py-3">Recorded Farmer Net</th>
                      <th className="px-4 py-3">Payment Status</th>
                      <th className="px-4 py-3 text-right">Escrow Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((tx) => {
                      const dateStr = new Date(tx.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });

                      return (
                        <tr key={tx.id} className="hover:bg-emerald-50/30">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <Receipt className="h-4 w-4 text-emerald-700" />
                              <div>
                                <strong className="font-mono text-xs font-black text-slate-900">{tx.orderNumber}</strong>
                                <span className="block text-[10px] text-slate-400">{dateStr}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <strong className="block text-xs font-bold text-slate-800">{tx.buyerName}</strong>
                            <span className="text-[10px] text-slate-400">{tx.buyerEmail || "—"}</span>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-700">{tx.sellerName}</td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-slate-700">
                              <CreditCard className="h-3 w-3" /> {tx.paymentMethod}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-black text-slate-900">{formatMoney(tx.totalMinor, tx.currency)}</td>
                          <td className="px-4 py-3.5 font-black text-emerald-700">{formatMoney(tx.producerNetMinor, tx.currency)}</td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                                tx.paymentStatus === "paid" || tx.status === "payment_confirmed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : tx.paymentStatus === "manual"
                                  ? "bg-blue-100 text-blue-800"
                                  : tx.status === "cancelled"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {tx.paymentStatus.replaceAll("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-[9px] font-bold text-slate-700">
                              {tx.producerNetMinor > 0 ? "Allocated" : "No allocation"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                    {transactions.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No order transactions match this scope.</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gateway Telemetry & Provenance Footer */}
      <div className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <FinancialBadge icon={CheckCircle2} label="Financial Provenance" value="Live PostgreSQL Settlements" tone="green" />
        <FinancialBadge icon={CreditCard} label="Payment Gateways" value={gateways.length ? `${new Set(gateways.map((item) => item.provider)).size} recorded providers` : "No data"} tone="blue" />
        <FinancialBadge icon={Lock} label="Escrow Allocations" value={`${allocationCount} recorded`} tone="lime" />
        <FinancialBadge icon={Users} label="Producer Ledger" value={`${topGrowers.length} recorded producers`} tone="orange" />
        <FinancialBadge icon={Scale} label="Generated At" value={data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : "No data"} tone="purple" />
      </div>
    </div>
  );
}

function FinancialKpiCard({
  label,
  value,
  context,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
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
            <p className="mt-1 truncate text-lg font-black tracking-tight text-slate-900">{value}</p>
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

function FinancialBadge({
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
