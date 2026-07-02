import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Home, LayoutGrid, Map, ShoppingCart, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Cart } from "@shared/schema";

interface MobileBottomNavProps {
  onCategories?: () => void;
}

export function MobileBottomNav({ onCategories }: MobileBottomNavProps) {
  const [location, setLocation] = useLocation();

  const { data: cart } = useQuery<Cart>({ queryKey: ["/api/cart"] });
  const cartCount = cart?.items?.reduce((acc, i) => acc + i.quantity, 0) ?? 0;

  const items: Array<{
    id: string;
    label: string;
    icon: typeof Home;
    path: string;
    badge?: number;
  }> = [
    { id: "home",       label: "Home",       icon: Home,        path: "/" },
    { id: "categories", label: "Browse",     icon: LayoutGrid,  path: "/?category=daily-needs" },
    { id: "map",        label: "Map",        icon: Map,         path: "/map" },
    { id: "cart",       label: "Cart",       icon: ShoppingCart, path: "/cart", badge: cartCount },
    { id: "profile",    label: "Profile",    icon: User,        path: "/login" },
  ];

  const handleTap = (item: typeof items[number]) => {
    if (item.id === "categories" && onCategories) {
      onCategories();
      return;
    }
    // Any tab tap (especially Home) should close the BROWSE drawer and
    // wipe leftover category/subcategory selections so the destination
    // page renders cleanly.
    window.dispatchEvent(new Event("agri-mobile-nav-close"));
    document.documentElement.style.setProperty("--mobile-nav-w", "0px");
    if (item.id === "home" || item.path === "/") {
      window.dispatchEvent(new Event("agri-subcategory-close"));
    }
    if (item.path) {
      setLocation(item.path);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[9999] md:hidden bg-background/95 backdrop-blur-xl border-t border-border/60 flex items-center justify-around safe-area-pb"
      style={{ height: 64, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      data-testid="mobile-bottom-nav-global"
    >
      {items.map(({ id, label, icon: Icon, path, ...rest }) => {
        const badge = (rest as any).badge as number | undefined;
        const isActive = path ? (path === "/" ? location === "/" : location.startsWith(path)) : false;

        return (
          <motion.button
            key={id}
            whileTap={{ scale: 0.88 }}
            onClick={() => handleTap({ id, label, icon: Icon, path, badge })}
            data-testid={`mobile-nav-global-${id}`}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative py-1 ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <div className="relative">
              <Icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
              {badge != null && badge > 0 && (
                <span className="absolute -top-1.5 -right-2 h-4 min-w-4 px-0.5 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </div>
            <span className={`text-[9px] font-semibold tracking-tight leading-none ${isActive ? "text-primary" : ""}`}>
              {label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}
