import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { TopNavigation } from "@/components/top-navigation";
import { Card } from "@/components/ui/card";
import { handleCategoryImageError, resolveCategoryImage } from "@/lib/categories";
import { useCatalogCategories } from "@/hooks/use-catalog-categories";
import { getCategoryIconComponent } from "@/lib/category-icons";

export default function CategoriesPage() {
  const [, setLocation] = useLocation();
  const { data: publishedCategories = [], isLoading, isError, refetch } = useCatalogCategories("buyer");
  const marketplaceCategories = publishedCategories;

  const openCategory = (categoryId: string) => {
    setLocation(`/?category=${encodeURIComponent(categoryId)}`);
    window.dispatchEvent(
      new CustomEvent("agri-subcategory-open", { detail: categoryId }),
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to home
        </Link>

        <header className="mb-8">
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/70 px-3 py-1 rounded-full border border-amber-400/40 inline-block mb-3 shadow-2xs">
            Browse by category
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
            All farm products and services
          </h1>
          <p className="mt-2 text-base sm:text-lg font-bold text-foreground/80 max-w-2xl">
            Choose a category to explore its products and subcategories.
          </p>
        </header>

        <section
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          aria-label="Marketplace categories"
        >
          {isLoading && <p className="col-span-full py-12 text-center text-muted-foreground">Loading published categories…</p>}
          {isError && <div className="col-span-full py-12 text-center"><p className="font-bold">Categories could not be loaded.</p><button className="mt-3 text-primary underline" onClick={() => refetch()}>Retry</button></div>}
          {marketplaceCategories.map((category) => {
            const Icon = getCategoryIconComponent(category.icon);
            const image = resolveCategoryImage(category.id, category.imageUrl);

            return (
              <Card
                key={category.id}
                role="link"
                tabIndex={0}
                className="group cursor-pointer overflow-hidden border-2 border-border/80 bg-card rounded-2xl shadow-md hover:shadow-xl hover:border-primary/60 transition-all duration-200"
                onClick={() => openCategory(category.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openCategory(category.id);
                  }
                }}
                data-testid={`category-page-card-${category.id}`}
              >
                <div className="relative h-44 overflow-hidden bg-muted">
                  {image && (
                    <img
                      src={image}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(event) => handleCategoryImageError(event.currentTarget, category.id)}
                    />
                  )}
                  <div className="absolute bottom-3 left-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/40 text-white backdrop-blur-md border border-amber-300/60 shadow-md overflow-hidden p-1">
                    {image ? (
                      <img src={image} alt={category.name} className="h-full w-full object-cover rounded-xl" onError={(event) => handleCategoryImageError(event.currentTarget, category.id)} />
                    ) : (
                      <Icon className="h-6 w-6 text-white drop-shadow-xs" aria-hidden="true" />
                    )}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg sm:text-xl font-black uppercase tracking-wide text-foreground group-hover:text-primary transition-colors">{category.name}</h2>
                      <p className="mt-1 text-xs sm:text-sm font-extrabold text-muted-foreground">
                        {category.subcategories.length} subcategories
                      </p>
                    </div>
                    <ArrowRight
                      className="mt-1 h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-1 font-black"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </section>
      </main>
    </div>
  );
}
