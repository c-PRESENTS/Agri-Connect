import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Filter, Globe2, Loader2, MapPin, Search, ShieldCheck, SlidersHorizontal, Store } from "lucide-react";
import { TopNavigation } from "@/components/top-navigation";
import { ProductCard } from "@/components/product-card";
import { MarketplaceResultsMap, type MarketplaceMarker } from "@/components/marketplace-results-map";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useCatalogCategories } from "@/hooks/use-catalog-categories";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLiveLocation } from "@/contexts/live-location-context";
import { useToast } from "@/hooks/use-toast";
import type { Category, Product } from "@shared/schema";

type Region = { id: string; parentId: string | null; code: string; name: string; countryCode: string; type: string; latitude: number | null; longitude: number | null; activeSellerCount: number };
type Organisation = { id: string; name: string; slug: string; regionId: string; regionName: string };
type MarketplaceResponse = { products: Product[]; markers: MarketplaceMarker[]; pagination: { page: number; pageSize: number; total: number; pageCount: number }; summary: { localCount: number; globalCount: number } };
type MapConfig = { mapProvider: string; tileUrl: string; tileAttribution: string; geocodingProvider: string; googleMapsApiKey?: string };

function MarketplaceFilters(props: any) {
  const { categoryId, subcategoryId, regionId, quantity, qualityGrade, minPrice, maxPrice, minRating, scope, regions, onChange } = props;
  const categories = props.categories as Category[];
  const selected = categories.find((category) => category.id === categoryId);
  return <div className="space-y-5">
    <div><h2 className="font-black">Product categories</h2><p className="text-xs text-muted-foreground">Browse the complete AgriConnect catalogue.</p></div>
    <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
      <button className={`w-full rounded-lg px-3 py-2 text-left text-sm font-bold ${!categoryId ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} onClick={() => onChange({ categoryId: "", subcategoryId: "" })}>All categories</button>
      {categories.map((category) => <div key={category.id}>
        <button className={`w-full rounded-lg px-3 py-2 text-left text-sm font-bold ${categoryId === category.id ? "bg-amber-100 text-amber-950" : "hover:bg-muted"}`} onClick={() => onChange({ categoryId: category.id, subcategoryId: "" })}>{category.name}</button>
        {categoryId === category.id && <div className="ml-3 border-l pl-2">{category.subcategories.map((subcategory) => <button key={subcategory.id} className={`block w-full rounded-md px-2 py-1.5 text-left text-xs ${subcategoryId === subcategory.id ? "bg-primary/10 font-bold text-primary" : "text-muted-foreground hover:bg-muted"}`} onClick={() => onChange({ subcategoryId: subcategory.id })}>{subcategory.name}</button>)}</div>}
      </div>)}
    </div>
    <div className="space-y-2"><Label>Marketplace region</Label><Select value={regionId || "global"} onValueChange={(value) => onChange({ regionId: value === "global" ? "" : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="global">Global marketplace</SelectItem>{regions.filter((region: Region) => !["country", "state", "province"].includes(region.type)).map((region: Region) => <SelectItem key={region.id} value={region.id}>{region.name}, {region.countryCode}</SelectItem>)}</SelectContent></Select></div>
    <div className="space-y-2"><Label>Visibility</Label><Select value={scope} onValueChange={(value) => onChange({ scope: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="global">Local first + global</SelectItem><SelectItem value="local">Local fulfilment only</SelectItem></SelectContent></Select></div>
    <div className="grid grid-cols-2 gap-2"><div><Label>Quantity</Label><Input type="number" min="1" value={quantity} onChange={(event) => onChange({ quantity: event.target.value })} /></div><div><Label>Quality grade</Label><Select value={qualityGrade || "any"} onValueChange={(value) => onChange({ qualityGrade: value === "any" ? "" : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">Any grade</SelectItem><SelectItem value="A">Grade A</SelectItem><SelectItem value="B">Grade B</SelectItem><SelectItem value="C">Grade C</SelectItem></SelectContent></Select></div></div>
    <div className="space-y-2"><Label>Seller rating</Label><Select value={minRating || "any"} onValueChange={(value) => onChange({ minRating: value === "any" ? "" : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">Any rating</SelectItem><SelectItem value="4">4+ stars</SelectItem><SelectItem value="4.5">4.5+ stars</SelectItem></SelectContent></Select></div>
    <div className="grid grid-cols-2 gap-2"><div><Label>Min price</Label><Input type="number" min="0" value={minPrice} onChange={(event) => onChange({ minPrice: event.target.value })} /></div><div><Label>Max price</Label><Input type="number" min="0" value={maxPrice} onChange={(event) => onChange({ maxPrice: event.target.value })} /></div></div>
    {selected && <p className="rounded-lg bg-muted p-3 text-xs"><strong>{selected.name}</strong><br />Only approved sellers with active regional assignments are shown.</p>}
  </div>;
}

export default function MarketplacePage() {
  const [, navigate] = useLocation();
  const { location } = useLiveLocation();
  const { toast } = useToast();
  const { data: categories = [] } = useCatalogCategories("buyer");
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [filters, setFilters] = useState({ search: params.get("search") || "", categoryId: params.get("category") || "", subcategoryId: params.get("subcategory") || "", regionId: params.get("regionId") || "", quantity: "", qualityGrade: "", minPrice: "", maxPrice: "", minRating: "", scope: "global", sortBy: "distance" });
  const productRefs = useRef(new Map<string, HTMLDivElement>());
  const { data: regions = [] } = useQuery<Region[]>({ queryKey: ["/api/marketplace/regions"] });
  const { data: config } = useQuery<MapConfig>({ queryKey: ["/api/marketplace/config"] });
  const { data: organisations = [] } = useQuery<Organisation[]>({ queryKey: [`/api/marketplace/organisations${filters.regionId ? `?regionId=${filters.regionId}` : ""}`] });
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key === "minRating" ? "rating" : key, value); });
  if (location) { query.set("latitude", String(location.latitude)); query.set("longitude", String(location.longitude)); }
  const resultKey = `/api/marketplace/search?${query.toString()}`;
  const { data, isLoading } = useQuery<MarketplaceResponse>({ queryKey: [resultKey] });
  const addToCart = useMutation({ mutationFn: async (product: Product) => { await apiRequest("POST", "/api/cart", { productId: product.id, quantity: 1 }); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/cart"] }); toast({ title: "Added to cart" }); }, onError: () => toast({ title: "Sign in to add this product", variant: "destructive" }) });
  const update = (patch: Partial<typeof filters>) => setFilters((current) => ({ ...current, ...patch }));
  useEffect(() => {
    const next = new URLSearchParams();
    if (filters.search) next.set("search", filters.search);
    if (filters.categoryId) next.set("category", filters.categoryId);
    if (filters.subcategoryId) next.set("subcategory", filters.subcategoryId);
    if (filters.regionId) next.set("regionId", filters.regionId);
    window.history.replaceState(null, "", `/marketplace${next.size ? `?${next.toString()}` : ""}`);
  }, [filters.categoryId, filters.regionId, filters.search, filters.subcategoryId]);
  const selectedRegion = regions.find((region) => region.id === filters.regionId);
  const center: [number, number] = [selectedRegion?.latitude ?? location?.latitude ?? 52.3555, selectedRegion?.longitude ?? location?.longitude ?? -1.1743];
  const focusSeller = (sellerId: string) => productRefs.current.get(sellerId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  const filterProps = { ...filters, regions, categories, onChange: update };
  return <div className="min-h-screen bg-background"><TopNavigation /><main className="mx-auto max-w-[1600px] px-3 py-5 sm:px-5">
    <header className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-700"><Store className="h-4 w-4" />Regional marketplace</div><h1 className="mt-1 text-3xl font-black">Find approved sellers near you</h1><p className="text-sm text-muted-foreground">Local fulfilment is prioritised while approved products remain globally discoverable.</p></div><div className="flex gap-2"><div className="relative flex-1 lg:w-96"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={filters.search} onChange={(event) => update({ search: event.target.value })} placeholder="Search Rice, Tomato, seeds..." /></div><Sheet><SheetTrigger asChild><Button variant="outline" className="lg:hidden"><Filter className="h-4 w-4" /></Button></SheetTrigger><SheetContent side="left" className="overflow-y-auto"><SheetHeader><SheetTitle>Marketplace filters</SheetTitle></SheetHeader><div className="mt-5"><MarketplaceFilters {...filterProps} /></div></SheetContent></Sheet></div></header>
    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden lg:block"><Card className="sticky top-4 p-4"><MarketplaceFilters {...filterProps} />{organisations.length > 0 && <div className="mt-5 border-t pt-4"><h3 className="flex items-center gap-2 text-sm font-black"><ShieldCheck className="h-4 w-4 text-emerald-600" />Trusted regional partners</h3>{organisations.map((organisation) => <div className="mt-2 rounded-lg border p-2 text-xs" key={organisation.id}><strong>{organisation.name}</strong><div className="text-muted-foreground">{organisation.regionName}</div></div>)}</div>}</Card></aside>
      <section className="min-w-0 space-y-4"><Card className="overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"><div><h2 className="font-black">Marketplace map</h2><p className="text-xs text-muted-foreground">Markers and listings use the same approved inventory results.</p></div><div className="flex gap-2"><Badge variant="outline"><MapPin className="mr-1 h-3 w-3" />{data?.summary.localCount ?? 0} local</Badge><Badge variant="outline"><Globe2 className="mr-1 h-3 w-3" />{data?.summary.globalCount ?? 0} global</Badge></div></div><div className="h-[340px]">{config && <MarketplaceResultsMap markers={data?.markers ?? []} center={center} tileUrl={config.tileUrl} attribution={config.tileAttribution} provider={config.mapProvider} googleMapsApiKey={config.googleMapsApiKey} onSellerSelect={focusSeller} />}</div></Card>
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-black">{data?.pagination.total ?? 0} approved products</h2><p className="text-xs text-muted-foreground">Sorted by local fulfilment, distance and availability.</p></div><Select value={filters.sortBy} onValueChange={(sortBy) => update({ sortBy })}><SelectTrigger className="w-44"><SlidersHorizontal className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="distance">Nearest first</SelectItem><SelectItem value="price_asc">Price: low to high</SelectItem><SelectItem value="price_desc">Price: high to low</SelectItem><SelectItem value="rating">Seller rating</SelectItem></SelectContent></Select></div>
        {isLoading ? <div className="grid min-h-52 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : data?.products.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.products.map((product) => <div key={product.id} ref={(element) => { if (element) productRefs.current.set(product.farmerId, element); }} className={product.localFulfilmentEligible ? "rounded-xl ring-2 ring-emerald-400/60" : ""}><div className="mb-1 flex items-center justify-between px-1"><Badge className={product.localFulfilmentEligible ? "bg-emerald-600" : "bg-slate-600"}>{product.localFulfilmentEligible ? "Local fulfilment" : "Global discovery"}</Badge><span className="text-xs text-muted-foreground">{product.regionName}</span></div><ProductCard product={product} onAddToCart={(item) => addToCart.mutate(item)} onClick={(item) => navigate(`/products/${item.id}`)} /></div>)}</div> : <Card className="grid min-h-52 place-items-center p-8 text-center"><div><Store className="mx-auto h-10 w-10 text-muted-foreground" /><h3 className="mt-3 font-black">No approved products match these filters</h3><p className="text-sm text-muted-foreground">Try another category, quantity or marketplace region.</p></div></Card>}
      </section>
    </div>
  </main></div>;
}
