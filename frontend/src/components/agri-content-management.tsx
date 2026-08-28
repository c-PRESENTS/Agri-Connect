import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  Award,
  BadgeCheck,
  BookMarked,
  BookOpen,
  Bookmark,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  GraduationCap,
  HelpCircle,
  Layers,
  Leaf,
  Library,
  Lightbulb,
  Link as LinkIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export type AdminContentResource = {
  id: string;
  name: string; // Title mapped to name
  summary: string;
  url: string;
  category: string;
  studyLevels: string[];
  published: boolean;
  status: "published" | "draft" | string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

const CATEGORY_OPTIONS = [
  "DEFRA & Farm Grants",
  "Agronomy & Soil Science",
  "AgriTech & Automation",
  "Organic Horticulture",
  "Livestock & Animal Welfare",
  "Supply Chain Logistics",
  "Sustainable Business",
];

const STUDY_LEVEL_OPTIONS = [
  "Professional Farmer",
  "Undergraduate",
  "Postgraduate",
  "Apprenticeship",
  "General Public",
];

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

export function AgriContentManagement({
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
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createCategory, setCreateCategory] = useState("DEFRA & Farm Grants");
  const [createSummary, setCreateSummary] = useState("");
  const [createUrl, setCreateUrl] = useState("");
  const [createLevels, setCreateLevels] = useState<string[]>(["Professional Farmer"]);
  const [createPublished, setCreatePublished] = useState(true);
  const [createSortOrder, setCreateSortOrder] = useState("1");

  const [editTarget, setEditTarget] = useState<AdminContentResource | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editLevels, setEditLevels] = useState<string[]>([]);
  const [editPublished, setEditPublished] = useState(true);
  const [editSortOrder, setEditSortOrder] = useState("1");

  const [deleteTarget, setDeleteTarget] = useState<AdminContentResource | null>(null);

  // Query content resources
  const { data: contentData, isLoading, refetch, isFetching } = useQuery<{
    records: AdminContentResource[];
    generatedAt: string;
  }>({
    queryKey: ["/api/admin/control-centre/resources/content"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/control-centre/resources/content");
      return res.json();
    },
  });

  const resources = useMemo(() => contentData?.records ?? [], [contentData]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    resources.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set).sort();
  }, [resources]);

  // Selected resource for drawer
  const selectedResource = useMemo(
    () => resources.find((r) => r.id === selectedResourceId) ?? null,
    [resources, selectedResourceId]
  );

  // Filter content
  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchTitle = r.name?.toLowerCase().includes(q);
        const matchSummary = r.summary?.toLowerCase().includes(q);
        const matchCategory = r.category?.toLowerCase().includes(q);
        const matchUrl = r.url?.toLowerCase().includes(q);
        const matchId = r.id?.toLowerCase().includes(q);
        if (!matchTitle && !matchSummary && !matchCategory && !matchUrl && !matchId) return false;
      }

      if (statusFilter !== "all" && (r.status || (r.published ? "published" : "draft")) !== statusFilter) return false;
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (levelFilter !== "all" && !r.studyLevels?.includes(levelFilter)) return false;

      return true;
    });
  }, [resources, search, statusFilter, categoryFilter, levelFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredResources.length / pageSize) || 1;
  const paginatedResources = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredResources.slice(start, start + pageSize);
  }, [filteredResources, page, pageSize]);

  // KPI Metrics
  const stats = useMemo(() => {
    const total = resources.length;
    const published = resources.filter((r) => r.published || r.status === "published").length;
    const drafts = resources.filter((r) => !r.published || r.status === "draft").length;
    const catCount = categories.length;
    const farmerGuides = resources.filter((r) => r.studyLevels?.includes("Professional Farmer")).length;
    const academicGuides = resources.filter((r) => r.studyLevels?.includes("Undergraduate") || r.studyLevels?.includes("Postgraduate")).length;

    return {
      total,
      published,
      drafts,
      catCount,
      farmerGuides,
      academicGuides,
    };
  }, [resources, categories]);

  // Mutations
  const createContentMutation = useMutation({
    mutationFn: async (payload: unknown) => {
      const res = await apiRequest("POST", "/api/admin/content", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Resource Published", description: "Educational handbook added to the knowledge catalog." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/control-centre/resources/content"] });
      setCreateModalOpen(false);
      setCreateTitle("");
      setCreateSummary("");
      setCreateUrl("");
      setCreateLevels(["Professional Farmer"]);
    },
    onError: (err: Error) => {
      toast({ title: "Creation failed", description: err.message, variant: "destructive" });
    },
  });

  const updateContentMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: unknown }) => {
      const res = await apiRequest("PATCH", `/api/admin/content/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Resource Updated", description: "Content details saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/control-centre/resources/content"] });
      setEditTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/content/${id}`, { published });
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast({
        title: vars.published ? "Content Published" : "Content Moved to Draft",
        description: "Publication status updated across user portals.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/control-centre/resources/content"] });
    },
    onError: (err: Error) => {
      toast({ title: "Status toggle failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteContentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/content/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Resource Deleted", description: "Item removed from platform repository." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/control-centre/resources/content"] });
      setDeleteTarget(null);
      setSelectedResourceId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Deletion failed", description: err.message, variant: "destructive" });
    },
  });

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["Resource ID", "Title", "Category", "Target Study Levels", "URL", "Status", "Sort Order", "Updated At"];
    const rows = filteredResources.map((r) => [
      `"${r.id}"`,
      `"${r.name.replaceAll('"', '""')}"`,
      `"${r.category}"`,
      `"${(r.studyLevels || []).join("; ")}"`,
      `"${r.url}"`,
      `"${r.published || r.status === "published" ? "Published" : "Draft"}"`,
      `"${r.sortOrder || 0}"`,
      `"${r.updatedAt}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agriconnect-content-resources-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV Exported", description: `Exported ${filteredResources.length} content resources.` });
  };

  const canManage = permissions.includes("content.manage") || permissions.includes("dashboard.view");

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <span>Management</span>
            <span>/</span>
            <span>Knowledge & Content</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Content & Knowledge Hub Management
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Publish agricultural guides, DEFRA policy handbooks, agronomy toolkits, research papers, and student curriculum resources.
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

          {canManage && (
            <Button
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="h-9 gap-1.5 bg-[#078c52] font-semibold text-white shadow-sm hover:bg-[#067343]"
            >
              <Plus className="h-4 w-4" />
              <span>+ Create Resource</span>
            </Button>
          )}
        </div>
      </div>

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Total Resources"
          value={stats.total.toLocaleString()}
          subtitle="Platform knowledge"
          icon={Library}
          iconBg="bg-emerald-50"
          iconColor="text-[#078c52]"
        />
        <StatCard
          title="Published & Live"
          value={stats.published.toLocaleString()}
          subtitle="Accessible to users"
          icon={BadgeCheck}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="Drafting Stage"
          value={stats.drafts.toLocaleString()}
          subtitle="Pending publication"
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Categories"
          value={stats.catCount.toLocaleString()}
          subtitle="Subject domains"
          icon={Layers}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Farmer Guides"
          value={stats.farmerGuides.toLocaleString()}
          subtitle="Grower toolkits"
          icon={Leaf}
          iconBg="bg-lime-50"
          iconColor="text-lime-700"
        />
        <StatCard
          title="Academic Papers"
          value={stats.academicGuides.toLocaleString()}
          subtitle="Curriculum briefs"
          icon={GraduationCap}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
      </div>

      {/* Filter Matrix Card */}
      <Card className="border border-emerald-950/10 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search */}
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search title, summary keywords, category, or URL..."
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
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="published">Published (Live)</SelectItem>
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
                <SelectTrigger className="h-10 w-[190px] text-xs font-medium truncate">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={levelFilter}
                onValueChange={(val) => {
                  setLevelFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-[170px] text-xs font-medium truncate">
                  <SelectValue placeholder="Target Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Audiences</SelectItem>
                  {STUDY_LEVEL_OPTIONS.map((lvl) => (
                    <SelectItem key={lvl} value={lvl}>
                      {lvl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(search || statusFilter !== "all" || categoryFilter !== "all" || levelFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setCategoryFilter("all");
                    setLevelFilter("all");
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
                <th className="px-4 py-3">Resource Title & Summary</th>
                <th className="px-4 py-3">Knowledge Category</th>
                <th className="px-4 py-3">Target Audience</th>
                <th className="px-4 py-3 text-center">Sort Order</th>
                <th className="px-4 py-3 text-center">Publication Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="h-4 w-full rounded bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : paginatedResources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <BookOpen className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-semibold">No content resources match your query</p>
                    <p className="text-xs">Create a new guide or adjust the filter criteria.</p>
                  </td>
                </tr>
              ) : (
                paginatedResources.map((item) => {
                  const isPublished = item.published || item.status === "published";

                  return (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-emerald-50/40"
                    >
                      <td className="px-4 py-3.5 max-w-sm">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#053f36] border border-emerald-100 font-bold">
                            <BookMarked className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => setSelectedResourceId(item.id)}
                              className="font-bold text-slate-900 hover:text-[#078c52] hover:underline text-left block truncate max-w-xs"
                            >
                              {item.name}
                            </button>
                            <p className="line-clamp-1 text-[11px] text-slate-500">{item.summary}</p>
                            <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <LinkIcon className="h-2.5 w-2.5" />
                              <span className="truncate max-w-[200px]">{item.url}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 font-medium text-[10px]">
                          {item.category}
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {item.studyLevels?.slice(0, 2).map((lvl) => (
                            <Badge key={lvl} variant="secondary" className="bg-emerald-50 text-emerald-800 text-[9px] font-semibold">
                              {lvl}
                            </Badge>
                          ))}
                          {item.studyLevels?.length > 2 && (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[9px]">
                              +{item.studyLevels.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center font-mono text-xs font-bold text-slate-600">
                        #{item.sortOrder || 0}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isPublished
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isPublished ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {isPublished ? "Published" : "Draft"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedResourceId(item.id)}
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            title="Inspect Resource"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditTarget(item);
                                setEditTitle(item.name);
                                setEditCategory(item.category);
                                setEditSummary(item.summary);
                                setEditUrl(item.url);
                                setEditLevels(item.studyLevels || []);
                                setEditPublished(item.published || item.status === "published");
                                setEditSortOrder((item.sortOrder || 0).toString());
                              }}
                              className="h-7 w-7 text-slate-500 hover:text-slate-900"
                              title="Edit Resource"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs font-medium">
                              <DropdownMenuLabel>Resource Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setSelectedResourceId(item.id)}>
                                <Eye className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                                <span>Inspect Handbook</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (item.url) window.open(item.url, "_blank");
                                }}
                              >
                                <ExternalLink className="mr-2 h-3.5 w-3.5 text-blue-600" />
                                <span>Open Document URL</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditTarget(item);
                                  setEditTitle(item.name);
                                  setEditCategory(item.category);
                                  setEditSummary(item.summary);
                                  setEditUrl(item.url);
                                  setEditLevels(item.studyLevels || []);
                                  setEditPublished(item.published || item.status === "published");
                                  setEditSortOrder((item.sortOrder || 0).toString());
                                }}
                              >
                                <Pencil className="mr-2 h-3.5 w-3.5 text-slate-700" />
                                <span>Edit Metadata</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  togglePublishMutation.mutate({
                                    id: item.id,
                                    published: !isPublished,
                                  })
                                }
                                className={isPublished ? "text-amber-700" : "text-emerald-700"}
                              >
                                <Power className="mr-2 h-3.5 w-3.5" />
                                <span>{isPublished ? "Unpublish to Draft" : "Publish to Live"}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(item)}
                                className="text-rose-600"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                <span>Delete Resource</span>
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

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-900">{filteredResources.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">{Math.min(page * pageSize, filteredResources.length)}</span> of{" "}
            <span className="font-semibold text-slate-900">{filteredResources.length}</span> resources
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

      {/* Resource Detail Drawer */}
      <Sheet open={Boolean(selectedResourceId)} onOpenChange={(open) => !open && setSelectedResourceId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto bg-slate-50">
          {selectedResource && (
            <div className="flex flex-col min-h-full">
              {/* Header */}
              <div className="bg-[#053f36] p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lime-400 font-bold text-[#053f36]">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-base font-black leading-snug">{selectedResource.name}</h2>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            selectedResource.published
                              ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-200"
                              : "border-amber-400/30 bg-amber-500/20 text-amber-200"
                          }
                        >
                          {selectedResource.published ? "Published" : "Draft"}
                        </Badge>
                        <span className="text-[10px] text-white/60">Category: {selectedResource.category}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedResourceId(null)}
                    className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 4 Stat Boxes */}
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Order</p>
                    <p className="text-sm font-black text-lime-300">#{selectedResource.sortOrder || 0}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Audience</p>
                    <p className="text-xs font-bold text-white">{selectedResource.studyLevels?.length || 0} Levels</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Status</p>
                    <p className="text-xs font-bold text-emerald-300 capitalize">{selectedResource.status || "Live"}</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Updated</p>
                    <p className="text-[11px] font-medium text-white/80">{timeAgo(selectedResource.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Content Details */}
              <div className="flex-1 p-6 space-y-4">
                <Card className="border-slate-200">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Handbook Summary & Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-xs text-slate-700 leading-relaxed">
                    {selectedResource.summary}
                  </CardContent>
                </Card>

                <Card className="border-slate-200">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Target Audience & Study Levels
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 flex flex-wrap gap-1.5">
                    {selectedResource.studyLevels?.map((lvl) => (
                      <Badge key={lvl} className="bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold text-xs">
                        {lvl}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-slate-200">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      External URL / PDF Asset Link
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex items-center justify-between rounded-lg bg-slate-100 p-2.5 text-xs">
                      <span className="font-mono text-slate-700 truncate max-w-[320px]">{selectedResource.url}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(selectedResource.url, "_blank")}
                        className="h-7 text-[11px] gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Open</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <Button
                    className="w-full bg-[#078c52] text-white hover:bg-[#067343] text-xs h-9"
                    onClick={() => {
                      setEditTarget(selectedResource);
                      setEditTitle(selectedResource.name);
                      setEditCategory(selectedResource.category);
                      setEditSummary(selectedResource.summary);
                      setEditUrl(selectedResource.url);
                      setEditLevels(selectedResource.studyLevels || []);
                      setEditPublished(selectedResource.published || selectedResource.status === "published");
                      setEditSortOrder((selectedResource.sortOrder || 0).toString());
                    }}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Resource Metadata
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-xs h-9"
                    onClick={() =>
                      togglePublishMutation.mutate({
                        id: selectedResource.id,
                        published: !selectedResource.published,
                      })
                    }
                  >
                    <Power className="mr-1.5 h-3.5 w-3.5" />
                    {selectedResource.published ? "Unpublish to Draft" : "Publish to Live Platform"}
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full text-xs h-9 text-rose-600 hover:bg-rose-50"
                    onClick={() => setDeleteTarget(selectedResource)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete Resource
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Publish Educational Resource</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Publish technical agronomy guides, DEFRA manuals, or academic publications to AgriConnect.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Resource Title *</Label>
              <Input
                placeholder="e.g. DEFRA Sustainable Farming Incentive (SFI) 2026 Handbook"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Knowledge Category *</Label>
                <Select value={createCategory} onValueChange={setCreateCategory}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Sort Priority (Order)</Label>
                <Input
                  type="number"
                  placeholder="1"
                  value={createSortOrder}
                  onChange={(e) => setCreateSortOrder(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Summary & Learning Objectives *</Label>
              <textarea
                rows={3}
                placeholder="Comprehensive overview of compliance standards, soil metrics, or farm workflows..."
                value={createSummary}
                onChange={(e) => setCreateSummary(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-xs focus:border-[#078c52] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Resource / PDF URL Link *</Label>
              <Input
                placeholder="https://www.gov.uk/defra-guidance or /resources/handbook.pdf"
                value={createUrl}
                onChange={(e) => setCreateUrl(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Target Audiences</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {STUDY_LEVEL_OPTIONS.map((lvl) => {
                  const isChecked = createLevels.includes(lvl);
                  return (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => {
                        if (isChecked) {
                          setCreateLevels(createLevels.filter((l) => l !== lvl));
                        } else {
                          setCreateLevels([...createLevels, lvl]);
                        }
                      }}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        isChecked
                          ? "bg-[#078c52] text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5">
              <div>
                <Label className="text-xs font-bold text-slate-800">Publish Immediately</Label>
                <p className="text-[10px] text-slate-500">Make this guide visible in user portal resource feeds</p>
              </div>
              <Switch checked={createPublished} onCheckedChange={setCreatePublished} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!createTitle.trim() || !createSummary.trim() || !createUrl.trim() || createContentMutation.isPending}
              onClick={() =>
                createContentMutation.mutate({
                  title: createTitle.trim(),
                  category: createCategory,
                  summary: createSummary.trim(),
                  url: createUrl.trim(),
                  studyLevels: createLevels.length ? createLevels : ["Professional Farmer"],
                  published: createPublished,
                  sortOrder: parseInt(createSortOrder) || 0,
                })
              }
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              {createContentMutation.isPending ? "Publishing..." : "Publish Resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={Boolean(editTarget)} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900">Edit Resource Metadata</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Modify publication information and target eligibility.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Resource Title *</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Knowledge Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Sort Priority (Order)</Label>
                <Input
                  type="number"
                  value={editSortOrder}
                  onChange={(e) => setEditSortOrder(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Summary *</Label>
              <textarea
                rows={3}
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2 text-xs focus:border-[#078c52] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Resource / PDF URL Link *</Label>
              <Input
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Target Audiences</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {STUDY_LEVEL_OPTIONS.map((lvl) => {
                  const isChecked = editLevels.includes(lvl);
                  return (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => {
                        if (isChecked) {
                          setEditLevels(editLevels.filter((l) => l !== lvl));
                        } else {
                          setEditLevels([...editLevels, lvl]);
                        }
                      }}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        isChecked
                          ? "bg-[#078c52] text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5">
              <div>
                <Label className="text-xs font-bold text-slate-800">Publish Status</Label>
                <p className="text-[10px] text-slate-500">Live platform accessibility</p>
              </div>
              <Switch checked={editPublished} onCheckedChange={setEditPublished} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!editTitle.trim() || !editSummary.trim() || !editUrl.trim() || updateContentMutation.isPending}
              onClick={() => {
                if (editTarget) {
                  updateContentMutation.mutate({
                    id: editTarget.id,
                    payload: {
                      title: editTitle.trim(),
                      category: editCategory,
                      summary: editSummary.trim(),
                      url: editUrl.trim(),
                      studyLevels: editLevels,
                      published: editPublished,
                      sortOrder: parseInt(editSortOrder) || 0,
                    },
                  });
                }
              }}
              className="bg-[#078c52] text-white hover:bg-[#067343]"
            >
              {updateContentMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-rose-600">Delete Content Resource</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to permanently delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={deleteContentMutation.isPending}
              onClick={() => {
                if (deleteTarget) {
                  deleteContentMutation.mutate(deleteTarget.id);
                }
              }}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {deleteContentMutation.isPending ? "Deleting..." : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
