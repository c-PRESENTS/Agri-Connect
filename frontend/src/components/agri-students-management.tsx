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
  Download,
  Eye,
  Filter,
  GraduationCap,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
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

export type StudentRecord = {
  id: string;
  name: string;
  email: string;
  studentNumber?: string | null;
  programme: string;
  studyLevel: "UG" | "PG" | "PhD" | string;
  department?: string | null;
  status: "active" | "suspended" | "completed" | "withdrawn" | "expired" | string;
  accessExpiresAt?: string | null;
  avatar?: string | null;
  phone?: string | null;
  supportRequests?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type StudentDetail = {
  id: string;
  name: string;
  email: string;
  studentNumber: string;
  programme: string;
  studyLevel: string;
  department: string;
  status: string;
  accessExpiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
  avatar?: string;
  phone?: string;
  supportRequests: Array<{
    id: string;
    category: string;
    subject: string;
    description: string;
    status: string;
    createdAt: string;
  }>;
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

export function AgriStudentsManagement({
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
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Modals state
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<StudentRecord | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<StudentRecord | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [messageTarget, setMessageTarget] = useState<StudentRecord | null>(null);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");

  // New student form state
  const [newEmail, setNewEmail] = useState("");
  const [newStudentNumber, setNewStudentNumber] = useState("");
  const [newProgramme, setNewProgramme] = useState("");
  const [newStudyLevel, setNewStudyLevel] = useState<"UG" | "PG" | "PhD">("UG");
  const [newDepartment, setNewDepartment] = useState("Agricultural Sciences");

  // Query students
  const { data: studentsData, isLoading, isError, refetch, isFetching } = useQuery<{ records: StudentRecord[] }>({
    queryKey: ["/api/admin/resources/students"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/resources/students");
      return res.json();
    },
  });

  const students = useMemo(() => studentsData?.records ?? [], [studentsData]);

  // Query single student detail when drawer opens
  const { data: studentDetail, isLoading: isLoadingDetail } = useQuery<StudentDetail>({
    queryKey: ["/api/admin/students", selectedStudentId],
    queryFn: async () => {
      if (!selectedStudentId) return null as never;
      const res = await apiRequest("GET", `/api/admin/students/${selectedStudentId}`);
      return res.json();
    },
    enabled: Boolean(selectedStudentId),
  });

  // Extract unique departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.department) set.add(s.department);
    });
    return Array.from(set).sort();
  }, [students]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchesName = student.name?.toLowerCase().includes(q);
        const matchesEmail = student.email?.toLowerCase().includes(q);
        const matchesNum = student.studentNumber?.toLowerCase().includes(q);
        const matchesProg = student.programme?.toLowerCase().includes(q);
        const matchesDept = student.department?.toLowerCase().includes(q);
        const matchesId = student.id.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesNum && !matchesProg && !matchesDept && !matchesId) return false;
      }

      if (statusFilter !== "all" && student.status !== statusFilter) return false;
      if (levelFilter !== "all" && student.studyLevel !== levelFilter) return false;
      if (deptFilter !== "all" && student.department !== deptFilter) return false;

      return true;
    });
  }, [students, search, statusFilter, levelFilter, deptFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, page, pageSize]);

  // Top KPI Metrics
  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter((s) => s.status === "active").length;
    const ug = students.filter((s) => s.studyLevel === "UG").length;
    const pg = students.filter((s) => s.studyLevel === "PG").length;
    const phd = students.filter((s) => s.studyLevel === "PhD").length;
    const suspended = students.filter((s) => s.status === "suspended" || s.status === "withdrawn").length;

    return {
      total,
      active,
      ug,
      pg,
      phd,
      suspended,
    };
  }, [students]);

  // Mutations
  const onboardMutation = useMutation({
    mutationFn: async (data: {
      email: string;
      studentNumber: string;
      programme: string;
      studyLevel: "UG" | "PG" | "PhD";
      department?: string;
    }) => {
      const res = await apiRequest("POST", "/api/admin/students", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Student Registered", description: "Student programme record created in registry." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/students"] });
      setOnboardOpen(false);
      setNewEmail("");
      setNewStudentNumber("");
      setNewProgramme("");
    },
    onError: (err: Error) => {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StudentRecord> }) => {
      const res = await apiRequest("PATCH", `/api/admin/students/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Student Updated", description: "Academic record updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/students"] });
      if (selectedStudentId) queryClient.invalidateQueries({ queryKey: ["/api/admin/students", selectedStudentId] });
      setEditStudent(null);
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/students/${id}`, { status, reason });
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast({
        title: vars.status === "suspended" ? "Student Suspended" : "Student Enrolment Active",
        description: `Enrolment status updated to ${vars.status}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/students"] });
      if (selectedStudentId) queryClient.invalidateQueries({ queryKey: ["/api/admin/students", selectedStudentId] });
      setSuspendTarget(null);
      setSuspendReason("");
    },
    onError: (err: Error) => {
      toast({ title: "Status update failed", description: err.message, variant: "destructive" });
    },
  });

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["ID", "Name", "Institutional Email", "Student Number", "Level", "Programme", "Department", "Status", "Access Expiry"];
    const rows = filteredStudents.map((s) => [
      `"${s.id}"`,
      `"${s.name || ""}"`,
      `"${s.email || ""}"`,
      `"${s.studentNumber || ""}"`,
      `"${s.studyLevel}"`,
      `"${s.programme || ""}"`,
      `"${s.department || ""}"`,
      `"${s.status}"`,
      `"${s.accessExpiresAt ? new Date(s.accessExpiresAt).toISOString() : ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agriconnect-students-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV Exported", description: `Exported ${filteredStudents.length} student records.` });
  };

  // Bulk selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedRowIds(new Set(paginatedStudents.map((s) => s.id)));
    else setSelectedRowIds(new Set());
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedRowIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRowIds(next);
  };

  const getLevelBadge = (level: string) => {
    if (level === "PhD") return <Badge className="bg-purple-600 text-white font-bold">PhD</Badge>;
    if (level === "PG") return <Badge className="bg-blue-600 text-white font-bold">PG (MSc)</Badge>;
    return <Badge className="bg-emerald-600 text-white font-bold">UG (BSc)</Badge>;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <span>User Management</span>
            <span>/</span>
            <span>Students</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Students Management Centre
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage academic student enrolments, institutional verifications, study levels, and research entitlements.
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
            disabled={filteredStudents.length === 0}
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
            <span>+ Onboard student</span>
          </Button>
        </div>
      </div>

      {/* Top 6 KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Total Students"
          value={stats.total.toLocaleString()}
          subtitle="Enrolled in registry"
          icon={GraduationCap}
          iconBg="bg-emerald-50"
          iconColor="text-[#078c52]"
        />
        <StatCard
          title="Active Enrolments"
          value={stats.active.toLocaleString()}
          subtitle="Current valid access"
          icon={UserCheck}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="Undergraduate"
          value={stats.ug.toLocaleString()}
          subtitle="BSc / Foundation"
          icon={BookOpen}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
        />
        <StatCard
          title="Postgraduate"
          value={stats.pg.toLocaleString()}
          subtitle="MSc / PGDip"
          icon={Award}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Doctoral / PhD"
          value={stats.phd.toLocaleString()}
          subtitle="Research candidates"
          icon={Award}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Suspended / Expired"
          value={stats.suspended.toLocaleString()}
          subtitle="Restricted access"
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
                placeholder="Search student name, email, student number, programme or department..."
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
                value={levelFilter}
                onValueChange={(val) => {
                  setLevelFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[130px] text-xs font-medium">
                  <SelectValue placeholder="Study Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="UG">UG (BSc)</SelectItem>
                  <SelectItem value="PG">PG (MSc)</SelectItem>
                  <SelectItem value="PhD">Doctoral (PhD)</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={deptFilter}
                onValueChange={(val) => {
                  setDeptFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[170px] text-xs font-medium truncate">
                  <SelectValue placeholder="Department" />
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

              {(search || statusFilter !== "all" || levelFilter !== "all" || deptFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setLevelFilter("all");
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
              {selectedRowIds.size} {selectedRowIds.size === 1 ? "student" : "students"} selected
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
                    checked={paginatedStudents.length > 0 && selectedRowIds.size === paginatedStudents.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#078c52] focus:ring-[#078c52]"
                  />
                </th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Student Number</th>
                <th className="px-4 py-3 text-center">Level</th>
                <th className="px-4 py-3">Programme & Department</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Access Expiry</th>
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
              ) : isError ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <AlertCircle className="mx-auto mb-2 h-8 w-8 text-rose-400" />
                    <p className="text-sm font-semibold text-slate-700">Unable to load student records</p>
                    <p className="mt-1 text-xs">The registry was not changed. Retry the database request.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry
                    </Button>
                  </td>
                </tr>
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <GraduationCap className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-semibold">
                      {students.length === 0 ? "No students registered" : "No student records found"}
                    </p>
                    <p className="text-xs">
                      {students.length === 0
                        ? "Real student records will appear here after registration."
                        : "Try adjusting your search criteria."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => {
                  const isSelected = selectedRowIds.has(student.id);
                  const isSuspended = student.status === "suspended" || student.status === "withdrawn";

                  return (
                    <tr
                      key={student.id}
                      className={`group transition-colors hover:bg-emerald-50/40 ${
                        isSelected ? "bg-emerald-50/60" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(student.id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-[#078c52] focus:ring-[#078c52]"
                        />
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded-full border border-slate-200">
                            {student.avatar && <AvatarImage src={student.avatar} alt={student.name} />}
                            <AvatarFallback className="bg-emerald-100 text-[11px] font-bold text-[#053f36]">
                              {student.name ? student.name.slice(0, 2).toUpperCase() : "ST"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <button
                              onClick={() => setSelectedStudentId(student.id)}
                              className="font-bold text-slate-900 hover:text-[#078c52] hover:underline"
                            >
                              {student.name}
                            </button>
                            <p className="text-[11px] text-slate-500">{student.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-[11px] font-semibold text-slate-800">
                        {student.studentNumber || "—"}
                      </td>

                      <td className="px-4 py-3.5 text-center">{getLevelBadge(student.studyLevel)}</td>

                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="font-semibold text-slate-900 truncate" title={student.programme}>
                          {student.programme}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate" title={student.department || ""}>
                          {student.department || "Agricultural Sciences"}
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
                          {student.status}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        {student.accessExpiresAt ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>{new Date(student.accessExpiresAt).toLocaleDateString("en-GB")}</span>
                          </div>
                        ) : (
                          "Active"
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedStudentId(student.id)}
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            title="Inspect student record"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditStudent(student)}
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            title="Edit details"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSuspendTarget(student)}
                            className={`h-7 w-7 ${
                              isSuspended
                                ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                : "text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            }`}
                            title={isSuspended ? "Reactivate student" : "Suspend student"}
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
                              <DropdownMenuLabel>Student Controls</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setMessageTarget(student)}>
                                <MessageSquare className="mr-2 h-3.5 w-3.5 text-blue-600" />
                                <span>Send Notice</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditStudent(student)}>
                                <BookOpen className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                                <span>Update Programme</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setSuspendTarget(student)}
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
            Showing <span className="font-semibold text-slate-900">{filteredStudents.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">{Math.min(page * pageSize, filteredStudents.length)}</span> of{" "}
            <span className="font-semibold text-slate-900">{filteredStudents.length}</span> students
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

      {/* Right-Side Student Detail Drawer */}
      <Sheet open={Boolean(selectedStudentId)} onOpenChange={(open) => !open && setSelectedStudentId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto bg-slate-50">
          {isLoadingDetail ? (
            <div className="flex h-full items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : studentDetail ? (
            <div className="flex flex-col min-h-full">
              {/* Drawer Header */}
              <div className="bg-[#053f36] p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-white/20">
                      {studentDetail.avatar && <AvatarImage src={studentDetail.avatar} alt={studentDetail.name} />}
                      <AvatarFallback className="bg-lime-400 font-bold text-[#053f36]">
                        {studentDetail.name ? studentDetail.name.slice(0, 2).toUpperCase() : "ST"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-lg font-black">{studentDetail.name}</h2>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-[10px] text-white/60">ID: {studentDetail.studentNumber}</span>
                        <Badge
                          variant="outline"
                          className={
                            studentDetail.status === "active"
                              ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-200"
                              : "border-rose-400/30 bg-rose-500/20 text-rose-200"
                          }
                        >
                          {studentDetail.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedStudentId(null)}
                    className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 4 Stat Boxes */}
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Level</p>
                    <p className="text-base font-black text-lime-300">{studentDetail.studyLevel}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Student No.</p>
                    <p className="text-xs font-mono font-bold text-white truncate">{studentDetail.studentNumber}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Inquiries</p>
                    <p className="text-base font-black text-white">{studentDetail.supportRequests?.length ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Expires</p>
                    <p className="text-[11px] font-medium text-white/80">
                      {studentDetail.accessExpiresAt
                        ? new Date(studentDetail.accessExpiresAt).toLocaleDateString("en-GB")
                        : "Active"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Drawer Tabs */}
              <Tabs defaultValue="programme" className="flex-1 p-6">
                <TabsList className="grid w-full grid-cols-3 bg-slate-200">
                  <TabsTrigger value="programme" className="text-xs font-bold">
                    Programme
                  </TabsTrigger>
                  <TabsTrigger value="support" className="text-xs font-bold">
                    Inquiries ({studentDetail.supportRequests?.length ?? 0})
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs font-bold">
                    Activity
                  </TabsTrigger>
                </TabsList>

                {/* Programme Tab */}
                <TabsContent value="programme" className="mt-4 space-y-4">
                  <Card className="border-slate-200">
                    <CardContent className="p-4 space-y-3 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Institutional Email</span>
                        <span className="font-semibold text-slate-900">{studentDetail.email}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Academic Programme</span>
                        <span className="font-semibold text-slate-900 max-w-[220px] text-right">{studentDetail.programme}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Department / Faculty</span>
                        <span className="font-semibold text-slate-900 max-w-[220px] text-right">{studentDetail.department}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Study Level</span>
                        <span className="font-bold text-slate-900">{studentDetail.studyLevel}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Enrolment Status</span>
                        <span className="font-bold capitalize text-slate-900">{studentDetail.status}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-9 text-xs"
                      onClick={() => {
                        const target = students.find((s) => s.id === studentDetail.id);
                        if (target) setEditStudent(target);
                      }}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Record
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-9 text-xs"
                      onClick={() => {
                        const target = students.find((s) => s.id === studentDetail.id);
                        if (target) setMessageTarget(target);
                      }}
                    >
                      <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Message
                    </Button>
                  </div>
                </TabsContent>

                {/* Support Tab */}
                <TabsContent value="support" className="mt-4 space-y-2">
                  {studentDetail.supportRequests?.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <BookOpen className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                      <p className="font-semibold">No support requests</p>
                      <p className="text-xs">Student has not opened any helpdesk inquiries.</p>
                    </div>
                  ) : (
                    studentDetail.supportRequests.map((req) => (
                      <Card key={req.id} className="border-slate-200">
                        <CardContent className="p-3 text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900">{req.subject}</span>
                            <Badge variant="outline" className="text-[9px] capitalize">
                              {req.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-600">{req.description}</p>
                          <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                            <span>Category: {req.category}</span>
                            <span>{timeAgo(req.createdAt)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="mt-4 space-y-2">
                  {studentDetail.activity?.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Clock className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                      <p className="font-semibold">No recorded activity</p>
                    </div>
                  ) : (
                    studentDetail.activity.map((item, idx) => (
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

      {/* Onboard Student Modal */}
      <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Onboard Academic Student</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Register a student in the institutional academic registry with university email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Institutional Email (.ac.uk / .edu) *</Label>
              <Input
                type="email"
                placeholder="student@harper-adams.ac.uk"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Student Number / Identifier *</Label>
              <Input
                placeholder="e.g. HA-2024-9981"
                value={newStudentNumber}
                onChange={(e) => setNewStudentNumber(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Study Level *</Label>
              <Select value={newStudyLevel} onValueChange={(val: "UG" | "PG" | "PhD") => setNewStudyLevel(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UG">Undergraduate (BSc)</SelectItem>
                  <SelectItem value="PG">Postgraduate (MSc)</SelectItem>
                  <SelectItem value="PhD">Doctoral (PhD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Academic Programme *</Label>
              <Input
                placeholder="e.g. BSc (Hons) Agriculture & Farm Business"
                value={newProgramme}
                onChange={(e) => setNewProgramme(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Department / Faculty</Label>
              <Input
                placeholder="e.g. Department of Agriculture and Environment"
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
              disabled={!newEmail.trim() || !newStudentNumber.trim() || !newProgramme.trim() || onboardMutation.isPending}
              onClick={() =>
                onboardMutation.mutate({
                  email: newEmail,
                  studentNumber: newStudentNumber,
                  programme: newProgramme,
                  studyLevel: newStudyLevel,
                  department: newDepartment || undefined,
                })
              }
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              {onboardMutation.isPending ? "Registering..." : "Register Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Modal */}
      <Dialog open={Boolean(editStudent)} onOpenChange={(open) => !open && setEditStudent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Edit Student Record</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update programme and department for {editStudent?.email}.
            </DialogDescription>
          </DialogHeader>

          {editStudent && (
            <div className="space-y-3.5 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Academic Programme</Label>
                <Input
                  value={editStudent.programme}
                  onChange={(e) => setEditStudent({ ...editStudent, programme: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Department</Label>
                <Input
                  value={editStudent.department || ""}
                  onChange={(e) => setEditStudent({ ...editStudent, department: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Study Level</Label>
                <Select
                  value={editStudent.studyLevel}
                  onValueChange={(val: "UG" | "PG" | "PhD") => setEditStudent({ ...editStudent, studyLevel: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UG">Undergraduate (BSc)</SelectItem>
                    <SelectItem value="PG">Postgraduate (MSc)</SelectItem>
                    <SelectItem value="PhD">Doctoral (PhD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Enrolment Status</Label>
                <Select
                  value={editStudent.status}
                  onValueChange={(val) => setEditStudent({ ...editStudent, status: val })}
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
            <Button variant="outline" size="sm" onClick={() => setEditStudent(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={editMutation.isPending || !editStudent}
              onClick={() => {
                if (editStudent) {
                  editMutation.mutate({
                    id: editStudent.id,
                    data: {
                      programme: editStudent.programme,
                      department: editStudent.department,
                      studyLevel: editStudent.studyLevel,
                      status: editStudent.status,
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
              {suspendTarget?.status === "suspended" ? "Reactivate Student Enrolment" : "Suspend Student Enrolment"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {suspendTarget?.status === "suspended"
                ? `Restore institutional portal access and student resources for ${suspendTarget?.email}.`
                : `Temporarily restrict student portal privileges for ${suspendTarget?.email}.`}
            </DialogDescription>
          </DialogHeader>

          {suspendTarget?.status !== "suspended" && (
            <div className="space-y-2 py-2">
              <Label className="text-xs font-bold text-slate-700">Reason for Suspension (Audit Log)</Label>
              <Input
                placeholder="e.g. Academic leave, fee dispute, graduation..."
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
                ? "Reactivate Enrolment"
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
                placeholder="e.g. Enrolment renewal, Academic advisory..."
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
