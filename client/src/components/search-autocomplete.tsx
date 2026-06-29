import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, TrendingUp, Package, Leaf } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";
import { useTranslation } from "react-i18next";

interface SearchAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onSearch: (query: string) => void;
}

const TRENDING = ["Organic tomatoes", "Fresh milk", "Potatoes", "Apples", "Carrots", "Wheat flour"];

export function SearchAutocomplete({ value, onChange, onSearch }: SearchAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: [inputVal ? `/api/products?search=${encodeURIComponent(inputVal)}` : "/api/products"],
    enabled: inputVal.length >= 2,
  });

  const suggestions = products.slice(0, 6);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);
    onChange(val);
    setOpen(true);
  };

  const handleSelect = (query: string) => {
    setInputVal(query);
    onChange(query);
    onSearch(query);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
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

  const showTrending = open && inputVal.length === 0;
  const showSuggestions = open && inputVal.length >= 2 && suggestions.length > 0;

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
        {(showTrending || showSuggestions) && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-xl shadow-black/8 overflow-hidden"
            data-testid="dropdown-search-results"
          >
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

            {showSuggestions && (
              <div className="p-1.5">
                <div className="flex items-center gap-1.5 px-2 py-1 mb-0.5">
                  <Package className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {t("search.products", "Products")}
                  </span>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
