import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Home, Map, Sprout, Cpu, Landmark, Truck, HeartHandshake,
  FileText, ShoppingCart, LayoutDashboard, Camera, Settings,
  ShoppingBasket, Wrench, Package, Award, Wheat, Store,
  Salad, Factory, Leaf, Briefcase, Sparkles, Grid3X3,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface AppItem {
  id: string;
  path: string;
  icon: typeof Home;
  label: string;
  fallbackLabel: string;
  color: string;
  public: boolean;
}

const ALL_APPS: AppItem[] = [
  { id: "home",          path: "/",                       icon: Home,            label: "nav.home",             fallbackLabel: "Home",             color: "from-green-500 to-emerald-600",    public: true },
  { id: "marketplace",   path: "/?category=daily-needs",  icon: ShoppingBasket,  label: "home.marketplace",      fallbackLabel: "Marketplace",      color: "from-blue-500 to-indigo-600",      public: true },
  { id: "smart-map",     path: "/map",                    icon: Map,             label: "home.smart_map",        fallbackLabel: "Smart Map",        color: "from-cyan-500 to-teal-600",        public: true },
  { id: "land",          path: "/land-leasing",            icon: Landmark,        label: "land.title",            fallbackLabel: "Land",             color: "from-amber-500 to-orange-600",     public: true },
  { id: "share",         path: "/share-care",              icon: HeartHandshake,  label: "share.title",           fallbackLabel: "Share",            color: "from-rose-500 to-pink-600",        public: true },
  { id: "ship",          path: "/ship",                    icon: Truck,           label: "ship.title",            fallbackLabel: "Ship",             color: "from-violet-500 to-purple-600",    public: true },
  { id: "agritech",      path: "/agritech",                icon: Cpu,             label: "home.agritech",         fallbackLabel: "AgriTech",         color: "from-sky-500 to-blue-600",        public: true },
  { id: "schemes",       path: "/government-schemes",      icon: FileText,        label: "home.govt_schemes",     fallbackLabel: "Govt Schemes",     color: "from-emerald-500 to-green-600",    public: true },
  { id: "learn",         path: "/farmers-help",            icon: Sprout,          label: "help.title",            fallbackLabel: "Help",             color: "from-lime-500 to-green-600",       public: true },
  { id: "modern-farming",path: "/?category=modern-farming",icon: Sparkles,        label: "category.modern",       fallbackLabel: "Modern",           color: "from-yellow-500 to-amber-600",     public: true },
  { id: "dietary",       path: "/?category=dietary",       icon: Salad,           label: "category.dietary",      fallbackLabel: "Dietary",          color: "from-red-500 to-rose-600",        public: true },
  { id: "supermarket",   path: "/?category=supermarket",   icon: Store,           label: "home.supermarket",      fallbackLabel: "Supermarket",      color: "from-orange-500 to-red-600",      public: true },
  { id: "commercial",    path: "/?category=commercial-crops", icon: Factory,      label: "category.commercial",   fallbackLabel: "Commercial",       color: "from-stone-500 to-neutral-600",   public: true },
  { id: "bio",           path: "/?category=bio-products",  icon: Leaf,            label: "category.bio",          fallbackLabel: "Bio",              color: "from-teal-500 to-emerald-600",    public: true },
  { id: "cart",          path: "/cart",                    icon: ShoppingCart,    label: "nav.cart",             fallbackLabel: "Cart",             color: "from-pink-500 to-rose-600",       public: true },
  { id: "dashboard",     path: "/dashboard",               icon: LayoutDashboard, label: "nav.dashboard",        fallbackLabel: "Dashboard",        color: "from-indigo-500 to-violet-600",   public: false },
  { id: "sell",          path: "/dashboard/photo-sell",     icon: Camera,          label: "home.sell_list",        fallbackLabel: "Sell / List",      color: "from-amber-500 to-yellow-600",    public: false },
  { id: "settings",      path: "/settings",                 icon: Settings,        label: "nav.settings",         fallbackLabel: "Settings",         color: "from-gray-500 to-slate-600",      public: false },
];

interface AppLauncherProps {
  open: boolean;
  onClose: () => void;
}

export function AppLauncher({ open, onClose }: AppLauncherProps) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const handleLaunch = useCallback((app: AppItem) => {
    if (app.path.startsWith("/?category=") || app.path === "/") {
      setLocation(app.path);
    } else {
      setLocation(app.path);
    }
    onClose();
  }, [setLocation, onClose]);

  const visible = ALL_APPS.filter(a => a.public || isAuthenticated);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[110] w-[90vw] max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border/60 bg-background/95 backdrop-blur-2xl shadow-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Grid3X3 className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold">{t("nav.all_apps")}</h2>
              </div>
              <button
                onClick={onClose}
                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              {visible.map((app) => {
                const Icon = app.icon;
                return (
                  <motion.button
                    key={app.id}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleLaunch(app)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 hover:bg-muted/80 border border-border/40 hover:border-primary/30 transition-all"
                  >
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center shadow-sm`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-center leading-tight">{t(app.label, { defaultValue: app.fallbackLabel })}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
