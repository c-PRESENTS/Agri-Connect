import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { KeyRound, Laptop, ShieldCheck, UserCog } from "lucide-react";
import { Link, useRoute } from "wouter";
import type { AdminEmployeeDetail } from "@shared/schema";
import { AdminLayout } from "@/components/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Role = { id: string; name: string; isSuperAdmin: boolean };
type Permission = { code: string; name: string; groupName: string; highRisk: boolean };

export default function AdminEmployeeDetailPage() {
  const [, params] = useRoute("/admin/employees/:membershipId");
  const membershipId = params?.membershipId ?? "";
  const access = useAdminAccess();
  const { toast } = useToast();
  const detail = useQuery<{ employee: AdminEmployeeDetail }>({ queryKey: [`/api/admin/employees/${encodeURIComponent(membershipId)}`], enabled: !!membershipId });
  const roles = useQuery<{ roles: Role[] }>({ queryKey: ["/api/admin/roles"] });
  const permissions = useQuery<{ permissions: Permission[] }>({ queryKey: ["/api/admin/permissions"], enabled: access.hasPermission("employees.manage_permissions") });
  const [roleId, setRoleId] = useState("");
  const [permissionCode, setPermissionCode] = useState("");
  const [effect, setEffect] = useState<"allow" | "deny" | "inherit">("inherit");
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: [`/api/admin/employees/${encodeURIComponent(membershipId)}`] }); await queryClient.invalidateQueries({ predicate: (item) => String(item.queryKey[0]).startsWith("/api/admin/employees?") }); };
  const action = useMutation({
    mutationFn: async ({ kind }: { kind: "role" | "override" | "deactivate" | "reactivate" | "sessions" }) => {
      const reason = kind === "sessions" ? "Administrative remote sign-out" : window.prompt("Reason for this protected change")?.trim();
      if (kind !== "sessions" && !reason) throw new Error("A reason is required.");
      if (kind === "role") return (await apiRequest("PATCH", `/api/admin/employees/${encodeURIComponent(membershipId)}/role`, { roleId: roleId || employee.role.id, reason })).json();
      if (kind === "override") return (await apiRequest("PUT", `/api/admin/employees/${encodeURIComponent(membershipId)}/overrides`, { permissionCode, effect, reason })).json();
      return (await apiRequest("POST", `/api/admin/employees/${encodeURIComponent(membershipId)}/${kind === "sessions" ? "sessions/revoke" : kind}`, kind === "sessions" ? {} : { reason })).json();
    },
    onSuccess: async () => { await refresh(); toast({ title: "Employee access updated" }); },
    onError: (error) => toast({ title: "Protected change failed", description: error.message, variant: "destructive" }),
  });

  if (detail.isLoading) return <AdminLayout><Card><CardContent className="p-12 text-center">Loading employee access…</CardContent></Card></AdminLayout>;
  if (!detail.data?.employee) return <AdminLayout><Card><CardContent className="p-12 text-center"><p className="font-bold">Employee access could not be loaded.</p><Button asChild className="mt-4" variant="outline"><Link href="/admin/employees">Back to employees</Link></Button></CardContent></Card></AdminLayout>;
  const employee = detail.data.employee;
  return <AdminLayout><div className="space-y-6" data-testid="admin-employee-detail-page">
    <div><Button asChild variant="ghost" size="sm"><Link href="/admin/employees">← Employees</Link></Button><div className="mt-3 flex flex-wrap items-center gap-3"><UserCog className="h-9 w-9 text-primary" /><div><h1 className="text-3xl font-black">{employee.displayName}</h1><p className="text-sm text-muted-foreground">{employee.email}</p></div><Badge variant={employee.status === "active" ? "secondary" : "destructive"}>{employee.status}</Badge>{employee.role.isSuperAdmin && <Badge><ShieldCheck className="mr-1 h-3.5 w-3.5" />Super Admin</Badge>}</div></div>
    <div className="grid gap-4 lg:grid-cols-3"><Card><CardHeader><CardTitle>Access status</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p><b>Role:</b> {employee.role.name}</p><p><b>2FA:</b> {employee.mfaEnabled ? "Enabled" : "Not enabled"}</p><p><b>Accepted:</b> {employee.acceptedAt ? new Date(employee.acceptedAt).toLocaleString() : "—"}</p><p><b>Last login:</b> {employee.lastLoginAt ? new Date(employee.lastLoginAt).toLocaleString() : "Never"}</p><p><b>Active sessions:</b> {employee.activeSessionCount}</p></CardContent></Card>
      <Card className="lg:col-span-2"><CardHeader><CardTitle>Protected actions</CardTitle></CardHeader><CardContent className="space-y-4">{access.hasPermission("employees.manage_permissions") && <><div className="grid gap-2 sm:grid-cols-[1fr_auto]"><div><Label>Assigned role</Label><select className="h-10 w-full rounded-md border bg-background px-3" value={roleId || employee.role.id} onChange={(event) => setRoleId(event.target.value)}>{roles.data?.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></div><Button className="self-end" onClick={() => { if (!roleId) setRoleId(employee.role.id); action.mutate({ kind: "role" }); }} disabled={action.isPending}>Assign role</Button></div><div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]"><div><Label>Permission override</Label><select className="h-10 w-full rounded-md border bg-background px-3" value={permissionCode} onChange={(event) => setPermissionCode(event.target.value)}><option value="">Select permission</option>{permissions.data?.permissions.map((permission) => <option key={permission.code} value={permission.code}>{permission.code}{permission.highRisk ? " · high risk" : ""}</option>)}</select></div><div><Label>Effect</Label><select className="h-10 w-full rounded-md border bg-background px-3" value={effect} onChange={(event) => setEffect(event.target.value as typeof effect)}><option value="inherit">Inherit</option><option value="allow">Allow</option><option value="deny">Deny</option></select></div><Button className="self-end" disabled={!permissionCode || action.isPending} onClick={() => action.mutate({ kind: "override" })}><KeyRound className="mr-1 h-4 w-4" />Apply</Button></div></>}
        <div className="flex flex-wrap gap-2">{access.hasPermission("employees.deactivate") && <Button variant={employee.status === "active" ? "destructive" : "default"} onClick={() => action.mutate({ kind: employee.status === "active" ? "deactivate" : "reactivate" })}>{employee.status === "active" ? "Deactivate employee" : "Reactivate employee"}</Button>}{access.hasPermission("employees.edit") && <Button variant="outline" onClick={() => action.mutate({ kind: "sessions" })}><Laptop className="mr-2 h-4 w-4" />Revoke remote sessions</Button>}</div><p className="text-xs text-muted-foreground">Role, override and status changes take effect immediately. High-risk actions require a recent sign-in.</p></CardContent></Card></div>
    <Card><CardHeader><CardTitle>Effective permissions ({employee.effectivePermissions.length})</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{employee.effectivePermissions.map((code) => <Badge key={code} variant={employee.overrides.some((item) => item.permissionCode === code) ? "default" : "outline"}>{code}</Badge>)}</CardContent></Card>
    <Card className="overflow-hidden"><CardHeader><CardTitle>Employee activity</CardTitle></CardHeader><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Action</TableHead><TableHead>Outcome</TableHead></TableRow></TableHeader><TableBody>{employee.activity.map((event) => <TableRow key={event.id}><TableCell>{new Date(event.occurredAt).toLocaleString()}</TableCell><TableCell className="font-mono text-xs">{event.action}</TableCell><TableCell><Badge variant="outline">{event.outcome}</Badge></TableCell></TableRow>)}</TableBody></Table></div></Card>
  </div></AdminLayout>;
}
