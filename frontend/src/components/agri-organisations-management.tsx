import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Award,
  BookOpen,
  Building,
  Building2,
  Calendar,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe,
  HelpCircle,
  Layers,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlock,
  UserCheck,
  UserPlus,
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

export type OrganisationApplication = {
  id: string;
  organisationId?: string | null;
  applicantUserId?: string | null;
  organisationName: string;
  officialEmail: string;
  status: "pending_review" | "documents_required" | "approved" | "rejected" | string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewReason?: string | null;
  applicationData?: {
    regNumber?: string;
    region?: string;
    memberCount?: number;
    primaryCrop?: string;
    contactPerson?: string;
    documents?: string[];
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type RegisteredOrganisation = {
  id: string;
  name: string;
  slug: string;
  officialEmail?: string | null;
  type: string;
  status: string;
  verifiedAt?: string | null;
  updatedAt?: string;
};

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

export function AgriOrganisationsManagement({
  permissions = [],
}: {
  permissions?: string[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"applications" | "directory">("applications");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Selected for drawer
  const [selectedApp, setSelectedApp] = useState<OrganisationApplication | null>(null);

  // Review modal state
  const [reviewApp, setReviewApp] = useState<OrganisationApplication | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"approved" | "documents_required" | "rejected">("approved");
  const [reviewReason, setReviewReason] = useState("");

  // Start new application modal
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgEmail, setNewOrgEmail] = useState("");
  const [newOrgRegion, setNewOrgRegion] = useState("");
  const [newOrgMemberCount, setNewOrgMemberCount] = useState("");
  const [newOrgCrop, setNewOrgCrop] = useState("");
  const [newOrgContact, setNewOrgContact] = useState("");

  // Query applications
  const {
    data: appData,
    isLoading: isLoadingApps,
    isError: isAppsError,
    refetch: refetchApps,
    isFetching: isFetchingApps,
  } = useQuery<{ applications: OrganisationApplication[] }>({
    queryKey: ["/api/admin/organisations/applications"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/organisations/applications");
      return res.json();
    },
  });

  // Query registered directory
  const {
    data: orgsData,
    isLoading: isLoadingOrgs,
    isError: isOrgsError,
    refetch: refetchOrgs,
  } = useQuery<{ records: RegisteredOrganisation[] }>({
    queryKey: ["/api/admin/resources/service-providers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/resources/service-providers");
      return res.json();
    },
  });

  const applications = useMemo(() => appData?.applications ?? [], [appData]);
  const registeredOrgs = useMemo(() => orgsData?.records ?? [], [orgsData]);

  // Review Mutation
  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: "approved" | "documents_required" | "rejected";
      reason: string;
    }) => {
      const res = await apiRequest("POST", `/api/admin/organisations/applications/${id}/review`, {
        status,
        reason: reason.trim(),
      });
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast({
        title: vars.status === "approved" ? "Application Approved" : vars.status === "documents_required" ? "Documents Requested" : "Application Rejected",
        description: `Decision logged to audit ledger with status ${vars.status}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organisations/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/service-providers"] });
      setReviewApp(null);
      setSelectedApp(null);
      setReviewReason("");
    },
    onError: (err: Error) => {
      toast({ title: "Review failed", description: err.message, variant: "destructive" });
    },
  });

  // Create Application Mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      organisationName: string;
      officialEmail: string;
      region?: string;
      memberCount?: number;
      primaryCrop?: string;
      contactPerson?: string;
    }) => {
      const res = await apiRequest("POST", "/api/admin/organisations/applications", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Application Registered", description: "Submitted for regional owner review." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organisations/applications"] });
      setStartModalOpen(false);
      setNewOrgName("");
      setNewOrgEmail("");
      setNewOrgRegion("");
      setNewOrgMemberCount("");
      setNewOrgCrop("");
      setNewOrgContact("");
    },
    onError: (err: Error) => {
      toast({ title: "Application failed", description: err.message, variant: "destructive" });
    },
  });

  // Filter applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchName = app.organisationName.toLowerCase().includes(q);
        const matchEmail = app.officialEmail.toLowerCase().includes(q);
        const matchId = app.id.toLowerCase().includes(q);
        const matchRegion = app.applicationData?.region?.toLowerCase().includes(q);
        const matchCrop = app.applicationData?.primaryCrop?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchId && !matchRegion && !matchCrop) return false;
      }

      if (statusFilter !== "all" && app.status !== statusFilter) return false;

      return true;
    });
  }, [applications, search, statusFilter]);

  // Paginated applications
  const totalPages = Math.ceil(filteredApplications.length / pageSize) || 1;
  const paginatedApplications = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredApplications.slice(start, start + pageSize);
  }, [filteredApplications, page, pageSize]);

  // KPI Metrics
  const stats = useMemo(() => {
    const totalApps = applications.length;
    const pending = applications.filter((a) => a.status === "pending_review").length;
    const docsReq = applications.filter((a) => a.status === "documents_required").length;
    const approved = applications.filter((a) => a.status === "approved").length;
    const rejected = applications.filter((a) => a.status === "rejected").length;
    const registeredCount = registeredOrgs.length;

    return {
      totalApps,
      pending,
      docsReq,
      approved,
      rejected,
      registeredCount,
    };
  }, [applications, registeredOrgs]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["Application ID", "Organisation Name", "Official Email", "Status", "Region", "Member Count", "Primary Focus", "Submitted Date", "Review Reason"];
    const rows = filteredApplications.map((a) => [
      `"${a.id}"`,
      `"${a.organisationName}"`,
      `"${a.officialEmail}"`,
      `"${a.status}"`,
      `"${a.applicationData?.region || ""}"`,
      `"${a.applicationData?.memberCount || ""}"`,
      `"${a.applicationData?.primaryCrop || ""}"`,
      `"${a.submittedAt ? new Date(a.submittedAt).toISOString() : ""}"`,
      `"${a.reviewReason || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agriconnect-organisations-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV Exported", description: `Exported ${filteredApplications.length} organisation records.` });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-600 text-white font-bold gap-1">
            <CheckCircle className="h-3 w-3" /> Approved
          </Badge>
        );
      case "documents_required":
        return (
          <Badge className="bg-amber-500 text-white font-bold gap-1">
            <FileQuestion className="h-3 w-3" /> Documents Req.
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-rose-600 text-white font-bold gap-1">
            <XCircle className="h-3 w-3" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-600 text-white font-bold gap-1">
            <Clock className="h-3 w-3" /> Pending Review
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <span>User Management</span>
            <span>/</span>
            <span>Organisations</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Organisation Applications & Directory
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review submitted regional owner applications, audit agricultural cooperatives, and manage accredited agribusinesses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchApps();
              refetchOrgs();
            }}
            disabled={isFetchingApps}
            className="h-9 gap-1.5 border-slate-300 bg-white font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetchingApps ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={filteredApplications.length === 0}
            className="h-9 gap-1.5 border-slate-300 bg-white font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export page</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setStartModalOpen(true)}
            className="h-9 gap-1.5 bg-[#078c52] font-semibold text-white shadow-sm hover:bg-[#067343]"
          >
            <Building2 className="h-4 w-4" />
            <span>+ Start application</span>
          </Button>
        </div>
      </div>

      {/* Top 6 KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Total Applications"
          value={stats.totalApps.toLocaleString()}
          subtitle="Submitted filings"
          icon={Layers}
          iconBg="bg-emerald-50"
          iconColor="text-[#078c52]"
        />
        <StatCard
          title="Pending Review"
          value={stats.pending.toLocaleString()}
          subtitle="Action required"
          icon={Clock}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Documents Req."
          value={stats.docsReq.toLocaleString()}
          subtitle="Awaiting compliance"
          icon={FileQuestion}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Approved"
          value={stats.approved.toLocaleString()}
          subtitle="Verified & active"
          icon={CheckCircle2}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="Registered Orgs"
          value={stats.registeredCount.toLocaleString()}
          subtitle="Active directory"
          icon={Building}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Rejected / Inactive"
          value={stats.rejected.toLocaleString()}
          subtitle="Denied applications"
          icon={ShieldAlert}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("applications")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-black transition-colors ${
            activeTab === "applications"
              ? "border-[#078c52] text-[#053f36]"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Applications Pipeline ({applications.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("directory")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-black transition-colors ${
            activeTab === "directory"
              ? "border-[#078c52] text-[#053f36]"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Registered Organisations ({registeredOrgs.length})</span>
        </button>
      </div>

      {activeTab === "applications" ? (
        <>
          {/* Search & Filter Bar */}
          <Card className="border border-emerald-950/10 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                {/* Search Input */}
                <div className="relative min-w-[240px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search organisation name, official email, region, or focus domain..."
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

                {/* Status Filter */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <Select
                    value={statusFilter}
                    onValueChange={(val) => {
                      setStatusFilter(val);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 w-[170px] text-xs font-medium">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending_review">Pending Review</SelectItem>
                      <SelectItem value="documents_required">Documents Required</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
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

          {/* Applications Table Card */}
          <Card className="overflow-hidden border border-emerald-950/10 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Organisation</th>
                    <th className="px-4 py-3">Official Email</th>
                    <th className="px-4 py-3">Region & Domain</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {isLoadingApps ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="h-4 w-full rounded bg-slate-200" />
                        </td>
                      </tr>
                    ))
                  ) : isAppsError ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-rose-600">
                        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-rose-400" />
                        <p className="text-sm font-semibold">Organisation applications could not be loaded</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetchApps()}>
                          Try again
                        </Button>
                      </td>
                    </tr>
                  ) : paginatedApplications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Building2 className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                        <p className="text-sm font-semibold">
                          {applications.length === 0 ? "No organisation applications yet" : "No organisation applications found"}
                        </p>
                        <p className="text-xs">
                          {applications.length === 0
                            ? "Real applications will appear here after they are submitted."
                            : "Adjust your search or status filter."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedApplications.map((app) => (
                      <tr
                        key={app.id}
                        className="group transition-colors hover:bg-emerald-50/40"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 font-bold text-[#053f36]">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div>
                              <button
                                onClick={() => setSelectedApp(app)}
                                className="font-bold text-slate-900 hover:text-[#078c52] hover:underline"
                              >
                                {app.organisationName}
                              </button>
                              <p className="font-mono text-[10px] text-slate-400">ID: {app.id}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-slate-600 font-medium">
                          {app.officialEmail}
                        </td>

                        <td className="px-4 py-3.5 max-w-xs">
                          <p className="font-semibold text-slate-900 truncate">
                            {app.applicationData?.region || "—"}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {[app.applicationData?.primaryCrop, typeof app.applicationData?.memberCount === "number"
                              ? `${app.applicationData.memberCount} members`
                              : null].filter(Boolean).join(" · ") || "—"}
                          </p>
                        </td>

                        <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                          {app.submittedAt ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span>{new Date(app.submittedAt).toLocaleDateString("en-GB")}</span>
                            </div>
                          ) : (
                            "Draft"
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          {getStatusBadge(app.status)}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedApp(app)}
                              className="h-7 w-7 text-slate-500 hover:text-slate-900"
                              title="Inspect application dossier"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => {
                                setReviewApp(app);
                                setReviewDecision(app.status === "documents_required" ? "documents_required" : "approved");
                                setReviewReason(app.reviewReason || "");
                              }}
                              className="h-7 gap-1 bg-[#183f35] px-2.5 text-[11px] font-bold text-white hover:bg-[#0f2a23]"
                            >
                              <ShieldCheck className="h-3 w-3" />
                              <span>Review</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-500">
              <div>
                Showing <span className="font-semibold text-slate-900">{filteredApplications.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{" "}
                <span className="font-semibold text-slate-900">{Math.min(page * pageSize, filteredApplications.length)}</span> of{" "}
                <span className="font-semibold text-slate-900">{filteredApplications.length}</span> applications
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
        </>
      ) : (
        /* Registered Directory Tab */
        <Card className="overflow-hidden border border-emerald-950/10 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Organisation</th>
                  <th className="px-4 py-3">Slug Identifier</th>
                  <th className="px-4 py-3">Official Email</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {isLoadingOrgs ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="h-4 w-full rounded bg-slate-200" />
                      </td>
                    </tr>
                  ))
                ) : isOrgsError ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-rose-600">
                      <AlertCircle className="mx-auto mb-2 h-8 w-8 text-rose-400" />
                      <p className="font-semibold">Registered organisations could not be loaded</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => refetchOrgs()}>
                        Try again
                      </Button>
                    </td>
                  </tr>
                ) : registeredOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Building className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      <p className="font-semibold">No registered organisations found</p>
                      <p className="text-xs">Approved organisations will appear here after registration.</p>
                    </td>
                  </tr>
                ) : (
                  registeredOrgs.map((org) => (
                    <tr key={org.id} className="hover:bg-emerald-50/40">
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {org.name}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600">
                        {org.slug || org.id}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {org.officialEmail || "—"}
                      </td>
                      <td className="px-4 py-3.5 capitalize text-slate-700">
                        <Badge variant="outline" className="text-[10px]">
                          {org.type || "—"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {org.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        {timeAgo(org.updatedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Slide-over Drawer for Application Dossier */}
      <Sheet open={Boolean(selectedApp)} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto bg-slate-50">
          {selectedApp && (
            <div className="flex flex-col min-h-full">
              {/* Header */}
              <div className="bg-[#053f36] p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lime-400 font-bold text-[#053f36]">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black">{selectedApp.organisationName}</h2>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-[10px] text-white/60">ID: {selectedApp.id}</span>
                        {getStatusBadge(selectedApp.status)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 4 Stat Boxes */}
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Region</p>
                    <p className="text-xs font-bold text-white truncate">{selectedApp.applicationData?.region || "—"}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Members</p>
                    <p className="text-base font-black text-lime-300">{selectedApp.applicationData?.memberCount ?? "—"}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Documents</p>
                    <p className="text-base font-black text-white">{selectedApp.applicationData?.documents?.length ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Submitted</p>
                    <p className="text-[11px] font-medium text-white/80">
                      {selectedApp.submittedAt ? new Date(selectedApp.submittedAt).toLocaleDateString("en-GB") : "Draft"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 flex-1">
                <Card className="border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase text-slate-500">
                      Application Filing Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Official Contact Email</span>
                      <span className="font-semibold text-slate-900">{selectedApp.officialEmail}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Contact Officer</span>
                      <span className="font-semibold text-slate-900">{selectedApp.applicationData?.contactPerson || "—"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Registration Number</span>
                      <span className="font-mono font-semibold text-slate-900">{selectedApp.applicationData?.regNumber || "—"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Primary Agricultural Scope</span>
                      <span className="font-semibold text-slate-900">{selectedApp.applicationData?.primaryCrop || "—"}</span>
                    </div>
                    {selectedApp.reviewReason && (
                      <div className="pt-2">
                        <span className="text-slate-500 block mb-1">Audit Decision Reason:</span>
                        <div className="rounded-md bg-slate-100 p-2.5 font-medium text-slate-800">
                          {selectedApp.reviewReason}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Document Attachments */}
                <Card className="border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase text-slate-500">
                      Submitted Compliance Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    {selectedApp.applicationData?.documents?.length ? (
                      selectedApp.applicationData.documents.map((doc, idx) => (
                        <div key={`${doc}-${idx}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5">
                          <div className="flex items-center gap-2">
                            <FileCheck className="h-4 w-4 text-emerald-600" />
                            <span className="font-semibold text-slate-800">{doc}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">Submitted</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="py-3 text-center text-slate-400">No compliance documents submitted.</p>
                    )}
                  </CardContent>
                </Card>

                <div className="pt-2">
                  <Button
                    onClick={() => {
                      setReviewApp(selectedApp);
                      setReviewDecision(selectedApp.status === "documents_required" ? "documents_required" : "approved");
                      setReviewReason(selectedApp.reviewReason || "");
                    }}
                    className="w-full bg-[#183f35] font-bold text-white hover:bg-[#0f2a23]"
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" /> Open Review Decision
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Review Decision Modal */}
      <Dialog open={Boolean(reviewApp)} onOpenChange={(open) => !open && setReviewApp(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              Review Organisation Application
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Audit and record decision for <b>{reviewApp?.organisationName}</b> ({reviewApp?.officialEmail}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">Select Review Decision *</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setReviewDecision("approved")}
                  className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                    reviewDecision === "approved"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <CheckCircle className="h-5 w-5 text-emerald-600 mb-1" />
                  <span className="font-bold">Approve</span>
                  <span className="text-[10px] text-slate-500">Create active org</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewDecision("documents_required")}
                  className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                    reviewDecision === "documents_required"
                      ? "border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-600"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <FileQuestion className="h-5 w-5 text-amber-600 mb-1" />
                  <span className="font-bold">Request Docs</span>
                  <span className="text-[10px] text-slate-500">Ask for filings</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewDecision("rejected")}
                  className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                    reviewDecision === "rejected"
                      ? "border-rose-600 bg-rose-50 text-rose-900 ring-2 ring-rose-600"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <XCircle className="h-5 w-5 text-rose-600 mb-1" />
                  <span className="font-bold">Reject</span>
                  <span className="text-[10px] text-slate-500">Decline application</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Reason / Compliance Justification (Mandatory for audit trail) *
              </Label>
              <textarea
                rows={3}
                placeholder="Provide clear rationale for approval, document request, or rejection..."
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2.5 text-xs focus:border-[#078c52] focus:outline-none"
              />
              <p className="text-[10px] text-slate-400">Minimum 3 characters required. Written permanently to the admin audit journal.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReviewApp(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={reviewMutation.isPending || reviewReason.trim().length < 3}
              onClick={() => {
                if (reviewApp) {
                  reviewMutation.mutate({
                    id: reviewApp.id,
                    status: reviewDecision,
                    reason: reviewReason,
                  });
                }
              }}
              className={
                reviewDecision === "approved"
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : reviewDecision === "documents_required"
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : "bg-rose-600 text-white hover:bg-rose-700"
              }
            >
              {reviewMutation.isPending ? "Recording decision..." : `Submit ${reviewDecision.replace("_", " ")}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start New Application Modal */}
      <Dialog open={startModalOpen} onOpenChange={setStartModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Start Organisation Application</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Submit a regional agricultural cooperative or enterprise application into the review queue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Organisation Name *</Label>
              <Input
                placeholder="Enter the registered organisation name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Official Organization Email *</Label>
              <Input
                type="email"
                placeholder="contact@organisation.co.uk"
                value={newOrgEmail}
                onChange={(e) => setNewOrgEmail(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Region</Label>
                <Input
                  placeholder="Enter the operating region"
                  value={newOrgRegion}
                  onChange={(e) => setNewOrgRegion(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Member Count</Label>
                <Input
                  type="number"
                  min={0}
                  max={10000000}
                  placeholder="Enter member count"
                  value={newOrgMemberCount}
                  onChange={(e) => setNewOrgMemberCount(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Primary Agricultural Scope / Crop</Label>
              <Input
                placeholder="Enter the agricultural scope or crops"
                value={newOrgCrop}
                onChange={(e) => setNewOrgCrop(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Contact Person / Officer</Label>
              <Input
                placeholder="Enter the responsible contact person"
                value={newOrgContact}
                onChange={(e) => setNewOrgContact(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setStartModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newOrgName.trim() || !newOrgEmail.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  organisationName: newOrgName,
                  officialEmail: newOrgEmail,
                  region: newOrgRegion || undefined,
                  memberCount: Number(newOrgMemberCount) || undefined,
                  primaryCrop: newOrgCrop || undefined,
                  contactPerson: newOrgContact || undefined,
                })
              }
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              {createMutation.isPending ? "Submitting..." : "Submit Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
