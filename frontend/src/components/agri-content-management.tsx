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
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-11 px-5 rounded-xl border-slate-300 bg-white text-base font-bold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-4.5 w-4.5 mr-2 ${isFetching ? "animate-spin text-emerald-600" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleExportCsv}
            className="h-11 px-5 rounded-xl border-slate-300 bg-white text-base font-bold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="h-4.5 w-4.5 mr-2" />
            <span>Export CSV</span>
          </Button>

          {canManage && (
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="h-11 px-5 rounded-xl bg-[#078c52] text-base font-black text-white shadow-md hover:bg-[#067343] active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5 mr-2" />
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

      {/* Filter Matrix */}
      <Card className="border border-emerald-950/10 bg-white shadow-sm rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search */}
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search title, summary keywords, category, or URL..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-11 pl-11 pr-8 text-base font-medium rounded-xl border-slate-200"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                <SelectTrigger className="h-11 w-[160px] text-sm font-bold rounded-xl border-slate-200">
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
                <SelectTrigger className="h-11 w-[200px] text-sm font-bold rounded-xl border-slate-200 truncate">
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
                <SelectTrigger className="h-11 w-[180px] text-sm font-bold rounded-xl border-slate-200 truncate">
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
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setCategoryFilter("all");
                    setLevelFilter("all");
                    setPage(1);
                  }}
                  className="h-11 px-4 text-sm font-black rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="overflow-hidden border border-emerald-950/10 bg-slate-50/50 shadow-sm rounded-2xl">
        <div className="overflow-x-auto p-3">
          <table className="w-full text-left text-sm border-separate border-spacing-y-2.5">
            <thead className="text-xs font-black uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-5 pb-2 pt-1">Resource Title & Summary</th>
                <th className="px-5 pb-2 pt-1">Knowledge Category</th>
                <th className="px-5 pb-2 pt-1">Target Audience</th>
                <th className="px-5 pb-2 pt-1 text-center">Sort Order</th>
                <th className="px-5 pb-2 pt-1 text-center">Publication Status</th>
                <th className="px-5 pb-2 pt-1 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-medium text-slate-700">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-5 py-5 bg-white rounded-2xl border border-slate-200">
                      <div className="h-4 w-full rounded bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : paginatedResources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                    <BookOpen className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-base font-bold text-slate-700">No content resources match your query</p>
                    <p className="text-xs text-slate-500 mt-0.5">Create a new guide or adjust the filter criteria.</p>
                  </td>
                </tr>
              ) : (
                paginatedResources.map((item) => {
                  const isPublished = item.published || item.status === "published";

                  return (
                    <tr
                      key={item.id}
                      className="group transition-all duration-150 bg-white hover:bg-emerald-50/50 shadow-2xs hover:shadow-xs"
                    >
                      <td className="px-5 py-4 max-w-md border-y border-slate-200/90 first:border-l first:rounded-l-2xl group-hover:border-emerald-300/80 transition-colors">
                        <div className="flex items-start gap-3.5">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#053f36] border border-emerald-200 font-bold shadow-xs">
                            <BookMarked className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <button
                              onClick={() => setSelectedResourceId(item.id)}
                              className="font-black text-slate-900 hover:text-[#078c52] hover:underline text-left block text-sm sm:text-base leading-snug cursor-pointer"
                            >
                              {item.name}
                            </button>
                            <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                              {item.summary}
                            </p>
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="font-mono text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline inline-flex items-center gap-1.5 mt-1.5"
                              >
                                <LinkIcon className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span className="truncate max-w-[280px]">{item.url}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 border-y border-slate-200/90 group-hover:border-emerald-300/80 transition-colors">
                        <Badge variant="outline" className="bg-slate-100 text-slate-800 font-bold text-xs border-slate-200 px-3 py-1 rounded-lg">
                          {item.category}
                        </Badge>
                      </td>

                      <td className="px-5 py-4 border-y border-slate-200/90 group-hover:border-emerald-300/80 transition-colors">
                        <div className="flex flex-wrap gap-1.5">
                          {item.studyLevels?.slice(0, 2).map((lvl) => (
                            <Badge key={lvl} variant="secondary" className="bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/60 px-2.5 py-1 rounded-lg">
                              {lvl}
                            </Badge>
                          ))}
                          {item.studyLevels?.length > 2 && (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-1 rounded-lg">
                              +{item.studyLevels.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center font-mono text-sm font-black text-slate-700 border-y border-slate-200/90 group-hover:border-emerald-300/80 transition-colors">
                        #{item.sortOrder || 0}
                      </td>

                      <td className="px-5 py-4 text-center border-y border-slate-200/90 group-hover:border-emerald-300/80 transition-colors">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
                            isPublished
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isPublished ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {isPublished ? "Published" : "Draft"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right border-y border-slate-200/90 last:border-r last:rounded-r-2xl group-hover:border-emerald-300/80 transition-colors">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedResourceId(item.id)}
                            className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800 text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
                            title="Inspect Resource"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            <span>Inspect</span>
                          </Button>

                          {canManage && (
                            <Button
                              variant="outline"
                              size="sm"
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
                              className="h-9 px-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-black shadow-2xs active:scale-95 transition-all cursor-pointer"
                              title="Edit Resource"
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              <span>Edit</span>
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl border-slate-200 bg-white text-slate-600 hover:text-slate-900 cursor-pointer shadow-2xs">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 text-xs font-bold rounded-xl shadow-lg">
                              <DropdownMenuLabel className="font-black text-slate-900">Resource Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setSelectedResourceId(item.id)} className="cursor-pointer font-bold">
                                <Eye className="mr-2 h-4 w-4 text-emerald-600" />
                                <span>Inspect Handbook</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (item.url) window.open(item.url, "_blank");
                                }}
                                className="cursor-pointer font-bold"
                              >
                                <ExternalLink className="mr-2 h-4 w-4 text-blue-600" />
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
                                className="cursor-pointer font-bold"
                              >
                                <Pencil className="mr-2 h-4 w-4 text-slate-700" />
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
                                className={`cursor-pointer font-bold ${isPublished ? "text-amber-700" : "text-emerald-700"}`}
                              >
                                <Power className="mr-2 h-4 w-4" />
                                <span>{isPublished ? "Unpublish to Draft" : "Publish to Live"}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(item)}
                                className="cursor-pointer font-bold text-rose-600 hover:text-rose-700"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
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
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-5 py-3.5 text-sm text-slate-600">
          <div>
            Showing <span className="font-black text-slate-900">{filteredResources.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-black text-slate-900">{Math.min(page * pageSize, filteredResources.length)}</span> of{" "}
            <span className="font-black text-slate-900">{filteredResources.length}</span> resources
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-9 w-9 p-0 rounded-xl cursor-pointer"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </Button>
            <span className="px-2.5 font-bold text-slate-800 text-sm">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-9 w-9 p-0 rounded-xl cursor-pointer"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Resource Detail Drawer */}
      <Sheet open={Boolean(selectedResourceId)} onOpenChange={(open) => !open && setSelectedResourceId(null)}>
        <SheetContent hideCloseButton side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto bg-slate-50">
          {selectedResource && (
            <div className="flex flex-col min-h-full">
              {/* Header */}
              <div className="bg-[#053f36] p-6 text-white shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-400 font-black text-[#053f36] shadow-sm shrink-0">
                      <BookOpen className="h-7 w-7" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black leading-snug tracking-tight text-white">{selectedResource.name}</h2>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            selectedResource.published
                              ? "border-emerald-400/40 bg-emerald-500/25 text-emerald-200 font-black text-xs px-2.5 py-0.5"
                              : "border-amber-400/40 bg-amber-500/25 text-amber-200 font-black text-xs px-2.5 py-0.5"
                          }
                        >
                          {selectedResource.published ? "Published" : "Draft"}
                        </Badge>
                        <span className="text-xs font-bold text-emerald-100/80">Category: {selectedResource.category}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedResourceId(null)}
                    aria-label="Close dossier"
                    className="rounded-xl p-2 text-white/70 hover:bg-white/15 hover:text-white transition cursor-pointer shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 4 Stat Boxes */}
                <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <div className="rounded-xl bg-white/10 p-3 text-center border border-white/10 backdrop-blur-xs">
                    <p className="text-xs uppercase tracking-wider font-bold text-white/70">Order</p>
                    <p className="text-base sm:text-lg font-black text-lime-300 mt-0.5">#{selectedResource.sortOrder || 0}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3 text-center border border-white/10 backdrop-blur-xs">
                    <p className="text-xs uppercase tracking-wider font-bold text-white/70">Audience</p>
                    <p className="text-sm sm:text-base font-black text-white mt-0.5">{selectedResource.studyLevels?.length || 0} Levels</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3 text-center border border-white/10 backdrop-blur-xs">
                    <p className="text-xs uppercase tracking-wider font-bold text-white/70">Status</p>
                    <p className="text-sm sm:text-base font-black text-emerald-300 capitalize mt-0.5">{selectedResource.status || "Live"}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3 text-center border border-white/10 backdrop-blur-xs">
                    <p className="text-xs uppercase tracking-wider font-bold text-white/70">Updated</p>
                    <p className="text-xs sm:text-sm font-bold text-white/90 mt-0.5">{timeAgo(selectedResource.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Content Details */}
              <div className="flex-1 p-6 space-y-5">
                <Card className="border-slate-200/90 shadow-xs rounded-2xl overflow-hidden bg-white">
                  <CardHeader className="p-4 pb-2.5 bg-slate-50/70 border-b border-slate-100">
                    <CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">
                      Handbook Summary & Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-3.5 text-sm sm:text-base font-medium text-slate-900 leading-relaxed">
                    {selectedResource.summary}
                  </CardContent>
                </Card>

                <Card className="border-slate-200/90 shadow-xs rounded-2xl overflow-hidden bg-white">
                  <CardHeader className="p-4 pb-2.5 bg-slate-50/70 border-b border-slate-100">
                    <CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">
                      Target Audience & Study Levels
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-3.5 flex flex-wrap gap-2.5">
                    {selectedResource.studyLevels?.map((lvl) => (
                      <Badge key={lvl} className="bg-emerald-50 text-emerald-950 border-2 border-emerald-300 font-black text-xs sm:text-sm px-4 py-1.5 rounded-xl shadow-2xs">
                        {lvl}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-slate-200/90 shadow-xs rounded-2xl overflow-hidden bg-white">
                  <CardHeader className="p-4 pb-2.5 bg-slate-50/70 border-b border-slate-100">
                    <CardTitle className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">
                      External URL / PDF Asset Link
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-3.5">
                    <div className="flex items-center justify-between rounded-xl bg-slate-100/90 p-3.5 text-sm sm:text-base border border-slate-200/90 gap-3">
                      <span className="font-mono text-slate-900 truncate flex-1 font-bold">{selectedResource.url}</span>
                      <Button
                        size="sm"
                        onClick={() => window.open(selectedResource.url, "_blank")}
                        className="h-9 px-4 text-xs sm:text-sm font-black gap-2 rounded-xl shrink-0 cursor-pointer bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Open Document</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="space-y-3 pt-3">
                  <Button
                    className="w-full bg-[#078c52] text-white hover:bg-[#067343] text-base sm:text-lg font-black h-13 rounded-2xl shadow-md cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2.5"
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
                    <Pencil className="h-5 w-5" /> Edit Resource Metadata
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-base font-black h-12 rounded-2xl border-2 border-slate-300 hover:bg-slate-100 text-slate-900 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2.5"
                    onClick={() =>
                      togglePublishMutation.mutate({
                        id: selectedResource.id,
                        published: !selectedResource.published,
                      })
                    }
                  >
                    <Power className="h-5 w-5 text-emerald-700" />
                    {selectedResource.published ? "Unpublish to Draft" : "Publish to Live Platform"}
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full text-sm sm:text-base font-black h-11 rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer transition-all flex items-center justify-center gap-2"
                    onClick={() => setDeleteTarget(selectedResource)}
                  >
                    <Trash2 className="h-4.5 w-4.5" /> Delete Resource
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-2xl p-6 bg-white shadow-2xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900">Publish Educational Resource</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 font-medium mt-1">
              Publish technical agronomy guides, DEFRA manuals, or academic publications to AgriConnect.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-sm">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Resource Title *</Label>
              <Input
                placeholder="e.g. DEFRA Sustainable Farming Incentive (SFI) 2026 Handbook"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                className="h-12 text-sm sm:text-base font-medium px-4 rounded-xl border-slate-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Knowledge Category *</Label>
                <Select value={createCategory} onValueChange={setCreateCategory}>
                  <SelectTrigger className="h-12 text-sm sm:text-base font-medium rounded-xl border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c} className="text-sm font-bold">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Sort Priority (Order)</Label>
                <Input
                  type="number"
                  placeholder="1"
                  value={createSortOrder}
                  onChange={(e) => setCreateSortOrder(e.target.value)}
                  className="h-12 text-sm sm:text-base font-mono px-4 rounded-xl border-slate-300"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Summary & Learning Objectives *</Label>
              <textarea
                rows={4}
                placeholder="Comprehensive overview of compliance standards, soil metrics, or farm workflows..."
                value={createSummary}
                onChange={(e) => setCreateSummary(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-3.5 text-sm sm:text-base font-medium focus:border-[#078c52] focus:outline-none leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Resource / PDF URL Link *</Label>
              <Input
                placeholder="https://www.gov.uk/defra-guidance or /resources/handbook.pdf"
                value={createUrl}
                onChange={(e) => setCreateUrl(e.target.value)}
                className="h-12 text-sm sm:text-base font-mono px-4 rounded-xl border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Target Audiences</Label>
              <div className="flex flex-wrap gap-2.5 pt-0.5">
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
                      className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-black transition-all cursor-pointer active:scale-95 ${
                        isChecked
                          ? "bg-[#078c52] text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80"
                      }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50/70 p-4">
              <div>
                <Label className="text-sm sm:text-base font-black text-slate-900">Publish Immediately</Label>
                <p className="text-xs text-slate-500 font-medium">Make this guide visible in user portal resource feeds</p>
              </div>
              <Switch checked={createPublished} onCheckedChange={setCreatePublished} />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
              className="h-12 px-6 text-sm sm:text-base font-black rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
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
              className="h-12 px-8 text-sm sm:text-base font-black rounded-xl bg-[#078c52] hover:bg-[#067343] text-white shadow-md cursor-pointer active:scale-95"
            >
              {createContentMutation.isPending ? "Publishing..." : "Publish Resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={Boolean(editTarget)} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-xl rounded-2xl p-6 bg-white shadow-2xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900">Edit Resource Metadata</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 font-medium mt-1">
              Modify publication information and target eligibility.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-sm">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Resource Title *</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-12 text-sm sm:text-base font-medium px-4 rounded-xl border-slate-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Knowledge Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger className="h-12 text-sm sm:text-base font-medium rounded-xl border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c} className="text-sm font-bold">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Sort Priority (Order)</Label>
                <Input
                  type="number"
                  value={editSortOrder}
                  onChange={(e) => setEditSortOrder(e.target.value)}
                  className="h-12 text-sm sm:text-base font-mono px-4 rounded-xl border-slate-300"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Summary *</Label>
              <textarea
                rows={4}
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-3.5 text-sm sm:text-base font-medium focus:border-[#078c52] focus:outline-none leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Resource / PDF URL Link *</Label>
              <Input
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                className="h-12 text-sm sm:text-base font-mono px-4 rounded-xl border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">Target Audiences</Label>
              <div className="flex flex-wrap gap-2.5 pt-0.5">
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
                      className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-black transition-all cursor-pointer active:scale-95 ${
                        isChecked
                          ? "bg-[#078c52] text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80"
                      }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50/70 p-4">
              <div>
                <Label className="text-sm sm:text-base font-black text-slate-900">Publish Status</Label>
                <p className="text-xs text-slate-500 font-medium">Live platform accessibility</p>
              </div>
              <Switch checked={editPublished} onCheckedChange={setEditPublished} />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setEditTarget(null)}
              className="h-12 px-6 text-sm sm:text-base font-black rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
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
              className="h-12 px-8 text-sm sm:text-base font-black rounded-xl bg-[#078c52] text-white hover:bg-[#067343] shadow-md cursor-pointer active:scale-95"
            >
              {updateContentMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white shadow-2xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-black text-rose-600">Delete Content Resource</DialogTitle>
            <DialogDescription className="text-sm sm:text-base text-slate-600 font-medium mt-1 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-900 font-black">{deleteTarget?.name}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="h-12 px-6 text-sm sm:text-base font-black rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              disabled={deleteContentMutation.isPending}
              onClick={() => {
                if (deleteTarget) {
                  deleteContentMutation.mutate(deleteTarget.id);
                }
              }}
              className="h-12 px-7 text-sm sm:text-base font-black rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-md cursor-pointer active:scale-95"
            >
              {deleteContentMutation.isPending ? "Deleting..." : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
