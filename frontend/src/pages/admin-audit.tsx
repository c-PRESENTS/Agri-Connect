import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Filter, Loader2, RefreshCw, Search, ShieldCheck, XCircle } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import type { AdminAuditEventDetail, AdminAuditPage } from "@shared/models/admin-portal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminLayout } from "@/components/admin-layout";

type FilterForm = {
  actor: string;
  action: string;
  outcome: string;
  target: string;
  organisation: string;
  dateFrom: string;
  dateTo: string;
};

function dateInput(value: string | null, fallback: Date): string {
  if (!value) return fallback.toISOString().slice(0, 10);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback.toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
}

function formFromSearch(search: string): FilterForm {
  const params = new URLSearchParams(search);
  const today = new Date();
  const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
  return {
    actor: params.get("actor") ?? "",
    action: params.get("action") ?? "all",
    outcome: params.get("outcome") ?? "all",
    target: params.get("target") ?? "",
    organisation: params.get("organisation") ?? "all",
    dateFrom: dateInput(params.get("dateFrom"), ninetyDaysAgo),
    dateTo: dateInput(params.get("dateTo"), today),
  };
}

function displayDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  if (outcome === "success") return <Badge className="bg-emerald-600">Success</Badge>;
  if (outcome === "denied") return <Badge variant="secondary" className="text-amber-700">Denied</Badge>;
  return <Badge variant="destructive">Failed</Badge>;
}

function AdminAuditContent() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState<FilterForm>(() => formFromSearch(search));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => setFilters(formFromSearch(search)), [search]);

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams(search);
    if (!params.has("page")) params.set("page", "1");
    if (!params.has("pageSize")) params.set("pageSize", "20");
    return `/api/admin/audit-events?${params.toString()}`;
  }, [search]);
  const audit = useQuery<AdminAuditPage>({ queryKey: [queryUrl], staleTime: 15_000 });
  const detailUrl = selectedId ? `/api/admin/audit-events/${selectedId}` : "";
  const detail = useQuery<{ event: AdminAuditEventDetail; generatedAt: string }>({
    queryKey: [detailUrl],
    enabled: Boolean(selectedId),
  });

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("pageSize", "20");
    if (filters.actor.trim()) params.set("actor", filters.actor.trim());
    if (filters.action !== "all") params.set("action", filters.action);
    if (filters.outcome !== "all") params.set("outcome", filters.outcome);
    if (filters.target.trim()) params.set("target", filters.target.trim());
    if (filters.organisation !== "all") params.set("organisation", filters.organisation);
    params.set("dateFrom", `${filters.dateFrom}T00:00:00.000Z`);
    params.set("dateTo", `${filters.dateTo}T23:59:59.999Z`);
    setLocation(`/admin/audit?${params.toString()}`);
  };

  const setPage = (page: number) => {
    const params = new URLSearchParams(search);
    params.set("page", String(page));
    setLocation(`/admin/audit?${params.toString()}`);
  };

  const clearFilters = () => setLocation("/admin/audit");
  const metadata = audit.data?.filters;

  return (
    <div className="mx-auto max-w-7xl space-y-6" data-testid="admin-audit-page">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Security and accountability</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Audit logs</h1>
          <p className="mt-2 text-sm text-muted-foreground">Search durable administrative access and action records. Sensitive payloads and network identifiers are never returned.</p>
          {audit.data && <p className="mt-2 text-xs text-muted-foreground">Generated {displayDate(audit.data.generatedAt)}</p>}
        </div>
        <Button variant="outline" disabled={audit.isFetching} onClick={() => void audit.refetch()}>
          <RefreshCw className={`mr-2 h-4 w-4 ${audit.isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Filter className="h-4 w-4" /> Filters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5"><Label htmlFor="audit-actor">Actor</Label><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="audit-actor" className="pl-9" value={filters.actor} onChange={(event) => setFilters({ ...filters, actor: event.target.value })} placeholder="Name, email, or ID" /></div></div>
          <div className="space-y-1.5"><Label>Action</Label><Select value={filters.action} onValueChange={(action) => setFilters({ ...filters, action })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All actions</SelectItem>{metadata?.actions.map((action) => <SelectItem value={action} key={action}>{action}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Outcome</Label><Select value={filters.outcome} onValueChange={(outcome) => setFilters({ ...filters, outcome })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All outcomes</SelectItem><SelectItem value="success">Success</SelectItem><SelectItem value="denied">Denied</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="audit-target">Target</Label><Input id="audit-target" value={filters.target} onChange={(event) => setFilters({ ...filters, target: event.target.value })} placeholder="Type or identifier" /></div>
          <div className="space-y-1.5"><Label>Organisation</Label><Select value={filters.organisation} onValueChange={(organisation) => setFilters({ ...filters, organisation })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All organisations</SelectItem>{metadata?.organisations.filter((organisation) => organisation.id).map((organisation) => <SelectItem value={organisation.id!} key={organisation.id}>{organisation.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="audit-from">From</Label><div className="relative"><CalendarDays className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="audit-from" type="date" className="pl-9" value={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} /></div></div>
          <div className="space-y-1.5"><Label htmlFor="audit-to">To</Label><div className="relative"><CalendarDays className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="audit-to" type="date" className="pl-9" value={filters.dateTo} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} /></div></div>
          <div className="flex items-end gap-2"><Button className="flex-1" onClick={applyFilters}>Apply filters</Button><Button variant="outline" onClick={clearFilters}>Clear</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {audit.isLoading ? <div className="space-y-3 p-6" data-testid="admin-audit-skeleton">{Array.from({ length: 6 }, (_, index) => <Skeleton className="h-12 w-full" key={index} />)}</div> : audit.isError ? <div className="p-10 text-center"><XCircle className="mx-auto h-9 w-9 text-destructive" /><h2 className="mt-3 font-black">Audit events could not be loaded</h2><p className="mt-1 text-sm text-muted-foreground">Adjust invalid filters or retry this request.</p><Button className="mt-4" variant="outline" onClick={() => void audit.refetch()}>Retry audit logs</Button></div> : !audit.data?.rows.length ? <div className="p-12 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" /><h2 className="mt-3 font-black">No matching audit events</h2><p className="mt-1 text-sm text-muted-foreground">Try a wider date range or clear one of the filters.</p></div> : <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Outcome</TableHead><TableHead>Target</TableHead><TableHead>Organisation</TableHead></TableRow></TableHeader><TableBody>{audit.data.rows.map((event) => <TableRow key={event.id} className="cursor-pointer" onClick={() => setSelectedId(event.id)} data-testid="admin-audit-row"><TableCell className="whitespace-nowrap text-xs">{displayDate(event.occurredAt)}</TableCell><TableCell><p className="max-w-48 truncate font-semibold">{event.actor.name}</p><p className="max-w-48 truncate text-xs text-muted-foreground">{event.actor.email || event.actor.id || "System"}</p></TableCell><TableCell><p className="max-w-64 truncate font-mono text-xs">{event.action}</p></TableCell><TableCell><OutcomeBadge outcome={event.outcome} /></TableCell><TableCell><p className="font-semibold">{event.targetType}</p><p className="max-w-44 truncate text-xs text-muted-foreground">{event.targetId || "—"}</p></TableCell><TableCell className="max-w-44 truncate">{event.organisation.name}</TableCell></TableRow>)}</TableBody></Table>}
        </CardContent>
      </Card>

      {audit.data && <div className="flex flex-col items-center justify-between gap-3 sm:flex-row"><p className="text-sm text-muted-foreground">{audit.data.pagination.total.toLocaleString()} events · page {audit.data.pagination.page} of {audit.data.pagination.totalPages}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={audit.data.pagination.page <= 1} onClick={() => setPage(audit.data!.pagination.page - 1)}><ChevronLeft className="mr-1 h-4 w-4" /> Previous</Button><Button size="sm" variant="outline" disabled={audit.data.pagination.page >= audit.data.pagination.totalPages} onClick={() => setPage(audit.data!.pagination.page + 1)}>Next <ChevronRight className="ml-1 h-4 w-4" /></Button></div></div>}

      <Dialog open={Boolean(selectedId)} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Audit event detail</DialogTitle><DialogDescription>Safe identifiers and request summary only. Sensitive changes, IP data, devices, documents, and secrets are excluded.</DialogDescription></DialogHeader>
          {detail.isLoading ? <div className="p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div> : detail.isError || !detail.data ? <div className="p-6 text-center"><XCircle className="mx-auto h-8 w-8 text-destructive" /><p className="mt-2 font-semibold">This audit event could not be loaded.</p><Button className="mt-3" size="sm" variant="outline" onClick={() => void detail.refetch()}>Retry detail</Button></div> : <div className="grid gap-3 sm:grid-cols-2">{[
            ["Action", detail.data.event.action],
            ["Outcome", detail.data.event.outcome],
            ["Actor", `${detail.data.event.actor.name}${detail.data.event.actor.email ? ` · ${detail.data.event.actor.email}` : ""}`],
            ["Organisation", detail.data.event.organisation.name],
            ["Target", `${detail.data.event.targetType}${detail.data.event.targetId ? ` · ${detail.data.event.targetId}` : ""}`],
            ["Permission", detail.data.event.permissionCode || "Not recorded"],
            ["Occurred", displayDate(detail.data.event.occurredAt)],
            ["Request", [detail.data.event.request.method, detail.data.event.request.statusCode].filter(Boolean).join(" · ") || "Not recorded"],
            ["Request ID", detail.data.event.requestId || "Not recorded"],
            ["Changed fields", detail.data.event.changedFields.join(", ") || "None recorded"],
          ].map(([label, value]) => <div className="rounded-xl border p-3" key={label}><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-semibold">{value}</p></div>)}</div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminAuditPage() {
  return <AdminLayout><AdminAuditContent /></AdminLayout>;
}
