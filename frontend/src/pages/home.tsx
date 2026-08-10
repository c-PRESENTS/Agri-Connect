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

import { useCart } from "@/hooks/use-cart";
import { useTranslation } from "react-i18next";
import type { Product, ProductFilters as Filters } from "@shared/schema";
import { getShoppableCategories } from "@/lib/categories";
import { buildProductDetailUrl } from "@/lib/product-navigation";
import { motion, AnimatePresence } from "framer-motion";

function findCategoryForSubcategory(subcategoryId: string | null) {
  if (!subcategoryId) return null;
  return getShoppableCategories().find((category) =>
    category.subcategories.some((subcategory) => subcategory.id === subcategoryId)
  )?.id ?? null;
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
    <div className="border-b border-border/60 bg-background/95 px-4 py-2.5 flex gap-2.5 overflow-x-auto no-scrollbar shrink-0" data-testid="dietary-filter-strip">
      {active && (
        <button
          onClick={() => onChange(null)}
          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors border border-destructive/30 shadow-xs"
          data-testid="dietary-filter-clear"
        >
          ✕ Clear
        </button>
      )}
      {DIETARY_CHIPS.map((chip) => (
        <button
          key={chip.id}
          onClick={() => onChange(active === chip.id ? null : chip.id)}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-xs font-black uppercase tracking-wide transition-all border ${
            active === chip.id
              ? "bg-primary text-primary-foreground border-primary shadow-md font-black scale-[1.02]"
              : "bg-background text-foreground border-border/80 hover:border-primary/60 hover:bg-primary/10 shadow-2xs"
          }`}
          data-testid={`dietary-chip-${chip.id}`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const [filters, setFilters] = useState<Filters>({});
  const { items: cartItems, itemCount: cartCount, addItem, updateItem, removeItem } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDietaryFilter, setActiveDietaryFilter] = useState<string | null>(null);

  const search = useSearch();
  const rawSearch = search || (typeof window !== "undefined" ? window.location.search : "");
  const urlParams = useMemo(() => new URLSearchParams(rawSearch), [rawSearch]);
  const urlSubcategory = urlParams.get("subcategory") || urlParams.get("subcategoryId");
  const urlCategory =
    urlParams.get("category") ||
    urlParams.get("categoryId") ||
    findCategoryForSubcategory(urlSubcategory);
  const urlSection = urlParams.get("section");

  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(urlCategory || undefined);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | undefined>(urlSubcategory || undefined);
  
  // Panel state - sticky until explicitly closed
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const requestedSubcategory =
    activeDietaryFilter || urlSubcategory || activeSubcategory || selectedSubcategory;
  const effectiveSubcategory = useMemo(() => {
    if (!selectedCategory || !requestedSubcategory) return undefined;
    const category = getShoppableCategories().find(
      (item) => item.id === selectedCategory,
    );
    return category?.subcategories.some(
      (subcategory) => subcategory.id === requestedSubcategory,
    )
      ? requestedSubcategory
      : undefined;
  }, [requestedSubcategory, selectedCategory]);

  useEffect(() => {
    const subcat = urlParams.get("subcategory") || urlParams.get("subcategoryId");
    const searchFromUrl = urlParams.get("search") || "";
    const cat =
      urlParams.get("category") ||
      urlParams.get("categoryId") ||
      findCategoryForSubcategory(subcat);
    const section = urlParams.get("section");
    setSearchQuery(searchFromUrl);
    if (cat) {
      setSelectedCategory(cat);
      setSelectedSubcategory(subcat || undefined);
      setActiveSubcategory(subcat);
    } else {
      setSelectedCategory(undefined);
      setSelectedSubcategory(undefined);
      setActiveSubcategory(null);
      setExpandedCategory(null);
      setFilters({});
    }
    setActiveSection(section);
  }, [urlParams]);

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
  if (effectiveSubcategory) queryParams.set("subcategoryId", effectiveSubcategory);
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

  const handleCategoryClick = useCallback((categoryId: string | null) => {
    if (categoryId === expandedCategory) return;
    setExpandedCategory(categoryId);
    setActiveSubcategory(null);
    setActiveSection(null);
  }, [expandedCategory]);

  const handleCategorySelect = useCallback((categoryId: string, subcategoryId?: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(subcategoryId);
    const qs = new URLSearchParams();
    qs.set("category", categoryId);
    if (subcategoryId) qs.set("subcategory", subcategoryId);
    setLocation(`/?${qs.toString()}`);
    window.dispatchEvent(new CustomEvent("agri-subcategory-open", { detail: categoryId }));
  }, [setLocation]);

  const handleSubcategoryClick = useCallback((subId: string | null) => {
    setActiveSubcategory(subId);
    setActiveSection(null);
    if (subId && expandedCategory) {
      setSelectedSubcategory(subId);
    }
  }, [expandedCategory]);

  const handleCloseSubcategoryPanel = useCallback(() => {
    setExpandedCategory(null);
    setActiveSubcategory(null);
    setActiveSection(null);
  }, []);

  const handleCloseDeepPanel = useCallback(() => {
    setActiveSubcategory(null);
    setActiveSection(null);
  }, []);

  const handleProductClick = useCallback((product: Product) => {
    setLocation(buildProductDetailUrl(product, {
      categoryId: selectedCategory,
      subcategoryId: effectiveSubcategory,
      section: activeSection,
    }));
  }, [setLocation, selectedCategory, effectiveSubcategory, activeSection]);

  const handleAddToCart = useCallback((product: Product) => {
    addItem.mutate({ product, quantity: 1 });
  }, [addItem]);

  const handleUpdateQuantity = useCallback((itemId: string, quantity: number) => {
    updateItem.mutate({ itemId, quantity });
  }, [updateItem]);

  const handleRemoveItem = useCallback((itemId: string) => {
    removeItem.mutate(itemId);
  }, [removeItem]);

  const handleCheckout = useCallback(() => {
    setIsCartOpen(false);
    setLocation("/cart");
  }, [setIsCartOpen, setLocation]);

  const handleFarmerClick = useCallback((farmerId: string) => {
    if (!farmerId) return;
    setLocation(`/sellers/${farmerId}`);
  }, [setLocation]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleHome = useCallback(() => {
    setSelectedCategory(undefined);
    setSelectedSubcategory(undefined);
    setSearchQuery("");
    setFilters({});
    setExpandedCategory(null);
    setActiveSubcategory(null);
    setActiveSection(null);
    if (window.location.pathname !== "/" || window.location.search) {
      window.history.pushState({}, "", "/");
    }
    setLocation("/");
    window.dispatchEvent(new Event("agri-subcategory-close"));
  }, [setLocation]);

  const handleBrowseAll = useCallback(() => {
    setSelectedCategory("daily-needs");
    setLocation("/?category=daily-needs");
    window.dispatchEvent(new CustomEvent("agri-subcategory-open", { detail: "daily-needs" }));
  }, [setLocation]);

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "6.5rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties} defaultOpen={false}>
      <div className="flex h-screen w-full bg-gradient-to-br from-background via-background to-muted/20 gap-0 relative overflow-hidden pb-16 lg:pb-0">
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <TopNavigation
            cartItemCount={cartCount}
            onSearch={handleSearch}
            onHome={handleHome}
          />
          
          <main className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {showHomepage ? (
                <div key="homepage-scroll-container" className="h-full overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-gutter:stable] transform-gpu">
                  <motion.div
                    key="homepage"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="transform-gpu"
                  >
                    <HeroSection
                      onBrowse={handleBrowseAll}
                      products={products}
                      onFarmerClick={handleFarmerClick}
                      onAddToCart={handleAddToCart}
                    />
                    <CategoryCarousel
                      onCategorySelect={handleCategorySelect}
                      products={products}
                      onAddToCart={handleAddToCart}
                    />
                    <FeatureShowcase />
                    <TrustIndicators />
                  </motion.div>
                </div>
              ) : (
                <motion.div
                  key="products"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
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
                        subcategoryId={effectiveSubcategory || null}
                        activeSection={activeSection}
                        onAddToCart={handleAddToCart}
                        onProductClick={handleProductClick}
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
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
      />
    </SidebarProvider>
  );
}
