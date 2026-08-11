import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useState, useRef, memo } from "react";
import { Link } from "wouter";
import { categoryImages, getShoppableCategories } from "@/lib/categories";
import { getCategoryIconComponent } from "@/lib/category-icons";
import { MAIN_MARKETPLACE_CATEGORIES } from "@/lib/main-marketplace-categories";
import type { Product } from "@shared/schema";

interface CategoryCarouselProps {
  onCategorySelect: (categoryId: string, subcategoryId?: string) => void;
  products: Product[];
  onAddToCart: (product: Product) => void;
}

const categoriesById = new Map(getShoppableCategories().map((category) => [category.id, category]));
const carouselCategories = MAIN_MARKETPLACE_CATEGORIES.flatMap(({ id }) => {
  const category = categoriesById.get(id);
  return category ? [category] : [];
});

export const CategoryCarousel = memo(function CategoryCarousel({ 
  onCategorySelect, 
  products,
  onAddToCart
}: CategoryCarouselProps) {
  const { t } = useTranslation();
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
    <section className="py-4 sm:py-10 md:py-14 px-3 sm:px-4" style={{ contentVisibility: "auto", containIntrinsicSize: "400px" }}>
      <div className="container mx-auto">
        <div
          className="flex items-center justify-between mb-3 sm:mb-6 md:mb-8"
        >
          <div className="min-w-0">
            <span className="text-primary font-semibold text-[10px] sm:text-xs md:text-sm uppercase tracking-wider">
              {t("category.browse_by_category")}
            </span>
            <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold mt-0.5 sm:mt-1 md:mt-2 leading-tight">
              {t("category.explore_description")}
            </h2>
            <Link
              href="/categories"
              className="mt-1.5 sm:mt-2 inline-flex items-center gap-1.5 bg-gradient-to-r from-primary to-green-600 bg-clip-text text-sm sm:text-base md:text-lg font-semibold text-transparent hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
              data-testid="link-view-all-categories"
            >
              {t("category.view_all_categories")}
              <ArrowRight className="h-4 w-4 text-green-600" aria-hidden="true" />
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
            className="flex gap-4 sm:gap-6 md:gap-7 overflow-x-auto pb-4 sm:pb-6 scrollbar-hide snap-x snap-mandatory -mx-3 px-3 sm:mx-0 sm:px-0"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {carouselCategories.map((category) => {
              const IconComponent = getCategoryIconComponent(category.icon);
              const bgImage = categoryImages[category.id];
              
              return (
                <div
                  key={category.id}
                  className="flex-shrink-0 w-[220px] sm:w-[290px] md:w-[340px] snap-start"
                >
                  <Card 
                    className="h-[260px] sm:h-[330px] md:h-[380px] relative overflow-hidden group cursor-pointer border-2 border-transparent hover:border-primary/60 rounded-2xl sm:rounded-3xl shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
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
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/15 to-muted" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent transition-colors group-hover:from-black/95" />
                    
                    <div className="relative z-10 h-full flex flex-col justify-end p-4 sm:p-6 md:p-7">
                      <div
                        className="h-10 w-10 sm:h-13 sm:w-13 md:h-15 md:w-15 rounded-2xl bg-white/30 backdrop-blur-md flex items-center justify-center mb-3 sm:mb-4 border border-white/30 shadow-md transition-transform duration-300 group-hover:scale-110"
                      >
                        <IconComponent className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 text-white drop-shadow-sm" />
                      </div>
                      <h3 className="text-lg sm:text-2xl md:text-3xl font-black text-white uppercase tracking-wide mb-1 sm:mb-2 leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{category.name}</h3>
                      <p className="text-white/95 text-xs sm:text-base font-extrabold mb-3 sm:mb-4 drop-shadow-sm">
                        {category.subcategories.length} subcategories
                      </p>
                      <Button 
                        variant="secondary" 
                        size="sm"
                        className="w-fit h-9 sm:h-11 px-4 sm:px-5 text-xs sm:text-sm font-black uppercase tracking-wider bg-amber-400 hover:bg-amber-500 text-black shadow-lg border border-amber-500/50 rounded-xl"
                      >
                        {t("category.see_all")}
                        <ArrowRight className="ml-1.5 sm:ml-2 h-4 w-4 text-black" />
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
