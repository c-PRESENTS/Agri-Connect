import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileCheck2, Loader2, Search, ShieldCheck } from "lucide-react";
import type { AdminVerificationQueueResponse } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function OperatorSellerVerifications({ compact = true }: { compact?: boolean }) {
  const [status, setStatus] = useState(() => new URLSearchParams(window.location.search).get("status") || "pending_review,needs_information");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const listUrl = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: compact ? "8" : "20", status });
    if (search.trim()) params.set("search", search.trim());
    return `/api/admin/verifications?${params.toString()}`;
  }, [compact, page, search, status]);
  const query = useQuery<AdminVerificationQueueResponse>({ queryKey: [listUrl], staleTime: 15_000 });

  return (
    <section className="space-y-4" data-testid="operator-seller-verifications">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Trust and safety</p>
          <h2 className="text-xl font-black">Seller verification queue</h2>
          <p className="text-sm text-muted-foreground">Review marketplace business evidence separately from payment-provider KYC.</p>
        </div>
        <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending_review,needs_information">Open reviews</SelectItem>
            <SelectItem value="pending_review">Pending review</SelectItem>
            <SelectItem value="needs_information">Needs information</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected,suspended">Rejected / suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by seller, legal name or email" />
      </div>
      {query.isLoading ? (
        <Card><CardContent className="p-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></CardContent></Card>
      ) : query.isError ? (
        <Card><CardContent className="space-y-3 p-8 text-center"><p className="font-bold">Verification cases are unavailable.</p><Button variant="outline" onClick={() => query.refetch()}>Retry</Button></CardContent></Card>
      ) : !query.data?.cases.length ? (
        <Card><CardContent className="py-12 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-black">No cases in this queue</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {query.data.cases.map((item) => (
            <Link href={`/admin/verifications/${encodeURIComponent(item.id)}`} key={item.id} className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left hover:border-primary/50">
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700"><FileCheck2 className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-black">{item.legalName}</p>
                <p className="text-xs text-muted-foreground">{item.country} · {item.entityType.replaceAll("_", " ")} · {item.sellerEmail || item.sellerName}</p>
              </div>
              {item.accountStatus !== "active" && <Badge variant="destructive">{item.accountStatus}</Badge>}
              <Badge variant="outline">{item.status.replaceAll("_", " ")}</Badge>
            </Link>
          ))}
        </div>
      )}
      {!compact && query.data && query.data.pagination.pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span>Page {query.data.pagination.page} of {query.data.pagination.pageCount} · {query.data.pagination.total} cases</span>
          <div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="outline" disabled={page >= query.data.pagination.pageCount} onClick={() => setPage((value) => value + 1)}>Next</Button></div>
        </div>
      )}
    </section>
  );
}
