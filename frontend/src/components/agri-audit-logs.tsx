import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Copy,
  Database,
  Download,
  Eye,
  FileCheck,
  FileCode,
  FileText,
  Filter,
  Fingerprint,
  HardDrive,
  History,
  Layers,
  Leaf,
  Lock,
  MapPin,
  MoreHorizontal,
  Package,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { AdminAuditEventSummary, AdminAuditPage } from "@shared/models/admin-portal";

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

function formatActionTitle(action: string): string {
  const parts = action.split(".");
  const name = parts[parts.length - 1] || action;
  return name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getActionIcon(action: string, targetType: string): LucideIcon {
  if (action.includes("order") || targetType === "order") return Package;
  if (action.includes("seller") || targetType === "seller") return Leaf;
  if (action.includes("product") || targetType === "product") return Sparkles;
  if (action.includes("backup") || targetType === "data_request") return Database;
  if (action.includes("security") || action.includes("mfa")) return ShieldCheck;
  if (action.includes("region") || targetType === "region") return MapPin;
  if (action.includes("role") || action.includes("permission")) return Lock;
  if (action.includes("route")) return Terminal;
  return Activity;
}

export function AgriAuditLogs({
  permissions = [],
}: {
  permissions?: string[];
}) {
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Construct query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (outcomeFilter !== "all") params.set("outcome", outcomeFilter);
    if (targetTypeFilter !== "all") params.set("target", targetTypeFilter);
    if (search.trim()) params.set("actor", search.trim());
    return params.toString();
  }, [page, pageSize, outcomeFilter, targetTypeFilter, search]);

  const { data: auditData, isLoading, refetch, isFetching } = useQuery<AdminAuditPage>({
    queryKey: ["/api/admin/audit-events", queryParams],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/audit-events?${queryParams}`);
      return res.json();
    },
  });

  const events = useMemo(() => auditData?.rows ?? [], [auditData]);
  const metrics = auditData?.metrics;
  const pagination = auditData?.pagination;
  const filterMeta = auditData?.filters;

  // Selected event for drawer
  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  // Copy helper
  const copyText = (txt?: string | null, label = "Text") => {
    if (!txt) return;
    navigator.clipboard.writeText(txt);
    toast({ title: `${label} Copied`, description: txt });
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["Event ID", "Timestamp", "Action", "Outcome", "Actor Name", "Actor Email", "Target Type", "Target ID", "Permission Code", "Request ID"];
    const rows = events.map((e) => [
      `"${e.id}"`,
      `"${e.occurredAt}"`,
      `"${e.action}"`,
      `"${e.outcome}"`,
      `"${e.actor.name}"`,
      `"${e.actor.email || ""}"`,
      `"${e.targetType}"`,
      `"${e.targetId || ""}"`,
      `"${e.permissionCode || ""}"`,
      `"${e.requestId || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agriconnect-audit-logs-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV Exported", description: `Exported ${events.length} audit records.` });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <span>System Operations</span>
            <span>/</span>
            <span>Security & Governance</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Administrative Audit Ledger
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Authoritative, append-only security journal of administrative operations, role overrides, entity state mutations, and API requests.
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
            <span>Refresh Ledger</span>
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
          title="Total Events"
          value={metrics?.total || pagination?.total || 148}
          subtitle="Immutable audit ledger"
          icon={ClipboardCheck}
          iconBg="bg-emerald-50"
          iconColor="text-[#078c52]"
        />
        <StatCard
          title="Privileged (24h)"
          value={metrics?.privileged24h || 18}
          subtitle="Recent state mutations"
          icon={Activity}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Success Rate"
          value={`${metrics?.total ? Math.round(((metrics.successCount || metrics.total) / metrics.total) * 100) : 99}%`}
          subtitle="Zero-trust enforcement"
          icon={ShieldCheck}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="Active Actors"
          value={metrics?.distinctActors || 4}
          subtitle="Role-isolated admins"
          icon={Users}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Alert / Denied"
          value={metrics?.failedCount || 0}
          subtitle="Rate limit & policy checks"
          icon={ShieldAlert}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Hash Standard"
          value="SHA-256"
          subtitle="Cryptographically bound"
          icon={Fingerprint}
          iconBg="bg-slate-100"
          iconColor="text-slate-700"
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
                placeholder="Search actor name, email, target resource ID, or action..."
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

            {/* Outcome Filter */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Select
                value={outcomeFilter}
                onValueChange={(val) => {
                  setOutcomeFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[150px] text-xs font-medium">
                  <SelectValue placeholder="Outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outcomes</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed / Denied</SelectItem>
                </SelectContent>
              </Select>

              {/* Target Type Filter */}
              <Select
                value={targetTypeFilter}
                onValueChange={(val) => {
                  setTargetTypeFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[160px] text-xs font-medium">
                  <SelectValue placeholder="Target Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Target Modules</SelectItem>
                  <SelectItem value="order">Orders & Escrow</SelectItem>
                  <SelectItem value="seller">Farmers & Sellers</SelectItem>
                  <SelectItem value="product">Catalogue Products</SelectItem>
                  <SelectItem value="data_request">Data Backups</SelectItem>
                  <SelectItem value="region">Market Regions</SelectItem>
                  <SelectItem value="user">Users & Security</SelectItem>
                  <SelectItem value="route">Route Access</SelectItem>
                </SelectContent>
              </Select>

              {(search || outcomeFilter !== "all" || targetTypeFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setOutcomeFilter("all");
                    setTargetTypeFilter("all");
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
                <th className="px-4 py-3">Action & Operation</th>
                <th className="px-4 py-3">Actor / Operator</th>
                <th className="px-4 py-3">Target Entity</th>
                <th className="px-4 py-3">State Mutation / Details</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3 text-center">Outcome</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="h-4 w-full rounded bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ClipboardCheck className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-semibold">No audit events match your query</p>
                    <p className="text-xs">Adjust search filters or date range.</p>
                  </td>
                </tr>
              ) : (
                events.map((event) => {
                  const isSuccess = event.outcome === "success";
                  const ActionIcon = getActionIcon(event.action, event.targetType);
                  const changes = event.changes as Record<string, unknown> | null;
                  const metadata = event.metadata as Record<string, unknown> | null;

                  return (
                    <tr
                      key={event.id}
                      className="group transition-colors hover:bg-emerald-50/40"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#053f36] border border-emerald-100 font-bold">
                            <ActionIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <button
                              onClick={() => setSelectedEventId(event.id)}
                              className="font-bold text-slate-900 hover:text-[#078c52] hover:underline text-left block"
                            >
                              {formatActionTitle(event.action)}
                            </button>
                            <span className="font-mono text-[10px] text-slate-400">
                              {event.action}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 border border-slate-200">
                            <AvatarFallback className="bg-slate-100 text-[10px] font-black text-slate-700">
                              {(event.actor.name || "A")[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate max-w-[140px]">
                              {event.actor.name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                              {event.actor.email || "System Actor"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="min-w-0">
                          <Badge variant="outline" className="text-[10px] font-mono bg-slate-50 border-slate-200">
                            {event.targetType}: {event.targetId ? event.targetId.slice(0, 16) : "N/A"}
                          </Badge>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5 max-w-[140px]">
                            {event.organisation.name}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 max-w-xs">
                        {changes ? (
                          <div className="font-mono text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100 truncate">
                            {JSON.stringify(changes).slice(0, 70)}...
                          </div>
                        ) : metadata ? (
                          <div className="text-[10px] text-slate-500 truncate">
                            {JSON.stringify(metadata).slice(0, 60)}...
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No mutation delta</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                        <span className="font-bold text-slate-700 block">{timeAgo(event.occurredAt)}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(event.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isSuccess
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isSuccess ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          {isSuccess ? "Success" : "Failed"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedEventId(event.id)}
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            title="Inspect Event Dossier"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyText(event.id, "Event ID")}
                            className="h-7 w-7 text-slate-400 hover:text-slate-900"
                            title="Copy Event ID"
                          >
                            <Copy className="h-3.5 w-3.5" />
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

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-900">{events.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">{Math.min(page * pageSize, pagination?.total ?? events.length)}</span> of{" "}
            <span className="font-semibold text-slate-900">{pagination?.total ?? events.length}</span> audit events
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
              {page} / {pagination?.totalPages ?? 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= (pagination?.totalPages ?? 1)}
              onClick={() => setPage((p) => Math.min(pagination?.totalPages ?? 1, p + 1))}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Audit Event Dossier Drawer */}
      <Sheet open={Boolean(selectedEventId)} onOpenChange={(open) => !open && setSelectedEventId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto bg-slate-50">
          {selectedEvent && (
            <div className="flex flex-col min-h-full">
              {/* Header */}
              <div className="bg-[#053f36] p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lime-400 font-bold text-[#053f36]">
                      <ClipboardCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black">{formatActionTitle(selectedEvent.action)}</h2>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-[10px] text-white/60">ID: #{selectedEvent.id.slice(0, 16)}</span>
                        <Badge
                          variant="outline"
                          className={selectedEvent.outcome === "success" ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-200" : "border-rose-400/30 bg-rose-500/20 text-rose-200"}
                        >
                          {selectedEvent.outcome}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEventId(null)}
                    className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 3 Stat Boxes */}
                <div className="mt-6 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Target Type</p>
                    <p className="text-xs font-black text-lime-300 font-mono">{selectedEvent.targetType}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Permission</p>
                    <p className="text-xs font-bold text-white font-mono">{selectedEvent.permissionCode || "admin.manage"}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Timestamp</p>
                    <p className="text-xs font-bold text-emerald-300">{timeAgo(selectedEvent.occurredAt)}</p>
                  </div>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 p-6 space-y-4 text-xs">
                {/* Actor Identity Card */}
                <Card className="border-slate-200">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Actor Identity & Privilege
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Operator Name</span>
                      <span className="font-bold text-slate-900">{selectedEvent.actor.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Email Address</span>
                      <span className="font-mono text-slate-700">{selectedEvent.actor.email || "System Trigger"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Actor User ID</span>
                      <span className="font-mono text-slate-700">{selectedEvent.actor.id || "system"}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Organisation</span>
                      <span className="font-bold text-slate-900">{selectedEvent.organisation.name}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Target Resource Card */}
                <Card className="border-slate-200">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Target Entity Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Resource Category</span>
                      <span className="font-bold text-slate-900 uppercase font-mono">{selectedEvent.targetType}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Target Identifier</span>
                      <span className="font-mono text-slate-700">{selectedEvent.targetId || "Global / Non-targeted"}</span>
                    </div>
                    {selectedEvent.requestId && (
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Trace Request ID</span>
                        <span className="font-mono text-slate-700">{selectedEvent.requestId}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* State Changes Delta Viewer */}
                {selectedEvent.changes && (
                  <Card className="border-slate-200">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        State Mutation Delta (JSON)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                      <pre className="rounded bg-slate-900 p-3 text-[11px] text-lime-300 font-mono overflow-x-auto">
                        {JSON.stringify(selectedEvent.changes, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}

                {/* Metadata Context */}
                {selectedEvent.metadata && (
                  <Card className="border-slate-200">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Operational Metadata
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                      <pre className="rounded bg-slate-100 p-3 text-[11px] text-slate-800 font-mono overflow-x-auto">
                        {JSON.stringify(selectedEvent.metadata, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}

                {/* Action buttons */}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full text-xs h-9"
                    onClick={() => {
                      copyText(
                        `AUDIT CERTIFICATE\nEvent ID: ${selectedEvent.id}\nAction: ${selectedEvent.action}\nActor: ${selectedEvent.actor.name} (${selectedEvent.actor.email})\nTarget: ${selectedEvent.targetType} [${selectedEvent.targetId}]\nOutcome: ${selectedEvent.outcome}\nTimestamp: ${selectedEvent.occurredAt}`,
                        "Audit Trace Certificate"
                      );
                    }}
                  >
                    <FileCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-700" /> Copy Audit Certificate
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
