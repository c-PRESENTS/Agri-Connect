import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { AlertTriangle, ArrowLeft, CheckCircle2, ExternalLink, FileText, Loader2, ShieldCheck } from "lucide-react";
import type { AdminVerificationDetailResponse } from "@shared/schema";
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

type ReviewDecision = "verified" | "needs_information" | "rejected" | "suspended";
type DocumentDecision = "unchanged" | "verified" | "rejected";

export default function AdminVerificationDetailPage() {
  const { caseId = "" } = useParams<{ caseId: string }>();
  const detailUrl = `/api/admin/verifications/${encodeURIComponent(caseId)}`;
  const query = useQuery<AdminVerificationDetailResponse>({ queryKey: [detailUrl], staleTime: 5_000 });
  const access = useAdminAccess();
  const { toast } = useToast();
  const [decision, setDecision] = useState<ReviewDecision | "">("");
  const [reason, setReason] = useState("");
  const [documentDecisions, setDocumentDecisions] = useState<Record<string, DocumentDecision>>({});
  const availableDecisions = useMemo(() => {
    const status = query.data?.case.status;
    const values: ReviewDecision[] = [];
    if (status === "pending_review") {
      if (access.hasPermission("verification.approve")) values.push("verified");
      if (access.hasPermission("verification.review")) values.push("needs_information");
      if (access.hasPermission("verification.reject")) values.push("rejected");
    }
    if (status === "verified" && access.hasPermission("verification.review")) values.push("suspended");
    if (status === "suspended" && access.hasPermission("verification.approve")) values.push("verified");
    return values;
  }, [access.data, query.data?.case.status]);
  const review = useMutation({
    mutationFn: async () => {
      if (!query.data || !decision) throw new Error("Select a valid decision");
      const documents = Object.entries(documentDecisions).filter(([, status]) => status !== "unchanged").map(([documentId, status]) => ({ documentId, status, reason: status === "rejected" ? reason : undefined }));
      return (await apiRequest("POST", `${detailUrl}/review`, { decision, reason, expectedUpdatedAt: query.data.case.updatedAt, documentDecisions: documents })).json();
    },
    onSuccess: async () => { setDecision(""); setReason(""); setDocumentDecisions({}); await queryClient.invalidateQueries({ predicate: (item) => String(item.queryKey[0]).startsWith("/api/admin/verifications") || String(item.queryKey[0]).startsWith("/api/admin/users") }); toast({ title: "Verification decision recorded" }); },
    onError: (error: Error) => toast({ title: "Review failed", description: error.message, variant: "destructive" }),
  });

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-5">
        <Button asChild variant="ghost" size="sm"><Link href="/admin/verifications"><ArrowLeft className="mr-2 h-4 w-4" />Back to verification centre</Link></Button>
        {query.isLoading ? <Card><CardContent className="p-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></CardContent></Card> : query.isError || !query.data ? <Card><CardContent className="space-y-3 p-14 text-center"><p className="font-bold">Verification detail could not be loaded.</p><Button variant="outline" onClick={() => query.refetch()}>Retry</Button></CardContent></Card> : <>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-emerald-700">Seller verification</p><h1 className="text-3xl font-black">{query.data.business.legalName}</h1><p className="text-muted-foreground">{query.data.seller.displayName} · {query.data.seller.email || query.data.case.sellerId}</p></div><div className="flex flex-wrap gap-2"><Badge variant="outline">{query.data.case.status.replaceAll("_", " ")}</Badge><Badge variant={query.data.seller.accountStatus === "active" ? "secondary" : "destructive"}>{query.data.seller.accountStatus}</Badge>{query.data.seller.isPubliclyVerified && <Badge className="gap-1"><ShieldCheck className="h-3 w-3" />Publicly verified</Badge>}</div></div>
          {query.data.seller.accountStatus !== "active" && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Account is not active</AlertTitle><AlertDescription>A verification approval cannot restore account access. Reactivate the user separately in User Management.</AlertDescription></Alert>}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader><CardTitle>Business data</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><Info label="Legal / trading name" value={[query.data.business.legalName, query.data.business.tradingName].filter(Boolean).join(" · ")} /><Info label="Country / entity" value={`${query.data.business.country} · ${query.data.business.entityType.replaceAll("_", " ")}`} /><Info label="Registration" value={query.data.business.registrationNumberMasked || "Not supplied"} /><Info label="Contact" value={`${query.data.business.contactEmail} · ${query.data.business.contactPhone}`} /><Info label="Activities" value={query.data.business.primaryActivities.join(", ") || "None recorded"} /><Info label="Provider / requirements" value={`${query.data.case.provider} · ${query.data.case.requirementsVersion}`} />{query.data.business.website && <Button asChild size="sm" variant="outline"><a href={query.data.business.website} target="_blank" rel="noreferrer">Business website <ExternalLink className="ml-2 h-3.5 w-3.5" /></a></Button>}<Button asChild size="sm" variant="outline"><Link href={query.data.seller.publicProfileUrl}>Public profile <ExternalLink className="ml-2 h-3.5 w-3.5" /></Link></Button></CardContent></Card>
            <Card><CardHeader><CardTitle>Public and regional effect</CardTitle></CardHeader><CardContent className="space-y-3"><Info label="Public badge" value={query.data.seller.isPubliclyVerified ? "Visible as verified" : "Not verified publicly"} /><Info label="Regional Marketplace" value={query.data.seller.isRegionallyEligible ? "Eligible with active regional assignment" : "Not eligible"} /><Info label="Submitted" value={query.data.case.submittedAt ? new Date(query.data.case.submittedAt).toLocaleString() : "Not submitted"} /><Info label="Last reviewed" value={query.data.case.reviewedAt ? new Date(query.data.case.reviewedAt).toLocaleString() : "Not reviewed"} />{query.data.case.reviewReason && <Info label="Latest reason" value={query.data.case.reviewReason} />}</CardContent></Card>
          </div>

          <Card><CardHeader><CardTitle>Masked tax identifiers</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{query.data.identifiers.length ? query.data.identifiers.map((identifier) => <Badge variant="outline" key={identifier.id}>{identifier.type.toUpperCase()} · {identifier.maskedValue} · {identifier.status}</Badge>) : <p className="text-sm text-muted-foreground">No tax identifiers supplied.</p>}</CardContent></Card>
          <Card><CardHeader><CardTitle>Representatives and owners</CardTitle></CardHeader><CardContent className="grid gap-2 md:grid-cols-2">{query.data.people.map((person) => <div className="rounded-lg border p-3 text-sm" key={person.id}><p className="font-bold">{person.fullName}</p><p className="text-muted-foreground">{person.role.replaceAll("_", " ")} · {person.country}{person.ownershipPercent != null ? ` · ${person.ownershipPercent}%` : ""}</p></div>)}</CardContent></Card>

          <Card><CardHeader><CardTitle>Document evidence</CardTitle></CardHeader><CardContent className="space-y-3">{query.data.documents.map((document) => <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-[1fr_190px]" key={document.id}><div className="flex items-start gap-3"><FileText className="mt-1 h-5 w-5 text-primary" /><div><p className="font-bold">{document.originalFileName}</p><p className="text-xs text-muted-foreground">{document.requirementCode.replaceAll("_", " ")} · {document.documentType.replaceAll("_", " ")} · {document.contentType} · {document.sizeBytes == null ? "Unknown size" : `${Math.ceil(document.sizeBytes / 1024)} KB`}</p><div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline">{document.status}</Badge>{document.viewUrl && <Button asChild size="sm" variant="outline"><a href={document.viewUrl} target="_blank" rel="noreferrer">View securely <ExternalLink className="ml-2 h-3.5 w-3.5" /></a></Button>}</div>{document.rejectionReason && <p className="mt-2 text-xs text-destructive">{document.rejectionReason}</p>}</div></div><div><Label>Document decision</Label><Select value={documentDecisions[document.id] || "unchanged"} onValueChange={(value: DocumentDecision) => setDocumentDecisions((current) => ({ ...current, [document.id]: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unchanged">Keep {document.status}</SelectItem><SelectItem value="verified">Verify document</SelectItem><SelectItem value="rejected">Reject document</SelectItem></SelectContent></Select></div></div>)}</CardContent></Card>

          <Card><CardHeader><CardTitle>Mandatory checklist</CardTitle></CardHeader><CardContent className="grid gap-2 md:grid-cols-2">{query.data.requirements.filter((item) => item.required).map((item) => <div className="flex items-start gap-2 rounded-lg border p-3 text-sm" key={item.code}>{item.complete ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />}<div><p className="font-bold">{item.label}</p><p className="text-xs text-muted-foreground">{item.description}</p></div></div>)}</CardContent></Card>

          {availableDecisions.length > 0 && <Card><CardHeader><CardTitle>Record review decision</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-[220px_1fr_auto]"><div><Label>Decision</Label><Select value={decision} onValueChange={(value: ReviewDecision) => setDecision(value)}><SelectTrigger><SelectValue placeholder="Select decision" /></SelectTrigger><SelectContent>{availableDecisions.map((value) => <SelectItem key={value} value={value}>{value.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div><div><Label>Required reason</Label><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Shown to the seller where applicable and recorded in the audit trail" /></div><Button className="self-end" variant={decision === "rejected" || decision === "suspended" ? "destructive" : "default"} disabled={!decision || reason.trim().length < 3 || review.isPending || query.data.seller.accountStatus !== "active" && decision === "verified"} onClick={() => review.mutate()}>{review.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit review</Button></CardContent></Card>}

          <Card><CardHeader><CardTitle>Verification event history</CardTitle></CardHeader><CardContent className="space-y-2">{query.data.events.map((event) => <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><p className="font-bold">{event.eventType.replaceAll("_", " ")}</p><p className="text-xs text-muted-foreground">{event.actorName} · {new Date(event.createdAt).toLocaleString()}</p></div>)}</CardContent></Card>
        </>}
      </div>
    </AdminLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase text-muted-foreground">{label}</p><p className="font-semibold">{value}</p></div>;
}
