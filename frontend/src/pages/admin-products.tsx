import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { PackageSearch, RefreshCw, Search, Sparkles } from "lucide-react";
import type { AdminProductListItem, AdminProductsResponse } from "@shared/schema";
import { AdminLayout } from "@/components/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const emptyFilters = { search: "", status: "all", categoryId: "", regionId: "", featured: "all", freshPick: "all", sort: "updatedAt", direction: "desc" };

function initialFilters() {
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(Object.entries(emptyFilters).map(([key, fallback]) => [key, params.get(key) || fallback])) as typeof emptyFilters;
}

export default function AdminProductsPage() {
  const [, setLocation] = useLocation();
  const access = useAdminAccess();
  const { toast } = useToast();
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(() => Math.max(1, Number(new URLSearchParams(window.location.search).get("page")) || 1));
  const [selected, setSelected] = useState<Record<string, AdminProductListItem>>({});
  const queryUrl = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20", sort: filters.sort, direction: filters.direction });
    for (const [key, value] of Object.entries(filters)) if (value && value !== "all" && !["sort", "direction"].includes(key)) params.set(key, value);
    return `/api/admin/products?${params.toString()}`;
  }, [filters, page]);
  useEffect(() => { window.history.replaceState(null, "", `/admin/products${queryUrl.slice(queryUrl.indexOf("?"))}`); }, [queryUrl]);
  const query = useQuery<AdminProductsResponse>({ queryKey: [queryUrl], staleTime: 10_000 });
  const update = (key: keyof typeof emptyFilters, value: string) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1); setSelected({}); };
  const bulkPromotion = useMutation({
    mutationFn: async ({ action, enabled }: { action: "feature" | "fresh-pick"; enabled: boolean }) => {
      const products = Object.values(selected).slice(0, 25);
      if (!products.length) throw new Error("Select at least one product.");
      await Promise.all(products.map((product) => apiRequest("POST", `/api/admin/products/${encodeURIComponent(product.id)}/${action}`, { enabled, expectedUpdatedAt: product.updatedAt })));
    },
    onSuccess: async () => { setSelected({}); await queryClient.invalidateQueries({ predicate: (item) => String(item.queryKey[0]).startsWith("/api/admin/products") }); toast({ title: "Product placements updated" }); },
    onError: (error: Error) => toast({ title: "Bulk update stopped", description: error.message, variant: "destructive" }),
  });
  const toggle = (product: AdminProductListItem) => setSelected((current) => {
    if (current[product.id]) { const next = { ...current }; delete next[product.id]; return next; }
    if (Object.keys(current).length >= 25) { toast({ title: "Bulk actions are limited to 25 products", variant: "destructive" }); return current; }
    if (product.moderationStatus !== "approved") { toast({ title: "Only approved products can be selected for bulk placement" }); return current; }
    return { ...current, [product.id]: product };
  });

  return <AdminLayout><div className="mx-auto max-w-7xl space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-primary">Catalogue</p><h1 className="text-3xl font-black">Product moderation</h1><p className="text-muted-foreground">Review seller listings and control public marketplace placement.</p></div><Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />Refresh</Button></div>
    <Card><CardContent className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-7">
      <div className="relative md:col-span-2"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={filters.search} onChange={(event) => update("search", event.target.value)} placeholder="Product, seller or email" /></div>
      <Select value={filters.status} onValueChange={(value) => update("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All moderation states</SelectItem>{["draft","pending_review","approved","rejected","changes_requested","suspended","removed"].map((value) => <SelectItem key={value} value={value}>{value.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select>
      <Input value={filters.categoryId} onChange={(event) => update("categoryId", event.target.value)} placeholder="Category ID" />
      <Input value={filters.regionId} onChange={(event) => update("regionId", event.target.value)} placeholder="Region UUID" />
      <Select value={filters.featured} onValueChange={(value) => update("featured", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Featured: any</SelectItem><SelectItem value="true">Featured only</SelectItem><SelectItem value="false">Not featured</SelectItem></SelectContent></Select>
      <Select value={filters.freshPick} onValueChange={(value) => update("freshPick", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Fresh Pick: any</SelectItem><SelectItem value="true">Fresh Picks only</SelectItem><SelectItem value="false">Not Fresh Pick</SelectItem></SelectContent></Select>
      <Select value={`${filters.sort}:${filters.direction}`} onValueChange={(value) => { const [sort, direction] = value.split(":"); setFilters((current) => ({ ...current, sort, direction })); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="updatedAt:desc">Recently updated</SelectItem><SelectItem value="createdAt:desc">Newest created</SelectItem><SelectItem value="name:asc">Name A–Z</SelectItem><SelectItem value="price:desc">Highest price</SelectItem><SelectItem value="stock:asc">Lowest stock</SelectItem><SelectItem value="status:asc">Status A–Z</SelectItem></SelectContent></Select>
      <Button variant="ghost" onClick={() => { setFilters(emptyFilters); setPage(1); setSelected({}); }}>Clear filters</Button>
    </CardContent></Card>
    {access.hasPermission("products.feature") && Object.keys(selected).length > 0 && <Card><CardContent className="flex flex-wrap items-center gap-2 p-3"><span className="mr-auto text-sm font-bold">{Object.keys(selected).length}/25 approved products selected</span>{[["feature",true,"Feature"],["feature",false,"Unfeature"],["fresh-pick",true,"Mark Fresh Pick"],["fresh-pick",false,"Clear Fresh Pick"]].map(([action, enabled, label]) => <Button key={String(label)} size="sm" variant="outline" disabled={bulkPromotion.isPending} onClick={() => bulkPromotion.mutate({ action: action as "feature" | "fresh-pick", enabled: Boolean(enabled) })}><Sparkles className="mr-1 h-3.5 w-3.5" />{String(label)}</Button>)}</CardContent></Card>}
    {query.isLoading ? <div className="space-y-2">{Array.from({ length: 7 }).map((_, index) => <Skeleton className="h-16" key={index} />)}</div> : query.isError ? <Card><CardContent className="space-y-3 p-10 text-center"><p className="font-bold">The product moderation queue could not be loaded.</p><Button variant="outline" onClick={() => query.refetch()}>Retry</Button></CardContent></Card> : !query.data?.products.length ? <Card><CardContent className="py-14 text-center"><PackageSearch className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-black">No products match these filters</p></CardContent></Card> : <Card className="overflow-hidden"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="w-10">Select</TableHead><TableHead>Product</TableHead><TableHead>Seller</TableHead><TableHead>Category</TableHead><TableHead>Price / stock</TableHead><TableHead>Status</TableHead><TableHead>Placement</TableHead><TableHead>Region / dates</TableHead></TableRow></TableHeader><TableBody>{query.data.products.map((product) => <TableRow key={product.id} className="cursor-pointer" onClick={() => setLocation(`/admin/products/${encodeURIComponent(product.id)}`)}><TableCell onClick={(event) => event.stopPropagation()}><input aria-label={`Select ${product.name}`} type="checkbox" checked={Boolean(selected[product.id])} disabled={!access.hasPermission("products.feature") || product.moderationStatus !== "approved"} onChange={() => toggle(product)} /></TableCell><TableCell><div className="flex items-center gap-3">{product.image ? <img src={product.image} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <div className="h-11 w-11 rounded-lg bg-muted" />}<div><Link href={`/admin/products/${encodeURIComponent(product.id)}`} className="font-bold hover:underline">{product.name}</Link><p className="text-xs text-muted-foreground">{product.id}</p></div></div></TableCell><TableCell><p className="font-semibold">{product.seller.name}</p><p className="text-xs text-muted-foreground">{product.seller.verificationStatus.replaceAll("_", " ")}</p></TableCell><TableCell>{product.categoryId}<p className="text-xs text-muted-foreground">{product.subcategoryId}</p></TableCell><TableCell>{product.currency} {product.price.toFixed(2)} / {product.unit}<p className="text-xs text-muted-foreground">{product.stock} in stock</p></TableCell><TableCell><Badge variant={product.moderationStatus === "approved" ? "default" : product.moderationStatus === "suspended" || product.moderationStatus === "rejected" ? "destructive" : "secondary"}>{product.moderationStatus.replaceAll("_", " ")}</Badge></TableCell><TableCell><div className="flex flex-wrap gap-1">{product.isFeatured && <Badge variant="outline">Featured</Badge>}{product.isFreshPick && <Badge variant="outline">Fresh Pick</Badge>}{!product.isFeatured && !product.isFreshPick && "—"}</div></TableCell><TableCell>{product.regionName || "No region"}<p className="text-xs text-muted-foreground">Updated {new Date(product.updatedAt).toLocaleDateString()}</p></TableCell></TableRow>)}</TableBody></Table></div></Card>}
    {query.data && <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span>Page {query.data.pagination.page} of {Math.max(1, query.data.pagination.pageCount)} · {query.data.pagination.total} products</span><div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="outline" disabled={page >= query.data.pagination.pageCount} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>}
  </div></AdminLayout>;
}
