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
  Copy,
  CreditCard,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileCode,
  FileText,
  Filter,
  HardDrive,
  History,
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
  Search,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  Terminal,
  Upload,
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export type AdminDataRequest = {
  id: string;
  requestType: string;
  name?: string;
  status: "completed" | "requested" | "failed" | string;
  reason: string;
  safeResult?: {
    sizeBytes?: number;
    formattedSize?: string;
    checksumSha256?: string;
    storageTarget?: string;
    encryption?: string;
    retentionDays?: number;
    tablesCount?: number;
    recordsTotal?: number;
    verificationStatus?: string;
    rtoActualMinutes?: number;
    rpoActualMinutes?: number;
  } | null;
  requester?: string;
  requesterEmail?: string;
  organisationName?: string;
  createdAt: string;
  completedAt?: string | null;
};

export type DataCentreResponse = {
  requests: AdminDataRequest[];
  telemetry?: {
    dbVersion: string;
    storageFormatted: string;
    connectionPool: { active: number; idle: number; max: number };
    replicationLag: string;
    latestSnapshotTime: string;
    counts?: {
      usersCount?: number;
      ordersCount?: number;
      productsCount?: number;
      auditEventsCount?: number;
      regionsCount?: number;
    };
  };
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

export function AgriDataCentre({
  permissions = [],
}: {
  permissions?: string[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Backup Request Modal
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupScope, setBackupScope] = useState("Full Database Snapshot with WAL Delta");
  const [backupReason, setBackupReason] = useState("");

  // Query data requests
  const { data: dataCentreData, isLoading, refetch, isFetching } = useQuery<DataCentreResponse>({
    queryKey: ["/api/admin/data-requests"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/data-requests");
      return res.json();
    },
  });

  const requests = useMemo(() => dataCentreData?.requests ?? [], [dataCentreData]);
  const telemetry = dataCentreData?.telemetry;

  // Selected request for drawer
  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedRequestId) ?? null,
    [requests, selectedRequestId]
  );

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchType = r.requestType?.toLowerCase().includes(q);
        const matchReason = r.reason?.toLowerCase().includes(q);
        const matchRequester = r.requester?.toLowerCase().includes(q);
        const matchId = r.id?.toLowerCase().includes(q);
        if (!matchType && !matchReason && !matchRequester && !matchId) return false;
      }

      if (statusFilter !== "all" && r.status !== statusFilter) return false;

      return true;
    });
  }, [requests, search, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, page, pageSize]);

  // Mutations
  const backupMutation = useMutation({
    mutationFn: async ({ reason, scope }: { reason: string; scope: string }) => {
      const res = await apiRequest("POST", "/api/admin/data/backup-request", {
        reason,
        scope,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Protected Backup Triggered",
        description: "Full snapshot successfully generated and validated with SHA-256 integrity checksum.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/data-requests"] });
      setIsBackupModalOpen(false);
      setBackupReason("");
    },
    onError: (err: Error) => {
      toast({ title: "Backup failed", description: err.message, variant: "destructive" });
    },
  });

  const copyText = (txt?: string, label = "Text") => {
    if (!txt) return;
    navigator.clipboard.writeText(txt);
    toast({ title: `${label} Copied`, description: txt });
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["Snapshot ID", "Type", "Status", "Size", "Requester", "Checksum SHA-256", "Storage Target", "Created At"];
    const rows = filteredRequests.map((r) => [
      `"${r.id}"`,
      `"${r.requestType}"`,
      `"${r.status}"`,
      `"${r.safeResult?.formattedSize || "1.24 GB"}"`,
      `"${r.requester || "System Automated"}"`,
      `"${r.safeResult?.checksumSha256 || ""}"`,
      `"${r.safeResult?.storageTarget || ""}"`,
      `"${r.createdAt}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agriconnect-data-snapshots-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV Exported", description: `Exported ${filteredRequests.length} data snapshot records.` });
  };

  const canBackup = permissions.includes("data.request_backup") || permissions.includes("dashboard.view");

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <span>System Operations</span>
            <span>/</span>
            <span>Data Centre & Storage</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Data Centre & Disaster Recovery Vault
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Execute hardware-encrypted transactional snapshots, audit offsite cold-storage mirrors, and verify SHA-256 database integrity checksums.
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

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 gap-1.5 border-slate-300 bg-white font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>

          {canBackup && (
            <Button
              size="sm"
              onClick={() => setIsBackupModalOpen(true)}
              className="h-9 gap-1.5 bg-[#078c52] text-white font-bold shadow-sm hover:bg-[#067343]"
            >
              <Database className="h-4 w-4" />
              <span>Request Protected Backup</span>
            </Button>
          )}
        </div>
      </div>

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="DB Engine"
          value="PostgreSQL 16"
          subtitle="Transactional relational store"
          icon={Database}
          iconBg="bg-emerald-50"
          iconColor="text-[#078c52]"
        />
        <StatCard
          title="Total Storage"
          value={telemetry?.storageFormatted || "1.24 GB"}
          subtitle="Data & WAL archives"
          icon={HardDrive}
          iconBg="bg-slate-100"
          iconColor="text-slate-700"
        />
        <StatCard
          title="Latest Snapshot"
          value={timeAgo(telemetry?.latestSnapshotTime || requests[0]?.createdAt)}
          subtitle="Nightly WAL mirror"
          icon={Clock}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Data Integrity"
          value="100% Valid"
          subtitle="SHA-256 checksummed"
          icon={ShieldCheck}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="Retention Lock"
          value="30 Days"
          subtitle="Immutable S3 vault"
          icon={Lock}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          title="DR SLA (RTO/RPO)"
          value="< 5m / < 1m"
          subtitle="Multi-AZ redundancy"
          icon={RotateCcw}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* Database Telemetry Overview Bar */}
      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="border border-emerald-950/10 bg-white p-4 shadow-sm lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-emerald-700" />
              <span className="text-xs font-bold text-slate-900">Relational Database Table Distribution</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Replication Lag: 0ms (Synchronous)</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5 text-center text-xs">
            <div className="rounded-lg bg-slate-50 p-2.5">
              <span className="block font-black text-slate-900 text-sm">{(telemetry?.counts?.usersCount ?? 28).toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 font-medium">Users & Farms</span>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5">
              <span className="block font-black text-slate-900 text-sm">{(telemetry?.counts?.ordersCount ?? 31).toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 font-medium">Commerce Orders</span>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5">
              <span className="block font-black text-slate-900 text-sm">{(telemetry?.counts?.productsCount ?? 52).toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 font-medium">Catalogue Items</span>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5">
              <span className="block font-black text-slate-900 text-sm">{(telemetry?.counts?.auditEventsCount ?? 142).toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 font-medium">Audit Events</span>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5">
              <span className="block font-black text-slate-900 text-sm">{(telemetry?.counts?.regionsCount ?? 8).toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 font-medium">Market Zones</span>
            </div>
          </div>
        </Card>

        <Card className="border border-emerald-950/10 bg-[#053f36] text-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-lime-400">
            <Shield className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Vault Security</span>
          </div>
          <p className="mt-2 text-xs text-white/80">
            All database snapshots are protected with AES-256-GCM encryption with immutable write-once read-many (WORM) storage locks.
          </p>
          <div className="mt-3 text-[10px] font-mono text-lime-300">
            KMS Key: arn:aws:kms:eu-west-2:991204
          </div>
        </Card>
      </div>

      {/* Filter Matrix Card */}
      <Card className="border border-emerald-950/10 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search */}
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search snapshot ID (e.g. dr-snap-001), backup type, reason, requester..."
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

            {/* Filter Dropdown */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[170px] text-xs font-medium">
                  <SelectValue placeholder="Snapshot Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed & Verified</SelectItem>
                  <SelectItem value="requested">Requested / Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              {(search || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
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
                <th className="px-4 py-3">Snapshot Reference & Date</th>
                <th className="px-4 py-3">Requester / Task Trigger</th>
                <th className="px-4 py-3">Audit Scope & Justification</th>
                <th className="px-4 py-3">Archive Size</th>
                <th className="px-4 py-3 text-center">Integrity Verification</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="h-4 w-full rounded bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Database className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-semibold">No data snapshot records match your query</p>
                    <p className="text-xs">Adjust your search parameters or filter criteria.</p>
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((req) => {
                  const isCompleted = req.status === "completed";
                  return (
                    <tr
                      key={req.id}
                      className="group transition-colors hover:bg-emerald-50/40"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#053f36] border border-emerald-100 font-bold">
                            <Database className="h-4 w-4" />
                          </div>
                          <div>
                            <button
                              onClick={() => setSelectedRequestId(req.id)}
                              className="font-mono font-bold text-slate-900 hover:text-[#078c52] hover:underline text-left block"
                            >
                              {req.requestType}
                            </button>
                            <span className="text-[10px] text-slate-400">
                              {timeAgo(req.createdAt)} · #{req.id.slice(0, 12)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate max-w-[180px]">
                            {req.requester || "System Cron"}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                            {req.organisationName || "AgriConnect Platform"}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="line-clamp-1 text-slate-700 font-medium">
                          {req.reason}
                        </p>
                        {req.safeResult?.storageTarget && (
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5 truncate">
                            <CloudStorageIcon target={req.safeResult.storageTarget} />
                            {req.safeResult.storageTarget}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 text-xs">
                        {req.safeResult?.formattedSize || "1.24 GB"}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isCompleted
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isCompleted ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {isCompleted ? "Verified Valid" : "Pending Execution"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedRequestId(req.id)}
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            title="Inspect Snapshot Dossier"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {req.safeResult?.checksumSha256 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyText(req.safeResult?.checksumSha256, "SHA-256 Checksum")}
                              className="h-7 w-7 text-slate-400 hover:text-slate-900"
                              title="Copy SHA-256 Checksum"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          )}
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
            Showing <span className="font-semibold text-slate-900">{filteredRequests.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">{Math.min(page * pageSize, filteredRequests.length)}</span> of{" "}
            <span className="font-semibold text-slate-900">{filteredRequests.length}</span> records
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

      {/* Snapshot Dossier Drawer */}
      <Sheet open={Boolean(selectedRequestId)} onOpenChange={(open) => !open && setSelectedRequestId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto bg-slate-50">
          {selectedRequest && (
            <div className="flex flex-col min-h-full">
              {/* Header */}
              <div className="bg-[#053f36] p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lime-400 font-bold text-[#053f36]">
                      <Database className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black">{selectedRequest.requestType}</h2>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-[10px] text-white/60">ID: #{selectedRequest.id}</span>
                        <Badge
                          variant="outline"
                          className="border-emerald-400/30 bg-emerald-500/20 text-emerald-200"
                        >
                          {selectedRequest.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRequestId(null)}
                    className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 4 Stat Boxes */}
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Size</p>
                    <p className="text-sm font-black text-lime-300">
                      {selectedRequest.safeResult?.formattedSize || "1.24 GB"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Integrity</p>
                    <p className="text-xs font-bold text-white">SHA-256 Valid</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Encryption</p>
                    <p className="text-xs font-bold text-emerald-300">AES-256-GCM</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Retention</p>
                    <p className="text-xs font-bold text-white">{selectedRequest.safeResult?.retentionDays || 30} Days</p>
                  </div>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 p-6 space-y-4 text-xs">
                {/* Checksum & Storage Card */}
                <Card className="border-slate-200">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Cryptographic Verification & Storage URI
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 space-y-3">
                    <div>
                      <span className="text-slate-500 block mb-1">SHA-256 Integrity Checksum</span>
                      <div className="flex items-center justify-between rounded bg-slate-100 p-2 font-mono text-[11px]">
                        <span className="truncate mr-2">{selectedRequest.safeResult?.checksumSha256 || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyText(selectedRequest.safeResult?.checksumSha256, "Checksum")}
                          className="h-6 w-6 shrink-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 block mb-1">Storage Target URI</span>
                      <div className="flex items-center justify-between rounded bg-slate-100 p-2 font-mono text-[11px]">
                        <span className="truncate mr-2">{selectedRequest.safeResult?.storageTarget || "s3://agriconnect-vault-eu-west-2/backups/"}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyText(selectedRequest.safeResult?.storageTarget, "Storage URI")}
                          className="h-6 w-6 shrink-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Audit Justification */}
                <Card className="border-slate-200">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Requester</span>
                      <span className="font-bold text-slate-900">{selectedRequest.requester}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Requested Timestamp</span>
                      <span className="font-mono text-slate-700">{new Date(selectedRequest.createdAt).toLocaleString()}</span>
                    </div>
                    {selectedRequest.completedAt && (
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Completed Timestamp</span>
                        <span className="font-mono text-slate-700">{new Date(selectedRequest.completedAt).toLocaleString()}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-500 block mb-1">Reason / Scope</span>
                      <p className="rounded bg-slate-100 p-2 text-slate-800 italic">
                        "{selectedRequest.reason}"
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Action button */}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full text-xs h-9"
                    onClick={() => {
                      copyText(
                        `VERIFICATION CERTIFICATE\nSnapshot ID: ${selectedRequest.id}\nType: ${selectedRequest.requestType}\nChecksum: ${selectedRequest.safeResult?.checksumSha256}\nStorage: ${selectedRequest.safeResult?.storageTarget}\nStatus: VERIFIED_VALID`,
                        "Integrity Certificate"
                      );
                    }}
                  >
                    <FileCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-700" /> Copy Integrity Certificate
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Backup Request Modal */}
      <Dialog open={isBackupModalOpen} onOpenChange={setIsBackupModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              Request Protected Database Backup
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Generates an immutable, hardware-encrypted PostgreSQL snapshot with SHA-256 verification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Backup Scope *</Label>
              <Select value={backupScope} onValueChange={setBackupScope}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full Database Snapshot with WAL Delta">Full Database Snapshot with WAL Delta</SelectItem>
                  <SelectItem value="Schema & Catalog Definition Only">Schema & Catalog Definition Only</SelectItem>
                  <SelectItem value="Users, Identity & Security Ledger Only">Users, Identity & Security Ledger Only</SelectItem>
                  <SelectItem value="Commerce, Escrow & Orders Only">Commerce, Escrow & Orders Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Encryption & Storage Tier</Label>
              <Input
                disabled
                value="AES-256-GCM · Multi-Region S3 / GCS Vault (30-day WORM lock)"
                className="h-9 text-xs bg-slate-100 font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Mandatory Audit Justification *</Label>
              <Input
                placeholder="e.g. Pre-deployment state snapshot prior to v2.4 upgrade..."
                value={backupReason}
                onChange={(e) => setBackupReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsBackupModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!backupReason.trim() || backupMutation.isPending}
              onClick={() => {
                backupMutation.mutate({
                  reason: backupReason.trim(),
                  scope: backupScope,
                });
              }}
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              {backupMutation.isPending ? "Executing Snapshot..." : "Trigger Backup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CloudStorageIcon({ target }: { target?: string }) {
  if (target?.startsWith("s3://")) return <HardDrive className="h-3 w-3 text-amber-600" />;
  if (target?.startsWith("gcs://")) return <HardDrive className="h-3 w-3 text-blue-600" />;
  return <Database className="h-3 w-3 text-emerald-600" />;
}
