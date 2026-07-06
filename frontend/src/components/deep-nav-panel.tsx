import { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { X, Package, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { categories } from "@/lib/categories";
import { getSubSubcategories, SubSubItem } from "@/lib/sub-subcategories";
import { motion, AnimatePresence } from "framer-motion";

interface DeepNavPanelProps {
  subId: string | null;
  activeSection: string | null;
  onClose: () => void;
  onSectionClick: (sectionTitle: string) => void;
}

export function DeepNavPanel({ subId, activeSection, onClose, onSectionClick }: DeepNavPanelProps) {
  const { t } = useTranslation();
  const content = useMemo(() => {
    if (!subId) return [];
    return getSubSubcategories(subId);
  }, [subId]);

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
        animate={{ opacity: 1, x: 0, width: 150 }}
        exit={{ opacity: 0, x: -10, width: 0 }}
        transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
        className="h-full border-r border-border/40 bg-sidebar/90 backdrop-blur-2xl overflow-hidden flex-shrink-0 z-30 dark:bg-sidebar/80 dark:border-white/[0.06]"
        style={{ willChange: "transform, width, opacity" }}
      >
        <div className="h-full flex flex-col w-[150px]">
          <div className="flex items-center gap-1.5 p-2 border-b border-border/40 bg-muted/20">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[10px] uppercase tracking-tight truncate">{subName}</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-5 w-5"
              data-testid="button-close-deep-nav"
            >
              <X className="h-2.5 w-2.5" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-1 flex flex-col gap-0.5">
              {content.map((section, sectionIdx) => {
                const isActive = activeSection === section.title;
                
                return (
                  <motion.button
                    key={section.title}
                    initial={{ opacity: 0, x: -2 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: sectionIdx * 0.02, duration: 0.1 }}
                    onClick={() => onSectionClick(section.title)}
                    className={`w-full flex items-center justify-between p-1.5 rounded-md text-left transition-all duration-150 active:scale-[0.98] ${
                      isActive
                        ? 'bg-primary/10 text-primary ring-1 ring-primary/30 shadow-xs'
                        : 'hover:bg-muted/40 active:bg-muted/60'
                    }`}
                    style={{ touchAction: 'manipulation' }}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-tight truncate flex-1">
                      {section.title}
                    </span>
                    <ChevronRight className={`h-2.5 w-2.5 flex-shrink-0 transition-transform ${isActive ? 'text-primary rotate-90' : 'text-muted-foreground/30'}`} />
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
