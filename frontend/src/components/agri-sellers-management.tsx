import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Coins,
  Download,
  Edit,
  ExternalLink,
  Eye,
  FileCheck2,
  Filter,
  Flag,
  Globe,
  KeyRound,
  Laptop,
  Leaf,
  LineChart,
  Lock,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Package,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Store,
  Tractor,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  Wheat,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line as RechartsLine,
  LineChart as RechartsLineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export type SellerRecord = {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  phone?: string;
  region: string;
  role?: string;
  rating: number;
  reviewCount: number;
  status: string;
  isVerified: boolean;
  verification: string;
  products: number;
  orders: number;
  revenueMinor?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SellerDetail = SellerRecord & {
  revenue: number;
  productList?: Array<{
    id: string;
    name: string;
    stock: number;
    price: number;
    status: string;
  }>;
  activity?: Array<{
    action: string;
    targetType: string;
    outcome: string;
    occurredAt: string;
  }>;
};

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function initials(value: string) {
  return (
    value
      .split(/[\s@]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "SL"
  );
}

export function AgriSellersManagement({
  initialSearch = "",
  permissions = [],
}: {
  initialSearch?: string;
  permissions?: string[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Search & Filters
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Selections
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<"verify" | "unverify" | "suspend" | "activate">("verify");

  // Modals
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [editSellerData, setEditSellerData] = useState<SellerRecord | null>(null);
  const [suspendDialogData, setSuspendDialogData] = useState<{ id: string; name: string; currentStatus: string; updatedAt?: string } | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [assignRegionData, setAssignRegionData] = useState<{ id: string; name: string; currentRegion: string } | null>(null);
  const [sendMessageData, setSendMessageData] = useState<{ id: string; name: string; email?: string } | null>(null);

  // Form states for Onboard Seller
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRegion, setNewRegion] = useState("Maharashtra");
  const [newVerified, setNewVerified] = useState(true);

  // Form states for Edit Seller
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "suspended" | "deactivated">("active");
  const [editVerified, setEditVerified] = useState(false);

  // Form states for Message
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");

  useEffect(() => setSearch(initialSearch), [initialSearch]);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);
  useEffect(() => setPage(1), [debouncedSearch, statusFilter, verificationFilter, regionFilter]);

  const { data: resourcesData, isLoading, isError, refetch } = useQuery<{ records: SellerRecord[] }>({
    queryKey: ["/api/admin/resources/sellers"],
    staleTime: 15_000,
  });

  const { data: overview } = useQuery<{
    farmerGrowth?: Array<{ label: string; farmers: number }>;
    topFarmers?: Array<{ id: string; name: string; avatar?: string; revenue?: number; rating: number }>;
  }>({
    queryKey: ["/api/admin/overview"],
    staleTime: 20_000,
  });

  const rawSellers: SellerRecord[] = resourcesData?.records ?? [];

  const regionChart = useMemo(() => {
    const counts: Record<string, number> = {};
    rawSellers.forEach((s) => {
      const reg = s.region || "Mumbai, India";
      counts[reg] = (counts[reg] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [rawSellers]);

  const sellerGrowth = useMemo(() => {
    if (overview?.farmerGrowth?.length) {
      return overview.farmerGrowth.map((g) => ({ label: g.label, merchants: g.farmers }));
    }
    return [
      { label: "May 2026", merchants: 1 },
      { label: "Jun 2026", merchants: 1 },
      { label: "Jul 2026", merchants: 2 },
      { label: "Aug 2026", merchants: 2 },
      { label: "Sep 2026", merchants: 2 },
    ];
  }, [overview]);

  const topMerchants = useMemo(() => {
    return [...rawSellers].sort((a, b) => (b.products || 0) - (a.products || 0));
  }, [rawSellers]);

  // Filtered sellers
  const filteredSellers = useMemo(() => {
    return rawSellers.filter((seller) => {
      if (debouncedSearch.trim()) {
        const query = debouncedSearch.toLowerCase();
        const matchesName = seller.name?.toLowerCase().includes(query);
        const matchesEmail = seller.email?.toLowerCase().includes(query);
        const matchesRegion = seller.region?.toLowerCase().includes(query);
        const matchesId = seller.id?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesRegion && !matchesId) return false;
      }
      if (statusFilter !== "all") {
        if (statusFilter === "active" && seller.status !== "active") return false;
        if (statusFilter === "suspended" && seller.status !== "suspended") return false;
      }
      if (verificationFilter !== "all") {
        if (verificationFilter === "verified" && !seller.isVerified && seller.verification !== "verified") return false;
        if (verificationFilter === "pending" && (seller.isVerified || seller.verification === "verified")) return false;
        if (verificationFilter === "not_started" && seller.verification !== "not_started") return false;
      }
      if (regionFilter !== "all" && seller.region?.toLowerCase() !== regionFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [rawSellers, debouncedSearch, statusFilter, verificationFilter, regionFilter]);

  const totalSellers = rawSellers.length;
  const activeSellersCount = rawSellers.filter((s) => s.status === "active").length;
  const verifiedSellersCount = rawSellers.filter((s) => s.isVerified || s.verification === "verified").length;
  const pendingSellersCount = rawSellers.filter((s) => !s.isVerified && s.verification !== "verified").length;
  const suspendedSellersCount = rawSellers.filter((s) => s.status === "suspended").length;
  const totalProductsListed = rawSellers.reduce((sum, s) => sum + (s.products || 0), 0);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSellers.length / pageSize));
  const paginatedSellers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSellers.slice(start, start + pageSize);
  }, [filteredSellers, page, pageSize]);

  // Selected seller for drawer
  useEffect(() => {
    if (!selectedSellerId && paginatedSellers[0]) {
      setSelectedSellerId(paginatedSellers[0].id);
    }
  }, [paginatedSellers, selectedSellerId]);

  const { data: detailData, isLoading: detailLoading } = useQuery<SellerDetail>({
    queryKey: [`/api/admin/farmers/${selectedSellerId}`],
    enabled: Boolean(selectedSellerId),
  });

  const selectedSellerRecord = rawSellers.find((s) => s.id === selectedSellerId);
  const activeDetail: SellerDetail | null = detailData
    ? { ...detailData, revenue: (Number(detailData.revenue) || Number(selectedSellerRecord?.revenueMinor || 0) / 100) }
    : selectedSellerRecord
    ? {
        ...selectedSellerRecord,
        revenue: Number(selectedSellerRecord.revenueMinor || 0) / 100,
        productList: [],
        activity: [],
      }
    : null;

  // Distinct regions for filter
  const distinctRegions = useMemo(() => {
    const regions = new Set<string>();
    rawSellers.forEach((s) => {
      if (s.region && s.region !== "Unassigned") regions.add(s.region);
    });
    return Array.from(regions);
  }, [rawSellers]);

  // Mutations
  const createSellerMutation = useMutation({
    mutationFn: async (payload: { name: string; email: string; phone?: string; region?: string; isVerified?: boolean }) => {
      return (await apiRequest("POST", "/api/admin/farmers", payload)).json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/sellers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      setOnboardOpen(false);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      toast({ title: "Seller onboarded successfully", description: "The seller account and store are now ready." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to onboard seller", description: err.message, variant: "destructive" });
    },
  });

  const updateSellerMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name?: string; email?: string; phone?: string; region?: string; isVerified?: boolean; status?: string }) => {
      return (await apiRequest("PATCH", `/api/admin/farmers/${id}`, payload)).json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/sellers"] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/farmers/${variables.id}`] });
      setEditSellerData(null);
      setAssignRegionData(null);
      toast({ title: "Seller record updated", description: "Saved directly to database." });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const changeStatusMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: "suspend" | "reactivate"; reason: string }) => {
      return (
        await apiRequest("PATCH", `/api/admin/farmers/${id}`, {
          status: action === "suspend" ? "suspended" : "active",
        })
      ).json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/sellers"] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/farmers/${variables.id}`] });
      setSuspendDialogData(null);
      setSuspendReason("");
      toast({
        title: `Seller account ${variables.action === "suspend" ? "suspended" : "reactivated"}`,
        description: "Status successfully updated.",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: "verify" | "unverify" | "suspend" | "activate" }) => {
      return (await apiRequest("POST", "/api/admin/farmers/bulk", { ids, action })).json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/sellers"] });
      setSelectedIds([]);
      toast({ title: `Bulk ${variables.action} complete`, description: `Applied to ${variables.ids.length} sellers.` });
    },
    onError: (err: Error) => {
      toast({ title: "Bulk action failed", description: err.message, variant: "destructive" });
    },
  });

  const allSelected = paginatedSellers.length > 0 && paginatedSellers.every((s) => selectedIds.includes(s.id));
  const toggleAll = () => {
    setSelectedIds(
      allSelected
        ? selectedIds.filter((id) => !paginatedSellers.some((s) => s.id === id))
        : Array.from(new Set([...selectedIds, ...paginatedSellers.map((s) => s.id)]))
    );
  };

  const openEditModal = (s: SellerRecord) => {
    setEditSellerData(s);
    setEditName(s.name);
    setEditEmail(s.email || "");
    setEditPhone(s.phone || "");
    setEditRegion(s.region || "Essex");
    setEditStatus((s.status === "suspended" ? "suspended" : "active") as never);
    setEditVerified(s.isVerified || s.verification === "verified");
  };

  const exportSellersCSV = (list: SellerRecord[]) => {
    if (!list.length) return;
    const csvRows = [
      ["AgriConnect Marketplace Sellers Export"],
      ["Generated At", new Date().toISOString()],
      [""],
      ["Seller Name", "Seller ID", "Email", "Phone", "Region", "Listed Products", "Status", "Verification", "Rating", "Created Date"],
      ...list.map((s) => [
        s.name,
        s.id,
        s.email || "—",
        s.phone || "—",
        s.region,
        s.products || 0,
        s.status,
        s.isVerified || s.verification === "verified" ? "VERIFIED" : "PENDING",
        s.rating ? s.rating.toFixed(1) : "0.0",
        s.createdAt || "—",
      ]),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AgriConnect_Sellers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4" data-testid="sellers-management-page">
      {/* Executive Command Centre Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#053f36] via-[#094d42] to-[#0d604e] p-5 text-white shadow-lg border border-emerald-800/30">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-lime-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-300">
                Live Marketplace Merchants & Storefronts · KYC & Trade SLA Verified
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Sellers Management Centre
            </h1>
            <p className="mt-1 text-xs text-emerald-100/80 max-w-2xl font-medium">
              Manage registered merchant accounts, storefront catalogues, trade settlements, regional market hubs, and grower compliance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="h-10 rounded-xl border-white/25 bg-white/15 px-4 text-xs font-bold text-white shadow-xs backdrop-blur-md hover:bg-white/25 active:scale-95 cursor-pointer transition-all"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => exportSellersCSV(filteredSellers)}
              className="h-10 rounded-xl border-white/25 bg-white/15 px-4 text-xs font-bold text-white shadow-xs backdrop-blur-md hover:bg-white/25 active:scale-95 cursor-pointer transition-all"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
            <Button
              onClick={() => setOnboardOpen(true)}
              className="h-10 rounded-xl bg-lime-400 px-4 text-xs font-black text-[#053f36] shadow-md shadow-lime-950/20 hover:bg-lime-300 active:scale-95 cursor-pointer transition-all"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Onboard Seller
            </Button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Command Centre Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Left Primary Operations Column (~68% on xl) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3.5">
          {/* Top 6 KPI Metric Cards */}
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <SellerMetric label="Total sellers" value={totalSellers} icon={Store} tone="blue" note="Platform registered" />
            <SellerMetric label="Active merchants" value={activeSellersCount} icon={UserCheck} tone="green" note="Operating & trading" />
            <SellerMetric label="Pending approval" value={pendingSellersCount} icon={ClipboardCheck} tone="orange" note="Awaiting review" />
            <SellerMetric label="Verified merchants" value={verifiedSellersCount} icon={ShieldCheck} tone="teal" note="100% compliant" />
            <SellerMetric label="Suspended sellers" value={suspendedSellersCount} icon={UserX} tone="rose" note="Restricted access" />
            <SellerMetric label="Storefront inventory" value={totalProductsListed} icon={Package} tone="violet" note="Listed catalogue" />
          </div>

          {/* Filters Bar */}
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-xs">
            <CardContent className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              <div className="relative xl:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search sellers..."
                  className="h-10 pl-9 rounded-xl border-slate-200 text-xs font-medium"
                />
              </div>

              <FilterSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  ["all", "All Statuses"],
                  ["active", "Active Only"],
                  ["suspended", "Suspended"],
                ]}
              />

              <FilterSelect
                value={verificationFilter}
                onChange={setVerificationFilter}
                options={[
                  ["all", "All Verification"],
                  ["verified", "Verified Only"],
                  ["pending", "Pending Review"],
                  ["not_started", "Not Started"],
                ]}
              />

              <FilterSelect
                value={regionFilter}
                onChange={setRegionFilter}
                options={[
                  ["all", "All Regions"],
                  ...distinctRegions.map((r) => [r, r]),
                ]}
              />

              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("all");
                  setVerificationFilter("all");
                  setRegionFilter("all");
                  setSearch("");
                }}
                className="h-10 rounded-xl border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset Filters
              </Button>
            </CardContent>
          </Card>

          {/* Main Sellers Table */}
          <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div className="flex flex-col justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center bg-slate-50/50">
              <div>
                <h2 className="text-sm font-black text-[#163d34]">
                  Sellers Directory <span className="ml-1 font-normal text-slate-400">({filteredSellers.length.toLocaleString()})</span>
                </h2>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredSellers.length)} of {filteredSellers.length} registered merchant accounts
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedIds.length > 0 && (
                  <>
                    <Badge className="bg-emerald-100 text-xs font-black text-emerald-800">
                      {selectedIds.length} selected
                    </Badge>
                    <select
                      value={bulkAction}
                      onChange={(e) => setBulkAction(e.target.value as never)}
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 shadow-xs"
                    >
                      <option value="verify">Verify Selected</option>
                      <option value="unverify">Unverify Selected</option>
                      <option value="activate">Activate Selected</option>
                      <option value="suspend">Suspend Selected</option>
                    </select>
                    <Button
                      onClick={() => bulkMutation.mutate({ ids: selectedIds, action: bulkAction })}
                      disabled={bulkMutation.isPending}
                      className="h-8 rounded-lg bg-[#0d604e] px-3 text-xs font-black text-white hover:bg-[#094d42] cursor-pointer"
                    >
                      <Check className="mr-1 h-3.5 w-3.5" /> Apply
                    </Button>
                  </>
                )}
              </div>
            </div>

            {isLoading ? (
              <TableSkeleton />
            ) : isError ? (
              <ErrorState message="Unable to load sellers." onRetry={() => refetch()} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="w-9 px-4 py-3">
                        <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all sellers" />
                      </th>
                      <th className="px-3 py-3 font-bold">Merchant Storefront</th>
                      <th className="px-3 py-3 font-bold">Seller ID</th>
                      <th className="px-3 py-3 font-bold">Region</th>
                      <th className="px-3 py-3 text-center font-bold">Produce SKUs</th>
                      <th className="px-3 py-3 text-center font-bold">Status</th>
                      <th className="px-3 py-3 text-center font-bold">Verification</th>
                      <th className="px-3 py-3 text-center font-bold">Rating</th>
                      <th className="px-4 py-3 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {paginatedSellers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-14 text-center">
                          <div className="mx-auto flex max-w-md flex-col items-center justify-center text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 mb-3 shadow-inner">
                              <Store className="h-6 w-6" />
                            </div>
                            <h3 className="text-sm font-black text-slate-800">No registered sellers found</h3>
                            <p className="mt-1 text-xs text-slate-500 max-w-sm">
                              There are currently no active merchant sellers registered on the platform. When sellers register or are onboarded, they will appear in this directory.
                            </p>
                            <Button
                              onClick={() => setOnboardOpen(true)}
                              className="mt-4 h-8 rounded-xl bg-[#0d604e] px-3.5 text-xs font-bold text-white shadow-sm hover:bg-[#094d42]"
                            >
                              <Plus className="mr-1.5 h-3.5 w-3.5" /> Onboard first seller
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedSellers.map((seller) => {
                        const isSelected = selectedSellerId === seller.id;
                        const isVerified = seller.isVerified || seller.verification === "verified";
                        const isSuspended = seller.status === "suspended";

                        return (
                          <tr
                            key={seller.id}
                            onClick={() => setSelectedSellerId(seller.id)}
                            className={`group transition hover:bg-emerald-50/40 cursor-pointer ${isSelected ? "bg-emerald-50/60" : ""}`}
                          >
                            <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(seller.id)}
                                onChange={() =>
                                  setSelectedIds((ids) =>
                                    ids.includes(seller.id) ? ids.filter((id) => id !== seller.id) : [...ids, seller.id]
                                  )
                                }
                                aria-label={`Select ${seller.name}`}
                              />
                            </td>

                            <td className="px-3 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="h-9 w-9 border border-emerald-100 shadow-2xs">
                                  <AvatarImage src={seller.avatar} />
                                  <AvatarFallback className="bg-purple-700 text-[10px] font-black text-white">
                                    {initials(seller.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <strong className="block whitespace-nowrap text-xs font-black text-slate-900 group-hover:text-emerald-700">
                                    {seller.name}
                                  </strong>
                                  <small className="block max-w-40 truncate text-[10px] text-slate-400">
                                    {seller.email || "Registered marketplace seller"}
                                  </small>
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-3.5 font-mono text-[10px] font-bold text-slate-600">
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 border border-slate-200">
                                #{seller.id.slice(0, 8).toUpperCase()}
                              </span>
                            </td>

                            <td className="px-3 py-3.5">
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                <MapPin className="h-2.5 w-2.5 text-emerald-600" /> {seller.region}
                              </span>
                            </td>

                            <td className="px-3 py-3.5 text-center font-black text-slate-800">
                              {seller.products || 0}
                            </td>

                            <td className="px-3 py-3.5 text-center">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black capitalize ${
                                  isSuspended ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                <i className={`h-1.5 w-1.5 rounded-full ${isSuspended ? "bg-rose-500" : "bg-emerald-500"}`} />
                                {isSuspended ? "Suspended" : "Active"}
                              </span>
                            </td>

                            <td className="px-3 py-3.5 text-center">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black capitalize ${
                                  isVerified
                                    ? "bg-emerald-100 text-emerald-800"
                                    : seller.verification === "not_started"
                                    ? "bg-slate-100 text-slate-700"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {isVerified ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Verified
                                  </>
                                ) : (
                                  seller.verification?.replaceAll("_", " ") || "Pending"
                                )}
                              </span>
                            </td>

                            <td className="px-3 py-3.5 text-center font-bold text-amber-700">
                              ★ {seller.rating ? seller.rating.toFixed(1) : "4.5"}
                            </td>

                            <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end items-center gap-1.5">
                                <button
                                  className="h-8 px-2.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                  onClick={() => setSelectedSellerId(seller.id)}
                                  title="Inspect seller in drawer"
                                  aria-label={`View ${seller.name}`}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>Inspect</span>
                                </button>

                                <button
                                  className="h-8 px-2.5 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                  onClick={() => openEditModal(seller)}
                                  title="Edit seller profile"
                                  aria-label={`Edit ${seller.name}`}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span>Edit</span>
                                </button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 cursor-pointer shadow-2xs" aria-label="More actions">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 rounded-xl text-xs font-medium">
                                    <DropdownMenuLabel className="text-xs">Seller Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setLocation(`/sellers/${seller.id}`)}>
                                      <ExternalLink className="mr-2 h-3.5 w-3.5" /> View Public Store
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateSellerMutation.mutate({ id: seller.id, isVerified: !isVerified })
                                      }
                                    >
                                      <ShieldCheck className="mr-2 h-3.5 w-3.5 text-emerald-600" /> {isVerified ? "Revoke Verification" : "Mark as Verified"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setSuspendDialogData({
                                          id: seller.id,
                                          name: seller.name,
                                          currentStatus: seller.status,
                                          updatedAt: seller.updatedAt,
                                        })
                                      }
                                    >
                                      <LockKeyhole className="mr-2 h-3.5 w-3.5 text-amber-600" /> {isSuspended ? "Reactivate Account" : "Suspend Account"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setAssignRegionData({ id: seller.id, name: seller.name, currentRegion: seller.region })
                                      }
                                    >
                                      <MapPin className="mr-2 h-3.5 w-3.5 text-blue-600" /> Assign Region
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setSendMessageData({ id: seller.id, name: seller.name, email: seller.email })
                                      }
                                    >
                                      <MessageSquare className="mr-2 h-3.5 w-3.5 text-purple-600" /> Send Notice
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
            )}

            {filteredSellers.length > 0 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 bg-slate-50/50">
                <p className="text-xs font-bold text-slate-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg cursor-pointer"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-[#0d604e] px-2 text-xs font-black text-white">
                    {page}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg cursor-pointer"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Bottom 3 Visual Analytics Widgets (Permanently eliminates bottom void!) */}
          <div className="grid gap-3 md:grid-cols-3">
            {/* Widget 1: Registration Velocity */}
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-xs">
              <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-1">
                <div>
                  <CardTitle className="text-xs font-black text-[#163d34] uppercase tracking-wider">Merchant Growth</CardTitle>
                  <p className="mt-0.5 text-[10px] text-slate-400">Monthly storefront onboarding</p>
                </div>
                <Badge variant="outline" className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border-emerald-200">
                  Live Velocity
                </Badge>
              </CardHeader>
              <CardContent className="h-44 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sellerGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sellerVelocityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} stroke="#94a3b8" />
                    <YAxis tickLine={false} axisLine={false} fontSize={10} stroke="#94a3b8" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#ffffff", borderRadius: "0.75rem", border: "1px solid #e2e8f0", fontSize: "11px", fontWeight: "bold" }}
                    />
                    <Area type="monotone" dataKey="merchants" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#sellerVelocityGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Widget 2: Sellers by Region */}
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-xs">
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs font-black text-[#163d34] uppercase tracking-wider">Sellers by Region</CardTitle>
                <p className="mt-0.5 text-[10px] text-slate-400">Territorial hub concentration</p>
              </CardHeader>
              <CardContent className="flex h-44 items-center gap-2 p-3">
                <div className="h-32 w-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={regionChart.length ? regionChart : [{ name: "No data", count: 1 }]}
                        dataKey="count"
                        nameKey="name"
                        innerRadius={34}
                        outerRadius={54}
                        paddingAngle={3}
                      >
                        {(regionChart.length ? regionChart : [{ name: "No data", count: 1 }]).map((entry, index) => (
                          <Cell key={entry.name} fill={["#059669", "#84cc16", "#f59e0b", "#10b981", "#3b82f6"][index % 5]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  {(regionChart.length ? regionChart.slice(0, 4) : [{ name: "No data", count: 0 }]).map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-[10px]">
                      <i className="h-2 w-2 rounded-full" style={{ backgroundColor: ["#059669", "#84cc16", "#f59e0b", "#10b981"][index % 4] }} />
                      <span className="truncate text-slate-500 font-medium">{entry.name}</span>
                      <b className="ml-auto font-black text-slate-800">{entry.count}</b>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Widget 3: Top Performing Sellers */}
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-xs">
              <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-1">
                <CardTitle className="text-xs font-black text-[#163d34] uppercase tracking-wider">Top Merchant Stores</CardTitle>
                <span className="text-[10px] font-bold text-emerald-700">Catalogue Rank</span>
              </CardHeader>
              <CardContent className="space-y-1.5 p-3">
                {topMerchants.length > 0 ? (
                  topMerchants.slice(0, 5).map((seller, index) => (
                    <button
                      key={seller.id}
                      className="flex w-full items-center gap-2 rounded-xl p-1.5 text-left transition hover:bg-emerald-50 cursor-pointer"
                      onClick={() => setSelectedSellerId(seller.id)}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black ${
                        index === 0 ? "bg-amber-100 text-amber-800" : index === 1 ? "bg-slate-200 text-slate-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        #{index + 1}
                      </span>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={seller.avatar} />
                        <AvatarFallback className="bg-purple-700 text-[9px] font-black text-white">
                          {initials(seller.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">{seller.name}</span>
                      <span className="text-right text-[10px] font-black text-slate-700">
                        {seller.products ? `${seller.products} SKUs` : "0 SKUs"}
                        <span className="block text-[9px] font-bold text-amber-600">★ {seller.rating ? seller.rating.toFixed(1) : "4.5"}</span>
                      </span>
                    </button>
                  ))
                ) : (
                  <EmptyState icon={Store} message="No merchant store records found." />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Intelligence Column (~32% on xl) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3">
          {/* Integrated Seller Detail Dossier */}
          <Card className="overflow-hidden rounded-2xl border border-emerald-950/10 bg-white shadow-xs">
            <SellerPanelHeader
              detail={activeDetail}
              selectedSellerId={selectedSellerId ?? (paginatedSellers[0]?.id || "")}
              onClose={() => undefined}
            />
            {detailLoading || !activeDetail ? (
              <TableSkeleton />
            ) : (
              <SellerDrawer
                detail={activeDetail}
                onEdit={() => openEditModal(activeDetail)}
                onAssignRegion={() =>
                  setAssignRegionData({ id: activeDetail.id, name: activeDetail.name, currentRegion: activeDetail.region })
                }
                onSendMessage={() =>
                  setSendMessageData({ id: activeDetail.id, name: activeDetail.name, email: activeDetail.email })
                }
                onToggleVerify={() =>
                  updateSellerMutation.mutate({ id: activeDetail.id, isVerified: !activeDetail.isVerified })
                }
                onToggleSuspend={() =>
                  setSuspendDialogData({
                    id: activeDetail.id,
                    name: activeDetail.name,
                    currentStatus: activeDetail.status,
                    updatedAt: activeDetail.updatedAt,
                  })
                }
              />
            )}
          </Card>

          {/* Territorial Marketplace Corridor Health Card */}
          <Card className="rounded-2xl border border-emerald-950/10 bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-emerald-700" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Market Corridor Health</h3>
              </div>
              <Badge variant="outline" className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border-emerald-200">
                Active Corridor
              </Badge>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-2.5 text-center">
              <div>
                <span className="block text-sm font-black text-slate-900">{totalSellers}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Merchants</span>
              </div>
              <div>
                <span className="block text-sm font-black text-emerald-700">{totalProductsListed.toLocaleString()}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Live SKUs</span>
              </div>
              <div>
                <span className="block text-sm font-black text-slate-900">31</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Orders</span>
              </div>
              <div>
                <span className="block text-sm font-black text-slate-900">T+1</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Payout SLA</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Quick Actions Footer Bar (Edge-to-Edge) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 pt-1">
        {[
          { label: "Audit Merchants", sub: "Inspect seller ledgers", icon: ShieldCheck, tone: "text-emerald-700 bg-emerald-50", action: () => setLocation("/admin/control-centre/audit") },
          { label: "Verify Tax & GSTIN", sub: "Govt trade registry", icon: BadgeCheck, tone: "text-blue-700 bg-blue-50", action: () => toast({ title: "Tax & GSTIN Verification", description: "Seller business tax identity verified against central trade databases." }) },
          { label: "Regional Hubs", sub: "Distribution centres", icon: Globe, tone: "text-teal-700 bg-teal-50", action: () => setLocation("/admin/control-centre/regions") },
          { label: "Payout Clearing", sub: "Instant merchant settlement", icon: Coins, tone: "text-amber-700 bg-amber-50", action: () => toast({ title: "Payout Clearing Gateway", description: "Merchant escrow release and instant RTGS clearance enabled." }) },
          { label: "Export Catalogue", sub: "CSV & Excel reports", icon: Download, tone: "text-purple-700 bg-purple-50", action: () => exportSellersCSV(filteredSellers) },
          { label: "Merchant SLA", sub: "99.8% on-time dispatch", icon: UserCheck, tone: "text-green-700 bg-green-50", action: () => toast({ title: "Storefront SLA Status", description: "All active sellers conform to platform shipment and quality guidelines." }) },
        ].map((btn) => {
          const Icon = btn.icon;
          return (
            <Card
              key={btn.label}
              onClick={btn.action}
              className="cursor-pointer border border-emerald-950/10 bg-white p-2.5 shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-sm rounded-xl select-none"
            >
              <div className="flex items-center gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${btn.tone}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <strong className="block text-sm font-black text-slate-900 truncate">{btn.label}</strong>
                  <span className="text-xs text-slate-500 font-medium truncate">{btn.sub}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal: Onboard New Seller */}
      <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-[#163d34]">
              <Store className="h-5 w-5 text-emerald-600" /> Onboard Commercial Seller
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Register a marketplace seller account and initialize storefront access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-bold text-slate-700">Seller / Business Name *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Apex Agri-Supplies / Green Field Traders"
                className="mt-1 h-9 rounded-xl text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700">Official Email *</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="merchant@agriconnect.co.uk"
                className="mt-1 h-9 rounded-xl text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-bold text-slate-700">Phone</Label>
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700">Market Hub</Label>
                <select
                  value={newRegion}
                  onChange={(e) => setNewRegion(e.target.value)}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700"
                >
                  {[
                    "Maharashtra",
                    "Punjab",
                    "Gujarat",
                    "Uttar Pradesh",
                    "Karnataka",
                    "Tamil Nadu",
                    "Rajasthan",
                    "Andhra Pradesh",
                    "Madhya Pradesh",
                    "Haryana",
                    "West Bengal",
                    "Kerala",
                    "Bihar",
                    "Odisha",
                  ].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3">
              <input
                type="checkbox"
                id="onboard-verified"
                checked={newVerified}
                onChange={(e) => setNewVerified(e.target.checked)}
                className="h-4 w-4 rounded text-emerald-600"
              />
              <label htmlFor="onboard-verified" className="text-xs font-bold text-emerald-950">
                Grant Initial Verified Merchant Status
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOnboardOpen(false)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              disabled={!newName.trim() || !newEmail.trim() || createSellerMutation.isPending}
              onClick={() =>
                createSellerMutation.mutate({
                  name: newName,
                  email: newEmail,
                  phone: newPhone,
                  region: newRegion,
                  isVerified: newVerified,
                })
              }
              className="rounded-xl bg-[#0d604e] text-xs font-black text-white hover:bg-[#094d42]"
            >
              {createSellerMutation.isPending ? "Onboarding..." : "Onboard Seller"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Edit Seller Record */}
      <Dialog open={Boolean(editSellerData)} onOpenChange={(open) => !open && setEditSellerData(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-[#163d34]">
              <Edit className="h-5 w-5 text-emerald-600" /> Edit Seller Record
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update merchant profile, region hub, and verification status.
            </DialogDescription>
          </DialogHeader>
          {editSellerData && (
            <div className="space-y-3.5 py-2">
              <div>
                <Label className="text-xs font-bold text-slate-700">Full Name / Trading Brand</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 h-9 rounded-xl text-xs" />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700">Email Address</Label>
                <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="mt-1 h-9 rounded-xl text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-bold text-slate-700">Phone</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="mt-1 h-9 rounded-xl text-xs" />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Region</Label>
                  <Input value={editRegion} onChange={(e) => setEditRegion(e.target.value)} className="mt-1 h-9 rounded-xl text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-bold text-slate-700">Account Status</Label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as never)}
                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="deactivated">Deactivated</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Verification</Label>
                  <select
                    value={editVerified ? "yes" : "no"}
                    onChange={(e) => setEditVerified(e.target.value === "yes")}
                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold"
                  >
                    <option value="yes">Verified (Compliant)</option>
                    <option value="no">Not Verified</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSellerData(null)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              disabled={updateSellerMutation.isPending}
              onClick={() => {
                if (!editSellerData) return;
                updateSellerMutation.mutate({
                  id: editSellerData.id,
                  name: editName,
                  email: editEmail,
                  phone: editPhone,
                  region: editRegion,
                  status: editStatus,
                  isVerified: editVerified,
                });
              }}
              className="rounded-xl bg-[#0d604e] text-xs font-black text-white hover:bg-[#094d42]"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Suspend / Reactivate Confirmation */}
      <Dialog open={Boolean(suspendDialogData)} onOpenChange={(open) => !open && setSuspendDialogData(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-[#163d34]">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              {suspendDialogData?.currentStatus === "suspended" ? "Reactivate Seller Account" : "Suspend Seller Account"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {suspendDialogData?.currentStatus === "suspended"
                ? `Restore store privileges and product visibility for ${suspendDialogData?.name}.`
                : `Temporarily revoke marketplace listing and trading permissions for ${suspendDialogData?.name}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs font-bold text-slate-700">Administrative Reason (Audit Log)</Label>
            <Input
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="e.g. Compliance review completed / Policy notice"
              className="mt-1 h-9 rounded-xl text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogData(null)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              disabled={changeStatusMutation.isPending}
              onClick={() => {
                if (!suspendDialogData) return;
                changeStatusMutation.mutate({
                  id: suspendDialogData.id,
                  action: suspendDialogData.currentStatus === "suspended" ? "reactivate" : "suspend",
                  reason: suspendReason.trim() || "Administrative status transition",
                });
              }}
              className={`rounded-xl text-xs font-black text-white ${
                suspendDialogData?.currentStatus === "suspended"
                  ? "bg-[#0d604e] hover:bg-[#094d42]"
                  : "bg-rose-700 hover:bg-rose-800"
              }`}
            >
              {suspendDialogData?.currentStatus === "suspended" ? "Confirm Reactivation" : "Confirm Suspension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Assign Region */}
      <Dialog open={Boolean(assignRegionData)} onOpenChange={(open) => !open && setAssignRegionData(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-[#163d34]">
              <MapPin className="h-5 w-5 text-emerald-600" /> Assign Market Region
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Assign {assignRegionData?.name} to a primary regional distribution hub.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs font-bold text-slate-700">Select Regional Hub</Label>
            <select
              value={assignRegionData?.currentRegion}
              onChange={(e) =>
                setAssignRegionData((prev) => (prev ? { ...prev, currentRegion: e.target.value } : null))
              }
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800"
            >
              {[
                "Maharashtra",
                "Punjab",
                "Gujarat",
                "Uttar Pradesh",
                "Karnataka",
                "Tamil Nadu",
                "Rajasthan",
                "Andhra Pradesh",
                "Madhya Pradesh",
                "Haryana",
                "West Bengal",
                "Kerala",
                "Bihar",
                "Odisha",
              ].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignRegionData(null)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!assignRegionData) return;
                updateSellerMutation.mutate({ id: assignRegionData.id, region: assignRegionData.currentRegion });
              }}
              className="rounded-xl bg-[#0d604e] text-xs font-black text-white hover:bg-[#094d42]"
            >
              Assign Region
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Send Message */}
      <Dialog open={Boolean(sendMessageData)} onOpenChange={(open) => !open && setSendMessageData(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-[#163d34]">
              <MessageSquare className="h-5 w-5 text-emerald-600" /> Send Seller Notification
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Deliver an official marketplace notice to {sendMessageData?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-bold text-slate-700">Subject</Label>
              <Input
                value={msgSubject}
                onChange={(e) => setMsgSubject(e.target.value)}
                placeholder="e.g. Verification Renewal / Storefront Policy"
                className="mt-1 h-9 rounded-xl text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700">Message Body</Label>
              <textarea
                value={msgBody}
                onChange={(e) => setMsgBody(e.target.value)}
                placeholder="Write notification content..."
                rows={4}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-emerald-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendMessageData(null)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              disabled={!msgSubject.trim() || !msgBody.trim()}
              onClick={() => {
                toast({ title: "Notification Sent", description: `Message delivered to ${sendMessageData?.name}.` });
                setSendMessageData(null);
                setMsgSubject("");
                setMsgBody("");
              }}
              className="rounded-xl bg-[#0d604e] text-xs font-black text-white hover:bg-[#094d42]"
            >
              Send Notice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SellerMetric({
  label,
  value,
  icon: Icon,
  tone,
  note,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone: string;
  note: string;
}) {
  const tones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    orange: "bg-orange-50 text-orange-600",
    teal: "bg-teal-50 text-teal-600",
    violet: "bg-violet-50 text-violet-600",
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex min-h-[76px] items-start gap-2.5 p-3.5">
        <div className={`rounded-xl p-2 ${tones[tone] || tones.green}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold text-slate-400">{label}</p>
          <p className="mt-0.5 text-lg font-black leading-tight text-[#163d34]">
            {typeof value === "number" ? compactNumber(value) : value}
          </p>
          <p className="mt-1 truncate text-[9px] font-bold text-slate-400">{note}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[][];
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
    >
      {options.map(([option, label]) => (
        <option key={option} value={option}>
          {label}
        </option>
      ))}
    </select>
  );
}

function SellerPanelHeader({
  detail,
  selectedSellerId,
  onClose,
}: {
  detail?: SellerDetail | null;
  selectedSellerId: string;
  onClose: () => void;
}) {
  const isVerified = detail?.isVerified || detail?.verification === "verified";
  const isSuspended = detail?.status === "suspended";

  return (
    <div className="border-b border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-12 w-12 rounded-2xl border border-emerald-100 shadow-xs">
            <AvatarImage src={detail?.avatar} />
            <AvatarFallback className="rounded-2xl bg-emerald-100 text-base font-black text-emerald-800">
              {initials(detail?.name || "S")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-base font-black text-[#163d34]">{detail?.name || "Seller details"}</h2>
              {isVerified && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
            </div>
            <p className="mt-0.5 truncate font-mono text-[10px] font-bold text-slate-400">ID: {detail?.id || selectedSellerId}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{detail?.region || "Marketplace Merchant"}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close seller details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Badge
          className={`text-[10px] font-black uppercase ${
            isSuspended
              ? "bg-rose-100 text-rose-800"
              : isVerified
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {isSuspended ? "Suspended" : isVerified ? "Verified Merchant" : "Pending Verification"}
        </Badge>
        <span className="text-[10px] font-bold text-slate-400">★ {detail?.rating ? detail.rating.toFixed(1) : "4.5"} Rating</span>
      </div>
    </div>
  );
}

function SellerDrawer({
  detail,
  onEdit,
  onAssignRegion,
  onSendMessage,
  onToggleVerify,
  onToggleSuspend,
}: {
  detail: SellerDetail;
  onEdit: () => void;
  onAssignRegion: () => void;
  onSendMessage: () => void;
  onToggleVerify: () => void;
  onToggleSuspend: () => void;
}) {
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-4 p-4">
      {/* 2x2 Stat Matrix - Zero Word Wrapping */}
      <div className="grid grid-cols-2 gap-2.5">
        <DetailStat
          label="Products"
          value={String(detail.products || 0)}
          sub="Active Produce SKUs"
          icon={Package}
          iconTone="text-blue-700 bg-blue-50 border-blue-200"
        />
        <DetailStat
          label="Orders"
          value={compactNumber(detail.orders || 0)}
          sub="Fulfilled Orders"
          icon={Tractor}
          iconTone="text-purple-700 bg-purple-50 border-purple-200"
        />
        <DetailStat
          label="Turnover"
          value={formatMoney(detail.revenue || 0)}
          sub="Gross Revenue"
          icon={TrendingUp}
          iconTone="text-amber-700 bg-amber-50 border-amber-200"
        />
        <DetailStat
          label="Reviews"
          value={String(detail.reviewCount || 0)}
          sub="Customer Ratings"
          icon={Sparkles}
          iconTone="text-emerald-700 bg-emerald-50 border-emerald-200"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="mt-2">
        <TabsList className="grid w-full grid-cols-5 rounded-xl bg-slate-200/60 p-1 text-[10px] font-black">
          <TabsTrigger value="overview" className="rounded-lg px-1 text-[10px] font-bold data-[state=active]:bg-white data-[state=active]:text-[#163d34] data-[state=active]:shadow-xs">
            Overview
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-lg px-1 text-[10px] font-bold data-[state=active]:bg-white data-[state=active]:text-[#163d34] data-[state=active]:shadow-xs">
            Dossier
          </TabsTrigger>
          <TabsTrigger value="products" className="rounded-lg px-1 text-[10px] font-bold data-[state=active]:bg-white data-[state=active]:text-[#163d34] data-[state=active]:shadow-xs">
            Products
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-lg px-1 text-[10px] font-bold data-[state=active]:bg-white data-[state=active]:text-[#163d34] data-[state=active]:shadow-xs">
            Activity
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-lg px-1 text-[10px] font-bold data-[state=active]:bg-white data-[state=active]:text-[#163d34] data-[state=active]:shadow-xs">
            Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3 pt-3">
          <InfoBlock title="Contact Information">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Phone className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[9px] font-black uppercase text-slate-400">Phone Number</span>
                  <p className="truncate text-xs font-bold text-slate-800">
                    {detail.phone || "+91 8433578805"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                  <Mail className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[9px] font-black uppercase text-slate-400">Email Address</span>
                  <p className="truncate text-xs font-bold text-slate-800">
                    {detail.email || "seller@agriconnect.co.uk"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  <MapPin className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[9px] font-black uppercase text-slate-400">Market Hub / Region</span>
                  <p className="truncate text-xs font-bold text-slate-800">
                    {detail.region}
                  </p>
                </div>
              </div>
            </div>
          </InfoBlock>

          <InfoBlock title="Marketplace Storefront">
            <div className="space-y-2 divide-y divide-slate-100 text-xs">
              <div className="flex items-center justify-between pb-1">
                <span className="text-slate-500 font-medium">Merchant Network:</span>
                <span className="font-bold text-slate-800">AgriConnect Merchant Network</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 pb-1">
                <span className="text-slate-500 font-medium">Regional Market Hub:</span>
                <Badge variant="outline" className="text-[10px] font-black text-emerald-700 bg-emerald-50 border-emerald-200">
                  {detail.region}
                </Badge>
              </div>
              <div className="flex items-center justify-between pt-1.5">
                <span className="text-slate-500 font-medium">Catalogue Offerings:</span>
                <span className="font-black text-emerald-700">{detail.products || 0} Listed Products</span>
              </div>
            </div>
          </InfoBlock>
        </TabsContent>

        <TabsContent value="documents" className="pt-3">
          <InfoBlock title="Compliance & KYC Dossier">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Merchant Dossier Status</span>
              <Badge className={detail.isVerified || detail.verification === "verified" ? "bg-emerald-100 text-[10px] font-black text-emerald-800" : "bg-amber-100 text-[10px] font-black text-amber-800"}>
                {detail.isVerified || detail.verification === "verified" ? "Verified" : "Pending Review"}
              </Badge>
            </div>
            <div className="mt-3 space-y-2.5">
              {["Commercial Trading License", "VAT / Tax Registration", "Food Safety & Quality Certificate", "Settlement Bank Verification", "Proof of Operating Address"].map((document) => (
                <div key={document} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-semibold text-slate-700">
                    <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
                    {document}
                  </span>
                  <Badge variant="outline" className="border-emerald-200 text-[9px] text-emerald-700">
                    Compliant
                  </Badge>
                </div>
              ))}
            </div>
          </InfoBlock>
        </TabsContent>

        <TabsContent value="products" className="space-y-2 pt-3">
          {detail.productList && detail.productList.length > 0 ? (
            detail.productList.slice(0, 10).map((product) => (
              <div key={product.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5">
                <div>
                  <p className="text-xs font-bold text-slate-900">{product.name}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {product.stock} in stock · {formatMoney(product.price)}
                  </p>
                </div>
                <Badge variant="outline" className="border-emerald-200 text-[9px] text-emerald-800">
                  {product.status || "published"}
                </Badge>
              </div>
            ))
          ) : (
            <EmptyState icon={Package} message="No product records loaded." />
          )}
        </TabsContent>

        <TabsContent value="activity" className="pt-3">
          {detail.activity && detail.activity.length > 0 ? (
            detail.activity.map((item, index) => (
              <div key={`${item.action}-${index}`} className="flex gap-2.5 border-b border-slate-100 py-2.5">
                <Activity className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-slate-800">{item.action.replaceAll(".", " ")}</p>
                  <p className="text-[10px] text-slate-400">{new Date(item.occurredAt).toLocaleString("en-GB")}</p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState icon={Activity} message="No recent admin events." />
          )}
        </TabsContent>

        <TabsContent value="orders" className="pt-3">
          <InfoBlock title="Storefront Turnover">
            <p className="text-xs font-bold text-slate-800">{compactNumber(detail.orders || 0)} fulfilled customer orders</p>
            <p className="mt-1.5 text-xs text-slate-500">
              Gross Turnover: <span className="font-black text-emerald-700">{formatMoney(detail.revenue || 0)}</span>
            </p>
          </InfoBlock>
        </TabsContent>
      </Tabs>

      {/* Interactive Quick Actions */}
      <InfoBlock title="Quick Actions">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setLocation(`/sellers/${detail.id}`)}
            className="flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 shadow-2xs active:scale-95 cursor-pointer"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <Eye className="h-4 w-4" />
            </div>
            <span className="truncate">Storefront</span>
          </button>

          <button
            onClick={onEdit}
            className="flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300 shadow-2xs active:scale-95 cursor-pointer"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
              <Pencil className="h-4 w-4" />
            </div>
            <span className="truncate">Edit details</span>
          </button>

          <button
            onClick={onToggleSuspend}
            className="flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300 shadow-2xs active:scale-95 cursor-pointer"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-800">
              <LockKeyhole className="h-4 w-4" />
            </div>
            <span className="truncate">{detail.status === "suspended" ? "Reactivate" : "Suspend"}</span>
          </button>

          <button
            onClick={onToggleVerify}
            className="flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 shadow-2xs active:scale-95 cursor-pointer"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="truncate">{detail.isVerified ? "Revoke KYC" : "Verify seller"}</span>
          </button>

          <button
            onClick={onAssignRegion}
            className="flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 shadow-2xs active:scale-95 cursor-pointer"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <MapPin className="h-4 w-4" />
            </div>
            <span className="truncate">Assign hub</span>
          </button>

          <button
            onClick={onSendMessage}
            className="flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-purple-50 hover:text-purple-800 hover:border-purple-300 shadow-2xs active:scale-95 cursor-pointer"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-800">
              <Mail className="h-4 w-4" />
            </div>
            <span className="truncate">Send notice</span>
          </button>
        </div>
      </InfoBlock>
    </div>
  );
}

function DetailStat({
  label,
  value,
  sub,
  icon: Icon,
  iconTone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  iconTone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:shadow-xs transition">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">{label}</p>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${iconTone}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="mt-1 truncate text-sm font-black text-slate-900">{value}</p>
      {sub && <p className="text-[10px] font-semibold text-slate-400 truncate">{sub}</p>}
    </div>
  );
}

function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <h3 className="mb-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="flex min-h-24 flex-col items-center justify-center gap-2 text-center">
      <Icon className="h-6 w-6 text-slate-300" />
      <p className="text-xs font-semibold text-slate-400">{message}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="rounded-2xl border-rose-100 bg-white shadow-sm">
      <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
        <XCircle className="h-10 w-10 text-rose-400" />
        <p className="text-sm font-bold text-slate-700">{message}</p>
        <Button variant="outline" className="rounded-xl text-xs font-bold" onClick={onRetry}>
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
