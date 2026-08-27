import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Apple,
  Baby,
  BadgeCheck,
  Beef,
  Building2,
  Carrot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Coffee,
  Compass,
  Croissant,
  Globe,
  Heart,
  Home,
  Layers,
  Leaf,
  Loader2,
  MapPin,
  Maximize2,
  Milk,
  Package,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
  Users,
  Wheat,
  X,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

type CategoryExplorerProduct = {
  id: string;
  title: string;
  variety: string;
  category: string;
  subCategory: string;
  badge?: string;
  badgeType?: "fresh" | "organic" | "premium";
  imageUrl: string | null;
  sellerName: string;
  sellerVerified: boolean;
  sellerAvatar: string | null;
  location: string | null;
  distanceKm: number | null;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  stockKg: number;
  pricePerKg: number;
  minOrderKg: number;
  currency: string;
  unit: string;
  organisationName: string | null;
  isSaved: boolean;
};

type VerifiedEntity = {
  id: string;
  name: string;
  location: string | null;
  role: string;
  verified: boolean;
  avatar?: string | null;
  productCount?: number;
  totalStock?: number;
};

type LiveSeller = {
  id: string;
  name: string;
  rating: number;
  distanceKm: number | null;
  productCount: number;
  avatar: string | null;
  isOnline: boolean;
};

type RegionalOpportunity = {
  id: string;
  productName: string;
  regionId: string;
  regionName: string;
  description: string;
  eligibleSellersCount: number;
  priority: "High" | "Medium" | "Urgent";
  lockTimeHours: number;
  imageUrl: string | null;
  status: string;
  claimable: boolean;
  isAccepted: boolean;
  claimExpiresAt: string | null;
};

type MarketplaceStatus = {
  regionName: string;
  activeSellers: number;
  activeSellersDeltaPercent: number | null;
  productsListed: number;
  productsListedDeltaPercent: number | null;
  orders30Days: number;
  orders30DaysDeltaPercent: number | null;
  avgDeliveryDays: number | null;
};

type RegionOption = {
  id: string;
  name: string;
  type: string;
  countryCode: string;
  latitude: number | null;
  longitude: number | null;
};

type MapCluster = {
  id: string;
  name: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
  sellerCount: number;
  organisationCount: number;
  largeFarmerCount: number;
};

type CategoryNode = {
  id: string;
  name: string;
  icon: string;
  count: number;
  subcategories: Array<{
    id: string;
    name: string;
    count: number;
    items: Array<{ id: string; name: string; count: number }>;
  }>;
};

type CategoryExplorerResponse = {
  generatedAt: string;
  scope: "local" | "global";
  selectedRegion: RegionOption | null;
  regions: RegionOption[];
  selection: {
    categoryId: string | null;
    subcategoryId: string | null;
    variety: string | null;
    queryLabel: string | null;
  };
  kpiStats: {
    totalProducts: number;
    approvedSellers: number;
    citiesCovered: number;
    districtsCount: number;
    avgDeliveryDays: number | null;
  };
  categoriesNav: CategoryNode[];
  varieties: Array<{ name: string; count: number }>;
  productTotal: number;
  products: CategoryExplorerProduct[];
  verifiedOrganisations: VerifiedEntity[];
  largeFarmers: VerifiedEntity[];
  regionalManagers: VerifiedEntity[];
  liveSellers: LiveSeller[];
  mapClusters: MapCluster[];
  opportunity: RegionalOpportunity | null;
  marketplaceStatus: MarketplaceStatus;
};

const categoryIcons: Record<string, LucideIcon> = {
  Apple,
  Baby,
  Beef,
  Carrot,
  Coffee,
  Croissant,
  Home,
  Leaf,
  Milk,
  Package,
  Sparkles,
  Wheat,
};

function EntityEmpty({ message }: { message: string }) {
  return <p className="py-3 text-center text-[10px] text-slate-400">{message}</p>;
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[10px] font-medium text-slate-400">No baseline</span>;
  const positive = value >= 0;
  return (
    <span className={cn("text-[10px] font-bold", positive ? "text-emerald-600" : "text-rose-600")}>
      {positive ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

function ClusterMap({ clusters, onExpand }: { clusters: MapCluster[]; onExpand?: () => void }) {
  const positioned = useMemo(() => {
    const coordinates = clusters.filter((cluster) => cluster.latitude !== null && cluster.longitude !== null);
    const latitudes = coordinates.map((cluster) => cluster.latitude as number);
    const longitudes = coordinates.map((cluster) => cluster.longitude as number);
    const minLatitude = latitudes.length ? Math.min(...latitudes) : 0;
    const maxLatitude = latitudes.length ? Math.max(...latitudes) : 0;
    const minLongitude = longitudes.length ? Math.min(...longitudes) : 0;
    const maxLongitude = longitudes.length ? Math.max(...longitudes) : 0;
    return clusters.map((cluster, index) => {
      const fallbackColumn = index % 3;
      const fallbackRow = Math.floor(index / 3) % 3;
      const left = cluster.longitude === null || maxLongitude === minLongitude
        ? 18 + fallbackColumn * 32
        : 10 + ((cluster.longitude - minLongitude) / (maxLongitude - minLongitude)) * 80;
      const top = cluster.latitude === null || maxLatitude === minLatitude
        ? 18 + fallbackRow * 30
        : 90 - ((cluster.latitude - minLatitude) / (maxLatitude - minLatitude)) * 80;
      return { ...cluster, left, top };
    });
  }, [clusters]);

  return (
    <div className="relative h-full min-h-56 overflow-hidden bg-[linear-gradient(135deg,#e7f3e9_0%,#dbe9df_45%,#eef4ec_100%)]">
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(#789d8a_1px,transparent_1px),linear-gradient(90deg,#789d8a_1px,transparent_1px)] [background-size:28px_28px]" />
      {positioned.length ? positioned.map((cluster) => (
        <button
          type="button"
          key={cluster.id}
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-emerald-700 px-2 py-1 text-[9px] font-black text-white shadow-md"
          style={{ left: String(cluster.left) + "%", top: String(cluster.top) + "%" }}
          title={cluster.name + ": " + cluster.sellerCount + " active sellers"}
        >
          {cluster.name} · {cluster.sellerCount}
        </button>
      )) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <MapPin className="mb-2 h-7 w-7 text-slate-400" />
          <p className="text-xs font-bold text-slate-600">No regional seller assignments</p>
          <p className="mt-1 text-[10px] text-slate-400">Configure regions and approve seller assignments to populate this map.</p>
        </div>
      )}
      {onExpand && positioned.length > 0 && (
        <button
          type="button"
          onClick={onExpand}
          className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1 text-[10px] font-bold text-slate-800 shadow-md"
        >
          <Maximize2 className="h-3 w-3" />
          Expand map
        </button>
      )}
    </div>
  );
}

export function AgriCategoriesManagement({
  initialSearch = "",
  permissions = [],
}: {
  initialSearch?: string;
  permissions?: string[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [draftSearch, setDraftSearch] = useState(initialSearch);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [marketplaceMode, setMarketplaceMode] = useState<"local" | "global">("local");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [selectedVariety, setSelectedVariety] = useState("");
  const [sortBy, setSortBy] = useState("relevance");
  const [priceFilter, setPriceFilter] = useState("all");
  const [quantityFilter, setQuantityFilter] = useState("any");
  const [qualityFilter, setQualityFilter] = useState("all");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isOpportunityModalOpen, setIsOpportunityModalOpen] = useState(false);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ scope: marketplaceMode, sortBy, quantity: quantityFilter, quality: qualityFilter });
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedSubCategory) params.set("subCategory", selectedSubCategory);
    if (selectedVariety) params.set("variety", selectedVariety);
    if (selectedRegion) params.set("region", selectedRegion);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    if (priceFilter === "under_150") params.set("maxPrice", "1.5");
    if (priceFilter === "150_250") {
      params.set("minPrice", "1.5");
      params.set("maxPrice", "2.5");
    }
    if (priceFilter === "above_250") params.set("minPrice", "2.5");
    return "/api/admin/categories/explorer?" + params.toString();
  }, [
    marketplaceMode,
    priceFilter,
    qualityFilter,
    quantityFilter,
    searchQuery,
    selectedCategory,
    selectedRegion,
    selectedSubCategory,
    selectedVariety,
    sortBy,
  ]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<CategoryExplorerResponse>({
    queryKey: [endpoint],
    queryFn: async () => {
      const response = await apiRequest("GET", endpoint);
      return response.json();
    },
  });

  useEffect(() => {
    if (!selectedRegion && data?.selectedRegion?.id) setSelectedRegion(data.selectedRegion.id);
  }, [data?.selectedRegion?.id, selectedRegion]);

  const addToCart = useMutation({
    mutationFn: async ({ product, quantity }: { product: CategoryExplorerProduct; quantity: number }) => {
      const response = await apiRequest("POST", "/api/cart", { productId: product.id, quantity });
      return { product, cart: await response.json() };
    },
    onSuccess: ({ product }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({ title: "Added to cart", description: product.title + " was added to your persisted cart." });
    },
    onError: (mutationError: Error) => {
      toast({ title: "Could not add this product", description: mutationError.message, variant: "destructive" });
    },
  });

  const saveProduct = useMutation({
    mutationFn: async ({ productId, saved }: { productId: string; saved: boolean }) => {
      const response = await apiRequest("PUT", "/api/admin/categories/saved-products/" + encodeURIComponent(productId), { saved });
      return response.json();
    },
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast({ title: input.saved ? "Product saved" : "Product removed", description: "Your saved products are stored with your account." });
    },
    onError: (mutationError: Error) => {
      toast({ title: "Could not update saved products", description: mutationError.message, variant: "destructive" });
    },
  });

  const opportunityMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", "/api/admin/categories/opportunity/accept", { id });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      setIsOpportunityModalOpen(false);
      toast({ title: "Opportunity claimed", description: "The regional claim is now stored in the marketplace workflow." });
    },
    onError: (mutationError: Error) => {
      toast({ title: "Opportunity could not be claimed", description: mutationError.message, variant: "destructive" });
    },
  });

  const products = data?.products ?? [];
  const verifiedOrganisations = data?.verifiedOrganisations ?? [];
  const largeFarmers = data?.largeFarmers ?? [];
  const regionalManagers = data?.regionalManagers ?? [];
  const liveSellers = data?.liveSellers ?? [];
  const clusters = data?.mapClusters ?? [];
  const opportunity = data?.opportunity ?? null;
  const marketplaceStatus = data?.marketplaceStatus;
  const selectedRegionLabel = data?.selectedRegion?.name ?? "All regions";
  const selectedCategoryName = data?.categoriesNav.find((category) => category.id === selectedCategory)?.name;
  const selectedSubCategoryName = data?.categoriesNav
    .flatMap((category) => category.subcategories)
    .find((category) => category.id === selectedSubCategory)?.name;
  const activeCommodityLabel = searchQuery.trim() || selectedVariety || selectedSubCategoryName || selectedCategoryName || "All products";
  const canClaimOpportunity = permissions.includes("opportunities.manage") && opportunity?.claimable === true;

  const setQuantity = (product: CategoryExplorerProduct, delta: number) => {
    setCartQuantities((current) => {
      const existing = current[product.id] ?? product.minOrderKg;
      return { ...current, [product.id]: Math.max(product.minOrderKg, existing + delta) };
    });
  };

  const selectCategory = (category: CategoryNode) => {
    setSelectedCategory(category.id);
    setSelectedSubCategory("");
    setSelectedVariety("");
    setDraftSearch("");
    setSearchQuery("");
    setExpandedCategories((current) => ({ ...current, [category.id]: !current[category.id] }));
  };

  const selectSubcategory = (categoryId: string, subcategoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubCategory(subcategoryId);
    setSelectedVariety("");
    setDraftSearch("");
    setSearchQuery("");
  };

  const formatMoney = (product: CategoryExplorerProduct) => {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: product.currency }).format(product.pricePerKg);
    } catch {
      return product.pricePerKg.toFixed(2) + " " + product.currency;
    }
  };

  return (
    <div className="-mx-4 -mb-10 -mt-5 min-h-screen bg-[#f4f6f8] pb-16 font-sans text-slate-900">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-2.5 shadow-xs">
        <div className="mx-auto flex max-w-[1720px] flex-wrap items-center justify-between gap-3">
          <form
            className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setSearchQuery(draftSearch.trim());
              setSelectedVariety("");
            }}
          >
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder="Search real catalogue products and sellers"
                className="h-10 rounded-lg border-slate-300 bg-slate-50/70 pl-9 pr-8 text-xs"
              />
              {draftSearch && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setDraftSearch("");
                    setSearchQuery("");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={selectedRegion || "all"} onValueChange={(value) => setSelectedRegion(value === "all" ? "" : value)}>
              <SelectTrigger className="h-10 w-[230px] rounded-lg border-slate-300 bg-slate-50/70 text-xs font-semibold">
                <MapPin className="mr-1 h-3.5 w-3.5 text-emerald-700" />
                <SelectValue placeholder="All configured regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All configured regions</SelectItem>
                {(data?.regions ?? []).map((region) => (
                  <SelectItem key={region.id} value={region.id}>{region.name} · {region.countryCode}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" size="sm" className="h-10 bg-[#078c52] px-4 font-bold hover:bg-[#067544]">
              {isFetching ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              Search
            </Button>
          </form>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setMarketplaceMode("local")}
                className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold", marketplaceMode === "local" ? "bg-[#078c52] text-white" : "text-slate-600")}
              >
                <Compass className="h-3.5 w-3.5" /> Local
              </button>
              <button
                type="button"
                onClick={() => setMarketplaceMode("global")}
                className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold", marketplaceMode === "global" ? "bg-[#078c52] text-white" : "text-slate-600")}
              >
                <Globe className="h-3.5 w-3.5" /> Global
              </button>
            </div>
            <Button variant="outline" size="sm" className="hidden h-10 gap-1.5 text-xs font-bold sm:flex" onClick={() => setLocation("/seller")}>
              <Share2 className="h-3.5 w-3.5" /> Switch to seller account
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1720px] px-3 pt-3.5 lg:px-4">
        {isError && (
          <Card className="mb-3 flex items-center justify-between border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
            <span>{error instanceof Error ? error.message : "The catalogue data could not be loaded."}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="mr-1 h-3.5 w-3.5" />Retry</Button>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="space-y-3.5 xl:col-span-2">
            <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-3.5 py-2.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Categories</span>
                <Badge variant="outline" className="bg-white text-[10px] font-mono">{data?.categoriesNav.length ?? 0} groups</Badge>
              </div>
              <div className="max-h-[560px] space-y-0.5 overflow-y-auto p-1.5 text-xs">
                {isLoading ? <EntityEmpty message="Loading published taxonomy…" /> : (data?.categoriesNav ?? []).length ? data?.categoriesNav.map((category) => {
                  const Icon = categoryIcons[category.icon] ?? Layers;
                  const expanded = expandedCategories[category.id] || selectedCategory === category.id;
                  return (
                    <div key={category.id}>
                      <button
                        type="button"
                        onClick={() => selectCategory(category)}
                        className={cn("flex w-full items-center justify-between rounded-lg p-2 text-left font-bold", selectedCategory === category.id ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-slate-100")}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0 text-emerald-700" />
                          <span className="truncate">{category.name}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="rounded-full bg-slate-100 px-1.5 text-[9px]">{category.count}</span>
                          {category.subcategories.length ? expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" /> : null}
                        </span>
                      </button>
                      {expanded && category.subcategories.length > 0 && (
                        <div className="ml-4 space-y-0.5 border-l border-emerald-200 py-1 pl-2">
                          {category.subcategories.map((subcategory) => (
                            <button
                              type="button"
                              key={subcategory.id}
                              onClick={() => selectSubcategory(category.id, subcategory.id)}
                              className={cn("flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left", selectedSubCategory === subcategory.id ? "bg-[#e8f7ee] font-black text-[#078c52]" : "text-slate-600 hover:bg-slate-100")}
                            >
                              <span className="truncate">{subcategory.name}</span>
                              <span className="rounded-full bg-slate-100 px-1.5 text-[9px]">{subcategory.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }) : <EntityEmpty message="No published categories are available." />}
              </div>
            </Card>

            <EntityCard title="Verified organisations" onViewAll={() => setLocation("/admin/control-centre/organisations")}>
              {verifiedOrganisations.length ? verifiedOrganisations.map((organisation) => (
                <EntityRow key={organisation.id} entity={organisation} icon={Building2} suffix={String(organisation.productCount ?? 0) + " products"} />
              )) : <EntityEmpty message="No approved organisations match this region." />}
            </EntityCard>

            <EntityCard title="Top farmers" onViewAll={() => setLocation("/admin/control-centre/farmers")}>
              {largeFarmers.length ? largeFarmers.map((farmer) => (
                <EntityRow key={farmer.id} entity={farmer} suffix={String(farmer.productCount ?? 0) + " products"} />
              )) : <EntityEmpty message="No verified farmers match this region." />}
            </EntityCard>

            <EntityCard title="Regional managers" onViewAll={() => setLocation("/admin/employees")}>
              {regionalManagers.length ? regionalManagers.map((manager) => (
                <EntityRow key={manager.id} entity={manager} suffix={manager.role} />
              )) : <EntityEmpty message="No regional manager assignments are configured." />}
            </EntityCard>
          </div>

          <div className="space-y-3 xl:col-span-7">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <Kpi icon={Package} value={data?.kpiStats.totalProducts} label={activeCommodityLabel + " products"} loading={isLoading} />
              <Kpi icon={Users} value={data?.kpiStats.approvedSellers} label="Approved sellers" loading={isLoading} />
              <Kpi icon={MapPin} value={data?.kpiStats.citiesCovered} label="Locations covered" loading={isLoading} />
              <Kpi icon={Truck} value={data?.kpiStats.districtsCount} label="Configured districts" loading={isLoading} />
              <Kpi icon={Clock} value={data?.kpiStats.avgDeliveryDays === null ? "No data" : data?.kpiStats.avgDeliveryDays} label="Avg. delivery days" loading={isLoading} />
            </div>

            <Card className="space-y-4 rounded-xl border-slate-200 bg-white p-4 shadow-xs">
              <div>
                <h2 className="text-base font-black text-slate-900">{activeCommodityLabel} · {marketplaceMode === "global" ? "Global marketplace" : selectedRegionLabel}</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {data ? String(data.productTotal) + " approved database listing" + (data.productTotal === 1 ? "" : "s") : "Loading approved listings…"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-y border-slate-100 py-2.5 text-xs">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-8 w-[145px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="price_asc">Price: low to high</SelectItem>
                    <SelectItem value="price_desc">Price: high to low</SelectItem>
                    <SelectItem value="rating">Top rated</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All prices</SelectItem>
                    <SelectItem value="under_150">Under 1.50</SelectItem>
                    <SelectItem value="150_250">1.50 – 2.50</SelectItem>
                    <SelectItem value="above_250">Above 2.50</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={quantityFilter} onValueChange={setQuantityFilter}>
                  <SelectTrigger className="h-8 w-[125px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any quantity</SelectItem>
                    <SelectItem value="bulk">Bulk stock</SelectItem>
                    <SelectItem value="retail">Retail orders</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={qualityFilter} onValueChange={setQualityFilter}>
                  <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All quality</SelectItem>
                    <SelectItem value="organic">Organic</SelectItem>
                    <SelectItem value="premium">Premium grade</SelectItem>
                  </SelectContent>
                </Select>
                {(selectedCategory || selectedSubCategory || selectedVariety || searchQuery) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-8 text-xs"
                    onClick={() => {
                      setSelectedCategory("");
                      setSelectedSubCategory("");
                      setSelectedVariety("");
                      setDraftSearch("");
                      setSearchQuery("");
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>

              {(data?.varieties ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setSelectedVariety("")} className={cn("rounded-md px-3 py-1 text-xs font-bold", !selectedVariety ? "bg-[#078c52] text-white" : "bg-slate-100 text-slate-700")}>
                    All varieties ({data?.productTotal ?? 0})
                  </button>
                  {data?.varieties.map((variety) => (
                    <button type="button" key={variety.name} onClick={() => setSelectedVariety(variety.name)} className={cn("rounded-md px-3 py-1 text-xs font-bold", selectedVariety === variety.name ? "bg-[#078c52] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}>
                      {variety.name} ({variety.count})
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                {isLoading ? Array.from({ length: 10 }).map((_, index) => (
                  <Card key={index} className="animate-pulse space-y-2 border-slate-200 p-2">
                    <div className="h-32 rounded bg-slate-200" />
                    <div className="h-4 rounded bg-slate-100" />
                    <div className="h-3 w-2/3 rounded bg-slate-100" />
                  </Card>
                )) : products.length ? products.map((product) => {
                  const quantity = cartQuantities[product.id] ?? product.minOrderKg;
                  return (
                    <div key={product.id} className="group flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs hover:border-emerald-300 hover:shadow-md">
                      <div>
                        <div className="relative mb-2 flex h-36 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                          {product.imageUrl ? <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover transition group-hover:scale-105" /> : <Package className="h-9 w-9 text-slate-300" />}
                          {product.badge && <span className="absolute left-2 top-2 rounded bg-emerald-700 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">{product.badge}</span>}
                          <button
                            type="button"
                            aria-label={product.isSaved ? "Remove saved product" : "Save product"}
                            disabled={saveProduct.isPending}
                            onClick={() => saveProduct.mutate({ productId: product.id, saved: !product.isSaved })}
                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-xs"
                          >
                            <Heart className={cn("h-3.5 w-3.5", product.isSaved && "fill-rose-600 text-rose-600")} />
                          </button>
                        </div>
                        <h3 className="truncate text-xs font-bold text-slate-900" title={product.title}>{product.title}</h3>
                        <div className="mt-1 flex items-center gap-1 text-[11px]">
                          <span className="truncate font-semibold text-slate-800">{product.sellerName}</span>
                          {product.sellerVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                        </div>
                        <p className="truncate text-[10px] text-slate-400">
                          {product.location ?? "Location not provided"}{product.distanceKm === null ? "" : " · " + product.distanceKm + " km"}
                        </p>
                        <div className="mt-1 flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1 font-bold text-slate-700"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{product.rating.toFixed(1)} <small className="font-normal text-slate-400">({product.reviewCount})</small></span>
                          <span className={cn("text-[10px] font-bold", product.inStock ? "text-emerald-600" : "text-rose-600")}>{product.inStock ? "In stock" : "Out of stock"}</span>
                        </div>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="text-sm font-black">{formatMoney(product)} <small className="font-normal text-slate-500">/{product.unit}</small></span>
                          <span className="text-[10px] text-slate-400">Min. {product.minOrderKg} {product.unit}</span>
                        </div>
                      </div>
                      <div className="mt-2.5 space-y-1.5 border-t border-slate-100 pt-2">
                        <div className="flex items-center gap-1">
                          <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 px-1 py-0.5 text-xs font-bold">
                            <button type="button" onClick={() => setQuantity(product, -1)} className="px-1">−</button>
                            <span className="px-1 text-[10px]">{quantity}</span>
                            <button type="button" onClick={() => setQuantity(product, 1)} className="px-1">+</button>
                          </div>
                          <Button
                            size="sm"
                            disabled={!product.inStock || addToCart.isPending}
                            onClick={() => addToCart.mutate({ product, quantity })}
                            className="h-7 flex-1 bg-[#078c52] px-2 text-[10px] font-bold hover:bg-[#067544]"
                          >
                            Add to cart
                          </Button>
                        </div>
                        <p className="truncate text-center text-[9px] text-slate-400">{product.organisationName ?? "Independent verified seller"}</p>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="col-span-full py-16 text-center">
                    <Package className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-bold text-slate-700">No approved listings match these filters</p>
                    <p className="text-xs text-slate-400">Clear a filter or publish an approved product to populate this result.</p>
                  </div>
                )}
              </div>

              {data && data.productTotal > products.length && (
                <p className="text-center text-[10px] text-slate-400">Showing the first {products.length} of {data.productTotal} matching listings.</p>
              )}

              <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-emerald-900/10 bg-emerald-50/70 p-3.5 text-xs sm:flex-row">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#053f36] text-lime-300"><Globe className="h-5 w-5" /></div>
                  <div>
                    <p className="font-black uppercase tracking-wider">Global marketplace</p>
                    <p className="text-[11px] text-slate-600">Compare the same approved database listings without the regional boundary.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setMarketplaceMode("global")} className="text-xs font-bold">
                  View global results
                </Button>
              </div>
            </Card>
          </div>

          <div className="space-y-3.5 xl:col-span-3">
            <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-3.5 py-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">{selectedRegionLabel} seller distribution</span>
                <span className="text-[10px] font-bold text-emerald-700">{data?.kpiStats.approvedSellers ?? 0} approved</span>
              </div>
              <div className="h-56"><ClusterMap clusters={clusters} onExpand={() => setIsMapModalOpen(true)} /></div>
              <div className="flex items-center justify-between border-t border-slate-100 p-2.5 text-[9px] font-bold text-slate-600">
                <span>Seller totals come from active regional assignments.</span>
                <span>{clusters.length} regions</span>
              </div>
            </Card>

            <EntityCard title="Live sellers now" onViewAll={() => setLocation("/admin/control-centre/sellers")}>
              {liveSellers.length ? liveSellers.map((seller) => (
                <div key={seller.id} className="flex items-center justify-between py-0.5 text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="relative">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={seller.avatar ?? undefined} />
                        <AvatarFallback className="text-[9px] font-bold">{seller.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold">{seller.name}</p>
                      <p className="text-[10px] text-slate-400">★ {seller.rating.toFixed(1)} · {seller.productCount} products{seller.distanceKm === null ? "" : " · " + seller.distanceKm + " km"}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-[#078c52]" onClick={() => setLocation("/sellers/" + encodeURIComponent(seller.id))}>
                    <ShoppingCart className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )) : <EntityEmpty message="No verified sellers are currently marked online." />}
            </EntityCard>

            {opportunity ? (
              <Card className="space-y-2.5 rounded-xl border-amber-200 bg-amber-50/70 p-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-800"><Sparkles className="h-3.5 w-3.5" />Opportunity available</span>
                  <Badge className="bg-amber-500 text-[8px] uppercase">{opportunity.status}</Badge>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-800">{opportunity.productName} · {opportunity.regionName}</p>
                    <p className="mt-1 text-[10px] leading-snug text-slate-600">{opportunity.description}</p>
                  </div>
                  {opportunity.imageUrl ? <img src={opportunity.imageUrl} alt={opportunity.productName} className="h-12 w-12 rounded-lg object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white"><Package className="h-5 w-5 text-slate-300" /></div>}
                </div>
                <div className="grid grid-cols-3 border-t border-amber-200/60 pt-2 text-center text-[10px]">
                  <div><p className="text-slate-400">Eligible sellers</p><b>{opportunity.eligibleSellersCount}</b></div>
                  <div><p className="text-slate-400">Priority</p><b className="text-rose-600">{opportunity.priority}</b></div>
                  <div><p className="text-slate-400">Claim window</p><b>{opportunity.lockTimeHours}h</b></div>
                </div>
                {!opportunity.claimable && !opportunity.isAccepted && <p className="text-[10px] text-amber-800">Switch to an eligible seller account with an active regional publishing assignment to claim this opportunity.</p>}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={opportunity.isAccepted || !canClaimOpportunity || opportunityMutation.isPending}
                    onClick={() => opportunityMutation.mutate(opportunity.id)}
                    className="h-8 flex-1 bg-[#078c52] text-xs font-bold hover:bg-[#067544]"
                  >
                    {opportunity.isAccepted ? "Claimed" : "Accept opportunity"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsOpportunityModalOpen(true)} className="h-8 text-xs">Details</Button>
                </div>
              </Card>
            ) : (
              <Card className="rounded-xl border-slate-200 bg-white p-4 text-center shadow-xs">
                <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600" />
                <p className="mt-2 text-xs font-bold text-slate-700">No open regional opportunities</p>
                <p className="mt-1 text-[10px] text-slate-400">Supply-deficit opportunities will appear when regional catalogue targets are configured.</p>
              </Card>
            )}

            {marketplaceStatus && (
              <Card className="space-y-2.5 rounded-xl border-slate-200 bg-white p-3.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Marketplace status · {marketplaceStatus.regionName}</span>
                  <button type="button" onClick={() => setLocation("/admin/control-centre/analytics")} className="text-[10px] font-bold text-[#078c52]">View report</button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <StatusMetric label="Active sellers" value={marketplaceStatus.activeSellers} delta={marketplaceStatus.activeSellersDeltaPercent} />
                  <StatusMetric label="Products listed" value={marketplaceStatus.productsListed} delta={marketplaceStatus.productsListedDeltaPercent} />
                  <StatusMetric label="Orders · 30 days" value={marketplaceStatus.orders30Days} delta={marketplaceStatus.orders30DaysDeltaPercent} />
                  <StatusMetric label="Avg. delivery days" value={marketplaceStatus.avgDeliveryDays ?? "No data"} />
                </div>
                <p className="text-[9px] text-slate-400">Metrics are computed from approved products, persisted orders, delivery history, and active assignments.</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedRegionLabel} seller distribution</DialogTitle>
            <DialogDescription>Live cluster totals from configured marketplace regions and active assignments.</DialogDescription>
          </DialogHeader>
          <div className="h-[480px] overflow-hidden rounded-xl border border-slate-200"><ClusterMap clusters={clusters} /></div>
          <DialogFooter><Button onClick={() => setIsMapModalOpen(false)}>Close map</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOpportunityModalOpen} onOpenChange={setIsOpportunityModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Regional supply opportunity</DialogTitle>
            <DialogDescription>{opportunity ? opportunity.productName + " · " + opportunity.regionName : "No opportunity selected"}</DialogDescription>
          </DialogHeader>
          {opportunity && (
            <div className="space-y-3 text-xs text-slate-700">
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3">{opportunity.description}</p>
              <p><strong>Eligible sellers:</strong> {opportunity.eligibleSellersCount}</p>
              <p><strong>Priority:</strong> {opportunity.priority}</p>
              <p><strong>Claim window:</strong> {opportunity.lockTimeHours} hours</p>
              {opportunity.claimExpiresAt && <p><strong>Current claim expires:</strong> {new Date(opportunity.claimExpiresAt).toLocaleString()}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpportunityModalOpen(false)}>Close</Button>
            {opportunity && <Button disabled={opportunity.isAccepted || !canClaimOpportunity || opportunityMutation.isPending} onClick={() => opportunityMutation.mutate(opportunity.id)} className="bg-[#078c52] hover:bg-[#067544]">{opportunity.isAccepted ? "Claimed" : "Accept opportunity"}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EntityCard({ title, children, onViewAll }: { title: string; children: ReactNode; onViewAll: () => void }) {
  return (
    <Card className="rounded-xl border-slate-200 bg-white p-3 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{title}</span>
        <button type="button" onClick={onViewAll} className="text-[10px] font-bold text-[#078c52] hover:underline">View all</button>
      </div>
      <div className="mt-2 space-y-2">{children}</div>
    </Card>
  );
}

function EntityRow({ entity, icon: Icon, suffix }: { entity: VerifiedEntity; icon?: LucideIcon; suffix: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <div className="flex min-w-0 items-center gap-2">
        {Icon ? (
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-emerald-50 text-[#078c52]"><Icon className="h-3.5 w-3.5" /></div>
        ) : (
          <Avatar className="h-6 w-6">
            <AvatarImage src={entity.avatar ?? undefined} />
            <AvatarFallback className="text-[9px] font-bold">{entity.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0">
          <p className="truncate font-bold leading-tight text-slate-900">{entity.name}</p>
          <p className="truncate text-[10px] text-slate-400">{entity.location ?? "No regional location"}</p>
        </div>
      </div>
      <span className="shrink-0 text-[9px] font-bold text-emerald-700">{suffix}</span>
    </div>
  );
}

function Kpi({ icon: Icon, value, label, loading }: { icon: LucideIcon; value: string | number | undefined; label: string; loading: boolean }) {
  return (
    <Card className="flex items-center gap-2.5 rounded-xl border-slate-200 bg-white p-3 shadow-xs">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#078c52]"><Icon className="h-[18px] w-[18px]" /></div>
      <div className="min-w-0">
        <p className="text-base font-black leading-none text-slate-900">{loading ? "—" : value ?? 0}</p>
        <p className="mt-0.5 truncate text-[10px] font-bold text-slate-500">{label}</p>
      </div>
    </Card>
  );
}

function StatusMetric({ label, value, delta }: { label: string; value: string | number; delta?: number | null }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="flex items-center justify-between text-sm font-black text-slate-900">
        <span>{typeof value === "number" ? value.toLocaleString() : value}</span>
        {delta !== undefined && <Delta value={delta} />}
      </p>
    </div>
  );
}
