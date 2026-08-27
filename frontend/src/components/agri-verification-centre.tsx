import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Archive,
  ArrowRight,
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
  FileCheck2,
  FileText,
  Filter,
  HelpCircle,
  Layers,
  Leaf,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Store,
  Tag,
  ThumbsDown,
  ThumbsUp,
  User,
  Users,
  X,
  XCircle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export type AdminVerificationCase = {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerEmail?: string | null;
  legalName?: string | null;
  status: "verified" | "pending_review" | "needs_information" | "rejected" | "suspended" | string;
  country: string;
  entityType: string;
  submittedAt?: string | null;
  updatedAt: string;
  accountStatus: string;
};

export type VerificationDetail = {
  case: {
    id: string;
    sellerId: string;
    status: string;
    country: string;
    entityType: string;
    submittedAt?: string | null;
    reviewedAt?: string | null;
    expiresAt?: string | null;
    reviewReason?: string | null;
    requirementsVersion: string;
    updatedAt: string;
  };
  seller: {
    id: string;
    name: string;
    email: string;
    accountStatus: string;
    isVerified: boolean;
  };
  businessProfile?: {
    legalName: string;
    tradingName?: string | null;
    entityType: string;
    registeredAddress?: Record<string, unknown>;
  };
  documents: Array<{
    id: string;
    requirementCode: string;
    status: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
    uploadedAt: string;
  }>;
  events: Array<{
    id: string;
    eventType: string;
    actorName: string;
    createdAt: string;
    reason?: string | null;
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

export function AgriVerificationCentre({
  permissions = [],
}: {
  permissions?: string[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Review modal state
  const [reviewTarget, setReviewTarget] = useState<AdminVerificationCase | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"verified" | "needs_information" | "rejected" | "suspended">("verified");
  const [reviewReason, setReviewReason] = useState("");

  // Query verification cases
  const { data: verificationsData, isLoading, refetch, isFetching } = useQuery<{
    cases: AdminVerificationCase[];
    pagination: { total: number; page: number; pageSize: number; pageCount: number };
    filters: { statuses: string[]; countries: string[]; entityTypes: string[] };
  }>({
    queryKey: ["/api/admin/verifications", { page: 1, pageSize: 200 }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/verifications?page=1&pageSize=200");
      return res.json();
    },
  });

  const cases = useMemo(() => verificationsData?.cases ?? [], [verificationsData]);

  // Query single verification case detail
  const { data: detailData, isLoading: isLoadingDetail } = useQuery<VerificationDetail>({
    queryKey: ["/api/admin/verifications", selectedCaseId],
    queryFn: async () => {
      if (!selectedCaseId) return null as never;
      const res = await apiRequest("GET", `/api/admin/verifications/${selectedCaseId}`);
      return res.json();
    },
    enabled: Boolean(selectedCaseId),
  });

  // Extract unique entity types
  const entityTypes = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((c) => {
      if (c.entityType) set.add(c.entityType);
    });
    return Array.from(set).sort();
  }, [cases]);

  // Filter cases
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchName = c.sellerName?.toLowerCase().includes(q);
        const matchLegal = c.legalName?.toLowerCase().includes(q);
        const matchEmail = c.sellerEmail?.toLowerCase().includes(q);
        const matchId = c.id.toLowerCase().includes(q);
        if (!matchName && !matchLegal && !matchEmail && !matchId) return false;
      }

      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (entityFilter !== "all" && c.entityType !== entityFilter) return false;

      return true;
    });
  }, [cases, search, statusFilter, entityFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredCases.length / pageSize) || 1;
  const paginatedCases = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCases.slice(start, start + pageSize);
  }, [filteredCases, page, pageSize]);

  // KPI Metrics
  const stats = useMemo(() => {
    const total = cases.length;
    const pending = cases.filter((c) => c.status === "pending_review").length;
    const needsInfo = cases.filter((c) => c.status === "needs_information").length;
    const verified = cases.filter((c) => c.status === "verified").length;
    const coops = cases.filter((c) => c.entityType === "cooperative" || c.entityType === "limited_company").length;
    const suspended = cases.filter((c) => c.status === "suspended" || c.status === "rejected").length;

    return {
      total,
      pending,
      needsInfo,
      verified,
      coops,
      suspended,
    };
  }, [cases]);

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ caseId, decision, reason, expectedUpdatedAt }: { caseId: string; decision: string; reason: string; expectedUpdatedAt?: string }) => {
      const res = await apiRequest("POST", `/api/admin/verifications/${caseId}/review`, {
        decision,
        reason,
        expectedUpdatedAt,
        documentDecisions: [],
      });
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast({
        title: vars.decision === "verified" ? "Producer Verified" : vars.decision === "needs_information" ? "Information Requested" : "Verification Rejected",
        description: "Official compliance decision recorded in audit ledger.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/farmers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sellers"] });
      if (selectedCaseId) queryClient.invalidateQueries({ queryKey: ["/api/admin/verifications", selectedCaseId] });
      setReviewTarget(null);
      setReviewReason("");
    },
    onError: (err: Error) => {
      toast({ title: "Review failed", description: err.message, variant: "destructive" });
    },
  });

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["Case ID", "Legal Business Name", "Trading Name", "Seller Email", "Entity Type", "Country", "Status", "Submitted At"];
    const rows = filteredCases.map((c) => [
      `"${c.id}"`,
      `"${c.legalName || ""}"`,
      `"${c.sellerName || ""}"`,
      `"${c.sellerEmail || ""}"`,
      `"${c.entityType || ""}"`,
      `"${c.country || ""}"`,
      `"${c.status}"`,
      `"${c.submittedAt || "N/A"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agriconnect-verifications-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV Exported", description: `Exported ${filteredCases.length} verification cases.` });
  };

  const canReview = permissions.includes("verification.review") || permissions.includes("verification.approve") || permissions.includes("dashboard.view");

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <span>Management</span>
            <span>/</span>
            <span>Seller & Producer Verification</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Verification & Compliance Centre
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review legal farm registrations, business documentation, tax identifiers, DEFRA certs, and producer compliance queues.
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

          <Badge className="h-9 bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold px-3">
            <ShieldCheck className="mr-1.5 h-4 w-4 text-emerald-600" />
            <span>Permission-gated reviews</span>
          </Badge>
        </div>
      </div>

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Total Cases"
          value={stats.total.toLocaleString()}
          subtitle="Verification queue"
          icon={FileCheck}
          iconBg="bg-emerald-50"
          iconColor="text-[#078c52]"
        />
        <StatCard
          title="Pending Review"
          value={stats.pending.toLocaleString()}
          subtitle="Awaiting action"
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Needs Info"
          value={stats.needsInfo.toLocaleString()}
          subtitle="Awaiting documents"
          icon={HelpCircle}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
        />
        <StatCard
          title="Verified Sellers"
          value={stats.verified.toLocaleString()}
          subtitle="Certified for market"
          icon={BadgeCheck}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="Co-ops & Corporate"
          value={stats.coops.toLocaleString()}
          subtitle="Enterprise farms"
          icon={Building2}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Suspended / Flagged"
          value={stats.suspended.toLocaleString()}
          subtitle="Compliance holds"
          icon={ShieldAlert}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
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
                placeholder="Search legal business name, trading name, email or case ID..."
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
                <SelectTrigger className="h-10 w-[160px] text-xs font-medium">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="needs_information">Needs Information</SelectItem>
                  <SelectItem value="verified">Verified (Approved)</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={entityFilter}
                onValueChange={(val) => {
                  setEntityFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[170px] text-xs font-medium truncate">
                  <SelectValue placeholder="Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entity Types</SelectItem>
                  {entityTypes.map((et) => (
                    <SelectItem key={et} value={et}>
                      {et.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(search || statusFilter !== "all" || entityFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setEntityFilter("all");
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
                <th className="px-4 py-3">Producer / Legal Name</th>
                <th className="px-4 py-3">Business Entity Type</th>
                <th className="px-4 py-3 text-center">Country</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3 text-center">Compliance Status</th>
                <th className="px-4 py-3 text-right">Review Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="h-4 w-full rounded bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : paginatedCases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FileCheck2 className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-semibold">No verification cases match your query</p>
                    <p className="text-xs">All producer verification cases have been audited or filter is too restrictive.</p>
                  </td>
                </tr>
              ) : (
                paginatedCases.map((item) => {
                  const isVerified = item.status === "verified";
                  const isPending = item.status === "pending_review";
                  const isNeedsInfo = item.status === "needs_information";
                  const isSuspended = item.status === "suspended" || item.status === "rejected";

                  return (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-emerald-50/40"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded-full border">
                            <AvatarFallback className="bg-emerald-100 text-xs font-black text-[#053f36]">
                              {item.sellerName?.charAt(0) || "P"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <button
                              onClick={() => setSelectedCaseId(item.id)}
                              className="font-bold text-slate-900 hover:text-[#078c52] hover:underline text-left block"
                            >
                              {item.legalName || item.sellerName}
                            </button>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">
                              {item.sellerEmail} · Case #{item.id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 capitalize font-medium text-[10px]">
                          {item.entityType?.replaceAll("_", " ")}
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {item.country === "GB" ? "🇬🇧 UK" : item.country}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 font-mono text-[11px]">
                        {timeAgo(item.submittedAt)}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isVerified
                              ? "bg-emerald-100 text-emerald-800"
                              : isPending
                              ? "bg-amber-100 text-amber-800"
                              : isNeedsInfo
                              ? "bg-orange-100 text-orange-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isVerified
                                ? "bg-emerald-500"
                                : isPending
                                ? "bg-amber-500"
                                : isNeedsInfo
                                ? "bg-orange-500"
                                : "bg-rose-500"
                            }`}
                          />
                          {item.status.replaceAll("_", " ")}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCaseId(item.id)}
                            className="h-7 text-xs font-bold border-emerald-700 text-emerald-800 hover:bg-emerald-50"
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            <span>Open review</span>
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs font-medium">
                              <DropdownMenuLabel>Verification Decision</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setReviewTarget(item);
                                  setReviewDecision("verified");
                                  setReviewReason("Meets all legal, tax, and agricultural requirements.");
                                }}
                              >
                                <ThumbsUp className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                                <span>Approve & Certify</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setReviewTarget(item);
                                  setReviewDecision("needs_information");
                                  setReviewReason("");
                                }}
                              >
                                <HelpCircle className="mr-2 h-3.5 w-3.5 text-amber-600" />
                                <span>Request Information</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setReviewTarget(item);
                                  setReviewDecision("rejected");
                                  setReviewReason("");
                                }}
                                className="text-rose-600"
                              >
                                <ThumbsDown className="mr-2 h-3.5 w-3.5" />
                                <span>Reject Case</span>
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
            Showing <span className="font-semibold text-slate-900">{filteredCases.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">{Math.min(page * pageSize, filteredCases.length)}</span> of{" "}
            <span className="font-semibold text-slate-900">{filteredCases.length}</span> cases
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

      {/* Case Review Drawer */}
      <Sheet open={Boolean(selectedCaseId)} onOpenChange={(open) => !open && setSelectedCaseId(null)}>
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
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black">
                        {detailData.businessProfile?.legalName || detailData.seller?.name}
                      </h2>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-[10px] text-white/60">ID: {detailData.case.id}</span>
                        <Badge
                          variant="outline"
                          className={
                            detailData.case.status === "verified"
                              ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-200"
                              : "border-amber-400/30 bg-amber-500/20 text-amber-200"
                          }
                        >
                          {detailData.case.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCaseId(null)}
                    className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 4 Stat Boxes */}
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Entity</p>
                    <p className="text-xs font-black text-lime-300 capitalize truncate">
                      {detailData.case.entityType.replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Account</p>
                    <p className="text-xs font-bold text-white capitalize">{detailData.seller?.accountStatus || "Active"}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Country</p>
                    <p className="text-xs font-bold text-white">🇬🇧 {detailData.case.country}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Submitted</p>
                    <p className="text-[11px] font-medium text-white/80">{timeAgo(detailData.case.submittedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="overview" className="flex-1 p-6">
                <TabsList className="grid w-full grid-cols-2 bg-slate-200">
                  <TabsTrigger value="overview" className="text-xs font-bold">
                    Entity & Documents
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-xs font-bold">
                    Audit & Review Trail
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-4 space-y-4">
                  <Card className="border-slate-200">
                    <CardContent className="p-4 space-y-3 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Legal Company Name</span>
                        <span className="font-bold text-slate-900">{detailData.businessProfile?.legalName || detailData.seller?.name}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Registered Email</span>
                        <span className="font-mono text-slate-700">{detailData.seller?.email}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Requirements Spec</span>
                        <span className="font-mono text-slate-700">{detailData.case.requirementsVersion}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Last Review Reason</span>
                        <span className="font-medium text-slate-700 italic">{detailData.case.reviewReason || "None provided"}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Reviewed At</span>
                        <span className="font-mono text-slate-600">{timeAgo(detailData.case.reviewedAt)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        className="bg-[#078c52] text-white hover:bg-[#067343] text-xs h-9"
                        onClick={() => {
                          const target = cases.find((c) => c.id === detailData.case.id);
                          if (target) {
                            setReviewTarget(target);
                            setReviewDecision("verified");
                            setReviewReason("Full compliance verified against DEFRA and AgriConnect registers.");
                          }
                        }}
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approve & Certify
                      </Button>
                      <Button
                        variant="outline"
                        className="text-xs h-9 text-amber-700 border-amber-300 hover:bg-amber-50"
                        onClick={() => {
                          const target = cases.find((c) => c.id === detailData.case.id);
                          if (target) {
                            setReviewTarget(target);
                            setReviewDecision("needs_information");
                            setReviewReason("");
                          }
                        }}
                      >
                        <HelpCircle className="mr-1.5 h-3.5 w-3.5" /> Request Info
                      </Button>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full text-xs h-9 text-rose-700 border-rose-300 hover:bg-rose-50"
                      onClick={() => {
                        const target = cases.find((c) => c.id === detailData.case.id);
                        if (target) {
                          setReviewTarget(target);
                          setReviewDecision("rejected");
                          setReviewReason("");
                        }
                      }}
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject Verification Case
                    </Button>
                  </div>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="mt-4 space-y-2">
                  {detailData.events?.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Clock className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                      <p className="font-semibold">No audit events recorded</p>
                    </div>
                  ) : (
                    detailData.events.map((event) => (
                      <div key={event.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 capitalize">
                            {event.eventType.replaceAll("_", " ")}
                          </span>
                          <span className="text-[10px] text-slate-400">{timeAgo(event.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-600">
                          Auditor: {event.actorName} {event.reason ? `· Note: "${event.reason}"` : ""}
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

      {/* Review Modal */}
      <Dialog open={Boolean(reviewTarget)} onOpenChange={(open) => !open && setReviewTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              {reviewDecision === "verified"
                ? "Approve Producer Verification"
                : reviewDecision === "needs_information"
                ? "Request Further Verification Evidence"
                : "Reject Verification Application"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {reviewTarget?.legalName || reviewTarget?.sellerName} (Case #{reviewTarget?.id.slice(0, 8)})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Audit Justification / Decision Reason *</Label>
              <textarea
                rows={3}
                placeholder="Explain the review decision (minimum 3 characters, permanently recorded in audit ledger)..."
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-xs focus:border-[#078c52] focus:outline-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReviewTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={reviewReason.trim().length < 3 || reviewMutation.isPending}
              onClick={() => {
                if (reviewTarget) {
                  reviewMutation.mutate({
                    caseId: reviewTarget.id,
                    decision: reviewDecision,
                    reason: reviewReason.trim(),
                    expectedUpdatedAt: reviewTarget.updatedAt,
                  });
                }
              }}
              className={
                reviewDecision === "verified"
                  ? "bg-[#078c52] text-white hover:bg-[#067343]"
                  : reviewDecision === "needs_information"
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : "bg-rose-600 text-white hover:bg-rose-700"
              }
            >
              {reviewMutation.isPending
                ? "Saving..."
                : reviewDecision === "verified"
                ? "Approve & Certify"
                : reviewDecision === "needs_information"
                ? "Send Request to Seller"
                : "Reject Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
