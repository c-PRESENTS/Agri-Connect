import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Home, Map, Sprout, Cpu, Landmark, Truck, HeartHandshake,
  FileText, ShoppingCart, LayoutDashboard, Camera, Settings,
  Pencil, X, Check, RotateCcw, ChevronsRight, ChevronsLeft, GripVertical,
  ShoppingBasket, Wrench, Package, Award, Wheat, Store,
  Salad, Factory, Leaf, Briefcase, Sparkles, Grid3X3,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { categories as defaultCategories, categoryImages, isShoppableCategory } from "@/lib/categories";
import { AppLauncher } from "./app-launcher";
import { useTranslation } from "react-i18next";

function getCategoryImage(categoryId: string): string | undefined {
  if (categoryImages[categoryId]) return categoryImages[categoryId];
  const cat = defaultCategories.find(c => c.id === categoryId);
  if (cat) {
    for (const sub of cat.subcategories) {
      if (categoryImages[sub.id]) return categoryImages[sub.id];
    }
  }
  return undefined;
}

const ALL_SERVICES = [
  { id: "home",         path: "/",                     icon: Home,            label: "Home",         public: true  },
  // Shopping categories (merged from the old front sidebar) — link to home with ?category=
  { id: "cat-daily",    path: "/?category=daily-needs",     icon: ShoppingBasket, label: "Daily",      public: true, category: "daily-needs"     },
  { id: "cat-fresh",    path: "/?category=fresh-produce",    icon: Salad,          label: "Fresh",      public: true, category: "fresh-produce"    },
  { id: "cat-inputs",   path: "/?category=inputs-tools",    icon: Wrench,         label: "Inputs",     public: true, category: "inputs-tools"    },
  { id: "cat-processed",path: "/?category=processed",       icon: Package,        label: "Processed",  public: true, category: "processed"       },
  { id: "cat-specialty",path: "/?category=specialty",       icon: Award,          label: "Specialty",  public: true, category: "specialty"       },
  { id: "cat-other",    path: "/?category=other-agri",      icon: Wheat,          label: "Other Agri", public: true, category: "other-agri"      },
  { id: "cat-super",    path: "/?category=supermarket",     icon: Store,          label: "Market",     public: true, category: "supermarket"     },
  { id: "cat-dietary",  path: "/?category=dietary",         icon: Salad,          label: "Dietary",    public: true, category: "dietary"         },
  { id: "cat-modern",   path: "/?category=modern-farming",  icon: Sparkles,       label: "Modern",     public: true, category: "modern-farming"  },
  { id: "cat-services", path: "/?category=services",        icon: Briefcase,      label: "Services",   public: true, category: "services"        },
  { id: "cat-commerc",  path: "/?category=commercial-crops",icon: Factory,        label: "Commercial", public: true, category: "commercial-crops"},
  { id: "cat-bio",      path: "/?category=bio-products",    icon: Leaf,           label: "Bio",        public: true, category: "bio-products"    },
  // App services (existing)
  { id: "help",     path: "/farmers-help",         icon: Sprout,          label: "Learn",     public: true  },
  { id: "agritech", path: "/agritech",             icon: Cpu,             label: "AgriTech",  public: true  },
  { id: "map",      path: "/map",                  icon: Map,             label: "Smart Map", public: true  },
  { id: "land",     path: "/land-leasing",         icon: Landmark,        label: "Land",      public: true  },
  { id: "share",    path: "/share-care",           icon: HeartHandshake,  label: "Share",     public: true  },
  { id: "ship",     path: "/ship",                 icon: Truck,           label: "Ship",      public: true  },
  { id: "logistics",path: "/logistics",            icon: Package,         label: "Delivery",  public: true  },
  { id: "schemes",  path: "/government-schemes",   icon: FileText,        label: "Schemes",   public: true  },
  { id: "cart",     path: "/cart",                 icon: ShoppingCart,    label: "Cart",      public: true  },
  { id: "dash",     path: "/dashboard",            icon: LayoutDashboard, label: "Dashboard", public: false },
  { id: "sell",     path: "/dashboard/photo-sell", icon: Camera,          label: "Sell",      public: false },
  { id: "settings", path: "/settings",             icon: Settings,        label: "Settings",  public: false },
] as const;

type ServiceItem = typeof ALL_SERVICES[number];

const LS_ORDER    = "agri-nav-order";
const LS_HIDDEN   = "agri-nav-hidden";
const LS_EXPANDED = "agri-nav-expanded";

function readOrder(): string[] | null {
  try { return JSON.parse(localStorage.getItem(LS_ORDER) || "null"); } catch { return null; }
}
function readHidden(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_HIDDEN) || "[]"); } catch { return []; }
}
function readExpanded(): boolean {
  try { return localStorage.getItem(LS_EXPANDED) === "1"; } catch { return false; }
}
function persist(order: string[], hidden: Set<string>) {
  localStorage.setItem(LS_ORDER, JSON.stringify(order));
  localStorage.setItem(LS_HIDDEN, JSON.stringify(Array.from(hidden)));
  window.dispatchEvent(new Event("agri-nav-changed"));
}
function readEmojis(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem("agri-nav-emojis") || "{}"); } catch { return {}; }
}

interface AppNavRailProps { cartCount?: number; }

function SortableNavSlot({
  id,
  editMode,
  children,
}: {
  id: string;
  editMode: boolean;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !editMode,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
      }}
      {...(editMode ? attributes : {})}
      {...(editMode ? listeners : {})}
      className={`relative ${isDragging ? "ring-2 ring-primary/60 rounded-xl z-10" : ""}`}
    >
      {children}
    </div>
  );
}

export function AppNavRail({ cartCount = 0 }: AppNavRailProps) {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const currentCategory = new URLSearchParams(search || "").get("category");
  const { isAuthenticated } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [expanded, setExpanded] = useState<boolean>(() => readExpanded());
  const [appLauncherOpen, setAppLauncherOpen] = useState(false);

  const LABEL_KEYS: Record<string, string> = {
    "home": "nav.home",
    "cat-daily": "category.daily",
    "cat-inputs": "category.inputs",
    "cat-processed": "category.processed",
    "cat-specialty": "category.specialty",
    "cat-other": "category.other_agri",
    "cat-super": "category.market",
    "cat-dietary": "category.dietary",
    "cat-modern": "category.modern",
    "cat-services": "category.services",
    "cat-commerc": "category.commercial",
    "cat-bio": "category.bio",
    "help": "nav.help",
    "agritech": "home.agritech",
    "map": "nav.map",
    "land": "nav.land",
    "share": "nav.share",
    "ship": "nav.ship",
    "logistics": "home.logistics",
    "schemes": "home.govt_schemes",
    "cart": "nav.cart",
    "dash": "nav.dashboard",
    "sell": "home.sell_list",
    "settings": "nav.settings",
  };
  const getItemLabel = (item: ServiceItem) => {
    const key = LABEL_KEYS[item.id];
    return key ? t(key, { defaultValue: item.label }) : item.label;
  };
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const isBuyerVisibleItem = (item: ServiceItem) => !("category" in item) || isShoppableCategory(item.category);
  const defaultIds = ALL_SERVICES.filter(s => (s.public || isAuthenticated) && isBuyerVisibleItem(s)).map(s => s.id);

  const [order, setOrder] = useState<string[]>(() => {
    const saved = readOrder();
    if (!saved) return defaultIds;
    const merged = [...saved];
    defaultIds.forEach(id => { if (!merged.includes(id)) merged.push(id); });
    return merged;
  });
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(readHidden()));
  const [emojis, setEmojis] = useState<Record<string, string>>(() => readEmojis());

  // Persist expansion state and broadcast so the top nav can stay in sync.
  useEffect(() => {
    try { localStorage.setItem(LS_EXPANDED, expanded ? "1" : "0"); } catch {}
    window.dispatchEvent(new CustomEvent("agri-nav-expanded-changed", { detail: expanded }));
  }, [expanded]);

  // Listen for an external toggle (e.g. menu button in the top nav).
  useEffect(() => {
    const onToggle = () => setExpanded(v => !v);
    const onSet = (e: Event) => setExpanded(!!(e as CustomEvent).detail);
    window.addEventListener("agri-nav-toggle", onToggle);
    window.addEventListener("agri-nav-set", onSet as EventListener);
    return () => {
      window.removeEventListener("agri-nav-toggle", onToggle);
      window.removeEventListener("agri-nav-set", onSet as EventListener);
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      const saved = readOrder();
      if (saved) setOrder(saved);
      setHidden(new Set(readHidden()));
      setEmojis(readEmojis());
    };
    window.addEventListener("agri-nav-changed", sync);
    return () => window.removeEventListener("agri-nav-changed", sync);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const authIds = ALL_SERVICES.filter(s => !s.public && isBuyerVisibleItem(s)).map(s => s.id);
      setOrder(prev => {
        const merged = [...prev];
        authIds.forEach(id => { if (!merged.includes(id)) merged.push(id); });
        return merged;
      });
    }
  }, [isAuthenticated]);

  const visibleItems = order
    .map(id => ALL_SERVICES.find(s => s.id === id))
    .filter((s): s is typeof ALL_SERVICES[0] => !!s && (s.public || isAuthenticated) && isBuyerVisibleItem(s) && !hidden.has(s.id));

  const hiddenItems = ALL_SERVICES.filter(s => (s.public || isAuthenticated) && isBuyerVisibleItem(s) && hidden.has(s.id));

  const remove = (id: string) => setHidden(prev => {
    const next = new Set(Array.from(prev)); next.add(id); persist(order, next); return next;
  });
  const restore = (id: string) => setHidden(prev => {
    const next = new Set(prev); next.delete(id); persist(order, next); return next;
  });
  const reset = () => {
    const def = ALL_SERVICES.filter(s => (s.public || isAuthenticated) && isBuyerVisibleItem(s)).map(s => s.id);
    const h = new Set<string>();
    setOrder(def); setHidden(h); persist(def, h);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder(prev => {
      const next = [...prev];
      const fi = next.indexOf(String(active.id));
      const ti = next.indexOf(String(over.id));
      if (fi < 0 || ti < 0) return prev;
      const reordered = arrayMove(next, fi, ti);
      persist(reordered, hidden);
      return reordered;
    });
  };

  // Collapsed rail shows icon + small label under it for clarity (request A.2).
  const W_COLLAPSED = 96;
  const W_EXPANDED  = editMode ? 240 : 220;

  return (
    <aside
      className="hidden lg:flex flex-col bg-sidebar/95 backdrop-blur-xl border-r border-border/40 shrink-0 overflow-hidden z-50"
      style={{
        width: expanded ? W_EXPANDED : W_COLLAPSED,
        transition: "width 160ms cubic-bezier(0.23,1,0.32,1)",
      }}
      data-testid="app-nav-rail"
    >
      {/* Header: manual expand/collapse toggle */}
      <div className="flex items-center justify-end px-2 pt-2">
        <button
          onClick={() => setExpanded(v => !v)}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title={expanded ? t("nav.collapse_menu") : t("nav.expand_menu")}
          data-testid="nav-rail-toggle"
        >
          {expanded ? <ChevronsLeft className="h-5 w-5" /> : <ChevronsRight className="h-5 w-5" />}
        </button>
      </div>

      {/* Scrollable nav items */}
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden py-2 gap-1.5 px-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
            {visibleItems.map((item) => {
              const itemCat = (item as ServiceItem & { category?: string }).category;
              const isActive = itemCat
                ? location === "/" && currentCategory === itemCat
                : item.id === "home"
                  ? location === "/" && !currentCategory
                  : location === item.path || location.startsWith(item.path + "/");
              const Icon = item.icon;
              return (
                <SortableNavSlot key={item.id} id={item.id} editMode={editMode}>
              <motion.button
                onClick={() => {
                  if (editMode) return;
                  if (itemCat) {
                    setLocation(item.path);
                    window.dispatchEvent(new CustomEvent("agri-subcategory-open", { detail: itemCat }));
                  } else if (item.id === "home") {
                    // Hard-clear any category query so Home truly goes home.
                    window.dispatchEvent(new Event("agri-subcategory-close"));
                    if (window.location.pathname !== "/" || window.location.search) {
                      window.history.pushState({}, "", "/");
                    }
                    setLocation("/");
                  } else {
                    window.dispatchEvent(new Event("agri-subcategory-close"));
                    setLocation(item.path);
                  }
                }}
                whileHover={!editMode ? { scale: 1.03 } : {}}
                whileTap={!editMode ? { scale: 0.96 } : {}}
                title={getItemLabel(item)}
                className={`w-full relative flex rounded-xl transition-all duration-150 overflow-hidden ${
                  expanded
                    ? "items-center gap-3 py-2 px-2.5"
                    : "flex-col items-center justify-center gap-1 py-2 px-1"
                } ${
                  isActive && !editMode
                    ? "bg-gradient-to-r from-primary/25 via-primary/15 to-primary/5 text-primary font-semibold shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)] ring-1 ring-primary/30"
                    : editMode
                      ? "bg-muted/40 text-muted-foreground cursor-grab active:cursor-grabbing"
                      : "text-muted-foreground/90 hover:bg-muted/70 hover:text-foreground"
                }`}
                data-testid={`nav-rail-${item.id}`}
              >
                {isActive && !editMode && (
                  <>
                    {/* Big visible left bar that extends well past the rail edge */}
                    <span className="absolute -left-1 top-1 bottom-1 w-1.5 rounded-r-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
                    {/* Soft glow extending leftward for stronger visual cue */}
                    <span className="absolute -left-2 top-1/2 -translate-y-1/2 h-8 w-2 rounded-full bg-primary/40 blur-[6px]" />
                  </>
                )}
                {/* Drag handle visible on left when editing + expanded */}
                {editMode && expanded && (
                  <GripVertical className="h-4 w-4 flex-shrink-0 opacity-60" />
                )}

                {/* Icon — use category image for shopping categories, Lucide for app routes */}
                <span className="flex-shrink-0 flex items-center justify-center relative">
                  {emojis[item.id] ? (
                    <span className={expanded ? "text-[26px] leading-none" : "text-[32px] leading-none"}>
                      {emojis[item.id]}
                    </span>
                  ) : itemCat && getCategoryImage(itemCat) ? (
                    <img
                      src={getCategoryImage(itemCat)}
                      alt={getItemLabel(item)}
                      loading="lazy"
                      className={`object-cover rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 ${
                        expanded ? "h-9 w-9" : "h-12 w-12"
                      } ${isActive && !editMode ? "ring-2 ring-white/40" : ""}`}
                    />
                  ) : (
                    <Icon className="h-[30px] w-[30px]" strokeWidth={2} />
                  )}
                  {(item.id as string) === "cart" && cartCount > 0 && !editMode && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center leading-none">
                      {cartCount > 9 ? "9+" : cartCount}
                    </span>
                  )}
                </span>

                {/* Label — under icon when collapsed, inline when expanded */}
                {expanded ? (
                  <span className="text-[15px] font-semibold leading-tight whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-left">
                    {getItemLabel(item)}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold leading-tight text-center w-full whitespace-nowrap overflow-hidden text-ellipsis">
                    {getItemLabel(item)}
                  </span>
                )}

                {/* Remove (X) when editing */}
                {editMode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); remove(item.id); }}
                    className={`ml-auto h-5 w-5 rounded flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950 ${
                      expanded ? "" : "absolute top-0.5 right-0.5"
                    }`}
                    title={`${t("home.hide")} ${getItemLabel(item)}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </motion.button>
                </SortableNavSlot>
              );
            })}
          </SortableContext>
        </DndContext>

        {/* Restore hidden items */}
        {editMode && hiddenItems.length > 0 && (
          <div className="mt-1 pt-1 border-t border-dashed border-border/50 space-y-px">
            {expanded && (
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground text-center font-semibold px-1 py-0.5">{t("nav.hidden")}</p>
            )}
            {hiddenItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => restore(item.id)}
                  className={`w-full rounded-xl text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-all flex ${
                    expanded ? "items-center gap-2.5 px-2.5 py-2" : "flex-col items-center gap-0.5 px-1 py-2"
                  }`}
                  title={`${t("home.restore_all")} ${getItemLabel(item)}`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className={expanded ? "text-[12px] font-medium truncate" : "text-[9px] font-medium truncate w-full text-center"}>
                    {expanded ? `${t("home.restore_all")} ${getItemLabel(item)}` : getItemLabel(item)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="flex flex-col gap-1 px-2 pb-2 pt-1.5 border-t border-border/40 flex-shrink-0">
        <button
          onClick={() => setAppLauncherOpen(true)}
          className={`w-full rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all flex ${
            expanded ? "items-center gap-3 px-3 py-2.5" : "flex-col items-center gap-1 py-2"
          }`}
          title={t("nav.all_apps")}
          data-testid="nav-rail-apps"
        >
          <Grid3X3 className="h-5 w-5 flex-shrink-0" />
          <span className={expanded ? "text-[13px] font-semibold" : "text-[10px] font-semibold"}>{t("nav.apps")}</span>
        </button>
        {editMode && (
          <button
            onClick={reset}
            className={`w-full rounded-xl text-muted-foreground hover:bg-muted transition-all flex ${
              expanded ? "items-center gap-3 px-3 py-2.5" : "flex-col items-center gap-1 py-2"
            }`}
            title={t("nav.reset_menu")}
          >
            <RotateCcw className="h-5 w-5 flex-shrink-0" />
            <span className={expanded ? "text-[13px] font-semibold" : "text-[10px] font-semibold"}>{t("nav.reset")}</span>
          </button>
        )}
        <button
          onClick={() => setEditMode(v => !v)}
          className={`w-full rounded-xl transition-all duration-100 overflow-hidden flex ${
            expanded ? "items-center gap-3 px-3 py-2.5" : "flex-col items-center gap-1 py-2"
          } ${editMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          data-testid="nav-rail-edit"
          title={editMode ? t("nav.done") : t("nav.edit_menu_hint")}
        >
          {editMode ? <Check className="h-5 w-5 flex-shrink-0" /> : <Pencil className="h-5 w-5 flex-shrink-0" />}
          <span className={expanded ? "text-[13px] font-semibold whitespace-nowrap" : "text-[10px] font-semibold"}>
            {editMode ? t("nav.done") : t("nav.edit")}
          </span>
        </button>
      </div>
      <AppLauncher open={appLauncherOpen} onClose={() => setAppLauncherOpen(false)} />
    </aside>
  );
}
