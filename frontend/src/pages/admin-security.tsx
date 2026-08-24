import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { KeyRound, Laptop, LockKeyhole, ShieldCheck } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type SecurityState = {
  mfa: { enabled: boolean; enabledAt: string | null; recoveryCodesRemaining: number; configured: boolean };
  sessions: Array<{ id: string; current: boolean; deviceLabel: string; createdAt: string | null; lastAuthenticatedAt: string | null; expiresAt: string }>;
  events: Array<{ id: string; outcome: string; method: string; failureCode: string | null; occurredAt: string }>;
};

export default function AdminSecurityPage() {
  const { toast } = useToast();
  const query = useQuery<SecurityState>({ queryKey: ["/api/admin/security"] });
  const [setup, setSetup] = useState<{ qrDataUrl: string; manualKey: string } | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/security"] });
  const securityAction = useMutation({
    mutationFn: async ({ action, sessionId }: { action: "enroll" | "confirm" | "disable" | "recovery" | "session"; sessionId?: string }) => {
      if (action === "session") return (await apiRequest("DELETE", `/api/admin/security/sessions/${encodeURIComponent(sessionId!)}`)).json();
      const path = action === "recovery" ? "recovery-codes/regenerate" : `totp/${action}`;
      return (await apiRequest("POST", `/api/admin/security/${path}`, action === "enroll" ? {} : { code })).json();
    },
    onSuccess: async (data, variables) => {
      if (variables.action === "enroll") setSetup(data);
      if (variables.action === "confirm" || variables.action === "recovery") { setRecoveryCodes(data.recoveryCodes ?? []); setSetup(null); }
      setCode(""); await refresh(); toast({ title: variables.action === "session" ? "Remote session signed out" : "Security settings updated" });
    },
    onError: (error) => toast({ title: "Security action failed", description: error.message, variant: "destructive" }),
  });
  const state = query.data;
  return <AdminLayout><div className="space-y-6" data-testid="admin-security-page"><div><h1 className="text-3xl font-black">Admin security</h1><p className="text-sm text-muted-foreground">Authenticator protection, one-time recovery codes, active sessions and recent security events.</p></div>
    {query.isLoading ? <Card><CardContent className="p-12 text-center">Loading security state…</CardContent></Card> : query.isError || !state ? <Card><CardContent className="p-12 text-center">Security state could not be loaded.</CardContent></Card> : <>
      <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><LockKeyhole className="h-5 w-5" />Two-factor authentication</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center gap-2"><Badge variant={state.mfa.enabled ? "default" : "outline"}>{state.mfa.enabled ? "Enabled" : "Not enabled"}</Badge>{state.mfa.enabled && <span className="text-sm text-muted-foreground">{state.mfa.recoveryCodesRemaining} recovery codes remaining</span>}</div>{!state.mfa.configured ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">MFA requires APP_ENCRYPTION_KEY in the deployment environment.</p> : !state.mfa.enabled ? <Button onClick={() => securityAction.mutate({ action: "enroll" })}><ShieldCheck className="mr-2 h-4 w-4" />Set up authenticator</Button> : <div className="space-y-3"><div><Label>Current authenticator code</Label><Input inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" /></div><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={code.length !== 6} onClick={() => securityAction.mutate({ action: "recovery" })}><KeyRound className="mr-2 h-4 w-4" />New recovery codes</Button><Button variant="destructive" disabled={code.length !== 6} onClick={() => securityAction.mutate({ action: "disable" })}>Disable 2FA</Button></div></div>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Security posture</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p><b>Authenticator:</b> {state.mfa.enabled ? `Enabled ${state.mfa.enabledAt ? new Date(state.mfa.enabledAt).toLocaleDateString() : ""}` : "Action recommended"}</p><p><b>Active sessions:</b> {state.sessions.length}</p><p><b>Recent events:</b> {state.events.length}</p><p className="text-muted-foreground">High-risk role, permission, password, MFA and membership changes revoke affected sessions.</p></CardContent></Card></div>
      <Card className="overflow-hidden"><CardHeader><CardTitle className="flex items-center gap-2"><Laptop className="h-5 w-5" />Active sessions</CardTitle></CardHeader><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Device</TableHead><TableHead>Authenticated</TableHead><TableHead>Expires</TableHead><TableHead /></TableRow></TableHeader><TableBody>{state.sessions.map((session) => <TableRow key={session.id}><TableCell>{session.deviceLabel}{session.current && <Badge className="ml-2">Current</Badge>}</TableCell><TableCell>{session.lastAuthenticatedAt ? new Date(session.lastAuthenticatedAt).toLocaleString() : "Legacy session"}</TableCell><TableCell>{new Date(session.expiresAt).toLocaleString()}</TableCell><TableCell>{!session.current && <Button size="sm" variant="outline" onClick={() => securityAction.mutate({ action: "session", sessionId: session.id })}>Sign out</Button>}</TableCell></TableRow>)}</TableBody></Table></div></Card>
      <Card className="overflow-hidden"><CardHeader><CardTitle>Security events</CardTitle></CardHeader><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead>Outcome</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader><TableBody>{state.events.map((event) => <TableRow key={event.id}><TableCell>{new Date(event.occurredAt).toLocaleString()}</TableCell><TableCell>{event.method}</TableCell><TableCell><Badge variant={event.outcome === "success" ? "secondary" : "destructive"}>{event.outcome}</Badge></TableCell><TableCell>{event.failureCode || "—"}</TableCell></TableRow>)}</TableBody></Table></div></Card>
    </>}
    <Dialog open={!!setup} onOpenChange={(open) => !open && setSetup(null)}><DialogContent><DialogHeader><DialogTitle>Connect your authenticator</DialogTitle></DialogHeader>{setup && <div className="space-y-4 text-center"><img className="mx-auto h-56 w-56" src={setup.qrDataUrl} alt="Authenticator QR code" /><p className="text-sm text-muted-foreground">Scan the QR code, or enter this setup key:</p><code className="block break-all rounded-lg bg-muted p-3 text-sm">{setup.manualKey}</code><div className="text-left"><Label>Six-digit code</Label><Input inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} /></div><Button className="w-full" disabled={code.length !== 6} onClick={() => securityAction.mutate({ action: "confirm" })}>Confirm and enable</Button></div>}</DialogContent></Dialog>
    <Dialog open={recoveryCodes.length > 0} onOpenChange={(open) => !open && setRecoveryCodes([])}><DialogContent><DialogHeader><DialogTitle>Save your recovery codes</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">These codes are shown once. Store them securely; every code works only once.</p><div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-4 font-mono text-sm">{recoveryCodes.map((item) => <span key={item}>{item}</span>)}</div><Button onClick={() => { navigator.clipboard.writeText(recoveryCodes.join("\n")); toast({ title: "Recovery codes copied" }); }}>Copy codes</Button></DialogContent></Dialog>
  </div></AdminLayout>;
}
