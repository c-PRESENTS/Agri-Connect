import { useLocation, useSearch } from "wouter";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SubcategoryPanel } from "@/components/subcategory-panel";
import { categories } from "@/lib/categories";

const PAGE_CATEGORIES = new Set(categories.map(c => c.id));

const ROUTE_META: Record<string, { title: string; context: string; items: string[] }> = {
  "/": {
    title: "Browse",
    context: "Marketplace filters and category metadata",
    items: ["Categories", "Subcategories", "Dietary filters"],
  },
  "/farmers-help": {
    title: "Knowledge",
    context: "Farmer guidance and AI support",
    items: ["Recommendations", "Weather", "Market prices"],
  },
  "/agritech": {
    title: "AgriTech",
    context: "Tools, hardware, and precision farming",
    items: ["Products", "Case studies", "Technology stack"],
  },
  "/map": {
    title: "Smart Map",
    context: "Location, demand, and farm overlays",
    items: ["Layers", "Drawing", "Nearby sellers"],
  },
  "/land-leasing": {
    title: "Land",
    context: "Lease, sale, investment, and community land",
    items: ["Listings", "Payments", "Programs"],
  },
  "/share-care": {
    title: "Share Care",
    context: "Food waste prevention and donations",
    items: ["Available items", "Map", "Pickup notes"],
  },
  "/ship": {
    title: "Shipping",
    context: "Quotes, bookings, and tracking metadata",
    items: ["Quotes", "Shipments", "Order tracking"],
  },
  "/government-schemes": {
    title: "Schemes",
    context: "Eligibility and application metadata",
    items: ["Subsidies", "Applications", "Documents"],
  },
  "/cart": {
    title: "Cart",
    context: "Basket, shipping, and checkout state",
    items: ["Items", "Totals", "Delivery"],
  },
  "/dashboard": {
    title: "Dashboard",
    context: "Farmer account and operating metrics",
    items: ["Stats", "Orders", "Alerts"],
  },
  "/settings": {
    title: "Settings",
    context: "Profile and preference metadata",
    items: ["Profile", "Language", "Security"],
  },
};

function getRouteMeta(location: string) {
  const exact = ROUTE_META[location];
  if (exact) return exact;
  if (location.startsWith("/products/")) {
    return {
      title: "Product",
      context: "Product detail, seller, cart, and review state",
      items: ["Pricing", "Seller", "Reviews"],
    };
  }
  if (location.startsWith("/orders")) {
    return {
      title: "Orders",
      context: "Order history and fulfillment metadata",
      items: ["Status", "Tracking", "Support"],
    };
  }
  return {
    title: "Context",
    context: "Additional navigation metadata",
    items: ["Current page", "Related actions", "State"],
  };
}

function SecondaryMetaPanel({ location }: { location: string }) {
  const { t } = useTranslation();
  const meta = getRouteMeta(location);

  return (
    <aside
      className="hidden lg:flex w-[180px] shrink-0 flex-col border-r border-border/40 bg-sidebar/80 backdrop-blur-xl"
      data-testid="secondary-left-sidebar"
      aria-label="Secondary navigation metadata"
    >
      <div className="sticky top-0 z-10 border-b border-border/40 bg-sidebar/90 px-3 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("category.browse_by_category")}</p>
        <h2 className="mt-1 text-sm font-bold text-sidebar-foreground">{meta.title}</h2>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{meta.context}</p>
      </div>
      <div className="space-y-1 p-2">
        {meta.items.map((item) => (
          <button
            key={item}
            className="w-full rounded-lg border border-border/30 bg-background/30 px-2 py-2 text-left text-[11px] font-semibold text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
    </aside>
  );
}

export function GlobalSubcategoryPanel() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search || "");
  const urlCategory = params.get("category");
  const urlSubcategory = params.get("subcategory") || undefined;
  const urlSection = params.get("section") || undefined;

  // Which top-level category panel is open
  const [activeCategory, setActiveCategory] = useState<string | null>(
    urlCategory && PAGE_CATEGORIES.has(urlCategory) ? urlCategory : null
  );
  // Which subcategory inside the open panel is expanded inline (3rd level)
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(
    urlSubcategory ?? null
  );
  // Which section title inside the expanded subcategory is active
  const [activeSection, setActiveSection] = useState<string | null>(
    urlSection ?? null
  );

  // Keep state in sync with URL changes (e.g. nav from links elsewhere)
  useEffect(() => {
    if (urlCategory && PAGE_CATEGORIES.has(urlCategory)) {
      setActiveCategory(urlCategory);
    }
  }, [urlCategory]);

  useEffect(() => {
    if (urlSubcategory) setActiveSubcategory(urlSubcategory);
  }, [urlSubcategory]);

  useEffect(() => {
    setActiveSection(urlSection ?? null);
  }, [urlSection]);

  // Listen for explicit open/close events from the nav rail
  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      if (id && PAGE_CATEGORIES.has(id)) setActiveCategory(id);
    };
    const onClose = () => {
      setActiveCategory(null);
      setActiveSubcategory(null);
      setActiveSection(null);
    };
    window.addEventListener("agri-subcategory-open", onOpen as EventListener);
    window.addEventListener("agri-subcategory-close", onClose);
    return () => {
      window.removeEventListener("agri-subcategory-open", onOpen as EventListener);
      window.removeEventListener("agri-subcategory-close", onClose);
    };
  }, []);

  const handleClose = useCallback(() => {
    setActiveCategory(null);
    setActiveSubcategory(null);
    setActiveSection(null);
  }, []);

  // Auto-close whenever the user navigates away from home (back / forward /
  // any link). Keeps the panel from lingering on top of unrelated pages on
  // mobile where it is a fullscreen overlay.
  useEffect(() => {
    if (location !== "/") {
      setActiveCategory(null);
      setActiveSubcategory(null);
      setActiveSection(null);
    }
  }, [location]);

  // Subcategory clicked — expand inline AND navigate to that subcategory's
  // products section so the page jumps to the right area.
  const handleSubcategoryClick = useCallback((subId: string | null) => {
    setActiveSubcategory(subId);
    setActiveSection(null);
    if (subId && activeCategory) {
      const qs = new URLSearchParams();
      qs.set("category", activeCategory);
      qs.set("subcategory", subId);
      setLocation(`/?${qs.toString()}`);
    }
  }, [activeCategory, setLocation]);

  // Final leaf navigation (subcategory with no nested content)
  const handleSubcategorySelect = useCallback((catId: string, subId: string) => {
    setLocation(`/?category=${catId}&subcategory=${subId}`);
    setActiveSubcategory(subId);
    setActiveSection(null);
  }, [setLocation]);

  // Section title clicked — navigate to the products view scrolled to that section
  const handleSectionClick = useCallback((sectionTitle: string) => {
    if (!activeCategory) return;
    setActiveSection(sectionTitle);
    const sub = activeSubcategory ?? "";
    const qs = new URLSearchParams();
    qs.set("category", activeCategory);
    if (sub) qs.set("subcategory", sub);
    qs.set("section", sectionTitle);
    setLocation(`/?${qs.toString()}`);
  }, [activeCategory, activeSubcategory, setLocation]);

  if (location !== "/") return <SecondaryMetaPanel location={location} />;
  if (!activeCategory) return <SecondaryMetaPanel location={location} />;
  // Mobile uses the docked MobileNavSheet (Browse drawer) for category +
  // subcategory browsing — don't double-stack a second floating panel.
  if (typeof window !== "undefined" && window.innerWidth < 1024) return null;

  return (
    <SubcategoryPanel
      categoryId={activeCategory}
      selectedSubcategory={urlSubcategory}
      activeSubcategory={activeSubcategory}
      activeSection={activeSection}
      onClose={handleClose}
      onSubcategoryClick={handleSubcategoryClick}
      onSubcategorySelect={handleSubcategorySelect}
      onSectionClick={handleSectionClick}
    />
  );
}
