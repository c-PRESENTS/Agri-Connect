import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Search, Home, PanelLeftClose, PanelLeft, Sprout, ArrowUp, ArrowDown, GripVertical, ShoppingCart, HelpCircle, TrendingUp } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { categories as defaultCategories, categoryImages } from "@/lib/categories";
import { getCategoryIconComponent } from "@/lib/category-icons";
import type { Category } from "@shared/schema";
import { motion } from "framer-motion";

interface CategorySidebarProps {
  onCategorySelect?: (categoryId: string, subcategoryId?: string) => void;
  onCategoryClick?: (categoryId: string | null) => void;
  selectedCategory?: string;
  selectedSubcategory?: string;
  expandedCategory?: string | null;
  isPanelOpen?: boolean;
}

const STORAGE_KEY = "agriconnect-category-order";

function getCategoryImage(categoryId: string): string | undefined {
  if (categoryImages[categoryId]) return categoryImages[categoryId];
  const category = defaultCategories.find(cat => cat.id === categoryId);
  if (category) {
    for (const sub of category.subcategories) {
      if (categoryImages[sub.id]) return categoryImages[sub.id];
    }
  }
  return undefined;
}

function loadOrder(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return defaultCategories.map(c => c.id);
}

function saveOrder(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

interface SortableCategoryProps {
  category: Category;
  isSelected: boolean;
  isExpanded: boolean;
  isCollapsed: boolean;
  onTap: (c: Category) => void;
}

function SortableCategory({ category, isSelected, isExpanded, isCollapsed, onTap }: SortableCategoryProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const image = getCategoryImage(category.id);
  const IconComponent = getCategoryIconComponent(category.icon);

  if (isCollapsed) {
    return (
      <div ref={setNodeRef} style={style}>
        <motion.button
          onClick={() => onTap(category)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          className={`w-full flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl transition-all duration-150 group ${
            isExpanded || isSelected
              ? "bg-primary shadow-md shadow-primary/20 ring-1 ring-primary/40"
              : "hover:bg-muted"
          }`}
          style={{ touchAction: "manipulation" }}
          data-testid={`button-category-collapsed-${category.id}`}
        >
          {image ? (
            <img
              src={image}
              alt={category.name}
              className={`w-[52px] h-[52px] rounded-xl object-cover transition-transform group-hover:scale-110 shadow-sm ${
                isExpanded || isSelected ? "ring-2 ring-white/40" : ""
              }`}
              loading="lazy"
            />
          ) : (
            <div className={`w-[52px] h-[52px] flex items-center justify-center rounded-xl ${
              isExpanded || isSelected ? "bg-white/20 text-white" : "bg-muted/60 text-muted-foreground"
            }`}>
              <IconComponent className="h-7 w-7" />
            </div>
          )}
          <span className={`text-[10px] font-bold leading-tight text-center uppercase tracking-tight w-full px-1 truncate ${
            isExpanded || isSelected ? "text-white" : "text-muted-foreground group-hover:text-foreground"
          }`}>
            {category.name.split(" ")[0]}
          </span>
        </motion.button>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group/drag">
      <button
        onClick={() => onTap(category)}
        className={`w-full flex flex-col items-center justify-center p-2 rounded-xl cursor-pointer min-h-[68px] transition-all duration-200 group border border-transparent ${
          isExpanded
            ? "bg-primary/10 ring-1 ring-primary/40 shadow-sm shadow-primary/5 border-primary/20"
            : isSelected
            ? "bg-primary/5 ring-1 ring-primary/20"
            : "bg-muted/30 hover:bg-muted/60"
        }`}
        style={{ touchAction: "manipulation" }}
        data-testid={`button-category-${category.id}`}
      >
        <div className="relative overflow-hidden rounded-lg mb-1 shadow-sm">
          {image ? (
            <img src={image} alt={category.name} className="w-[52px] h-[52px] object-cover transition-transform duration-300 group-hover:scale-110" loading="lazy" />
          ) : (
            <div className={`w-[52px] h-[52px] flex items-center justify-center transition-colors rounded-lg ${
              isExpanded || isSelected ? "bg-primary text-white" : "bg-muted/50"
            }`}>
              <IconComponent className="h-7 w-7" />
            </div>
          )}
        </div>
        <span className={`text-[10px] font-bold text-center leading-tight line-clamp-2 uppercase tracking-tight transition-colors ${isExpanded ? "text-primary" : ""}`}>
          {category.name.split(" ").slice(0, 2).join(" ")}
        </span>
      </button>
      <button
        className="absolute top-1 right-1 opacity-0 group-hover/drag:opacity-60 hover:!opacity-100 p-0.5 rounded cursor-grab active:cursor-grabbing transition-opacity z-10"
        {...attributes}
        {...listeners}
        title={t("nav.edit_menu_hint")}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  );
}

export function CategorySidebar({
  onCategorySelect,
  onCategoryClick,
  selectedCategory,
  selectedSubcategory,
  expandedCategory,
  isPanelOpen,
}: CategorySidebarProps) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { setOpen, open, state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState<"top" | "middle" | "bottom">("top");
  const [categoryOrder, setCategoryOrder] = useState<string[]>(loadOrder);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const orderedCategories = useMemo(() => {
    const map = new Map(defaultCategories.map(c => [c.id, c]));
    return categoryOrder.map(id => map.get(id)).filter(Boolean) as Category[];
  }, [categoryOrder]);

  const filteredCategories = useMemo(() =>
    orderedCategories.filter(cat =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.subcategories.some(sub => sub.name.toLowerCase().includes(searchQuery.toLowerCase()))
    ), [orderedCategories, searchQuery]
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = categoryOrder.indexOf(active.id as string);
      const newIndex = categoryOrder.indexOf(over.id as string);
      const newOrder = arrayMove(categoryOrder, oldIndex, newIndex);
      setCategoryOrder(newOrder);
      saveOrder(newOrder);
    }
  }, [categoryOrder]);

  const handleMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    if (!open) setOpen(true);
  };

  const handleMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => { if (open) setOpen(false); }, 600);
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const viewport = container.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement;
    if (!viewport) return;
    const { scrollTop, scrollHeight, clientHeight } = viewport;
    if (scrollTop < 20) setScrollPosition("top");
    else if (scrollTop + clientHeight >= scrollHeight - 20) setScrollPosition("bottom");
    else setScrollPosition("middle");
  };

  useEffect(() => { setTimeout(handleScroll, 100); }, []);

  const scrollTo = (direction: "up" | "down") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const viewport = container.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement;
    if (!viewport) return;
    viewport.scrollBy({ top: direction === "down" ? 200 : -200, behavior: "smooth" });
  };

  // Categories that have dedicated pages instead of home-page product filters
  const CATEGORY_PAGE_MAP: Record<string, string> = {
    "government":    "/government-schemes",
    "land-leasing":  "/land-leasing",
    "logistics":     "/logistics",
    "share-care":    "/share-care",
  };

  const handleCategoryTap = (category: Category) => {
    const dedicatedPage = CATEGORY_PAGE_MAP[category.id];
    if (dedicatedPage) {
      setLocation(dedicatedPage);
      setOpen(false);
      return;
    }
    onCategorySelect?.(category.id);
    onCategoryClick?.(category.id);
    setOpen(false);
  };

  const totalSubcategories = useMemo(() =>
    defaultCategories.reduce((acc, cat) => acc + cat.subcategories.length, 0), []
  );

  return (
    <Sidebar
      className="border-r border-border/40 bg-sidebar/95 backdrop-blur-xl sidebar-border-animate"
      collapsible="icon"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SidebarHeader className="border-b border-border/40 p-2 bg-muted/20">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Link href="/" className="flex items-center gap-1.5 group" data-testid="link-sidebar-home">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-green-600 shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-[11px] tracking-tight uppercase leading-none">AgriConnect</span>
                  <span className="text-[7px] text-muted-foreground uppercase tracking-widest font-medium">{t("category.market")}</span>
                </div>
              </Link>
              <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-6 w-6 rounded-full hover:bg-muted" data-testid="button-collapse-sidebar">
                <PanelLeftClose className="h-5 w-5" />
              </Button>
            </div>
            <div className="relative group">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                placeholder={t("search.placeholder")}
                className="pl-7 h-7 text-[10px] rounded-md bg-muted/50 border-0 focus-visible:ring-1 transition-all focus:bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-category-search"
              />
            </div>
          </div>
        ) : (
          <div className="flex justify-center p-1">
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8 rounded-lg hover:bg-primary/10 transition-colors" data-testid="button-expand-sidebar">
              <PanelLeft className="h-5 w-5 text-primary" />
            </Button>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="relative">
        <ScrollArea
          ref={scrollContainerRef as React.RefObject<HTMLDivElement>}
          className="h-[calc(100vh-7rem)]"
          onScrollCapture={handleScroll}
        >
          <div className="p-1.5 gap-1.5 flex flex-col">
            {!isCollapsed && (
              <Link href="/farmers-help" data-testid="link-farmers-help">
                <div className="mb-1 p-1.5 bg-gradient-to-r from-primary/10 to-transparent rounded-lg border border-primary/20 hover:border-primary/40 transition-all group overflow-hidden relative">
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-1.5 relative z-10">
                    <div className="h-6 w-6 rounded-md bg-primary/20 flex items-center justify-center">
                      <Sprout className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-[9px] uppercase tracking-tight">{t("help.title")}</span>
                      <span className="text-[7px] text-muted-foreground">{t("help.guidance")}</span>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                {!isCollapsed && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {filteredCategories.map((category) => (
                      <SortableCategory
                        key={category.id}
                        category={category}
                        isSelected={selectedCategory === category.id}
                        isExpanded={expandedCategory === category.id}
                        isCollapsed={false}
                        onTap={handleCategoryTap}
                      />
                    ))}
                  </div>
                )}

                {isCollapsed && (
                  <div className="flex flex-col gap-1.5 px-1">
                    {filteredCategories.map((category) => (
                      <SortableCategory
                        key={category.id}
                        category={category}
                        isSelected={selectedCategory === category.id}
                        isExpanded={expandedCategory === category.id}
                        isCollapsed={true}
                        onTap={handleCategoryTap}
                      />
                    ))}
                  </div>
                )}
              </SortableContext>
            </DndContext>
          </div>
        </ScrollArea>

        {!isCollapsed && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-auto z-10 flex gap-1">
            {(scrollPosition === "middle" || scrollPosition === "bottom") && (
              <button onClick={() => scrollTo("up")} className="bg-primary/10 backdrop-blur-md border border-primary/20 rounded-full p-1 shadow-lg shadow-primary/10 hover:bg-primary/20 transition-all">
                <ArrowUp className="h-4 w-4 text-primary" />
              </button>
            )}
            {(scrollPosition === "middle" || scrollPosition === "top") && (
              <button onClick={() => scrollTo("down")} className="bg-primary/10 backdrop-blur-md border border-primary/20 rounded-full p-1 shadow-lg shadow-primary/10 hover:bg-primary/20 transition-all">
                <ArrowDown className="h-4 w-4 text-primary animate-bounce" />
              </button>
            )}
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-1.5 bg-muted/10 space-y-1">
        {/* A.6 Quick-Launch Panels */}
        <div className={`grid ${isCollapsed ? "grid-cols-1 gap-1" : "grid-cols-3 gap-1"}`}>
          {[
            { icon: ShoppingCart, label: "nav.cart", href: "/cart", color: "text-orange-500" },
            { icon: TrendingUp, label: "nav.browse", href: "/land-leasing", color: "text-blue-500" },
            { icon: HelpCircle, label: "nav.help", href: "/farmers-help", color: "text-green-500" },
          ].map(({ icon: Icon, label, href, color }) => (
            <Tooltip key={label} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link href={href} data-testid={`link-quick-${label.toLowerCase()}`}>
                  <button className={`w-full flex flex-col items-center justify-center gap-0.5 py-1 rounded-lg hover:bg-muted/60 transition-all group ${isCollapsed ? "py-1.5" : ""}`}>
                    <Icon className={`${isCollapsed ? "h-4 w-4" : "h-3.5 w-3.5"} ${color} transition-transform group-hover:scale-110`} />
                    {!isCollapsed && <span className="text-[7px] uppercase font-bold tracking-wide text-muted-foreground">{t(label)}</span>}
                  </button>
                </Link>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" className="text-[10px] font-bold uppercase tracking-widest">{t(label)}</TooltipContent>
              )}
            </Tooltip>
          ))}
        </div>

        {!isCollapsed && (
          <div className="text-[8px] text-muted-foreground text-center bg-muted/40 rounded-md py-1 font-medium tracking-tight border border-border/10">
            <span className="text-primary font-bold">{defaultCategories.length}</span> CAT
            <span className="mx-1.5 text-border">|</span>
            <span className="text-primary font-bold">{totalSubcategories}+</span> ITEMS
            <span className="mx-1.5 text-border">|</span>
            <span className="text-muted-foreground">{t("nav.edit_menu_hint")}</span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
