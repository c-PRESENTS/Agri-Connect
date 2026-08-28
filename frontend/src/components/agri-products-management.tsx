import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Award,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileCheck,
  Filter,
  Flame,
  Layers,
  Leaf,
  MapPin,
  MoreHorizontal,
  Package,
  PackageCheck,
  PackagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Tag,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Truck,
  UserCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export type AdminProductItem = {
  id: string;
  name: string;
  image?: string | null;
  categoryId: string;
  subcategoryId?: string | null;
  price: number;
  currency: string;
  unit: string;
  stock: number;
  moderationStatus: "approved" | "pending_review" | "changes_requested" | "rejected" | "draft" | string;
  moderationReason?: string | null;
  isFeatured: boolean;
  isFreshPick: boolean;
  regionId?: string | null;
  regionName?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  moderationVersion: number;
  seller: {
    id: string;
    name: string;
    avatar?: string | null;
    location?: string | null;
    accountStatus: string;
    verificationStatus: string;
    isEligible: boolean;
  };
};

export type AdminProductDetail = AdminProductItem & {
  description?: string;
  productData?: Record<string, unknown>;
  history: Array<{
    id: string;
    eventType: string;
    fromStatus?: string | null;
    toStatus: string;
    reason?: string | null;
    actorName: string;
    createdAt: string;
  }>;
};

function timeAgo(dateString?: string | null): string {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function money(amount: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase() === "GBP" ? "GBP" : currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card className="overflow-hidden border border-emerald-950/10 bg-white/95 shadow-sm transition-all hover:shadow-md">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
            <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{value}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{subtitle}</p>
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor} shadow-inner`}>
            <Icon className="h-5 w-5" strokeWidth={2.2} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AgriProductsManagement({
  initialSearch = "",
  permissions = [],
}: {
  initialSearch?: string;
  permissions?: string[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [placementFilter, setPlacementFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Review modal state
  const [reviewTarget, setReviewTarget] = useState<AdminProductItem | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | "request-changes">("approve");
  const [reviewReason, setReviewReason] = useState("");

  // Query products list
  const { data: productsData, isLoading, refetch, isFetching } = useQuery<{
    products: AdminProductItem[];
    pagination: { total: number; page: number; pageSize: number; pageCount: number };
  }>({
    queryKey: ["/api/admin/products", { page: 1, pageSize: 200, sort: "updatedAt", direction: "desc" }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/products?page=1&pageSize=200&sort=updatedAt&direction=desc");
      return res.json();
    },
  });

  const products = useMemo(() => productsData?.products ?? [], [productsData]);

  // Query single product detail for Drawer
  const { data: detailData, isLoading: isLoadingDetail } = useQuery<{ product: AdminProductDetail }>({
    queryKey: ["/api/admin/products", selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return null as never;
      const res = await apiRequest("GET", `/api/admin/products/${selectedProductId}`);
      return res.json();
    },
    enabled: Boolean(selectedProductId),
  });
  const productDetail = detailData?.product;

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categoryId) set.add(p.categoryId);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchName = prod.name?.toLowerCase().includes(q);
        const matchSeller = prod.seller?.name?.toLowerCase().includes(q);
        const matchId = prod.id.toLowerCase().includes(q);
        const matchCat = prod.categoryId?.toLowerCase().includes(q);
        const matchReg = prod.regionName?.toLowerCase().includes(q);
        if (!matchName && !matchSeller && !matchId && !matchCat && !matchReg) return false;
      }

      if (statusFilter !== "all" && prod.moderationStatus !== statusFilter) return false;
      if (categoryFilter !== "all" && prod.categoryId !== categoryFilter) return false;
      if (placementFilter === "featured" && !prod.isFeatured) return false;
      if (placementFilter === "freshPick" && !prod.isFreshPick) return false;

      return true;
    });
  }, [products, search, statusFilter, categoryFilter, placementFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  // KPI Metrics
  const stats = useMemo(() => {
    const total = products.length;
    const approved = products.filter((p) => p.moderationStatus === "approved").length;
    const pending = products.filter((p) => p.moderationStatus === "pending_review").length;
    const changes = products.filter((p) => p.moderationStatus === "changes_requested").length;
    const featured = products.filter((p) => p.isFeatured).length;
    const freshPicks = products.filter((p) => p.isFreshPick).length;

    return {
      total,
      approved,
      pending,
      changes,
      featured,
      freshPicks,
    };
  }, [products]);

  // Mutations
  const reviewMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: string; reason: string }) => {
      const res = await apiRequest("POST", `/api/admin/products/${id}/${action}`, { reason });
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast({
        title: vars.action === "approve" ? "Product Approved" : vars.action === "reject" ? "Product Rejected" : "Changes Requested",
        description: "Moderation decision recorded in audit log.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      if (selectedProductId) queryClient.invalidateQueries({ queryKey: ["/api/admin/products", selectedProductId] });
      setReviewTarget(null);
      setReviewReason("");
    },
    onError: (err: Error) => {
      toast({ title: "Review failed", description: err.message, variant: "destructive" });
    },
  });

  const togglePlacementMutation = useMutation({
    mutationFn: async ({ id, type, enabled }: { id: string; type: "feature" | "fresh-pick"; enabled: boolean }) => {
      const res = await apiRequest("POST", `/api/admin/products/${id}/${type}`, { enabled });
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast({
        title: vars.type === "feature" ? "Featured Placement" : "Fresh Pick Placement",
        description: `Product ${vars.enabled ? "added to" : "removed from"} homepage showcase.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      if (selectedProductId) queryClient.invalidateQueries({ queryKey: ["/api/admin/products", selectedProductId] });
    },
    onError: (err: Error) => {
      toast({ title: "Placement update failed", description: err.message, variant: "destructive" });
    },
  });

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["Product ID", "Product Name", "Category", "Seller Name", "Price", "Unit", "Stock", "Status", "Featured", "Fresh Pick", "Region"];
    const rows = filteredProducts.map((p) => [
      `"${p.id}"`,
      `"${p.name || ""}"`,
      `"${p.categoryId || ""}"`,
      `"${p.seller?.name || ""}"`,
      `"${p.price}"`,
      `"${p.unit}"`,
      `"${p.stock}"`,
      `"${p.moderationStatus}"`,
      `"${p.isFeatured ? "Yes" : "No"}"`,
      `"${p.isFreshPick ? "Yes" : "No"}"`,
      `"${p.regionName || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agriconnect-products-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV Exported", description: `Exported ${filteredProducts.length} product records.` });
  };

  const canEdit = permissions.includes("products.edit") || permissions.includes("products.approve") || permissions.includes("dashboard.view");

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <span>Management</span>
            <span>/</span>
            <span>Marketplace Catalogue</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Product Moderation & Catalogue
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Audit fresh produce listings, price ceilings, stock quotas, DEFRA quality standards, and homepage placements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 gap-1.5 border-slate-300 bg-white font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 gap-1.5 border-slate-300 bg-white font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Total Products"
          value={stats.total.toLocaleString()}
          subtitle="Catalogue records"
          icon={Package}
          iconBg="bg-emerald-50"
          iconColor="text-[#078c52]"
        />
        <StatCard
          title="Live & Approved"
          value={stats.approved.toLocaleString()}
          subtitle="Visible on marketplace"
          icon={PackageCheck}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="Pending Review"
          value={stats.pending.toLocaleString()}
          subtitle="Awaiting moderation"
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Changes Needed"
          value={stats.changes.toLocaleString()}
          subtitle="Flagged to farmers"
          icon={AlertCircle}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
        />
        <StatCard
          title="Featured Harvest"
          value={stats.featured.toLocaleString()}
          subtitle="Hero carousel picks"
          icon={Sparkles}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Fresh Picks"
          value={stats.freshPicks.toLocaleString()}
          subtitle="Daily prime seasonal"
          icon={Leaf}
          iconBg="bg-lime-50"
          iconColor="text-lime-700"
        />
      </div>

      {/* Filter Matrix Card */}
      <Card className="border border-emerald-950/10 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search product title, seller farm name, category or SKU..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-10 pl-9 pr-8 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[150px] text-xs font-medium">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Moderation</SelectItem>
                  <SelectItem value="approved">Approved (Live)</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="changes_requested">Changes Needed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={categoryFilter}
                onValueChange={(val) => {
                  setCategoryFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[160px] text-xs font-medium truncate">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={placementFilter}
                onValueChange={(val) => {
                  setPlacementFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[140px] text-xs font-medium">
                  <SelectValue placeholder="Placement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Placements</SelectItem>
                  <SelectItem value="featured">Featured Only</SelectItem>
                  <SelectItem value="freshPick">Fresh Picks Only</SelectItem>
                </SelectContent>
              </Select>

              {(search || statusFilter !== "all" || categoryFilter !== "all" || placementFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setCategoryFilter("all");
                    setPlacementFilter("all");
                    setPage(1);
                  }}
                  className="h-10 text-xs text-slate-500 hover:text-slate-900"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="overflow-hidden border border-emerald-950/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Produce Listing</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Producer / Farm</th>
                <th className="px-4 py-3 text-right">Price / Unit</th>
                <th className="px-4 py-3 text-center">Stock</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Placements</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="h-4 w-full rounded bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-semibold">No catalogue products found</p>
                    <p className="text-xs">Adjust your search query or filter criteria.</p>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => {
                  const isApproved = product.moderationStatus === "approved";
                  const isPending = product.moderationStatus === "pending_review";
                  const isChanges = product.moderationStatus === "changes_requested";

                  return (
                    <tr
                      key={product.id}
                      className="group transition-colors hover:bg-emerald-50/40"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-10 w-10 shrink-0 rounded-lg object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 font-bold text-[#053f36]">
                              <Leaf className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <button
                              onClick={() => setSelectedProductId(product.id)}
                              className="font-bold text-slate-900 hover:text-[#078c52] hover:underline text-left block truncate max-w-[200px]"
                            >
                              {product.name}
                            </button>
                            <span className="font-mono text-[10px] text-slate-400">SKU: {product.id.slice(0, 12)}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge variant="outline" className="bg-slate-50 text-[10px] capitalize text-slate-700 font-medium">
                          {product.categoryId?.replaceAll("_", " ")}
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 rounded-full border">
                            <AvatarImage src={product.seller?.avatar || undefined} />
                            <AvatarFallback className="bg-emerald-100 text-[9px] font-black text-[#053f36]">
                              {product.seller?.name?.charAt(0) || "F"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-slate-800 truncate max-w-[140px]">
                              {product.seller?.name || "Independent Farm"}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate block">
                              {product.regionName || product.seller?.location || "UK Regional"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right font-black text-slate-900">
                        {money(product.price, product.currency)}
                        <span className="text-[10px] font-normal text-slate-500"> / {product.unit || "unit"}</span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-block font-mono text-xs font-bold ${
                            product.stock <= 5 ? "text-amber-600" : "text-slate-700"
                          }`}
                        >
                          {product.stock} in stock
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isApproved
                              ? "bg-emerald-100 text-emerald-800"
                              : isPending
                              ? "bg-amber-100 text-amber-800"
                              : isChanges
                              ? "bg-orange-100 text-orange-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isApproved
                                ? "bg-emerald-500"
                                : isPending
                                ? "bg-amber-500"
                                : isChanges
                                ? "bg-orange-500"
                                : "bg-rose-500"
                            }`}
                          />
                          {product.moderationStatus?.replaceAll("_", " ")}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {product.isFeatured && (
                            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-none text-[9px] px-1.5 py-0">
                              Featured
                            </Badge>
                          )}
                          {product.isFreshPick && (
                            <Badge className="bg-lime-100 text-lime-800 hover:bg-lime-200 border-none text-[9px] px-1.5 py-0">
                              Fresh Pick
                            </Badge>
                          )}
                          {!product.isFeatured && !product.isFreshPick && <span className="text-slate-400">—</span>}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedProductId(product.id)}
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            title="Inspect product dossier"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setReviewTarget(product);
                                setReviewAction("approve");
                                setReviewReason("Approved for marketplace distribution.");
                              }}
                              className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Quick Approve"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs font-medium">
                              <DropdownMenuLabel>Moderation Controls</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setReviewTarget(product);
                                  setReviewAction("approve");
                                  setReviewReason("Meets DEFRA and AgriConnect quality standards.");
                                }}
                              >
                                <ThumbsUp className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                                <span>Approve Listing</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setReviewTarget(product);
                                  setReviewAction("request-changes");
                                  setReviewReason("");
                                }}
                              >
                                <Pencil className="mr-2 h-3.5 w-3.5 text-amber-600" />
                                <span>Request Farmer Changes</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setReviewTarget(product);
                                  setReviewAction("reject");
                                  setReviewReason("");
                                }}
                                className="text-rose-600"
                              >
                                <ThumbsDown className="mr-2 h-3.5 w-3.5" />
                                <span>Reject Listing</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  togglePlacementMutation.mutate({
                                    id: product.id,
                                    type: "feature",
                                    enabled: !product.isFeatured,
                                  })
                                }
                              >
                                <Sparkles className="mr-2 h-3.5 w-3.5 text-purple-600" />
                                <span>{product.isFeatured ? "Remove Featured" : "Feature on Homepage"}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  togglePlacementMutation.mutate({
                                    id: product.id,
                                    type: "fresh-pick",
                                    enabled: !product.isFreshPick,
                                  })
                                }
                              >
                                <Leaf className="mr-2 h-3.5 w-3.5 text-lime-600" />
                                <span>{product.isFreshPick ? "Remove Fresh Pick" : "Mark as Fresh Pick"}</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-900">{filteredProducts.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">{Math.min(page * pageSize, filteredProducts.length)}</span> of{" "}
            <span className="font-semibold text-slate-900">{filteredProducts.length}</span> products
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 font-bold text-slate-700">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Product Detail Drawer */}
      <Sheet open={Boolean(selectedProductId)} onOpenChange={(open) => !open && setSelectedProductId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto bg-slate-50">
          {isLoadingDetail ? (
            <div className="flex h-full items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : productDetail ? (
            <div className="flex flex-col min-h-full">
              {/* Header */}
              <div className="bg-[#053f36] p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {productDetail.image ? (
                      <img
                        src={productDetail.image}
                        alt={productDetail.name}
                        className="h-14 w-14 rounded-xl object-cover border-2 border-white/20 shadow-md"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-lime-400 font-bold text-[#053f36]">
                        <Leaf className="h-7 w-7" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-lg font-black">{productDetail.name}</h2>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-[10px] text-white/60">ID: {productDetail.id}</span>
                        <Badge
                          variant="outline"
                          className={
                            productDetail.moderationStatus === "approved"
                              ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-200"
                              : "border-amber-400/30 bg-amber-500/20 text-amber-200"
                          }
                        >
                          {productDetail.moderationStatus}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProductId(null)}
                    className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 4 Stat Boxes */}
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Price</p>
                    <p className="text-sm font-black text-lime-300">
                      {money(productDetail.price, productDetail.currency)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Stock</p>
                    <p className="text-xs font-bold text-white">{productDetail.stock} {productDetail.unit}s</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Seller Status</p>
                    <p className="text-xs font-bold text-emerald-300 capitalize">{productDetail.seller?.verificationStatus || "Verified"}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Region</p>
                    <p className="text-[11px] font-medium text-white/80 truncate">{productDetail.regionName || "UK Hub"}</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="specs" className="flex-1 p-6">
                <TabsList className="grid w-full grid-cols-2 bg-slate-200">
                  <TabsTrigger value="specs" className="text-xs font-bold">
                    Product & Seller Specs
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-xs font-bold">
                    Moderation History
                  </TabsTrigger>
                </TabsList>

                {/* Specs Tab */}
                <TabsContent value="specs" className="mt-4 space-y-4">
                  <Card className="border-slate-200">
                    <CardContent className="p-4 space-y-3 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Category / Subcategory</span>
                        <span className="font-semibold text-slate-900 capitalize">
                          {productDetail.categoryId?.replaceAll("_", " ")}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Registered Producer</span>
                        <span className="font-bold text-emerald-800">{productDetail.seller?.name}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Producer Location</span>
                        <span className="font-semibold text-slate-900">{productDetail.seller?.location || "UK Regional"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Moderation Reason / Note</span>
                        <span className="font-medium text-slate-700 italic">{productDetail.moderationReason || "No custom restrictions"}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Last Reviewed</span>
                        <span className="font-mono text-slate-600">{timeAgo(productDetail.reviewedAt)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-[#078c52] text-white hover:bg-[#067343] text-xs h-9"
                        onClick={() => {
                          setReviewTarget(productDetail);
                          setReviewAction("approve");
                          setReviewReason("Approved for marketplace distribution.");
                        }}
                      >
                        <ThumbsUp className="mr-1.5 h-3.5 w-3.5" /> Approve Listing
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 text-xs h-9 text-amber-700 border-amber-300 hover:bg-amber-50"
                        onClick={() => {
                          setReviewTarget(productDetail);
                          setReviewAction("request-changes");
                          setReviewReason("");
                        }}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Request Changes
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 text-xs h-9"
                        onClick={() =>
                          togglePlacementMutation.mutate({
                            id: productDetail.id,
                            type: "feature",
                            enabled: !productDetail.isFeatured,
                          })
                        }
                      >
                        <Sparkles className="mr-1.5 h-3.5 w-3.5 text-purple-600" />
                        {productDetail.isFeatured ? "Remove Featured" : "Feature on Homepage"}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 text-xs h-9"
                        onClick={() =>
                          togglePlacementMutation.mutate({
                            id: productDetail.id,
                            type: "fresh-pick",
                            enabled: !productDetail.isFreshPick,
                          })
                        }
                      >
                        <Leaf className="mr-1.5 h-3.5 w-3.5 text-lime-600" />
                        {productDetail.isFreshPick ? "Remove Fresh Pick" : "Mark as Fresh Pick"}
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="mt-4 space-y-2">
                  {productDetail.history?.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Clock className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                      <p className="font-semibold">No moderation events recorded</p>
                    </div>
                  ) : (
                    productDetail.history.map((event) => (
                      <div key={event.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 capitalize">
                            {event.eventType.replaceAll("_", " ")} ➔ {event.toStatus}
                          </span>
                          <span className="text-[10px] text-slate-400">{timeAgo(event.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-600">
                          Actor: {event.actorName} {event.reason ? `· Note: "${event.reason}"` : ""}
                        </p>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Review Modal */}
      <Dialog open={Boolean(reviewTarget)} onOpenChange={(open) => !open && setReviewTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              {reviewAction === "approve"
                ? "Approve Catalogue Listing"
                : reviewAction === "reject"
                ? "Reject Catalogue Listing"
                : "Request Farmer Listing Changes"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {reviewTarget?.name} · Producer: {reviewTarget?.seller?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Audit Justification / Moderation Note *</Label>
              <textarea
                rows={3}
                placeholder="Reason or instructions for this decision (recorded permanently in audit ledger)..."
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-xs focus:border-[#078c52] focus:outline-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReviewTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!reviewReason.trim() || reviewMutation.isPending}
              onClick={() => {
                if (reviewTarget) {
                  reviewMutation.mutate({
                    id: reviewTarget.id,
                    action: reviewAction,
                    reason: reviewReason.trim(),
                  });
                }
              }}
              className={
                reviewAction === "approve"
                  ? "bg-[#078c52] text-white hover:bg-[#067343]"
                  : reviewAction === "reject"
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "bg-amber-600 text-white hover:bg-amber-700"
              }
            >
              {reviewMutation.isPending
                ? "Saving..."
                : reviewAction === "approve"
                ? "Approve & Publish"
                : reviewAction === "reject"
                ? "Reject Listing"
                : "Submit Changes Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
