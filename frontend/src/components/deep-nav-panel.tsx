import { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { X, Package, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCatalogCategories } from "@/hooks/use-catalog-categories";
import { getSubSubcategories, SubSubItem } from "@/lib/sub-subcategories";
import { motion, AnimatePresence } from "framer-motion";

interface DeepNavPanelProps {
  subId: string | null;
  activeSection: string | null;
  onClose: () => void;
  onSectionClick: (sectionTitle: string, subcategoryId?: string) => void;
}

export function DeepNavPanel({ subId, activeSection, onClose, onSectionClick }: DeepNavPanelProps) {
  const { t } = useTranslation();
  const { data: categories = [] } = useCatalogCategories("buyer");
  const content = useMemo(() => {
    if (!subId) return [];
    return getSubSubcategories(subId);
  }, [subId, categories, t]);

  const subName = useMemo(() => {
    for (const cat of categories) {
      const sub = cat.subcategories.find(s => s.id === subId);
      if (sub) return sub.name;
    }
    return t("nav.browse");
  }, [subId]);

  const totalItems = useMemo(() => 
    content.reduce((acc, c) => acc + c.items.length, 0), [content]
  );

  if (!subId || content.length === 0) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={subId}
        initial={{ opacity: 0, x: -10, width: 0 }}
        animate={{ opacity: 1, x: 0, width: 240 }}
        exit={{ opacity: 0, x: -10, width: 0 }}
        transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
        className="h-full border-r border-border/60 bg-sidebar overflow-hidden flex-shrink-0 z-30"
        style={{ willChange: "transform, width, opacity" }}
      >
        <div className="h-full flex flex-col w-[240px]">
          <div className="flex items-center gap-2 p-3 border-b border-border/60 bg-muted/30">
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-xs sm:text-sm uppercase tracking-wide text-foreground truncate">{subName}</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6 rounded-lg hover:bg-destructive/10 hover:text-destructive"
              data-testid="button-close-deep-nav"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 flex flex-col gap-1">
              {content.map((section, sectionIdx) => {
                const isActive = activeSection === section.title;
                
                return (
                  <motion.button
                    key={section.title}
                    initial={{ opacity: 0, x: -2 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: sectionIdx * 0.02, duration: 0.1 }}
                    onClick={() => onSectionClick(section.title, subId || undefined)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all duration-150 active:scale-[0.98] ${
                      isActive
                        ? 'bg-primary text-primary-foreground font-black shadow-sm'
                        : 'text-foreground font-black hover:bg-muted/80 hover:text-primary'
                    }`}
                    style={{ touchAction: 'manipulation' }}
                  >
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wide truncate flex-1">
                      {section.title}
                    </span>
                    <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-transform ${isActive ? 'text-primary-foreground rotate-90' : 'text-foreground/50'}`} />
                  </motion.button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
