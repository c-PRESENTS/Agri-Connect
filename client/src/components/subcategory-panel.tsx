import { useMemo, useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { X, ChevronDown, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { categories, categoryImages } from "@/lib/categories";
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
  onSectionClick?: (sectionTitle: string) => void;
}

function getIcon(iconName: string) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  return icons[iconName] || LucideIcons.Package;
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
  const [, setLocation] = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState<'top' | 'middle' | 'bottom'>('top');

  const category = useMemo(() => 
    categories.find(c => c.id === categoryId), [categoryId]
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
      
      if (hasDeepContent) {
        if (activeSubcategory === subcategory.id) {
          onSubcategoryClick?.(null);
        } else {
          onSubcategoryClick?.(subcategory.id);
        }
      } else {
        onSubcategorySelect?.(category.id, subcategory.id);
        setLocation(`/?category=${category.id}&subcategory=${subcategory.id}`);
      }
    }
  };

  if (!category) return null;

  const IconComponent = getIcon(category.icon);

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
          animate={{ opacity: 1, x: 0, scale: 1, width: 220 }}
          exit={{ opacity: 0, x: -20, scale: 0.98, width: 0 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:top-[48px] h-full border-r border-border/40 bg-sidebar/95 backdrop-blur-xl overflow-hidden flex-shrink-0 z-[200] shadow-2xl relative"
          style={{ 
            willChange: "transform, width, opacity",
            marginLeft: "0"
          }}
        >
          <div className="h-full flex flex-col w-[220px] relative">
            <div className="flex items-center gap-2 p-2 border-b border-border/40 bg-muted/20 backdrop-blur-md sticky top-0 z-10">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary/20 to-green-600/20 text-primary">
                <IconComponent className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[10px] truncate uppercase tracking-widest text-primary/90">{category.name}</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                data-testid="button-close-subcategory-panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea 
              ref={scrollContainerRef as React.RefObject<HTMLDivElement>}
              className="flex-1"
              onScrollCapture={handleScroll}
            >
              <div className="p-1.5">
                <div className="flex flex-col gap-0.5">
                  {category.subcategories.map((subcategory) => {
                    const subImage = getCategoryImage(category.id, subcategory.id);
                    const isSelected = selectedSubcategory === subcategory.id;
                    const isActive = activeSubcategory === subcategory.id;
                    const deepContent = getSubSubcategories(subcategory.id);
                    const hasDeepContent = deepContent.length > 0;
                    
                    return (
                      <div key={subcategory.id} className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleSubcategoryTap(subcategory)}
                          className={`flex items-center gap-2 p-1.5 rounded-lg text-left transition-all duration-200 active:scale-[0.98] border border-transparent ${
                            isActive 
                              ? 'bg-primary/10 text-primary border-primary/20 shadow-sm' 
                              : isSelected 
                              ? 'bg-primary/5 text-primary' 
                              : 'hover:bg-muted/50 active:bg-muted/80'
                          }`}
                          style={{ touchAction: 'manipulation' }}
                          data-testid={`button-subcategory-${subcategory.id}`}
                        >
                          <div className="relative rounded-md overflow-hidden shadow-sm flex-shrink-0">
                            {subImage ? (
                              <img 
                                src={subImage} 
                                alt={subcategory.name} 
                                className="w-6 h-6 object-cover" 
                                loading="lazy" 
                              />
                            ) : (
                              <div className={`w-7 h-7 flex items-center justify-center ${
                                isActive || isSelected ? 'bg-primary text-white' : 'bg-background border border-border/40'
                              }`}>
                                <IconComponent className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] font-bold uppercase tracking-tight truncate flex-1">
                            {subcategory.name}
                          </span>
                          {hasDeepContent && (
                            <div className={`flex items-center justify-center w-4 h-4 rounded-full transition-colors ${isActive ? 'bg-primary/20' : ''}`}>
                              {isActive ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground/30" />}
                            </div>
                          )}
                        </button>
                        
                        <AnimatePresence>
                          {isActive && hasDeepContent && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                              className="overflow-hidden bg-muted/20 rounded-lg mx-1 border border-border/20"
                            >
                              <div className="py-1 flex flex-col">
                                {deepContent.map((section) => {
                                  const isSectionActive = activeSection === section.title;
                                  return (
                                    <button
                                      key={section.title}
                                      onClick={() => onSectionClick?.(section.title)}
                                      className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-all duration-200 group ${
                                        isSectionActive
                                          ? 'text-primary font-bold bg-primary/5'
                                          : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/40'
                                      }`}
                                      data-testid={`button-section-${section.title}`}
                                    >
                                      <span className="text-[8px] uppercase tracking-widest truncate">
                                        {section.title}
                                      </span>
                                      <div className={`w-1 h-1 rounded-full transition-all ${isSectionActive ? 'bg-primary scale-100 shadow-[0_0_8px_rgba(var(--primary),0.5)]' : 'bg-transparent scale-0 group-hover:bg-muted-foreground/20 group-hover:scale-75'}`} />
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
