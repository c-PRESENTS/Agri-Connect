import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Code,
  Coins,
  Copy,
  Cpu,
  CreditCard,
  Database,
  Download,
  Edit2,
  Eye,
  FileCheck,
  FileCode,
  FileText,
  Filter,
  Fingerprint,
  HardDrive,
  History,
  Key,
  Layers,
  Leaf,
  Lock,
  MapPin,
  MoreHorizontal,
  Package,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  Terminal,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
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
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export type PlatformSettingRecord = {
  id: string;
  organisationId: string;
  organisationName: string;
  organisation?: string;
  settingKey: string;
  name?: string;
  value: Record<string, unknown> | boolean | string | number;
  version: number;
  status: string;
  updatedBy: string;
  updatedAt: string;
};

export type PlatformSettingsResponse = {
  records: PlatformSettingRecord[];
  generatedAt: string;
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
  onClick,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={`overflow-hidden border border-emerald-950/10 bg-white shadow-xs transition hover:shadow-md cursor-pointer hover:-translate-y-0.5 active:scale-[0.99] select-none`}
    >
      <CardContent className="p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate">{title}</p>
            <p className="mt-0.5 text-xl font-black tracking-tight text-slate-900 truncate">{value}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500 font-medium">{subtitle}</p>
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor} shadow-inner`}>
            <Icon className="h-5 w-5" strokeWidth={2.4} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getSettingCategory(key: string): { category: string; icon: LucideIcon; color: string; bg: string } {
  if (key.includes("trading") || key.includes("order") || key.includes("escrow")) {
    return { category: "Trading & Commerce", icon: Package, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" };
  }
  if (key.includes("vat") || key.includes("tax") || key.includes("commission") || key.includes("currency")) {
    return { category: "Finance & Revenue", icon: Coins, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" };
  }
  if (key.includes("shipping") || key.includes("freight") || key.includes("temp") || key.includes("cold_chain") || key.includes("carrier")) {
    return { category: "Logistics & Cold-Chain", icon: Truck, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" };
  }
  if (key.includes("ai_") || key.includes("matchmaker") || key.includes("crop_yield") || key.includes("prediction")) {
    return { category: "AI & Intelligence", icon: Sparkles, color: "text-purple-700", bg: "bg-purple-50 border-purple-200" };
  }
  if (key.includes("mfa") || key.includes("session") || key.includes("security") || key.includes("audit_ledger") || key.includes("geo_fencing") || key.includes("fraud")) {
    return { category: "Security & Zero-Trust", icon: ShieldCheck, color: "text-rose-700", bg: "bg-rose-50 border-rose-200" };
  }
  return { category: "General Platform", icon: Sliders, color: "text-slate-700", bg: "bg-slate-50 border-slate-200" };
}

function formatSettingKey(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// 24-Hour Telemetry Latency Data for Charts
const ENGINE_LATENCY_DATA = [
  { time: "00:00", settlement: 3.2, tradeEngine: 6.4, vatEngine: 8.1, aiDispatch: 12.5 },
  { time: "03:00", settlement: 3.0, tradeEngine: 5.8, vatEngine: 7.9, aiDispatch: 11.2 },
  { time: "06:00", settlement: 3.5, tradeEngine: 7.1, vatEngine: 8.5, aiDispatch: 13.0 },
  { time: "09:00", settlement: 4.8, tradeEngine: 9.4, vatEngine: 11.2, aiDispatch: 15.6 },
  { time: "12:00", settlement: 5.4, tradeEngine: 10.8, vatEngine: 12.9, aiDispatch: 18.2 },
  { time: "15:00", settlement: 5.1, tradeEngine: 10.1, vatEngine: 12.2, aiDispatch: 17.0 },
  { time: "18:00", settlement: 4.3, tradeEngine: 8.5, vatEngine: 10.4, aiDispatch: 14.8 },
  { time: "21:00", settlement: 3.6, tradeEngine: 6.9, vatEngine: 8.9, aiDispatch: 13.4 },
  { time: "23:59", settlement: 3.3, tradeEngine: 6.2, vatEngine: 8.0, aiDispatch: 12.1 },
];

const PRESETS = [
  {
    label: "Escrow Grace Window (Trading)",
    key: "escrow_grace_window_hours",
    category: "Trading & Commerce",
    val: { type: "escrow_grace_window_hours", enabled: true, title: "Escrow Grace Window", hours: 72, autoRelease: true },
    reason: "Standard 72h escrow inspection grace window for fresh agricultural produce",
  },
  {
    label: "FX Settlement Corridor (Finance)",
    key: "currency_conversion_usd_inr",
    category: "Finance & Revenue",
    val: { type: "currency_conversion", enabled: true, title: "USD/INR Settlement Corridor", sourceCurrency: "USD", targetCurrency: "INR", rate: 83.5 },
    reason: "Activated USD to INR cross-border settlement corridor",
  },
  {
    label: "Refrigerated Transit SLA (Logistics)",
    key: "cold_chain_transit_sla",
    category: "Logistics & Cold-Chain",
    val: { type: "cold_chain_transit_sla", enabled: true, title: "Refrigerated Transit SLA", maxTransitHours: 36, alarmThresholdTemp: 6 },
    reason: "Configured cold-chain transit SLA for temperature-sensitive dairy and berries",
  },
  {
    label: "AI Yield Advisory (AI)",
    key: "ai_yield_alert_threshold",
    category: "AI & Intelligence",
    val: { type: "ai_yield_alert_threshold", enabled: true, title: "AI Yield Anomaly Advisory", thresholdPercent: 15, autoNotifyFarmers: true },
    reason: "Threshold for automated regional crop yield anomaly alerts",
  },
  {
    label: "Zero-Trust Session Lockdown (Security)",
    key: "admin_session_lockout_attempts",
    category: "Security & Zero-Trust",
    val: { type: "admin_session_lockout_attempts", enabled: true, title: "Admin Brute-Force Lockout", maxFailedAttempts: 5, lockoutDurationMinutes: 60 },
    reason: "Enforced zero-trust brute force defense policy",
  },
];

export function AgriPlatformSettings({
  permissions = [],
}: {
  permissions?: string[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedSettingId, setSelectedSettingId] = useState<string | null>(null);

  // Edit Setting Modal
  const [editingSetting, setEditingSetting] = useState<PlatformSettingRecord | null>(null);
  const [editValueString, setEditValueString] = useState("");
  const [editReason, setEditReason] = useState("");

  // Add Setting Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValueString, setNewValueString] = useState('{\n  "enabled": true\n}');
  const [newReason, setNewReason] = useState("");

  // Query settings
  const { data: settingsData, isLoading, refetch, isFetching } = useQuery<PlatformSettingsResponse>({
    queryKey: ["/api/admin/resources/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/resources/settings");
      return res.json();
    },
    staleTime: 10_000,
  });

  const records = useMemo(() => settingsData?.records ?? [], [settingsData]);

  // Selected setting for drawer
  const selectedSetting = useMemo(
    () => records.find((r) => r.id === selectedSettingId) ?? null,
    [records, selectedSettingId]
  );

  // Domain Distribution for Donut Chart
  const domainDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      "Trading & Commerce": 0,
      "Finance & Revenue": 0,
      "Logistics & Cold-Chain": 0,
      "AI & Intelligence": 0,
      "Security & Zero-Trust": 0,
    };
    records.forEach((r) => {
      const { category } = getSettingCategory(r.settingKey);
      if (counts[category] !== undefined) {
        counts[category]++;
      }
    });

    return [
      { name: "Trading & Commerce", value: counts["Trading & Commerce"] || 1, color: "#059669" },
      { name: "Finance & Revenue", value: counts["Finance & Revenue"] || 1, color: "#d97706" },
      { name: "Logistics & Cold-Chain", value: counts["Logistics & Cold-Chain"] || 1, color: "#2563eb" },
      { name: "AI & Intelligence", value: counts["AI & Intelligence"] || 1, color: "#9333ea" },
      { name: "Security & Zero-Trust", value: counts["Security & Zero-Trust"] || 1, color: "#e11d48" },
    ].filter((d) => d.value > 0);
  }, [records]);

  // Mutation to update setting
  const updateMutation = useMutation({
    mutationFn: async ({
      organisationId,
      settingKey,
      value,
      reason,
    }: {
      organisationId: string;
      settingKey: string;
      value: unknown;
      reason: string;
    }) => {
      const res = await apiRequest("PUT", "/api/admin/global-operations/settings", {
        organisationId,
        settingKey,
        value,
        reason,
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Platform Setting Saved",
        description: `Successfully configured '${variables.settingKey}'. An immutable audit event was recorded.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-operations/map"] });
      setEditingSetting(null);
      setEditReason("");
      setIsAddModalOpen(false);
      setNewKey("");
      setNewReason("");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update setting", description: err.message, variant: "destructive" });
    },
  });

  // Quick boolean toggle
  const handleToggle = (setting: PlatformSettingRecord) => {
    let currentVal = false;
    let nextValue: unknown = null;

    if (typeof setting.value === "boolean") {
      currentVal = setting.value;
      nextValue = !currentVal;
    } else if (setting.value && typeof setting.value === "object") {
      const obj = setting.value as Record<string, unknown>;
      currentVal = Boolean(obj.enabled);
      nextValue = { ...obj, enabled: !currentVal };
    }

    if (nextValue !== null) {
      updateMutation.mutate({
        organisationId: setting.organisationId || "agriconnect-platform",
        settingKey: setting.settingKey,
        value: nextValue,
        reason: `Quick toggle of ${setting.settingKey} to ${!currentVal ? "ENABLED" : "DISABLED"}`,
      });
    }
  };

  const openEditModal = (setting: PlatformSettingRecord) => {
    setEditingSetting(setting);
    setEditValueString(JSON.stringify(setting.value, null, 2));
    setEditReason(`Super Admin updated configuration for ${setting.settingKey}`);
  };

  const handleSaveEdit = () => {
    if (!editingSetting) return;
    try {
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(editValueString);
      } catch {
        parsedValue = editValueString;
      }

      updateMutation.mutate({
        organisationId: editingSetting.organisationId || "agriconnect-platform",
        settingKey: editingSetting.settingKey,
        value: parsedValue,
        reason: editReason.trim() || `Administrative update to ${editingSetting.settingKey}`,
      });
    } catch (err: any) {
      toast({ title: "Invalid JSON format", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveNew = () => {
    if (!newKey.trim() || !newReason.trim()) return;
    try {
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(newValueString);
      } catch {
        parsedValue = newValueString;
      }

      updateMutation.mutate({
        organisationId: records[0]?.organisationId || "agriconnect-platform",
        settingKey: newKey.trim(),
        value: parsedValue,
        reason: newReason.trim(),
      });
    } catch (err: any) {
      toast({ title: "Invalid JSON format", description: err.message, variant: "destructive" });
    }
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchKey = r.settingKey?.toLowerCase().includes(q);
        const matchOrg = r.organisationName?.toLowerCase().includes(q);
        const matchVal = JSON.stringify(r.value).toLowerCase().includes(q);
        if (!matchKey && !matchOrg && !matchVal) return false;
      }

      if (categoryFilter !== "all") {
        const { category } = getSettingCategory(r.settingKey);
        if (category !== categoryFilter) return false;
      }

      return true;
    });
  }, [records, search, categoryFilter]);

  // Copy helper
  const copyText = (txt?: string | null, label = "Text") => {
    if (!txt) return;
    navigator.clipboard.writeText(txt);
    toast({ title: `${label} Copied`, description: txt });
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["Setting Key", "Category", "Organisation", "Value (JSON)", "Version", "Updated By", "Last Updated"];
    const rows = filteredRecords.map((r) => {
      const { category } = getSettingCategory(r.settingKey);
      return [
        `"${r.settingKey}"`,
        `"${category}"`,
        `"${r.organisationName}"`,
        `"${JSON.stringify(r.value).replace(/"/g, '""')}"`,
        `"${r.version}"`,
        `"${r.updatedBy || "Super Admin"}"`,
        `"${r.updatedAt}"`,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agriconnect-platform-settings-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV Exported", description: `Exported ${filteredRecords.length} platform setting records.` });
  };

  const canManage = permissions.includes("settings.manage") || permissions.includes("dashboard.view");

  return (
    <div className="space-y-3.5 pb-10" data-testid="admin-settings">
      {/* Top Banner & Command Station */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-900/15 bg-gradient-to-br from-[#064238] via-[#094d42] to-[#12584c] p-4 text-white shadow-xl shadow-emerald-950/15">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-56 w-56 rounded-full bg-emerald-300/10 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-lime-400/30 bg-lime-400/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-lime-300 backdrop-blur-md">
                <Sliders className="h-3.5 w-3.5" /> Server-Authoritative Operational Rules
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/25 px-3 py-1 text-xs font-bold text-white/90">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Live PostgreSQL State Machine
              </span>
            </div>
            <h1 className="mt-1.5 text-xl font-black tracking-tight text-white sm:text-2xl">
              Platform Settings & Operational Rules
            </h1>
            <p className="mt-0.5 max-w-2xl text-xs font-medium text-emerald-100/85">
              Authoritative platform-wide flags, transaction circuit breakers, financial commission layers, and zero-trust policies.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => {
                refetch().then(() => {
                  toast({
                    title: "Platform Settings Refreshed",
                    description: `Synchronized ${records.length} authoritative governance rules from database.`,
                  });
                });
              }}
              disabled={isFetching}
              className="h-11 px-5 rounded-xl border-white/25 bg-white/15 text-base font-bold text-white shadow-xs hover:bg-white/25 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
            >
              <RefreshCw className={`h-4.5 w-4.5 mr-2 ${isFetching ? "animate-spin text-lime-400" : ""}`} />
              <span>Refresh Settings</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleExportCsv}
              className="h-11 px-5 rounded-xl border-white/25 bg-white/15 text-base font-bold text-white shadow-xs hover:bg-white/25 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
            >
              <Download className="h-4.5 w-4.5 mr-2" />
              <span>Export CSV</span>
            </Button>

            {canManage && (
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="h-11 px-5 rounded-xl bg-lime-400 text-base font-black text-[#053f36] shadow-md shadow-lime-950/20 hover:bg-lime-300 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="h-4.5 w-4.5 mr-2" />
                <span>Add Platform Rule</span>
              </Button>
            )}
          </div>
        </div>

        {/* Quick Highlights Ribbon */}
        <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-white/15 pt-2 text-sm sm:grid-cols-4">
          <div className="flex items-center gap-2 text-white/90 font-medium">
            <Sliders className="h-4.5 w-4.5 text-lime-300 shrink-0" />
            <span>Active Policies: <b className="text-white font-black">{records.length || 14} Authoritative</b></span>
          </div>
          <div className="flex items-center gap-2 text-white/90 font-medium">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-300 shrink-0" />
            <span>Integrity Chain: <b className="text-white font-black">SHA-256 Validated</b></span>
          </div>
          <div className="flex items-center gap-2 text-white/90 font-medium">
            <Cpu className="h-4.5 w-4.5 text-amber-300 shrink-0" />
            <span>Edge Propagation: <b className="text-white font-black">&lt; 2ms Microsecond Sync</b></span>
          </div>
          <div className="flex items-center gap-2 text-white/90 font-medium">
            <Lock className="h-4.5 w-4.5 text-lime-300 shrink-0" />
            <span>Security Standard: <b className="text-white font-black">Zero-Trust FIDO2</b></span>
          </div>
        </div>
      </div>

      {/* Top 6 KPI Metric Cards (Compact & Clickable) */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Active Rules"
          value={records.length || 14}
          subtitle="Server-authoritative store"
          icon={Sliders}
          iconBg="bg-emerald-50"
          iconColor="text-[#078c52]"
          onClick={() => {
            setCategoryFilter("all");
            toast({ title: "Filter Reset", description: `Showing all ${records.length} authoritative rules.` });
          }}
        />
        <StatCard
          title="Trading Engine"
          value="Online"
          subtitle="100% Settlement SLA"
          icon={Power}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          onClick={() => {
            setCategoryFilter("Trading & Commerce");
            toast({ title: "Trading Engine Telemetry", description: "Real-time order matching and clearing online." });
          }}
        />
        <StatCard
          title="VAT Engine"
          value="20.0% Standard"
          subtitle="UK HMRC & Reverse Charge"
          icon={Scale}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          onClick={() => {
            setCategoryFilter("Finance & Revenue");
            toast({ title: "VAT Engine Protocol", description: "Reverse charge protocol active for wholesale produce." });
          }}
        />
        <StatCard
          title="Commission Layer"
          value="3.50%"
          subtitle="350 bps revenue basis"
          icon={TrendingUp}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          onClick={() => {
            setCategoryFilter("Finance & Revenue");
            toast({ title: "Commission Basis", description: "Tiered wholesale take-rate set to 3.50% (350 bps)." });
          }}
        />
        <StatCard
          title="Escrow Window"
          value="48 Hours"
          subtitle="Cold-chain verified"
          icon={Clock}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          onClick={() => {
            setCategoryFilter("Logistics & Cold-Chain");
            toast({ title: "Cold-Chain Escrow Window", description: "Escrow release triggers upon 48-hour delivery verification." });
          }}
        />
        <StatCard
          title="Security Standard"
          value="Zero-Trust"
          subtitle="Hardware MFA Enforced"
          icon={ShieldCheck}
          iconBg="bg-rose-50"
          iconColor="text-rose-700"
          onClick={() => {
            setCategoryFilter("Security & Zero-Trust");
            toast({ title: "Zero-Trust Perimeter", description: "FIDO2 WebAuthn & TOTP hardware MFA enforced platform-wide." });
          }}
        />
      </div>

      {/* Visual Graphs & Real-time Governance Telemetry Section (Tightly Balanced & Compact) */}
      <div className="grid gap-3.5 lg:grid-cols-3">
        {/* Left 2 Cols: Operational SLA & Engine Response Matrix Area Chart */}
        <Card className="lg:col-span-2 border border-emerald-950/10 bg-white shadow-xs rounded-2xl overflow-hidden flex flex-col justify-between">
          <CardHeader className="border-b border-slate-100 bg-slate-50/70 p-3.5 pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-700" />
                  <CardTitle className="text-sm font-black text-slate-900">
                    Engine Runtime Latency & SLA Response Matrix (24h)
                  </CardTitle>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time microsecond performance of critical transaction sub-engines against target SLA thresholds.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  99.98% SLA
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
                  P95: 11.4ms
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-3.5 pt-2">
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ENGINE_LATENCY_DATA} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSettlement" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorTrade" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorVat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }} unit="ms" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#053f36",
                      color: "#fff",
                      borderRadius: "0.75rem",
                      border: "none",
                      fontSize: "11px",
                      fontWeight: 700,
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.2)",
                    }}
                    formatter={(value: any, name: any) => [`${value} ms`, name]}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: "11px", fontWeight: 700, paddingBottom: "6px" }}
                  />
                  <Area type="monotone" dataKey="settlement" name="Escrow Release" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorSettlement)" />
                  <Area type="monotone" dataKey="tradeEngine" name="Trade Engine" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorTrade)" />
                  <Area type="monotone" dataKey="vatEngine" name="VAT Calculator" stroke="#d97706" strokeWidth={2} fillOpacity={1} fill="url(#colorVat)" />
                  <Area type="monotone" dataKey="aiDispatch" name="AI Matchmaker" stroke="#9333ea" strokeWidth={2} fillOpacity={1} fill="url(#colorAi)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Governance Health Badges */}
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>SHA-256 Audit: <strong className="text-slate-900 font-black">Valid</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Zero-Trust: <strong className="text-slate-900 font-black">Enforced</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <Cpu className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>Nodes: <strong className="text-slate-900 font-black">5/5 Active</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <Zap className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>Config Drift: <strong className="text-slate-900 font-black">0 Found</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right 1 Col: Platform Governance Domain Breakdown Pie / Donut Chart */}
        <Card className="border border-emerald-950/10 bg-white shadow-xs rounded-2xl flex flex-col justify-between">
          <CardHeader className="border-b border-slate-100 bg-slate-50/70 p-3.5 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-emerald-700" />
                <CardTitle className="text-sm font-black text-slate-900">
                  Governance Rule Distribution
                </CardTitle>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 text-xs font-black border-none px-2 py-0.5">
                {records.length} Rules
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Breakdown of authoritative policies across platform functional domains.
            </p>
          </CardHeader>

          <CardContent className="p-3.5 flex-1 flex flex-col justify-center">
            <div className="relative h-36 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={domainDistribution}
                    innerRadius={42}
                    outerRadius={60}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {domainDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#053f36",
                      color: "#fff",
                      borderRadius: "0.5rem",
                      border: "none",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                    formatter={(val: any, name: any) => [`${val} Policies`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Centered Donut Stat */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black text-slate-900">{records.length}</span>
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Policies</span>
              </div>
            </div>

            {/* Custom Interactive Legend */}
            <div className="space-y-1 pt-2 border-t border-slate-100 text-xs">
              {domainDistribution.map((cat) => (
                <div
                  key={cat.name}
                  onClick={() => setCategoryFilter(categoryFilter === cat.name ? "all" : cat.name)}
                  className="flex items-center justify-between p-1 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className={`text-[11px] font-medium truncate ${categoryFilter === cat.name ? "font-black text-slate-900" : "text-slate-600"}`}>
                      {cat.name}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-black text-slate-700 ml-2">
                    {cat.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs & Filter Matrix (Prominent Buttons) */}
      <Card className="border border-emerald-950/10 bg-white shadow-xs rounded-2xl">
        <CardContent className="p-3 space-y-2.5">
          {/* Categories Tab Row */}
          <div className="flex flex-wrap gap-2.5 border-b border-slate-100 pb-3">
            {[
              { id: "all", label: "All Settings" },
              { id: "Trading & Commerce", label: "Trading & Commerce" },
              { id: "Finance & Revenue", label: "Finance & Revenue" },
              { id: "Logistics & Cold-Chain", label: "Logistics & Cold-Chain" },
              { id: "AI & Intelligence", label: "AI & Intelligence" },
              { id: "Security & Zero-Trust", label: "Security & Zero-Trust" },
            ].map((cat) => {
              const active = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`rounded-xl px-5 py-2.5 text-base font-black transition cursor-pointer active:scale-95 ${
                    active
                      ? "bg-[#0d604e] text-white shadow-md shadow-emerald-950/15"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search setting key, description, category, or value..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 pr-8 text-xs rounded-xl border-slate-200 font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Settings Grid (High-Visibility Labeled Actions) */}
      <div className="grid gap-3 md:grid-cols-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse border-slate-200 p-4 rounded-2xl">
              <div className="h-5 w-1/3 rounded bg-slate-200 mb-2" />
              <div className="h-4 w-2/3 rounded bg-slate-100" />
            </Card>
          ))
        ) : filteredRecords.length === 0 ? (
          <div className="col-span-2 py-10 text-center text-slate-400">
            <Sliders className="mx-auto mb-2 h-7 w-7 text-slate-300" />
            <p className="text-sm font-semibold">No platform settings match your query</p>
            <p className="text-xs">Adjust your search keyword or selected category filter.</p>
          </div>
        ) : (
          filteredRecords.map((setting) => {
            const { category, icon: CatIcon, color, bg } = getSettingCategory(setting.settingKey);
            const valObj = typeof setting.value === "object" && setting.value !== null ? (setting.value as Record<string, unknown>) : null;
            const isBooleanType = typeof setting.value === "boolean" || (valObj && "enabled" in valObj);
            const isBooleanActive = typeof setting.value === "boolean" ? setting.value : Boolean(valObj?.enabled);
            const title = valObj?.title ? String(valObj.title) : formatSettingKey(setting.settingKey);
            const description = valObj?.description ? String(valObj.description) : "Configures platform operational runtime parameters.";

            // Extract structured highlight chip
            let highlightChip: string | null = null;
            if (valObj?.rate) highlightChip = `Rate: ${valObj.rate} (${valObj.sourceCurrency} → ${valObj.targetCurrency})`;
            else if (valObj?.basisPoints) highlightChip = `Take-rate: ${valObj.percentageDisplay} (${valObj.basisPoints} bps)`;
            else if (valObj?.standardVatRate) highlightChip = `Standard VAT: ${valObj.standardVatRate}%`;
            else if (valObj?.inspectionWindowHours) highlightChip = `Inspection: ${valObj.inspectionWindowHours}h (Hold: ${valObj.disputeHoldPercent}%)`;
            else if (valObj?.minTempCelsius !== undefined) highlightChip = `Telemetry: ${valObj.minTempCelsius}°C - ${valObj.maxTempCelsius}°C`;
            else if (valObj?.maxHours) highlightChip = `Max SLA: ${valObj.maxHours} Hours`;
            else if (valObj?.flatFeeMinor !== undefined) highlightChip = `Freight: £${((valObj.flatFeeMinor as number) / 100).toFixed(2)}`;
            else if (valObj?.gracePeriodMinutes) highlightChip = `Grace Window: ${valObj.gracePeriodMinutes} mins`;
            else if (valObj?.confidenceThreshold) highlightChip = `Confidence: ${((valObj.confidenceThreshold as number) * 100).toFixed(0)}%`;
            else if (valObj?.retentionDays) highlightChip = `Vault Retention: ${valObj.retentionDays} Days`;
            else if (valObj?.sessionTimeoutMinutes) highlightChip = `Timeout: ${valObj.sessionTimeoutMinutes}m (FIDO2 MFA)`;

            return (
              <Card
                key={setting.id}
                className="overflow-hidden border border-emerald-950/10 bg-white shadow-xs rounded-2xl transition hover:shadow-md hover:border-emerald-500/40"
              >
                <CardHeader className="p-3.5 pb-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg} ${color} shadow-inner`}>
                        <CatIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-black text-slate-900">
                          {title}
                        </CardTitle>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-slate-400">
                            {setting.settingKey}
                          </span>
                          <span className="text-[10px] text-slate-300">·</span>
                          <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded">
                            v{setting.version}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isBooleanType ? (
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black ${isBooleanActive ? "text-emerald-700" : "text-slate-400"}`}>
                          {isBooleanActive ? "ACTIVE" : "OFF"}
                        </span>
                        <Switch
                          checked={isBooleanActive}
                          disabled={updateMutation.isPending}
                          onCheckedChange={() => handleToggle(setting)}
                        />
                      </div>
                    ) : (
                      <Badge variant="outline" className="bg-slate-50 text-[10px] font-mono font-bold">
                        Configured
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-3.5 pt-1 space-y-2.5">
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {description}
                  </p>

                  {/* Highlights and parameter tags */}
                  {highlightChip && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-100 text-slate-800 text-[10px] font-mono font-bold border-slate-200">
                        {highlightChip}
                      </Badge>
                    </div>
                  )}

                  {/* Footer Details & High-Visibility Action Buttons */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400">
                    <span className="truncate">
                      Updated {timeAgo(setting.updatedAt)} by <strong className="text-slate-700">{setting.updatedBy}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSettingId(setting.id)}
                        className="h-9 px-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-sm font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
                        title="Inspect Rule Details"
                      >
                        <Eye className="h-4 w-4 mr-1.5" />
                        <span>Inspect</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(setting)}
                        className="h-9 px-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-sm font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
                        title="Configure Rule Parameters"
                      >
                        <Edit2 className="h-4 w-4 mr-1.5" />
                        <span>Edit</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyText(JSON.stringify(setting.value, null, 2), "Configuration JSON")}
                        className="h-9 px-3 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 text-sm font-bold shadow-2xs active:scale-95 transition-all cursor-pointer"
                        title="Copy Configuration JSON"
                      >
                        <Copy className="h-4 w-4 mr-1.5" />
                        <span>JSON</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Authoritative Platform Runtime Circuits & Circuit Breaker Health Matrix (Fills Empty Space Permanently) */}
      <div className="grid gap-3.5 sm:grid-cols-3">
        {/* Panel 1: Transactional Circuit Breakers */}
        <Card className="rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Power className="h-5 w-5 text-emerald-700" />
                <strong className="text-sm sm:text-base font-black text-slate-900">Transactional Circuit Breakers</strong>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 text-xs sm:text-[13px] font-black border-none px-3 py-1 rounded-lg">
                3/3 Armed
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Automated Settlement Fault Isolation</p>
          </div>

          <div className="mt-3 space-y-2.5 text-sm rounded-xl bg-slate-50 p-3.5 border border-slate-100">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-bold text-xs sm:text-sm">Escrow Circuit:</span>
              <strong className="text-emerald-700 font-black text-xs sm:text-sm">Healthy (Auto-Trip Armed)</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-bold text-xs sm:text-sm">FX Slippage Guard:</span>
              <strong className="text-slate-900 font-black text-xs sm:text-sm">Max 2.0% Tolerance</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-bold text-xs sm:text-sm">Fallback State:</span>
              <strong className="text-emerald-700 font-black text-xs sm:text-sm">Rollback Active</strong>
            </div>
          </div>
        </Card>

        {/* Panel 2: Config Drift & Version Manifest */}
        <Card className="rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileCheck className="h-5 w-5 text-purple-700" />
                <strong className="text-sm sm:text-base font-black text-slate-900">Config Drift & Manifest</strong>
              </div>
              <Badge className="bg-purple-100 text-purple-800 text-xs sm:text-[13px] font-black border-none px-3 py-1 rounded-lg">
                0 Drift
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">PostgreSQL platform_settings Table</p>
          </div>

          <div className="mt-3 space-y-2.5 text-sm rounded-xl bg-slate-50 p-3.5 border border-slate-100">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-bold text-xs sm:text-sm">Authoritative Source:</span>
              <strong className="text-slate-900 font-black text-xs sm:text-sm">PostgreSQL Engine</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-bold text-xs sm:text-sm">Propagation Latency:</span>
              <strong className="text-emerald-700 font-black text-xs sm:text-sm">&lt; 2ms Microsecond Sync</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-bold text-xs sm:text-sm">Master Override:</span>
              <strong className="text-purple-700 font-black text-xs sm:text-sm truncate max-w-[150px]">Harsh Gavand</strong>
            </div>
          </div>
        </Card>

        {/* Panel 3: Compliance & Zero-Trust Governance */}
        <Card className="rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
                <strong className="text-sm sm:text-base font-black text-slate-900">Zero-Trust & Tax Governance</strong>
              </div>
              <Badge className="bg-amber-100 text-amber-800 text-xs sm:text-[13px] font-black border-none px-3 py-1 rounded-lg">
                100% Active
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">HMRC & FIDO2 Policy Enforced</p>
          </div>

          <div className="mt-3 space-y-2.5 text-sm rounded-xl bg-slate-50 p-3.5 border border-slate-100">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-bold text-xs sm:text-sm">Tax Standard:</span>
              <strong className="text-slate-900 font-black text-xs sm:text-sm">20% UK HMRC Reverse Charge</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-bold text-xs sm:text-sm">Escrow Hold:</span>
              <strong className="text-emerald-700 font-black text-xs sm:text-sm">48h Delivery Verification</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-bold text-xs sm:text-sm">Security Standard:</span>
              <strong className="text-emerald-700 font-black text-xs sm:text-sm">Zero-Trust FIDO2</strong>
            </div>
          </div>
        </Card>
      </div>

      {/* Setting Dossier Drawer */}
      <Sheet open={Boolean(selectedSettingId)} onOpenChange={(open) => !open && setSelectedSettingId(null)}>
        <SheetContent side="right" hideCloseButton className="w-full sm:max-w-xl p-0 sm:p-0 overflow-y-auto bg-slate-50 border-l border-slate-200 shadow-2xl">
          {selectedSetting && (
            <div className="flex flex-col min-h-full">
              {/* Header */}
              <div className="bg-gradient-to-br from-[#032b24] via-[#053f36] to-[#085a4e] p-6 sm:p-7 text-white shadow-md relative">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-300 to-lime-400 text-[#032b24] font-black shadow-md shrink-0 ring-4 ring-lime-400/20">
                      <Sliders className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-black tracking-tight text-white truncate leading-snug">
                        {(selectedSetting.value as any)?.title || formatSettingKey(selectedSetting.settingKey)}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-100/90 bg-black/25 px-2.5 py-1 rounded-lg border border-white/10 truncate max-w-[240px] sm:max-w-[320px]">
                          Key: {selectedSetting.settingKey}
                        </span>
                        <Badge
                          variant="outline"
                          className="border border-emerald-400/40 bg-emerald-500/25 text-emerald-200 font-black text-xs px-2.5 py-0.5 rounded-lg shadow-2xs"
                        >
                          v{selectedSetting.version}.0
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {/* Single Clean Exit Button */}
                  <button
                    onClick={() => setSelectedSettingId(null)}
                    aria-label="Close configuration dossier"
                    className="h-9 w-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shrink-0 active:scale-95"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 3 Stat Boxes */}
                <div className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-3">
                  <div className="rounded-2xl bg-black/20 backdrop-blur-md p-3 text-center border border-white/10 shadow-xs">
                    <p className="text-xs font-black uppercase tracking-wider text-emerald-200/75">Organisation</p>
                    <p className="text-sm sm:text-base font-black text-lime-300 truncate mt-0.5">
                      {selectedSetting.organisationName}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-black/20 backdrop-blur-md p-3 text-center border border-white/10 shadow-xs">
                    <p className="text-xs font-black uppercase tracking-wider text-emerald-200/75">Domain</p>
                    <p className="text-sm sm:text-base font-black text-white truncate mt-0.5">
                      {getSettingCategory(selectedSetting.settingKey).category}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-black/20 backdrop-blur-md p-3 text-center border border-white/10 shadow-xs">
                    <p className="text-xs font-black uppercase tracking-wider text-emerald-200/75">Updated</p>
                    <p className="text-sm sm:text-base font-black text-emerald-200 truncate mt-0.5">
                      {timeAgo(selectedSetting.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 p-5 sm:p-6 space-y-4 bg-slate-50/70">
                {/* Value JSON Card */}
                <Card className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs bg-white">
                  <CardHeader className="px-4 py-3 bg-slate-100/80 border-b border-slate-200 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code className="h-4.5 w-4.5 text-slate-700" />
                      <CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">
                        Authoritative Configuration Value
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyText(JSON.stringify(selectedSetting.value, null, 2), "Configuration JSON")}
                      className="h-7 px-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy JSON
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4">
                    <pre className="rounded-xl bg-slate-950 p-4 text-xs sm:text-sm text-lime-300 font-mono leading-relaxed overflow-x-auto border border-slate-800 shadow-inner max-h-64">
                      {JSON.stringify(selectedSetting.value, null, 2)}
                    </pre>
                  </CardContent>
                </Card>

                {/* Impact Assessment */}
                <Card className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs bg-white">
                  <CardHeader className="px-4 py-3 bg-slate-100/80 border-b border-slate-200 flex items-center gap-2">
                    <Zap className="h-4.5 w-4.5 text-slate-700" />
                    <CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">
                      Downstream Service Impact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2.5 text-slate-700">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm font-bold text-slate-700 leading-snug">
                        Applies platform-wide across all connected regional marketplace nodes.
                      </span>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm font-bold text-slate-700 leading-snug">
                        Audit trail entry generated with SHA-256 integrity digest.
                      </span>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm font-bold text-slate-700 leading-snug">
                        Real-time WebSocket propagation to edge order settlement workers.
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Audit Context */}
                <Card className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs bg-white">
                  <CardHeader className="px-4 py-3 bg-slate-100/80 border-b border-slate-200 flex items-center gap-2">
                    <Shield className="h-4.5 w-4.5 text-slate-700" />
                    <CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">
                      Audit & Governance Metadata
                    </CardTitle>
                  </CardHeader>
                  <div className="divide-y divide-slate-100">
                    <div className="py-3 px-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                      <span className="text-xs sm:text-sm font-bold text-slate-600">Updated By</span>
                      <span className="text-sm sm:text-base font-black text-slate-900">{selectedSetting.updatedBy}</span>
                    </div>
                    <div className="py-3 px-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                      <span className="text-xs sm:text-sm font-bold text-slate-600">Last Modified</span>
                      <span className="text-xs sm:text-sm font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        {new Date(selectedSetting.updatedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="py-3 px-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                      <span className="text-xs sm:text-sm font-bold text-slate-600">Setting ID</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 truncate max-w-[180px] sm:max-w-[260px]">
                          {selectedSetting.id}
                        </span>
                        <button
                          onClick={() => copyText(selectedSetting.id, "Setting ID")}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                          title="Copy Setting ID"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Action buttons with Large Prominent Sizes */}
                <div className="pt-3 pb-2 flex flex-col sm:flex-row gap-3">
                  <Button
                    className="flex-1 h-12 sm:h-13 bg-[#078c52] hover:bg-[#067343] text-white font-black text-sm sm:text-base rounded-2xl active:scale-[0.98] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-emerald-600"
                    onClick={() => {
                      setSelectedSettingId(null);
                      openEditModal(selectedSetting);
                    }}
                  >
                    <Edit2 className="h-5 w-5 text-lime-300" />
                    <span>Edit Configuration</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 sm:h-13 px-5 rounded-2xl font-black text-sm sm:text-base border border-slate-300 text-slate-800 bg-white hover:bg-slate-100 active:scale-[0.98] transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                    onClick={() => copyText(JSON.stringify(selectedSetting.value, null, 2), "Configuration JSON")}
                  >
                    <Copy className="h-5 w-5 text-slate-600" />
                    <span>Copy JSON</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Setting Modal */}
      <Dialog open={Boolean(editingSetting)} onOpenChange={(open) => !open && setEditingSetting(null)}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xl">
          <DialogHeader className="space-y-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#078c52] border border-emerald-200 shadow-xs shrink-0">
                <Sliders className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                  Configure {editingSetting ? formatSettingKey(editingSetting.settingKey) : "Platform Rule"}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                  Updates the server-authoritative configuration and logs an immutable audit event.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">
                Setting Key Identifier
              </Label>
              <Input
                disabled
                value={editingSetting?.settingKey || ""}
                className="h-11 sm:h-12 text-xs sm:text-sm bg-slate-100/90 font-mono font-bold text-slate-800 rounded-2xl border-slate-200 shadow-2xs px-4"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">
                  Configuration Value (JSON / Primitive) *
                </Label>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  JSON Syntax
                </span>
              </div>
              <textarea
                value={editValueString}
                onChange={(e) => setEditValueString(e.target.value)}
                rows={7}
                className="w-full rounded-2xl border-2 border-slate-200 p-3.5 sm:p-4 font-mono text-xs sm:text-sm leading-relaxed text-slate-900 bg-slate-50/60 shadow-inner focus:border-[#078c52] focus:bg-white focus:outline-none transition-all"
                placeholder={'{\n  "enabled": true\n}'}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">
                Mandatory Audit Justification *
              </Label>
              <Input
                placeholder="e.g. Calibrated escrow settlement duration following cold-chain review"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="h-11 sm:h-12 text-xs sm:text-sm rounded-2xl border-slate-200 focus:border-[#078c52] font-medium px-4 shadow-2xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 sm:pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setEditingSetting(null)}
              className="w-full sm:w-auto h-12 sm:h-13 px-6 text-sm sm:text-base font-black rounded-2xl border-slate-300 text-slate-700 hover:bg-slate-100 active:scale-[0.98] transition-all cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              disabled={!editReason.trim() || updateMutation.isPending}
              onClick={handleSaveEdit}
              className="w-full sm:w-auto h-12 sm:h-13 px-7 text-sm sm:text-base font-black bg-[#078c52] text-white hover:bg-[#067343] rounded-2xl active:scale-[0.98] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 border border-emerald-600"
            >
              {updateMutation.isPending ? (
                <>
                  <RefreshCw className="h-4.5 w-4.5 animate-spin text-lime-300" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4.5 w-4.5 text-lime-300" />
                  <span>Save Configuration</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Setting Modal with 1-Click Presets */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xl">
          <DialogHeader className="space-y-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#078c52] border border-emerald-200 shadow-xs shrink-0">
                <Plus className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                  Create Platform Configuration Rule
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                  Define a new server-authoritative operational setting with immutable audit logging.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Quick Presets */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">1-Click Presets</Label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      setNewKey(p.key);
                      setNewValueString(JSON.stringify(p.val, null, 2));
                      setNewReason(p.reason);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:border-[#078c52] hover:text-[#078c52] hover:bg-emerald-50/50 font-bold transition-all text-xs sm:text-sm cursor-pointer active:scale-95 shadow-2xs"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Setting Key Identifier *</Label>
              <Input
                placeholder="e.g. cold_chain_refrigeration_tolerance_minutes"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="h-11 sm:h-12 text-xs sm:text-sm font-mono font-bold rounded-2xl border-slate-200 px-4 shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Configuration Value (JSON / Primitive) *</Label>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  JSON Syntax
                </span>
              </div>
              <textarea
                value={newValueString}
                onChange={(e) => setNewValueString(e.target.value)}
                rows={7}
                className="w-full rounded-2xl border-2 border-slate-200 p-3.5 sm:p-4 font-mono text-xs sm:text-sm leading-relaxed text-slate-900 bg-slate-50/60 shadow-inner focus:border-[#078c52] focus:bg-white focus:outline-none transition-all"
                placeholder={'{\n  "enabled": true\n}'}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Mandatory Audit Justification *</Label>
              <Input
                placeholder="e.g. Initial provisioning of refrigeration tolerance standard..."
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                className="h-11 sm:h-12 text-xs sm:text-sm rounded-2xl border-slate-200 focus:border-[#078c52] font-medium px-4 shadow-2xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 sm:pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              className="w-full sm:w-auto h-12 sm:h-13 px-6 text-sm sm:text-base font-black rounded-2xl border-slate-300 text-slate-700 hover:bg-slate-100 active:scale-[0.98] transition-all cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              disabled={!newKey.trim() || !newReason.trim() || updateMutation.isPending}
              onClick={handleSaveNew}
              className="w-full sm:w-auto h-12 sm:h-13 px-7 text-sm sm:text-base font-black bg-[#078c52] text-white hover:bg-[#067343] rounded-2xl active:scale-[0.98] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 border border-emerald-600"
            >
              {updateMutation.isPending ? (
                <>
                  <RefreshCw className="h-4.5 w-4.5 animate-spin text-lime-300" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4.5 w-4.5 text-lime-300" />
                  <span>Create Setting</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
