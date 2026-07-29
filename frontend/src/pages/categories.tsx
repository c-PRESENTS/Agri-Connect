import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { TopNavigation } from "@/components/top-navigation";
import { Card } from "@/components/ui/card";
import { categoryImages, getShoppableCategories } from "@/lib/categories";
import { getCategoryIconComponent } from "@/lib/category-icons";
import { MAIN_MARKETPLACE_CATEGORIES } from "@/lib/main-marketplace-categories";

const categoriesById = new Map(
  getShoppableCategories().map((category) => [category.id, category]),
);

const marketplaceCategories = MAIN_MARKETPLACE_CATEGORIES.flatMap(({ id }) => {
  const category = categoriesById.get(id);
  return category ? [category] : [];
});

export default function CategoriesPage() {
  const [, setLocation] = useLocation();

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

        <header className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Browse by category
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            All farm products and services
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Choose a category to explore its products and subcategories.
          </p>
        </header>

        <section
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          aria-label="Marketplace categories"
        >
          {marketplaceCategories.map((category) => {
            const Icon = getCategoryIconComponent(category.icon);
            const image = categoryImages[category.id];

            return (
              <Card
                key={category.id}
                role="link"
                tabIndex={0}
                className="group cursor-pointer overflow-hidden"
                onClick={() => openCategory(category.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openCategory(category.id);
                  }
                }}
                data-testid={`category-page-card-${category.id}`}
              >
                <div className="relative h-40 overflow-hidden bg-muted">
                  {image && (
                    <img
                      src={image}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                  <div className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-sm">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{category.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {category.subcategories.length} subcategories
                      </p>
                    </div>
                    <ArrowRight
                      className="mt-1 h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-1"
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
