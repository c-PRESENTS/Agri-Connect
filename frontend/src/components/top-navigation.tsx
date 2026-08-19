import { useState, useContext, useEffect } from "react";
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
  Heart,
  LocateFixed,
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLiveLocation } from "@/contexts/live-location-context";

interface TopNavigationProps {
  cartItemCount?: number;
  searchValue?: string;
  onSearch?: (query: string) => void;
  onHome?: () => void;
  onBack?: () => void;
}

export function TopNavigation({ cartItemCount, searchValue, onSearch, onHome, onBack }: TopNavigationProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useLocation();
  const [scrolled, setScrolled] = useState(false);
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
  const { location: liveLocation, status: liveLocationStatus, refresh: refreshLiveLocation } = useLiveLocation();

  useEffect(() => {
    if (searchValue !== undefined) setSearchQuery(searchValue);
  }, [searchValue]);

  useEffect(() => {
    const THRESHOLD = 8;
    let tick: number | undefined;

    const handleScroll = () => {
      const mainArea = document.querySelector(".overflow-y-auto") as HTMLElement | null;
      setScrolled(Math.max(window.scrollY, mainArea?.scrollTop ?? 0) > THRESHOLD);
    };

    const throttled = () => {
      if (tick) cancelAnimationFrame(tick);
      tick = requestAnimationFrame(handleScroll);
    };

    const mainArea = document.querySelector(".overflow-y-auto");

    window.addEventListener("scroll", throttled, { passive: true });
    mainArea?.addEventListener("scroll", throttled, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", throttled);
      mainArea?.removeEventListener("scroll", throttled);
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
    { id: "help", path: "/farmers-help", icon: Sprout, label: t("nav.help") },
    { id: "agritech", path: "/agritech", icon: Cpu, label: t("home.agritech") },
    { id: "map", path: "/map", icon: MapPin, label: t("nav.map", "Smart Map") },
    { id: "land", path: "/land-leasing", icon: MapPin, label: t("nav.land", "Land") },
    { id: "share", path: "/share-care", icon: HeartHandshake, label: t("nav.share", "Share") },
    { id: "ship", path: "/ship", icon: Truck, label: t("nav.ship", "Ship") },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-colors duration-200 ${
        scrolled
          ? "border-border/60 bg-background/95 shadow-sm shadow-black/5 dark:bg-background/90 dark:border-white/[0.06]"
          : "border-border/40 bg-background/90 dark:bg-background/85 dark:border-white/[0.04]"
      }`}
    >
      {/* ── Row 1: main bar (all screen sizes) ── */}
      <div className="flex h-12 items-center gap-1.5 py-0.5 pl-3 pr-4">
        {hasSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 hover:bg-primary/10 transition-colors shrink-0"
            data-testid="button-toggle-sidebar"
          >
            {state === "expanded" ? (
              <ChevronLeft className="h-[18px] w-[18px]" />
            ) : (
              <Menu className="h-[18px] w-[18px]" />
            )}
          </Button>
        )}

        {/* Back / Forward — visible on all sizes */}
        <div className="flex items-center gap-0 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (onBack) {
                onBack();
                return;
              }
              window.history.back();
            }}
            className="h-8 w-8 hover:bg-primary/10 transition-colors"
            data-testid="button-nav-back"
            title={t("nav.go_back")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.forward()}
            className="h-8 w-8 hover:bg-primary/10 transition-colors"
            data-testid="button-nav-forward"
            title={t("nav.go_forward")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <motion.div
          onClick={handleHomeClick}
          className="flex items-center gap-1 cursor-pointer group shrink-0"
          data-testid="link-brand-home"
          whileTap={{ scale: 0.97 }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-green-700 shadow-sm shadow-primary/30 ring-1 ring-primary/20">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <span className="font-black text-sm sm:text-base leading-tight tracking-tight text-foreground hidden sm:inline">AgriConnect</span>
        </motion.div>

        <nav className="hidden md:flex items-center gap-1 ml-1 shrink-0 relative z-20">
          {navLinks.map((item) => (
            <motion.div key={item.path} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation(item.path)}
                className={`gap-1.5 h-8 px-2 sm:px-2.5 text-xs font-black uppercase tracking-wide transition-all ${
                  location === item.path
                    ? "text-primary bg-primary/10 border border-primary/20 shadow-xs"
                    : "text-foreground/90 hover:text-primary hover:bg-primary/10"
                }`}
                aria-label={item.label}
                data-testid={`nav-link-${item.id}`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="inline">{item.label}</span>
              </Button>
            </motion.div>
          ))}
        </nav>

        <div className="flex-1 min-w-0 max-w-[min(42vw,34rem)] flex items-center justify-center px-1 sm:px-2 relative z-0">
          <SearchAutocomplete
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
          />
        </div>

        <div className="flex items-center gap-1.5 ml-auto shrink-0 relative z-10">
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshLiveLocation}
              className={`hidden md:inline-flex h-9 w-9 rounded-xl ${
                liveLocation?.source === "device" ? "bg-blue-500/10 text-blue-600" : "text-muted-foreground"
              }`}
              title={liveLocation?.label || "Enable live location"}
              aria-label={liveLocation?.label || "Enable live location"}
              data-testid="button-live-location-status"
            >
              <LocateFixed className={`h-4.5 w-4.5 ${liveLocationStatus === "requesting" ? "animate-pulse" : ""}`} />
            </Button>
          )}
          <div className="hidden sm:flex items-center gap-1">
            <VoiceCommand onSearch={handleSearch} />
            <LanguageSwitcher />
            <ThemeToggle />
            <RegionSwitcher />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="relative mx-1 h-9 w-9 overflow-visible rounded-xl transition-all hover:bg-primary/10 sm:h-10 sm:w-10"
            onClick={() => setLocation("/cart")}
            aria-label={`Shopping cart with ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
            title={`Shopping cart (${cartCount})`}
            data-testid="button-cart-nav"
          >
            <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
            {cartCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-amber-400 px-1 text-[10px] font-black leading-none text-black shadow-md"
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
                  className="ml-1 flex h-9 items-center gap-2 rounded-xl border border-border/60 px-2.5 transition-all hover:bg-primary/10 sm:h-10 sm:px-3"
                  data-testid="button-user-menu"
                  aria-label="Open profile menu"
                >
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 ring-2 ring-primary/30">
                    <AvatarImage src={user.avatar || user.profileImageUrl || undefined} alt={user.name || user.email || "User"} />
                    <AvatarFallback className="text-xs sm:text-sm font-black bg-primary/20 text-primary">
                      {(user.name || user.firstName || user.email || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-xs sm:text-sm font-black uppercase tracking-wide text-foreground max-w-[130px] truncate">
                    {user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 backdrop-blur-xl rounded-2xl border-2 border-border/80 p-1.5 shadow-xl">
                <DropdownMenuLabel className="px-2.5 py-2">
                  <span className="block text-xs font-black uppercase tracking-wider text-muted-foreground">Profile</span>
                  <span className="mt-0.5 block truncate text-sm font-black text-foreground">
                    {user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1.5 bg-border/80" />
                <DropdownMenuItem onClick={() => setLocation("/my-profile")} data-testid="menu-item-my-profile" className="font-bold py-2.5 rounded-xl">
                  <User className="mr-2.5 h-4.5 w-4.5 text-primary" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/dashboard")} data-testid="menu-item-dashboard" className="font-bold py-2.5 rounded-xl">
                  <User className="mr-2.5 h-4.5 w-4.5 text-primary" />
                  {t("nav.dashboard", "Dashboard")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/orders")} data-testid="menu-item-orders" className="font-bold py-2.5 rounded-xl">
                  <ShoppingBag className="mr-2.5 h-4.5 w-4.5 text-primary" />
                  {t("nav.orders", "My Orders")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/favorites")} data-testid="menu-item-favorites" className="font-bold py-2.5 rounded-xl">
                  <Heart className="mr-2.5 h-4.5 w-4.5 text-rose-500" />
                  Favorites
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/settings")} data-testid="menu-item-settings" className="font-bold py-2.5 rounded-xl">
                  <Settings className="mr-2.5 h-4.5 w-4.5 text-primary" />
                  {t("nav.settings", "Account Settings")}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1.5 bg-border/80" />
                <DropdownMenuItem onClick={() => logout()} data-testid="menu-item-logout" className="font-bold py-2.5 rounded-xl text-red-600 dark:text-red-400">
                  <LogOut className="mr-2.5 h-4.5 w-4.5" />
                  {t("nav.signout", "Sign Out")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant="default"
                onClick={() => (window.location.href = "/login")}
                className="ml-1 h-9 rounded-xl border border-amber-500/40 bg-amber-400 px-3.5 text-xs font-black uppercase tracking-wider text-black shadow-md hover:bg-amber-500 sm:h-10 sm:px-4 sm:text-sm"
                data-testid="button-login-nav"
              >
                <User className="h-4.5 w-4.5 mr-1.5 text-black" />
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
              <MoreHorizontal className="h-4 w-4" />
              {t("nav.more")}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[60vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle className="text-sm font-bold">{t("nav.tools_preferences")}</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-3 pt-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{t("nav.voice_label")}</span>
                <VoiceCommand onSearch={handleSearch} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{t("nav.language_label")}</span>
                <LanguageSwitcher />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{t("nav.theme_label")}</span>
                <ThemeToggle />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{t("nav.currency_label")}</span>
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
            <item.icon className="h-4 w-4" />
            {item.label}
          </Button>
        ))}
      </div>
    </header>
  );
}
