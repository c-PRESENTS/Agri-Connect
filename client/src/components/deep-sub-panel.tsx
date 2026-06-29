import { useMemo } from "react";
import { X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { categories } from "@/lib/categories";
import { getSubSubcategories, SubSubItem } from "@/lib/sub-subcategories";
import { motion, AnimatePresence } from "framer-motion";

interface DeepSubPanelProps {
  subId: string | null;
  onClose: () => void;
  onItemSelect?: (item: string) => void;
}

export function DeepSubPanel({ subId, onClose, onItemSelect }: DeepSubPanelProps) {
  const content = useMemo(() => {
    if (!subId) return [];
    return getSubSubcategories(subId);
  }, [subId]);

  const subName = useMemo(() => {
    for (const cat of categories) {
      const sub = cat.subcategories.find(s => s.id === subId);
      if (sub) return sub.name;
    }
    return "Details";
  }, [subId]);

  // Don't render if no content
  if (!subId || content.length === 0) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={subId}
        initial={{ opacity: 0, x: -15, width: 0 }}
        animate={{ opacity: 1, x: 0, width: 260 }}
        exit={{ opacity: 0, x: -15, width: 0 }}
        transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
        className="h-full border-r border-border/50 bg-sidebar/98 backdrop-blur-sm overflow-hidden flex-shrink-0 z-30"
        style={{ willChange: "transform, width, opacity" }}
      >
        <div className="h-full flex flex-col w-[260px]">
          <div className="flex items-center gap-2 p-3 border-b border-border/50 bg-muted/30">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
              <Package className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{subName}</h3>
              <p className="text-[10px] text-muted-foreground">{content.reduce((acc, c) => acc + c.items.length, 0)} varieties</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
              data-testid="button-close-deep-panel"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-3">
              {content.map((section, sectionIdx) => (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: sectionIdx * 0.05, duration: 0.15 }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5 px-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-foreground">
                      {section.title}
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {section.items.map((item, itemIdx) => (
                      <motion.button
                        key={item}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: sectionIdx * 0.05 + itemIdx * 0.02, duration: 0.1 }}
                        onClick={() => onItemSelect?.(item)}
                        className="flex items-center justify-center p-2 rounded-lg min-h-[44px] bg-muted/40 hover:bg-primary/10 active:bg-primary/15 active:scale-95 transition-all duration-150 ease-out group"
                        style={{ touchAction: 'manipulation' }}
                        data-testid={`button-item-${item.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <span className="text-[9px] font-medium text-center leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                          {item}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
