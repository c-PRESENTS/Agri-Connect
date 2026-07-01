import { useState, useContext, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { 
  ShoppingCart, 
  User, 
  Menu,
  Leaf,
  ChevronLeft,
  ChevronRight,
  Sprout,
  MapPin,
  Truck,
  HeartHandshake,
  LogOut,
  Settings,
  Cpu,
  ShoppingBag,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "./theme-toggle";
import { RegionSwitcher } from "./region-switcher";
import { VoiceCommand } from "./voice-command";
import { SearchAutocomplete } from "./search-autocomplete";
import { LanguageSwitcher } from "./language-switcher";
import { SidebarContext } from "@/components/ui/sidebar";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TopNavigationProps {
  cartItemCount?: number;
  onSearch?: (query: string) => void;
  onHome?: () => void;
}

export function TopNavigation({ cartItemCount, onSearch, onHome }: TopNavigationProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollRef = useRef(0);
  const sidebarContext = useContext(SidebarContext);
  // Track the AppNavRail's expanded state so this button can mirror it.
  const [railExpanded, setRailExpanded] = useState<boolean>(() => {
    try { return localStorage.getItem("agri-nav-expanded") === "1"; } catch { return false; }
  });
  useEffect(() => {
    const onChange = (e: Event) => setRailExpanded(!!(e as CustomEvent).detail);
    window.addEventListener("agri-nav-expanded-changed", onChange as EventListener);
    return () => window.removeEventListener("agri-nav-expanded-changed", onChange as EventListener);
  }, []);
  const toggleSidebar = () => {
    // Always toggle the AppNavRail; if a shadcn sidebar context exists, toggle that too.
    window.dispatchEvent(new Event("agri-nav-toggle"));
    sidebarContext?.toggleSidebar?.();
  };
  const state = railExpanded ? "expanded" : (sidebarContext?.state || "collapsed");
  const hasSidebar = true;
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const cartCount = cartItemCount ?? itemCount;
  const { t } = useTranslation();

  useEffect(() => {
    const THRESHOLD = 8;
    const SCROLL_UP_HIDE = 80;
    let tick: number | undefined;

    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollRef.current;

      setScrolled(currentY > THRESHOLD);

      if (currentY > SCROLL_UP_HIDE && delta > 5) {
        setHidden(true);
      } else if (delta < -5 || currentY <= SCROLL_UP_HIDE) {
        setHidden(false);
      }

      lastScrollRef.current = currentY;
    };

    const throttled = () => {
      if (tick) cancelAnimationFrame(tick);
      tick = requestAnimationFrame(handleScroll);
    };

    const mainArea = document.querySelector(".overflow-auto");
    const onMainScroll = () => {
      const scrollTop = mainArea ? (mainArea as HTMLElement).scrollTop : 0;
      const delta = scrollTop - lastScrollRef.current;
      setScrolled(scrollTop > THRESHOLD);
      if (scrollTop > SCROLL_UP_HIDE && delta > 5) {
        setHidden(true);
      } else if (delta < -5 || scrollTop <= SCROLL_UP_HIDE) {
        setHidden(false);
      }
      lastScrollRef.current = scrollTop;
    };

    window.addEventListener("scroll", throttled, { passive: true });
    mainArea?.addEventListener("scroll", onMainScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", throttled);
      mainArea?.removeEventListener("scroll", onMainScroll);
      if (tick) cancelAnimationFrame(tick);
    };
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleHomeClick = () => {
    if (onHome) {
      onHome();
    } else {
      setLocation("/");
    }
  };

  const navLinks = [
    { path: "/farmers-help", icon: Sprout, label: t("nav.knowledge", "Knowledge Hub") },
    { path: "/agritech", icon: Cpu, label: t("nav.agritech", "AgriTech") },
    { path: "/map", icon: MapPin, label: t("nav.map", "Smart Map") },
    { path: "/land-leasing", icon: MapPin, label: t("nav.land", "Land") },
    { path: "/share-care", icon: HeartHandshake, label: t("nav.share", "Share") },
    { path: "/ship", icon: Truck, label: t("nav.ship", "Ship") },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        hidden ? "-translate-y-full -mb-12" : "translate-y-0"
      } ${
        scrolled
          ? "border-border/60 bg-background/90 backdrop-blur-2xl shadow-sm shadow-black/5 dark:bg-background/80 dark:border-white/[0.06] dark:shadow-[0_1px_0_rgba(255,255,255,0.03)]"
          : "border-border/40 bg-background/70 backdrop-blur-xl dark:bg-background/60 dark:border-white/[0.04]"
      }`}
    >
      {/* ── Row 1: main bar (all screen sizes) ── */}
      <div className="flex h-12 items-center gap-1.5 px-3">
        {hasSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 hover:bg-primary/10 transition-colors shrink-0"
            data-testid="button-toggle-sidebar"
          >
            {state === "expanded" ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Back / Forward — visible on all sizes */}
        <div className="flex items-center gap-0 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="h-7 w-7 hover:bg-primary/10 transition-colors"
            data-testid="button-nav-back"
            title="Go back"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.forward()}
            className="h-7 w-7 hover:bg-primary/10 transition-colors"
            data-testid="button-nav-forward"
            title="Go forward"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <motion.div
          onClick={handleHomeClick}
          className="flex items-center gap-1 cursor-pointer group shrink-0"
          data-testid="link-brand-home"
          whileTap={{ scale: 0.97 }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-green-700 shadow-sm shadow-primary/30 ring-1 ring-primary/20">
            <Leaf className="h-[18px] w-[18px] text-white" />
          </div>
          <span className="font-bold text-[13px] leading-tight tracking-tight hidden sm:inline">AgriConnect</span>
        </motion.div>

        <nav className="hidden md:flex items-center gap-0.5 ml-1">
          {navLinks.map((item) => (
            <motion.div key={item.path} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation(item.path)}
                className={`gap-1.5 h-7 px-2 text-[10px] font-bold uppercase tracking-tight transition-all ${
                  location === item.path
                    ? "text-primary bg-primary/8"
                    : "hover:text-primary hover:bg-primary/5"
                }`}
                data-testid={`nav-link-${item.label.toLowerCase()}`}
              >
                <item.icon className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">{item.label}</span>
              </Button>
            </motion.div>
          ))}
        </nav>

        <div className="flex-1 flex items-center justify-center px-1 sm:px-2">
          <SearchAutocomplete
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
          />
        </div>

        <div className="flex items-center gap-0 ml-auto shrink-0">
          <div className="hidden sm:flex items-center gap-0">
            <VoiceCommand onSearch={onSearch} />
            <LanguageSwitcher />
            <ThemeToggle />
            <RegionSwitcher />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 relative hover:bg-primary/5 transition-colors"
            onClick={() => setLocation("/cart")}
            data-testid="button-cart-nav"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center notification-pulse"
                data-testid="badge-cart-count"
              >
                {cartCount > 9 ? "9+" : cartCount}
              </motion.span>
            )}
          </Button>

          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 ml-1 gap-1.5 hover:bg-primary/5 transition-colors"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar || user.profileImageUrl || undefined} alt={user.name || user.email || "User"} />
                    <AvatarFallback className="text-[10px]">
                      {(user.name || user.firstName || user.email || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-tight max-w-[80px] truncate">
                    {user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 backdrop-blur-xl">
                <DropdownMenuItem onClick={() => setLocation("/dashboard")} data-testid="menu-item-dashboard">
                  <User className="mr-2 h-4 w-4" />
                  {t("nav.dashboard", "Dashboard")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/orders")} data-testid="menu-item-orders">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  {t("nav.orders", "My Orders")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/settings")} data-testid="menu-item-settings">
                  <Settings className="mr-2 h-4 w-4" />
                  {t("nav.settings", "Account Settings")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} data-testid="menu-item-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("nav.signout", "Sign Out")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant="default"
                size="sm"
                onClick={() => (window.location.href = "/api/login")}
                className="h-8 px-2.5 text-[10px] font-bold uppercase tracking-tight ml-1 bg-primary hover:bg-primary/90 shadow-sm btn-glow transition-all"
                data-testid="button-login-nav"
              >
                <User className="h-5 w-5 mr-1" />
                <span className="hidden sm:inline">{t("nav.login", "Login")}</span>
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Row 2: Mobile-only compact nav strip — tools collapsed into Sheet ── */}
      <div className="sm:hidden flex h-7 items-center border-t border-border/20 overflow-x-auto scrollbar-hide px-1 gap-0 bg-background/60">
        <Sheet>
          <SheetTrigger asChild>
            <button
              data-testid="button-mobile-more-tools"
              className="h-6 px-1.5 rounded text-[9px] font-bold uppercase tracking-tight text-muted-foreground hover:text-primary hover:bg-primary/5 shrink-0 flex items-center gap-1"
            >
              <MoreHorizontal className="h-3 w-3" />
              More
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[60vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle className="text-sm font-bold">Tools & preferences</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-3 pt-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Voice</span>
                <VoiceCommand onSearch={onSearch} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Language</span>
                <LanguageSwitcher />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Theme</span>
                <ThemeToggle />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Currency</span>
                <RegionSwitcher />
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <div className="w-px h-4 bg-border/40 mx-1 shrink-0" />
        {navLinks.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            size="sm"
            onClick={() => setLocation(item.path)}
            className={`h-6 px-1.5 text-[9px] font-bold uppercase tracking-tight shrink-0 gap-1 transition-all ${
              location === item.path
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-primary hover:bg-primary/5"
            }`}
          >
            <item.icon className="h-3 w-3" />
            {item.label}
          </Button>
        ))}
      </div>
    </header>
  );
}
