import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Award,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  Download,
  Dna,
  Eye,
  FileText,
  Filter,
  FlaskConical,
  GraduationCap,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Microscope,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlock,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export type ResearcherRecord = {
  id: string;
  name: string;
  email: string;
  researcherId?: string | null;
  researchDomain: string;
  roleLevel: "PhD" | "Postdoc" | "PI" | "Fellow" | string;
  department?: string | null;
  status: "active" | "suspended" | "completed" | "withdrawn" | "expired" | string;
  accessExpiresAt?: string | null;
  avatar?: string | null;
  phone?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ResearcherDetail = {
  id: string;
  name: string;
  email: string;
  researcherId: string;
  researchDomain: string;
  roleLevel: string;
  department: string;
  status: string;
  accessExpiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
  avatar?: string;
  phone?: string;
  activity: Array<{
    action: string;
    targetType: string;
    outcome: string;
    occurredAt: string;
  }>;
  generatedAt: string;
};

function timeAgo(dateString?: string): string {
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

export function AgriResearchersManagement({
  initialSearch = "",
  permissions = [],
}: {
  initialSearch?: string;
  permissions?: string[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [selectedResearcherId, setSelectedResearcherId] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Modals state
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [editResearcher, setEditResearcher] = useState<ResearcherRecord | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<ResearcherRecord | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [messageTarget, setMessageTarget] = useState<ResearcherRecord | null>(null);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");

  // New researcher form state
  const [newEmail, setNewEmail] = useState("");
  const [newResearcherId, setNewResearcherId] = useState("");
  const [newResearchDomain, setNewResearchDomain] = useState("");
  const [newRoleLevel, setNewRoleLevel] = useState<"PhD" | "Postdoc" | "PI" | "Fellow">("PhD");
  const [newDepartment, setNewDepartment] = useState("Agricultural Sciences & Molecular Biology");

  // Query researchers
  const { data: researchersData, isLoading, refetch, isFetching } = useQuery<{ records: ResearcherRecord[] }>({
    queryKey: ["/api/admin/resources/researchers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/resources/researchers");
      return res.json();
    },
  });

  const researchers = useMemo(() => researchersData?.records ?? [], [researchersData]);

  // Query single researcher detail when drawer opens
  const { data: researcherDetail, isLoading: isLoadingDetail } = useQuery<ResearcherDetail>({
    queryKey: ["/api/admin/researchers", selectedResearcherId],
    queryFn: async () => {
      if (!selectedResearcherId) return null as never;
      const res = await apiRequest("GET", `/api/admin/researchers/${selectedResearcherId}`);
      return res.json();
    },
    enabled: Boolean(selectedResearcherId),
  });

  // Extract unique departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    researchers.forEach((r) => {
      if (r.department) set.add(r.department);
    });
    return Array.from(set).sort();
  }, [researchers]);

  // Filter researchers
  const filteredResearchers = useMemo(() => {
    return researchers.filter((researcher) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchesName = researcher.name?.toLowerCase().includes(q);
        const matchesEmail = researcher.email?.toLowerCase().includes(q);
        const matchesNum = researcher.researcherId?.toLowerCase().includes(q);
        const matchesDomain = researcher.researchDomain?.toLowerCase().includes(q);
        const matchesDept = researcher.department?.toLowerCase().includes(q);
        const matchesId = researcher.id.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesNum && !matchesDomain && !matchesDept && !matchesId) return false;
      }

      if (statusFilter !== "all" && researcher.status !== statusFilter) return false;
      if (roleFilter !== "all" && researcher.roleLevel !== roleFilter) return false;
      if (deptFilter !== "all" && researcher.department !== deptFilter) return false;

      return true;
    });
  }, [researchers, search, statusFilter, roleFilter, deptFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredResearchers.length / pageSize) || 1;
  const paginatedResearchers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredResearchers.slice(start, start + pageSize);
  }, [filteredResearchers, page, pageSize]);

  // Top KPI Metrics
  const stats = useMemo(() => {
    const total = researchers.length;
    const active = researchers.filter((r) => r.status === "active").length;
    const phd = researchers.filter((r) => r.roleLevel === "PhD").length;
    const postdoc = researchers.filter((r) => r.roleLevel === "Postdoc").length;
    const pi = researchers.filter((r) => r.roleLevel === "PI" || r.roleLevel === "Fellow").length;
    const suspended = researchers.filter((r) => r.status === "suspended" || r.status === "withdrawn").length;

    return {
      total,
      active,
      phd,
      postdoc,
      pi,
      suspended,
    };
  }, [researchers]);

  // Mutations
  const onboardMutation = useMutation({
    mutationFn: async (data: {
      email: string;
      researcherId: string;
      researchDomain: string;
      roleLevel: "PhD" | "Postdoc" | "PI" | "Fellow";
      department?: string;
    }) => {
      const res = await apiRequest("POST", "/api/admin/researchers", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Researcher Enrolled", description: "Scientific research profile created in directory." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/researchers"] });
      setOnboardOpen(false);
      setNewEmail("");
      setNewResearcherId("");
      setNewResearchDomain("");
    },
    onError: (err: Error) => {
      toast({ title: "Enrolment failed", description: err.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ResearcherRecord> }) => {
      const res = await apiRequest("PATCH", `/api/admin/researchers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Researcher Updated", description: "Research dossier updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/researchers"] });
      if (selectedResearcherId) queryClient.invalidateQueries({ queryKey: ["/api/admin/researchers", selectedResearcherId] });
      setEditResearcher(null);
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/researchers/${id}`, { status, reason });
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast({
        title: vars.status === "suspended" ? "Researcher Suspended" : "Researcher Active",
        description: `Research appointment marked as ${vars.status}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/researchers"] });
      if (selectedResearcherId) queryClient.invalidateQueries({ queryKey: ["/api/admin/researchers", selectedResearcherId] });
      setSuspendTarget(null);
      setSuspendReason("");
    },
    onError: (err: Error) => {
      toast({ title: "Status update failed", description: err.message, variant: "destructive" });
    },
  });

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["ID", "Name", "Institutional Email", "Researcher ID", "Role Level", "Research Domain", "Department", "Status", "Access Expiry"];
    const rows = filteredResearchers.map((r) => [
      `"${r.id}"`,
      `"${r.name || ""}"`,
      `"${r.email || ""}"`,
      `"${r.researcherId || ""}"`,
      `"${r.roleLevel}"`,
      `"${r.researchDomain || ""}"`,
      `"${r.department || ""}"`,
      `"${r.status}"`,
      `"${r.accessExpiresAt ? new Date(r.accessExpiresAt).toISOString() : ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agriconnect-researchers-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV Exported", description: `Exported ${filteredResearchers.length} researcher records.` });
  };

  // Bulk selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedRowIds(new Set(paginatedResearchers.map((r) => r.id)));
    else setSelectedRowIds(new Set());
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedRowIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRowIds(next);
  };

  const getRoleBadge = (role: string) => {
    if (role === "PI") return <Badge className="bg-purple-700 text-white font-bold">Principal Investigator</Badge>;
    if (role === "Postdoc") return <Badge className="bg-blue-600 text-white font-bold">Postdoc Fellow</Badge>;
    if (role === "Fellow") return <Badge className="bg-amber-600 text-white font-bold">Research Fellow</Badge>;
    return <Badge className="bg-emerald-600 text-white font-bold">PhD Candidate</Badge>;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <span>User Management</span>
            <span>/</span>
            <span>Researchers</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Researchers Management Centre
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage academic researchers, agricultural scientists, principal investigators, and lab research fellowships.
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
            <span>Export page</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setOnboardOpen(true)}
            className="h-9 gap-1.5 bg-[#078c52] font-semibold text-white shadow-sm hover:bg-[#067343]"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Onboard researcher</span>
          </Button>
        </div>
      </div>

      {/* Top 6 KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Total Researchers"
          value={stats.total.toLocaleString()}
          subtitle="Enrolled scientists"
          icon={Microscope}
          iconBg="bg-emerald-50"
          iconColor="text-[#078c52]"
        />
        <StatCard
          title="Active Appointments"
          value={stats.active.toLocaleString()}
          subtitle="Valid research credentials"
          icon={UserCheck}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="Doctoral (PhD)"
          value={stats.phd.toLocaleString()}
          subtitle="PhD candidates"
          icon={GraduationCap}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
        />
        <StatCard
          title="Postdoc Fellows"
          value={stats.postdoc.toLocaleString()}
          subtitle="Postdoctoral scholars"
          icon={FlaskConical}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Principal Investigators"
          value={stats.pi.toLocaleString()}
          subtitle="Lab heads & PIs"
          icon={Award}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Suspended / Archived"
          value={stats.suspended.toLocaleString()}
          subtitle="Restricted appointments"
          icon={ShieldAlert}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
        />
      </div>

      {/* Search & Filter Bar */}
      <Card className="border border-emerald-950/10 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search researcher name, email, ID, research domain or department..."
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
                <SelectTrigger className="h-10 w-[140px] text-xs font-medium">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={roleFilter}
                onValueChange={(val) => {
                  setRoleFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[160px] text-xs font-medium">
                  <SelectValue placeholder="Fellow Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="PhD">PhD Candidate</SelectItem>
                  <SelectItem value="Postdoc">Postdoc Fellow</SelectItem>
                  <SelectItem value="PI">Principal Investigator</SelectItem>
                  <SelectItem value="Fellow">Research Fellow</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={deptFilter}
                onValueChange={(val) => {
                  setDeptFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[180px] text-xs font-medium truncate">
                  <SelectValue placeholder="Department / Lab" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(search || statusFilter !== "all" || roleFilter !== "all" || deptFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setRoleFilter("all");
                    setDeptFilter("all");
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

      {/* Main Table Card */}
      <Card className="overflow-hidden border border-emerald-950/10 bg-white shadow-sm">
        {/* Bulk Action Bar */}
        {selectedRowIds.size > 0 && (
          <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/80 px-4 py-2.5 text-xs">
            <span className="font-semibold text-[#053f36]">
              {selectedRowIds.size} {selectedRowIds.size === 1 ? "researcher" : "researchers"} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedRowIds(new Set())}
              className="h-7 text-xs"
            >
              Clear Selection
            </Button>
          </div>
        )}

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={paginatedResearchers.length > 0 && selectedRowIds.size === paginatedResearchers.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#078c52] focus:ring-[#078c52]"
                  />
                </th>
                <th className="px-4 py-3">Researcher</th>
                <th className="px-4 py-3">Researcher ID</th>
                <th className="px-4 py-3 text-center">Fellow Level</th>
                <th className="px-4 py-3">Research Domain & Laboratory</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Appointment Expiry</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="h-4 w-full rounded bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : paginatedResearchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Microscope className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-semibold">No researcher records found</p>
                    <p className="text-xs">Try adjusting your search query or enroll a new researcher.</p>
                  </td>
                </tr>
              ) : (
                paginatedResearchers.map((researcher) => {
                  const isSelected = selectedRowIds.has(researcher.id);
                  const isSuspended = researcher.status === "suspended" || researcher.status === "withdrawn";

                  return (
                    <tr
                      key={researcher.id}
                      className={`group transition-colors hover:bg-emerald-50/40 ${
                        isSelected ? "bg-emerald-50/60" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(researcher.id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-[#078c52] focus:ring-[#078c52]"
                        />
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded-full border border-slate-200">
                            {researcher.avatar && <AvatarImage src={researcher.avatar} alt={researcher.name} />}
                            <AvatarFallback className="bg-purple-100 text-[11px] font-bold text-purple-800">
                              {researcher.name ? researcher.name.slice(0, 2).toUpperCase() : "RS"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <button
                              onClick={() => setSelectedResearcherId(researcher.id)}
                              className="font-bold text-slate-900 hover:text-[#078c52] hover:underline"
                            >
                              {researcher.name}
                            </button>
                            <p className="text-[11px] text-slate-500">{researcher.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-[11px] font-semibold text-slate-800">
                        {researcher.researcherId || "—"}
                      </td>

                      <td className="px-4 py-3.5 text-center">{getRoleBadge(researcher.roleLevel)}</td>

                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="font-semibold text-slate-900 truncate" title={researcher.researchDomain}>
                          {researcher.researchDomain}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate" title={researcher.department || ""}>
                          {researcher.department || "Agricultural Sciences & Molecular Biology"}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isSuspended
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isSuspended ? "bg-rose-500" : "bg-emerald-500"
                            }`}
                          />
                          {researcher.status}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        {researcher.accessExpiresAt ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>{new Date(researcher.accessExpiresAt).toLocaleDateString("en-GB")}</span>
                          </div>
                        ) : (
                          "Permanent"
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedResearcherId(researcher.id)}
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            title="Inspect researcher dossier"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditResearcher(researcher)}
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            title="Edit details"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSuspendTarget(researcher)}
                            className={`h-7 w-7 ${
                              isSuspended
                                ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                : "text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            }`}
                            title={isSuspended ? "Reactivate researcher" : "Suspend researcher"}
                          >
                            {isSuspended ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 text-xs font-medium">
                              <DropdownMenuLabel>Research Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setMessageTarget(researcher)}>
                                <MessageSquare className="mr-2 h-3.5 w-3.5 text-blue-600" />
                                <span>Send Notice</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditResearcher(researcher)}>
                                <BookOpen className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                                <span>Update Domain</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setSuspendTarget(researcher)}
                                className={isSuspended ? "text-emerald-600" : "text-rose-600"}
                              >
                                {isSuspended ? (
                                  <>
                                    <Unlock className="mr-2 h-3.5 w-3.5" />
                                    <span>Reactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="mr-2 h-3.5 w-3.5" />
                                    <span>Suspend</span>
                                  </>
                                )}
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

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-900">{filteredResearchers.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">{Math.min(page * pageSize, filteredResearchers.length)}</span> of{" "}
            <span className="font-semibold text-slate-900">{filteredResearchers.length}</span> researchers
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

      {/* Right-Side Researcher Detail Drawer */}
      <Sheet open={Boolean(selectedResearcherId)} onOpenChange={(open) => !open && setSelectedResearcherId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto bg-slate-50">
          {isLoadingDetail ? (
            <div className="flex h-full items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : researcherDetail ? (
            <div className="flex flex-col min-h-full">
              {/* Drawer Header */}
              <div className="bg-[#053f36] p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-white/20">
                      {researcherDetail.avatar && <AvatarImage src={researcherDetail.avatar} alt={researcherDetail.name} />}
                      <AvatarFallback className="bg-lime-400 font-bold text-[#053f36]">
                        {researcherDetail.name ? researcherDetail.name.slice(0, 2).toUpperCase() : "RS"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-lg font-black">{researcherDetail.name}</h2>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-[10px] text-white/60">ID: {researcherDetail.researcherId}</span>
                        <Badge
                          variant="outline"
                          className={
                            researcherDetail.status === "active"
                              ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-200"
                              : "border-rose-400/30 bg-rose-500/20 text-rose-200"
                          }
                        >
                          {researcherDetail.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedResearcherId(null)}
                    className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 4 Stat Boxes */}
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Level</p>
                    <p className="text-base font-black text-lime-300">{researcherDetail.roleLevel}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Researcher ID</p>
                    <p className="text-xs font-mono font-bold text-white truncate">{researcherDetail.researcherId}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Status</p>
                    <p className="text-xs font-bold capitalize text-white truncate">{researcherDetail.status}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Appointment Expiry</p>
                    <p className="text-[11px] font-medium text-white/80">
                      {researcherDetail.accessExpiresAt
                        ? new Date(researcherDetail.accessExpiresAt).toLocaleDateString("en-GB")
                        : "Permanent"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Drawer Tabs */}
              <Tabs defaultValue="focus" className="flex-1 p-6">
                <TabsList className="grid w-full grid-cols-2 bg-slate-200">
                  <TabsTrigger value="focus" className="text-xs font-bold">
                    Research Focus
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs font-bold">
                    Activity & Audit
                  </TabsTrigger>
                </TabsList>

                {/* Focus Tab */}
                <TabsContent value="focus" className="mt-4 space-y-4">
                  <Card className="border-slate-200">
                    <CardContent className="p-4 space-y-3 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Institutional Email</span>
                        <span className="font-semibold text-slate-900">{researcherDetail.email}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Research Focus / Domain</span>
                        <span className="font-semibold text-slate-900 max-w-[220px] text-right">{researcherDetail.researchDomain}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Department / Institute</span>
                        <span className="font-semibold text-slate-900 max-w-[220px] text-right">{researcherDetail.department}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Fellowship Level</span>
                        <span className="font-bold text-slate-900">{researcherDetail.roleLevel}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Appointment Status</span>
                        <span className="font-bold capitalize text-slate-900">{researcherDetail.status}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-9 text-xs"
                      onClick={() => {
                        const target = researchers.find((r) => r.id === researcherDetail.id);
                        if (target) setEditResearcher(target);
                      }}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Record
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-9 text-xs"
                      onClick={() => {
                        const target = researchers.find((r) => r.id === researcherDetail.id);
                        if (target) setMessageTarget(target);
                      }}
                    >
                      <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Message
                    </Button>
                  </div>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="mt-4 space-y-2">
                  {researcherDetail.activity?.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Clock className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                      <p className="font-semibold">No recorded activity</p>
                    </div>
                  ) : (
                    researcherDetail.activity.map((item, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{item.action}</span>
                          <span className="text-[10px] text-slate-400">{timeAgo(item.occurredAt)}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-600">
                          Target: {item.targetType} · Outcome: {item.outcome}
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

      {/* Onboard Researcher Modal */}
      <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Onboard Academic Researcher</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Register a scientific investigator or research fellow in the AgriConnect research network.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Institutional Email (.ac.uk / .edu / .nl) *</Label>
              <Input
                type="email"
                placeholder="researcher@rothamsted.ac.uk"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Researcher ID / Fellowship Code *</Label>
              <Input
                placeholder="e.g. RES-ROTH-2024"
                value={newResearcherId}
                onChange={(e) => setNewResearcherId(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Fellowship / Appointment Level *</Label>
              <Select value={newRoleLevel} onValueChange={(val: "PhD" | "Postdoc" | "PI" | "Fellow") => setNewRoleLevel(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PhD">Doctoral Candidate (PhD)</SelectItem>
                  <SelectItem value="Postdoc">Postdoctoral Fellow</SelectItem>
                  <SelectItem value="PI">Principal Investigator (PI)</SelectItem>
                  <SelectItem value="Fellow">Research Fellow</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Research Focus / Domain *</Label>
              <Input
                placeholder="e.g. Precision Soil Carbon & Satellite Diagnostics"
                value={newResearchDomain}
                onChange={(e) => setNewResearchDomain(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Department / Research Institute</Label>
              <Input
                placeholder="e.g. Rothamsted Research / Reading Agritech"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOnboardOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newEmail.trim() || !newResearcherId.trim() || !newResearchDomain.trim() || onboardMutation.isPending}
              onClick={() =>
                onboardMutation.mutate({
                  email: newEmail,
                  researcherId: newResearcherId,
                  researchDomain: newResearchDomain,
                  roleLevel: newRoleLevel,
                  department: newDepartment || undefined,
                })
              }
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              {onboardMutation.isPending ? "Registering..." : "Register Researcher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Researcher Modal */}
      <Dialog open={Boolean(editResearcher)} onOpenChange={(open) => !open && setEditResearcher(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Edit Researcher Record</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update research domain and appointment for {editResearcher?.email}.
            </DialogDescription>
          </DialogHeader>

          {editResearcher && (
            <div className="space-y-3.5 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Research Focus / Domain</Label>
                <Input
                  value={editResearcher.researchDomain}
                  onChange={(e) => setEditResearcher({ ...editResearcher, researchDomain: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Department / Institute</Label>
                <Input
                  value={editResearcher.department || ""}
                  onChange={(e) => setEditResearcher({ ...editResearcher, department: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Fellowship Level</Label>
                <Select
                  value={editResearcher.roleLevel}
                  onValueChange={(val: "PhD" | "Postdoc" | "PI" | "Fellow") => setEditResearcher({ ...editResearcher, roleLevel: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PhD">Doctoral Candidate (PhD)</SelectItem>
                    <SelectItem value="Postdoc">Postdoctoral Fellow</SelectItem>
                    <SelectItem value="PI">Principal Investigator (PI)</SelectItem>
                    <SelectItem value="Fellow">Research Fellow</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Appointment Status</Label>
                <Select
                  value={editResearcher.status}
                  onValueChange={(val) => setEditResearcher({ ...editResearcher, status: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditResearcher(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={editMutation.isPending || !editResearcher}
              onClick={() => {
                if (editResearcher) {
                  editMutation.mutate({
                    id: editResearcher.id,
                    data: {
                      researchDomain: editResearcher.researchDomain,
                      department: editResearcher.department,
                      roleLevel: editResearcher.roleLevel,
                      status: editResearcher.status,
                    },
                  });
                }
              }}
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend / Reactivate Confirmation Dialog */}
      <Dialog open={Boolean(suspendTarget)} onOpenChange={(open) => !open && setSuspendTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              {suspendTarget?.status === "suspended" ? "Reactivate Researcher Appointment" : "Suspend Researcher Appointment"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {suspendTarget?.status === "suspended"
                ? `Restore laboratory research access and platform entitlements for ${suspendTarget?.email}.`
                : `Temporarily restrict research privileges and data exports for ${suspendTarget?.email}.`}
            </DialogDescription>
          </DialogHeader>

          {suspendTarget?.status !== "suspended" && (
            <div className="space-y-2 py-2">
              <Label className="text-xs font-bold text-slate-700">Reason for Suspension (Audit Log)</Label>
              <Input
                placeholder="e.g. Grant conclusion, compliance review..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSuspendTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={toggleStatusMutation.isPending}
              onClick={() => {
                if (suspendTarget) {
                  const nextStatus = suspendTarget.status === "suspended" ? "active" : "suspended";
                  toggleStatusMutation.mutate({
                    id: suspendTarget.id,
                    status: nextStatus,
                    reason: suspendReason || undefined,
                  });
                }
              }}
              className={
                suspendTarget?.status === "suspended"
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-rose-600 text-white hover:bg-rose-700"
              }
            >
              {toggleStatusMutation.isPending
                ? "Updating..."
                : suspendTarget?.status === "suspended"
                ? "Reactivate Appointment"
                : "Confirm Suspension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Message Modal */}
      <Dialog open={Boolean(messageTarget)} onOpenChange={(open) => !open && setMessageTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Send Academic Notice</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Dispatch an official notice to {messageTarget?.email}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Subject</Label>
              <Input
                placeholder="e.g. Grant update, Research network advisory..."
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Message Body</Label>
              <textarea
                rows={4}
                placeholder="Write notice here..."
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-xs focus:border-[#078c52] focus:outline-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMessageTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!messageSubject.trim() || !messageBody.trim()}
              onClick={() => {
                toast({
                  title: "Notice Dispatched",
                  description: `Message sent to ${messageTarget?.email}.`,
                });
                setMessageTarget(null);
                setMessageSubject("");
                setMessageBody("");
              }}
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              Dispatch Notice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
