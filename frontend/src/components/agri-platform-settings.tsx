import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
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
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

function getSettingCategory(key: string): { category: string; icon: LucideIcon; color: string } {
  if (key.includes("trading") || key.includes("order") || key.includes("escrow")) {
    return { category: "Trading & Commerce", icon: Package, color: "text-emerald-700 bg-emerald-50" };
  }
  if (key.includes("vat") || key.includes("tax") || key.includes("commission")) {
    return { category: "Finance & Revenue", icon: Coins, color: "text-amber-700 bg-amber-50" };
  }
  if (key.includes("shipping") || key.includes("freight") || key.includes("temp") || key.includes("logistics")) {
    return { category: "Logistics & Cold-Chain", icon: Truck, color: "text-blue-700 bg-blue-50" };
  }
  if (key.includes("ai_") || key.includes("matchmaker")) {
    return { category: "AI & Intelligence", icon: Sparkles, color: "text-purple-700 bg-purple-50" };
  }
  if (key.includes("mfa") || key.includes("session") || key.includes("password") || key.includes("login") || key.includes("lockout")) {
    return { category: "Security & Zero-Trust", icon: ShieldCheck, color: "text-rose-700 bg-rose-50" };
  }
  return { category: "General Platform", icon: Sliders, color: "text-slate-700 bg-slate-100" };
}

function formatSettingKey(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

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
  });

  const records = useMemo(() => settingsData?.records ?? [], [settingsData]);

  // Selected setting for drawer
  const selectedSetting = useMemo(
    () => records.find((r) => r.id === selectedSettingId) ?? null,
    [records, selectedSettingId]
  );

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
        title: "Platform Setting Updated",
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
    const headers = ["Setting Key", "Organisation", "Value (JSON)", "Version", "Updated By", "Last Updated"];
    const rows = filteredRecords.map((r) => [
      `"${r.settingKey}"`,
      `"${r.organisationName}"`,
      `"${JSON.stringify(r.value).replace(/"/g, '""')}"`,
      `"${r.version}"`,
      `"${r.updatedBy || "Super Admin"}"`,
      `"${r.updatedAt}"`,
    ]);

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
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <span>System & Security</span>
            <span>/</span>
            <span>Platform Configuration</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Platform Settings & Operational Rules
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Authoritative platform-wide flags, transaction circuit breakers, financial commission layers, and zero-trust policies.
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
            <span>Refresh Settings</span>
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
              onClick={() => setIsAddModalOpen(true)}
              className="h-9 gap-1.5 bg-[#078c52] text-white font-bold shadow-sm hover:bg-[#067343]"
            >
              <Plus className="h-4 w-4" />
              <span>Add Platform Rule</span>
            </Button>
          )}
        </div>
      </div>

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Active Rules"
          value={records.length || 10}
          subtitle="Server-authoritative store"
          icon={Sliders}
          iconBg="bg-emerald-50"
          iconColor="text-[#078c52]"
        />
        <StatCard
          title="Trading Engine"
          value="Online"
          subtitle="100% Settlement SLA"
          icon={Power}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="VAT Engine"
          value="20.0% Standard"
          subtitle="UK HMRC & Reverse Charge"
          icon={Scale}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Commission Layer"
          value="3.50%"
          subtitle="350 bps revenue basis"
          icon={TrendingUp}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Escrow Window"
          value="48 Hours"
          subtitle="Cold-chain verified"
          icon={Clock}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Security Standard"
          value="Zero-Trust"
          subtitle="Hardware MFA Enforced"
          icon={ShieldCheck}
          iconBg="bg-slate-100"
          iconColor="text-slate-700"
        />
      </div>

      {/* Category Tabs & Filter Matrix */}
      <Card className="border border-emerald-950/10 bg-white shadow-sm">
        <CardContent className="p-4 space-y-3">
          {/* Categories Tab Row */}
          <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
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
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? "bg-[#053f36] text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
        </CardContent>
      </Card>

      {/* Main Settings Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse border-slate-200 p-5">
              <div className="h-5 w-1/3 rounded bg-slate-200 mb-3" />
              <div className="h-4 w-2/3 rounded bg-slate-100" />
            </Card>
          ))
        ) : filteredRecords.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400">
            <Sliders className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-semibold">No platform settings match your query</p>
            <p className="text-xs">Adjust your search keyword or selected category filter.</p>
          </div>
        ) : (
          filteredRecords.map((setting) => {
            const { category, icon: CatIcon, color } = getSettingCategory(setting.settingKey);
            const valObj = typeof setting.value === "object" && setting.value !== null ? (setting.value as Record<string, unknown>) : null;
            const isBooleanType = typeof setting.value === "boolean" || (valObj && "enabled" in valObj);
            const isBooleanActive = typeof setting.value === "boolean" ? setting.value : Boolean(valObj?.enabled);
            const description = valObj?.description ? String(valObj.description) : "Configures platform operational runtime parameters.";

            return (
              <Card
                key={setting.id}
                className="overflow-hidden border border-emerald-950/10 bg-white shadow-sm transition hover:shadow-md"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
                        <CatIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-black text-slate-900">
                          {formatSettingKey(setting.settingKey)}
                        </CardTitle>
                        <span className="font-mono text-[10px] text-slate-400 block">
                          {setting.settingKey} · v{setting.version}
                        </span>
                      </div>
                    </div>

                    {isBooleanType ? (
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold ${isBooleanActive ? "text-emerald-700" : "text-slate-400"}`}>
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
                        {valObj?.formatted ? String(valObj.formatted) : typeof setting.value === "object" ? "JSON Config" : String(setting.value)}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {description}
                  </p>

                  {/* Value Preview Block */}
                  {!isBooleanType && (
                    <div className="rounded-lg bg-slate-50 p-2.5 font-mono text-[11px] text-slate-800 overflow-x-auto border border-slate-100">
                      {JSON.stringify(setting.value, null, 2)}
                    </div>
                  )}

                  {/* Footer Details & Action Buttons */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400">
                    <span className="truncate">
                      Updated {timeAgo(setting.updatedAt)} by <strong className="text-slate-700">{setting.updatedBy}</strong>
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedSettingId(setting.id)}
                        className="h-7 w-7 text-slate-500 hover:text-slate-900"
                        title="View Setting Dossier"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(setting)}
                        className="h-7 w-7 text-slate-500 hover:text-slate-900"
                        title="Edit Configuration"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyText(setting.settingKey, "Setting Key")}
                        className="h-7 w-7 text-slate-400 hover:text-slate-900"
                        title="Copy Setting Key"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Setting Dossier Drawer */}
      <Sheet open={Boolean(selectedSettingId)} onOpenChange={(open) => !open && setSelectedSettingId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto bg-slate-50">
          {selectedSetting && (
            <div className="flex flex-col min-h-full">
              {/* Header */}
              <div className="bg-[#053f36] p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lime-400 font-bold text-[#053f36]">
                      <Sliders className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black">{formatSettingKey(selectedSetting.settingKey)}</h2>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-[10px] text-white/60">Key: {selectedSetting.settingKey}</span>
                        <Badge
                          variant="outline"
                          className="border-emerald-400/30 bg-emerald-500/20 text-emerald-200"
                        >
                          v{selectedSetting.version}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedSettingId(null)}
                    className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 3 Stat Boxes */}
                <div className="mt-6 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Organisation</p>
                    <p className="text-xs font-black text-lime-300 truncate">{selectedSetting.organisationName}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Version</p>
                    <p className="text-xs font-bold text-white font-mono">v{selectedSetting.version}.0</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Updated</p>
                    <p className="text-xs font-bold text-emerald-300">{timeAgo(selectedSetting.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 p-6 space-y-4 text-xs">
                {/* Value JSON Card */}
                <Card className="border-slate-200">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Authoritative Configuration Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    <pre className="rounded bg-slate-900 p-3 text-[11px] text-lime-300 font-mono overflow-x-auto">
                      {JSON.stringify(selectedSetting.value, null, 2)}
                    </pre>
                  </CardContent>
                </Card>

                {/* Audit Context */}
                <Card className="border-slate-200">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Updated By</span>
                      <span className="font-bold text-slate-900">{selectedSetting.updatedBy}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Last Modified</span>
                      <span className="font-mono text-slate-700">{new Date(selectedSetting.updatedAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Setting ID</span>
                      <span className="font-mono text-slate-700">{selectedSetting.id}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Action buttons */}
                <div className="pt-2 flex gap-2">
                  <Button
                    className="flex-1 bg-[#078c52] text-white hover:bg-[#067343] text-xs h-9"
                    onClick={() => {
                      setSelectedSettingId(null);
                      openEditModal(selectedSetting);
                    }}
                  >
                    <Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit Configuration
                  </Button>
                  <Button
                    variant="outline"
                    className="text-xs h-9"
                    onClick={() => copyText(JSON.stringify(selectedSetting.value, null, 2), "Configuration JSON")}
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy JSON
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Setting Modal */}
      <Dialog open={Boolean(editingSetting)} onOpenChange={(open) => !open && setEditingSetting(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              Configure {editingSetting ? formatSettingKey(editingSetting.settingKey) : "Platform Rule"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Updates the server-authoritative configuration and logs an immutable audit event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Setting Key Identifier</Label>
              <Input disabled value={editingSetting?.settingKey || ""} className="h-9 text-xs bg-slate-100 font-mono" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Configuration Value (JSON / Primitive) *</Label>
              <textarea
                value={editValueString}
                onChange={(e) => setEditValueString(e.target.value)}
                rows={6}
                className="w-full rounded-md border border-slate-300 p-2 font-mono text-xs text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Mandatory Audit Justification *</Label>
              <Input
                placeholder="e.g. Updated commission tier per Board governance decree..."
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingSetting(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!editReason.trim() || updateMutation.isPending}
              onClick={handleSaveEdit}
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              {updateMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Setting Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              Create Platform Configuration Rule
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Define a new server-authoritative operational setting with audit logging.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Setting Key Identifier *</Label>
              <Input
                placeholder="e.g. cold_chain_refrigeration_tolerance_minutes"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Configuration Value (JSON / Primitive) *</Label>
              <textarea
                value={newValueString}
                onChange={(e) => setNewValueString(e.target.value)}
                rows={5}
                className="w-full rounded-md border border-slate-300 p-2 font-mono text-xs text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Mandatory Audit Justification *</Label>
              <Input
                placeholder="e.g. Initial provisioning of refrigeration tolerance standard..."
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newKey.trim() || !newReason.trim() || updateMutation.isPending}
              onClick={handleSaveNew}
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              {updateMutation.isPending ? "Creating..." : "Create Setting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
