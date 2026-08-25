import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { KeyRound, ShieldAlert } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Role = { id: string; code: string; name: string; description: string; isSuperAdmin: boolean; permissions: string[] };
type Permission = { code: string; name: string; description: string; groupName: string; highRisk: boolean };

function groupPermissions(permissions: Permission[]): Array<[string, Permission[]]> {
  const groups: Record<string, Permission[]> = {};
  permissions.forEach((permission) => { (groups[permission.groupName] ||= []).push(permission); });
  return Object.entries(groups);
}

function RoleMatrix({ role, permissions, canEdit }: { role: Role; permissions: Permission[]; canEdit: boolean }) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>(role.permissions);
  useEffect(() => setSelected(role.permissions), [role.permissions]);
  const save = useMutation({
    mutationFn: async () => {
      const reason = window.prompt("Reason for changing this role matrix")?.trim();
      if (!reason) throw new Error("A reason is required.");
      return (await apiRequest("PUT", `/api/admin/roles/${encodeURIComponent(role.id)}/permissions`, { permissionCodes: selected, reason })).json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      toast({ title: "Role permissions updated" });
    },
    onError: (error) => toast({ title: "Role matrix was not changed", description: error.message, variant: "destructive" }),
  });
  const groups = useMemo(() => groupPermissions(permissions), [permissions]);
  const toggle = (code: string, checked: boolean) => setSelected((current) => checked
    ? Array.from(new Set(current.concat(code)))
    : current.filter((item) => item !== code));

  return <Card data-testid={`admin-role-${role.code}`}>
    <CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle>{role.name}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{role.description}</p></div>{role.isSuperAdmin && <Badge><ShieldAlert className="mr-1 h-3.5 w-3.5" />Complete authority</Badge>}</div></CardHeader>
    <CardContent className="space-y-5">
      {groups.map(([group, items]) => <div key={group}><p className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">{group}</p><div className="grid gap-2 sm:grid-cols-2">{items.map((permission) => <label key={permission.code} className="flex items-start gap-3 rounded-lg border p-3"><Checkbox checked={role.isSuperAdmin || selected.includes(permission.code)} disabled={!canEdit || role.isSuperAdmin} onCheckedChange={(checked) => toggle(permission.code, checked === true)} /><span><span className="block text-sm font-bold">{permission.name}{permission.highRisk && <Badge className="ml-2" variant="destructive">High risk</Badge>}</span><span className="block text-xs text-muted-foreground">{permission.code}</span></span></label>)}</div></div>)}
      {canEdit && !role.isSuperAdmin && <Button disabled={save.isPending || selected.toSorted().join() === role.permissions.toSorted().join()} onClick={() => save.mutate()}>Save permission matrix</Button>}
    </CardContent>
  </Card>;
}

export default function AdminRolesPage() {
  const access = useAdminAccess();
  const roles = useQuery<{ roles: Role[] }>({ queryKey: ["/api/admin/roles"] });
  const permissions = useQuery<{ permissions: Permission[] }>({ queryKey: ["/api/admin/permissions"], enabled: access.hasPermission("employees.manage_permissions") });
  const fallbackCatalogue: Permission[] = Array.from(new Set(roles.data?.roles.flatMap((role) => role.permissions) ?? [])).map((code) => ({ code, name: code, description: code, groupName: "Assigned permissions", highRisk: false }));
  const catalogue = permissions.data?.permissions ?? fallbackCatalogue;
  return <AdminLayout><div className="space-y-6" data-testid="admin-roles-page">
    <div><h1 className="text-3xl font-black">Roles & permissions</h1><p className="text-sm text-muted-foreground">The existing platform permission catalogue is the single authority for every employee role.</p></div>
    {!access.hasPermission("employees.manage_permissions") && <Card><CardContent className="p-4 text-sm text-muted-foreground">You can view role assignments, but only authorised employees can load or edit the permission catalogue.</CardContent></Card>}
    {roles.isLoading ? <Card><CardContent className="p-12 text-center">Loading role matrix…</CardContent></Card> : roles.isError ? <Card><CardContent className="p-12 text-center">Role matrix could not be loaded.</CardContent></Card> : <div className="grid gap-4 xl:grid-cols-2">{roles.data?.roles.map((role) => <RoleMatrix key={role.id} role={role} permissions={catalogue} canEdit={access.hasPermission("employees.manage_permissions")} />)}</div>}
    <Card><CardContent className="flex items-start gap-3 p-4 text-sm"><KeyRound className="mt-0.5 h-5 w-5 text-primary" /><p>Changes invalidate affected employee sessions immediately. Super Admin identity and its complete authority remain protected.</p></CardContent></Card>
  </div></AdminLayout>;
}
