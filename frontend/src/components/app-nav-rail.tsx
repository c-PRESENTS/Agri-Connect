import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  Home,
  Store,
  ShoppingCart,
  Beef,
  Package,
  Boxes,
  Warehouse,
  FlaskConical,
  ShieldCheck,
  Heart,
  MapPin,
  MapPinned,
  Cpu,
  Truck,
  Building2,
  GraduationCap,
  UserCheck,
  LayoutDashboard,
  Network,
  Settings,
  Menu,
  ChevronLeft,
  Leaf,
  Salad,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface NavItem {
  id: string;
  label: string;
  path: string;
  category?: string;
  icon: typeof Home;
  badge?: "NEW" | "SOON";
  public?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "MAIN MARKETPLACE",
    items: [
      { id: "home", label: "Home", path: "/", icon: Home, public: true },
      { id: "cat-daily", label: "Daily Needs", path: "/?category=daily-needs", category: "daily-needs", icon: Store, public: true },
      { id: "cat-super", label: "Complete Supermarket", path: "/?category=supermarket", category: "supermarket", icon: ShoppingCart, badge: "NEW", public: true },
      { id: "cat-dietary", label: "Dietary Needs", path: "/?category=dietary", category: "dietary", icon: Salad, public: true },
      { id: "cat-livestock", label: "Livestock & Poultry", path: "/?category=livestock", category: "livestock", icon: Beef, public: true },
      { id: "cat-inputs", label: "Agri Inputs & Equipment", path: "/?category=inputs-tools", category: "inputs-tools", icon: Package, public: true },
      { id: "cat-fresh", label: "Bulk & Wholesale", path: "/?category=fresh-produce", category: "fresh-produce", icon: Boxes, public: true },
    ],
  },
  {
    title: "FARMER ECOSYSTEM",
    items: [
      { id: "cat-modern", label: "Modern Farming", path: "/?category=modern-farming", category: "modern-farming", icon: Warehouse, badge: "SOON", public: true },
      { id: "cat-bio", label: "Bio-Based Products", path: "/?category=bio-products", category: "bio-products", icon: FlaskConical, badge: "SOON", public: true },
      { id: "help", label: "Farmer Help Point", path: "/farmers-help", icon: ShieldCheck, public: true },
      { id: "share", label: "Share & Care Community", path: "/share-care", icon: Heart, badge: "SOON", public: true },
    ],
  },
  {
    title: "TECHNOLOGY & TOOLS",
    items: [
      { id: "map", label: "Smart Map", path: "/map", icon: MapPin, public: true },
      { id: "land", label: "Land Leasing", path: "/land-leasing", icon: MapPinned, public: true },
      { id: "agritech", label: "AgriTech & Innovations", path: "/agritech", icon: Cpu, badge: "SOON", public: true },
    ],
  },
  {
    title: "SERVICES & SUPPORT",
    items: [
      { id: "logistics", label: "Logistics & Delivery", path: "/logistics", icon: Truck, public: true },
      { id: "schemes", label: "Government Schemes", path: "/government-schemes", icon: Building2, public: true },
      { id: "student-help", label: "Student Help Point", path: "/farmers-help/student", icon: GraduationCap, badge: "SOON", public: true },
    ],
  },
  {
    title: "ACCOUNT & MANAGEMENT",
    items: [
      { id: "sell", label: "Seller Hub", path: "/dashboard/photo-sell", icon: UserCheck, public: true },
      { id: "dash", label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, public: true },
      { id: "sites", label: "My Sites", path: "/my-sites", icon: Network, public: true },
      { id: "settings", label: "Account Settings", path: "/settings", icon: Settings, public: true },
    ],
  },
];

const LS_EXPANDED = "agri-nav-expanded";

function readExpanded(): boolean {
  try {
    const saved = localStorage.getItem(LS_EXPANDED);
    return saved === null ? true : saved === "1";
  } catch {
    return true;
  }
}

export function AppNavRail() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const currentCategory = new URLSearchParams(search || "").get("category");
  const { isAuthenticated } = useAuth();
  const [expanded, setExpanded] = useState<boolean>(() => readExpanded());

  useEffect(() => {
    try {
      localStorage.setItem(LS_EXPANDED, expanded ? "1" : "0");
    } catch {}
    window.dispatchEvent(new CustomEvent("agri-nav-expanded-changed", { detail: expanded }));
  }, [expanded]);

  useEffect(() => {
    const onToggle = () => setExpanded((v) => !v);
    const onSet = (e: Event) => setExpanded(!!(e as CustomEvent).detail);
    window.addEventListener("agri-nav-toggle", onToggle);
    window.addEventListener("agri-nav-set", onSet as EventListener);
    return () => {
      window.removeEventListener("agri-nav-toggle", onToggle);
      window.removeEventListener("agri-nav-set", onSet as EventListener);
    };
  }, []);

  const handleItemClick = (item: NavItem) => {
    if (item.category) {
      setLocation(item.path);
      window.dispatchEvent(new CustomEvent("agri-subcategory-open", { detail: item.category }));
    } else if (item.id === "home") {
      window.dispatchEvent(new Event("agri-subcategory-close"));
      if (window.location.pathname !== "/" || window.location.search) {
        window.history.pushState({}, "", "/");
      }
      setLocation("/");
    } else {
      window.dispatchEvent(new Event("agri-subcategory-close"));
      setLocation(item.path);
    }
  };

  const W_EXPANDED = 270;
  const W_COLLAPSED = 68;

  return (
    <aside
      className="hidden lg:flex flex-col bg-white dark:bg-sidebar border-r border-slate-200 dark:border-border/40 shrink-0 select-none z-50 h-screen transition-[width] duration-200 ease-in-out overflow-hidden"
      style={{ width: expanded ? W_EXPANDED : W_COLLAPSED }}
      data-testid="app-nav-rail"
    >
      {/* ─── BRANDING HEADER CARD ─── */}
      <div className="p-3.5 border-b border-slate-100 dark:border-border/40 bg-white/80 dark:bg-card/40 backdrop-blur-xs">
        <div className="flex items-center justify-between gap-2.5">
          <Link
            href="/"
            onClick={() => {
              window.dispatchEvent(new Event("agri-subcategory-close"));
              if (window.location.pathname !== "/" || window.location.search) {
                window.history.pushState({}, "", "/");
              }
              setLocation("/");
            }}
            className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition-opacity"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white shrink-0 shadow-sm">
              <Leaf className="h-5 w-5 text-white stroke-[2.4]" />
            </div>
            {expanded && (
              <div className="min-w-0 flex-1">
                <h1 className="font-black text-[17px] leading-tight tracking-tight text-slate-900 dark:text-slate-100">
                  AgriConnect
                </h1>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                  Eat Smart. Live Healthy.
                </p>
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* ─── SCROLLABLE NAV SECTIONS ─── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-3.5 scrollbar-thin">
        {NAV_SECTIONS.map((section, sIdx) => {
          const sectionItems = section.items;
          if (sectionItems.length === 0) return null;

          return (
            <div
              key={section.title}
              className={sIdx > 0 ? "pt-2 border-t border-slate-100 dark:border-border/40" : ""}
            >
              {expanded ? (
                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2.5 pb-1.5">
                  {section.title}
                </div>
              ) : (
                <div className="w-5 h-0.5 bg-slate-200 dark:bg-border/60 mx-auto my-1.5 rounded-full" />
              )}
              <div className="space-y-0.5">
                {sectionItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.category
                    ? currentCategory === item.category
                    : item.id === "home"
                      ? location === "/" && !currentCategory
                      : location === item.path || location.startsWith(item.path + "/");

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      title={item.label}
                      className={`w-full flex items-center rounded-xl transition-all duration-150 ${
                        expanded ? "px-3 py-2 gap-3" : "justify-center p-2.5"
                      } ${
                        isActive
                          ? "bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 text-white font-black shadow-xs"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 font-semibold hover:text-slate-900 dark:hover:text-white"
                      }`}
                      data-testid={`nav-item-${item.id}`}
                    >
                      <Icon
                        className={`h-5 w-5 shrink-0 stroke-[1.8] ${
                          isActive ? "text-white" : "text-slate-700 dark:text-slate-300"
                        }`}
                      />
                      {expanded && (
                        <>
                          <span className="text-[13.5px] leading-tight truncate text-left flex-1 font-bold">
                            {item.label}
                          </span>
                          {item.badge === "NEW" && (
                            <span className="ml-auto shrink-0 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-2xs uppercase tracking-wide">
                              NEW
                            </span>
                          )}
                          {item.badge === "SOON" && (
                            <span className="ml-auto shrink-0 bg-emerald-800 text-emerald-100 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-2xs uppercase tracking-wide">
                              SOON
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── BOTTOM COLLAPSE MENU ─── */}
      <div className="p-2.5 border-t border-slate-100 dark:border-border/40 mt-auto bg-white/60 dark:bg-card/40">
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`w-full rounded-xl border border-slate-200 dark:border-border/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all flex items-center ${
            expanded
              ? "justify-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-200 font-bold text-xs"
              : "justify-center py-2 text-slate-600 dark:text-slate-300"
          }`}
          data-testid="nav-collapse-btn"
          title={expanded ? "Collapse Menu" : "Expand Menu"}
        >
          <ChevronLeft
            className={`h-4 w-4 transition-transform duration-200 ${!expanded ? "rotate-180" : ""}`}
          />
          {expanded && <span>Collapse Menu</span>}
        </button>
      </div>
    </aside>
  );
}
