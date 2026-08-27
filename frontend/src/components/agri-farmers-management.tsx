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
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(amount);
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(value);
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
  const [newFarmerRegion, setNewFarmerRegion] = useState("Essex");
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
    <div className="relative space-y-4 pr-0 lg:pr-[24rem] xl:pr-[27rem]" data-testid="farmers-management-page">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">User management / Farmers</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#163d34] sm:text-3xl">Farmers Management Centre</h1>
          <p className="mt-1 text-xs text-slate-500">Manage, verify, and monitor all registered agricultural producers across the platform.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-9 rounded-xl border-slate-200 bg-white px-3 text-xs font-bold shadow-sm hover:bg-slate-50"
            onClick={() => exportFarmersCSV(items)}
            title="Download CSV export of farmers"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-emerald-700" /> Export page
          </Button>

          <Button
            onClick={() => setAddFarmerOpen(true)}
            className="h-9 rounded-xl bg-[#0d604e] px-3.5 text-xs font-black text-white shadow-md shadow-emerald-950/15 hover:bg-[#094d42]"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add farmer
          </Button>
        </div>
      </div>

      {/* Top 6 Agrarian KPI Cards */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <FarmMetric label="Total farmers" value={totalFarmers} icon={Users} tone="blue" note={overview ? "Platform total" : "Filtered total"} />
        <FarmMetric label="Active farmers" value={activeFarmers} icon={UserCheck} tone="green" note="In-stock inventory" />
        <FarmMetric label="Pending approval" value={pendingFarmers} icon={ClipboardCheck} tone="orange" note="Needs verification" />
        <FarmMetric label="Verified farmers" value={verifiedFarmers} icon={ShieldCheck} tone="teal" note="Compliant growers" />
        <FarmMetric label="Regions represented" value={overview?.regions?.length || regionChart.length || 12} icon={Flag} tone="amber" note="Active market hubs" />
        <FarmMetric label="Products listed" value={listedProducts} icon={Package} tone="violet" note="Catalogue inventory" />
      </div>

      {/* Filters Bar */}
      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
        <CardContent className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
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
          <FilterSelect
            value="all"
            onChange={() => undefined}
            options={[
              ["all", "All Organisations"],
              ["agriconnect", "AgriConnect Platform"],
              ["coop_east", "Eastern Farm Co-op"],
            ]}
          />
          <FilterSelect
            value="all"
            onChange={() => undefined}
            options={[
              ["all", "All Farmer Types"],
              ["independent", "Independent Grower"],
              ["organic", "Certified Organic"],
              ["commercial", "Commercial Farm"],
            ]}
          />
          <Input
            type="date"
            value={registeredDate}
            onChange={(event) => setRegisteredDate(event.target.value)}
            className="h-10 rounded-xl border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm"
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
            className="h-10 rounded-xl border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset Filters
          </Button>
        </CardContent>
      </Card>

      {/* Main Farmers Table */}
      <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-black text-[#163d34]">
              Farmers list <span className="ml-1 font-normal text-slate-400">({data?.total?.toLocaleString() ?? "—"})</span>
            </h2>
            <p className="mt-0.5 text-[10px] text-slate-400">
              {data ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, data.total)} of ${data.total.toLocaleString()} records` : "Loading all farmers..."}
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
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 shadow-sm"
                >
                  <option value="verify">Verify Selected</option>
                  <option value="unverify">Unverify Selected</option>
                  <option value="activate">Activate Selected</option>
                  <option value="suspend">Suspend Selected</option>
                </select>
                <Button
                  onClick={() => bulkMutation.mutate({ ids: selectedIds, action: bulkAction })}
                  disabled={bulkMutation.isPending}
                  className="h-8 rounded-lg bg-[#0d604e] px-3 text-xs font-black text-white hover:bg-[#094d42]"
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
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="bg-[#f7faf7] text-[10px] font-black uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="w-9 px-4 py-2.5">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all farmers" />
                  </th>
                  <th className="px-2 py-2.5">Farmer</th>
                  <th className="px-2 py-2.5">Farmer ID</th>
                  <th className="px-2 py-2.5">Region</th>
                  <th className="px-2 py-2.5">Organisation</th>
                  <th className="px-2 py-2.5">Products</th>
                  <th className="px-2 py-2.5">Status</th>
                  <th className="px-2 py-2.5">Rating</th>
                  <th className="px-2 py-2.5">Registered</th>
                  <th className="px-2 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((farmer) => {
                  const isSelected = selectedFarmer === farmer.id;
                  return (
                    <tr
                      key={farmer.id}
                      className={`group transition hover:bg-emerald-50/35 ${isSelected ? "bg-emerald-50/50" : ""}`}
                    >
                      <td className="px-4 py-2.5">
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

                      <td className="px-2 py-2.5">
                        <button className="flex items-center gap-2.5 text-left" onClick={() => setSelectedFarmer(farmer.id)}>
                          <Avatar className="h-8 w-8 border border-emerald-100">
                            <AvatarImage src={farmer.avatar} />
                            <AvatarFallback className="bg-emerald-100 text-[10px] font-black text-emerald-800">
                              {initials(farmer.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="min-w-0">
                            <strong className="block whitespace-nowrap text-xs font-black text-slate-900 group-hover:text-emerald-700">
                              {farmer.name}
                            </strong>
                            <small className="block max-w-32 truncate text-[10px] text-slate-400">
                              {farmer.email || "Marketplace farmer"}
                            </small>
                          </span>
                        </button>
                      </td>

                      <td className="px-2 py-2.5 font-mono text-[10px] font-bold text-slate-500">
                        {farmer.id.toUpperCase()}
                      </td>

                      <td className="px-2 py-2.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          <MapPin className="h-2.5 w-2.5 text-emerald-600" /> {farmer.region}
                        </span>
                      </td>

                      <td className="px-2 py-2.5 text-[11px] font-semibold text-slate-500">
                        AgriConnect Co-op
                      </td>

                      <td className="px-2 py-2.5 font-bold text-slate-800">
                        {farmer.products}
                      </td>

                      <td className="px-2 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black capitalize ${
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

                      <td className="px-2 py-2.5 font-bold text-amber-700">
                        ★ {farmer.rating.toFixed(1)}
                      </td>

                      <td className="px-2 py-2.5 text-[11px] font-semibold text-slate-500">
                        {formatDate(farmer.registeredOn)}
                      </td>

                      <td className="px-2 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"
                            onClick={() => setSelectedFarmer(farmer.id)}
                            title="Inspect farmer in drawer"
                            aria-label={`View ${farmer.name}`}
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"
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
                            <Pencil className="h-4 w-4" />
                          </button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="More actions">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl">
                              <DropdownMenuLabel className="text-xs">Farmer Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setLocation(`/sellers/${farmer.id}`)}>
                                <ExternalLink className="mr-2 h-3.5 w-3.5" /> View Public Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateFarmerMutation.mutate({ id: farmer.id, isVerified: !farmer.isVerified })
                                }
                              >
                                <ShieldCheck className="mr-2 h-3.5 w-3.5" /> {farmer.isVerified ? "Unverify Producer" : "Mark as Verified"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateFarmerMutation.mutate({
                                    id: farmer.id,
                                    status: farmer.status === "suspended" ? "active" : "suspended",
                                  })
                                }
                              >
                                <LockKeyhole className="mr-2 h-3.5 w-3.5" /> {farmer.status === "suspended" ? "Reactivate Account" : "Suspend Account"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setAssignRegionData({ id: farmer.id, name: farmer.name, currentRegion: farmer.region })}>
                                <MapPin className="mr-2 h-3.5 w-3.5" /> Change Region
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSendMessageData({ id: farmer.id, name: farmer.name, email: farmer.email })}>
                                <MessageSquare className="mr-2 h-3.5 w-3.5" /> Send Message
                              </DropdownMenuItem>
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

        {data && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
            <p className="text-[10px] font-semibold text-slate-400">Page {data.page} of {data.totalPages}</p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-md"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="flex h-7 min-w-7 items-center justify-center rounded-md bg-[#0d604e] px-2 text-[10px] font-black text-white">
                {page}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-md"
                disabled={page >= data.totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Bottom Insights: Growth & Top Earners */}
      <div className="grid gap-3 xl:grid-cols-[1.35fr_0.85fr_0.95fr]">
        <FarmerGrowthCard growth={overview?.farmerGrowth ?? []} />
        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-sm font-black text-[#163d34]">Farmers by Region</CardTitle>
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
                  <span className="truncate text-slate-500">{entry.name}</span>
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

      {/* Right-Side Farmer Detail Drawer */}
      {selectedFarmer && (
        <>
          <aside className="fixed bottom-0 right-0 top-[4.25rem] z-30 hidden w-[24rem] xl:w-[26rem] overflow-y-auto border-l border-slate-200/90 bg-[#f8fbf7] shadow-2xl backdrop-blur-xl lg:block">
            <FarmerPanelHeader
              detail={detail}
              selectedFarmer={selectedFarmer}
              onClose={() => setSelectedFarmer(null)}
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
          </aside>

          {/* Mobile backdrop and drawer */}
          <div className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden" onClick={() => setSelectedFarmer(null)} aria-hidden="true" />
          <aside className="fixed bottom-0 right-0 top-0 z-50 w-full overflow-y-auto border-l border-slate-200 bg-[#f8fbf7] shadow-2xl sm:max-w-xl lg:hidden">
            <FarmerPanelHeader
              detail={detail}
              selectedFarmer={selectedFarmer}
              onClose={() => setSelectedFarmer(null)}
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
          </aside>
        </>
      )}

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
                  placeholder="+44 7911 123456"
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
                  {["Essex", "Kent", "Norfolk", "Suffolk", "Lincolnshire", "Cambridgeshire", "Somerset", "Oxfordshire"].map((r) => (
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
              {["Essex", "Kent", "Norfolk", "Suffolk", "Lincolnshire", "Cambridgeshire", "Somerset", "Oxfordshire", "Yorkshire"].map((r) => (
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
        {farmers.slice(0, 5).map((farmer, index) => (
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
        ))}
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
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-12 w-12 rounded-2xl border border-emerald-100 shadow-xs">
            <AvatarImage src={detail?.avatar} />
            <AvatarFallback className="rounded-2xl bg-emerald-100 text-base font-black text-emerald-800">
              {initials(detail?.name || "F")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-base font-black text-[#163d34]">{detail?.name || "Farmer details"}</h2>
              {detail?.isVerified && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
            </div>
            <p className="mt-0.5 truncate font-mono text-[10px] font-bold text-slate-400">ID: {detail?.id || selectedFarmer}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{detail?.region || "Loading location"}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close farmer details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {detail?.status && (
        <div className="mt-3 flex items-center gap-2">
          <Badge
            className={`text-[10px] font-black uppercase ${
              detail.isVerified
                ? "bg-emerald-100 text-emerald-800"
                : detail.status === "suspended"
                ? "bg-rose-100 text-rose-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {detail.isVerified ? "Verified Producer" : detail.status.replaceAll("_", " ")}
          </Badge>
          <span className="text-[10px] font-bold text-slate-400">★ {detail.rating.toFixed(1)} Rating</span>
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
    <div className="space-y-4 p-4">
      {/* 4 Stat Boxes */}
      <div className="grid grid-cols-4 gap-2">
        <DetailStat label="Farm size" value="Standard" />
        <DetailStat label="Products" value={String(detail.products)} />
        <DetailStat label="Orders" value={compactNumber(detail.orders)} />
        <DetailStat label="Revenue" value={formatMoney(detail.revenue)} />
      </div>

      {/* Tabs with clean, readable layout */}
      <Tabs defaultValue="overview" className="mt-2">
        <TabsList className="grid w-full grid-cols-5 rounded-xl bg-slate-200/60 p-1 text-[10px] font-black">
          <TabsTrigger value="overview" className="rounded-lg px-1 text-[10px] font-bold data-[state=active]:bg-white data-[state=active]:text-[#163d34] data-[state=active]:shadow-xs">
            Overview
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-lg px-1 text-[10px] font-bold data-[state=active]:bg-white data-[state=active]:text-[#163d34] data-[state=active]:shadow-xs">
            Docs
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
          <InfoBlock title="Contact Details">
            <p className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Phone className="h-3.5 w-3.5 text-emerald-600" />
              {detail.phone || "No phone provided"}
            </p>
            <p className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-600">
              <Mail className="h-3.5 w-3.5 text-emerald-600" />
              {detail.email || "No email provided"}
            </p>
            <p className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-600">
              <MapPin className="h-3.5 w-3.5 text-emerald-600" />
              {detail.region}
            </p>
          </InfoBlock>

          <InfoBlock title="Organisation & Regional Hub">
            <p className="text-xs font-bold text-slate-800">AgriConnect Co-op Network</p>
            <p className="mt-1.5 text-xs text-slate-500">
              Assigned Market Hub: <span className="font-bold text-slate-800">{detail.region}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Reputation: <span className="font-bold text-amber-600">★ {detail.rating.toFixed(1)}</span> · {detail.reviewCount} verified reviews
            </p>
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

      {/* Interactive Quick Actions */}
      <InfoBlock title="Quick Actions">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setLocation(`/sellers/${detail.id}`)}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-1 text-center text-[10px] font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200"
          >
            <Eye className="h-4 w-4 text-emerald-600" />
            View profile
          </button>

          <button
            onClick={onEdit}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-1 text-center text-[10px] font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200"
          >
            <Pencil className="h-4 w-4 text-emerald-600" />
            Edit details
          </button>

          <button
            onClick={onToggleSuspend}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-1 text-center text-[10px] font-bold text-slate-700 transition hover:bg-rose-50 hover:text-rose-800 hover:border-rose-200"
          >
            <LockKeyhole className="h-4 w-4 text-amber-600" />
            {detail.status === "suspended" ? "Reactivate" : "Suspend"}
          </button>

          <button
            onClick={onToggleVerify}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-1 text-center text-[10px] font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            {detail.isVerified ? "Unverify" : "Verify farmer"}
          </button>

          <button
            onClick={onAssignRegion}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-1 text-center text-[10px] font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200"
          >
            <MapPin className="h-4 w-4 text-emerald-600" />
            Assign region
          </button>

          <button
            onClick={onSendMessage}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-1 text-center text-[10px] font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200"
          >
            <Mail className="h-4 w-4 text-emerald-600" />
            Send message
          </button>
        </div>
      </InfoBlock>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-center">
      <p className="text-[9px] font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-xs font-black text-slate-900">{value}</p>
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

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "—"
    : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}
