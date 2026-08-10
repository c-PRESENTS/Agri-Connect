import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Search, X, TrendingUp, Package, History, RotateCcw, Sparkles, Loader2, MapPin, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { categories, getShoppableCategories } from "@/lib/categories";
import { apiRequest } from "@/lib/queryClient";
import { SafeProductImage } from "@/components/safe-product-image";
import { resolveProductImageForProduct } from "@/lib/product-images";
import { FavoriteProductButton } from "@/components/favorite-product-button";
import { useCurrency } from "@/contexts/currency-context";

interface SearchAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onSearch: (query: string) => void;
}

interface PublicFarmerSearchResult {
  id: string;
  name: string;
  location: string;
  categories: string[];
}

interface SearchResponse {
  farmers: PublicFarmerSearchResult[];
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
  const { format } = useCurrency();
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
  const [, setLocation] = useLocation();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: [inputVal ? `/api/products?search=${encodeURIComponent(inputVal)}` : "/api/products"],
    enabled: inputVal.length >= 2 && !aiSearchEnabled,
  });
  const { data: searchResponse, isLoading: isSearchLoading } = useQuery<SearchResponse>({
    queryKey: [inputVal ? `/api/discovery?q=${encodeURIComponent(inputVal)}` : "/api/discovery"],
    enabled: inputVal.length >= 2,
  });
  const farmers = searchResponse?.farmers ?? [];

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

  const closeSearch = () => {
    setOpen(false);
    inputRef.current?.blur();
  };

  const navigateToProductCategory = (product: Product) => {
    const shoppableCategories = getShoppableCategories();
    const category =
      shoppableCategories.find((item) => item.id === product.categoryId) ??
      shoppableCategories.find((item) =>
        item.subcategories.some((subcategory) => subcategory.id === product.subcategoryId),
      );

    if (!category) return false;

    const query = product.name.trim();
    const params = new URLSearchParams({ category: category.id });
    if (category.subcategories.some((subcategory) => subcategory.id === product.subcategoryId)) {
      params.set("subcategory", product.subcategoryId);
    }

    setInputVal(query);
    onChange(query);
    onSearch(query);
    addRecentSearch(query);
    setRecentSearches(getRecentSearches());
    setLocation(`/?${params.toString()}`);
    window.dispatchEvent(new CustomEvent("agri-subcategory-open", { detail: category.id }));
    closeSearch();
    return true;
  };

  const handleProductSelect = (product: Product) => {
    if (navigateToProductCategory(product)) return;
    const query = product.name.trim();
    setInputVal(query);
    onChange(query);
    onSearch(query);
    addRecentSearch(query);
    setRecentSearches(getRecentSearches());
    closeSearch();
  };

  const handleSelect = async (query: string) => {
    if (query.startsWith("?category=")) {
      setInputVal("");
      onChange("");
      onSearch("");
      setLocation(`/${query}`);
      closeSearch();
      return;
    }

    const trimmedQuery = query.trim();
    const normalizedQuery = trimmedQuery.toLocaleLowerCase();
    const localMatch =
      suggestions.find((product) => product.name.trim().toLocaleLowerCase() === normalizedQuery) ??
      suggestions.find((product) => product.name.trim().toLocaleLowerCase().startsWith(normalizedQuery)) ??
      suggestions.find((product) => product.name.trim().toLocaleLowerCase().includes(normalizedQuery));

    if (localMatch && navigateToProductCategory(localMatch)) return;

    try {
      const response = await fetch(`/api/products?search=${encodeURIComponent(trimmedQuery)}`, {
        credentials: "include",
      });
      if (response.ok) {
        const matchingProducts = (await response.json()) as Product[];
        const product =
          matchingProducts.find((item) => item.name.trim().toLocaleLowerCase() === normalizedQuery) ??
          matchingProducts.find((item) => item.name.trim().toLocaleLowerCase().startsWith(normalizedQuery)) ??
          matchingProducts.find((item) => item.name.trim().toLocaleLowerCase().includes(normalizedQuery)) ??
          matchingProducts[0];
        if (product && navigateToProductCategory(product)) return;
      }
    } catch {
      // Preserve ordinary text-search behavior when catalog resolution is unavailable.
    }

    setInputVal(trimmedQuery);
    onChange(trimmedQuery);
    addRecentSearch(trimmedQuery);
    setRecentSearches(getRecentSearches());
    onSearch(trimmedQuery);
    closeSearch();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      void handleSelect(inputVal.trim());
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
  const showFarmerResults = open && inputVal.length >= 2 && !isSearchLoading && farmers.length > 0;
  const showCategories = open && inputVal.length === 0;
  const showLoading = open && inputVal.length >= 2 && (aiLoading || isSearchLoading);
  const showNoResults = open && inputVal.length >= 2 && !aiLoading && !isSearchLoading && suggestions.length === 0 && farmers.length === 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative group w-full">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          ref={inputRef}
          type="search"
          placeholder={t("search.placeholder", "Search produce, farmers...")}
          value={inputVal}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          className="pl-10 pr-10 h-11 text-base font-bold bg-muted/40 border-2 border-border/50 focus:bg-background focus:border-primary/30 focus:ring-2 focus:ring-primary/20 transition-all rounded-xl w-full"
          data-testid="input-search"
        />
        {inputVal && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-search-clear"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </form>

      <AnimatePresence>
        {(showRecent || showTrending || showCategories || showSuggestions || showFarmerResults || showLoading || showNoResults) && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border-2 border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/10 overflow-hidden"
            data-testid="dropdown-search-results"
          >
            {/* AI Search Toggle */}
            {open && inputVal.length > 0 && (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border/30 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">{t("search.ai_search")}</span>
                </div>
                <Switch
                  checked={aiSearchEnabled}
                  onCheckedChange={toggleAiSearch}
                  className="scale-90"
                  data-testid="toggle-ai-search"
                />
              </div>
            )}

            {/* AI Expanded Query Indicator */}
            {aiSearchEnabled && aiExpandedQuery && aiExpandedQuery !== inputVal && inputVal.length >= 2 && (
              <div className="px-4 py-2.5 border-b border-border/30 bg-primary/5">
                <div className="text-xs font-bold text-muted-foreground">
                  <span className="font-black">{t("search.expanded")}</span> {aiExpandedQuery}
                  {aiCategoryHint && (
                    <Badge variant="secondary" className="ml-2 text-xs py-0.5 px-2">
                      {categories.find(c => c.id === aiCategoryHint)?.name || aiCategoryHint}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {showLoading && (
              <div className="flex items-center justify-center gap-2.5 px-4 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-bold text-muted-foreground">{aiLoading ? t("search.ai_searching") : "Searching public listings..."}</span>
              </div>
            )}

            {showRecent && (
              <div className="p-3 border-b border-border/30">
                <div className="flex items-center justify-between gap-2 px-2 py-1.5 mb-2">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {t("search.recent")}
                    </span>
                  </div>
                  <button
                    onClick={handleClearRecent}
                    className="text-xs font-bold text-muted-foreground hover:text-destructive flex items-center gap-1"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> {t("search.clear")}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 px-2">
                  {recentSearches.map((item) => (
                    <button
                      key={item}
                      onClick={() => void handleSelect(item)}
                      className="text-sm px-3 py-1.5 rounded-lg bg-muted/40 hover:bg-primary/10 hover:text-primary border border-border/30 hover:border-primary/20 transition-all font-bold"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showCategories && (
              <div className="p-3 border-b border-border/30">
                <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {t("search.browse_categories")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 px-2">
                  {getShoppableCategories().slice(0, 12).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => void handleSelect(`?category=${cat.id}`)}
                      className="text-sm px-3 py-1.5 rounded-lg bg-primary/8 hover:bg-primary/15 hover:text-primary border border-primary/20 transition-all font-bold"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showTrending && (
              <div className="p-3">
                <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {t("search.trending", "Trending")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 px-2">
                  {TRENDING.map((item) => (
                    <button
                      key={item}
                      onClick={() => void handleSelect(item)}
                      className="text-sm px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-primary/10 hover:text-primary border border-border/40 hover:border-primary/20 transition-all font-bold"
                      data-testid={`search-trending-${item.replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showSuggestions && !aiLoading && (
              <div className="p-2.5">
                <div className="flex items-center gap-2 px-2.5 py-1.5 mb-1">
                  {aiSearchEnabled ? (
                    <Sparkles className="h-4 w-4 text-primary" />
                  ) : (
                    <Package className="h-4 w-4 text-primary" />
                  )}
                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {aiSearchEnabled ? t("search.ai_results") : t("search.products")}
                  </span>
                  {aiSearchEnabled && suggestions.length > 0 && (
                    <Badge variant="secondary" className="text-xs py-0.5 px-2 ml-auto font-bold">{t("search.found_count", { count: suggestions.length })}</Badge>
                  )}
                </div>
                {suggestions.map((product) => (
                  <div key={product.id} className="relative">
                    <button
                      onClick={() => handleProductSelect(product)}
                      className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 pr-14 text-left transition-colors hover:bg-muted/60"
                      data-testid={`search-result-${product.id}`}
                    >
                    <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted shrink-0">
                      <SafeProductImage
                        src={resolveProductImageForProduct(product).src}
                        fallbackSrc={resolveProductImageForProduct(product).fallbackSrc}
                        alt={`${product.name || "Product"} product image`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black truncate group-hover:text-primary transition-colors">
                        {product.name || "Unnamed product"}
                      </div>
                      <div className="text-xs font-bold text-muted-foreground truncate">{product.farmerName || "Seller not specified"}</div>
                    </div>
                    <div className="text-sm font-black text-primary shrink-0">
                      {format(product.price, {
                        sourceCurrency: product.currency || "GBP",
                        includeCode: true,
                      })}
                    </div>
                    </button>
                    <FavoriteProductButton
                      productId={product.id}
                      productName={product.name || "Unnamed product"}
                      className="!absolute right-2.5 top-1/2 h-8 w-8 -translate-y-1/2 bg-background/95 shadow-md hover:bg-red-50"
                      data-testid={`button-search-favorite-${product.id}`}
                    />
                  </div>
                ))}
              </div>
            )}

            {showFarmerResults && (
              <div className="p-2.5 border-t border-border/30">
                <div className="flex items-center gap-2 px-2.5 py-1.5 mb-1">
                  <Store className="h-4 w-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Farmers & sellers</span>
                </div>
                {farmers.slice(0, 6).map((farmer) => (
                  <button
                    key={farmer.id}
                    onClick={() => { setLocation(`/map?farmer=${encodeURIComponent(farmer.id)}`); setOpen(false); inputRef.current?.blur(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 text-left"
                    data-testid={`search-farmer-${farmer.id}`}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Store className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black truncate">{farmer.name}</div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground truncate"><MapPin className="h-3.5 w-3.5" />{farmer.location}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showNoResults && (
              <div className="px-4 py-6 text-center">
                <p className="text-sm font-bold text-muted-foreground">{t("search.no_results", { query: inputVal })}</p>
                <p className="text-xs font-bold text-muted-foreground/60 mt-1">{t("search.no_results_hint")}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
