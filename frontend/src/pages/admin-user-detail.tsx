import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, Ban, CheckCircle2, ExternalLink, Loader2, NotebookPen, RotateCcw, ShieldCheck, ShoppingBag, Store } from "lucide-react";
import type { AdminUserDetailResponse } from "@shared/schema";
import { AdminLayout } from "@/components/admin-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type AccountAction = "verify" | "suspend" | "reactivate";

export default function AdminUserDetailPage() {
  const { userId = "" } = useParams<{ userId: string }>();
  const detailUrl = `/api/admin/users/${encodeURIComponent(userId)}`;
  const query = useQuery<AdminUserDetailResponse>({ queryKey: [detailUrl], staleTime: 10_000 });
  const access = useAdminAccess();
  const { toast } = useToast();
  const [action, setAction] = useState<AccountAction | null>(null);
  const [reason, setReason] = useState("");
  const [noteText, setNoteText] = useState("");
  const [classification, setClassification] = useState("general");
  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!action || !query.data) throw new Error("Select an action");
      return (await apiRequest("POST", `${detailUrl}/${action}`, { reason, expectedUpdatedAt: query.data.user.updatedAt })).json();
    },
    onSuccess: async () => { setAction(null); setReason(""); await queryClient.invalidateQueries({ predicate: (item) => String(item.queryKey[0]).startsWith("/api/admin/users") }); toast({ title: "User account updated" }); },
    onError: (error: Error) => toast({ title: "Account update failed", description: error.message, variant: "destructive" }),
  });
  const noteMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", `${detailUrl}/notes`, { classification, text: noteText })).json(),
    onSuccess: async () => { setNoteText(""); await queryClient.invalidateQueries({ queryKey: [detailUrl] }); toast({ title: "Internal note added" }); },
    onError: (error: Error) => toast({ title: "Note could not be added", description: error.message, variant: "destructive" }),
  });

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-5">
        <Button asChild variant="ghost" size="sm"><Link href="/admin/users"><ArrowLeft className="mr-2 h-4 w-4" />Back to users</Link></Button>
        {query.isLoading ? <Card><CardContent className="p-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></CardContent></Card> : query.isError || !query.data ? <Card><CardContent className="space-y-3 p-14 text-center"><p className="font-bold">User detail could not be loaded.</p><Button variant="outline" onClick={() => query.refetch()}>Retry</Button></CardContent></Card> : <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4"><Avatar className="h-16 w-16"><AvatarImage src={query.data.user.avatar || undefined} /><AvatarFallback>{query.data.user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-black">{query.data.user.displayName}</h1><Badge variant={query.data.user.accountStatus === "active" ? "secondary" : "destructive"}>{query.data.user.accountStatus}</Badge><Badge variant="outline">{query.data.user.verificationStatus.replaceAll("_", " ")}</Badge></div><p className="text-sm text-muted-foreground">{query.data.user.email || query.data.user.phone || query.data.user.id} · {query.data.user.accountType}</p></div></div>
            <div className="flex flex-wrap gap-2">{access.hasPermission("users.approve") && query.data.user.verificationStatus !== "verified" && <Button onClick={() => setAction("verify")}><CheckCircle2 className="mr-2 h-4 w-4" />Verify</Button>}{access.hasPermission("users.suspend") && query.data.user.accountStatus === "active" && <Button variant="destructive" onClick={() => setAction("suspend")}><Ban className="mr-2 h-4 w-4" />Suspend</Button>}{access.hasPermission("users.suspend") && query.data.user.accountStatus !== "active" && <Button onClick={() => setAction("reactivate")}><RotateCcw className="mr-2 h-4 w-4" />Reactivate</Button>}</div>
          </div>
          {query.data.user.accountStatusReason && <Card className="border-amber-300"><CardContent className="p-4 text-sm"><strong>Latest account-status reason:</strong> {query.data.user.accountStatusReason}</CardContent></Card>}

          <div className="grid gap-4 lg:grid-cols-3">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Public preview</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><Info label="Public name" value={query.data.publicPreview.displayName} /><Info label="Location" value={query.data.publicPreview.location || "Not provided"} /><Info label="Public verification" value={query.data.publicPreview.isPubliclyVerified ? "Verified" : "Not verified"} /><Info label="Seller discovery" value={query.data.publicPreview.isPubliclyDiscoverable ? "Eligible" : "Hidden / ineligible"} />{query.data.seller && <Button asChild size="sm" variant="outline"><Link href={`/sellers/${encodeURIComponent(query.data.user.id)}`}>Open public profile <ExternalLink className="ml-2 h-3.5 w-3.5" /></Link></Button>}</CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" />Seller data</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{query.data.seller ? <><Info label="Legal / trading name" value={[query.data.seller.legalName, query.data.seller.tradingName].filter(Boolean).join(" · ")} /><Info label="Country / entity" value={`${query.data.seller.country} · ${query.data.seller.entityType.replaceAll("_", " ")}`} /><Info label="Activities" value={query.data.seller.primaryActivities.join(", ") || "None recorded"} /><Info label="Verification state" value={query.data.seller.verificationStatus.replaceAll("_", " ")} />{query.data.seller.verificationCaseId && <Button asChild size="sm" variant="outline"><Link href={`/admin/verifications/${query.data.seller.verificationCaseId}`}>Open verification case</Link></Button>}</> : <p className="text-muted-foreground">This identity has no seller business profile.</p>}</CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5" />Commerce summary</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><Info label="Products" value={`${query.data.summary.products.total} total · ${query.data.summary.products.published} published · ${query.data.summary.products.draft} draft · ${query.data.summary.products.suspended} suspended`} /><Info label="Orders" value={`${query.data.summary.orders.asBuyer} as buyer · ${query.data.summary.orders.asSeller} as seller`} /><Info label="Seller value" value={query.data.summary.orders.valueByCurrency.length ? query.data.summary.orders.valueByCurrency.map((item) => `${item.currency} ${(Number(item.amountMinor) / 100).toFixed(2)}`).join(" · ") : "No seller order value"} /></CardContent></Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader><CardTitle>Login history</CardTitle></CardHeader><CardContent className="space-y-2">{query.data.loginHistory.length ? query.data.loginHistory.map((event) => <div key={event.id} className="flex items-center justify-between rounded-lg border p-3 text-sm"><div><p className="font-bold capitalize">{event.method.replaceAll("_", " ")} · {event.outcome}</p><p className="text-xs text-muted-foreground">{event.failureCode || "No failure recorded"}</p></div><time className="text-xs text-muted-foreground">{new Date(event.occurredAt).toLocaleString()}</time></div>) : <p className="text-sm text-muted-foreground">No login events have been recorded for this account.</p>}</CardContent></Card>
            <Card><CardHeader><CardTitle>Audit timeline</CardTitle></CardHeader><CardContent className="space-y-2">{query.data.auditTimeline.length ? query.data.auditTimeline.map((event) => <div key={event.id} className="rounded-lg border p-3 text-sm"><div className="flex justify-between gap-2"><p className="font-bold">{event.action}</p><Badge variant="outline">{event.outcome}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{event.actorName} · {new Date(event.occurredAt).toLocaleString()}</p></div>) : <p className="text-sm text-muted-foreground">No administrative events target this user yet.</p>}</CardContent></Card>
          </div>

          <Card><CardHeader><CardTitle className="flex items-center gap-2"><NotebookPen className="h-5 w-5" />Internal notes</CardTitle></CardHeader><CardContent className="space-y-4">{access.hasPermission("users.edit") && <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]"><Select value={classification} onValueChange={setClassification}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["general","support","compliance","risk"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><Textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Internal note; never visible on the public profile" /><Button disabled={noteText.trim().length < 3 || noteMutation.isPending} onClick={() => noteMutation.mutate()}>Add note</Button></div>}{query.data.notes.length ? query.data.notes.map((note) => <div key={note.id} className="rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><Badge variant="outline">{note.classification}</Badge><span className="text-xs text-muted-foreground">{note.authorName} · {new Date(note.createdAt).toLocaleString()}</span></div><p className="mt-2 whitespace-pre-wrap text-sm">{note.text}</p></div>) : <p className="text-sm text-muted-foreground">No internal notes.</p>}</CardContent></Card>
        </>}
      </div>

      <Dialog open={Boolean(action)} onOpenChange={(open) => !open && setAction(null)}><DialogContent><DialogHeader><DialogTitle className="capitalize">{action} user account</DialogTitle><DialogDescription>{action === "suspend" ? "Suspension immediately blocks protected actions and public seller discovery while preserving records." : action === "reactivate" ? "Reactivation restores sign-in, but it does not override a suspended or rejected seller-verification case." : "Verification uses the seller case as the authority when one exists and requires all mandatory evidence."}</DialogDescription></DialogHeader><div><Label>Required reason</Label><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain this decision for the audit trail" /></div><DialogFooter><Button variant="outline" onClick={() => setAction(null)}>Cancel</Button><Button variant={action === "suspend" ? "destructive" : "default"} disabled={reason.trim().length < 3 || actionMutation.isPending} onClick={() => actionMutation.mutate()}>{actionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Confirm</Button></DialogFooter></DialogContent></Dialog>
    </AdminLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase text-muted-foreground">{label}</p><p className="font-semibold">{value}</p></div>;
}
