import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { AlertTriangle, ArrowLeft, CheckCircle2, ExternalLink, Loader2, PackageSearch, Sparkles, UserRound } from "lucide-react";
import type { AdminProductDetailResponse } from "@shared/schema";
import { AdminLayout } from "@/components/admin-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type ModerationAction = "approve" | "reject" | "request-changes" | "suspend" | "restore" | "remove";

export default function AdminProductDetailPage() {
  const { productId = "" } = useParams<{ productId: string }>();
  const detailUrl = `/api/admin/products/${encodeURIComponent(productId)}`;
  const query = useQuery<AdminProductDetailResponse>({ queryKey: [detailUrl], staleTime: 5_000 });
  const access = useAdminAccess();
  const { toast } = useToast();
  const [action, setAction] = useState<ModerationAction | "">("");
  const [reason, setReason] = useState("");
  const actions = useMemo(() => {
    const status = query.data?.product.moderationStatus;
    const result: ModerationAction[] = [];
    if (status === "pending_review") {
      if (access.hasPermission("products.approve")) result.push("approve");
      if (access.hasPermission("products.reject")) result.push("request-changes", "reject");
    }
    if (status === "approved" && access.hasPermission("products.suspend")) result.push("suspend");
    if (status === "suspended" && access.hasPermission("products.suspend")) result.push("restore");
    if (status && status !== "removed" && access.hasPermission("products.remove")) result.push("remove");
    return result;
  }, [access.data, query.data?.product.moderationStatus]);
  const moderate = useMutation({
    mutationFn: async () => {
      if (!query.data || !action) throw new Error("Select an available moderation action.");
      if (action !== "approve" && reason.trim().length < 3) throw new Error("Enter a reason of at least three characters.");
      return (await apiRequest("POST", `${detailUrl}/${action}`, { expectedUpdatedAt: query.data.product.updatedAt, ...(reason.trim() ? { reason: reason.trim() } : {}) })).json();
    },
    onSuccess: async () => { setAction(""); setReason(""); await queryClient.invalidateQueries({ predicate: (item) => String(item.queryKey[0]).startsWith("/api/admin/products") || String(item.queryKey[0]).startsWith("/api/products") }); toast({ title: "Product moderation updated" }); },
    onError: (error: Error) => toast({ title: "Moderation failed", description: error.message, variant: "destructive" }),
  });
  const promotion = useMutation({
    mutationFn: async ({ name, enabled }: { name: "feature" | "fresh-pick"; enabled: boolean }) => {
      if (!query.data) throw new Error("Product detail is unavailable.");
      return (await apiRequest("POST", `${detailUrl}/${name}`, { enabled, expectedUpdatedAt: query.data.product.updatedAt })).json();
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ predicate: (item) => String(item.queryKey[0]).startsWith("/api/admin/products") || String(item.queryKey[0]).startsWith("/api/products") }); toast({ title: "Marketplace placement updated" }); },
    onError: (error: Error) => toast({ title: "Placement update failed", description: error.message, variant: "destructive" }),
  });

  return <AdminLayout><div className="mx-auto max-w-6xl space-y-5">
    <Button asChild variant="ghost" size="sm"><Link href="/admin/products"><ArrowLeft className="mr-2 h-4 w-4" />Back to product moderation</Link></Button>
    {query.isLoading ? <Card><CardContent className="p-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></CardContent></Card> : query.isError || !query.data ? <Card><CardContent className="space-y-3 p-14 text-center"><PackageSearch className="mx-auto h-9 w-9 text-muted-foreground" /><p className="font-bold">Product detail could not be loaded.</p><Button variant="outline" onClick={() => query.refetch()}>Retry</Button></CardContent></Card> : <>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-primary">Product moderation</p><h1 className="text-3xl font-black">{query.data.product.name}</h1><p className="text-muted-foreground">{query.data.product.id} · version {query.data.product.moderationVersion}</p></div><div className="flex flex-wrap gap-2"><Badge variant={query.data.product.moderationStatus === "approved" ? "default" : query.data.product.moderationStatus === "suspended" || query.data.product.moderationStatus === "rejected" ? "destructive" : "secondary"}>{query.data.product.moderationStatus.replaceAll("_", " ")}</Badge>{query.data.product.isFeatured && <Badge variant="outline">Featured</Badge>}{query.data.product.isFreshPick && <Badge variant="outline">Fresh Pick</Badge>}</div></div>
      {!query.data.product.seller.isEligible && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Seller is not eligible for public sale</AlertTitle><AlertDescription>Approval is blocked until the seller account, verification, and selling-region requirements are current.</AlertDescription></Alert>}
      {query.data.product.moderationReason && <Alert><AlertTriangle className="h-4 w-4" /><AlertTitle>Latest moderation reason</AlertTitle><AlertDescription>{query.data.product.moderationReason}</AlertDescription></Alert>}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card><CardHeader><CardTitle>Listing preview and gallery</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2">{query.data.product.images.map((image, index) => <img key={`${image}-${index}`} src={image} alt={`${query.data!.product.name} ${index + 1}`} className="aspect-[4/3] w-full rounded-xl border object-cover" />)}</div><p className="whitespace-pre-wrap text-sm">{query.data.product.description}</p><div className="grid gap-3 sm:grid-cols-3"><Info label="Category" value={`${query.data.product.categoryId} / ${query.data.product.subcategoryId}`} /><Info label="Price" value={`${query.data.product.currency} ${query.data.product.price.toFixed(2)} / ${query.data.product.unit}`} /><Info label="Stock" value={`${query.data.product.stock} ${query.data.product.unit}`} /><Info label="Region" value={query.data.product.regionName || "No approved region"} /><Info label="Submitted" value={query.data.product.submittedAt ? new Date(query.data.product.submittedAt).toLocaleString() : "Not submitted"} /><Info label="Reviewed" value={query.data.product.reviewedAt ? new Date(query.data.product.reviewedAt).toLocaleString() : "Not reviewed"} /></div><Button asChild size="sm" variant="outline"><a href={`/products/${encodeURIComponent(query.data.product.id)}`} target="_blank" rel="noreferrer">Open listing route <ExternalLink className="ml-2 h-3.5 w-3.5" /></a></Button></CardContent></Card>
        <Card><CardHeader><CardTitle>Seller context</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">{query.data.product.seller.avatar ? <img src={query.data.product.seller.avatar} alt="" className="h-11 w-11 rounded-full object-cover" /> : <UserRound className="h-5 w-5" />}</div><div><p className="font-black">{query.data.product.seller.name}</p><p className="text-xs text-muted-foreground">{query.data.product.seller.id}</p></div></div><Info label="Account" value={query.data.product.seller.accountStatus} /><Info label="Verification" value={query.data.product.seller.verificationStatus.replaceAll("_", " ")} /><Info label="Location" value={query.data.product.seller.location || "Not recorded"} /><Badge variant={query.data.product.seller.isEligible ? "default" : "destructive"}>{query.data.product.seller.isEligible ? "Eligible seller" : "Not eligible"}</Badge><Button asChild size="sm" variant="outline"><Link href={`/admin/users/${encodeURIComponent(query.data.product.seller.id)}`}>Open user record</Link></Button></CardContent></Card>
      </div>
      {query.data.product.moderationStatus === "approved" && access.hasPermission("products.feature") && <Card><CardHeader><CardTitle>Public marketplace placement</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2"><Button variant="outline" disabled={promotion.isPending} onClick={() => promotion.mutate({ name: "feature", enabled: !query.data!.product.isFeatured })}><Sparkles className="mr-2 h-4 w-4" />{query.data.product.isFeatured ? "Remove Featured" : "Add Featured"}</Button><Button variant="outline" disabled={promotion.isPending} onClick={() => promotion.mutate({ name: "fresh-pick", enabled: !query.data!.product.isFreshPick })}><CheckCircle2 className="mr-2 h-4 w-4" />{query.data.product.isFreshPick ? "Clear Fresh Pick" : "Mark Fresh Pick"}</Button><p className="w-full text-xs text-muted-foreground">Placement flags never make a non-approved product public.</p></CardContent></Card>}
      {actions.length > 0 && <Card><CardHeader><CardTitle>Moderation action</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-[220px_1fr_auto]"><div><Label>Action</Label><Select value={action} onValueChange={(value: ModerationAction) => setAction(value)}><SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger><SelectContent>{actions.map((value) => <SelectItem key={value} value={value}>{value.replaceAll("-", " ")}</SelectItem>)}</SelectContent></Select></div><div><Label>{action === "approve" ? "Optional review note" : "Required reason"}</Label><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Recorded in moderation history and shown to the seller where applicable" /></div><Button className="self-end" variant={action === "reject" || action === "suspend" || action === "remove" ? "destructive" : "default"} disabled={!action || (action !== "approve" && reason.trim().length < 3) || moderate.isPending} onClick={() => moderate.mutate()}>{moderate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Apply action</Button></CardContent></Card>}
      <Card><CardHeader><CardTitle>Moderation history</CardTitle></CardHeader><CardContent className="space-y-2">{query.data.moderationHistory.length ? query.data.moderationHistory.map((event) => <div key={event.id} className="rounded-xl border p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black">{event.eventType.replaceAll("_", " ")}</p><p className="text-xs text-muted-foreground">{event.actorName} · {new Date(event.createdAt).toLocaleString()}</p></div><p className="text-xs text-muted-foreground">{event.fromStatus || "none"} → {event.toStatus || "unchanged"}</p>{event.reason && <p className="mt-2">{event.reason}</p>}</div>) : <p className="text-sm text-muted-foreground">No moderation events have been recorded yet.</p>}</CardContent></Card>
    </>}
  </div></AdminLayout>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase text-muted-foreground">{label}</p><p className="font-semibold">{value}</p></div>;
}
