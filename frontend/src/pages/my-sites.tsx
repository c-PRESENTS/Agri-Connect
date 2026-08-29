import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import {
  Globe, Plus, Search, ExternalLink, Trash2, Edit2, Bookmark,
  RotateCcw, Sparkles, ShieldCheck, CloudSun, Layers, ArrowUpRight,
  FolderPlus, Check, X, Building, Truck, Cpu, BookOpen, AlertCircle,
  ArrowLeft, Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export interface SiteBookmark {
  id: string;
  name: string;
  url: string;
  category: "Government" | "Agriculture" | "Weather" | "News & Media" | "E-Commerce" | "Custom";
  color: string;
  description?: string;
  pinned?: boolean;
}

const LS_KEY = "agri-user-bookmarks-v2";
const LEGACY_LS_KEY = "agri-user-bookmarks";

const DEFAULT_SITES: SiteBookmark[] = [
  {
    id: "gov-uk",
    name: "GOV.UK DEFRA",
    url: "https://www.gov.uk/government/organisations/department-for-environment-food-rural-affairs",
    category: "Government",
    color: "bg-sky-500",
    description: "UK Department for Environment, Food & Rural Affairs policies & schemes.",
    pinned: true,
  },
  {
    id: "tnau",
    name: "TNAU Agritech Portal",
    url: "https://agritech.tnau.ac.in",
    category: "Agriculture",
    color: "bg-emerald-500",
    description: "Crop production guides, farm technology & university agricultural knowledge base.",
    pinned: true,
  },
  {
    id: "bbc-food",
    name: "BBC Food & News",
    url: "https://www.bbc.co.uk/food",
    category: "News & Media",
    color: "bg-rose-500",
    description: "Seasonal agricultural recipes, nutrition insights & food safety guidelines.",
    pinned: true,
  },
  {
    id: "weather",
    name: "Met Weather Radar",
    url: "https://wttr.in/?format=html",
    category: "Weather",
    color: "bg-blue-500",
    description: "Live hyperlocal precipitation, temperature & wind radar forecasts.",
    pinned: true,
  },
  {
    id: "agrimarket",
    name: "Agri Markets e-NAM",
    url: "https://www.agrimarket.gov.in",
    category: "Government",
    color: "bg-amber-500",
    description: "National agricultural mandi prices, daily commodity rates & arrival stats.",
    pinned: true,
  },
  {
    id: "amazon-agri",
    name: "Amazon Farm Supplies",
    url: "https://www.amazon.co.uk",
    category: "E-Commerce",
    color: "bg-orange-500",
    description: "Quick access to farming equipment, tools, seeds and packaging supplies.",
    pinned: true,
  },
  {
    id: "apeda",
    name: "APEDA Export Portal",
    url: "https://apeda.gov.in",
    category: "Government",
    color: "bg-indigo-500",
    description: "Agricultural & Processed Food Products Export Development Authority.",
    pinned: false,
  },
  {
    id: "icar",
    name: "ICAR Agricultural Research",
    url: "https://icar.org.in",
    category: "Agriculture",
    color: "bg-teal-500",
    description: "Indian Council of Agricultural Research breakthroughs & hybrid seed varieties.",
    pinned: false,
  },
];

const COLOR_OPTIONS = [
  { label: "Sky Blue", value: "bg-sky-500" },
  { label: "Emerald Green", value: "bg-emerald-500" },
  { label: "Rose Red", value: "bg-rose-500" },
  { label: "Amber Yellow", value: "bg-amber-500" },
  { label: "Royal Blue", value: "bg-blue-500" },
  { label: "Orange", value: "bg-orange-500" },
  { label: "Indigo Purple", value: "bg-indigo-500" },
  { label: "Teal", value: "bg-teal-500" },
];

function loadSites(): SiteBookmark[] {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) return JSON.parse(saved);

    // Migration from legacy bookmarks if present
    const legacy = localStorage.getItem(LEGACY_LS_KEY);
    if (legacy) {
      const parsedLegacy = JSON.parse(legacy);
      if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
        return parsedLegacy.map((item: any) => ({
          id: item.id || `site-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: item.name || "Custom Site",
          url: item.url || "https://example.com",
          category: "Custom",
          color: item.color || "bg-emerald-500",
          description: "Saved quick-access website bookmark.",
          pinned: true,
        }));
      }
    }
  } catch (e) {
    console.error("Failed to load sites", e);
  }
  return DEFAULT_SITES;
}

function saveSites(sites: SiteBookmark[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(sites));
    // Also keep legacy key synced for top-bar components
    const legacyBookmarks = sites.map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      color: s.color,
    }));
    localStorage.setItem(LEGACY_LS_KEY, JSON.stringify(legacyBookmarks));
    window.dispatchEvent(new CustomEvent("agri-bookmarks-updated"));
  } catch (e) {
    console.error("Failed to save sites", e);
  }
}

export default function MySitesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [sites, setSites] = useState<SiteBookmark[]>(() => loadSites());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Add / Edit Modal state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formCategory, setFormCategory] = useState<SiteBookmark["category"]>("Custom");
  const [formColor, setFormColor] = useState("bg-emerald-500");
  const [formDesc, setFormDesc] = useState("");

  // Preview Drawer Modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  useEffect(() => {
    saveSites(sites);
  }, [sites]);

  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      const matchesSearch =
        site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (site.description && site.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategory === "all" || site.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [sites, searchQuery, selectedCategory]);

  const openAddDialog = useCallback(() => {
    setEditingId(null);
    setFormName("");
    setFormUrl("");
    setFormCategory("Custom");
    setFormColor("bg-emerald-500");
    setFormDesc("");
    setIsDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((site: SiteBookmark) => {
    setEditingId(site.id);
    setFormName(site.name);
    setFormUrl(site.url);
    setFormCategory(site.category);
    setFormColor(site.color);
    setFormDesc(site.description || "");
    setIsDialogOpen(true);
  }, []);

  const handleSaveSite = () => {
    const trimmedName = formName.trim();
    let trimmedUrl = formUrl.trim();
    if (!trimmedName || !trimmedUrl) {
      toast({ title: "Please provide both site name and valid URL", variant: "destructive" });
      return;
    }

    if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
      trimmedUrl = "https://" + trimmedUrl;
    }

    if (editingId) {
      setSites((prev) =>
        prev.map((s) =>
          s.id === editingId
            ? {
                ...s,
                name: trimmedName,
                url: trimmedUrl,
                category: formCategory,
                color: formColor,
                description: formDesc.trim(),
              }
            : s,
        ),
      );
      toast({ title: `Updated "${trimmedName}" successfully!` });
    } else {
      const newSite: SiteBookmark = {
        id: `site-${Date.now()}`,
        name: trimmedName,
        url: trimmedUrl,
        category: formCategory,
        color: formColor,
        description: formDesc.trim(),
        pinned: true,
      };
      setSites((prev) => [newSite, ...prev]);
      toast({ title: `Added "${trimmedName}" to My Sites!` });
    }
    setIsDialogOpen(false);
  };

  const handleDeleteSite = (id: string, name: string) => {
    setSites((prev) => prev.filter((s) => s.id !== id));
    toast({ title: `Removed "${name}" from My Sites` });
  };

  const handleTogglePin = (id: string) => {
    setSites((prev) =>
      prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s)),
    );
  };

  const handleRestoreDefaults = () => {
    setSites(DEFAULT_SITES);
    toast({ title: "Restored all default official agricultural & partner sites" });
  };

  const handleOpenSite = (site: SiteBookmark) => {
    window.open(site.url, "_blank", "noopener,noreferrer");
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "Government":
        return <Building className="h-3.5 w-3.5" />;
      case "Agriculture":
        return <ShieldCheck className="h-3.5 w-3.5" />;
      case "Weather":
        return <CloudSun className="h-3.5 w-3.5" />;
      case "News & Media":
        return <BookOpen className="h-3.5 w-3.5" />;
      case "E-Commerce":
        return <Layers className="h-3.5 w-3.5" />;
      default:
        return <Globe className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-6 dark:bg-background">
      {/* ─── HERO HEADER ─── */}
      <div className="border-b border-emerald-950/40 bg-gradient-to-r from-emerald-900 via-emerald-800 to-green-900 px-3 py-3 text-white shadow-sm sm:px-4 lg:px-5">
        <div className="flex w-full flex-col justify-between gap-2.5 md:flex-row md:items-center">
          <div className="min-w-0">
            {/* Top Row: Back to Home + Portal Badge */}
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <Link href="/">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 rounded-lg border-emerald-500/50 bg-emerald-950/60 px-2.5 text-[11px] font-bold text-emerald-100 shadow-xs hover:bg-emerald-900 hover:text-white"
                  data-testid="button-back-to-home"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Homepage</span>
                </Button>
              </Link>

              <Badge className="border-emerald-400/40 bg-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                <Globe className="h-3 w-3 mr-1.5" /> Quick-Access Web Portal
              </Badge>
            </div>

            <h1 className="text-lg font-black tracking-tight sm:text-xl">
              My Sites & Digital Ecosystem
            </h1>
            <p className="mt-0.5 max-w-4xl text-[11px] font-medium leading-snug text-emerald-100/80 sm:text-xs">
              Manage your personal shortcuts, official government portals, agricultural price indices, and weather feeds in one unified workspace.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-nowrap">
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="h-7 rounded-lg border-emerald-600/60 bg-emerald-950/40 px-2.5 text-[11px] font-bold text-emerald-100 hover:bg-emerald-900 hover:text-white"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Home</span>
              </Button>
            </Link>

            <Button
              onClick={handleRestoreDefaults}
              variant="outline"
              size="sm"
              className="h-7 rounded-lg border-emerald-600/60 bg-emerald-950/40 px-2.5 text-[11px] font-bold text-emerald-100 hover:bg-emerald-900 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Defaults</span>
            </Button>
            <Button
              onClick={openAddDialog}
              className="h-7 rounded-lg bg-emerald-500 px-2.5 text-[11px] font-black text-emerald-950 shadow-sm hover:bg-emerald-400"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Site</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="w-full space-y-3 px-3 pt-3 sm:px-4 lg:px-5">
        {/* Search & Category Filter Bar */}
        <div className="flex flex-col items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-white p-2 shadow-2xs dark:border-border/60 dark:bg-card lg:flex-row">
          <div className="relative w-full lg:max-w-lg lg:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sites by name, domain, description..."
              className="h-8 rounded-md border-slate-200 bg-slate-50 pl-9 text-xs font-medium dark:border-border/60 dark:bg-muted/40"
            />
          </div>

          <div className="no-scrollbar flex w-full items-center gap-1.5 overflow-x-auto lg:w-auto">
            {["all", "Government", "Agriculture", "Weather", "News & Media", "E-Commerce", "Custom"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold transition-colors ${
                  selectedCategory === cat
                    ? "bg-emerald-800 text-white shadow-2xs font-black"
                    : "bg-slate-100 dark:bg-muted text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {cat === "all" ? "All Sites" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Sites Grid */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {filteredSites.map((site) => {
            let domain = "";
            try {
              domain = new URL(site.url).hostname.replace(/^www\./, "");
            } catch {
              domain = site.url;
            }

            return (
              <div
                key={site.id}
                className="group flex min-h-[154px] flex-col justify-between rounded-lg border border-slate-200/80 bg-white p-2.5 shadow-2xs transition-[border-color,box-shadow] duration-200 hover:border-emerald-500/50 hover:shadow-md dark:border-border/60 dark:bg-card"
              >
                <div>
                  {/* Top Bar: Icon + Category Badge + Options */}
                  <div className="mb-1.5 flex items-start justify-between gap-1.5">
                    <div
                      className={`h-8 w-8 shrink-0 rounded-lg ${site.color} flex items-center justify-center text-xs font-black text-white shadow-xs transition-transform group-hover:scale-105`}
                    >
                      {site.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex items-center gap-1">
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-muted dark:text-slate-300"
                      >
                        {getCategoryIcon(site.category)}
                        <span>{site.category}</span>
                      </Badge>
                      <button
                        type="button"
                        onClick={() => openEditDialog(site)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-muted dark:hover:text-slate-200"
                        title="Edit site"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSite(site.id, site.name)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        title="Delete site"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Domain */}
                  <h3 className="line-clamp-1 text-xs font-black text-slate-900 transition-colors group-hover:text-emerald-700 dark:text-slate-100 dark:group-hover:text-emerald-400">
                    {site.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold truncate mt-0.5">
                    {domain}
                  </p>

                  {/* Description */}
                  {site.description && (
                    <p className="mt-1 line-clamp-2 text-[10px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                      {site.description}
                    </p>
                  )}
                </div>

                {/* Bottom Launch Button */}
                <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-border/40">
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                    {site.pinned && <Bookmark className="h-3 w-3 fill-current" aria-hidden="true" />}
                    {site.pinned ? "Pinned shortcut" : "Shortcut"}
                  </span>
                  <Button
                    onClick={() => handleOpenSite(site)}
                    size="sm"
                    className="h-6 rounded-md bg-emerald-800 px-2 text-[10px] font-bold text-white shadow-2xs transition-colors hover:bg-emerald-900"
                  >
                    <span>Launch</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state if nothing matches */}
        {filteredSites.length === 0 && (
          <div className="p-12 text-center bg-white dark:bg-card rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <Globe className="h-10 w-10 text-slate-400 mx-auto opacity-60" />
            <h3 className="font-black text-slate-800 dark:text-slate-200">No sites found</h3>
            <p className="text-xs text-slate-400">
              No bookmarks match your search. Try changing filters or add a new custom site.
            </p>
            <Button
              onClick={openAddDialog}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs h-9"
            >
              + Add Custom Site
            </Button>
          </div>
        )}
      </div>

      {/* ─── ADD / EDIT SITE DIALOG MODAL ─── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-black text-lg text-slate-900 dark:text-slate-100">
              {editingId ? "Edit Site Bookmark" : "Add New Site Bookmark"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Save any website, mandi price tracker, research portal, or tool for instant 1-click access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Site Title</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. AgriMarket Mandi Rates"
                className="h-9 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Website URL</Label>
              <Input
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://example.com"
                className="h-9 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Category</Label>
                <Select value={formCategory} onValueChange={(v: any) => setFormCategory(v)}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Government">Government</SelectItem>
                    <SelectItem value="Agriculture">Agriculture</SelectItem>
                    <SelectItem value="Weather">Weather</SelectItem>
                    <SelectItem value="News & Media">News & Media</SelectItem>
                    <SelectItem value="E-Commerce">E-Commerce</SelectItem>
                    <SelectItem value="Custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Accent Color</Label>
                <Select value={formColor} onValueChange={setFormColor}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`h-3 w-3 rounded-full ${c.value}`} />
                          <span>{c.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Description (Optional)</Label>
              <Input
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Short note about what this site is used for"
                className="h-9 rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="rounded-xl text-xs font-bold h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSite}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-black rounded-xl text-xs h-9"
            >
              {editingId ? "Save Changes" : "Add to My Sites"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
