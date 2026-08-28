import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  Command,
  CornerDownLeft,
  Eye,
  FileText,
  Filter,
  Globe,
  HardDrive,
  Layers,
  Leaf,
  Loader2,
  Lock,
  Package,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Sliders,
  Sparkles,
  Tag,
  Truck,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";

export type AdminSection =
  | "overview"
  | "analytics"
  | "revenue"
  | "security"
  | "global-operations"
  | "users"
  | "farmers"
  | "sellers"
  | "buyers"
  | "students"
  | "researchers"
  | "logistics-partners"
  | "verification"
  | "organisations"
  | "employees"
  | "products"
  | "categories"
  | "regions"
  | "content"
  | "orders"
  | "logistics"
  | "data"
  | "audit"
  | "settings";

export type GlobalSearchResultItem = {
  id: string;
  category: "users" | "products" | "orders" | "categories" | "regions" | "content" | "settings" | "organisations";
  categoryLabel: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeVariant?: "default" | "success" | "warning" | "destructive" | "secondary";
  targetSection: AdminSection;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

export type GlobalSearchResponse = {
  query: string;
  total: number;
  results: GlobalSearchResultItem[];
  categories: { category: string; count: number }[];
};

const categoryIcons: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  Directory: { icon: Users, color: "text-emerald-700", bg: "bg-emerald-50" },
  Products: { icon: Package, color: "text-amber-700", bg: "bg-amber-50" },
  Orders: { icon: ShoppingCart, color: "text-blue-700", bg: "bg-blue-50" },
  Categories: { icon: Tag, color: "text-indigo-700", bg: "bg-indigo-50" },
  Regions: { icon: Globe, color: "text-teal-700", bg: "bg-teal-50" },
  "Knowledge Hub": { icon: BookOpen, color: "text-purple-700", bg: "bg-purple-50" },
  "Platform Settings": { icon: Sliders, color: "text-rose-700", bg: "bg-rose-50" },
  Organisations: { icon: Building2, color: "text-slate-700", bg: "bg-slate-100" },
};

export function AgriGlobalSearch({
  onSelectResult,
  onNavigate,
}: {
  onSelectResult?: (result: GlobalSearchResultItem) => void;
  onNavigate: (section: AdminSection, initialSearch?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Global keyboard shortcut: / or Ctrl+K to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") ||
          (e.key === "k" && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Query global search endpoint
  const { data, isLoading, isFetching } = useQuery<GlobalSearchResponse>({
    queryKey: ["/api/admin/global-search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return { query: "", total: 0, results: [], categories: [] };
      const res = await apiRequest("GET", `/api/admin/global-search?q=${encodeURIComponent(debouncedQuery)}`);
      return res.json();
    },
    enabled: debouncedQuery.length > 0,
    staleTime: 10_000,
  });

  const rawResults = data?.results ?? [];

  // Filtered by category tab
  const filteredResults = useMemo(() => {
    if (activeCategory === "all") return rawResults;
    return rawResults.filter((r) => r.categoryLabel === activeCategory);
  }, [rawResults, activeCategory]);

  // Handle keyboard navigation within results
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredResults.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        handleSelect(filteredResults[selectedIndex]);
      } else if (query.trim()) {
        onNavigate("farmers", query.trim());
        setIsOpen(false);
      }
    }
  };

  const handleSelect = (result: GlobalSearchResultItem) => {
    if (onSelectResult) onSelectResult(result);
    onNavigate(result.targetSection, result.title);
    setIsOpen(false);
    setQuery("");
  };

  const categories = data?.categories ?? [];

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      {/* Search Input Box */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          ref={inputRef}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder="Search users, products, orders, sellers, farmers..."
          className="h-10 w-full rounded-lg border-slate-200 bg-white pl-10 pr-20 text-xs shadow-sm transition-all focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          aria-label="Omnisearch across AgriConnect organisation database"
        />

        {/* Right side icons / shortcuts */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400">
          {isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
          ) : query ? (
            <button
              onClick={() => {
                setQuery("");
                setDebouncedQuery("");
                inputRef.current?.focus();
              }}
              className="rounded p-0.5 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
              <Command className="h-2.5 w-2.5" />
              <span>K</span>
            </div>
          )}
        </div>
      </div>

      {/* Instant Search Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {/* Category Tabs (if results exist) */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/80 px-3 py-2 overflow-x-auto">
              <button
                onClick={() => {
                  setActiveCategory("all");
                  setSelectedIndex(0);
                }}
                className={`rounded-md px-2 py-1 text-[10px] font-bold transition shrink-0 ${
                  activeCategory === "all"
                    ? "bg-[#053f36] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({data?.total ?? 0})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.category}
                  onClick={() => {
                    setActiveCategory(cat.category);
                    setSelectedIndex(0);
                  }}
                  className={`rounded-md px-2 py-1 text-[10px] font-bold transition shrink-0 ${
                    activeCategory === cat.category
                      ? "bg-[#053f36] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat.category} ({cat.count})
                </button>
              ))}
            </div>
          )}

          {/* Results List */}
          <div className="max-h-[380px] overflow-y-auto p-1.5">
            {debouncedQuery && isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                <span>Searching directory across PostgreSQL clusters...</span>
              </div>
            ) : filteredResults.length > 0 ? (
              <div className="space-y-1">
                {filteredResults.map((result, idx) => {
                  const catConfig = categoryIcons[result.categoryLabel] || {
                    icon: Search,
                    color: "text-slate-700",
                    bg: "bg-slate-100",
                  };
                  const Icon = catConfig.icon;
                  const isSelected = idx === selectedIndex;

                  return (
                    <button
                      key={`${result.category}-${result.id}`}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg p-2.5 text-left text-xs transition ${
                        isSelected ? "bg-emerald-50 text-emerald-950" : "hover:bg-slate-50 text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${catConfig.bg} ${catConfig.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold truncate text-slate-900">{result.title}</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                              {result.categoryLabel}
                            </span>
                          </div>
                          <p className="truncate text-[11px] text-slate-500 mt-0.5">{result.subtitle}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-bold ${
                            result.badgeVariant === "success"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : result.badgeVariant === "warning"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-slate-200 bg-slate-100 text-slate-600"
                          }`}
                        >
                          {result.badge}
                        </Badge>
                        <ArrowRight className={`h-3.5 w-3.5 ${isSelected ? "text-emerald-700 translate-x-0.5" : "text-slate-300"} transition`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : debouncedQuery ? (
              <div className="py-8 text-center text-slate-500">
                <Search className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                <p className="text-xs font-bold text-slate-700">No records found for "{debouncedQuery}"</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Try searching for farmer names, product SKUs, orders, or categories.</p>
              </div>
            ) : (
              /* Quick Links / Discovery when empty */
              <div className="p-2 space-y-2">
                <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Quick Navigation & Operational Shortcuts
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "Farmers Directory", section: "farmers" as AdminSection, icon: Users, color: "text-emerald-700 bg-emerald-50" },
                    { label: "Product Catalogue", section: "products" as AdminSection, icon: Package, color: "text-amber-700 bg-amber-50" },
                    { label: "Orders & Escrow", section: "orders" as AdminSection, icon: ShoppingCart, color: "text-blue-700 bg-blue-50" },
                    { label: "Platform Settings", section: "settings" as AdminSection, icon: Sliders, color: "text-purple-700 bg-purple-50" },
                    { label: "Disaster Vault Backups", section: "data" as AdminSection, icon: HardDrive, color: "text-indigo-700 bg-indigo-50" },
                    { label: "Audit Ledger", section: "audit" as AdminSection, icon: FileText, color: "text-rose-700 bg-rose-50" },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        onClick={() => {
                          onNavigate(item.section);
                          setIsOpen(false);
                        }}
                        className="flex items-center gap-2 rounded-lg p-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                      >
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${item.color}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-3 py-2 text-[10px] text-slate-400">
            <div className="flex items-center gap-2">
              <span>Press <kbd className="rounded border bg-white px-1 py-0.5 font-mono text-[9px] text-slate-600 shadow-xs">↑</kbd> <kbd className="rounded border bg-white px-1 py-0.5 font-mono text-[9px] text-slate-600 shadow-xs">↓</kbd> to navigate</span>
              <span>•</span>
              <span><kbd className="rounded border bg-white px-1 py-0.5 font-mono text-[9px] text-slate-600 shadow-xs">Enter</kbd> to select</span>
            </div>
            <span>Global Omni-Search</span>
          </div>
        </div>
      )}
    </div>
  );
}
