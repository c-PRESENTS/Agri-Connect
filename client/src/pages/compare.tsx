import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, Star, MapPin, Leaf, BadgeCheck, Check, X as XIcon,
  ShoppingCart, GitCompareArrows, Trash2, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TopNavigation } from "@/components/top-navigation";
import { useCompare } from "@/hooks/use-compare";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getProductImage } from "@/lib/product-images";
import type { Product } from "@shared/schema";

export default function ComparePage() {
  const [, setLocation] = useLocation();
  const { ids, remove, clear } = useCompare();
  const { toast } = useToast();
  const { data: products = [], isLoading } = useQuery<Product[]>({ queryKey: ["/api/products"] });

  const items = ids
    .map(id => products.find(p => p.id === id))
    .filter((p): p is Product => !!p);

  const addToCart = useMutation({
    mutationFn: (productId: string) => apiRequest("POST", "/api/cart", { productId, quantity: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({ title: "Added to cart!" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation />
        <div className="max-w-6xl mx-auto p-4 sm:p-8 animate-pulse">
          <div className="h-8 w-48 bg-muted rounded mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[0, 1, 2].map(i => <div key={i} className="aspect-square bg-muted rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <GitCompareArrows className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
          <h2 className="text-2xl font-bold mb-2">No products to compare</h2>
          <p className="text-muted-foreground mb-6">
            Tap the <strong>Compare</strong> button on any product card to add it here. You can compare up to 4 products side by side.
          </p>
          <Button onClick={() => setLocation("/")} data-testid="button-back-to-shop">
            <ArrowLeft className="h-4 w-4 mr-2" />Back to Shop
          </Button>
        </div>
      </div>
    );
  }

  // Determine winners per row
  const lowestPrice = Math.min(...items.map(p => p.price));
  const highestRating = Math.max(...items.map(p => p.rating));
  // Only declare a "closest" if at least one product has a real numeric distance
  const itemsWithDistance = items.filter(p => typeof p.distance === "number");
  const closest = itemsWithDistance.length > 0
    ? itemsWithDistance.reduce((min, p) => (p.distance! < min.distance! ? p : min))
    : null;

  // Comparison rows
  const rows: Array<{
    label: string;
    render: (p: Product) => React.ReactNode;
    isWinner?: (p: Product) => boolean;
  }> = [
    { label: "Price", render: p => `£${p.price.toFixed(2)} / ${p.unit}`, isWinner: p => p.price === lowestPrice },
    { label: "Rating", render: p => `${p.rating.toFixed(1)} ★ (${p.reviewCount.toLocaleString()})`, isWinner: p => p.rating === highestRating },
    { label: "Stock", render: p => `${p.stock} ${p.unit}` },
    { label: "Distance", render: p => typeof p.distance === "number" ? `${p.distance.toFixed(1)} km` : "—", isWinner: p => closest !== null && p.id === closest.id },
    { label: "Farmer", render: p => p.farmerName },
    { label: "Origin", render: p => <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{p.farmerLocation}</span> },
    { label: "Farmer Rating", render: p => `${p.farmerRating.toFixed(1)} ★` },
    { label: "Organic", render: p => p.isOrganic ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <XIcon className="h-4 w-4 text-muted-foreground mx-auto" /> },
    { label: "Featured", render: p => p.isFeatured ? <Award className="h-4 w-4 text-amber-500 mx-auto" /> : <XIcon className="h-4 w-4 text-muted-foreground mx-auto" /> },
    { label: "Diet Tags", render: p => p.dietaryTags?.length ? (
        <div className="flex flex-wrap gap-1 justify-center">
          {p.dietaryTags.slice(0, 3).map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
        </div>
      ) : "—" },
    { label: "Description", render: p => <p className="text-xs text-muted-foreground line-clamp-3 leading-snug">{p.description}</p> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <button
              onClick={() => setLocation("/")}
              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2"
              data-testid="button-back"
            >
              <ArrowLeft className="h-3.5 w-3.5" />Marketplace
            </button>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-compare-title">
              <GitCompareArrows className="h-6 w-6 text-primary" />
              Compare Products ({items.length})
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Best value highlighted in green.</p>
          </div>
          <Button variant="outline" size="sm" onClick={clear} className="gap-1.5" data-testid="button-clear-all">
            <Trash2 className="h-3.5 w-3.5" />Clear All
          </Button>
        </div>

        {/* Comparison table */}
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="min-w-[640px]">
            <div className="grid gap-3" style={{ gridTemplateColumns: `140px repeat(${items.length}, minmax(180px, 1fr))` }}>
              {/* Header row: product cards */}
              <div /> {/* empty corner */}
              {items.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative bg-card border border-border/60 rounded-2xl p-3 space-y-2"
                  data-testid={`compare-card-${p.id}`}
                >
                  <button
                    onClick={() => remove(p.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-110 transition-transform z-10 shadow"
                    title="Remove from comparison"
                    data-testid={`button-remove-${p.id}`}
                  >
                    <XIcon className="h-3 w-3" strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => setLocation(`/products/${p.id}`)}
                    className="block w-full aspect-square rounded-xl overflow-hidden bg-muted hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={getProductImage(p.name, p.categoryId, "md")}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <h3 className="font-semibold text-sm line-clamp-2 leading-tight min-h-[2.5rem]">{p.name}</h3>
                  <div className="flex items-center gap-1 text-xs">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">{p.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({p.reviewCount})</span>
                  </div>
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs gap-1.5"
                    onClick={() => addToCart.mutate(p.id)}
                    disabled={p.stock === 0 || addToCart.isPending}
                    data-testid={`button-add-cart-${p.id}`}
                  >
                    <ShoppingCart className="h-3 w-3" />Add
                  </Button>
                </motion.div>
              ))}

              {/* Comparison rows */}
              {rows.map((row, ri) => (
                <div key={row.label} className="contents">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center px-3 py-3 border-t border-border/40">
                    {row.label}
                  </div>
                  {items.map(p => {
                    const winner = row.isWinner?.(p);
                    return (
                      <div
                        key={p.id + row.label}
                        className={`text-sm flex items-center justify-center text-center px-2 py-3 border-t border-border/40 ${winner ? "bg-green-50 dark:bg-green-950/30 font-semibold text-green-800 dark:text-green-300 rounded-md" : ""}`}
                        data-testid={`row-${row.label.toLowerCase().replace(/\s/g, "-")}-${p.id}`}
                      >
                        {row.render(p)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary recommendation */}
        {items.length >= 2 && (
          <div className="mt-8 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-green-500/5 p-5">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-primary" />
              Our Recommendation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="bg-background/70 rounded-xl p-3 border border-border/40">
                <div className="text-xs text-muted-foreground uppercase mb-1">Best Value</div>
                <div className="font-semibold">{items.find(p => p.price === lowestPrice)?.name}</div>
                <div className="text-xs text-green-700 dark:text-green-400 mt-1">£{lowestPrice.toFixed(2)} — lowest price</div>
              </div>
              <div className="bg-background/70 rounded-xl p-3 border border-border/40">
                <div className="text-xs text-muted-foreground uppercase mb-1">Top Rated</div>
                <div className="font-semibold">{items.find(p => p.rating === highestRating)?.name}</div>
                <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">{highestRating.toFixed(1)} ★ — highest rating</div>
              </div>
              <div className="bg-background/70 rounded-xl p-3 border border-border/40">
                <div className="text-xs text-muted-foreground uppercase mb-1">Closest to You</div>
                <div className="font-semibold">{closest?.name ?? "—"}</div>
                <div className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                  {closest && typeof closest.distance === "number"
                    ? `${closest.distance.toFixed(1)} km away`
                    : "Distance not available"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
