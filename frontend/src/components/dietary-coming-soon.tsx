import { Apple, Bell, Check, Clock3, Droplets, Leaf, Salad, Sparkles } from "lucide-react";
import type { Product } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/contexts/currency-context";
import { resolveProductImageForProduct } from "@/lib/product-images";

const DAILY_MEALS = [
  { time: "7:30", label: "Breakfast", guide: "Whole grains, fruit and protein", color: "bg-amber-400" },
  { time: "10:30", label: "Morning snack", guide: "Fruit, nuts or yoghurt", color: "bg-lime-500" },
  { time: "1:00", label: "Lunch", guide: "Balanced plate and water", color: "bg-emerald-500" },
  { time: "4:30", label: "Evening snack", guide: "Light, fibre-rich choice", color: "bg-cyan-500" },
  { time: "7:30", label: "Dinner", guide: "Vegetables, protein and grains", color: "bg-indigo-500" },
];

export function DietaryComingSoon({ products }: { products: Product[] }) {
  const { format } = useCurrency();

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-rose-50/70 via-background to-emerald-50/70 px-4 py-5 dark:from-rose-950/10 dark:to-emerald-950/10 sm:px-6 lg:px-8" data-testid="dietary-coming-soon-page">
      <div className="mx-auto grid max-w-[1500px] gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-3xl border-2 border-rose-200/70 bg-background p-6 shadow-lg dark:border-rose-900/50 sm:p-8">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-emerald-600 text-white shadow-lg">
                <Salad className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400">Dietary &amp; Lifestyle</p>
                <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">Personalised food guidance is on the way.</h1>
              </div>
              <Badge className="w-fit gap-2 rounded-full border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                <Sparkles className="h-3.5 w-3.5" /> Coming Soon
              </Badge>
            </div>

            <p className="mt-4 max-w-4xl text-sm font-semibold leading-relaxed text-muted-foreground sm:text-base">
              We are building dietary discovery, meal planning and product recommendations around personal preferences and locally available food.
            </p>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {["Lifestyle product discovery", "Weekly diet charts", "Local ingredient suggestions", "Nutrition preferences"].map((feature) => (
                <div key={feature} className="flex items-center gap-2 rounded-xl border border-border/80 bg-muted/30 p-3 text-xs font-black text-foreground">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Check className="h-3.5 w-3.5" /></span>
                  {feature}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border-2 border-border/70 bg-background p-5 shadow-lg sm:p-6" aria-labelledby="dietary-product-preview-heading" data-testid="dietary-product-preview">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Product preview</p>
                <h2 id="dietary-product-preview-heading" className="mt-1 text-2xl font-black text-foreground">Products coming to Dietary &amp; Lifestyle</h2>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">These catalog products are previews and cannot be purchased from this page yet.</p>
              </div>
              <Badge variant="secondary" className="rounded-full px-3 py-1 font-black">{products.length} products</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {products.map((product) => (
                <article key={product.id} className="group overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm" data-testid={`dietary-preview-product-${product.id}`}>
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <img src={resolveProductImageForProduct(product).src} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <Badge className="absolute left-2 top-2 border border-white/50 bg-amber-400 text-[9px] font-black uppercase text-black hover:bg-amber-400">Coming soon</Badge>
                  </div>
                  <div className="p-3">
                    <h3 className="truncate text-sm font-black text-foreground" title={product.name}>{product.name}</h3>
                    <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">{product.farmerName}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-black text-primary">{format(product.price, { sourceCurrency: product.currency || "GBP" })}/{product.unit}</span>
                      {product.isOrganic && <Leaf className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Organic" />}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="rounded-2xl border-2 border-emerald-200/80 bg-background p-4 shadow-lg dark:border-emerald-900/60 xl:sticky xl:top-5" aria-label="Daily diet chart preview" data-testid="diet-chart-panel">
          <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Diet chart preview</p>
              <h2 className="mt-0.5 text-xl font-black text-foreground">A balanced day</h2>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Leaf className="h-5 w-5" /></div>
          </div>

          <div className="my-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-orange-50 p-3 dark:bg-orange-950/20"><Apple className="mb-1 h-4 w-4 text-orange-600" /><p className="text-[9px] font-black uppercase text-muted-foreground">Plate balance</p><p className="mt-0.5 text-xs font-black text-foreground">½ vegetables &amp; fruit</p></div>
            <div className="rounded-xl bg-cyan-50 p-3 dark:bg-cyan-950/20"><Droplets className="mb-1 h-4 w-4 text-cyan-600" /><p className="text-[9px] font-black uppercase text-muted-foreground">Hydration</p><p className="mt-0.5 text-xs font-black text-foreground">Water all day</p></div>
          </div>

          <div className="space-y-2">
            {DAILY_MEALS.map((meal) => (
              <div key={meal.label} className="grid grid-cols-[8px_48px_minmax(0,1fr)] items-center gap-2 rounded-xl border border-border/70 p-2.5">
                <span className={`h-2 w-2 rounded-full ${meal.color}`} />
                <span className="flex items-center gap-1 text-[10px] font-black text-muted-foreground"><Clock3 className="h-3 w-3" />{meal.time}</span>
                <div className="min-w-0"><p className="text-xs font-black text-foreground">{meal.label}</p><p className="truncate text-[10px] font-semibold text-muted-foreground">{meal.guide}</p></div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] font-semibold leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0" />General visual guide. Personalised plans become available after launch.
          </div>
        </aside>
      </div>
    </div>
  );
}
