import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ProductShowcase } from "@/components/product-showcase";
import { TopNavigation } from "@/components/top-navigation";
import { CartSheet } from "@/components/cart-sheet";
import { HeroSection } from "@/components/hero-section";
import { FeatureShowcase } from "@/components/feature-showcase";
import { CategoryCarousel } from "@/components/category-carousel";
import { LiveSellersRail } from "@/components/live-sellers-rail";
import { ResizableSplit } from "@/components/resizable-split";
import { TrustIndicators } from "@/components/trust-indicators";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import { useTranslation } from "react-i18next";
import type { Product, ProductFilters as Filters, Region } from "@shared/schema";
import { regions } from "@/lib/categories";
import { motion, AnimatePresence } from "framer-motion";
import { Home as HomeIcon, LayoutGrid, Map, ShoppingCart as CartIcon, User } from "lucide-react";

function MobileBottomNav({
  onHome,
  cartCount,
  onCart,
  onNavigate,
}: {
  onHome: () => void;
  cartCount: number;
  onCart: () => void;
  onNavigate: (path: string) => void;
}) {
  const items = [
    { id: "home", label: "Home", icon: HomeIcon, action: onHome, badge: null },
    { id: "categories", label: "Categories", icon: LayoutGrid, action: () => onNavigate("/?category=daily-needs"), badge: null },
    { id: "map", label: "Map", icon: Map, action: () => onNavigate("/map"), badge: null },
    { id: "cart", label: "Cart", icon: CartIcon, action: onCart, badge: cartCount > 0 ? cartCount : null },
    { id: "profile", label: "Profile", icon: User, action: () => onNavigate("/login"), badge: null },
  ] as const;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden bg-background/95 backdrop-blur-xl border-t border-border/50 flex items-center justify-around h-16 px-1"
      data-testid="mobile-bottom-nav"
    >
      {items.map(({ id, label, icon: Icon, action, badge }) => (
        <button
          key={id}
          onClick={action as () => void}
          data-testid={`mobile-nav-${id}`}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-xl transition-all active:scale-95 text-muted-foreground hover:text-foreground relative py-1"
        >
          <div className="relative">
            <Icon className="h-5 w-5" />
            {(badge as number | null) != null && (
              <span className="absolute -top-1 -right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                {(badge as number) > 9 ? "9+" : badge}
              </span>
            )}
          </div>
          <span className="text-[9px] font-semibold tracking-tight leading-none">{label}</span>
        </button>
      ))}
    </nav>
  );
}

export default function Home() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [filters, setFilters] = useState<Filters>({});
  const { items: cartItems, itemCount: cartCount, addItem, updateItem, removeItem } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<Region>(
    regions.find(r => r.code === "GB") || regions[0]
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDietaryFilter, setActiveDietaryFilter] = useState<string | null>(null);

  const search = useSearch();
  const urlParams = useMemo(() => new URLSearchParams(search || ""), [search]);
  const urlCategory = urlParams.get("category");
  const urlSubcategory = urlParams.get("subcategory");
  const urlSection = urlParams.get("section");

  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(urlCategory || undefined);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | undefined>(urlSubcategory || undefined);
  
  // Panel state - sticky until explicitly closed
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const cat = urlParams.get("category");
    const subcat = urlParams.get("subcategory");
    const section = urlParams.get("section");
    if (cat) {
      setSelectedCategory(cat);
      setSelectedSubcategory(subcat || undefined);
    } else {
      // URL has no category — fully reset back to the home view so the
      // AgriConnect logo and the sidebar Home icon both land on the
      // proper landing page even when local state still holds a category.
      setSelectedCategory(undefined);
      setSelectedSubcategory(undefined);
      setActiveSubcategory(null);
      setExpandedCategory(null);
      setSearchQuery("");
      setFilters({});
    }
    if (section) {
      setActiveSection(section);
    } else if (!cat) {
      setActiveSection(null);
    }
  }, [urlParams]);

  // Also listen for the global "go home" event dispatched by the sidebar
  // Home item and TopNavigation logo — guarantees a full reset even if a
  // sibling state slipped past the URL effect above.
  useEffect(() => {
    const onClose = () => {
      setSelectedCategory(undefined);
      setSelectedSubcategory(undefined);
      setActiveSubcategory(null);
      setExpandedCategory(null);
      setActiveSection(null);
      setSearchQuery("");
      setFilters({});
    };
    window.addEventListener("agri-subcategory-close", onClose);
    return () => window.removeEventListener("agri-subcategory-close", onClose);
  }, []);

  const showHomepage = !selectedCategory && !searchQuery;

  const queryParams = new URLSearchParams();
  if (selectedCategory) queryParams.set("categoryId", selectedCategory);
  if (selectedSubcategory) queryParams.set("subcategoryId", selectedSubcategory);
  if (searchQuery) queryParams.set("search", searchQuery);
  if (filters.isOrganic) queryParams.set("isOrganic", "true");
  if (filters.inStock) queryParams.set("inStock", "true");
  if (filters.distance) queryParams.set("distance", filters.distance.toString());
  if (filters.rating) queryParams.set("rating", filters.rating.toString());
  if (filters.minPrice !== undefined) queryParams.set("minPrice", filters.minPrice.toString());
  if (filters.maxPrice !== undefined) queryParams.set("maxPrice", filters.maxPrice.toString());
  if (filters.sortBy) queryParams.set("sortBy", filters.sortBy);

  const productsQs = queryParams.toString();
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: [productsQs ? `/api/products?${productsQs}` : "/api/products"],
  });

  // Category click - opens 2nd panel
  const handleCategoryClick = useCallback((categoryId: string | null) => {
    if (categoryId === expandedCategory) return;
    setExpandedCategory(categoryId);
    setActiveSubcategory(null);
    setActiveSection(null);
  }, [expandedCategory]);

  // Category selection for filtering
  const handleCategorySelect = useCallback((categoryId: string, subcategoryId?: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(subcategoryId);
  }, []);

  // Subcategory click - opens 3rd nav panel AND shows products on page
  const handleSubcategoryClick = useCallback((subId: string | null) => {
    setActiveSubcategory(subId);
    setActiveSection(null);
    if (subId && expandedCategory) {
      setSelectedSubcategory(subId);
    }
  }, [expandedCategory]);

  // Section navigation from 3rd panel
  const handleSectionClick = useCallback((sectionTitle: string) => {
    setActiveSection(sectionTitle);
  }, []);

  // Section visibility callback from ProductShowcase
  const handleSectionVisible = useCallback((sectionTitle: string) => {
    setActiveSection(sectionTitle);
  }, []);

  // Explicit close handlers
  const handleCloseSubcategoryPanel = useCallback(() => {
    setExpandedCategory(null);
    setActiveSubcategory(null);
    setActiveSection(null);
  }, []);

  const handleCloseDeepPanel = useCallback(() => {
    setActiveSubcategory(null);
    setActiveSection(null);
  }, []);

  const handleProductClick = (product: Product) => {
    // Synthetic placeholder products (no backend record) — search instead
    // of going to a broken detail page.
    if (product.id.startsWith("agri-")) {
      const qs = new URLSearchParams({ search: product.name });
      setLocation(`/?${qs.toString()}`);
      return;
    }
    setLocation(`/products/${product.id}`);
  };

  const handleAddToCart = (product: Product) => {
    if (product.id.startsWith("agri-")) {
      // Placeholder — can't add to backend cart. Substitute the first real
      // loaded product as a friendly fallback.
      const real = products[0];
      if (real) {
        addItem.mutate({ product: real, quantity: 1 });
      }
      return;
    }
    addItem.mutate({ product, quantity: 1 });
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    updateItem.mutate({ itemId, quantity });
  };

  const handleRemoveItem = (itemId: string) => {
    removeItem.mutate(itemId);
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    setLocation("/cart");
  };

  const handleFarmerClick = (farmerId: string) => {
    if (!farmerId) return;
    setLocation(`/sellers/${farmerId}`);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleHome = () => {
    setSelectedCategory(undefined);
    setSelectedSubcategory(undefined);
    setSearchQuery("");
    setFilters({});
    setExpandedCategory(null);
    setActiveSubcategory(null);
    setActiveSection(null);
    // Always land on the clean home URL ("/") with no leftover query params,
    // even when called from the brand logo or sidebar Home icon while a
    // category is active.
    if (window.location.pathname !== "/" || window.location.search) {
      window.history.pushState({}, "", "/");
    }
    setLocation("/");
    window.dispatchEvent(new Event("agri-subcategory-close"));
  };

  const handleBrowseAll = () => {
    setSelectedCategory("daily-needs");
  };

  // Check if any panel is open to control auto-hide
  const isPanelOpen = !!expandedCategory || !!activeSubcategory;

  // Auto-hide sidebar 1 logic
  useEffect(() => {
    if (isPanelOpen && !expandedCategory) {
      // If we are deep but category panel is closed
    }
  }, [isPanelOpen, expandedCategory]);

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "6.5rem",  // 104px — fits 52px image + full label below
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties} defaultOpen={false}>
      <div className="flex h-screen w-full bg-gradient-to-br from-background via-background to-muted/20 gap-0 relative overflow-hidden pb-16 lg:pb-0">
        {/* Animated Background Shapes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 100, 0],
              y: [0, 50, 0],
              rotate: [0, 90, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]"
          />
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              x: [0, -50, 0],
              y: [0, 100, 0],
              rotate: [0, -45, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] bg-orange-500/5 rounded-full blur-[80px]"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              x: [0, 30, 0],
              y: [0, -60, 0],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute bottom-[10%] left-[20%] w-[30%] h-[30%] bg-primary/3 rounded-full blur-[120px]"
          />
        </div>


        {/* Front sidebars removed — categories now live in the main left vertical bar (AppNavRail) */}
        
        {/* Main Content Area */}
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <TopNavigation
            cartItemCount={cartCount}
            onSearch={handleSearch}
            onHome={handleHome}
          />
          
          <main className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {showHomepage ? (
                <motion.div
                  key="homepage"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full overflow-y-auto overflow-x-hidden"
                >
                  <ScrollArea className="h-full">
                    <HeroSection 
                      onBrowse={handleBrowseAll} 
                      products={products}
                      onFarmerClick={handleFarmerClick}
                      onAddToCart={handleAddToCart}
                    />
                    <CategoryCarousel 
                      onCategorySelect={handleCategorySelect}
                      products={products}
                      currencySymbol={currentRegion.currencySymbol}
                      onAddToCart={handleAddToCart}
                    />
                    <FeatureShowcase />
                    <TrustIndicators />
                  </ScrollArea>
                </motion.div>
              ) : (
                <motion.div
                  key="products"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full flex flex-col"
                >
                  <DietaryFilterStrip
                    active={activeDietaryFilter}
                    onChange={(diet) => {
                      setActiveDietaryFilter(diet);
                      if (diet) {
                        setSelectedCategory("dietary");
                        setSelectedSubcategory(diet);
                      } else {
                        setSelectedSubcategory(undefined);
                      }
                    }}
                  />
                  <ResizableSplit
                    left={
                      <ProductShowcase
                        categoryId={selectedCategory || null}
                        subcategoryId={activeDietaryFilter ? activeDietaryFilter : (activeSubcategory || selectedSubcategory || null)}
                        activeSection={activeSection}
                        currencySymbol={currentRegion.currencySymbol}
                        onAddToCart={handleAddToCart}
                        onProductClick={handleProductClick}
                        onSectionVisible={handleSectionVisible}
                        onFarmerClick={handleFarmerClick}
                      />
                    }
                    right={<LiveSellersRail mapHeight={400} listHeight={460} />}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </SidebarInset>
      </div>

      <CartSheet
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        currencySymbol={currentRegion.currencySymbol}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
      />
    </SidebarProvider>
  );
}

const DIETARY_CHIPS = [
  { id: "keto", label: "🥑 Keto" },
  { id: "vegan", label: "🌱 Vegan" },
  { id: "high-protein", label: "💪 High Protein" },
  { id: "gluten-free", label: "🌾 Gluten Free" },
  { id: "dairy-free", label: "🥛 Dairy Free" },
  { id: "diabetic-friendly", label: "💉 Diabetic" },
  { id: "heart-healthy", label: "❤️ Heart Healthy" },
  { id: "paleo", label: "🦴 Paleo" },
  { id: "mediterranean", label: "🫒 Mediterranean" },
  { id: "organic", label: "🌿 Organic" },
  { id: "ayurvedic", label: "🌺 Ayurvedic" },
  { id: "baby-nutrition", label: "👶 Baby" },
];

function DietaryFilterStrip({ active, onChange }: { active: string | null; onChange: (id: string | null) => void }) {
  return (
    <div className="border-b border-border/50 bg-background/95 backdrop-blur-sm px-3 py-2 flex gap-2 overflow-x-auto no-scrollbar shrink-0" data-testid="dietary-filter-strip">
      {active && (
        <button
          onClick={() => onChange(null)}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors border border-border/60"
          data-testid="dietary-filter-clear"
        >
          ✕ Clear
        </button>
      )}
      {DIETARY_CHIPS.map((chip) => (
        <button
          key={chip.id}
          onClick={() => onChange(active === chip.id ? null : chip.id)}
          className={`shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
            active === chip.id
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-background text-foreground border-border/60 hover:border-primary/40 hover:bg-primary/5"
          }`}
          data-testid={`dietary-chip-${chip.id}`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
