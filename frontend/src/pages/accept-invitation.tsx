import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Leaf } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";

export default function AcceptInvitationPage() {
  const token = new URLSearchParams(useSearch()).get("token") ?? "";
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ name: "", password: "" });
  const invitation = useQuery<{ invitation: { email: string; roleName: string; expiresAt: string } }>({
    queryKey: [`/api/auth/invitations/${encodeURIComponent(token)}`], enabled: !!token, retry: false,
  });
  const accept = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/auth/invitations/accept", {
      token, name: form.name || undefined, password: form.password || undefined,
    })).json(),
  });

  return <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-lime-50 p-4" data-testid="accept-invitation-page">
    <Card className="w-full max-w-lg"><CardHeader><Leaf className="mb-3 h-9 w-9 text-primary" /><CardTitle>Join the AgriConnect team</CardTitle></CardHeader><CardContent className="space-y-4">
      {!token || invitation.isError ? <><p className="font-bold">This invitation is invalid, expired, revoked, or already used.</p><Button asChild variant="outline"><Link href="/admin/sign-in">Return to sign in</Link></Button></>
        : invitation.isLoading ? <p>Checking invitation…</p>
        : accept.isSuccess ? <div className="space-y-4 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /><p className="font-bold">Your employee access is active.</p><Button onClick={() => setLocation("/admin/sign-in?returnTo=/admin")}>Sign in to the Organisation Portal</Button></div>
        : <><div className="rounded-xl border bg-muted/40 p-4"><p className="font-bold">{invitation.data?.invitation.email}</p><p className="text-sm text-muted-foreground">Role: {invitation.data?.invitation.roleName} · expires {new Date(invitation.data!.invitation.expiresAt).toLocaleString()}</p></div><p className="text-sm text-muted-foreground">Existing AgriConnect users can accept without changing their password. New users must provide their name and a strong password.</p><div><Label>Name</Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" /></div><div><Label>Password</Label><Input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" /><p className="mt-1 text-xs text-muted-foreground">At least 12 characters with upper/lowercase letters and a number.</p></div>{accept.isError && <p className="text-sm text-destructive">{accept.error.message}</p>}<Button className="w-full" disabled={accept.isPending} onClick={() => accept.mutate()}>Verify email and accept invitation</Button></>}
    </CardContent></Card>
  </main>;
}
