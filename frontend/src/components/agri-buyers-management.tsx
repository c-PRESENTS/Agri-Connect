import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Filter,
  Globe,
  Lock,
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
  ShoppingCart,
  Trash2,
  TrendingUp,
  Unlock,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export type BuyerRecord = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  location?: string | null;
  status: "active" | "suspended" | string;
  orders?: number;
  spendMinor?: string | number;
  createdAt?: string;
  updatedAt?: string;
};

export type BuyerDetail = {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  phone?: string;
  location: string;
  status: string;
  registeredOn: string;
  orders: number;
  totalSpend: number;
  orderList: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    currency: string;
    total: number;
    createdAt: string;
  }>;
  activity: Array<{
    action: string;
    targetType: string;
    outcome: string;
    occurredAt: string;
  }>;
  generatedAt: string;
};

const formatGbp = (amount: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(amount);

function timeAgo(dateString?: string): string {
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

export function AgriBuyersManagement({
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
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [orderTierFilter, setOrderTierFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Modals state
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [editBuyer, setEditBuyer] = useState<BuyerRecord | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<BuyerRecord | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [assignLocationTarget, setAssignLocationTarget] = useState<BuyerRecord | null>(null);
  const [newLocation, setNewLocation] = useState("");
  const [messageTarget, setMessageTarget] = useState<BuyerRecord | null>(null);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");

  // New buyer form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newBuyerLocation, setNewBuyerLocation] = useState("London");

  // Query buyers
  const { data: buyersData, isLoading, refetch, isFetching } = useQuery<{ records: BuyerRecord[] }>({
    queryKey: ["/api/admin/resources/buyers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/resources/buyers");
      return res.json();
    },
  });

  const buyers = useMemo(() => buyersData?.records ?? [], [buyersData]);

  // Query single buyer detail when drawer opens
  const { data: buyerDetail, isLoading: isLoadingDetail } = useQuery<BuyerDetail>({
    queryKey: ["/api/admin/buyers", selectedBuyerId],
    queryFn: async () => {
      if (!selectedBuyerId) return null as never;
      const res = await apiRequest("GET", `/api/admin/buyers/${selectedBuyerId}`);
      return res.json();
    },
    enabled: Boolean(selectedBuyerId),
  });

  // Extract unique locations for filter
  const locations = useMemo(() => {
    const set = new Set<string>();
    buyers.forEach((b) => {
      if (b.location) set.add(b.location);
    });
    return Array.from(set).sort();
  }, [buyers]);

  // Filter buyers
  const filteredBuyers = useMemo(() => {
    return buyers.filter((buyer) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchesName = buyer.name?.toLowerCase().includes(q);
        const matchesEmail = buyer.email?.toLowerCase().includes(q);
        const matchesPhone = buyer.phone?.toLowerCase().includes(q);
        const matchesLoc = buyer.location?.toLowerCase().includes(q);
        const matchesId = buyer.id.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesLoc && !matchesId) return false;
      }

      if (statusFilter !== "all") {
        if (statusFilter === "active" && buyer.status !== "active") return false;
        if (statusFilter === "suspended" && buyer.status !== "suspended") return false;
      }

      if (locationFilter !== "all" && buyer.location !== locationFilter) return false;

      if (orderTierFilter !== "all") {
        const orderCount = buyer.orders ?? 0;
        if (orderTierFilter === "zero" && orderCount !== 0) return false;
        if (orderTierFilter === "repeat" && orderCount < 2) return false;
        if (orderTierFilter === "frequent" && orderCount < 5) return false;
      }

      return true;
    });
  }, [buyers, search, statusFilter, locationFilter, orderTierFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredBuyers.length / pageSize) || 1;
  const paginatedBuyers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredBuyers.slice(start, start + pageSize);
  }, [filteredBuyers, page, pageSize]);

  // Top KPI Metrics
  const stats = useMemo(() => {
    const total = buyers.length;
    const active = buyers.filter((b) => b.status === "active").length;
    const suspended = buyers.filter((b) => b.status === "suspended").length;
    const totalOrders = buyers.reduce((sum, b) => sum + (Number(b.orders) || 0), 0);
    const totalSpendPence = buyers.reduce((sum, b) => sum + (Number(b.spendMinor) || 0), 0);
    const avgSpend = total > 0 ? (totalSpendPence / 100) / total : 0;

    return {
      total,
      active,
      suspended,
      totalOrders,
      totalSpend: totalSpendPence / 100,
      avgSpend,
    };
  }, [buyers]);

  // Mutations
  const onboardMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone?: string; location?: string }) => {
      const res = await apiRequest("POST", "/api/admin/buyers", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Buyer Onboarded", description: "Account created successfully in the directory." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/buyers"] });
      setOnboardOpen(false);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to onboard buyer", description: err.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BuyerRecord> }) => {
      const res = await apiRequest("PATCH", `/api/admin/buyers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Buyer Updated", description: "Account details updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/buyers"] });
      if (selectedBuyerId) queryClient.invalidateQueries({ queryKey: ["/api/admin/buyers", selectedBuyerId] });
      setEditBuyer(null);
      setAssignLocationTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: "active" | "suspended"; reason?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/buyers/${id}`, { status, reason });
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast({
        title: vars.status === "suspended" ? "Buyer Suspended" : "Buyer Reactivated",
        description: `Account has been marked ${vars.status}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources/buyers"] });
      if (selectedBuyerId) queryClient.invalidateQueries({ queryKey: ["/api/admin/buyers", selectedBuyerId] });
      setSuspendTarget(null);
      setSuspendReason("");
    },
    onError: (err: Error) => {
      toast({ title: "Status update failed", description: err.message, variant: "destructive" });
    },
  });

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["Buyer ID", "Name", "Email", "Phone", "Location", "Status", "Orders Count", "Total Spend (£)", "Last Updated"];
    const rows = filteredBuyers.map((b) => [
      `"${b.id}"`,
      `"${b.name || ""}"`,
      `"${b.email || ""}"`,
      `"${b.phone || ""}"`,
      `"${b.location || ""}"`,
      `"${b.status}"`,
      b.orders ?? 0,
      ((Number(b.spendMinor) || 0) / 100).toFixed(2),
      `"${b.updatedAt ? new Date(b.updatedAt).toISOString() : ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agriconnect-buyers-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV Exported", description: `Exported ${filteredBuyers.length} buyer records.` });
  };

  // Bulk selection toggles
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRowIds(new Set(paginatedBuyers.map((b) => b.id)));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedRowIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRowIds(next);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <span>User Management</span>
            <span>/</span>
            <span>Buyers</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Buyers Management Centre
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor consumer & commercial wholesale buyer accounts, order spend, purchasing activity, and status controls.
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
            <span>Export page</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setOnboardOpen(true)}
            className="h-9 gap-1.5 bg-[#078c52] font-semibold text-white shadow-sm hover:bg-[#067343]"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Onboard buyer</span>
          </Button>
        </div>
      </div>

      {/* Top 6 KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Total Buyers"
          value={stats.total.toLocaleString()}
          subtitle="Registered accounts"
          icon={Users}
          iconBg="bg-emerald-50"
          iconColor="text-[#078c52]"
        />
        <StatCard
          title="Active Accounts"
          value={stats.active.toLocaleString()}
          subtitle="In good standing"
          icon={UserCheck}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders.toLocaleString()}
          subtitle="Purchases placed"
          icon={ShoppingBag}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Gross Spend"
          value={formatGbp(stats.totalSpend)}
          subtitle="Lifetime GMV"
          icon={TrendingUp}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Avg Order Value"
          value={formatGbp(stats.avgSpend)}
          subtitle="Spend per buyer"
          icon={ShoppingCart}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
        />
        <StatCard
          title="Suspended"
          value={stats.suspended.toLocaleString()}
          subtitle="Accounts restricted"
          icon={ShieldAlert}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
        />
      </div>

      {/* Search & Filter Bar */}
      <Card className="border border-emerald-950/10 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search buyer name, email, phone, location or ID..."
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
                <SelectTrigger className="h-10 w-[140px] text-xs font-medium">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={locationFilter}
                onValueChange={(val) => {
                  setLocationFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[150px] text-xs font-medium">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={orderTierFilter}
                onValueChange={(val) => {
                  setOrderTierFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[150px] text-xs font-medium">
                  <SelectValue placeholder="Order Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Order Tiers</SelectItem>
                  <SelectItem value="zero">New / 0 Orders</SelectItem>
                  <SelectItem value="repeat">Repeat (2+ Orders)</SelectItem>
                  <SelectItem value="frequent">Frequent (5+ Orders)</SelectItem>
                </SelectContent>
              </Select>

              {(search || statusFilter !== "all" || locationFilter !== "all" || orderTierFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setLocationFilter("all");
                    setOrderTierFilter("all");
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

      {/* Main Table Card */}
      <Card className="overflow-hidden border border-emerald-950/10 bg-white shadow-sm">
        {/* Bulk Action Bar (when rows selected) */}
        {selectedRowIds.size > 0 && (
          <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/80 px-4 py-2.5 text-xs">
            <span className="font-semibold text-[#053f36]">
              {selectedRowIds.size} {selectedRowIds.size === 1 ? "buyer" : "buyers"} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedRowIds(new Set())}
                className="h-7 text-xs"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={paginatedBuyers.length > 0 && selectedRowIds.size === paginatedBuyers.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#078c52] focus:ring-[#078c52]"
                  />
                </th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-center">Orders</th>
                <th className="px-4 py-3 text-right">Lifetime Spend</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Last Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="px-4 py-4">
                      <div className="h-4 w-full rounded bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : paginatedBuyers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <UserRound className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-semibold">No buyers match your filters</p>
                    <p className="text-xs">Try adjusting your search query or status filter.</p>
                  </td>
                </tr>
              ) : (
                paginatedBuyers.map((buyer) => {
                  const isSelected = selectedRowIds.has(buyer.id);
                  const isSuspended = buyer.status === "suspended";
                  const spendPence = Number(buyer.spendMinor) || 0;

                  return (
                    <tr
                      key={buyer.id}
                      className={`group transition-colors hover:bg-emerald-50/40 ${
                        isSelected ? "bg-emerald-50/60" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(buyer.id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-[#078c52] focus:ring-[#078c52]"
                        />
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded-full border border-slate-200">
                            {buyer.avatar && <AvatarImage src={buyer.avatar} alt={buyer.name} />}
                            <AvatarFallback className="bg-emerald-100 text-[11px] font-bold text-[#053f36]">
                              {buyer.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <button
                              onClick={() => setSelectedBuyerId(buyer.id)}
                              className="font-bold text-slate-900 hover:text-[#078c52] hover:underline"
                            >
                              {buyer.name}
                            </button>
                            <p className="text-[10px] text-slate-400 font-mono">ID: {buyer.id.slice(0, 16)}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-[11px] text-slate-600">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span className="truncate max-w-[170px]">{buyer.email || "No email"}</span>
                          </div>
                          {buyer.phone && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Phone className="h-2.5 w-2.5" />
                              <span>{buyer.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                          <MapPin className="h-3 w-3 text-emerald-600" />
                          <span>{buyer.location || "London"}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <Badge variant="outline" className="border-slate-200 bg-slate-50 font-bold text-slate-800">
                          {buyer.orders ?? 0}
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                        {formatGbp(spendPence / 100)}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isSuspended
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isSuspended ? "bg-rose-500" : "bg-emerald-500"
                            }`}
                          />
                          {isSuspended ? "Suspended" : "Active"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        {timeAgo(buyer.updatedAt || buyer.createdAt)}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedBuyerId(buyer.id)}
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            title="Inspect buyer in drawer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditBuyer(buyer)}
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            title="Edit details"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSuspendTarget(buyer)}
                            className={`h-7 w-7 ${
                              isSuspended
                                ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                : "text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            }`}
                            title={isSuspended ? "Reactivate buyer" : "Suspend buyer"}
                          >
                            {isSuspended ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 text-xs font-medium">
                              <DropdownMenuLabel>Buyer Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setAssignLocationTarget(buyer)}>
                                <MapPin className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                                <span>Change Location</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setMessageTarget(buyer)}>
                                <MessageSquare className="mr-2 h-3.5 w-3.5 text-blue-600" />
                                <span>Send Notice</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setSuspendTarget(buyer)}
                                className={isSuspended ? "text-emerald-600" : "text-rose-600"}
                              >
                                {isSuspended ? (
                                  <>
                                    <Unlock className="mr-2 h-3.5 w-3.5" />
                                    <span>Reactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="mr-2 h-3.5 w-3.5" />
                                    <span>Suspend</span>
                                  </>
                                )}
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
            Showing <span className="font-semibold text-slate-900">{filteredBuyers.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">{Math.min(page * pageSize, filteredBuyers.length)}</span> of{" "}
            <span className="font-semibold text-slate-900">{filteredBuyers.length}</span> buyers
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

      {/* Right-Side Buyer Detail Drawer */}
      <Sheet open={Boolean(selectedBuyerId)} onOpenChange={(open) => !open && setSelectedBuyerId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto bg-slate-50">
          {isLoadingDetail ? (
            <div className="flex h-full items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : buyerDetail ? (
            <div className="flex flex-col min-h-full">
              {/* Drawer Header */}
              <div className="bg-[#053f36] p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-white/20">
                      {buyerDetail.avatar && <AvatarImage src={buyerDetail.avatar} alt={buyerDetail.name} />}
                      <AvatarFallback className="bg-lime-400 font-bold text-[#053f36]">
                        {buyerDetail.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-lg font-black">{buyerDetail.name}</h2>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-[10px] text-white/60">ID: {buyerDetail.id}</span>
                        <Badge
                          variant="outline"
                          className={
                            buyerDetail.status === "active"
                              ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-200"
                              : "border-rose-400/30 bg-rose-500/20 text-rose-200"
                          }
                        >
                          {buyerDetail.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedBuyerId(null)}
                    className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 4 Stat Boxes */}
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Orders</p>
                    <p className="text-base font-black text-white">{buyerDetail.orders}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Total Spend</p>
                    <p className="text-base font-black text-lime-300">{formatGbp(buyerDetail.totalSpend)}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Location</p>
                    <p className="text-xs font-bold text-white truncate">{buyerDetail.location}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Joined</p>
                    <p className="text-[11px] font-medium text-white/80">{timeAgo(buyerDetail.registeredOn)}</p>
                  </div>
                </div>
              </div>

              {/* Drawer Tabs */}
              <Tabs defaultValue="overview" className="flex-1 p-6">
                <TabsList className="grid w-full grid-cols-3 bg-slate-200">
                  <TabsTrigger value="overview" className="text-xs font-bold">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="text-xs font-bold">
                    Orders ({buyerDetail.orderList?.length ?? 0})
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs font-bold">
                    Activity
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-4 space-y-4">
                  <Card className="border-slate-200">
                    <CardContent className="p-4 space-y-3 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Email Address</span>
                        <span className="font-semibold text-slate-900">{buyerDetail.email || "—"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Phone Number</span>
                        <span className="font-semibold text-slate-900">{buyerDetail.phone || "—"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Delivery Location</span>
                        <span className="font-semibold text-slate-900">{buyerDetail.location || "London"}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Account Status</span>
                        <span className="font-bold capitalize text-slate-900">{buyerDetail.status}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-9 text-xs"
                      onClick={() => {
                        const target = buyers.find((b) => b.id === buyerDetail.id);
                        if (target) setEditBuyer(target);
                      }}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Profile
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-9 text-xs"
                      onClick={() => {
                        const target = buyers.find((b) => b.id === buyerDetail.id);
                        if (target) setMessageTarget(target);
                      }}
                    >
                      <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Message
                    </Button>
                  </div>
                </TabsContent>

                {/* Orders Tab */}
                <TabsContent value="orders" className="mt-4 space-y-2">
                  {buyerDetail.orderList?.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <ShoppingBag className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                      <p className="font-semibold">No orders yet</p>
                      <p className="text-xs">This buyer has not placed any marketplace orders.</p>
                    </div>
                  ) : (
                    buyerDetail.orderList.map((order) => (
                      <Card key={order.id} className="border-slate-200">
                        <CardContent className="p-3 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-900">{order.orderNumber}</p>
                            <p className="text-[10px] text-slate-400">{timeAgo(order.createdAt)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-bold text-slate-900">{formatGbp(order.total)}</p>
                            <Badge variant="outline" className="text-[9px] capitalize">
                              {order.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="mt-4 space-y-2">
                  {buyerDetail.activity?.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Clock className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                      <p className="font-semibold">No recorded activity</p>
                    </div>
                  ) : (
                    buyerDetail.activity.map((item, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{item.action}</span>
                          <span className="text-[10px] text-slate-400">{timeAgo(item.occurredAt)}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-600">
                          Target: {item.targetType} · Outcome: {item.outcome}
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

      {/* Onboard Buyer Modal */}
      <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Onboard New Buyer</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create a new consumer or commercial buyer account in the AgriConnect directory.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Full Name / Business Name *</Label>
              <Input
                placeholder="e.g. John Doe / Fresh Market Foods"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Email Address *</Label>
              <Input
                type="email"
                placeholder="buyer@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Phone Number (Optional)</Label>
              <Input
                placeholder="+44 7123 456789"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Delivery Region / Location</Label>
              <Input
                placeholder="e.g. London / Manchester"
                value={newBuyerLocation}
                onChange={(e) => setNewBuyerLocation(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOnboardOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newName.trim() || !newEmail.trim() || onboardMutation.isPending}
              onClick={() =>
                onboardMutation.mutate({
                  name: newName,
                  email: newEmail,
                  phone: newPhone || undefined,
                  location: newBuyerLocation || undefined,
                })
              }
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              {onboardMutation.isPending ? "Creating..." : "Create Buyer Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Buyer Modal */}
      <Dialog open={Boolean(editBuyer)} onOpenChange={(open) => !open && setEditBuyer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Edit Buyer Account</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update contact info and location for {editBuyer?.name}.
            </DialogDescription>
          </DialogHeader>

          {editBuyer && (
            <div className="space-y-3.5 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Full Name</Label>
                <Input
                  value={editBuyer.name}
                  onChange={(e) => setEditBuyer({ ...editBuyer, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Email Address</Label>
                <Input
                  value={editBuyer.email || ""}
                  onChange={(e) => setEditBuyer({ ...editBuyer, email: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Phone</Label>
                <Input
                  value={editBuyer.phone || ""}
                  onChange={(e) => setEditBuyer({ ...editBuyer, phone: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Location</Label>
                <Input
                  value={editBuyer.location || ""}
                  onChange={(e) => setEditBuyer({ ...editBuyer, location: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditBuyer(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={editMutation.isPending || !editBuyer}
              onClick={() => {
                if (editBuyer) {
                  editMutation.mutate({
                    id: editBuyer.id,
                    data: {
                      name: editBuyer.name,
                      email: editBuyer.email,
                      phone: editBuyer.phone,
                      location: editBuyer.location,
                    },
                  });
                }
              }}
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend / Reactivate Confirmation Dialog */}
      <Dialog open={Boolean(suspendTarget)} onOpenChange={(open) => !open && setSuspendTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">
              {suspendTarget?.status === "suspended" ? "Reactivate Buyer Account" : "Suspend Buyer Account"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {suspendTarget?.status === "suspended"
                ? `Allow ${suspendTarget?.name} to resume placing orders and purchasing on AgriConnect.`
                : `Restrict ${suspendTarget?.name} from placing new orders or checking out.`}
            </DialogDescription>
          </DialogHeader>

          {suspendTarget?.status !== "suspended" && (
            <div className="space-y-2 py-2">
              <Label className="text-xs font-bold text-slate-700">Reason for Suspension (Audit Log)</Label>
              <Input
                placeholder="e.g. Chargeback investigation, suspicious activity..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSuspendTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={toggleStatusMutation.isPending}
              onClick={() => {
                if (suspendTarget) {
                  const nextStatus = suspendTarget.status === "suspended" ? "active" : "suspended";
                  toggleStatusMutation.mutate({
                    id: suspendTarget.id,
                    status: nextStatus,
                    reason: suspendReason || undefined,
                  });
                }
              }}
              className={
                suspendTarget?.status === "suspended"
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-rose-600 text-white hover:bg-rose-700"
              }
            >
              {toggleStatusMutation.isPending
                ? "Updating..."
                : suspendTarget?.status === "suspended"
                ? "Reactivate Account"
                : "Confirm Suspension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Location Modal */}
      <Dialog open={Boolean(assignLocationTarget)} onOpenChange={(open) => !open && setAssignLocationTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Change Delivery Location</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update default geographic delivery market for {assignLocationTarget?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-bold text-slate-700">New Location / Hub</Label>
            <Input
              placeholder="e.g. London, Birmingham, Bristol..."
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAssignLocationTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newLocation.trim() || editMutation.isPending}
              onClick={() => {
                if (assignLocationTarget) {
                  editMutation.mutate({
                    id: assignLocationTarget.id,
                    data: { location: newLocation },
                  });
                }
              }}
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              Update Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Message Modal */}
      <Dialog open={Boolean(messageTarget)} onOpenChange={(open) => !open && setMessageTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Send Notice to Buyer</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Dispatch an administrative notice to {messageTarget?.name} ({messageTarget?.email}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Subject</Label>
              <Input
                placeholder="e.g. Account update, Order inquiry..."
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Message Body</Label>
              <textarea
                rows={4}
                placeholder="Write message here..."
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-xs focus:border-[#078c52] focus:outline-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMessageTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!messageSubject.trim() || !messageBody.trim()}
              onClick={() => {
                toast({
                  title: "Notice Dispatched",
                  description: `Message sent to ${messageTarget?.name}.`,
                });
                setMessageTarget(null);
                setMessageSubject("");
                setMessageBody("");
              }}
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              Dispatch Notice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
