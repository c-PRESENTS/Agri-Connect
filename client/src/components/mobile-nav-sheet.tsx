import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Home, Map, Sprout, Cpu, Landmark, Truck, HeartHandshake,
  FileText, ShoppingCart, LayoutDashboard, Camera, Settings,
  ShoppingBasket, Wrench, Package, Award, Wheat, Store,
  Salad, Factory, Leaf, Briefcase, Sparkles, X, ChevronDown, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { categories } from "@/lib/categories";
import { getProductImage } from "@/lib/product-images";
import { getSubSubcategories } from "@/lib/sub-subcategories";
import { useTranslation } from "react-i18next";

type RailItem = {
  id: string;
  path: string;
  icon: typeof Home;
  label: string;
  public: boolean;
  /** if set, tapping opens the inline subcategory column for this category id */
  category?: string;
};

const ITEMS: RailItem[] = [
  { id: "home",          path: "/",                          icon: Home,            label: "Home",       public: true },
  { id: "cat-daily",     path: "/?category=daily-needs",     icon: ShoppingBasket,  label: "Daily",      public: true, category: "daily-needs"      },
  { id: "cat-inputs",    path: "/?category=inputs-tools",    icon: Wrench,          label: "Inputs",     public: true, category: "inputs-tools"     },
  { id: "cat-processed", path: "/?category=processed",       icon: Package,         label: "Process",    public: true, category: "processed"        },
  { id: "cat-specialty", path: "/?category=specialty",       icon: Award,           label: "Special",    public: true, category: "specialty"        },
  { id: "cat-other",     path: "/?category=other-agri",      icon: Wheat,           label: "Other",      public: true, category: "other-agri"       },
  { id: "cat-super",     path: "/?category=supermarket",     icon: Store,           label: "Market",     public: true, category: "supermarket"      },
  { id: "cat-dietary",   path: "/?category=dietary",         icon: Salad,           label: "Dietary",    public: true, category: "dietary"          },
  { id: "cat-modern",    path: "/?category=modern-farming",  icon: Sparkles,        label: "Modern",     public: true, category: "modern-farming"   },
  { id: "cat-services",  path: "/?category=services",        icon: Briefcase,       label: "Service",    public: true, category: "services"         },
  { id: "cat-commerc",   path: "/?category=commercial-crops",icon: Factory,         label: "Commerc",    public: true, category: "commercial-crops" },
  { id: "cat-bio",       path: "/?category=bio-products",    icon: Leaf,            label: "Bio",        public: true, category: "bio-products"     },
  { id: "help",          path: "/farmers-help",         icon: Sprout,          label: "Learn",     public: true  },
  { id: "agritech",      path: "/agritech",             icon: Cpu,             label: "AgriTech",  public: true  },
  { id: "map",           path: "/map",                  icon: Map,             label: "Map",       public: true  },
  { id: "land",          path: "/land-leasing",         icon: Landmark,        label: "Land",      public: true  },
  { id: "share",         path: "/share-care",           icon: HeartHandshake,  label: "Share",     public: true  },
  { id: "ship",          path: "/logistics",            icon: Truck,           label: "Ship",      public: true  },
  { id: "schemes",       path: "/government-schemes",   icon: FileText,        label: "Schemes",   public: true  },
  { id: "cart",          path: "/cart",                 icon: ShoppingCart,    label: "Cart",      public: true  },
  { id: "dash",          path: "/dashboard",            icon: LayoutDashboard, label: "Dash",      public: false },
  { id: "sell",          path: "/dashboard/photo-sell", icon: Camera,          label: "Sell",      public: false },
  { id: "settings",      path: "/settings",             icon: Settings,        label: "More",      public: false },
];

function shortLabel(name: string) {
  return name
    .replace(/\(.*?\)/g, "")
    .split(/[&,]/)[0]
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(" ");
}

export function MobileNavSheet() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);

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
    "map": "nav.map",
    "land": "nav.land",
    "share": "nav.share",
    "ship": "nav.ship",
    "cart": "nav.cart",
    "dash": "nav.dashboard",
    "settings": "nav.more",
  };
  const getItemLabel = (item: RailItem) => {
    const key = LABEL_KEYS[item.id];
    return key ? t(key) : item.label;
  };

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);
    window.addEventListener("agri-mobile-nav-open", onOpen);
    window.addEventListener("agri-mobile-nav-close", onClose);
    return () => {
      window.removeEventListener("agri-mobile-nav-open", onOpen);
      window.removeEventListener("agri-mobile-nav-close", onClose);
    };
  }, []);

  // Keep the docked drawer open as the user navigates — the rail stays
  // fixed on the left while the right side switches pages (Home, Map, etc.).
  // Just collapse any open 3rd-level expansion for a clean state.
  useEffect(() => {
    setExpandedSub(null);
    window.dispatchEvent(new Event("agri-subcategory-close"));
  }, [location]);

  useEffect(() => {
    if (!open) {
      setActiveCat(null);
      setExpandedSub(null);
    }
  }, [open]);

  const visible = ITEMS.filter(i => i.public || isAuthenticated);
  const activeCategory = activeCat ? categories.find(c => c.id === activeCat) : null;

  const handleItemTap = (item: RailItem) => {
    // Special case: Home — fully reset every panel/state in the app and
    // jump straight to a clean homepage with no leftover category, search
    // or subcategory selections.
    if (item.id === "home" || item.path === "/") {
      setActiveCat(null);
      setExpandedSub(null);
      setOpen(false);
      document.documentElement.style.setProperty("--mobile-nav-w", "0px");
      // Tell the home page (and any sibling listeners) to wipe their state.
      window.dispatchEvent(new Event("agri-subcategory-close"));
      setLocation("/");
      return;
    }

    if (item.category) {
      setActiveCat(item.category);
      setExpandedSub(null);
    } else {
      // Non-category items (Map, Land, Share, Learn, AgriTech…) —
      // fully reset the drawer state and navigate immediately.
      setActiveCat(null);
      setExpandedSub(null);
      setOpen(false);
      document.documentElement.style.setProperty("--mobile-nav-w", "0px");
      setLocation(item.path);
    }
  };

  const handleSubcategoryTap = (subId: string) => {
    if (!activeCat) return;
    const deep = getSubSubcategories(subId);
    if (deep.length > 0) {
      // Has 3rd-level → toggle inline expansion in column 2 AND load
      // products on the right alongside the drawer.
      setExpandedSub(expandedSub === subId ? null : subId);
      setLocation(`/?category=${activeCat}&subcategory=${subId}`);
    } else {
      // Keep drawer open — products load alongside on the right.
      setLocation(`/?category=${activeCat}&subcategory=${subId}`);
    }
  };

  const handleLeafTap = (subId: string, leafName?: string) => {
    if (!activeCat) return;
    // Keep drawer open — products load alongside on the right.
    const qs = new URLSearchParams({ category: activeCat, subcategory: subId });
    setLocation(`/?${qs.toString()}`);
    // If a specific leaf (e.g. "White Rice") was tapped, scroll the
    // right-side product list to that product card.
    if (leafName) {
      const target = leafName.toLowerCase();
      const tryScroll = (attempts = 0) => {
        const el = document.querySelector(
          `[data-product-tile][data-product-name="${target.replace(/"/g, '\\"')}"]`
        ) as HTMLElement | null;
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          el.classList.add("ring-2", "ring-primary", "ring-offset-2");
          setTimeout(() => el.classList.remove("ring-2", "ring-primary", "ring-offset-2"), 1500);
        } else if (attempts < 8) {
          setTimeout(() => tryScroll(attempts + 1), 120);
        }
      };
      setTimeout(tryScroll, 80);
    }
  };

  const handleSeeAll = () => {
    if (!activeCat) return;
    // Keep drawer open — products load alongside on the right.
    setLocation(`/?category=${activeCat}`);
  };

  // Column 2 uses a horizontal thumbnail + full-text-label layout (matches
  // the desktop subcategory panel). Compact 76px wide so the right side of
  // the page stays visible & interactive.
  const col2Width = activeCategory ? 76 : 0;
  const col1Width = 64;
  const totalWidth = col1Width + col2Width;

  // Push the page content right by the drawer width so products are not
  // hidden under the drawer on mobile.
  useEffect(() => {
    const w = open ? `${totalWidth}px` : "0px";
    document.documentElement.style.setProperty("--mobile-nav-w", w);
    return () => {
      document.documentElement.style.setProperty("--mobile-nav-w", "0px");
    };
  }, [open, totalWidth]);

  if (!open) return null;

  return (
    <aside
      className="lg:hidden fixed inset-y-0 left-0 z-[60] flex flex-row bg-background border-r border-border shadow-2xl"
      style={{ width: totalWidth, transition: "width 200ms ease-out" }}
      data-testid="mobile-nav-sheet"
    >
        {/* ── Column 1: 64px icon rail ── */}
        <div className="w-[64px] shrink-0 flex flex-col bg-sidebar/95 border-r border-border/40">
          <div className="px-1 py-1.5 border-b border-border/40 flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary pl-1">{t("nav.browse")}</span>
            <button
              onClick={() => setOpen(false)}
              data-testid="mobile-nav-close"
              className="h-5 w-5 rounded flex items-center justify-center hover:bg-destructive/10 hover:text-destructive active:scale-95"
              title={t("nav.close")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-1.5 px-1 flex flex-col gap-0.5">
            {visible.map((item) => {
              const Icon = item.icon;
              const isActive =
                (item.category && activeCat === item.category) ||
                (!item.category && (item.path === "/" ? location === "/" : location.startsWith(item.path.split("?")[0])));
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemTap(item)}
                  data-testid={`mobile-nav-item-${item.id}`}
                  title={getItemLabel(item)}
                  className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-0.5 rounded-lg transition-all active:scale-[0.94] ${
                    isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[8px] font-bold uppercase tracking-tight leading-[1.05] w-full text-center break-words line-clamp-2">
                    {getItemLabel(item)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Column 2: horizontal thumbnail + full text label,
            inline 3rd-level expansion under any tapped sub. ── */}
        {activeCategory && (
          <div className="shrink-0 flex flex-col bg-background" style={{ width: col2Width }}>
            <div className="flex items-center gap-1 px-1.5 py-1.5 border-b border-border/40 bg-primary/8">
              <h3 className="flex-1 min-w-0 text-[10px] font-black uppercase tracking-widest text-primary truncate">
                {activeCategory.name}
              </h3>
              <button
                onClick={() => { setActiveCat(null); setExpandedSub(null); }}
                data-testid="mobile-nav-col2-close"
                className="h-5 w-5 rounded flex items-center justify-center hover:bg-destructive/10 hover:text-destructive active:scale-95"
                title={t("nav.close")}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-1 px-1 flex flex-col gap-0.5">
              <button
                onClick={handleSeeAll}
                data-testid="mobile-nav-subcat-see-all"
                className="flex items-center gap-1.5 py-1.5 px-1.5 rounded-lg bg-primary/15 text-primary active:scale-[0.98] transition-all"
              >
                <Sparkles className="h-4 w-4 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-wider truncate">{t("nav.see_all")}</span>
              </button>
              {activeCategory.subcategories.map((sub) => {
                const deep = getSubSubcategories(sub.id);
                const hasDeep = deep.length > 0;
                const isExpanded = expandedSub === sub.id;
                return (
                  <div key={sub.id} className="flex flex-col">
                    <button
                      onClick={() => handleSubcategoryTap(sub.id)}
                      data-testid={`mobile-nav-subcat-${sub.id}`}
                      title={sub.name}
                      className={`relative flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg transition-all active:scale-[0.98] ${
                        isExpanded ? "bg-primary/15 text-primary" : "text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <img
                        src={getProductImage(sub.name, activeCategory.id, "sm")}
                        alt=""
                        loading="lazy"
                        className="h-7 w-7 rounded-md object-cover border border-border/40 shrink-0"
                      />
                      <span className="text-[8px] font-bold uppercase tracking-tight leading-[1.05] w-full text-center break-words line-clamp-2">
                        {sub.name}
                      </span>
                      {hasDeep && (
                        <span className="absolute top-1 right-0.5 opacity-60">
                          {isExpanded
                            ? <ChevronDown className="h-2.5 w-2.5" />
                            : <ChevronRight className="h-2.5 w-2.5" />}
                        </span>
                      )}
                    </button>

                    {/* Inline 3rd-level rendered in same column (greyed
                        sub-rows, indented under their parent — like the
                        desktop reference). */}
                    {isExpanded && hasDeep && (
                      <div className="mt-0.5 mb-1 ml-1 pl-1 border-l border-primary/30 flex flex-col gap-0">
                        <button
                          onClick={() => handleLeafTap(sub.id)}
                          className="text-[7px] font-black uppercase tracking-wider text-primary py-0.5 px-0.5 rounded hover:bg-primary/10 text-left"
                          data-testid={`mobile-nav-leaf-all-${sub.id}`}
                        >
                          {t("nav.see_all")}
                        </button>
                        {deep.map((section, si) => (
                          <div key={si} className="flex flex-col">
                            <div className="text-[6px] font-black uppercase tracking-wider text-muted-foreground/60 px-0.5 pt-0.5 truncate">
                              {section.title}
                            </div>
                            {section.items.slice(0, 8).map((item) => (
                              <button
                                key={item}
                                onClick={() => handleLeafTap(sub.id, item)}
                                className="text-[7px] font-semibold py-0.5 px-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground text-left truncate"
                                title={item}
                                data-testid={`mobile-nav-leaf-${sub.id}-${item.toLowerCase().replace(/\s+/g, '-')}`}
                              >
                                {item}
                              </button>
                            ))}
                            {/* "more →" indicator: tells the user there are
                                additional varieties they can browse on the
                                right-side product list. */}
                            <button
                              onClick={() => handleLeafTap(sub.id)}
                              className="text-[7px] font-bold italic text-primary/80 hover:text-primary py-0.5 px-0.5 rounded hover:bg-primary/10 text-left flex items-center gap-0.5"
                              data-testid={`mobile-nav-leaf-more-${sub.id}-${si}`}
                              title={section.items.length > 8 ? `+${section.items.length - 8} more — scroll the product list to see them all` : "Scroll the product list to see more"}
                            >
                              {section.items.length > 8 ? `+${section.items.length - 8} more →` : "more →"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
    </aside>
  );
}
