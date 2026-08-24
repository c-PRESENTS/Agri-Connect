import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { RefreshCw, Search, Users } from "lucide-react";
import type { AdminUsersResponse } from "@shared/schema";
import { AdminLayout } from "@/components/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const emptyFilters = {
  search: "", accountType: "all", verification: "all", status: "all", country: "", region: "",
  registeredFrom: "", registeredTo: "", lastLoginFrom: "", lastLoginTo: "", sort: "createdAt", direction: "desc",
};

function initialFilters() {
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(Object.entries(emptyFilters).map(([key, fallback]) => [key, params.get(key) || fallback])) as typeof emptyFilters;
}

export default function AdminUsersPage() {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(() => Math.max(1, Number(new URLSearchParams(window.location.search).get("page")) || 1));
  const queryUrl = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20", sort: filters.sort, direction: filters.direction });
    for (const [key, value] of Object.entries(filters)) if (value && value !== "all" && !["sort", "direction"].includes(key)) params.set(key, value);
    return `/api/admin/users?${params.toString()}`;
  }, [filters, page]);
  useEffect(() => {
    const query = queryUrl.slice(queryUrl.indexOf("?"));
    window.history.replaceState(null, "", `/admin/users${query}`);
  }, [queryUrl]);
  const query = useQuery<AdminUsersResponse>({ queryKey: [queryUrl], staleTime: 20_000 });
  const update = (key: keyof typeof emptyFilters, value: string) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1); };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-wider text-primary">Accounts</p><h1 className="text-3xl font-black">User management</h1><p className="text-muted-foreground">Search and manage existing AgriConnect identities without creating a parallel account store.</p></div>
          <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />Refresh</Button>
        </div>

        <Card><CardContent className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
          <div className="relative md:col-span-2"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={filters.search} onChange={(event) => update("search", event.target.value)} placeholder="Name, email or phone" /></div>
          <Select value={filters.accountType} onValueChange={(value) => update("accountType", value)}><SelectTrigger><SelectValue placeholder="Account type" /></SelectTrigger><SelectContent><SelectItem value="all">All account types</SelectItem><SelectItem value="buyer">Buyer</SelectItem><SelectItem value="farmer">Farmer</SelectItem><SelectItem value="logistics">Logistics</SelectItem><SelectItem value="admin">Legacy admin</SelectItem></SelectContent></Select>
          <Select value={filters.verification} onValueChange={(value) => update("verification", value)}><SelectTrigger><SelectValue placeholder="Verification" /></SelectTrigger><SelectContent><SelectItem value="all">All verification</SelectItem>{["not_verified","not_started","in_progress","pending_review","needs_information","verified","rejected","expired","suspended"].map((value) => <SelectItem key={value} value={value}>{value.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select>
          <Select value={filters.status} onValueChange={(value) => update("status", value)}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="suspended">Suspended</SelectItem><SelectItem value="deactivated">Deactivated</SelectItem></SelectContent></Select>
          <Select value={`${filters.sort}:${filters.direction}`} onValueChange={(value) => { const [sort, direction] = value.split(":"); setFilters((current) => ({ ...current, sort, direction })); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="createdAt:desc">Newest registered</SelectItem><SelectItem value="createdAt:asc">Oldest registered</SelectItem><SelectItem value="lastLoginAt:desc">Recent login</SelectItem><SelectItem value="name:asc">Name A–Z</SelectItem><SelectItem value="email:asc">Email A–Z</SelectItem></SelectContent></Select>
          <Input value={filters.country} onChange={(event) => update("country", event.target.value.toUpperCase().slice(0, 2))} placeholder="Country (ISO-2)" />
          <Input value={filters.region} onChange={(event) => update("region", event.target.value)} placeholder="Region" />
          <DateFilter label="Registered from" value={filters.registeredFrom} onChange={(value) => update("registeredFrom", value)} />
          <DateFilter label="Registered to" value={filters.registeredTo} onChange={(value) => update("registeredTo", value)} />
          <DateFilter label="Last login from" value={filters.lastLoginFrom} onChange={(value) => update("lastLoginFrom", value)} />
          <DateFilter label="Last login to" value={filters.lastLoginTo} onChange={(value) => update("lastLoginTo", value)} />
          <Button variant="ghost" onClick={() => { setFilters(emptyFilters); setPage(1); setLocation("/admin/users"); }}>Clear filters</Button>
        </CardContent></Card>

        {query.isLoading ? <div className="space-y-2">{Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div> : query.isError ? <Card><CardContent className="space-y-3 p-10 text-center"><p className="font-bold">The user directory could not be loaded.</p><Button variant="outline" onClick={() => query.refetch()}>Retry</Button></CardContent></Card> : !query.data?.users.length ? <Card><CardContent className="py-14 text-center"><Users className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-black">No users match these filters</p></CardContent></Card> : <Card className="overflow-hidden"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Type</TableHead><TableHead>Verification</TableHead><TableHead>Status</TableHead><TableHead>Country / region</TableHead><TableHead>Registered</TableHead><TableHead>Last login</TableHead></TableRow></TableHeader><TableBody>{query.data.users.map((user) => <TableRow key={user.id} className="cursor-pointer" onClick={() => setLocation(`/admin/users/${encodeURIComponent(user.id)}`)}><TableCell><Link href={`/admin/users/${encodeURIComponent(user.id)}`} className="font-bold hover:underline">{user.displayName}</Link><p className="text-xs text-muted-foreground">{user.email || user.phone || user.id}</p></TableCell><TableCell className="capitalize">{user.accountType}</TableCell><TableCell><Badge variant="outline">{user.verificationStatus.replaceAll("_", " ")}</Badge></TableCell><TableCell><Badge variant={user.accountStatus === "active" ? "secondary" : "destructive"}>{user.accountStatus}</Badge></TableCell><TableCell>{[user.country, user.region].filter(Boolean).join(" · ") || "—"}</TableCell><TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell><TableCell>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never recorded"}</TableCell></TableRow>)}</TableBody></Table></div></Card>}
        {query.data && <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span>Page {query.data.pagination.page} of {Math.max(1, query.data.pagination.pageCount)} · {query.data.pagination.total} users</span><div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="outline" disabled={page >= query.data.pagination.pageCount} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>}
      </div>
    </AdminLayout>
  );
}

function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div><Label className="sr-only">{label}</Label><Input type="date" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}
