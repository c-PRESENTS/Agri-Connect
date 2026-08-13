import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ExternalLink, FileCheck2, Loader2, Search, ShieldCheck, XCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type QueueItem = { id: string; sellerId: string; status: string; country: string; entityType: string; submittedAt?: string | null; legalName: string; contactEmail: string; sellerEmail?: string | null };
type CaseDetail = { profile: any; case: any; identifiers: Array<{ id: string; type: string; maskedValue: string; status: string }>; people: Array<{ id: string; fullName: string; role: string; ownershipPercent?: number | null }>; documents: Array<{ id: string; originalFileName: string; requirementCode: string; documentType: string; status: string }>; requirements: Array<{ code: string; label: string; required: boolean; complete: boolean }> };

export function OperatorSellerVerifications() {
  const { toast } = useToast();
  const [filter, setFilter] = useState("pending_review,needs_information");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [decision, setDecision] = useState("verified");
  const [reason, setReason] = useState("");
  const listUrl = `/api/operator/seller-verifications?status=${encodeURIComponent(filter)}`;
  const { data, isLoading } = useQuery<{ cases: QueueItem[] }>({ queryKey: [listUrl] });
  const detailUrl = selected ? `/api/operator/seller-verifications/${selected.sellerId}` : "";
  const { data: detail, isLoading: detailLoading } = useQuery<CaseDetail>({ queryKey: [detailUrl], enabled: Boolean(selected) });
  const review = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select a verification case");
      const documentDecisions = (detail?.documents ?? []).map((document) => ({ documentId: document.id, status: decision === "verified" ? "verified" : "rejected", reason }));
      return (await apiRequest("POST", `/api/operator/seller-verifications/${selected.id}/review`, { decision, reason, documentDecisions })).json();
    },
    onSuccess: async () => { setSelected(null); setReason(""); await queryClient.invalidateQueries({ queryKey: [listUrl] }); toast({ title: "Seller verification decision recorded" }); },
    onError: (error: Error) => toast({ title: "Review failed", description: error.message, variant: "destructive" }),
  });
  const cases = (data?.cases ?? []).filter((item) => `${item.legalName} ${item.contactEmail}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="mt-6 space-y-4" data-testid="operator-seller-verifications">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-emerald-700">Trust and safety</p><h2 className="text-xl font-black">Seller verification queue</h2><p className="text-sm text-muted-foreground">Review marketplace business checks separately from payment-provider KYC.</p></div><Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending_review,needs_information">Open reviews</SelectItem><SelectItem value="pending_review">Pending review</SelectItem><SelectItem value="needs_information">Needs information</SelectItem><SelectItem value="verified">Verified</SelectItem><SelectItem value="rejected,suspended">Rejected / suspended</SelectItem></SelectContent></Select></div>
    <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by legal name or email" /></div>
    {isLoading ? <Card><CardContent className="p-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></CardContent></Card> : !cases.length ? <Card><CardContent className="py-12 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-black">No cases in this queue</p></CardContent></Card> : <div className="space-y-2">{cases.map((item) => <button onClick={() => { setSelected(item); setReason(""); }} key={item.id} className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left hover:border-primary/50"><div className="rounded-xl bg-emerald-100 p-2 text-emerald-700"><FileCheck2 className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="truncate font-black">{item.legalName}</p><p className="text-xs text-muted-foreground">{item.country} · {item.entityType.replaceAll("_", " ")} · {item.contactEmail}</p></div><Badge variant="outline">{item.status.replaceAll("_", " ")}</Badge></button>)}</div>}
    <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{selected?.legalName}</DialogTitle><DialogDescription>Review submitted marketplace identity and business evidence. Payment-provider approval remains a separate check.</DialogDescription></DialogHeader>{detailLoading ? <div className="p-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : detail && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Info label="Country / entity" value={`${detail.profile?.country} · ${detail.profile?.entityType?.replaceAll("_", " ")}`} /><Info label="Contact" value={`${detail.profile?.contactEmail} · ${detail.profile?.contactPhone}`} /><Info label="Registration number" value={detail.profile?.registrationNumber || "Not supplied"} /><Info label="Activities" value={(detail.profile?.primaryActivities ?? []).join(", ")} /></div><div><h3 className="mb-2 font-black">Tax identifiers</h3><div className="flex flex-wrap gap-2">{detail.identifiers.map((item) => <Badge variant="outline" key={item.id}>{item.type.toUpperCase()} {item.maskedValue} · {item.status}</Badge>)}</div></div><div><h3 className="mb-2 font-black">Representatives and owners</h3>{detail.people.map((person) => <div className="mb-1 rounded-lg border p-2 text-sm" key={person.id}>{person.fullName} · {person.role.replaceAll("_", " ")}{person.ownershipPercent != null ? ` · ${person.ownershipPercent}%` : ""}</div>)}</div><div><h3 className="mb-2 font-black">Documents</h3><div className="space-y-2">{detail.documents.map((document) => <a target="_blank" rel="noreferrer" href={`/api/operator/seller-verification-documents/${document.id}`} className="flex items-center justify-between rounded-lg border p-3 hover:border-primary" key={document.id}><div><p className="font-bold">{document.originalFileName}</p><p className="text-xs text-muted-foreground">{document.requirementCode.replaceAll("_", " ")} · {document.documentType.replaceAll("_", " ")}</p></div><ExternalLink className="h-4 w-4" /></a>)}</div></div><div className="rounded-xl border bg-muted/30 p-3"><p className="text-sm font-black">Checklist</p>{detail.requirements.filter((item) => item.required).map((item) => <div className="mt-2 flex items-center gap-2 text-sm" key={item.code}>{item.complete ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}{item.label}</div>)}</div><div className="grid gap-3 sm:grid-cols-[220px_1fr]"><div><Label>Decision</Label><Select value={decision} onValueChange={setDecision}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="verified">Approve as verified</SelectItem><SelectItem value="needs_information">Request information</SelectItem><SelectItem value="rejected">Reject application</SelectItem><SelectItem value="suspended">Suspend seller</SelectItem></SelectContent></Select></div><div><Label>Decision reason</Label><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required audit note shown to the seller" /></div></div></div>}<DialogFooter><Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button><Button disabled={!reason.trim() || review.isPending} onClick={() => review.mutate()} className={decision === "verified" ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}>{decision === "verified" ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />}Record decision</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border p-3"><p className="text-xs font-bold uppercase text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>; }
