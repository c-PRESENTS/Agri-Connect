import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useState, useRef } from "react";
import { categories } from "@/lib/categories";
import { getCategoryIconComponent } from "@/lib/category-icons";
import type { Product } from "@shared/schema";

import vegetablesImg from "@assets/stock_images/fresh_vegetables_col_2df74665.jpg";
import fruitsImg from "@assets/stock_images/fresh_fruits_colorfu_e1e1e36e.jpg";

interface CategoryCarouselProps {
  onCategorySelect: (categoryId: string, subcategoryId?: string) => void;
  products: Product[];
  currencySymbol: string;
  onAddToCart: (product: Product) => void;
}

const categoryImages: Record<string, string> = {
  "daily-needs": vegetablesImg,
  "fresh-produce": fruitsImg,
};

export function CategoryCarousel({ 
  onCategorySelect, 
  products,
  currencySymbol,
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
    <section className="py-4 sm:py-10 md:py-14 px-3 sm:px-4">
      <div className="container mx-auto">
        <motion.div
          className="flex items-center justify-between mb-3 sm:mb-6 md:mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="min-w-0">
            <span className="text-primary font-semibold text-[10px] sm:text-xs md:text-sm uppercase tracking-wider">
              {t("category.browse_by_category")}
            </span>
            <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold mt-0.5 sm:mt-1 md:mt-2 leading-tight">
              {t("category.explore_description")}
              <span className="bg-gradient-to-r from-primary to-green-600 bg-clip-text text-transparent ml-2">
                {t("category.view_all_categories")}
              </span>
            </h2>
          </div>
          <div className="hidden md:flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => scroll("left")}
              className="rounded-full"
              data-testid="button-scroll-left"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => scroll("right")}
              className="rounded-full"
              data-testid="button-scroll-right"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </motion.div>
        
        <div 
          ref={scrollContainerRef}
          className="flex gap-3 sm:gap-5 md:gap-6 overflow-x-auto pb-3 sm:pb-4 scrollbar-hide snap-x snap-mandatory -mx-3 px-3 sm:mx-0 sm:px-0"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {categories.slice(0, 8).map((category, index) => {
            const IconComponent = getCategoryIconComponent(category.icon);
            const bgImage = categoryImages[category.id];
            
            return (
              <motion.div
                key={category.id}
                className="flex-shrink-0 w-[180px] sm:w-[240px] md:w-[280px] snap-start"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className="h-[200px] sm:h-[270px] md:h-[320px] relative overflow-hidden group cursor-pointer border-0"
                  onClick={() => onCategorySelect(category.id)}
                  data-testid={`card-category-${category.id}`}
                >
                  {bgImage ? (
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                      style={{ backgroundImage: `url(${bgImage})` }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-muted" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  
                  <div className="relative z-10 h-full flex flex-col justify-end p-3 sm:p-5 md:p-6">
                    <motion.div
                      className="h-9 w-9 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2 sm:mb-3 md:mb-4 border border-white/20"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <IconComponent className="h-4 w-4 sm:h-6 sm:w-6 md:h-7 md:w-7 text-white" />
                    </motion.div>
                    <h3 className="text-sm sm:text-lg md:text-xl font-bold text-white mb-0.5 sm:mb-1.5 md:mb-2 leading-tight">{category.name}</h3>
                    <p className="text-white/70 text-[10px] sm:text-xs md:text-sm mb-2 sm:mb-3 md:mb-4">
                      {category.subcategories.length} subcategories
                    </p>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      className="w-fit h-7 sm:h-8 md:h-9 px-2 sm:px-3 text-[11px] sm:text-xs md:text-sm bg-white/20 backdrop-blur-sm border-0 text-white hover:bg-white/30"
                    >
                      {t("category.see_all")}
                      <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
