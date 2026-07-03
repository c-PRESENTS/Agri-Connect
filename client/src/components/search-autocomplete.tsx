import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, TrendingUp, Package, Leaf, History, RotateCcw, Sparkles, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { categories } from "@/lib/categories";
import { apiRequest } from "@/lib/queryClient";

interface SearchAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onSearch: (query: string) => void;
}

const TRENDING = ["Organic tomatoes", "Fresh milk", "Potatoes", "Apples", "Carrots", "Wheat flour"];

const RECENT_KEY = "agri-recent-searches";
const MAX_RECENT = 6;

function getRecentSearches(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}
function addRecentSearch(q: string) {
  const list = getRecentSearches().filter(s => s !== q);
  list.unshift(q);
  if (list.length > MAX_RECENT) list.length = MAX_RECENT;
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}
function clearRecentSearches() {
  localStorage.removeItem(RECENT_KEY);
}

export function SearchAutocomplete({ value, onChange, onSearch }: SearchAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches);
  const [aiSearchEnabled, setAiSearchEnabled] = useState(() => localStorage.getItem("agriconnect-ai-search") !== "false");
  const [aiResults, setAiResults] = useState<Product[] | null>(null);
  const [aiExpandedQuery, setAiExpandedQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCategoryHint, setAiCategoryHint] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const aiDebounceRef = useRef<number | undefined>();
  const { t } = useTranslation();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: [inputVal ? `/api/products?search=${encodeURIComponent(inputVal)}` : "/api/products"],
    enabled: inputVal.length >= 2 && !aiSearchEnabled,
  });

  const suggestions = aiResults ?? products.slice(0, 6);

  useEffect(() => {
    setInputVal(value);
  }, [value]);

  const toggleAiSearch = useCallback((val: boolean) => {
    setAiSearchEnabled(val);
    localStorage.setItem("agriconnect-ai-search", String(val));
    setAiResults(null);
    setAiExpandedQuery("");
    setAiCategoryHint(null);
  }, []);

  const performAiSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setAiResults(null);
      setAiExpandedQuery("");
      setAiCategoryHint(null);
      return;
    }
    setAiLoading(true);
    try {
      const res = await apiRequest("POST", "/api/ai/search", {
        query,
        language: navigator.language.split("-")[0] || "en",
      });
      const data = await res.json();
      setAiResults(data.results || []);
      setAiExpandedQuery(data.expandedQuery || "");
      setAiCategoryHint(data.categoryHint || null);
    } catch {
      try {
        const fallback = await fetch(`/api/products?search=${encodeURIComponent(query)}`, {
          credentials: "include",
        });
        const data = await fallback.json();
        setAiResults(Array.isArray(data) ? data.slice(0, 20) : []);
        setAiExpandedQuery(query);
      } catch {
        setAiResults([]);
        setAiExpandedQuery("");
      }
      setAiCategoryHint(null);
    } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    return () => {
      if (aiDebounceRef.current) window.clearTimeout(aiDebounceRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);
    onChange(val);
    setOpen(true);
    if (aiDebounceRef.current) window.clearTimeout(aiDebounceRef.current);
    // Trigger AI search with debounce
    if (aiSearchEnabled && val.length >= 2) {
      aiDebounceRef.current = window.setTimeout(() => performAiSearch(val), 300);
    } else {
      setAiResults(null);
      setAiExpandedQuery("");
      setAiCategoryHint(null);
    }
  };

  const handleSelect = (query: string) => {
    setInputVal(query);
    onChange(query);
    addRecentSearch(query);
    setRecentSearches(getRecentSearches());
    onSearch(query);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      addRecentSearch(inputVal.trim());
      setRecentSearches(getRecentSearches());
      onSearch(inputVal.trim());
      setOpen(false);
    }
  };

  const handleClear = () => {
    setInputVal("");
    onChange("");
    onSearch("");
    inputRef.current?.focus();
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const showRecent = open && inputVal.length === 0 && recentSearches.length > 0;
  const showTrending = open && inputVal.length === 0;
  const showSuggestions = open && inputVal.length >= 2 && suggestions.length > 0;
  const showCategories = open && inputVal.length === 0;
  const showNoResults = open && inputVal.length >= 2 && !aiLoading && aiResults !== null && aiResults.length === 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative group w-full">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          ref={inputRef}
          type="search"
          placeholder={t("search.placeholder", "Search produce, farmers...")}
          value={inputVal}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          className="pl-8 pr-8 h-8 text-sm bg-muted/40 border-border/50 focus:bg-background focus:border-primary/30 focus:ring-1 focus:ring-primary/20 transition-all rounded-lg w-full"
          data-testid="input-search"
        />
        {inputVal && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-search-clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      <AnimatePresence>
        {(showRecent || showTrending || showCategories || showSuggestions || showNoResults) && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-xl shadow-black/8 overflow-hidden"
            data-testid="dropdown-search-results"
          >
            {/* AI Search Toggle */}
            {open && inputVal.length > 0 && (
              <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border/30 bg-muted/20">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("search.ai_search")}</span>
                </div>
                <Switch
                  checked={aiSearchEnabled}
                  onCheckedChange={toggleAiSearch}
                  className="scale-75"
                  data-testid="toggle-ai-search"
                />
              </div>
            )}

            {/* AI Expanded Query Indicator */}
            {aiSearchEnabled && aiExpandedQuery && aiExpandedQuery !== inputVal && inputVal.length >= 2 && (
              <div className="px-3 py-1.5 border-b border-border/30 bg-primary/5">
                <p className="text-[10px] text-muted-foreground">
                  <span className="font-semibold">{t("search.expanded")}</span> {aiExpandedQuery}
                  {aiCategoryHint && (
                    <Badge variant="secondary" className="ml-1.5 text-[8px] py-0">
                      {categories.find(c => c.id === aiCategoryHint)?.name || aiCategoryHint}
                    </Badge>
                  )}
                </p>
              </div>
            )}

            {/* Loading indicator */}
            {aiLoading && (
              <div className="flex items-center justify-center gap-2 px-3 py-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-[11px] text-muted-foreground">{t("search.ai_searching")}</span>
              </div>
            )}

            {showRecent && (
              <div className="p-2 border-b border-border/30">
                <div className="flex items-center justify-between gap-1.5 px-2 py-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <History className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {t("search.recent")}
                    </span>
                  </div>
                  <button
                    onClick={handleClearRecent}
                    className="text-[9px] font-semibold text-muted-foreground hover:text-destructive flex items-center gap-0.5"
                  >
                    <RotateCcw className="h-2.5 w-2.5" /> {t("search.clear")}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 px-2">
                  {recentSearches.map((item) => (
                    <button
                      key={item}
                      onClick={() => handleSelect(item)}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-muted/40 hover:bg-primary/10 hover:text-primary border border-border/30 hover:border-primary/20 transition-all font-medium"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showCategories && (
              <div className="p-2 border-b border-border/30">
                <div className="flex items-center gap-1.5 px-2 py-1 mb-1">
                  <Package className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {t("search.browse_categories")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 px-2">
                  {categories.slice(0, 12).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleSelect(`?category=${cat.id}`)}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-primary/8 hover:bg-primary/15 hover:text-primary border border-primary/20 transition-all font-medium"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showTrending && (
              <div className="p-2">
                <div className="flex items-center gap-1.5 px-2 py-1 mb-1">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {t("search.trending", "Trending")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 px-2">
                  {TRENDING.map((item) => (
                    <button
                      key={item}
                      onClick={() => handleSelect(item)}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-muted/60 hover:bg-primary/10 hover:text-primary border border-border/40 hover:border-primary/20 transition-all font-medium"
                      data-testid={`search-trending-${item.replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showSuggestions && !aiLoading && (
              <div className="p-1.5">
                <div className="flex items-center gap-1.5 px-2 py-1 mb-0.5">
                  {aiSearchEnabled ? (
                    <Sparkles className="h-3 w-3 text-primary" />
                  ) : (
                    <Package className="h-3 w-3 text-primary" />
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {aiSearchEnabled ? t("search.ai_results") : t("search.products")}
                  </span>
                  {aiSearchEnabled && suggestions.length > 0 && (
                    <Badge variant="secondary" className="text-[8px] py-0 ml-auto">{t("search.found_count", { count: suggestions.length })}</Badge>
                  )}
                </div>
                {suggestions.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleSelect(product.name)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left group"
                    data-testid={`search-result-${product.id}`}
                  >
                    <div className="h-8 w-8 rounded-md overflow-hidden bg-muted shrink-0">
                      {product.images[0] ? (
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10">
                          <Leaf className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold truncate group-hover:text-primary transition-colors">
                        {product.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">{product.farmerName}</div>
                    </div>
                    <div className="text-[11px] font-bold text-primary shrink-0">£{product.price}</div>
                  </button>
                ))}
              </div>
            )}

            {showNoResults && (
              <div className="px-3 py-4 text-center">
                <p className="text-[11px] text-muted-foreground">{t("search.no_results", { query: inputVal })}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{t("search.no_results_hint")}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
