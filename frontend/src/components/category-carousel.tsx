import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useState, useRef, memo } from "react";
import { Link } from "wouter";
import { handleCategoryImageError, resolveCategoryImage } from "@/lib/categories";
import { useCatalogCategories } from "@/hooks/use-catalog-categories";
import { getCategoryIconComponent } from "@/lib/category-icons";
import type { Product } from "@shared/schema";

interface CategoryCarouselProps {
  onCategorySelect: (categoryId: string, subcategoryId?: string) => void;
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export const CategoryCarousel = memo(function CategoryCarousel({ 
  onCategorySelect, 
  products,
  onAddToCart
}: CategoryCarouselProps) {
  const { t } = useTranslation();
  const { data: publishedCategories = [] } = useCatalogCategories("buyer");
  const carouselCategories = publishedCategories;
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320;
      const newPosition = direction === "left" 
        ? Math.max(0, scrollPosition - scrollAmount)
        : scrollPosition + scrollAmount;
      scrollContainerRef.current.scrollTo({ left: newPosition, behavior: "smooth" });
      setScrollPosition(newPosition);
    }
  };

  return (
    <section className="py-4 sm:py-8 md:py-10 px-3 sm:px-6 lg:px-8" style={{ contentVisibility: "auto", containIntrinsicSize: "400px" }}>
      <div className="w-full max-w-[1700px] mx-auto">
        <div
          className="flex items-center justify-between mb-3 sm:mb-6 md:mb-8"
        >
          <div className="min-w-0">
            <span className="text-primary font-black text-sm sm:text-base md:text-lg lg:text-xl uppercase tracking-wider block mb-1">
              {t("category.browse_by_category")}
            </span>
            <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold mt-0.5 sm:mt-1 md:mt-2 leading-tight">
              {t("category.explore_description")}
            </h2>
            <Link
              href="/categories"
              className="mt-2 sm:mt-3 inline-flex items-center gap-2 bg-gradient-to-r from-primary to-green-600 bg-clip-text text-base sm:text-lg md:text-xl lg:text-2xl font-black text-transparent hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
              data-testid="link-view-all-categories"
            >
              {t("category.view_all_categories")}
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 font-black stroke-[2.5]" aria-hidden="true" />
            </Link>
          </div>
            <div className="hidden sm:flex gap-2.5">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => scroll("left")}
                className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border-2 border-primary/40 hover:border-primary hover:bg-primary/10 shadow-sm"
                data-testid="button-scroll-left"
              >
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => scroll("right")}
                className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border-2 border-primary/40 hover:border-primary hover:bg-primary/10 shadow-sm"
                data-testid="button-scroll-right"
              >
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
              </Button>
            </div>
          </div>
          
          <div 
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-3 px-3 sm:mx-0 sm:gap-4 sm:px-0 sm:pb-5 md:gap-5"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {carouselCategories.map((category) => {
              const IconComponent = getCategoryIconComponent(category.icon);
              const bgImage = resolveCategoryImage(category.id, category.imageUrl);
              
              return (
                <div
                  key={category.id}
                  className="w-[180px] flex-shrink-0 snap-start sm:w-[220px] md:w-[250px] lg:w-[270px]"
                >
                  <Card 
                    className="group relative h-[220px] cursor-pointer overflow-hidden rounded-2xl border-2 border-transparent shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-xl sm:h-[260px] md:h-[290px] lg:h-[310px]"
                    onClick={() => onCategorySelect(category.id)}
                    data-testid={`card-category-${category.id}`}
                  >
                    {bgImage ? (
                      <img
                        src={bgImage}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(event) => handleCategoryImageError(event.currentTarget, category.id)}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/15 to-muted" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent transition-colors group-hover:from-black/95" />
                    
                    <div className="relative z-10 flex h-full flex-col justify-end p-3 sm:p-4 md:p-5">
                      <div
                        className="mb-2.5 flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl border border-white/30 bg-white/30 p-1 shadow-md backdrop-blur-md transition-transform duration-300 group-hover:scale-110 sm:h-10 sm:w-10 md:h-11 md:w-11"
                      >
                        {bgImage ? (
                          <img src={bgImage} alt={category.name} className="h-full w-full rounded-lg object-cover" onError={(event) => handleCategoryImageError(event.currentTarget, category.id)} />
                        ) : (
                          <IconComponent className="h-4 w-4 text-white drop-shadow-sm sm:h-5 sm:w-5 md:h-6 md:w-6" />
                        )}
                      </div>
                      <h3 className="mb-1 text-base font-black uppercase leading-tight tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] sm:text-lg md:text-xl">{category.name}</h3>
                      <p className="mb-2.5 text-[10px] font-extrabold text-white/95 drop-shadow-sm sm:mb-3 sm:text-xs">
                        {category.subcategories.length} subcategories
                      </p>
                      <Button 
                        variant="secondary" 
                        size="sm"
                        className="h-8 w-fit rounded-lg border border-amber-500/50 bg-amber-400 px-3 text-[10px] font-black uppercase tracking-wider text-black shadow-md hover:bg-amber-500 sm:h-9 sm:px-4 sm:text-xs"
                      >
                        {t("category.see_all")}
                        <ArrowRight className="ml-1 h-3.5 w-3.5 text-black sm:ml-1.5 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>

      </div>
    </section>
  );
});
