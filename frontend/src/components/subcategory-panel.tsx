import { useMemo, useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { X, ChevronDown, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getShoppableCategories, categoryImages } from "@/lib/categories";
import { getCategoryIconComponent } from "@/lib/category-icons";
import { getSubSubcategories } from "@/lib/sub-subcategories";
import { motion, AnimatePresence } from "framer-motion";
import type { Category, Subcategory } from "@shared/schema";

interface SubcategoryPanelProps {
  categoryId: string | null;
  selectedSubcategory?: string;
  activeSubcategory?: string | null;
  activeSection?: string | null;
  onClose: () => void;
  onSubcategorySelect?: (categoryId: string, subcategoryId: string) => void;
  onSubcategoryClick?: (subId: string | null) => void;
  onSectionClick?: (sectionTitle: string, subcategoryId?: string) => void;
}

function getCategoryImage(categoryId: string, subcategoryId?: string): string | undefined {
  if (subcategoryId && categoryImages[subcategoryId]) {
    return categoryImages[subcategoryId];
  }
  return categoryImages[categoryId];
}

export function SubcategoryPanel({ 
  categoryId, 
  selectedSubcategory,
  activeSubcategory,
  activeSection,
  onClose,
  onSubcategorySelect,
  onSubcategoryClick,
  onSectionClick
}: SubcategoryPanelProps) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState<'top' | 'middle' | 'bottom'>('top');

  const category = useMemo(() => 
    getShoppableCategories().find(c => c.id === categoryId), [categoryId]
  );

  const handleScroll = (e?: React.UIEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const viewport = container.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!viewport) return;
    
    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const isAtTop = scrollTop < 20;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20;
    
    if (isAtTop) setScrollPosition('top');
    else if (isAtBottom) setScrollPosition('bottom');
    else setScrollPosition('middle');
  };

  useEffect(() => {
    setTimeout(handleScroll, 100);
  }, [categoryId]);

  const scrollTo = (direction: 'up' | 'down') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const viewport = container.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!viewport) return;
    
    const scrollAmount = 150;
    viewport.scrollBy({ 
      top: direction === 'down' ? scrollAmount : -scrollAmount, 
      behavior: 'smooth' 
    });
  };

  const handleSubcategoryTap = (subcategory: Subcategory) => {
    if (category) {
      const hasDeepContent = getSubSubcategories(subcategory.id).length > 0;
      
      // Always notify parent and update URL to navigate main view to that subcategory slide/page!
      onSubcategorySelect?.(category.id, subcategory.id);
      setLocation(`/?category=${category.id}&subcategory=${subcategory.id}`);

      if (hasDeepContent) {
        if (activeSubcategory === subcategory.id) {
          onSubcategoryClick?.(null);
        } else {
          onSubcategoryClick?.(subcategory.id);
        }
      }
    }
  };

  if (!category) return null;

  const IconComponent = getCategoryIconComponent(category.icon);
  const categoryLogo = getCategoryImage(category.id) || `/category-logos/${category.id}.svg`;

  return (
    <AnimatePresence mode="wait">
      {categoryId && (
        <>
          {/* Mobile backdrop — closes panel on tap */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-[199] lg:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1, width: 320 }}
            exit={{ opacity: 0, x: -20, scale: 0.98, width: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:top-[48px] h-full border-r-2 border-emerald-300/80 bg-sidebar overflow-hidden flex-shrink-0 z-[200] shadow-2xl relative"
            style={{ 
              willChange: "transform, width, opacity",
              marginLeft: "0"
            }}
          >
            <div className="h-full flex flex-col w-[320px] relative">
              <div className="flex items-center gap-3 p-3.5 border-b-2 border-emerald-300/80 bg-emerald-50/90 dark:bg-emerald-950/40 sticky top-0 z-10">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl overflow-hidden shadow-xs ring-1 ring-emerald-500/30 bg-emerald-500/10 shrink-0">
                  <img
                    src={categoryLogo}
                    alt={category.name}
                    className="h-11 w-11 object-cover rounded-xl"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-sm sm:text-base uppercase tracking-wide text-foreground truncate">{category.name}</h3>
                  <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">{category.subcategories.length} {t("nav.categories", "Categories")}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                  data-testid="button-close-subcategory-panel"
                >
                  <X className="h-4.5 w-4.5" />
                </Button>
              </div>

              <ScrollArea 
                ref={scrollContainerRef as React.RefObject<HTMLDivElement>}
                className="flex-1"
                onScrollCapture={handleScroll}
              >
                <div className="p-2.5">
                  <div className="flex flex-col gap-2">
                    {category.subcategories.map((subcategory) => {
                      const subImage = getCategoryImage(category.id, subcategory.id) || categoryLogo;
                      const isSelected = selectedSubcategory === subcategory.id;
                      const isActive = activeSubcategory === subcategory.id;
                      const deepContent = getSubSubcategories(subcategory.id);
                      const hasDeepContent = deepContent.length > 0;

                      return (
                        <div key={subcategory.id} className="flex flex-col gap-1">
                          <button
                            onClick={() => handleSubcategoryTap(subcategory)}
                            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-150 active:scale-[0.98] border-2 ${
                              isActive
                                ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-md font-black dark:bg-amber-400 dark:text-amber-950'
                                : isSelected
                                ? 'bg-amber-300/90 text-amber-950 border-amber-400 font-black shadow-xs'
                                : 'bg-emerald-50/90 text-emerald-900 border-emerald-300/80 hover:bg-emerald-100 hover:text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-700 shadow-2xs font-black'
                            }`}
                            style={{ touchAction: 'manipulation' }}
                            data-testid={`button-subcategory-${subcategory.id}`}
                          >
                            <div className="relative rounded-lg overflow-hidden shadow-2xs flex-shrink-0">
                              {subImage ? (
                                <img
                                  src={subImage}
                                  alt={subcategory.name}
                                  className="w-9 h-9 object-cover rounded-lg border border-border/40"
                                  loading="lazy"
                                />
                              ) : (
                                <div className={`w-9 h-9 flex items-center justify-center rounded-lg ${
                                  isActive ? 'bg-amber-500/20 text-amber-950' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                }`}>
                                  <IconComponent className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                            <span className={`text-xs sm:text-sm font-black uppercase tracking-wide flex-1 truncate ${
                              isActive ? 'text-amber-950' : isSelected ? 'text-amber-950' : 'text-emerald-900 dark:text-emerald-200'
                            }`}>
                              {subcategory.name}
                            </span>
                            {hasDeepContent && (
                              <div className={`flex items-center justify-center w-5 h-5 rounded-full transition-colors ${isActive ? 'bg-amber-500/20' : ''}`}>
                                {isActive ? <ChevronDown className="h-4.5 w-4.5 text-amber-950" /> : <ChevronRight className="h-4.5 w-4.5 text-emerald-800 dark:text-emerald-300" />}
                              </div>
                            )}
                          </button>
                          
                          <AnimatePresence>
                            {isActive && hasDeepContent && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
                                className="overflow-hidden bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl mx-1 border border-emerald-300/60 dark:border-emerald-800"
                              >
                                <div className="py-1 flex flex-col">
                                  {deepContent.map((section) => {
                                    const isSectionActive = activeSection === section.title;
                                    return (
                                      <button
                                        key={section.title}
                                        onClick={() => {
                                          onSectionClick?.(section.title, subcategory.id);
                                        }}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-all duration-150 group rounded-lg ${
                                          isSectionActive
                                            ? 'text-amber-950 font-black bg-amber-300 border-l-4 border-amber-600 shadow-xs'
                                            : 'text-emerald-900 dark:text-emerald-200 font-extrabold hover:text-emerald-950 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40'
                                        }`}
                                        data-testid={`button-section-${section.title}`}
                                      >
                                        <span className="text-xs sm:text-sm font-black uppercase tracking-wide truncate">
                                          {section.title}
                                        </span>
                                        <div className={`w-2 h-2 rounded-full transition-all ${isSectionActive ? 'bg-amber-600 scale-100 shadow-[0_0_8px_rgba(217,119,6,0.6)]' : 'bg-transparent scale-0 group-hover:bg-emerald-600/40 group-hover:scale-75'}`} />
                                      </button>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
              
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-auto z-10 flex gap-1">
                {(scrollPosition === 'middle' || scrollPosition === 'bottom') && (
                  <button
                    onClick={() => scrollTo('up')}
                    className="bg-emerald-600/20 backdrop-blur-md border border-emerald-600/30 rounded-full p-1.5 shadow-lg hover:bg-emerald-600/30 transition-all text-emerald-800 dark:text-emerald-200"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                )}
                {(scrollPosition === 'middle' || scrollPosition === 'top') && (
                  <button
                    onClick={() => scrollTo('down')}
                    className="bg-emerald-600/20 backdrop-blur-md border border-emerald-600/30 rounded-full p-1.5 shadow-lg hover:bg-emerald-600/30 transition-all text-emerald-800 dark:text-emerald-200"
                  >
                    <ArrowDown className="h-4 w-4 animate-bounce" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
