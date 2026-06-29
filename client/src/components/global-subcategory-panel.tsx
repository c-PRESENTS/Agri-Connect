import { useLocation, useSearch } from "wouter";
import { useCallback, useEffect, useState } from "react";
import { SubcategoryPanel } from "@/components/subcategory-panel";
import { categories } from "@/lib/categories";
import { getSubSubcategories } from "@/lib/sub-subcategories";

const PAGE_CATEGORIES = new Set(categories.map(c => c.id));

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

  // Only show the slide-out subcategory panel on the home/browse page.
  // On any other route (cart, checkout, dashboard, settings, product detail,
  // map, etc.) the panel is irrelevant and just covers content. Clicking a
  // category icon in the nav rail already navigates to "/" first, so the
  // panel will mount and open as soon as the user lands on home.
  if (location !== "/") return null;
  if (!activeCategory) return null;
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
