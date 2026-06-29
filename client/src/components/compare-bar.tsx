import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GitCompareArrows, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare } from "@/hooks/use-compare";
import { getProductImage } from "@/lib/product-images";
import type { Product } from "@shared/schema";

export function CompareBar() {
  const [location, setLocation] = useLocation();
  const { ids, remove, clear, max } = useCompare();
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });

  const items = ids
    .map(id => products.find(p => p.id === id))
    .filter((p): p is Product => !!p);

  if (ids.length === 0 || location === "/compare" || location === "/login") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 280 }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9997] max-w-[calc(100vw-2rem)]"
        data-testid="bar-compare"
      >
        <div className="flex items-center gap-3 bg-background/95 backdrop-blur-xl border-2 border-primary/30 rounded-2xl shadow-2xl shadow-primary/10 p-2.5 pl-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap">
            <GitCompareArrows className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">Compare</span>
            <span className="text-xs text-muted-foreground">({items.length}/{max})</span>
          </div>

          <div className="flex items-center gap-1.5">
            {items.map(p => (
              <div key={p.id} className="relative group" data-testid={`compare-item-${p.id}`}>
                <div className="w-11 h-11 rounded-lg overflow-hidden border border-border bg-muted">
                  <img
                    src={getProductImage(p.name, p.categoryId, "sm")}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => remove(p.id)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-foreground text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid={`button-remove-compare-${p.id}`}
                >
                  <X className="h-2.5 w-2.5" strokeWidth={3} />
                </button>
              </div>
            ))}
            {/* Empty slots */}
            {Array.from({ length: max - items.length }).map((_, i) => (
              <div key={`slot-${i}`} className="w-11 h-11 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center text-muted-foreground/40">
                <span className="text-xs">+</span>
              </div>
            ))}
          </div>

          <Button
            size="sm"
            onClick={() => setLocation("/compare")}
            disabled={items.length < 2}
            className="rounded-full font-semibold gap-1.5"
            data-testid="button-view-compare"
          >
            <span className="hidden sm:inline">Compare</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <button
            onClick={clear}
            className="p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground"
            title="Clear all"
            data-testid="button-clear-compare"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
