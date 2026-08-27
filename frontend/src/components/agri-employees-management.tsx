import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
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
  Filter,
  KeyRound,
  Lock,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Unlock,
  UserCheck,
  UserCog,
  UserPlus,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export type AdminEmployee = {
  membershipId: string;
  userId: string;
  displayName: string;
  email: string;
  status: "active" | "invited" | "deactivated" | string;
  role: {
    id: string;
    code: string;
    name: string;
    isSuperAdmin: boolean;
  };
  mfaEnabled: boolean;
  invitedAt?: string | null;
  acceptedAt?: string | null;
  lastLoginAt?: string | null;
  activeSessionCount: number;
};

export type AdminRole = {
  id: string;
  code: string;
  name: string;
  description?: string;
  isSuperAdmin?: boolean;
};

export type AdminPermission = {
  code: string;
  name: string;
  description: string;
};

export type AdminInvitation = {
  id: string;
  email: string;
  roleId: string;
  roleName: string;
  expiresAt: string;
  createdAt: string;
};

export type EmployeeDetail = {
  membershipId: string;
  userId: string;
  displayName: string;
  email: string;
  status: string;
  role: { id: string; code: string; name: string; isSuperAdmin: boolean };
  mfaEnabled: boolean;
  activeSessionCount: number;
  lastLoginAt?: string | null;
  overrides: Array<{ permissionCode: string; effect: "allow" | "deny"; reason?: string }>;
  effectivePermissions: string[];
  activity: Array<{ id: string; action: string; outcome: string; occurredAt: string; changes?: unknown }>;
};

function timeAgo(dateString?: string | null): string {
  if (!dateString) return "Never recorded";
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

export function AgriEmployeesManagement({
  permissions = [],
}: {
  permissions?: string[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [activeTab, setActiveTab] = useState<"directory" | "matrix" | "invitations">("directory");
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);

  // Modals
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  const [changeRoleTarget, setChangeRoleTarget] = useState<AdminEmployee | null>(null);
  const [newRoleId, setNewRoleId] = useState("");

  const [statusChangeTarget, setStatusChangeTarget] = useState<AdminEmployee | null>(null);
  const [statusReason, setStatusReason] = useState("");

  const [revokeSessionsTarget, setRevokeSessionsTarget] = useState<AdminEmployee | null>(null);

  // Query employees & invitations
  const { data: employeesData, isLoading, refetch, isFetching } = useQuery<{
    employees: AdminEmployee[];
    invitations: AdminInvitation[];
  }>({
    queryKey: ["/api/admin/employees", { page: 1, pageSize: 200, search: "", status: "all", roleId: "all" }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/employees?page=1&pageSize=200&status=all&roleId=all&sort=name&direction=asc");
      return res.json();
    },
  });

  const employees = useMemo(() => employeesData?.employees ?? [], [employeesData]);
  const invitations = useMemo(() => employeesData?.invitations ?? [], [employeesData]);

  // Query roles
  const { data: rolesData } = useQuery<{ roles: AdminRole[] }>({
    queryKey: ["/api/admin/roles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/roles");
      return res.json();
    },
  });
  const roles = useMemo(() => rolesData?.roles ?? [], [rolesData]);

  // Query permissions
  const { data: permissionsData } = useQuery<{ permissions: AdminPermission[] } | AdminPermission[]>({
    queryKey: ["/api/admin/permissions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/permissions");
      return res.json();
    },
  });
  const allPermissions: AdminPermission[] = useMemo(() => {
    if (!permissionsData) return [];
    return Array.isArray(permissionsData) ? permissionsData : permissionsData.permissions ?? [];
  }, [permissionsData]);

  // Query selected employee detail for Drawer
  const { data: detailData, isLoading: isLoadingDetail } = useQuery<{ employee: EmployeeDetail }>({
    queryKey: ["/api/admin/employees", selectedMembershipId],
    queryFn: async () => {
      if (!selectedMembershipId) return null as never;
      const res = await apiRequest("GET", `/api/admin/employees/${selectedMembershipId}`);
      return res.json();
    },
    enabled: Boolean(selectedMembershipId),
  });
  const employeeDetail = detailData?.employee;

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchName = emp.displayName?.toLowerCase().includes(q);
        const matchEmail = emp.email?.toLowerCase().includes(q);
        const matchRole = emp.role?.name?.toLowerCase().includes(q);
        const matchId = emp.membershipId.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchRole && !matchId) return false;
      }
      if (roleFilter !== "all" && emp.role.id !== roleFilter) return false;
      if (statusFilter !== "all" && emp.status !== statusFilter) return false;
      return true;
    });
  }, [employees, search, roleFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page, pageSize]);

  // KPI Metrics
  const stats = useMemo(() => {
    const total = employees.length;
    const superAdmins = employees.filter((e) => e.role.isSuperAdmin).length;
    const operations = employees.filter((e) => e.role.code.includes("operations") || e.role.code.includes("manager")).length;
    const compliance = employees.filter((e) => e.role.code.includes("compliance") || e.role.code.includes("security")).length;
    const mfaProtected = employees.filter((e) => e.mfaEnabled).length;
    const pendingInvites = invitations.length;

    return {
      total,
      superAdmins,
      operations,
      compliance,
      mfaProtected,
      pendingInvites,
    };
  }, [employees, invitations]);

  // Mutations
  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; roleId: string; reason?: string }) => {
      const res = await apiRequest("POST", "/api/admin/employees/invitations", data);
      return res.json();
    },
    onSuccess: (invitation: { token?: string }) => {
      toast({ title: "Invitation Sent", description: "Employee invitation link created." });
      if (invitation?.token) setInviteToken(invitation.token);
      else setInviteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
    },
    onError: (err: Error) => {
      toast({ title: "Invite failed", description: err.message, variant: "destructive" });
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ membershipId, roleId }: { membershipId: string; roleId: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/employees/${membershipId}/role`, { roleId });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Role Changed", description: "Employee role and capabilities updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      if (selectedMembershipId) queryClient.invalidateQueries({ queryKey: ["/api/admin/employees", selectedMembershipId] });
      setChangeRoleTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: "Role change failed", description: err.message, variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ membershipId, action, reason }: { membershipId: string; action: "deactivate" | "reactivate"; reason?: string }) => {
      const res = await apiRequest("POST", `/api/admin/employees/${membershipId}/${action}`, { reason: reason || "Administrative update" });
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast({
        title: vars.action === "deactivate" ? "Employee Deactivated" : "Employee Reactivated",
        description: `Staff account status updated successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      if (selectedMembershipId) queryClient.invalidateQueries({ queryKey: ["/api/admin/employees", selectedMembershipId] });
      setStatusChangeTarget(null);
      setStatusReason("");
    },
    onError: (err: Error) => {
      toast({ title: "Status update failed", description: err.message, variant: "destructive" });
    },
  });

  const revokeSessionsMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const res = await apiRequest("POST", `/api/admin/employees/${membershipId}/sessions/revoke`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sessions Revoked", description: "All active sessions for this employee were invalidated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      if (selectedMembershipId) queryClient.invalidateQueries({ queryKey: ["/api/admin/employees", selectedMembershipId] });
      setRevokeSessionsTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: "Revocation failed", description: err.message, variant: "destructive" });
    },
  });

  const permissionOverrideMutation = useMutation({
    mutationFn: async ({ membershipId, permissionCode, effect }: { membershipId: string; permissionCode: string; effect: "allow" | "deny" | "inherit" }) => {
      const res = await apiRequest("PUT", `/api/admin/employees/${membershipId}/overrides`, {
        permissionCode,
        effect,
        reason: "Administrative matrix update",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Permission Updated", description: "Audited capability override applied." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      if (selectedMembershipId) queryClient.invalidateQueries({ queryKey: ["/api/admin/employees", selectedMembershipId] });
    },
    onError: (err: Error) => {
      toast({ title: "Override failed", description: err.message, variant: "destructive" });
    },
  });

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["Membership ID", "Display Name", "Email", "Role", "Super Admin", "MFA Enabled", "Status", "Last Login", "Active Sessions"];
    const rows = filteredEmployees.map((e) => [
      `"${e.membershipId}"`,
      `"${e.displayName || ""}"`,
      `"${e.email || ""}"`,
      `"${e.role?.name || ""}"`,
      `"${e.role?.isSuperAdmin ? "Yes" : "No"}"`,
      `"${e.mfaEnabled ? "Enabled" : "Disabled"}"`,
      `"${e.status}"`,
      `"${e.lastLoginAt || "Never"}"`,
      `"${e.activeSessionCount || 0}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agriconnect-employees-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV Exported", description: `Exported ${filteredEmployees.length} staff records.` });
  };

  const canInvite = permissions.includes("employees.invite") || permissions.includes("dashboard.view");
  const canManage = permissions.includes("employees.manage_permissions") || permissions.includes("dashboard.view");

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <span>Management</span>
            <span>/</span>
            <span>Staff & Access</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Employee & Access Management
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage AgriConnect operations staff, role assignments, fine-grained capability matrices, and secure audit controls.
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

          {canInvite && (
            <Button
              size="sm"
              onClick={() => {
                setInviteToken(null);
                setInviteEmail("");
                setInviteRoleId(roles[0]?.id || "");
                setInviteOpen(true);
              }}
              className="h-9 gap-1.5 bg-[#078c52] font-semibold text-white shadow-sm hover:bg-[#067343]"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Invite employee</span>
            </Button>
          )}
        </div>
      </div>

      {/* Top 6 KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Total Staff"
          value={stats.total.toLocaleString()}
          subtitle="Enrolled operators"
          icon={Users}
          iconBg="bg-emerald-50"
          iconColor="text-[#078c52]"
        />
        <StatCard
          title="Super Admins"
          value={stats.superAdmins.toLocaleString()}
          subtitle="Full platform control"
          icon={ShieldCheck}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Operations Lead"
          value={stats.operations.toLocaleString()}
          subtitle="Regional & freight ops"
          icon={SlidersHorizontal}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Compliance Officers"
          value={stats.compliance.toLocaleString()}
          subtitle="DEFRA & security auditors"
          icon={BadgeCheck}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
        />
        <StatCard
          title="MFA Enforced"
          value={stats.mfaProtected.toLocaleString()}
          subtitle="2FA active protection"
          icon={Lock}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="Pending Invites"
          value={stats.pendingInvites.toLocaleString()}
          subtitle="Awaiting onboarding"
          icon={Mail}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as never)} className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="directory" className="gap-1.5 text-xs font-bold">
              <Users className="h-3.5 w-3.5" />
              <span>Staff Directory ({filteredEmployees.length})</span>
            </TabsTrigger>
            <TabsTrigger value="matrix" className="gap-1.5 text-xs font-bold">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Capability Matrix</span>
            </TabsTrigger>
            <TabsTrigger value="invitations" className="gap-1.5 text-xs font-bold">
              <Mail className="h-3.5 w-3.5" />
              <span>Pending Invitations ({invitations.length})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Staff Directory */}
        <TabsContent value="directory" className="space-y-4 m-0">
          {/* Search & Filter Bar */}
          <Card className="border border-emerald-950/10 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative min-w-[240px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search employee name, email, role title, or membership ID..."
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

                <div className="flex flex-wrap items-center gap-2.5">
                  <Select
                    value={roleFilter}
                    onValueChange={(val) => {
                      setRoleFilter(val);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 w-[180px] text-xs font-medium truncate">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff Roles</SelectItem>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

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
                      <SelectItem value="invited">Invited</SelectItem>
                      <SelectItem value="deactivated">Deactivated</SelectItem>
                    </SelectContent>
                  </Select>

                  {(search || roleFilter !== "all" || statusFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setRoleFilter("all");
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

          {/* Directory Table */}
          <Card className="overflow-hidden border border-emerald-950/10 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Employee Name</th>
                    <th className="px-4 py-3">Role & Scope</th>
                    <th className="px-4 py-3 text-center">MFA Status</th>
                    <th className="px-4 py-3">Last Active</th>
                    <th className="px-4 py-3 text-center">Active Sessions</th>
                    <th className="px-4 py-3 text-center">Account Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="h-4 w-full rounded bg-slate-200" />
                        </td>
                      </tr>
                    ))
                  ) : paginatedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                        <p className="text-sm font-semibold">No employees match your search criteria</p>
                        <p className="text-xs">Invite a new colleague or adjust your filters.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedEmployees.map((emp) => {
                      const isDeactivated = emp.status === "deactivated";
                      const initials = emp.displayName
                        ?.split(/\s+/)
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join("")
                        .toUpperCase() || "OP";

                      return (
                        <tr
                          key={emp.membershipId}
                          className="group transition-colors hover:bg-emerald-50/40"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 rounded-full border border-emerald-900/10">
                                <AvatarFallback className="bg-emerald-100 text-xs font-black text-[#053f36]">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <button
                                  onClick={() => setSelectedMembershipId(emp.membershipId)}
                                  className="font-bold text-slate-900 hover:text-[#078c52] hover:underline"
                                >
                                  {emp.displayName}
                                </button>
                                <p className="text-[11px] text-slate-500">{emp.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={
                                  emp.role.isSuperAdmin
                                    ? "border-purple-300 bg-purple-50 text-purple-800 font-bold"
                                    : "border-slate-200 bg-slate-100 text-slate-800 font-medium"
                                }
                              >
                                {emp.role.name}
                              </Badge>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            {emp.mfaEnabled ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                <Lock className="h-3 w-3 text-emerald-600" />
                                Protected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                <Unlock className="h-3 w-3 text-slate-400" />
                                Optional
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-slate-600 font-mono text-[11px]">
                            {timeAgo(emp.lastLoginAt)}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className="font-mono text-xs font-bold text-slate-700">
                              {emp.activeSessionCount || 0} active
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isDeactivated
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isDeactivated ? "bg-rose-500" : "bg-emerald-500"
                                }`}
                              />
                              {emp.status}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedMembershipId(emp.membershipId)}
                                className="h-7 w-7 text-slate-500 hover:text-slate-900"
                                title="Inspect staff profile"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setChangeRoleTarget(emp);
                                  setNewRoleId(emp.role.id);
                                }}
                                className="h-7 w-7 text-slate-500 hover:text-slate-900"
                                title="Change role"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 text-xs font-medium">
                                  <DropdownMenuLabel>Staff Controls</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setSelectedMembershipId(emp.membershipId)}>
                                    <Eye className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                                    <span>View Permissions</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setChangeRoleTarget(emp);
                                      setNewRoleId(emp.role.id);
                                    }}
                                  >
                                    <UserCog className="mr-2 h-3.5 w-3.5 text-blue-600" />
                                    <span>Assign New Role</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setRevokeSessionsTarget(emp)}>
                                    <KeyRound className="mr-2 h-3.5 w-3.5 text-amber-600" />
                                    <span>Revoke Active Sessions</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setStatusChangeTarget(emp)}
                                    className={isDeactivated ? "text-emerald-600" : "text-rose-600"}
                                  >
                                    {isDeactivated ? (
                                      <>
                                        <Unlock className="mr-2 h-3.5 w-3.5" />
                                        <span>Reactivate Staff</span>
                                      </>
                                    ) : (
                                      <>
                                        <Lock className="mr-2 h-3.5 w-3.5" />
                                        <span>Deactivate Staff</span>
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

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-500">
              <div>
                Showing <span className="font-semibold text-slate-900">{filteredEmployees.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{" "}
                <span className="font-semibold text-slate-900">{Math.min(page * pageSize, filteredEmployees.length)}</span> of{" "}
                <span className="font-semibold text-slate-900">{filteredEmployees.length}</span> staff
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
        </TabsContent>

        {/* Tab 2: Permission Capability Matrix */}
        <TabsContent value="matrix" className="space-y-4 m-0">
          <Card className="border border-emerald-950/10 bg-white shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-black text-slate-900">Fine-Grained Capability Matrix</CardTitle>
              <p className="text-xs text-slate-500">
                Grant or restrict individual operational capabilities per employee. Overrides are audited in real time.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b">
                    <tr>
                      <th className="p-3.5 sticky left-0 bg-slate-50 z-10">Employee & Role</th>
                      {allPermissions.map((perm) => (
                        <th key={perm.code} className="p-3.5 font-bold whitespace-nowrap" title={perm.description}>
                          {perm.name || perm.code}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees.map((emp) => {
                      return (
                        <tr key={emp.membershipId} className="hover:bg-emerald-50/40">
                          <td className="p-3.5 sticky left-0 bg-white z-10 shadow-sm">
                            <div className="font-bold text-slate-900">{emp.displayName}</div>
                            <span className="text-[10px] text-slate-500">{emp.role.name}</span>
                          </td>

                          {allPermissions.map((perm) => {
                            const isSuper = emp.role.isSuperAdmin;
                            const hasPerm = isSuper || emp.role.code === "platform_super_admin" || perm.code.startsWith("dashboard");

                            return (
                              <td key={perm.code} className="p-3.5 text-center">
                                <button
                                  type="button"
                                  disabled={isSuper || permissionOverrideMutation.isPending || !canManage}
                                  onClick={() => {
                                    permissionOverrideMutation.mutate({
                                      membershipId: emp.membershipId,
                                      permissionCode: perm.code,
                                      effect: hasPerm ? "deny" : "allow",
                                    });
                                  }}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    hasPerm ? "bg-emerald-600" : "bg-slate-300"
                                  } ${isSuper ? "opacity-60 cursor-not-allowed" : ""}`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                      hasPerm ? "translate-x-4" : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Pending Invitations */}
        <TabsContent value="invitations" className="space-y-4 m-0">
          <Card className="border border-emerald-950/10 bg-white shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base font-black text-slate-900">Pending Employee Invitations</CardTitle>
              <p className="text-xs text-slate-500">
                Staff invitations that have been dispatched and are awaiting one-time acceptance.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {invitations.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Mail className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  <p className="font-semibold text-slate-700">No pending invitations</p>
                  <p className="text-xs">All invited employees have accepted their onboarding links.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b">
                      <tr>
                        <th className="p-4">Invited Email</th>
                        <th className="p-4">Assigned Role</th>
                        <th className="p-4">Sent Date</th>
                        <th className="p-4">Expires In</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invitations.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="p-4 font-bold text-slate-900">{inv.email}</td>
                          <td className="p-4">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-800">
                              {inv.roleName || "Operations Staff"}
                            </Badge>
                          </td>
                          <td className="p-4 text-slate-500">{timeAgo(inv.createdAt)}</td>
                          <td className="p-4 text-slate-600 font-mono text-[11px]">
                            {new Date(inv.expiresAt).toLocaleDateString("en-GB")}
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await apiRequest("POST", `/api/admin/employees/invitations/${inv.id}/resend`);
                                  toast({ title: "Invitation Resent", description: `Re-sent link to ${inv.email}` });
                                } catch (err: any) {
                                  toast({ title: "Failed", description: err.message, variant: "destructive" });
                                }
                              }}
                              className="h-7 text-xs"
                            >
                              Resend
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Drawer Inspector */}
      <Sheet open={Boolean(selectedMembershipId)} onOpenChange={(open) => !open && setSelectedMembershipId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto bg-slate-50">
          {isLoadingDetail ? (
            <div className="flex h-full items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : employeeDetail ? (
            <div className="flex flex-col min-h-full">
              {/* Header */}
              <div className="bg-[#053f36] p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 rounded-xl border border-white/20">
                      <AvatarFallback className="bg-lime-400 text-lg font-black text-[#053f36]">
                        {employeeDetail.displayName
                          ?.split(/\s+/)
                          .slice(0, 2)
                          .map((p) => p[0])
                          .join("")
                          .toUpperCase() || "OP"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-lg font-black">{employeeDetail.displayName}</h2>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-[10px] text-white/60">ID: {employeeDetail.membershipId}</span>
                        <Badge
                          variant="outline"
                          className={
                            employeeDetail.status === "active"
                              ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-200"
                              : "border-rose-400/30 bg-rose-500/20 text-rose-200"
                          }
                        >
                          {employeeDetail.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedMembershipId(null)}
                    className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 4 Stat Boxes */}
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Role</p>
                    <p className="text-xs font-black text-lime-300 truncate">{employeeDetail.role.name}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">MFA 2FA</p>
                    <p className="text-xs font-bold text-white">
                      {employeeDetail.mfaEnabled ? "Protected" : "Optional"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Sessions</p>
                    <p className="text-xs font-bold text-white">{employeeDetail.activeSessionCount || 0} active</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Last Active</p>
                    <p className="text-[11px] font-medium text-white/80">{timeAgo(employeeDetail.lastLoginAt)}</p>
                  </div>
                </div>
              </div>

              {/* Sub-Tabs */}
              <Tabs defaultValue="permissions" className="flex-1 p-6">
                <TabsList className="grid w-full grid-cols-2 bg-slate-200">
                  <TabsTrigger value="permissions" className="text-xs font-bold">
                    Effective Capabilities
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs font-bold">
                    Audit & Sessions
                  </TabsTrigger>
                </TabsList>

                {/* Permissions Tab */}
                <TabsContent value="permissions" className="mt-4 space-y-4">
                  <Card className="border-slate-200">
                    <CardContent className="p-4 space-y-2 text-xs">
                      <p className="font-bold text-slate-900 mb-2">Assigned Permissions ({employeeDetail.effectivePermissions?.length || 0})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {employeeDetail.effectivePermissions?.map((perm) => (
                          <Badge key={perm} variant="secondary" className="bg-emerald-50 text-emerald-800 text-[10px]">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-9 text-xs"
                      onClick={() => {
                        const target = employees.find((e) => e.membershipId === employeeDetail.membershipId);
                        if (target) {
                          setChangeRoleTarget(target);
                          setNewRoleId(target.role.id);
                        }
                      }}
                    >
                      <UserCog className="mr-1.5 h-3.5 w-3.5" /> Reassign Role
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-9 text-xs text-amber-700"
                      onClick={() => {
                        const target = employees.find((e) => e.membershipId === employeeDetail.membershipId);
                        if (target) setRevokeSessionsTarget(target);
                      }}
                    >
                      <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Revoke Sessions
                    </Button>
                  </div>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="mt-4 space-y-2">
                  {employeeDetail.activity?.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Clock className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                      <p className="font-semibold">No recent security events</p>
                    </div>
                  ) : (
                    employeeDetail.activity.map((item) => (
                      <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{item.action}</span>
                          <span className="text-[10px] text-slate-400">{timeAgo(item.occurredAt)}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-600">Outcome: {item.outcome}</p>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Invite Modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Invite Employee to AgriConnect</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Send an onboarding invitation with designated operational role access.
            </DialogDescription>
          </DialogHeader>

          {inviteToken ? (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-emerald-950">
                <p className="font-bold">One-Time Secure Invitation Code Generated</p>
                <p className="mt-1 text-slate-600">Share this token with the colleague to accept their invitation:</p>
                <div className="mt-2 flex gap-2">
                  <Input readOnly value={inviteToken} className="bg-white font-mono text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard?.writeText(inviteToken);
                      toast({ title: "Copied", description: "Invitation code copied to clipboard." });
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Official Work Email Address *</Label>
                <Input
                  type="email"
                  placeholder="colleague@agriconnect.org"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Assigned Operational Role *</Label>
                <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(false)}>
              {inviteToken ? "Close" : "Cancel"}
            </Button>
            {!inviteToken && (
              <Button
                size="sm"
                disabled={!inviteEmail.trim() || !inviteRoleId || inviteMutation.isPending}
                onClick={() =>
                  inviteMutation.mutate({
                    email: inviteEmail.trim().toLowerCase(),
                    roleId: inviteRoleId,
                  })
                }
                className="bg-[#078c52] text-white hover:bg-[#067343]"
              >
                {inviteMutation.isPending ? "Generating..." : "Send Invitation"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Modal */}
      <Dialog open={Boolean(changeRoleTarget)} onOpenChange={(open) => !open && setChangeRoleTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Change Staff Role</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Reassign permissions for {changeRoleTarget?.displayName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <Label className="text-xs font-bold text-slate-700">Select Role</Label>
            <Select value={newRoleId} onValueChange={setNewRoleId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setChangeRoleTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={changeRoleMutation.isPending || !newRoleId}
              onClick={() => {
                if (changeRoleTarget) {
                  changeRoleMutation.mutate({
                    membershipId: changeRoleTarget.membershipId,
                    roleId: newRoleId,
                  });
                }
              }}
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              {changeRoleMutation.isPending ? "Saving..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Reactivate Dialog */}
      <Dialog open={Boolean(statusChangeTarget)} onOpenChange={(open) => !open && setStatusChangeTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              {statusChangeTarget?.status === "deactivated" ? "Reactivate Staff Account" : "Deactivate Staff Account"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {statusChangeTarget?.status === "deactivated"
                ? `Restore administrative portal access for ${statusChangeTarget?.displayName}.`
                : `Suspend portal access and terminate sessions for ${statusChangeTarget?.displayName}.`}
            </DialogDescription>
          </DialogHeader>

          {statusChangeTarget?.status !== "deactivated" && (
            <div className="space-y-2 py-2">
              <Label className="text-xs font-bold text-slate-700">Reason for Deactivation</Label>
              <Input
                placeholder="e.g. End of contract, Security review..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setStatusChangeTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={toggleStatusMutation.isPending}
              onClick={() => {
                if (statusChangeTarget) {
                  const action = statusChangeTarget.status === "deactivated" ? "reactivate" : "deactivate";
                  toggleStatusMutation.mutate({
                    membershipId: statusChangeTarget.membershipId,
                    action,
                    reason: statusReason || undefined,
                  });
                }
              }}
              className={
                statusChangeTarget?.status === "deactivated"
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-rose-600 text-white hover:bg-rose-700"
              }
            >
              {toggleStatusMutation.isPending ? "Updating..." : statusChangeTarget?.status === "deactivated" ? "Reactivate" : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Sessions Dialog */}
      <Dialog open={Boolean(revokeSessionsTarget)} onOpenChange={(open) => !open && setRevokeSessionsTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Revoke Active Sessions</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Force sign out all active sessions across devices for {revokeSessionsTarget?.displayName}.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRevokeSessionsTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={revokeSessionsMutation.isPending}
              onClick={() => {
                if (revokeSessionsTarget) {
                  revokeSessionsMutation.mutate(revokeSessionsTarget.membershipId);
                }
              }}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {revokeSessionsMutation.isPending ? "Revoking..." : "Revoke All Sessions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
