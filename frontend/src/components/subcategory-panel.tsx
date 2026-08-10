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
          className="max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:top-[48px] h-full border-r border-border/60 bg-sidebar overflow-hidden flex-shrink-0 z-[200] shadow-2xl relative"
          style={{ 
            willChange: "transform, width, opacity",
            marginLeft: "0"
          }}
        >
          <div className="h-full flex flex-col w-[320px] relative">
            <div className="flex items-center gap-3 p-3.5 border-b border-border/60 bg-muted/30 sticky top-0 z-10">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold shrink-0 border border-emerald-500/25 shadow-2xs">
                <IconComponent className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-sm sm:text-base uppercase tracking-wide text-foreground truncate">{category.name}</h3>
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
                <div className="flex flex-col gap-1.5">
                  {category.subcategories.map((subcategory) => {
                    const subImage = getCategoryImage(category.id, subcategory.id);
                    const isSelected = selectedSubcategory === subcategory.id;
                    const isActive = activeSubcategory === subcategory.id;
                    const deepContent = getSubSubcategories(subcategory.id);
                    const hasDeepContent = deepContent.length > 0;

                    return (
                      <div key={subcategory.id} className="flex flex-col gap-1">
                        <button
                          onClick={() => handleSubcategoryTap(subcategory)}
                          className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-150 active:scale-[0.98] border ${
                            isActive
                              ? 'bg-primary text-primary-foreground border-primary shadow-md font-black'
                              : isSelected
                              ? 'bg-primary/15 text-primary border-primary/40 font-extrabold shadow-2xs'
                              : 'bg-background hover:bg-muted/80 text-foreground border-border/60 hover:border-primary/50'
                          }`}
                          style={{ touchAction: 'manipulation' }}
                          data-testid={`button-subcategory-${subcategory.id}`}
                        >
                          <div className="relative rounded-lg overflow-hidden shadow-2xs flex-shrink-0">
                            {subImage ? (
                              <img
                                src={subImage}
                                alt={subcategory.name}
                                className="w-9 h-9 object-cover border border-border/40"
                                loading="lazy"
                              />
                            ) : (
                              <div className={`w-9 h-9 flex items-center justify-center rounded-lg ${
                                isActive ? 'bg-white/20 text-white' : isSelected ? 'bg-primary text-white' : 'bg-muted text-foreground border border-border/40'
                              }`}>
                                <IconComponent className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <span className={`text-sm sm:text-base font-black uppercase tracking-wide flex-1 truncate ${
                            isActive ? 'text-primary-foreground' : isSelected ? 'text-primary' : 'text-foreground'
                          }`}>
                            {subcategory.name}
                          </span>
                          {hasDeepContent && (
                            <div className={`flex items-center justify-center w-5 h-5 rounded-full transition-colors ${isActive ? 'bg-white/20' : ''}`}>
                              {isActive ? <ChevronDown className="h-4.5 w-4.5 text-white" /> : <ChevronRight className="h-4.5 w-4.5 text-foreground/60" />}
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
                              className="overflow-hidden bg-muted/30 rounded-xl mx-1 border border-border/30"
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
                                          ? 'text-primary font-black bg-primary/15 border-l-4 border-primary shadow-xs'
                                          : 'text-foreground font-black hover:text-primary hover:bg-muted/80'
                                      }`}
                                      data-testid={`button-section-${section.title}`}
                                    >
                                      <span className="text-xs sm:text-sm font-black uppercase tracking-wide truncate">
                                        {section.title}
                                      </span>
                                      <div className={`w-2 h-2 rounded-full transition-all ${isSectionActive ? 'bg-primary scale-100 shadow-[0_0_8px_rgba(var(--primary),0.6)]' : 'bg-transparent scale-0 group-hover:bg-primary/40 group-hover:scale-75'}`} />
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
                  className="bg-primary/10 backdrop-blur-md border border-primary/20 rounded-full p-1 shadow-lg shadow-primary/10 hover:bg-primary/20 transition-all"
                >
                  <ArrowUp className="h-4 w-4 text-primary" />
                </button>
              )}
              {(scrollPosition === 'middle' || scrollPosition === 'top') && (
                <button
                  onClick={() => scrollTo('down')}
                  className="bg-primary/10 backdrop-blur-md border border-primary/20 rounded-full p-1 shadow-lg shadow-primary/10 hover:bg-primary/20 transition-all"
                >
                  <ArrowDown className="h-4 w-4 text-primary animate-bounce" />
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
