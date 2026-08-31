import { useState, useContext, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  User, 
  Menu,
  Leaf,
  ChevronDown,
  MapPin,
  ShoppingBag,
  ShoppingCart,
  HeartHandshake,
  ShieldCheck,
  Bell,
  MessageSquare,
  RefreshCw,
  Search,
  Settings,
  LogOut,
  Sprout,
  GraduationCap,
  Cpu,
  Truck,
  Heart,
  Sparkles,
  Mic,
  Globe,
  Sun,
  Moon,
  Check,
} from "lucide-react";
import { SearchAutocomplete } from "./search-autocomplete";
import { SidebarContext } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLiveLocation } from "@/contexts/live-location-context";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useTheme } from "@/lib/theme-provider";
import { useCurrency } from "@/contexts/currency-context";
import { regions } from "@/lib/categories";
import { loadLanguageResources } from "@/i18n/index";

interface TopNavigationProps {
  cartItemCount?: number;
  searchValue?: string;
  onSearch?: (query: string) => void;
  onHome?: () => void;
  onBack?: () => void;
}

interface TopNavPage {
  id: string;
  label: string;
  path: string;
  icon: typeof Sprout;
}

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧", native: "English" },
  { code: "hi", label: "Hindi", flag: "🇮🇳", native: "हिन्दी" },
  { code: "pa", label: "Punjabi", flag: "🇮🇳", native: "ਪੰਜਾਬੀ" },
  { code: "ta", label: "Tamil", flag: "🇮🇳", native: "தமிழ்" },
  { code: "cy", label: "Welsh", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", native: "Cymraeg" },
  { code: "pl", label: "Polish", flag: "🇵🇱", native: "Polski" },
];

function TrolleyIcon({ className = "h-8 w-8 text-emerald-700 dark:text-emerald-500" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="8.5" cy="20" r="1.5" stroke="currentColor" fill="none" strokeWidth="2.2" />
      <circle cx="18" cy="20" r="1.5" stroke="currentColor" fill="none" strokeWidth="2.2" />
      <path d="M1.5 2.5h3.2l2.4 11.2a1.8 1.8 0 0 0 1.8 1.4h9.8a1.8 1.8 0 0 0 1.8-1.4l1.6-7.2H4.8" />
      <path d="M6.2 8.2h14.2" />
    </svg>
  );
}

// 7 Key Ecosystem Pages requested in the top-bar dropdown
const TOP_NAV_PAGES: TopNavPage[] = [
  { id: "help", label: "HELP", path: "/farmers-help", icon: Sprout },
  { id: "student-help", label: "STUDENT HELP POINT", path: "/farmers-help/student", icon: GraduationCap },
  { id: "agritech", label: "AGRITECH", path: "/agritech", icon: Cpu },
  { id: "map", label: "MAP", path: "/map", icon: MapPin },
  { id: "land", label: "LAND", path: "/land-leasing", icon: MapPin },
  { id: "share", label: "SHARE", path: "/share-care", icon: HeartHandshake },
  { id: "ship", label: "SHIP", path: "/logistics?tab=shipping", icon: Truck },
];

const CATEGORY_OPTIONS = [
  { id: "all", label: "All Categories", query: "" },
  { id: "daily-needs", label: "Daily Needs", query: "?category=daily-needs" },
  { id: "supermarket", label: "Complete Supermarket", query: "?category=supermarket" },
  { id: "dietary", label: "Dietary Needs", query: "?category=dietary" },
  { id: "livestock", label: "Livestock & Poultry", query: "?category=livestock" },
  { id: "inputs-tools", label: "Agri Inputs & Equipment", query: "?category=inputs-tools" },
  { id: "fresh-produce", label: "Bulk & Wholesale", query: "?category=fresh-produce" },
  { id: "modern-farming", label: "Modern Farming", query: "?category=modern-farming" },
  { id: "bio-products", label: "Bio-Based Products", query: "?category=bio-products" },
];

function AdminPortalMenuItem({ onSelect }: { onSelect: () => void }) {
  const access = useAdminAccess();
  if (!access.data?.hasAccess || !access.hasPermission("dashboard.view")) return null;
  return (
    <DropdownMenuItem onClick={onSelect} data-testid="menu-item-admin-portal" className="font-bold py-2.5 rounded-xl">
      <ShieldCheck className="mr-2.5 h-4.5 w-4.5 text-primary" />
      Organisation Portal
    </DropdownMenuItem>
  );
}

export function TopNavigation({ cartItemCount, searchValue, onSearch, onHome }: TopNavigationProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useLocation();
  const sidebarContext = useContext(SidebarContext);
  const [selectedLabel, setSelectedLabel] = useState("All Categories");
  const [isListening, setIsListening] = useState(false);

  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { region: currentRegion, setRegion } = useCurrency();
  const { user, isAuthenticated, logout, switchAccountMode } = useAuth();
  const { itemCount } = useCart();
  const { toast } = useToast();
  const cartCount = cartItemCount ?? itemCount;
  const { t, i18n } = useTranslation();
  const { location: liveLocation, refresh: refreshLiveLocation } = useLiveLocation();

  const baseLang = i18n.language ? i18n.language.split("-")[0] : "en";

  const changeLanguage = async (code: string) => {
    const langCode = await loadLanguageResources(code);
    i18n.changeLanguage(langCode);
    localStorage.setItem("agriconnect-lang", code);
  };

  const toggleSidebar = () => {
    window.dispatchEvent(new Event("agri-nav-toggle"));
    sidebarContext?.toggleSidebar?.();
  };

  const isSellerPath = location.startsWith("/dashboard") || location.startsWith("/seller") || location.startsWith("/fulfillment");
  const isSellerMode = (isAuthenticated && user?.role === "farmer") || isSellerPath;

  const handleToggleAccountMode = async () => {
    if (isSellerMode) {
      if (isAuthenticated) {
        try {
          await switchAccountMode.mutateAsync("buyer");
        } catch (e) {
          console.error("Error switching to buyer mode:", e);
        }
      }
      toast({
        title: "Switched to Buyer Account",
        description: "Viewing marketplace as buyer.",
      });
      setLocation("/");
    } else {
      if (isAuthenticated) {
        try {
          await switchAccountMode.mutateAsync("seller");
        } catch (e) {
          console.error("Error switching to seller mode:", e);
        }
      }
      toast({
        title: "Switched to Seller Account",
        description: "Viewing seller dashboard and management tools.",
      });
      setLocation("/dashboard");
    }
  };

  useEffect(() => {
    if (searchValue !== undefined) setSearchQuery(searchValue);
  }, [searchValue]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  // Web Speech API Voice Search
  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Voice search not supported in this browser", variant: "destructive" });
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = i18n.language || "en-GB";
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        handleSearch(transcript);
        setIsListening(false);
        toast({ title: `Searching for "${transcript}"` });
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const handleHomeClick = () => {
    setSelectedLabel("All Departments");
    window.dispatchEvent(new Event("agri-subcategory-close"));
    if (onHome) {
      onHome();
    } else {
      if (window.location.pathname !== "/" || window.location.search) {
        window.history.pushState({}, "", "/");
      }
      setLocation("/");
    }
  };

  const handleCategorySelect = (cat: typeof CATEGORY_OPTIONS[number]) => {
    setSelectedLabel(cat.label);
    if (cat.query) {
      setLocation(`/${cat.query}`);
    } else {
      setLocation("/");
    }
  };

  const handlePageSelect = (page: TopNavPage) => {
    setSelectedLabel(page.label);
    setLocation(page.path);
  };

  const displayLocation = liveLocation?.label || "Coimbatore, Tamil Nadu";

  return (
    <header className="sticky top-0 z-50 w-full bg-white dark:bg-card border-b border-slate-200/80 dark:border-border/60 transition-colors shadow-2xs">
      <div className="flex h-16 items-center justify-between gap-1.5 sm:gap-2.5 px-2 sm:px-4 max-w-[1920px] mx-auto">
        
        {/* ── 1. FAR LEFT CORNER: SIDEBAR TOGGLE & BRAND ── */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSidebar}
            className="h-10 w-10 rounded-xl border-2 border-emerald-600/40 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 hover:border-emerald-600 text-emerald-800 dark:text-emerald-200 transition-all shrink-0 shadow-sm hover:shadow-md active:scale-95 cursor-pointer"
            data-testid="button-toggle-sidebar"
            title="Toggle Navigation Sidebar (Ctrl+B)"
            aria-label="Toggle Navigation Sidebar"
          >
            <Menu className="h-5 w-5 stroke-[2.6]" />
          </Button>

          <div
            onClick={handleHomeClick}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
            title="Return to AgriConnect Homepage"
            data-testid="link-brand-home"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-xs shadow-emerald-700/20 text-white shrink-0 group-hover:bg-emerald-700 transition-colors">
              <Leaf className="h-5.5 w-5.5" />
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-black text-lg sm:text-xl tracking-tight text-slate-900 dark:text-slate-100">
                AgriConnect
              </span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                Eat Smart. Live Healthy.
              </span>
            </div>
          </div>
        </div>

        {/* ── 2. CATEGORY & PAGES SELECTOR DROPDOWN ── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="hidden lg:inline-flex items-center gap-2 h-10.5 px-3.5 rounded-xl border border-slate-200 dark:border-border/80 bg-slate-50/90 dark:bg-muted/40 hover:bg-slate-100 text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 shrink-0 shadow-2xs cursor-pointer"
              data-testid="button-category-selector"
            >
              <span className="max-w-[140px] truncate">{selectedLabel}</span>
              <ChevronDown className="h-4 w-4 text-slate-500 shrink-0 stroke-[2.5]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 rounded-xl border border-slate-200 dark:border-border/80 p-1.5 shadow-xl bg-white dark:bg-card">
            <DropdownMenuLabel className="px-2.5 py-1 text-xs font-black uppercase tracking-wider text-slate-400">
              Navigation Pages
            </DropdownMenuLabel>
            {TOP_NAV_PAGES.map((page) => (
              <DropdownMenuItem
                key={page.id}
                onClick={() => handlePageSelect(page)}
                className={`flex items-center gap-2.5 text-xs sm:text-sm font-black py-2 rounded-lg cursor-pointer transition-colors ${
                  selectedLabel === page.label
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "text-slate-800 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-800"
                }`}
              >
                <page.icon className="h-4.5 w-4.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                <span>{page.label}</span>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator className="my-1.5 bg-slate-100 dark:bg-border/60" />
            
            <DropdownMenuLabel className="px-2.5 py-1 text-xs font-black uppercase tracking-wider text-slate-400">
              Marketplace Categories
            </DropdownMenuLabel>
            {CATEGORY_OPTIONS.map((cat) => (
              <DropdownMenuItem
                key={cat.id}
                onClick={() => handleCategorySelect(cat)}
                className={`text-xs sm:text-sm py-2 rounded-lg cursor-pointer ${
                  selectedLabel === cat.label
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-black"
                    : "text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-muted"
                }`}
              >
                {cat.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ── 3. SEARCH BAR WITH GREEN SEARCH BUTTON ── */}
        <div className="flex-1 min-w-0 max-w-md lg:max-w-xl px-1">
          <SearchAutocomplete
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
          />
        </div>

        {/* ── 4. LOCATION SELECTOR ("Deliver to...") ── */}
        <div
          onClick={refreshLiveLocation}
          className="hidden 2xl:flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-border/60 hover:bg-slate-50 dark:hover:bg-muted/40 cursor-pointer transition-all select-none shrink-0"
          title="Change delivery location"
        >
          <div className="h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0 border border-emerald-200/60 dark:border-emerald-800/40">
            <MapPin className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col text-left leading-none">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Deliver to</span>
            <span className="text-xs sm:text-sm font-black text-emerald-900 dark:text-emerald-300 mt-0.5 flex items-center gap-0.5 max-w-[140px] truncate">
              {displayLocation}
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 stroke-[2.5]" />
            </span>
          </div>
        </div>

        {/* ── 5. NEW REQUESTED TOP-BAR OPTIONS (media_1787567119198.png) ── */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          
          {/* ① AI Assistant (Sparkling diamond squircle) */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("toggle-ai-chat"))}
            className="h-10 w-10 rounded-xl bg-blue-50 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 border border-blue-200/70 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400 transition-all shadow-2xs group cursor-pointer"
            title="AI Farming & Marketplace Assistant"
            data-testid="button-ai-assistant"
          >
            <Sparkles className="h-4.5 w-4.5 group-hover:scale-110 transition-transform text-blue-600 dark:text-blue-400 fill-blue-600/20" />
          </button>

          {/* ② Microphone Voice Search */}
          <button
            type="button"
            onClick={handleVoiceSearch}
            className={`h-10 w-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              isListening
                ? "bg-red-500 text-white border-red-600 animate-pulse ring-2 ring-red-400"
                : "border-transparent hover:border-slate-200 dark:hover:border-border/60 hover:bg-slate-100 dark:hover:bg-muted text-slate-700 dark:text-slate-300"
            }`}
            title={isListening ? "Listening... speak now" : "Voice search"}
            data-testid="button-voice-search"
          >
            <Mic className="h-4.5 w-4.5" />
          </button>

          {/* ③ Language Selector Pill (🌐 EN) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-10 px-2.5 sm:px-3 rounded-xl border border-slate-200/90 dark:border-border/70 bg-slate-50/80 dark:bg-card hover:bg-slate-100 dark:hover:bg-muted transition-all flex items-center gap-1.5 text-slate-900 dark:text-slate-100 shadow-2xs cursor-pointer"
                title="Change Language"
                data-testid="button-top-language"
              >
                <Globe className="h-4.5 w-4.5 text-slate-600 dark:text-slate-400 shrink-0" />
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider">{baseLang.toUpperCase()}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5 shadow-xl bg-white dark:bg-card border-2">
              <DropdownMenuLabel className="px-2.5 py-1 text-xs font-black uppercase text-slate-400">
                Select Language
              </DropdownMenuLabel>
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className="flex items-center gap-2 cursor-pointer py-2 rounded-xl text-xs sm:text-sm font-bold"
                  data-testid={`lang-${lang.code}`}
                >
                  <span className="text-base">{lang.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-900 dark:text-slate-100">{lang.native}</div>
                    <div className="text-[11px] font-semibold text-slate-400">{lang.label}</div>
                  </div>
                  {baseLang === lang.code && <Check className="h-4 w-4 text-emerald-600 stroke-[3]" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* ④ Theme Toggle Icon (Sun / Moon) */}
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="h-10 w-10 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-border/60 hover:bg-slate-100 dark:hover:bg-muted flex items-center justify-center text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            data-testid="button-theme-toggle"
          >
            {isDark ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
          </button>

          {/* ⑤ Country & Currency Selector Pill (GB · £ ▾) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-10 px-2.5 sm:px-3 rounded-xl border border-slate-200/90 dark:border-border/70 bg-slate-50/80 dark:bg-card hover:bg-slate-100 dark:hover:bg-muted transition-all flex items-center gap-1.5 text-slate-900 dark:text-slate-100 font-black text-xs sm:text-sm shadow-2xs cursor-pointer"
                title="Select Country & Currency"
                data-testid="button-country-currency"
              >
                <span>{currentRegion.code} · {currentRegion.currencySymbol || currentRegion.currency}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 stroke-[2.5]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto rounded-2xl p-1.5 shadow-xl bg-white dark:bg-card border-2">
              <DropdownMenuLabel className="px-2.5 py-1 text-xs font-black uppercase text-slate-400">
                Country & Currency
              </DropdownMenuLabel>
              {regions.map((reg) => (
                <DropdownMenuItem
                  key={reg.code}
                  onClick={() => setRegion(reg)}
                  className={`flex items-center justify-between cursor-pointer py-2 rounded-xl text-xs sm:text-sm ${
                    currentRegion.code === reg.code ? "bg-emerald-50 text-emerald-900 font-black" : "font-bold text-slate-700 dark:text-slate-300"
                  }`}
                  data-testid={`region-${reg.code}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-slate-500 font-bold">{reg.code}</span>
                    <span className="truncate">{reg.name}</span>
                  </div>
                  <span className="font-black text-emerald-700 dark:text-emerald-400 shrink-0 ml-2">
                    {reg.currencySymbol || reg.currency}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

        </div>

        {/* ── 6. RIGHT CONTROLS & USER PROFILE ── */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Notification Bell with Badge 5 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/orders")}
            className="relative h-10 w-10 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-muted cursor-pointer"
            title="Notifications"
            data-testid="button-notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[11px] font-black h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-card leading-none">
              5
            </span>
          </Button>

          {/* Chat Message Bubble */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/support")}
            className="h-10 w-10 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-muted hidden sm:inline-flex cursor-pointer"
            title="Messages & Support"
            data-testid="button-messages"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>

          {/* Switch to Seller / Buyer Account Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleAccountMode}
            disabled={switchAccountMode.isPending}
            className="hidden xl:inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border border-slate-300 dark:border-border/80 font-black text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-muted text-slate-900 dark:text-slate-100 shadow-2xs transition-all cursor-pointer"
            data-testid="button-switch-account-mode"
          >
            <RefreshCw className={`h-4 w-4 ${switchAccountMode.isPending ? "animate-spin" : ""}`} />
            <span>{isSellerMode ? "Switch to Buyer Account" : "Switch to Seller Account"}</span>
          </Button>

          {/* Cart with count badge */}
          <button
            type="button"
            className="relative flex items-center justify-center h-10.5 w-10.5 sm:h-11 sm:w-11 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors shrink-0 group focus:outline-none cursor-pointer"
            onClick={() => setLocation("/cart")}
            aria-label={`Shopping cart with ${cartCount} items`}
            title={`Shopping cart (${cartCount} items)`}
            data-testid="button-cart-nav"
          >
            <div className="relative flex items-center justify-center">
              <TrolleyIcon className="h-7.5 w-7.5 sm:h-8 sm:w-8 text-emerald-700 dark:text-emerald-500 group-hover:scale-105 transition-transform" />
              <span
                className="absolute -top-1 -right-2 bg-red-500 text-white text-[11px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-xs leading-none ring-1.5 ring-white dark:ring-card"
                data-testid="badge-cart-count"
              >
                {cartCount > 0 ? (cartCount > 99 ? "99+" : cartCount) : "3"}
              </span>
            </div>
          </button>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex h-10.5 items-center gap-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-border/60 px-2 transition-all hover:bg-slate-50 dark:hover:bg-muted/60 cursor-pointer"
                data-testid="button-user-menu"
                aria-label="Open profile menu"
              >
                <div className="h-8.5 w-8.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center shadow-2xs shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "K"}
                </div>
                <div className="hidden md:flex flex-col text-left leading-tight">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wide text-slate-900 dark:text-slate-100 max-w-[120px] truncate">
                    {user?.name || (user ? [user.firstName, user.lastName].filter(Boolean).join(" ") : "HARSH GAVAND")}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                    {isSellerMode ? "Seller" : "Buyer"} <ChevronDown className="h-3 w-3 stroke-[2.5]" />
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 backdrop-blur-xl rounded-2xl border-2 border-border/80 p-1.5 shadow-xl bg-white dark:bg-card">
              <DropdownMenuLabel className="px-2.5 py-2">
                <span className="block text-xs font-black uppercase tracking-wider text-muted-foreground">Profile</span>
                <span className="mt-0.5 block truncate text-sm font-black text-foreground">
                  {user?.name || (user ? [user.firstName, user.lastName].filter(Boolean).join(" ") : "KALAISELVAN")}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1.5 bg-border/80" />
              <DropdownMenuItem onClick={() => setLocation("/my-profile")} data-testid="menu-item-my-profile" className="font-bold py-2.5 rounded-xl">
                <User className="mr-2.5 h-4.5 w-4.5 text-primary" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation(isSellerMode ? "/dashboard" : "/orders")} data-testid="menu-item-dashboard" className="font-bold py-2.5 rounded-xl">
                <User className="mr-2.5 h-4.5 w-4.5 text-primary" />
                {isSellerMode ? "Seller Dashboard" : "My Dashboard"}
              </DropdownMenuItem>
              <AdminPortalMenuItem onSelect={() => setLocation("/admin/overview")} />
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
        </div>
      </div>
    </header>
  );
}
