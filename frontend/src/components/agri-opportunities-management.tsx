import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BadgeCheck,
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
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
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
import { cn } from "@/lib/utils";

export type OpportunityItem = {
  id: string;
  name: string;
  productKey?: string;
  regionId?: string;
  region: string;
  regionCode?: string;
  category: string;
  subcategory?: string;
  status: "open" | "claimed" | "listing_submitted" | "completed" | "cancelled" | string;
  minimumListings?: number;
  activeStockListings?: number;
  claimedById?: string | null;
  claimedByName?: string;
  claimExpiresAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const CATEGORIES = [
  { id: "grains", label: "Food Grains & Cereals" },
  { id: "pulses", label: "Pulses & Lentils" },
  { id: "oils", label: "Cooking Oils" },
  { id: "vegetables", label: "Vegetables" },
  { id: "fruits", label: "Fruits" },
  { id: "dairy", label: "Dairy & Eggs" },
  { id: "specialty", label: "Specialty & Premium" },
  { id: "other-agri", label: "Other Agricultural" },
];

function statusColor(status: string) {
  switch (status.toLowerCase()) {
    case "open":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "claimed":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "listing_submitted":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "completed":
      return "bg-purple-100 text-purple-800 border-purple-300";
    case "cancelled":
    case "expired":
      return "bg-slate-100 text-slate-600 border-slate-300";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function timeAgo(dateString?: string | null): string {
  if (!dateString) return "Never";
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  if (diffMs < 0) return "just now";
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return "just now";
}

export function AgriOpportunitiesManagement({
  initialSearch = "",
  permissions,
}: {
  initialSearch?: string;
  permissions: string[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState(initialSearch);
  const [regionFilter, setRegionFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modals & Drawers
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newRegionId, setNewRegionId] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("grains");
  const [newQuota, setNewQuota] = useState("2");
  const [actionPromptTarget, setActionPromptTarget] = useState<{ id: string; name: string; action: "cancel" | "activate"; expectedUpdatedAt?: string } | null>(null);
  const [actionReason, setActionReason] = useState("");

  const canManage = permissions.includes("opportunities.manage");

  // Fetch opportunities from backend
  const opportunitiesQuery = useQuery<{ records?: OpportunityItem[] } | OpportunityItem[]>({
    queryKey: ["/api/admin/resources/opportunities"],
    staleTime: 10_000,
  });

  const opportunities: OpportunityItem[] = useMemo(() => {
    if (!opportunitiesQuery.data) return [];
    if (Array.isArray(opportunitiesQuery.data)) return opportunitiesQuery.data;
    return opportunitiesQuery.data.records ?? [];
  }, [opportunitiesQuery.data]);

  // Fetch regions for filtering and creation
  const regionsQuery = useQuery<{ records?: Array<{ id: string; name: string; code: string; active?: boolean }> } | Array<{ id: string; name: string; code: string }>>({
    queryKey: ["/api/admin/resources/regions"],
    staleTime: 60_000,
  });

  const regionsList = useMemo(() => {
    if (!regionsQuery.data) return [];
    if (Array.isArray(regionsQuery.data)) return regionsQuery.data;
    return regionsQuery.data.records ?? [];
  }, [regionsQuery.data]);

  // Fetch detail for selected opportunity drawer
  const detailQuery = useQuery<{
    opportunity: OpportunityItem & {
      eligibleSellersCount?: number;
      currentListings?: number;
      claimedBy?: { id: string; name: string; email: string; avatar?: string | null } | null;
      regionName?: string;
      regionCode?: string;
      countryCode?: string;
    };
    eligibleSellers: Array<{ id: string; name: string; email: string; avatar?: string | null; verificationStatus: string; categoryProductsCount: number }>;
    auditEvents: Array<{ id: string; action: string; outcome: string; occurredAt: string; metadata?: any }>;
  }>({
    queryKey: ["/api/admin/resources/opportunities", selectedOpportunityId, "detail"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/resources/opportunities/${selectedOpportunityId}/detail`);
      return res.json();
    },
    enabled: Boolean(selectedOpportunityId),
    staleTime: 5_000,
  });

  // Mutations
  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/resources/opportunities/scan", {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Regional Demand Scan Complete",
        description: `Scanned all active market territories. Opened ${data.result?.opened || 0}, Completed ${data.result?.completed || 0}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/opportunities", selectedOpportunityId, "detail"] });
    },
    onError: (err: Error) => {
      toast({ title: "Scan Failed", description: err.message, variant: "destructive" });
    },
  });

  const createTargetMutation = useMutation({
    mutationFn: async (payload: { regionId: string; productName: string; categoryId: string; minimumActiveListings: number }) => {
      const res = await apiRequest("POST", "/api/admin/resources/opportunities/target", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Regional Target Created",
        description: "New commodity production opportunity established and published to verified farmers.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/opportunities"] });
      setCreateModalOpen(false);
      setNewProductName("");
      setNewRegionId("");
      setNewCategoryId("grains");
      setNewQuota("2");
    },
    onError: (err: Error) => {
      toast({ title: "Creation Failed", description: err.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, action, reason, expectedUpdatedAt }: { id: string; action: string; reason: string; expectedUpdatedAt?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/resources/opportunities/${id}`, {
        action,
        reason,
        expectedUpdatedAt,
      });
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast({
        title: vars.action === "cancel" ? "Opportunity Cancelled" : "Opportunity Reopened",
        description: "Status transition saved in audit ledger.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/opportunities"] });
      if (selectedOpportunityId) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/opportunities", selectedOpportunityId, "detail"] });
      }
      setActionPromptTarget(null);
      setActionReason("");
    },
    onError: (err: Error) => {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    },
  });

  // Filter & Search Logic
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((item) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchName = item.name.toLowerCase().includes(q);
        const matchKey = item.productKey?.toLowerCase().includes(q);
        const matchRegion = item.region?.toLowerCase().includes(q);
        const matchCategory = item.category?.toLowerCase().includes(q);
        const matchClaimed = item.claimedByName?.toLowerCase().includes(q);
        if (!matchName && !matchKey && !matchRegion && !matchCategory && !matchClaimed) return false;
      }

      if (regionFilter !== "all" && item.regionId !== regionFilter && item.region !== regionFilter) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;

      return true;
    });
  }, [opportunities, search, regionFilter, categoryFilter, statusFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredOpportunities.length / pageSize));
  const paginatedOpportunities = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOpportunities.slice(start, start + pageSize);
  }, [filteredOpportunities, page, pageSize]);

  // KPI Metrics
  const stats = useMemo(() => {
    const total = opportunities.length;
    const open = opportunities.filter((o) => o.status === "open").length;
    const claimed = opportunities.filter((o) => o.status === "claimed" || o.status === "listing_submitted").length;
    const completed = opportunities.filter((o) => o.status === "completed").length;
    const totalQuotaNeeded = opportunities.filter((o) => o.status === "open").reduce((sum, o) => sum + (o.minimumListings || 1), 0);
    const uniqueRegions = new Set(opportunities.map((o) => o.region)).size;

    return { total, open, claimed, completed, totalQuotaNeeded, uniqueRegions };
  }, [opportunities]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["Opportunity ID", "Product Name", "Product Key", "Target Region", "Category", "Status", "Quota Needed", "Live Listings", "Claimed By", "Updated At"];
    const rows = filteredOpportunities.map((o) => [
      `"${o.id}"`,
      `"${o.name.replace(/"/g, '""')}"`,
      `"${o.productKey || ""}"`,
      `"${o.region || ""}"`,
      `"${o.category || ""}"`,
      `"${o.status}"`,
      o.minimumListings || 1,
      o.activeStockListings || 0,
      `"${(o.claimedByName || "Open").replace(/"/g, '""')}"`,
      `"${o.updatedAt || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agriconnect-opportunities-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedOpp = detailQuery.data?.opportunity;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Management & Catalog</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Regional Opportunity Manager</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Publish and maintain regional production opportunities, monitor commodity supply gaps, and verify quota fulfilment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={filteredOpportunities.length === 0}
            className="rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={!canManage || scanMutation.isPending}
            onClick={() => scanMutation.mutate()}
            className="rounded-xl border-emerald-200 bg-emerald-50/50 text-xs font-bold text-emerald-800 hover:bg-emerald-100/60"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4 text-emerald-600", scanMutation.isPending && "animate-spin")} />
            {scanMutation.isPending ? "Scanning..." : "Run Regional Demand Scan"}
          </Button>

          <Button
            size="sm"
            disabled={!canManage}
            onClick={() => setCreateModalOpen(true)}
            className="rounded-xl bg-[#078c52] text-xs font-bold text-white hover:bg-[#067343] shadow-xs"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Regional Target Opportunity
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="rounded-2xl border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tracked</span>
            <Target className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{stats.total}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">across {stats.uniqueRegions} market territories</p>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Open Demand</span>
            <Flame className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700">{stats.open}</p>
          <p className="mt-0.5 text-[11px] text-emerald-600/80">ready for certified farmer claims</p>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">In Progress</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-blue-700">{stats.claimed}</p>
          <p className="mt-0.5 text-[11px] text-blue-600/80">claimed or listing in review</p>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Quota Met</span>
            <CheckCircle2 className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-purple-700">{stats.completed}</p>
          <p className="mt-0.5 text-[11px] text-purple-600/80">active inventory fulfilled</p>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Quota Needed</span>
            <Package className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-700">{stats.totalQuotaNeeded} listings</p>
          <p className="mt-0.5 text-[11px] text-amber-600/80">unmet regional demand target</p>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            <div className="relative col-span-1 sm:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border-slate-200 pl-9 text-xs"
                placeholder="Search by commodity, variety, or farmer..."
              />
            </div>

            <Select
              value={regionFilter}
              onValueChange={(val) => {
                setRegionFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions ({regionsList.length})</SelectItem>
                {regionsList.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={categoryFilter}
              onValueChange={(val) => {
                setCategoryFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open Demand</SelectItem>
                <SelectItem value="claimed">Claimed</SelectItem>
                <SelectItem value="listing_submitted">Listing Submitted</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(search || regionFilter !== "all" || categoryFilter !== "all" || statusFilter !== "all") && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
              <span>
                Found <b>{filteredOpportunities.length}</b> opportunities matching criteria
              </span>
              <button
                onClick={() => {
                  setSearch("");
                  setRegionFilter("all");
                  setCategoryFilter("all");
                  setStatusFilter("all");
                  setPage(1);
                }}
                className="font-bold text-emerald-700 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <CardHeader className="flex-row items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-black text-slate-900">Regional Opportunities & Targets</CardTitle>
              <p className="text-xs text-slate-400">Live authoritative database records · {filteredOpportunities.length} total entries</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {opportunitiesQuery.isLoading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-emerald-600" />
              <p className="font-bold text-slate-700">Loading platform opportunities...</p>
              <p className="text-xs text-slate-400 mt-1">Connecting to live regional catalog targets.</p>
            </div>
          ) : opportunitiesQuery.isError ? (
            <div className="p-12 text-center text-rose-600">
              <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-500" />
              <p className="font-bold">Unable to load regional opportunities</p>
              <p className="text-xs text-slate-500 mt-1">Check backend connectivity and permissions.</p>
              <Button size="sm" variant="outline" onClick={() => opportunitiesQuery.refetch()} className="mt-4">
                Retry
              </Button>
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="font-bold text-slate-700">No opportunities match the selected criteria</p>
              <p className="text-xs text-slate-400 mt-1">Add a new target opportunity or adjust your active filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="p-4">Commodity / Target Product</th>
                    <th className="p-4">Market Territory</th>
                    <th className="p-4">Demand Quota</th>
                    <th className="p-4">Claimed By</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Inspect & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedOpportunities.map((opp) => {
                    const isCancelled = opp.status === "cancelled";
                    return (
                      <tr key={opp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100/60 text-emerald-800 font-black">
                              <Leaf className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-black text-slate-900">{opp.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 capitalize">
                                  {opp.category}
                                </span>
                                {opp.productKey && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    #{opp.productKey}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                            <span>{opp.region}</span>
                          </div>
                          {opp.regionCode && (
                            <p className="text-[10px] font-mono text-slate-400 ml-5">{opp.regionCode}</p>
                          )}
                        </td>

                        <td className="p-4">
                          <div>
                            <span className="font-bold text-slate-900">
                              Target: {opp.minimumListings || 1} {opp.minimumListings === 1 ? "seller" : "sellers"}
                            </span>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Active stock listings: <span className="font-bold text-emerald-700">{opp.activeStockListings || 0}</span>
                            </p>
                          </div>
                        </td>

                        <td className="p-4">
                          <span
                            className={cn(
                              "font-medium",
                              opp.claimedByName && opp.claimedByName !== "Open to Verified Farmers"
                                ? "font-bold text-blue-800"
                                : "text-slate-500 italic"
                            )}
                          >
                            {opp.claimedByName || "Open to Verified Farmers"}
                          </span>
                        </td>

                        <td className="p-4">
                          <Badge variant="outline" className={cn("capitalize font-bold text-[11px]", statusColor(opp.status))}>
                            {opp.status.replace("_", " ")}
                          </Badge>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Eye button with 46px touch target */}
                            <Button
                              variant="outline"
                              title="Inspect Opportunity"
                              onClick={() => setSelectedOpportunityId(opp.id)}
                              className="h-[46px] w-[46px] p-0 rounded-xl border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-all shadow-xs"
                            >
                              <Eye className="!h-[26px] !w-[26px]" strokeWidth={2.2} />
                              <span className="sr-only">Inspect</span>
                            </Button>

                            {/* Dropdown actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 w-9 p-0 rounded-xl text-slate-500 hover:text-slate-900"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => setSelectedOpportunityId(opp.id)}>
                                  <Eye className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                                  <span>View Opportunity Dossier</span>
                                </DropdownMenuItem>

                                {isCancelled ? (
                                  <DropdownMenuItem
                                    disabled={!canManage}
                                    onClick={() =>
                                      setActionPromptTarget({
                                        id: opp.id,
                                        name: opp.name,
                                        action: "activate",
                                        expectedUpdatedAt: opp.updatedAt,
                                      })
                                    }
                                    className="text-emerald-700 font-bold"
                                  >
                                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                                    <span>Reopen Opportunity</span>
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    disabled={!canManage}
                                    onClick={() =>
                                      setActionPromptTarget({
                                        id: opp.id,
                                        name: opp.name,
                                        action: "cancel",
                                        expectedUpdatedAt: opp.updatedAt,
                                      })
                                    }
                                    className="text-rose-600"
                                  >
                                    <X className="mr-2 h-3.5 w-3.5" />
                                    <span>Cancel Opportunity</span>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredOpportunities.length > pageSize && (
            <div className="flex items-center justify-between border-t border-slate-100 p-4 text-xs">
              <span className="text-slate-500">
                Showing <b>{(page - 1) * pageSize + 1}</b> - <b>{Math.min(page * pageSize, filteredOpportunities.length)}</b> of{" "}
                <b>{filteredOpportunities.length}</b> opportunities
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg h-8 px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2 font-bold text-slate-700">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg h-8 px-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slide-over Inspection Drawer */}
      <Sheet open={Boolean(selectedOpportunityId)} onOpenChange={(open) => !open && setSelectedOpportunityId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0 bg-slate-50" hideCloseButton>
          <SheetHeader className="sr-only">
            <SheetTitle>Opportunity Inspection Dossier</SheetTitle>
            <SheetDescription>Examine regional commodity demand parameters, eligible farmers, and audit history.</SheetDescription>
          </SheetHeader>

          {detailQuery.isLoading ? (
            <div className="flex h-full items-center justify-center p-12">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : !selectedOpp ? (
            <div className="p-12 text-center text-slate-400">
              <AlertCircle className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-bold">Opportunity not found</p>
            </div>
          ) : (
            <div className="flex flex-col min-h-full">
              {/* Header Card */}
              <div className="bg-[#053f36] p-6 sm:p-7 text-white shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-full bg-emerald-500/30 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-200 border border-emerald-400/40">
                      {selectedOpp.category}
                    </span>
                    <h2 className="mt-3 text-xl sm:text-2xl font-black tracking-tight">{selectedOpp.name}</h2>
                    <p className="mt-1.5 text-xs sm:text-sm font-bold text-white/80 flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-lime-300 shrink-0" />
                      {selectedOpp.regionName || selectedOpp.region} ({selectedOpp.regionCode || "Regional Hub"})
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Badge variant="outline" className={cn("text-xs font-black uppercase px-3 py-1", statusColor(selectedOpp.status))}>
                      {selectedOpp.status.replace("_", " ")}
                    </Badge>
                    <button
                      onClick={() => setSelectedOpportunityId(null)}
                      aria-label="Close opportunity drawer"
                      className="h-10 w-10 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shrink-0 active:scale-95"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 border-t border-emerald-700/50 pt-5">
                  <div className="rounded-xl bg-white/10 p-3.5 border border-white/10 shadow-xs">
                    <span className="text-xs uppercase font-black tracking-wider text-emerald-200">Target Quota</span>
                    <p className="text-base sm:text-lg font-black text-white mt-0.5">{selectedOpp.minimumListings} Active Sellers</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3.5 border border-white/10 shadow-xs">
                    <span className="text-xs uppercase font-black tracking-wider text-emerald-200">Current Live Listings</span>
                    <p className="text-base sm:text-lg font-black text-lime-300 mt-0.5">{selectedOpp.currentListings || 0} Products</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="overview" className="flex-1 p-6 sm:p-7 space-y-6">
                <TabsList className="grid w-full grid-cols-3 bg-slate-200 h-12 p-1.5 rounded-xl">
                  <TabsTrigger value="overview" className="text-sm font-black rounded-lg">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="farmers" className="text-sm font-black rounded-lg">
                    Eligible Farmers ({detailQuery.data?.eligibleSellers?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="audit" className="text-sm font-black rounded-lg">
                    Audit Trail
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                  <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
                    <CardHeader className="p-5 pb-3 border-b border-slate-100">
                      <CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-500">
                        Operational Demand Parameters
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 sm:p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-100 gap-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">Product Identifier</span>
                        <span className="font-mono text-sm sm:text-base font-black text-slate-800">{selectedOpp.productKey || "N/A"}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-100 gap-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">Market Territory</span>
                        <span className="text-sm sm:text-base font-black text-slate-900">{selectedOpp.regionName || selectedOpp.region}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-100 gap-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">Eligible Producers in Region</span>
                        <span className="text-sm sm:text-base font-black text-emerald-800">{selectedOpp.eligibleSellersCount || 0} farmers</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-100 gap-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">Reservation / Claim Status</span>
                        <span className="text-sm sm:text-base font-bold text-slate-900">
                          {selectedOpp.claimedBy ? selectedOpp.claimedBy.name : "Open to All Certified Farmers"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-100 gap-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">Claim Expiry</span>
                        <span className="font-mono text-xs sm:text-sm font-bold text-slate-600">
                          {selectedOpp.claimExpiresAt ? new Date(selectedOpp.claimExpiresAt).toLocaleString() : "No active claim lock"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">Last Scanned / Updated</span>
                        <span className="font-mono text-xs sm:text-sm font-bold text-slate-600">{timeAgo(selectedOpp.updatedAt)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <div className="pt-2">
                    {selectedOpp.status === "cancelled" ? (
                      <Button
                        disabled={!canManage || updateStatusMutation.isPending}
                        onClick={() =>
                          setActionPromptTarget({
                            id: selectedOpp.id,
                            name: selectedOpp.name,
                            action: "activate",
                            expectedUpdatedAt: selectedOpp.updatedAt,
                          })
                        }
                        className="w-full h-12 sm:h-13 text-sm sm:text-base font-black rounded-xl bg-[#053f36] hover:bg-[#075347] text-white active:scale-[0.98] transition-all shadow-xs cursor-pointer"
                      >
                        <Sparkles className="mr-2 h-5 w-5 text-lime-300" /> Reopen Opportunity
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        disabled={!canManage || updateStatusMutation.isPending}
                        onClick={() =>
                          setActionPromptTarget({
                            id: selectedOpp.id,
                            name: selectedOpp.name,
                            action: "cancel",
                            expectedUpdatedAt: selectedOpp.updatedAt,
                          })
                        }
                        className="w-full h-12 sm:h-13 text-sm sm:text-base font-black rounded-xl border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 active:scale-[0.98] transition-all shadow-xs cursor-pointer"
                      >
                        <X className="mr-2 h-5 w-5" /> Cancel Opportunity
                      </Button>
                    )}
                  </div>
                </TabsContent>

                {/* Eligible Farmers Tab */}
                <TabsContent value="farmers" className="space-y-3">
                  {(detailQuery.data?.eligibleSellers?.length || 0) === 0 ? (
                    <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                      <Users className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                      <p className="text-sm font-bold text-slate-700">No active sellers assigned to this region yet</p>
                      <p className="text-xs text-slate-400 mt-1">Assign farmers to this region under Region Management.</p>
                    </div>
                  ) : (
                    detailQuery.data?.eligibleSellers.map((seller) => (
                      <Card key={seller.id} className="rounded-xl border-slate-200 bg-white p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-11 w-11 border border-slate-200 shadow-xs">
                              <AvatarImage src={seller.avatar || ""} />
                              <AvatarFallback className="bg-emerald-100 text-emerald-800 text-sm font-black">
                                {seller.name?.slice(0, 2).toUpperCase() || "FR"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-black text-slate-900 text-sm">{seller.name}</p>
                              <p className="text-xs text-slate-500 font-medium">{seller.email}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs font-black capitalize bg-emerald-50 text-emerald-800 border-emerald-200 px-2.5 py-0.5">
                            {seller.verificationStatus}
                          </Badge>
                        </div>
                      </Card>
                    ))
                  )}
                </TabsContent>

                {/* Audit Trail Tab */}
                <TabsContent value="audit" className="space-y-3">
                  {(detailQuery.data?.auditEvents?.length || 0) === 0 ? (
                    <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                      <Clock className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                      <p className="text-sm font-bold text-slate-700">No administrative audit events recorded yet</p>
                    </div>
                  ) : (
                    detailQuery.data?.auditEvents.map((event) => (
                      <Card key={event.id} className="rounded-xl border-slate-200 bg-white p-4 shadow-xs text-xs space-y-1.5">
                        <div className="flex items-center justify-between font-black text-slate-800 text-sm">
                          <span>{event.action}</span>
                          <span className="font-mono text-xs font-bold text-slate-400">{timeAgo(event.occurredAt)}</span>
                        </div>
                        <p className="text-slate-600 text-xs font-medium">Outcome: <span className="font-bold text-emerald-700">{event.outcome}</span></p>
                      </Card>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Regional Target Opportunity Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-2xl p-6 sm:p-7">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900">Add Regional Target Opportunity</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 font-medium">
              Establish a new product demand target for an agricultural market region.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-700">Market Territory *</Label>
              <Select value={newRegionId} onValueChange={setNewRegionId}>
                <SelectTrigger className="h-11 sm:h-12 text-sm font-bold rounded-xl">
                  <SelectValue placeholder="Select an operational territory" />
                </SelectTrigger>
                <SelectContent>
                  {regionsList.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-700">Commodity / Product Name *</Label>
              <Input
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="e.g. Organic Sharbati Wheat, Alphonso Mangoes"
                className="h-11 sm:h-12 text-sm font-bold rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-700">Category *</Label>
              <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                <SelectTrigger className="h-11 sm:h-12 text-sm font-bold rounded-xl">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-slate-700">Target Listing Quota *</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={newQuota}
                onChange={(e) => setNewQuota(e.target.value)}
                placeholder="Minimum active seller listings needed"
                className="h-11 sm:h-12 text-sm font-bold rounded-xl"
              />
              <p className="text-xs text-slate-400 font-medium">Opportunity remains open until this quota of approved products is reached.</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" className="h-12 px-6 text-sm font-black rounded-xl cursor-pointer" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newProductName.trim() || !newRegionId || createTargetMutation.isPending}
              onClick={() => {
                createTargetMutation.mutate({
                  productName: newProductName.trim(),
                  regionId: newRegionId,
                  categoryId: newCategoryId,
                  minimumActiveListings: Number(newQuota) || 2,
                });
              }}
              className="h-12 px-6 text-sm sm:text-base font-black rounded-xl bg-[#053f36] hover:bg-[#075347] text-white active:scale-[0.98] transition-all cursor-pointer"
            >
              {createTargetMutation.isPending ? "Creating..." : "Establish Target"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Prompt Dialog */}
      <Dialog open={Boolean(actionPromptTarget)} onOpenChange={(open) => !open && setActionPromptTarget(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6 sm:p-7">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900">
              {actionPromptTarget?.action === "cancel" ? "Cancel Opportunity" : "Reopen Opportunity"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 font-medium">
              Confirm status modification for <b>{actionPromptTarget?.name}</b>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-3">
            <Label className="text-xs font-black uppercase tracking-wider text-slate-700">Audit Justification Reason *</Label>
            <Input
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="Provide reason for this operational transition..."
              className="h-11 sm:h-12 text-sm font-bold rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" className="h-12 px-6 text-sm font-black rounded-xl cursor-pointer" onClick={() => setActionPromptTarget(null)}>
              Dismiss
            </Button>
            <Button
              disabled={!actionReason.trim() || updateStatusMutation.isPending}
              onClick={() => {
                if (actionPromptTarget) {
                  updateStatusMutation.mutate({
                    id: actionPromptTarget.id,
                    action: actionPromptTarget.action,
                    reason: actionReason.trim(),
                    expectedUpdatedAt: actionPromptTarget.expectedUpdatedAt,
                  });
                }
              }}
              className={
                actionPromptTarget?.action === "cancel"
                  ? "h-12 px-6 text-sm sm:text-base font-black rounded-xl bg-rose-600 hover:bg-rose-700 text-white active:scale-[0.98] transition-all cursor-pointer"
                  : "h-12 px-6 text-sm sm:text-base font-black rounded-xl bg-[#053f36] hover:bg-[#075347] text-white active:scale-[0.98] transition-all cursor-pointer"
              }
            >
              {updateStatusMutation.isPending ? "Saving..." : "Confirm Action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
