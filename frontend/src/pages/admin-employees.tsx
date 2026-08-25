import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MailPlus, RefreshCcw, Search, ShieldCheck, UserCog, XCircle } from "lucide-react";
import { Link } from "wouter";
import type { AdminEmployeeSummary } from "@shared/schema";
import { AdminLayout } from "@/components/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Role = { id: string; name: string; code: string; isSuperAdmin: boolean };
type Directory = { employees: AdminEmployeeSummary[]; invitations: Array<{ id: string; email: string; roleId: string; roleName: string; expiresAt: string }>; pagination: { page: number; total: number; totalPages: number } };

export default function AdminEmployeesPage() {
  const access = useAdminAccess();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", roleId: "" });
  const query = useQuery<Directory>({ queryKey: [`/api/admin/employees?search=${encodeURIComponent(search)}&status=${status}&pageSize=100`] });
  const roles = useQuery<{ roles: Role[] }>({ queryKey: ["/api/admin/roles"] });
  const refresh = () => queryClient.invalidateQueries({ predicate: (item) => String(item.queryKey[0]).startsWith("/api/admin/employees") });

  const invitation = useMutation({
    mutationFn: async ({ action, id }: { action: "create" | "resend" | "revoke"; id?: string }) => {
      if (action === "create") return (await apiRequest("POST", "/api/admin/employees/invitations", invite)).json();
      const reason = action === "revoke" ? window.prompt("Why is this invitation being revoked?")?.trim() : undefined;
      if (action === "revoke" && !reason) throw new Error("A reason is required.");
      return (await apiRequest("POST", `/api/admin/employees/invitations/${encodeURIComponent(id!)}/${action}`, reason ? { reason } : {})).json();
    },
    onSuccess: async (_data, variables) => { await refresh(); if (variables.action === "create") { setInviteOpen(false); setInvite({ email: "", roleId: "" }); } toast({ title: variables.action === "revoke" ? "Invitation revoked" : "Invitation sent" }); },
    onError: (error) => toast({ title: "Invitation action failed", description: error.message, variant: "destructive" }),
  });

  return <AdminLayout><div className="space-y-6" data-testid="admin-employees-page">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-black">Employee management</h1><p className="text-sm text-muted-foreground">Invite staff and control their AgriConnect platform access without database edits.</p></div>
      {access.hasPermission("employees.invite") && <Dialog open={inviteOpen} onOpenChange={setInviteOpen}><DialogTrigger asChild><Button><MailPlus className="mr-2 h-4 w-4" />Invite employee</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Invite an employee</DialogTitle></DialogHeader><div className="space-y-4"><div><Label htmlFor="employee-email">Email</Label><Input id="employee-email" type="email" value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} /></div><div><Label htmlFor="employee-role">Role</Label><select id="employee-role" className="h-10 w-full rounded-md border bg-background px-3" value={invite.roleId} onChange={(event) => setInvite({ ...invite, roleId: event.target.value })}><option value="">Select role</option>{roles.data?.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></div><p className="text-xs text-muted-foreground">Invitation links expire after 48 hours. Real delivery requires the configured email provider.</p><Button className="w-full" disabled={!invite.email || !invite.roleId || invitation.isPending} onClick={() => invitation.mutate({ action: "create" })}>Send invitation</Button></div></DialogContent></Dialog>}
    </div>

    <Card><CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_220px]"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee name or email" /></div><select className="h-10 rounded-md border bg-background px-3" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="invited">Invited</option><option value="suspended">Suspended</option><option value="deactivated">Deactivated</option></select></CardContent></Card>

    {!!query.data?.invitations.length && <Card><CardHeader><CardTitle>Pending invitations</CardTitle></CardHeader><CardContent className="space-y-3">{query.data.invitations.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3"><MailPlus className="h-5 w-5 text-primary" /><div className="min-w-48 flex-1"><p className="font-bold">{item.email}</p><p className="text-xs text-muted-foreground">{item.roleName} · expires {new Date(item.expiresAt).toLocaleString()}</p></div>{access.hasPermission("employees.invite") && <><Button size="sm" variant="outline" onClick={() => invitation.mutate({ action: "resend", id: item.id })}><RefreshCcw className="mr-1 h-3.5 w-3.5" />Resend</Button><Button size="sm" variant="destructive" onClick={() => invitation.mutate({ action: "revoke", id: item.id })}><XCircle className="mr-1 h-3.5 w-3.5" />Revoke</Button></>}</div>)}</CardContent></Card>}

    <Card className="overflow-hidden"><CardHeader><CardTitle>{query.data?.pagination.total ?? 0} employees</CardTitle></CardHeader><div className="overflow-x-auto">{query.isLoading ? <CardContent className="p-10 text-center">Loading employees…</CardContent> : query.isError ? <CardContent className="p-10 text-center"><p>Employee directory could not be loaded.</p><Button className="mt-3" variant="outline" onClick={() => query.refetch()}>Retry</Button></CardContent> : !query.data?.employees.length ? <CardContent className="p-12 text-center"><UserCog className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-bold">No employees match these filters</p></CardContent> : <Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>2FA</TableHead><TableHead>Accepted</TableHead><TableHead>Last login</TableHead><TableHead>Sessions</TableHead></TableRow></TableHeader><TableBody>{query.data.employees.map((employee) => <TableRow key={employee.membershipId}><TableCell><Link className="font-bold hover:underline" href={`/admin/employees/${encodeURIComponent(employee.membershipId)}`}>{employee.displayName}</Link><p className="text-xs text-muted-foreground">{employee.email}</p></TableCell><TableCell>{employee.role.name}{employee.role.isSuperAdmin && <ShieldCheck className="ml-1 inline h-4 w-4 text-emerald-600" />}</TableCell><TableCell><Badge variant={employee.status === "active" ? "secondary" : "destructive"}>{employee.status}</Badge></TableCell><TableCell><Badge variant="outline">{employee.mfaEnabled ? "Enabled" : "Not enabled"}</Badge></TableCell><TableCell>{employee.acceptedAt ? new Date(employee.acceptedAt).toLocaleDateString() : "—"}</TableCell><TableCell>{employee.lastLoginAt ? new Date(employee.lastLoginAt).toLocaleString() : "Never"}</TableCell><TableCell>{employee.activeSessionCount}</TableCell></TableRow>)}</TableBody></Table>}</div></Card>
  </div></AdminLayout>;
}
