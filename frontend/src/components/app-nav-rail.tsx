import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  Home,
  Store,
  ShoppingBag,
  Beef,
  Wrench,
  Boxes,
  Sparkles,
  Leaf,
  Sprout,
  HeartHandshake,
  Cpu,
  LayoutGrid,
  Pencil,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  ChevronsLeft,
  ShieldCheck,
  Building2,
  GraduationCap,
  UserCheck,
  LayoutDashboard,
  Network,
  Settings,
  Package,
  ShoppingCart,
  Warehouse,
  FlaskConical,
  Heart,
  MapPin,
  MapPinned,
  Truck,
  Salad,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AppLauncher } from "@/components/app-launcher";

interface NavItem {
  id: string;
  label: string;
  shortLabel?: string;
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

// Clean, neat, and highly visible Collapsed Rail items
const COLLAPSED_RAIL_ITEMS: NavItem[] = [
  { id: "home", label: "Home", shortLabel: "Home", path: "/", icon: Home, public: true },
  { id: "cat-daily", label: "Daily Needs", shortLabel: "Daily", path: "/?category=daily-needs", category: "daily-needs", icon: ShoppingBag, public: true },
  { id: "cat-super", label: "Complete Supermarket", shortLabel: "Super", path: "/?category=supermarket", category: "supermarket", icon: Store, badge: "NEW", public: true },
  { id: "cat-dietary", label: "Dietary Needs", shortLabel: "Diet", path: "/?category=dietary", category: "dietary", icon: Salad, badge: "SOON", public: true },
  { id: "cat-livestock", label: "Livestock & Poultry", shortLabel: "Livestock", path: "/?category=livestock", category: "livestock", icon: Beef, public: true },
  { id: "cat-inputs", label: "Agri Inputs & Tools", shortLabel: "Inputs", path: "/?category=inputs-tools", category: "inputs-tools", icon: Wrench, public: true },
  { id: "cat-fresh", label: "Bulk & Wholesale", shortLabel: "Bulk", path: "/?category=fresh-produce", category: "fresh-produce", icon: Boxes, public: true },
  { id: "cat-modern", label: "Modern Farming", shortLabel: "Farming", path: "/?category=modern-farming", category: "modern-farming", icon: Sparkles, badge: "SOON", public: true },
  { id: "cat-bio", label: "Bio-Based Products", shortLabel: "Bio", path: "/?category=bio-products", category: "bio-products", icon: Leaf, badge: "SOON", public: true },
  { id: "help", label: "Farmer Help Point", shortLabel: "Help", path: "/farmers-help", icon: Sprout, public: true },
  { id: "student-help", label: "Student Help Point", shortLabel: "Student", path: "/farmers-help/student", icon: GraduationCap, badge: "SOON", public: true },
  { id: "share", label: "Share & Care", shortLabel: "Share", path: "/share-care", icon: HeartHandshake, badge: "SOON", public: true },
  { id: "agritech", label: "AgriTech & Innovations", shortLabel: "AgriTech", path: "/agritech", icon: Cpu, badge: "SOON", public: true },
  { id: "map", label: "Smart Map", shortLabel: "Map", path: "/map", icon: MapPin, public: true },
  { id: "land", label: "Land Leasing", shortLabel: "Land", path: "/land-leasing", icon: MapPinned, public: true },
  { id: "logistics", label: "Logistics & Delivery", shortLabel: "Ship", path: "/logistics", icon: Truck, public: true },
  { id: "schemes", label: "Government Schemes", shortLabel: "Schemes", path: "/government-schemes", icon: Building2, public: true },
  { id: "sell", label: "Seller Hub", shortLabel: "Seller", path: "/dashboard/photo-sell", icon: UserCheck, public: true },
  { id: "sites", label: "My Sites", shortLabel: "Sites", path: "/my-sites", icon: Network, public: true },
  { id: "orders", label: "My Orders", shortLabel: "Orders", path: "/orders", icon: Package, public: true },
  { id: "support", label: "Customer Support", shortLabel: "Support", path: "/support", icon: ShieldCheck, public: true },
];

const NAV_SECTIONS: NavSection[] = [
  {
    title: "MAIN MARKETPLACE",
    items: [
      { id: "home", label: "Home", path: "/", icon: Home, public: true },
      { id: "cat-daily", label: "Daily Needs", path: "/?category=daily-needs", category: "daily-needs", icon: ShoppingBag, public: true },
      { id: "cat-super", label: "Complete Supermarket", path: "/?category=supermarket", category: "supermarket", icon: Store, badge: "NEW", public: true },
      { id: "cat-dietary", label: "Dietary Needs", path: "/?category=dietary", category: "dietary", icon: Salad, badge: "SOON", public: true },
      { id: "cat-livestock", label: "Livestock & Poultry", path: "/?category=livestock", category: "livestock", icon: Beef, public: true },
      { id: "cat-inputs", label: "Agri Inputs & Equipment", path: "/?category=inputs-tools", category: "inputs-tools", icon: Wrench, public: true },
      { id: "cat-fresh", label: "Bulk & Wholesale", path: "/?category=fresh-produce", category: "fresh-produce", icon: Boxes, public: true },
    ],
  },
  {
    title: "FARMER ECOSYSTEM",
    items: [
      { id: "cat-modern", label: "Modern Farming", path: "/?category=modern-farming", category: "modern-farming", icon: Sparkles, badge: "SOON", public: true },
      { id: "cat-bio", label: "Bio-Based Products", path: "/?category=bio-products", category: "bio-products", icon: Leaf, badge: "SOON", public: true },
      { id: "help", label: "Farmer Help Point", path: "/farmers-help", icon: Sprout, public: true },
      { id: "student-help", label: "Student Help Point", path: "/farmers-help/student", icon: GraduationCap, badge: "SOON", public: true },
      { id: "share", label: "Share & Care Community", path: "/share-care", icon: HeartHandshake, badge: "SOON", public: true },
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
      { id: "support", label: "Customer Support", path: "/support", icon: ShieldCheck, public: true },
    ],
  },
  {
    title: "ACCOUNT & MANAGEMENT",
    items: [
      { id: "sell", label: "Seller Hub", path: "/dashboard/photo-sell", icon: UserCheck, public: true },
      { id: "dash", label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, public: true },
      { id: "sites", label: "My Sites", path: "/my-sites", icon: Network, public: true },
      { id: "orders", label: "My Orders", path: "/orders", icon: Package, public: true },
      { id: "settings", label: "Account Settings", path: "/settings", icon: Settings, public: true },
    ],
  },
];

const LS_EXPANDED = "agri-nav-expanded";

function readExpanded(): boolean {
  try {
    const saved = localStorage.getItem(LS_EXPANDED);
    return saved === null ? false : saved === "1";
  } catch {
    return false;
  }
}

export function AppNavRail() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const currentCategory = new URLSearchParams(search || "").get("category");
  const { isAuthenticated } = useAuth();
  const [expanded, setExpanded] = useState<boolean>(() => readExpanded());
  const [launcherOpen, setLauncherOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(LS_EXPANDED, expanded ? "1" : "0");
    } catch {}
    window.dispatchEvent(new CustomEvent("agri-nav-expanded-changed", { detail: expanded }));
  }, [expanded]);

  useEffect(() => {
    const onToggle = () => setExpanded((v) => !v);
    const onSet = (e: Event) => setExpanded(!!(e as CustomEvent).detail);
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setExpanded((v) => !v);
      }
    };
    window.addEventListener("agri-nav-toggle", onToggle);
    window.addEventListener("agri-nav-set", onSet as EventListener);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("agri-nav-toggle", onToggle);
      window.removeEventListener("agri-nav-set", onSet as EventListener);
      window.removeEventListener("keydown", onKeyDown);
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

  const W_EXPANDED = 280;
  const W_COLLAPSED = 84;

  return (
    <>
      <aside
        className="hidden lg:flex flex-col bg-slate-50/95 dark:bg-sidebar border-r border-slate-200/90 dark:border-border/60 shrink-0 select-none z-40 h-screen h-[100dvh] transition-all duration-200 ease-in-out overflow-hidden shadow-xs"
        style={{ width: expanded ? W_EXPANDED : W_COLLAPSED }}
        data-testid="app-nav-rail"
      >
        {expanded ? (
          <>
            {/* Brand Header */}
            <div className="p-3.5 border-b border-slate-200/80 dark:border-border/40 bg-white/80 dark:bg-card/40 backdrop-blur-xs shrink-0">
              <div className="flex items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setExpanded(false);
                    window.dispatchEvent(new Event("agri-subcategory-close"));
                  }}
                  className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition-all text-left cursor-pointer group rounded-xl p-1 -m-1 hover:bg-slate-100/80 dark:hover:bg-card/60"
                  title="Collapse sidebar (Ctrl+B)"
                  aria-label="Collapse sidebar"
                  data-testid="button-nav-rail-collapse"
                >
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <Leaf className="h-5 w-5 text-white stroke-[2.4]" />
                  </div>
                  <div className="min-w-0 flex-1 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <h1 className="font-black text-[17px] leading-tight tracking-tight text-slate-900 dark:text-slate-100">
                        AgriConnect
                      </h1>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                        Eat Smart. Live Healthy.
                      </p>
                    </div>
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:bg-slate-200/60 dark:group-hover:bg-border/40 transition-colors shrink-0 ml-1" title="Collapse sidebar">
                      <ChevronsLeft className="h-4.5 w-4.5 stroke-[2.5]" />
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Scrollable Nav Sections */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-3.5 scrollbar-thin">
              {NAV_SECTIONS.map((section, sIdx) => {
                const sectionItems = section.items;
                if (sectionItems.length === 0) return null;

                return (
                  <div
                    key={section.title}
                    className={sIdx > 0 ? "pt-2 border-t border-slate-200/80 dark:border-border/40" : ""}
                  >
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2.5 pb-1.5">
                      {section.title}
                    </div>
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
                            className={`w-full flex items-center px-3 py-2.5 gap-3 rounded-xl transition-all duration-150 cursor-pointer ${
                              isActive
                                ? "bg-emerald-600 text-white font-black shadow-xs"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 font-semibold hover:text-slate-900 dark:hover:text-white"
                          }`}
                            data-testid={`nav-item-${item.id}`}
                          >
                            <Icon
                              className={`h-5 w-5 shrink-0 stroke-[2] ${
                                isActive ? "text-white" : "text-emerald-700 dark:text-emerald-400"
                              }`}
                            />
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
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Apps Launcher trigger in expanded menu */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-border/40">
                <button
                  onClick={() => setLauncherOpen(true)}
                  className="w-full flex items-center px-3 py-2.5 gap-3 rounded-xl transition-all duration-150 cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 font-semibold hover:text-slate-900 dark:hover:text-white"
                >
                  <LayoutGrid className="h-5 w-5 shrink-0 text-primary stroke-[2]" />
                  <span className="text-[13.5px] leading-tight font-bold">All Apps & Launcher</span>
                </button>
              </div>
            </div>

            {/* Bottom Collapse Button */}
            <div className="p-2.5 border-t border-slate-200/80 dark:border-border/40 mt-auto bg-white/60 dark:bg-card/40 shrink-0">
              <button
                onClick={() => {
                  setExpanded(false);
                  window.dispatchEvent(new Event("agri-subcategory-close"));
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-border/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all flex items-center justify-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer"
                data-testid="nav-collapse-btn"
                title="Collapse sidebar (Ctrl+B)"
              >
                <ChevronsLeft className="h-4 w-4" />
                <span>Hide Menu</span>
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Top Expand Button (>>) */}
            <div className="h-14 flex items-center justify-center border-b border-slate-200/80 dark:border-border/40 bg-white/80 dark:bg-card/40 shrink-0">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="h-9.5 w-9.5 rounded-xl border border-slate-200 dark:border-border/60 bg-white dark:bg-card hover:bg-slate-100 dark:hover:bg-muted text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="Expand Sidebar (Ctrl+B)"
                aria-label="Expand Sidebar"
                data-testid="button-expand-rail"
              >
                <ChevronsRight className="h-5 w-5 text-slate-600 dark:text-slate-300 stroke-[2.4]" />
              </button>
            </div>

            {/* Single Unified Scrollable Container containing All Categories, Ecosystem Tools, Apps, and Edit */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-2.5 px-1.5 flex flex-col items-center gap-1.5 scrollbar-thin">
              {COLLAPSED_RAIL_ITEMS.map((item) => {
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
                    className={`w-full py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer select-none group ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-sm font-black"
                        : "text-emerald-700 dark:text-emerald-400 hover:bg-slate-200/70 dark:hover:bg-muted/60 font-bold"
                    }`}
                    data-testid={`rail-item-${item.id}`}
                  >
                    <Icon
                      className={`h-6 w-6 shrink-0 stroke-[2] mb-1 ${
                        isActive ? "text-white" : "text-emerald-700 dark:text-emerald-400 group-hover:scale-110 transition-transform"
                      }`}
                    />
                    <span
                      className={`text-[11px] leading-tight font-black truncate max-w-[76px] text-center tracking-tight ${
                        isActive ? "text-white" : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {item.shortLabel || item.label}
                    </span>
                  </button>
                );
              })}

              {/* Clean separator before bottom controls */}
              <div className="w-10 h-px bg-slate-200 dark:bg-border/60 my-1 shrink-0" />

              {/* Apps (Integrated inside the sidebar) */}
              <button
                type="button"
                onClick={() => setLauncherOpen(true)}
                className={`w-full py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer group select-none ${
                  launcherOpen
                    ? "bg-emerald-600 text-white shadow-sm font-black"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-muted/60 font-bold"
                }`}
                title="All Apps & Features"
                data-testid="rail-button-apps"
              >
                <LayoutGrid className={`h-6 w-6 stroke-[2] mb-1 ${
                  launcherOpen ? "text-white" : "group-hover:scale-110 transition-transform"
                }`} />
                <span className={`text-[11px] font-black leading-tight tracking-tight ${
                  launcherOpen ? "text-white" : ""
                }`}>Apps</span>
              </button>

              {/* Edit (Integrated inside the sidebar) */}
              <button
                type="button"
                onClick={() => setLocation("/settings")}
                className="w-full py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-muted/60 font-bold transition-all cursor-pointer group select-none"
                title="Edit Preferences & Settings"
                data-testid="rail-button-edit"
              >
                <Pencil className="h-6 w-6 stroke-[2] mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black leading-tight tracking-tight">Edit</span>
              </button>
            </div>
          </>
        )}
      </aside>

      {/* App Launcher Modal (Fully functional for the Apps button) */}
      <AppLauncher
        open={launcherOpen}
        onClose={() => setLauncherOpen(false)}
        railWidth={expanded ? W_EXPANDED : W_COLLAPSED}
      />
    </>
  );
}