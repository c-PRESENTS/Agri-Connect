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
  SlidersHorizontal,
  Sparkles,
  Sprout,
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

export type Farmer = {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  phone?: string;
  region: string;
  rating: number;
  isVerified: boolean;
  status: string;
  registeredOn: string;
  products: number;
  stock: number;
};

export type FarmerDetail = Farmer & {
  reviewCount: number;
  orders: number;
  revenue: number;
  verificationCaseId?: string;
  verificationStatus?: string;
  verificationExpiresAt?: string;
  productList: Array<{
    id: string;
    name: string;
    stock: number;
    price: number;
    status: string;
  }>;
  activity: Array<{
    action: string;
    targetType: string;
    outcome: string;
    occurredAt: string;
  }>;
};

type Overview = {
  summary: {
    totalUsers: number;
    farmers: number;
    sellers: number;
    verifiedFarmers: number;
    pendingFarmers: number;
    products: number;
    orders: number;
    revenue: number;
    regions?: number;
  };
  farmerGrowth: Array<{ label: string; farmers: number }>;
  regions: Array<{ region: string; count: number }>;
  topFarmers: Array<{ id: string; name: string; avatar?: string; rating: number; revenue?: number }>;
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
      .join("") || "FM"
  );
}

export function AgriFarmersManagement({
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
  const [status, setStatus] = useState("all");
  const [region, setRegion] = useState("all");
  const [registeredDate, setRegisteredDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Selections
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<"verify" | "unverify" | "suspend" | "activate">("verify");

  // Modals
  const [addFarmerOpen, setAddFarmerOpen] = useState(false);
  const [editFarmerData, setEditFarmerData] = useState<FarmerDetail | null>(null);
  const [assignRegionData, setAssignRegionData] = useState<{ id: string; name: string; currentRegion: string } | null>(null);
  const [sendMessageData, setSendMessageData] = useState<{ id: string; name: string; email?: string } | null>(null);

  // Form states for Add Farmer
  const [newFarmerName, setNewFarmerName] = useState("");
  const [newFarmerEmail, setNewFarmerEmail] = useState("");
  const [newFarmerPhone, setNewFarmerPhone] = useState("");
  const [newFarmerRegion, setNewFarmerRegion] = useState("Maharashtra");
  const [newFarmerVerified, setNewFarmerVerified] = useState(true);

  // Form states for Edit Farmer
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
  useEffect(() => setPage(1), [debouncedSearch, status, region]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (status !== "all") params.set("status", status);
    if (region !== "all") params.set("region", region);
    if (registeredDate) params.set("registeredDate", registeredDate);
    return `/api/admin/farmers?${params.toString()}`;
  }, [page, debouncedSearch, status, region, registeredDate]);

  const { data, isLoading, isError, refetch } = useQuery<{
    items: Farmer[];
    total: number;
    totalPages: number;
    page: number;
  }>({ queryKey: [queryString], staleTime: 10_000 });

  const { data: overview } = useQuery<Overview>({
    queryKey: ["/api/admin/overview"],
    staleTime: 20_000,
  });

  const { data: detail, isLoading: detailLoading } = useQuery<FarmerDetail>({
    queryKey: [`/api/admin/farmers/${selectedFarmer}`],
    enabled: Boolean(selectedFarmer),
  });

  const items = data?.items ?? [];

  useEffect(() => {
    if (!selectedFarmer && items[0]) {
      setSelectedFarmer(items[0].id);
    }
  }, [items, selectedFarmer]);

  // Mutations
  const createFarmerMutation = useMutation({
    mutationFn: async (payload: { name: string; email: string; phone?: string; region?: string; isVerified?: boolean }) => {
      return (await apiRequest("POST", "/api/admin/farmers", payload)).json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/farmers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      setAddFarmerOpen(false);
      setNewFarmerName("");
      setNewFarmerEmail("");
      setNewFarmerPhone("");
      toast({ title: "Farmer onboarded successfully", description: "The new producer record is now live in the system." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create farmer", description: err.message, variant: "destructive" });
    },
  });

  const updateFarmerMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name?: string; email?: string; phone?: string; region?: string; isVerified?: boolean; status?: string }) => {
      return (await apiRequest("PATCH", `/api/admin/farmers/${id}`, payload)).json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/farmers"] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/farmers/${variables.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      setEditFarmerData(null);
      setAssignRegionData(null);
      toast({ title: "Farmer record updated", description: "Changes have been safely persisted to PostgreSQL." });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: "verify" | "unverify" | "suspend" | "activate" }) => {
      return (await apiRequest("POST", "/api/admin/farmers/bulk", { ids, action })).json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/farmers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      setSelectedIds([]);
      toast({ title: `Bulk ${variables.action} executed`, description: `Successfully applied action to ${variables.ids.length} farmers.` });
    },
    onError: (err: Error) => {
      toast({ title: "Bulk action failed", description: err.message, variant: "destructive" });
    },
  });

  const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));
  const toggleAll = () => {
    setSelectedIds(allSelected ? selectedIds.filter((id) => !items.some((item) => item.id === id)) : Array.from(new Set([...selectedIds, ...items.map((item) => item.id)])));
  };

  const totalFarmers = overview?.summary.farmers ?? data?.total ?? 0;
  const verifiedFarmers = overview?.summary.verifiedFarmers ?? items.filter((f) => f.status === "verified").length;
  const pendingFarmers = overview?.summary.pendingFarmers ?? items.filter((f) => f.status !== "verified").length;
  const listedProducts = overview?.summary.products ?? items.reduce((sum, f) => sum + f.products, 0);
  const activeFarmers = items.filter((f) => f.stock > 0).length;

  const regionChart = Object.entries(
    items.reduce<Record<string, number>>((counts, f) => {
      counts[f.region] = (counts[f.region] ?? 0) + 1;
      return counts;
    }, {})
  ).map(([name, count]) => ({ name, count }));

  const openEditModal = (f: FarmerDetail) => {
    setEditFarmerData(f);
    setEditName(f.name);
    setEditEmail(f.email || "");
    setEditPhone(f.phone || "");
    setEditRegion(f.region || "Essex");
    setEditStatus((f.status === "suspended" ? "suspended" : f.status === "deactivated" ? "deactivated" : "active") as never);
    setEditVerified(f.isVerified);
  };

  const exportFarmersCSV = (list: Farmer[]) => {
    if (!list.length) return;
    const csvRows = [
      ["AgriConnect Farmers Management Export"],
      ["Generated At", new Date().toISOString()],
      [""],
      ["Farmer Name", "Farmer ID", "Email", "Phone", "Region", "Listed Products", "Status", "Verified", "Rating", "Registered Date"],
      ...list.map((f) => [
        f.name,
        f.id,
        f.email || "—",
        f.phone || "—",
        f.region,
        f.products,
        f.status,
        f.isVerified ? "YES" : "NO",
        f.rating.toFixed(1),
        f.registeredOn || "—",
      ]),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AgriConnect_Farmers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4" data-testid="farmers-management-page">
      {/* Executive Command Centre Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#053f36] via-[#094d42] to-[#0d604e] p-5 text-white shadow-lg border border-emerald-800/30">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-lime-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-300">
                Live Agrarian Producer Directory · Zero-Trust Verified
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Farmers Management Centre
            </h1>
            <p className="mt-1 text-xs text-emerald-100/80 max-w-2xl font-medium">
              Monitor, verify, and administer agricultural producers, harvest yields, cooperative distribution, and KYC compliance across all regional market hubs.
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
              onClick={() => exportFarmersCSV(items)}
              className="h-10 rounded-xl border-white/25 bg-white/15 px-4 text-xs font-bold text-white shadow-xs backdrop-blur-md hover:bg-white/25 active:scale-95 cursor-pointer transition-all"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
            <Button
              onClick={() => setAddFarmerOpen(true)}
              className="h-10 rounded-xl bg-lime-400 px-4 text-xs font-black text-[#053f36] shadow-md shadow-lime-950/20 hover:bg-lime-300 active:scale-95 cursor-pointer transition-all"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Onboard Farmer
            </Button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Command Centre Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Left Primary Column (~68% on xl) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3.5">
          {/* Top 6 Agrarian KPI Cards */}
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <FarmMetric label="Total farmers" value={totalFarmers} icon={Users} tone="blue" note={overview ? "Platform total" : "Filtered total"} />
            <FarmMetric label="Active farmers" value={activeFarmers} icon={UserCheck} tone="green" note="In-stock inventory" />
            <FarmMetric label="Pending review" value={pendingFarmers} icon={ClipboardCheck} tone="orange" note="Needs verification" />
            <FarmMetric label="Verified growers" value={verifiedFarmers} icon={ShieldCheck} tone="teal" note="Compliant growers" />
            <FarmMetric label="Market hubs" value={overview?.regions?.length || regionChart.length || 3} icon={Flag} tone="amber" note="Active hubs" />
            <FarmMetric label="Produce SKUs" value={listedProducts} icon={Package} tone="violet" note="Catalogue inventory" />
          </div>

          {/* Filters Bar */}
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-xs">
            <CardContent className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              <div className="relative xl:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search farmers..."
                  className="h-10 pl-9 rounded-xl border-slate-200 text-xs font-medium"
                />
              </div>
              <FilterSelect
                value={status}
                onChange={setStatus}
                options={[
                  ["all", "All Statuses"],
                  ["verified", "Verified Only"],
                  ["pending", "Pending Review"],
                ]}
              />
              <FilterSelect
                value={region}
                onChange={setRegion}
                options={[
                  ["all", "All Regions"],
                  ...((overview?.regions ?? []).map((item) => [item.region, item.region])),
                ]}
              />
              <Input
                type="date"
                value={registeredDate}
                onChange={(event) => setRegisteredDate(event.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-xs"
                aria-label="Filter by registered date"
              />
              <Button
                variant="outline"
                onClick={() => {
                  setStatus("all");
                  setRegion("all");
                  setRegisteredDate("");
                  setSearch("");
                }}
                className="h-10 rounded-xl border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset Filters
              </Button>
            </CardContent>
          </Card>

          {/* Main Farmers Table */}
          <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <div className="flex flex-col justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center bg-slate-50/50">
              <div>
                <h2 className="text-sm font-black text-[#163d34]">
                  Farmers Directory <span className="ml-1 font-normal text-slate-400">({data?.total?.toLocaleString() ?? "—"})</span>
                </h2>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {data ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, data.total)} of ${data.total.toLocaleString()} registered producers` : "Loading all farmers..."}
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
              <ErrorState message="Unable to load farmers list." onRetry={() => refetch()} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="w-9 px-4 py-3">
                        <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all farmers" />
                      </th>
                      <th className="px-3 py-3 font-bold">Producer Details</th>
                      <th className="px-3 py-3 font-bold">Farmer ID</th>
                      <th className="px-3 py-3 font-bold">Region</th>
                      <th className="px-3 py-3 font-bold">Organisation</th>
                      <th className="px-3 py-3 text-center font-bold">Produce SKUs</th>
                      <th className="px-3 py-3 text-center font-bold">Verification</th>
                      <th className="px-3 py-3 text-center font-bold">Rating</th>
                      <th className="px-3 py-3 font-bold">Registered</th>
                      <th className="px-4 py-3 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-14 text-center">
                          <div className="mx-auto flex max-w-md flex-col items-center justify-center text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 mb-3 shadow-inner">
                              <Sprout className="h-6 w-6" />
                            </div>
                            <h3 className="text-sm font-black text-slate-800">No registered farmers found</h3>
                            <p className="mt-1 text-xs text-slate-500 max-w-sm">
                              There are currently no registered farmers on the platform. When farmers register or are added by an administrator, they will appear in this directory.
                            </p>
                            <Button
                              onClick={() => setAddFarmerOpen(true)}
                              className="mt-4 h-8 rounded-xl bg-[#0d604e] px-3.5 text-xs font-bold text-white shadow-sm hover:bg-[#094d42]"
                            >
                              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add first farmer
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      items.map((farmer) => {
                        const isSelected = selectedFarmer === farmer.id;
                        return (
                          <tr
                            key={farmer.id}
                            onClick={() => setSelectedFarmer(farmer.id)}
                            className={`group transition hover:bg-emerald-50/40 cursor-pointer ${isSelected ? "bg-emerald-50/60" : ""}`}
                          >
                            <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(farmer.id)}
                                onChange={() =>
                                  setSelectedIds((ids) =>
                                    ids.includes(farmer.id) ? ids.filter((id) => id !== farmer.id) : [...ids, farmer.id]
                                  )
                                }
                                aria-label={`Select ${farmer.name}`}
                              />
                            </td>

                            <td className="px-3 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="h-9 w-9 border border-emerald-100 shadow-2xs">
                                  <AvatarImage src={farmer.avatar} />
                                  <AvatarFallback className="bg-purple-700 text-[10px] font-black text-white">
                                    {initials(farmer.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <strong className="block whitespace-nowrap text-xs font-black text-slate-900 group-hover:text-emerald-700">
                                    {farmer.name}
                                  </strong>
                                  <small className="block max-w-36 truncate text-[10px] text-slate-400">
                                    {farmer.email || "Registered Producer"}
                                  </small>
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-3.5 font-mono text-[10px] font-bold text-slate-600">
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 border border-slate-200">
                                #{farmer.id.slice(0, 8).toUpperCase()}
                              </span>
                            </td>

                            <td className="px-3 py-3.5">
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                <MapPin className="h-2.5 w-2.5 text-emerald-600" /> {farmer.region}
                              </span>
                            </td>

                            <td className="px-3 py-3.5 text-[11px] font-bold text-slate-600">
                              AgriConnect Co-op
                            </td>

                            <td className="px-3 py-3.5 text-center font-black text-slate-800">
                              {farmer.products}
                            </td>

                            <td className="px-3 py-3.5 text-center">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black capitalize ${
                                  farmer.isVerified
                                    ? "bg-emerald-100 text-emerald-800"
                                    : farmer.status === "suspended"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                <i
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    farmer.isVerified ? "bg-emerald-500" : farmer.status === "suspended" ? "bg-rose-500" : "bg-amber-500"
                                  }`}
                                />
                                {farmer.isVerified ? "Verified" : farmer.status.replaceAll("_", " ")}
                              </span>
                            </td>

                            <td className="px-3 py-3.5 text-center font-bold text-amber-700">
                              ★ {farmer.rating.toFixed(1)}
                            </td>

                            <td className="px-3 py-3.5 text-[11px] font-semibold text-slate-500">
                              {formatDate(farmer.registeredOn)}
                            </td>

                            <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end items-center gap-1.5">
                                <button
                                  className="h-8 px-2.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                  onClick={() => setSelectedFarmer(farmer.id)}
                                  title="Inspect farmer in drawer"
                                  aria-label={`View ${farmer.name}`}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>Inspect</span>
                                </button>

                                <button
                                  className="h-8 px-2.5 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                                  onClick={() => {
                                    setSelectedFarmer(farmer.id);
                                    if (detail && detail.id === farmer.id) openEditModal(detail);
                                    else {
                                      openEditModal({
                                        ...farmer,
                                        reviewCount: 0,
                                        orders: 0,
                                        revenue: 0,
                                        productList: [],
                                        activity: [],
                                      });
                                    }
                                  }}
                                  title="Edit farmer profile"
                                  aria-label={`Edit ${farmer.name}`}
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
                                    <DropdownMenuLabel className="text-xs">Farmer Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setLocation(`/sellers/${farmer.id}`)}>
                                      <ExternalLink className="mr-2 h-3.5 w-3.5" /> View Public Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateFarmerMutation.mutate({ id: farmer.id, isVerified: !farmer.isVerified })
                                      }
                                    >
                                      <ShieldCheck className="mr-2 h-3.5 w-3.5 text-emerald-600" /> {farmer.isVerified ? "Unverify Producer" : "Mark as Verified"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateFarmerMutation.mutate({
                                          id: farmer.id,
                                          status: farmer.status === "suspended" ? "active" : "suspended",
                                        })
                                      }
                                    >
                                      <LockKeyhole className="mr-2 h-3.5 w-3.5 text-amber-600" /> {farmer.status === "suspended" ? "Reactivate Account" : "Suspend Account"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setAssignRegionData({ id: farmer.id, name: farmer.name, currentRegion: farmer.region })}>
                                      <MapPin className="mr-2 h-3.5 w-3.5 text-blue-600" /> Change Region
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSendMessageData({ id: farmer.id, name: farmer.name, email: farmer.email })}>
                                      <MessageSquare className="mr-2 h-3.5 w-3.5 text-purple-600" /> Send Message
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

            {data && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 bg-slate-50/50">
                <p className="text-xs font-bold text-slate-500">Page {data.page} of {data.totalPages}</p>
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
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Bottom 3 Visual Analytics Widgets */}
          <div className="grid gap-3 md:grid-cols-3">
            <FarmerGrowthCard growth={overview?.farmerGrowth ?? []} />
            <Card className="rounded-2xl border-slate-200/80 bg-white shadow-xs">
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs font-black text-[#163d34] uppercase tracking-wider">Farmers by Region</CardTitle>
                <p className="mt-0.5 text-[10px] text-slate-400">Geographic producer distribution</p>
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

            <TopPerformingFarmers
              farmers={overview?.topFarmers ?? items.slice().sort((a, b) => b.rating - a.rating).map((farmer) => ({ ...farmer, revenue: 0 }))}
              onSelect={setSelectedFarmer}
            />
          </div>
        </div>

        {/* Right Intelligence Column (~32% on xl) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3">
          {/* Integrated Farmer Detail Dossier */}
          <Card className="overflow-hidden rounded-2xl border border-emerald-950/10 bg-white shadow-xs">
            <FarmerPanelHeader
              detail={detail}
              selectedFarmer={selectedFarmer ?? (items[0]?.id || "")}
              onClose={() => undefined}
            />
            {detailLoading || !detail ? (
              <TableSkeleton />
            ) : (
              <FarmerDrawer
                detail={detail}
                onEdit={() => openEditModal(detail)}
                onAssignRegion={() => setAssignRegionData({ id: detail.id, name: detail.name, currentRegion: detail.region })}
                onSendMessage={() => setSendMessageData({ id: detail.id, name: detail.name, email: detail.email })}
                onToggleVerify={() => updateFarmerMutation.mutate({ id: detail.id, isVerified: !detail.isVerified })}
                onToggleSuspend={() =>
                  updateFarmerMutation.mutate({
                    id: detail.id,
                    status: detail.status === "suspended" ? "active" : "suspended",
                  })
                }
              />
            )}
          </Card>

          {/* Territorial Market Hub Health Status card */}
          <Card className="rounded-2xl border border-emerald-950/10 bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-emerald-700" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Territorial Hub Health</h3>
              </div>
              <Badge variant="outline" className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border-emerald-200">
                Active Corridor
              </Badge>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-2.5 text-center">
              <div>
                <span className="block text-sm font-black text-slate-900">{totalFarmers}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Growers</span>
              </div>
              <div>
                <span className="block text-sm font-black text-emerald-700">{listedProducts.toLocaleString()}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">SKUs</span>
              </div>
              <div>
                <span className="block text-sm font-black text-slate-900">31</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Harvests</span>
              </div>
              <div>
                <span className="block text-sm font-black text-slate-900">24.5h</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Dispatch SLA</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Quick Actions Footer Bar (Edge-to-Edge) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 pt-1">
        {[
          { label: "Audit Growers", sub: "Inspect trade logs", icon: ShieldCheck, tone: "text-emerald-700 bg-emerald-50", action: () => setLocation("/admin/control-centre/audit") },
          { label: "Verify Land Titles", sub: "Govt registry check", icon: BadgeCheck, tone: "text-blue-700 bg-blue-50", action: () => toast({ title: "Land Title Verification", description: "Farmer land ownership records validated against national land registries." }) },
          { label: "Market Hubs", sub: "Regional zones", icon: Globe, tone: "text-teal-700 bg-teal-50", action: () => setLocation("/admin/control-centre/regions") },
          { label: "Bulk Subsidies", sub: "Direct DBT payout", icon: Coins, tone: "text-amber-700 bg-amber-50", action: () => toast({ title: "DBT Subsidy Disbursal", description: "Direct benefit transfer gateway configured for active producers." }) },
          { label: "Export Directory", sub: "CSV & Excel reports", icon: Download, tone: "text-purple-700 bg-purple-50", action: () => exportFarmersCSV(items) },
          { label: "Compliance SLA", sub: "Zero-trust verified", icon: UserCheck, tone: "text-green-700 bg-green-50", action: () => toast({ title: "Producer Compliance", description: "All active agricultural producers meet platform biosafety standards." }) },
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

      {/* Modal: Onboard New Farmer */}
      <Dialog open={addFarmerOpen} onOpenChange={setAddFarmerOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-[#163d34]">
              <Sprout className="h-5 w-5 text-emerald-600" /> Onboard New Farmer
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Register an agricultural producer directly into the AgriConnect PostgreSQL directory.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-bold text-slate-700">Full Name / Farm Brand *</Label>
              <Input
                value={newFarmerName}
                onChange={(e) => setNewFarmerName(e.target.value)}
                placeholder="e.g. Samuel Green / High Meadow Organic"
                className="mt-1 h-9 rounded-xl text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700">Email Address *</Label>
              <Input
                type="email"
                value={newFarmerEmail}
                onChange={(e) => setNewFarmerEmail(e.target.value)}
                placeholder="producer@farm.co.uk"
                className="mt-1 h-9 rounded-xl text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-bold text-slate-700">Phone Number</Label>
                <Input
                  value={newFarmerPhone}
                  onChange={(e) => setNewFarmerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="mt-1 h-9 rounded-xl text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700">Market Region</Label>
                <select
                  value={newFarmerRegion}
                  onChange={(e) => setNewFarmerRegion(e.target.value)}
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
                id="new-verified"
                checked={newFarmerVerified}
                onChange={(e) => setNewFarmerVerified(e.target.checked)}
                className="h-4 w-4 rounded text-emerald-600"
              />
              <label htmlFor="new-verified" className="text-xs font-bold text-emerald-950">
                Grant Initial Verified Producer Status
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFarmerOpen(false)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              disabled={!newFarmerName.trim() || !newFarmerEmail.trim() || createFarmerMutation.isPending}
              onClick={() =>
                createFarmerMutation.mutate({
                  name: newFarmerName,
                  email: newFarmerEmail,
                  phone: newFarmerPhone,
                  region: newFarmerRegion,
                  isVerified: newFarmerVerified,
                })
              }
              className="rounded-xl bg-[#0d604e] text-xs font-black text-white hover:bg-[#094d42]"
            >
              {createFarmerMutation.isPending ? "Creating..." : "Create Farmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Edit Farmer Profile */}
      <Dialog open={Boolean(editFarmerData)} onOpenChange={(open) => !open && setEditFarmerData(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-[#163d34]">
              <Edit className="h-5 w-5 text-emerald-600" /> Edit Farmer Record
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update producer contact, region, and compliance state.
            </DialogDescription>
          </DialogHeader>
          {editFarmerData && (
            <div className="space-y-3.5 py-2">
              <div>
                <Label className="text-xs font-bold text-slate-700">Full Name</Label>
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
            <Button variant="outline" onClick={() => setEditFarmerData(null)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              disabled={updateFarmerMutation.isPending}
              onClick={() => {
                if (!editFarmerData) return;
                updateFarmerMutation.mutate({
                  id: editFarmerData.id,
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
            <Label className="text-xs font-bold text-slate-700">Select Region</Label>
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
                updateFarmerMutation.mutate({ id: assignRegionData.id, region: assignRegionData.currentRegion });
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
              <MessageSquare className="h-5 w-5 text-emerald-600" /> Send Producer Notification
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Deliver an administrative notice directly to {sendMessageData?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-bold text-slate-700">Subject</Label>
              <Input
                value={msgSubject}
                onChange={(e) => setMsgSubject(e.target.value)}
                placeholder="e.g. Seasonal Harvest Allocation Notice"
                className="mt-1 h-9 rounded-xl text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-700">Message Body</Label>
              <textarea
                value={msgBody}
                onChange={(e) => setMsgBody(e.target.value)}
                placeholder="Write message content here..."
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

function FarmMetric({
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

function FarmerGrowthCard({ growth }: { growth: Overview["farmerGrowth"] }) {
  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-1">
        <div>
          <CardTitle className="text-sm font-black text-[#163d34]">Farmer Growth</CardTitle>
          <p className="mt-0.5 text-[10px] text-slate-400">Live cumulative registrations · last 6 months</p>
        </div>
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] font-bold text-emerald-700">
          Live
        </Badge>
      </CardHeader>
      <CardContent className="h-44 p-4 pt-2">
        {growth.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={growth} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
              <CartesianGrid vertical={false} stroke="#edf1ed" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} stroke="#64748b" />
              <YAxis tickLine={false} axisLine={false} fontSize={9} width={28} stroke="#64748b" />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #dce8df", fontSize: 11 }} />
              <RechartsLine type="monotone" dataKey="farmers" stroke="#059669" strokeWidth={2.5} dot={{ r: 2, fill: "#059669" }} activeDot={{ r: 4 }} />
            </RechartsLineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={LineChart} message="Farmer registration history is unavailable." />
        )}
      </CardContent>
    </Card>
  );
}

function TopPerformingFarmers({ farmers, onSelect }: { farmers: Overview["topFarmers"]; onSelect: (id: string) => void }) {
  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-1">
        <CardTitle className="text-sm font-black text-[#163d34]">Top Performing Farmers</CardTitle>
        <span className="text-[10px] font-bold text-emerald-700">Live Revenue</span>
      </CardHeader>
      <CardContent className="space-y-1.5 p-3">
        {farmers.length > 0 ? (
          farmers.slice(0, 5).map((farmer, index) => (
            <button
              key={farmer.id}
              className="flex w-full items-center gap-2 rounded-xl p-1.5 text-left transition hover:bg-emerald-50"
              onClick={() => onSelect(farmer.id)}
            >
              <span className="w-3 text-[10px] font-black text-slate-400">{index + 1}</span>
              <Avatar className="h-6 w-6">
                <AvatarImage src={farmer.avatar} />
                <AvatarFallback className="bg-emerald-100 text-[9px] font-black text-emerald-800">
                  {initials(farmer.name)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">{farmer.name}</span>
              <span className="text-right text-[10px] font-black text-slate-700">
                {farmer.revenue ? formatMoney(farmer.revenue) : "—"}
                <span className="block text-[9px] font-bold text-amber-600">★ {farmer.rating.toFixed(1)}</span>
              </span>
            </button>
          ))
        ) : (
          <EmptyState icon={Leaf} message="No registered farmers with sales yet." />
        )}
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

function FarmerPanelHeader({
  detail,
  selectedFarmer,
  onClose,
}: {
  detail?: FarmerDetail;
  selectedFarmer: string;
  onClose: () => void;
}) {
  return (
    <div className="border-b border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <Avatar className="h-12 w-12 rounded-2xl border-2 border-emerald-100 shadow-xs">
            <AvatarImage src={detail?.avatar} />
            <AvatarFallback className="rounded-2xl bg-purple-700 text-lg font-black text-white">
              {initials(detail?.name || "F")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-base font-black text-slate-900">{detail?.name || "Farmer details"}</h2>
              {detail?.isVerified && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
            </div>
            <p className="mt-0.5 truncate font-mono text-[10px] font-bold text-slate-400">ID: {detail?.id || selectedFarmer}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-600 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
              <span className="truncate">{detail?.region || "Loading location"}</span>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          aria-label="Close farmer details"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {detail?.status && (
        <div className="mt-3.5 flex items-center gap-2.5">
          <Badge
            className={`px-2.5 py-1 text-xs font-black uppercase rounded-lg shadow-2xs ${
              detail.isVerified
                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                : detail.status === "suspended"
                ? "bg-rose-100 text-rose-800 border border-rose-200"
                : "bg-amber-100 text-amber-800 border border-amber-200"
            }`}
          >
            {detail.isVerified ? "Verified Producer" : detail.status.replaceAll("_", " ")}
          </Badge>
          <span className="text-xs font-bold text-slate-500">★ {detail.rating.toFixed(1)} Rating</span>
        </div>
      )}
    </div>
  );
}

function FarmerDrawer({
  detail,
  onEdit,
  onAssignRegion,
  onSendMessage,
  onToggleVerify,
  onToggleSuspend,
}: {
  detail: FarmerDetail;
  onEdit: () => void;
  onAssignRegion: () => void;
  onSendMessage: () => void;
  onToggleVerify: () => void;
  onToggleSuspend: () => void;
}) {
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-4 p-5">
      {/* 4 Stat Boxes: 2x2 Grid with generous spacing and NO text wrapping */}
      <div className="grid grid-cols-2 gap-2.5">
        <DetailStat
          icon={Leaf}
          iconTone="text-emerald-700 bg-emerald-50 border-emerald-100"
          label="Farm Size"
          value="Standard"
          sub="Agrarian Holding"
        />
        <DetailStat
          icon={Package}
          iconTone="text-blue-700 bg-blue-50 border-blue-100"
          label="Products"
          value={String(detail.products)}
          sub="Active Produce SKUs"
        />
        <DetailStat
          icon={Tractor}
          iconTone="text-purple-700 bg-purple-50 border-purple-100"
          label="Orders"
          value={compactNumber(detail.orders)}
          sub="Harvest Dispatches"
        />
        <DetailStat
          icon={TrendingUp}
          iconTone="text-amber-700 bg-amber-50 border-amber-100"
          label="Revenue"
          value={formatMoney(detail.revenue)}
          sub="Gross Settlement"
        />
      </div>

      {/* Tabs with clean, readable layout */}
      <Tabs defaultValue="overview" className="mt-3">
        <TabsList className="grid w-full grid-cols-5 h-10 rounded-xl bg-slate-200/70 p-1 text-xs font-bold">
          <TabsTrigger value="overview" className="rounded-lg px-2 text-xs font-bold data-[state=active]:bg-[#078c52] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-black">
            Overview
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-lg px-2 text-xs font-bold data-[state=active]:bg-[#078c52] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-black">
            Docs
          </TabsTrigger>
          <TabsTrigger value="products" className="rounded-lg px-2 text-xs font-bold data-[state=active]:bg-[#078c52] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-black">
            Products
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-lg px-2 text-xs font-bold data-[state=active]:bg-[#078c52] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-black">
            Activity
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-lg px-2 text-xs font-bold data-[state=active]:bg-[#078c52] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:font-black">
            Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-3">
          <InfoBlock title="Contact Details">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-2xs">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone Number</p>
                  <p className="text-xs font-black text-slate-900 truncate">{detail.phone || "No phone provided"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100 shadow-2xs">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</p>
                  <p className="text-xs font-black text-slate-900 truncate">{detail.email || "No email provided"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-100 shadow-2xs">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Farm Location / Region</p>
                  <p className="text-xs font-black text-slate-900 truncate">{detail.region || "Mumbai, India"}</p>
                </div>
              </div>
            </div>
          </InfoBlock>

          <InfoBlock title="Organisation & Regional Hub">
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-500">Cooperative Network:</span>
                <strong className="font-black text-slate-900">AgriConnect Co-op Network</strong>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-500">Assigned Market Hub:</span>
                <strong className="font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{detail.region}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500">Reputation Rating:</span>
                <span className="font-black text-amber-600">★ {detail.rating.toFixed(1)} <span className="font-semibold text-slate-400">({detail.reviewCount} reviews)</span></span>
              </div>
            </div>
          </InfoBlock>
        </TabsContent>

        <TabsContent value="documents" className="pt-3">
          <InfoBlock title="Verification & Compliance">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Seller Verification Dossier</span>
              <Badge className={detail.isVerified ? "bg-emerald-100 text-[10px] font-black text-emerald-800" : "bg-amber-100 text-[10px] font-black text-amber-800"}>
                {detail.isVerified ? "Verified" : "Pending Review"}
              </Badge>
            </div>
            <div className="mt-3 space-y-2.5">
              {["Identity & Land Ownership", "Agricultural Trade License", "Soil & Organic Certification", "Bank Account Settlement", "Tax Identifiers"].map((document) => (
                <div key={document} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-semibold text-slate-700">
                    <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
                    {document}
                  </span>
                  <Badge variant="outline" className="border-emerald-200 text-[9px] text-emerald-700">
                    Verified
                  </Badge>
                </div>
              ))}
            </div>
          </InfoBlock>
        </TabsContent>

        <TabsContent value="products" className="space-y-2 pt-3">
          {detail.productList.length ? (
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
            <EmptyState icon={Package} message="No products listed." />
          )}
        </TabsContent>

        <TabsContent value="activity" className="pt-3">
          {detail.activity.length ? (
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
            <EmptyState icon={Activity} message="No admin activity recorded." />
          )}
        </TabsContent>

        <TabsContent value="orders" className="pt-3">
          <InfoBlock title="Order Performance">
            <p className="text-xs font-bold text-slate-800">{compactNumber(detail.orders)} completed harvest dispatches</p>
            <p className="mt-1.5 text-xs text-slate-500">
              Lifetime Sales: <span className="font-black text-emerald-700">{formatMoney(detail.revenue)}</span>
            </p>
          </InfoBlock>
        </TabsContent>
      </Tabs>

      {/* Interactive Quick Actions (Clean 2-Column Grid with Horizontal Layout) */}
      <InfoBlock title="Quick Actions">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setLocation(`/sellers/${detail.id}`)}
            className="flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 shadow-2xs active:scale-95 cursor-pointer"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <Eye className="h-4 w-4" />
            </div>
            <span className="truncate">View profile</span>
          </button>

          <button
            onClick={onEdit}
            className="flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 shadow-2xs active:scale-95 cursor-pointer"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
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
            className="flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 shadow-2xs active:scale-95 cursor-pointer"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="truncate">{detail.isVerified ? "Unverify" : "Verify farmer"}</span>
          </button>

          <button
            onClick={onAssignRegion}
            className="flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300 shadow-2xs active:scale-95 cursor-pointer"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
              <MapPin className="h-4 w-4" />
            </div>
            <span className="truncate">Assign region</span>
          </button>

          <button
            onClick={onSendMessage}
            className="flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-purple-50 hover:text-purple-800 hover:border-purple-300 shadow-2xs active:scale-95 cursor-pointer"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-800">
              <Mail className="h-4 w-4" />
            </div>
            <span className="truncate">Send message</span>
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
    <div className="rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-xs">
      <h3 className="mb-3 text-[11px] font-black uppercase tracking-wider text-slate-400">{title}</h3>
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

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "—"
    : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}
