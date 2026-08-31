import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Star,
  MapPin,
  Share2,
  Download,
  Sun,
  Coffee,
  Utensils,
  Moon,
  Check,
  Flame,
  Dumbbell,
  Wheat,
  Leaf,
  Droplets,
  ShieldCheck,
  ShieldAlert,
  ShoppingCart,
  Sprout,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/currency-context";
import { apiRequest } from "@/lib/queryClient";
import type { Product } from "@shared/schema";
import { getSubSubcategories, type SubSubItem } from "@/lib/sub-subcategories";

export interface DietaryProductItem {
  id: string;
  name: string;
  qty: number | string;
  unit: string;
  price: number;
  formattedPrice: string;
  isOrganic?: boolean;
  availableForCart?: boolean;
}

export interface DietaryMealItem {
  id: string;
  time: string;
  mealType: string;
  title: string;
  calories: number;
  image: string;
  iconType: "sun" | "snack" | "lunch" | "tea" | "moon";
  nutrition: {
    protein: number;
    fat: number;
    carbs: number;
    fibre: number;
    netCarbs: number;
  };
  products: DietaryProductItem[];
  bundlePrice: number;
  bundlePriceFormatted: string;
}

export interface DietaryPlanData {
  id: string;
  subcategory: string;
  title: string;
  totalCalories: number;
  seller: {
    id: string;
    name: string;
    logo: string;
    verified: boolean;
    verificationStatus: "verified" | "unverified" | "pending";
    verificationLabel: string;
    rating: number;
    reviewCount: number;
    activeDietPlans: number;
    ordersDelivered: number;
    tags: string[];
    bio: string;
    farmerPhoto: string;
    storeUrl: string;
  };
  meals: DietaryMealItem[];
  nutritionDashboard: {
    calories: { current: number; target: number; percentage: number };
    protein: { current: number; target: number; percentage: number };
    totalCarbs: { current: number; target: number; percentage: number };
    netCarbs: { current: number; target: number; percentage: number };
    totalFat: { current: number; target: number; percentage: number };
    fibre: { current: number; target: number; percentage: number };
    waterIntake: { current: number; target: number; percentage: number; unit: string };
  };
  macronutrientBreakdown: {
    protein: { grams: number; percentage: number };
    fat: { grams: number; percentage: number };
    carbs: { grams: number; percentage: number };
  };
  additionalNutrients: {
    fibre: string;
    sugar: string;
    sodium: string;
    cholesterol: string;
  };
  pricing: {
    totalProductsCost: number;
    dietPlanServiceFee: number;
    deliveryCharges: number;
    totalAmount: number;
  };
}

export function DietaryComingSoon({
  products = [],
  subcategoryId,
  activeSection: propSection,
  onSectionChange,
}: {
  products?: Product[];
  subcategoryId?: string;
  activeSection?: string | null;
  onSectionChange?: (section: string | null) => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { format } = useCurrency();
  const [location, setLocation] = useLocation();

  const [addedBundles, setAddedBundles] = useState<Set<string>>(new Set());
  const [isFollowing, setIsFollowing] = useState(false);

  // Extract active subcategory from prop or URL
  const effectiveSubcategory = useMemo(() => {
    if (subcategoryId) return subcategoryId;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("subcategory") || urlParams.get("subcategoryId") || "keto";
  }, [subcategoryId, location]);

  const currentSection = useMemo(() => {
    if (propSection !== undefined) return propSection;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("section") || null;
  }, [propSection, location]);

  const availableSections = useMemo(() => {
    return getSubSubcategories(effectiveSubcategory);
  }, [effectiveSubcategory]);

  const activeSectionItem = useMemo(() => {
    if (!currentSection || availableSections.length === 0) return null;
    return (
      availableSections.find(
        (s) => s.title.toLowerCase() === currentSection.toLowerCase(),
      ) || null
    );
  }, [currentSection, availableSections]);

  // Fetch real database-backed plan from backend API
  const { data: plan, isLoading, isError } = useQuery<DietaryPlanData>({
    queryKey: [`/api/dietary/plans?subcategory=${effectiveSubcategory}`],
    staleTime: 30_000,
  });

  // Mutation to add individual meal bundle into real user cart
  const addBundleMutation = useMutation({
    mutationFn: async (meal: DietaryMealItem) => {
      const availableProducts = meal.products.filter((product) => product.availableForCart === true);
      if (availableProducts.length === 0) {
        throw new Error("No products in this bundle are currently available");
      }
      const res = await apiRequest("POST", "/api/dietary/add-bundle", {
        mealId: meal.id,
        bundleTitle: `${meal.title} Bundle`,
        products: availableProducts.map((product) => ({ id: product.id })),
      });
      return res.json() as Promise<{ addedCount: number; unavailableItems?: unknown[] }>;
    },
    onSuccess: (_data, meal) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      setAddedBundles((prev) => new Set(prev).add(meal.id));
      toast({
        title: `Added ${meal.title} Bundle to Cart!`,
        description: `${meal.products.length} fresh ingredients included (${format(meal.bundlePrice, { sourceCurrency: "GBP" })})`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add bundle to cart",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to buy complete day plan from database
  const buyCompletePlanMutation = useMutation({
    mutationFn: async () => {
      if (!plan) throw new Error("The dietary plan is not available");
      const res = await apiRequest("POST", "/api/dietary/buy-complete-plan", {
        subcategory: effectiveSubcategory,
        productIds: Array.from(new Set(
          plan.meals.flatMap((meal) =>
            meal.products
              .filter((product) => product.availableForCart === true)
              .map((product) => product.id),
          ),
        )),
      });
      return res.json() as Promise<{ addedCount: number; unavailableItems?: unknown[] }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Complete Day Plan Added to Cart!",
        description: `${result.addedCount} available product${result.addedCount === 1 ? "" : "s"} from ${plan?.title ?? "the dietary plan"} added. Opening your cart…`,
      });
      setLocation("/cart");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to order complete plan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleShare = () => {
    if (!plan) return;
    if (navigator.share) {
      navigator
        .share({
          title: `${plan.title} - ${plan.seller.name}`,
          text: `Check out ${plan.title} with 100% organic farm fresh ingredients on AgriConnect!`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Plan link copied to clipboard!" });
    }
  };

  const handleDownload = () => {
    if (!plan) return;
    toast({
      title: "Downloading Diet Plan PDF...",
      description: `${plan.title} with full nutritional guide & recipe instructions.`,
    });
  };

  const getMealIcon = (type: string) => {
    switch (type) {
      case "sun":
        return <Sun className="h-4 w-4 text-amber-500" />;
      case "snack":
        return <Sun className="h-4 w-4 text-amber-500" />;
      case "lunch":
        return <Sun className="h-4 w-4 text-amber-500" />;
      case "tea":
        return <Coffee className="h-4 w-4 text-purple-500" />;
      case "moon":
        return <Moon className="h-4 w-4 text-indigo-500" />;
      default:
        return <Utensils className="h-4 w-4 text-emerald-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="h-full grid place-items-center bg-[#f8fafc] dark:bg-background text-sm font-semibold text-muted-foreground">
        Loading the database-backed dietary plan…
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="h-full grid place-items-center bg-[#f8fafc] dark:bg-background px-6 text-center">
        <div>
          <h2 className="font-black text-lg">Dietary plan unavailable</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A real verified seller and eligible database products are required to display this plan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f8fafc] dark:bg-background text-slate-900 dark:text-slate-100 pb-20">
      {/* ─── MAIN CONTAINER ─── */}
      <div className="max-w-[1550px] mx-auto p-4 sm:p-6 space-y-6">
        {/* ─── 0.5. DIETARY SUB-SECTIONS PILL BAR ─── */}
        {availableSections.length > 0 && (
          <div className="bg-white dark:bg-card px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-border/80 shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:none">
              <span className="text-[10.5px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider shrink-0 mr-1">
                Sub-Sections:
              </span>

              {/* "All Meals" Pill */}
              <button
                type="button"
                onClick={() => {
                  const qs = new URLSearchParams(window.location.search);
                  qs.set("category", "dietary");
                  qs.set("subcategory", effectiveSubcategory);
                  qs.delete("section");
                  setLocation(`/?${qs.toString()}`);
                  onSectionChange?.(null);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                  !activeSectionItem
                    ? "bg-amber-400 text-amber-950 border-amber-500 shadow-2xs font-black dark:bg-amber-400 dark:text-amber-950"
                    : "bg-slate-50 dark:bg-muted text-slate-700 dark:text-slate-300 border-slate-200 dark:border-border/80 hover:border-emerald-500 hover:text-emerald-800"
                }`}
              >
                All Meals & Plan
              </button>

              {availableSections.map((sec) => {
                const isSecActive = activeSectionItem?.title.toLowerCase() === sec.title.toLowerCase();
                return (
                  <button
                    key={sec.title}
                    type="button"
                    onClick={() => {
                      const qs = new URLSearchParams(window.location.search);
                      qs.set("category", "dietary");
                      qs.set("subcategory", effectiveSubcategory);
                      if (isSecActive) {
                        qs.delete("section");
                        onSectionChange?.(null);
                      } else {
                        qs.set("section", sec.title);
                        onSectionChange?.(sec.title);
                      }
                      setLocation(`/?${qs.toString()}`);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 border flex items-center gap-1.5 ${
                      isSecActive
                        ? "bg-amber-400 text-amber-950 border-amber-500 shadow-2xs font-black dark:bg-amber-400 dark:text-amber-950"
                        : "bg-slate-50 dark:bg-muted text-slate-700 dark:text-slate-300 border-slate-200 dark:border-border/80 hover:border-emerald-500 hover:text-emerald-800"
                    }`}
                  >
                    <span>{sec.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── 0.6. ACTIVE FOCUSED SECTION SHOWCASE BANNER ─── */}
        {activeSectionItem && (
          <div className="bg-gradient-to-r from-amber-50 via-amber-100/50 to-emerald-50 dark:from-amber-950/30 dark:via-amber-900/20 dark:to-emerald-950/30 rounded-2xl border-2 border-amber-400/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-amber-400 text-amber-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                  Active Section Focus
                </span>
                <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-slate-100">
                  {activeSectionItem.title}
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Targeted items & ingredients: <span className="font-bold text-slate-900 dark:text-slate-100">{activeSectionItem.items.join(" • ")}</span>
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => {
                const qs = new URLSearchParams(window.location.search);
                qs.set("category", "dietary");
                qs.set("subcategory", effectiveSubcategory);
                qs.delete("section");
                setLocation(`/?${qs.toString()}`);
                onSectionChange?.(null);
              }}
              variant="outline"
              className="border-amber-400/80 bg-white/80 dark:bg-card text-xs font-black text-amber-950 dark:text-amber-300 hover:bg-amber-100 shrink-0 rounded-xl h-8 px-3"
            >
              Clear Focus (View All)
            </Button>
          </div>
        )}

        {/* ─── 1. REAL SELLER / CREATOR PROFILE CARD FROM DATABASE ─── */}
        <div className="bg-white dark:bg-card rounded-2xl border border-slate-200/80 dark:border-border/80 p-5 shadow-2xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4 flex-1">
            {/* Logo */}
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border border-slate-200 dark:border-border/80 bg-white dark:bg-muted flex flex-col items-center justify-center p-2 text-center shrink-0 shadow-xs">
              <Sprout className="h-6 w-6 text-emerald-600 mb-0.5" />
              <span className="text-[8px] font-black text-emerald-950 dark:text-emerald-300 leading-tight uppercase">
                {plan.seller.name.slice(0, 12)}
              </span>
            </div>

            {/* Seller Info */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {plan.seller.name}
                </h1>
                {/* Real database verification badge */}
                {plan.seller.verified ? (
                  <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="h-3 w-3" /> Verified Seller
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-amber-300/70 dark:border-amber-800">
                    <ShieldAlert className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    {plan.seller.verificationLabel || "Unverified Seller"}
                  </span>
                )}
              </div>

              {/* Rating & Stats */}
              <div className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300 flex-wrap">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-slate-900 dark:text-slate-100 font-extrabold">{plan.seller.rating}</span>
                  <span className="text-slate-400">({plan.seller.reviewCount} Reviews)</span>
                </div>
                <span className="text-slate-300">•</span>
                <span>{plan.seller.activeDietPlans} Active Diet Plans</span>
                <span className="text-slate-300">•</span>
                <span>{plan.seller.ordersDelivered} Orders Delivered</span>
              </div>

              {/* Badges / Tags */}
              <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold flex-wrap pt-0.5">
                {plan.seller.tags.map((tag: string, idx: number) => (
                  <span key={idx} className="flex items-center gap-1">
                    {tag}
                    {idx < plan.seller.tags.length - 1 && <span className="text-slate-300 ml-2">|</span>}
                  </span>
                ))}
              </div>

              {/* Bio */}
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium max-w-3xl leading-relaxed pt-1">
                {plan.seller.bio}
              </p>
            </div>
          </div>

          {/* Right Banner & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto shrink-0">
            <div className="relative h-28 w-full sm:w-48 rounded-xl overflow-hidden shadow-xs border border-slate-200">
              <img
                src={plan.seller.farmerPhoto}
                alt="Local organic farmer"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex flex-row lg:flex-col gap-2.5 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setLocation(plan.seller.storeUrl || `/sellers/${encodeURIComponent(plan.seller.id)}`)}
                className="flex-1 sm:flex-none border-slate-300 dark:border-border font-bold text-xs rounded-xl h-9 px-5 shadow-2xs hover:bg-slate-50"
                data-testid="button-view-dietary-seller-store"
              >
                View Store
              </Button>
              <Button
                onClick={() => setIsFollowing((v) => !v)}
                className={`flex-1 sm:flex-none font-bold text-xs rounded-xl h-9 px-5 shadow-2xs transition-colors ${
                  isFollowing
                    ? "bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-muted dark:text-slate-200"
                    : "bg-emerald-800 hover:bg-emerald-900 text-white"
                }`}
              >
                {isFollowing ? "Following" : "Follow Seller"}
              </Button>
            </div>
          </div>
        </div>

        {/* ─── 2. TWO-COLUMN WORKSPACE: LEFT MEAL TIMELINE + RIGHT NUTRITION DASHBOARD ─── */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_370px] gap-6 items-start">
          {/* ─── LEFT COLUMN: MEAL TIMELINE & PRODUCTS ─── */}
          <div className="space-y-4">
            {/* Header Plan Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-card p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {plan.title}
                </h2>
                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-black px-2.5 py-0.5 rounded-full">
                  {plan.totalCalories.toLocaleString()} kcal
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="rounded-xl text-xs font-bold gap-1.5 h-8 border-slate-200 text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share Plan</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="rounded-xl text-xs font-bold gap-1.5 h-8 border-slate-200 text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Plan</span>
                </Button>
              </div>
            </div>

            {/* ─── 5 MEAL CARDS (REAL DATABASE DATA & CURRENCY) ─── */}
            <div className="space-y-3.5">
                {plan.meals.map((meal: DietaryMealItem) => {
                  const isAdded = addedBundles.has(meal.id);
                  const hasAvailableProducts = meal.products.some((product) => product.availableForCart === true);
                  const matchesActiveSection = activeSectionItem
                    ? meal.products.some((p) =>
                        activeSectionItem.items.some(
                          (item) =>
                            p.name.toLowerCase().includes(item.toLowerCase()) ||
                            item.toLowerCase().includes(p.name.toLowerCase()) ||
                            meal.title.toLowerCase().includes(item.toLowerCase()),
                        ) ||
                        meal.title.toLowerCase().includes(activeSectionItem.title.toLowerCase()) ||
                        meal.mealType.toLowerCase().includes(activeSectionItem.title.toLowerCase())
                      )
                    : false;

                return (
                  <div
                    key={meal.id}
                    className={`bg-white dark:bg-card rounded-2xl border p-4 sm:p-4.5 shadow-2xs hover:shadow-xs transition-all duration-200 ${
                      matchesActiveSection
                        ? "border-amber-500 ring-2 ring-amber-400/60 bg-amber-50/15 dark:bg-amber-950/10"
                        : "border-slate-200/80 dark:border-border/80"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
                      {/* Column 1: Time & Meal Type */}
                      <div className="w-24 shrink-0 flex flex-col items-center justify-center text-center">
                        <div className={`h-8 w-8 rounded-full border flex items-center justify-center shadow-2xs ${
                          matchesActiveSection
                            ? "bg-amber-400 border-amber-500 text-amber-950"
                            : "bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800"
                        }`}>
                          {getMealIcon(meal.iconType)}
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 mt-1 whitespace-nowrap">
                          {meal.time}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          {meal.mealType}
                        </span>
                        {matchesActiveSection && (
                          <span className="mt-1 bg-amber-400 text-amber-950 text-[8.5px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider">
                            ★ {activeSectionItem?.title}
                          </span>
                        )}
                      </div>

                      {/* Column 2: Image & Title */}
                      <div className="w-56 shrink-0 flex items-center gap-3">
                        <img
                          src={meal.image}
                          alt={meal.title}
                          className="h-16 w-16 sm:h-18 sm:w-18 rounded-2xl object-cover shadow-2xs border border-slate-100 shrink-0"
                        />
                        <div className="min-w-0">
                          <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 leading-snug">
                            {meal.title}
                          </h3>
                          <span className="inline-block bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full mt-1">
                            {meal.calories} kcal
                          </span>
                        </div>
                      </div>

                      {/* Column 3: Nutrition (Per Serving) Box */}
                      <div className="w-72 shrink-0 bg-slate-50/70 dark:bg-muted/30 p-2.5 rounded-2xl border border-slate-100 dark:border-border/40">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                          NUTRITION <span className="font-medium text-[9px]">(PER SERVING)</span>
                        </span>
                        <div className="grid grid-cols-5 gap-1 text-center text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Protein</span>
                            <span className="font-black text-slate-800 dark:text-slate-200">{meal.nutrition.protein}g</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Fat</span>
                            <span className="font-black text-slate-800 dark:text-slate-200">{meal.nutrition.fat}g</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Carbs</span>
                            <span className="font-black text-slate-800 dark:text-slate-200">{meal.nutrition.carbs}g</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Fibre</span>
                            <span className="font-black text-slate-800 dark:text-slate-200">{meal.nutrition.fibre}g</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Net Carbs</span>
                            <span className="font-black text-slate-800 dark:text-slate-200">{meal.nutrition.netCarbs}g</span>
                          </div>
                        </div>
                      </div>

                      {/* Column 4: Products Included List (Real DB Products) */}
                      <div className="flex-1 min-w-[200px]">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                          PRODUCTS INCLUDED
                        </span>
                        <div className="space-y-0.5 text-xs">
                          {meal.products.map((prod) => (
                            <div key={prod.id} className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate" title={prod.name}>
                                {prod.name}
                              </span>
                              <div className="flex items-center gap-2 text-slate-400 font-medium shrink-0">
                                <span>{prod.qty} {prod.unit}</span>
                                <span className="font-bold text-slate-900 dark:text-slate-100">
                                  {format(prod.price, { sourceCurrency: "GBP" })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Column 5: Add Bundle Button */}
                      <div className="w-32 shrink-0 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => addBundleMutation.mutate(meal)}
                          disabled={addBundleMutation.isPending || isAdded || !hasAvailableProducts}
                          title={hasAvailableProducts ? undefined : "This bundle is currently unavailable"}
                          className="w-full h-24 rounded-2xl border-2 border-emerald-500/70 bg-emerald-50/40 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60 p-2 flex flex-col items-center justify-center text-center transition-all group shadow-2xs cursor-pointer"
                        >
                          <ShoppingCart className="h-4 w-4 text-emerald-800 dark:text-emerald-400 mb-1 group-hover:scale-105 transition-transform" />
                          <span className="text-[11px] font-black text-emerald-900 dark:text-emerald-200 leading-tight">
                            {isAdded
                              ? "Added to Cart"
                              : !hasAvailableProducts
                                ? "Currently Unavailable"
                                : `Add ${meal.mealType === "BREAKFAST" ? "Breakfast" : meal.mealType === "LUNCH" ? "Lunch" : meal.mealType === "DINNER" ? "Dinner" : "Snack"} Bundle`}
                          </span>
                          <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 mt-1">
                            {format(meal.bundlePrice, { sourceCurrency: "GBP" })}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ─── 3. BOTTOM SUMMARY CARDS ─── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Complete Day Meal Summary Donut */}
              <div className="bg-white dark:bg-card p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-2">
                  COMPLETE DAY MEAL SUMMARY
                </span>
                <div className="flex items-center gap-4">
                  {/* Circular Gauge */}
                  <div className="relative h-20 w-20 rounded-full border-4 border-emerald-600 flex items-center justify-center shrink-0">
                    <div className="text-center">
                      <span className="text-sm font-black text-slate-900 dark:text-slate-100 block leading-tight">
                        {plan.totalCalories.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">kcal</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-600" />
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        Protein {plan.macronutrientBreakdown.protein.grams}g
                      </span>
                      <span className="text-slate-400 font-semibold">({plan.macronutrientBreakdown.protein.percentage}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-purple-600" />
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        Fat {plan.macronutrientBreakdown.fat.grams}g
                      </span>
                      <span className="text-slate-400 font-semibold">({plan.macronutrientBreakdown.fat.percentage}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        Carbs {plan.macronutrientBreakdown.carbs.grams}g
                      </span>
                      <span className="text-slate-400 font-semibold">({plan.macronutrientBreakdown.carbs.percentage}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Macronutrient Breakdown */}
              <div className="bg-white dark:bg-card p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-2">
                  MACRONUTRIENT BREAKDOWN
                </span>
                <div className="space-y-2.5">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-600">Protein {plan.macronutrientBreakdown.protein.grams}g</span>
                      <span className="text-emerald-700 font-black">{plan.macronutrientBreakdown.protein.percentage}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{ width: `${plan.macronutrientBreakdown.protein.percentage}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-600">Fat {plan.macronutrientBreakdown.fat.grams}g</span>
                      <span className="text-purple-700 font-black">{plan.macronutrientBreakdown.fat.percentage}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 rounded-full"
                        style={{ width: `${plan.macronutrientBreakdown.fat.percentage}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-600">Carbs {plan.macronutrientBreakdown.carbs.grams}g</span>
                      <span className="text-amber-700 font-black">{plan.macronutrientBreakdown.carbs.percentage}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${plan.macronutrientBreakdown.carbs.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Nutrients */}
              <div className="bg-white dark:bg-card p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-2">
                  ADDITIONAL NUTRIENTS
                </span>
                <div className="grid grid-cols-4 gap-2 text-center pt-2">
                  <div>
                    <Sprout className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
                    <span className="text-[10px] text-slate-400 block font-semibold">Fibre</span>
                    <span className="font-black text-xs text-slate-800 dark:text-slate-200">{plan.additionalNutrients.fibre}</span>
                  </div>
                  <div>
                    <Sun className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                    <span className="text-[10px] text-slate-400 block font-semibold">Sugar</span>
                    <span className="font-black text-xs text-slate-800 dark:text-slate-200">{plan.additionalNutrients.sugar}</span>
                  </div>
                  <div>
                    <Sparkles className="h-4 w-4 text-cyan-600 mx-auto mb-1" />
                    <span className="text-[10px] text-slate-400 block font-semibold">Sodium</span>
                    <span className="font-black text-xs text-slate-800 dark:text-slate-200">{plan.additionalNutrients.sodium}</span>
                  </div>
                  <div>
                    <Droplets className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                    <span className="text-[10px] text-slate-400 block font-semibold">Cholesterol</span>
                    <span className="font-black text-xs text-slate-800 dark:text-slate-200">{plan.additionalNutrients.cholesterol}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── RIGHT COLUMN: DASHBOARD & CHECKOUT ─── */}
          <div className="space-y-6">
            {/* 1. DAILY NUTRITION DASHBOARD */}
            <div className="bg-white dark:bg-card p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
              <h3 className="font-black text-sm text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                DAILY NUTRITION DASHBOARD
              </h3>

              <div className="space-y-3 text-xs">
                {/* Calories */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <Flame className="h-4 w-4 text-rose-500" />
                      <span>Calories</span>
                    </span>
                    <span className="font-black text-slate-900 dark:text-slate-100">
                      {plan.nutritionDashboard.calories.current.toLocaleString()}{" "}
                      <span className="text-slate-400 font-normal">/ {plan.nutritionDashboard.calories.target.toLocaleString()} kcal</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                      style={{ width: `${Math.min(100, plan.nutritionDashboard.calories.percentage)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold float-right mt-0.5">
                    {plan.nutritionDashboard.calories.percentage}%
                  </span>
                </div>

                {/* Protein */}
                <div className="pt-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <Dumbbell className="h-4 w-4 text-emerald-600" />
                      <span>Protein</span>
                    </span>
                    <span className="font-black text-slate-900 dark:text-slate-100">
                      {plan.nutritionDashboard.protein.current}{" "}
                      <span className="text-slate-400 font-normal">/ {plan.nutritionDashboard.protein.target} g</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${Math.min(100, plan.nutritionDashboard.protein.percentage)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-emerald-600 font-black float-right mt-0.5">
                    {plan.nutritionDashboard.protein.percentage}%
                  </span>
                </div>

                {/* Total Carbs */}
                <div className="pt-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <Wheat className="h-4 w-4 text-amber-500" />
                      <span>Total Carbs</span>
                    </span>
                    <span className="font-black text-slate-900 dark:text-slate-100">
                      {plan.nutritionDashboard.totalCarbs.current}{" "}
                      <span className="text-slate-400 font-normal">/ {plan.nutritionDashboard.totalCarbs.target} g</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${Math.min(100, plan.nutritionDashboard.totalCarbs.percentage)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold float-right mt-0.5">
                    {plan.nutritionDashboard.totalCarbs.percentage}%
                  </span>
                </div>

                {/* Net Carbs */}
                <div className="pt-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <Leaf className="h-4 w-4 text-emerald-600" />
                      <span>Net Carbs</span>
                    </span>
                    <span className="font-black text-slate-900 dark:text-slate-100">
                      {plan.nutritionDashboard.netCarbs.current}{" "}
                      <span className="text-slate-400 font-normal">/ {plan.nutritionDashboard.netCarbs.target} g</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${Math.min(100, plan.nutritionDashboard.netCarbs.percentage)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold float-right mt-0.5">
                    {plan.nutritionDashboard.netCarbs.percentage}%
                  </span>
                </div>

                {/* Total Fat */}
                <div className="pt-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <Droplets className="h-4 w-4 text-purple-600" />
                      <span>Total Fat</span>
                    </span>
                    <span className="font-black text-slate-900 dark:text-slate-100">
                      {plan.nutritionDashboard.totalFat.current}{" "}
                      <span className="text-slate-400 font-normal">/ {plan.nutritionDashboard.totalFat.target} g</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{ width: `${Math.min(100, plan.nutritionDashboard.totalFat.percentage)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-purple-600 font-black float-right mt-0.5">
                    {plan.nutritionDashboard.totalFat.percentage}%
                  </span>
                </div>

                {/* Fibre */}
                <div className="pt-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <Sprout className="h-4 w-4 text-emerald-600" />
                      <span>Fibre</span>
                    </span>
                    <span className="font-black text-slate-900 dark:text-slate-100">
                      {plan.nutritionDashboard.fibre.current}{" "}
                      <span className="text-slate-400 font-normal">/ {plan.nutritionDashboard.fibre.target} g</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${Math.min(100, plan.nutritionDashboard.fibre.percentage)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-emerald-600 font-black float-right mt-0.5">
                    {plan.nutritionDashboard.fibre.percentage}%
                  </span>
                </div>

                {/* Water Intake */}
                <div className="pt-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <Droplets className="h-4 w-4 text-cyan-600" />
                      <span>Water Intake</span>
                    </span>
                    <span className="font-black text-slate-900 dark:text-slate-100">
                      {plan.nutritionDashboard.waterIntake.current}{" "}
                      <span className="text-slate-400 font-normal">/ {plan.nutritionDashboard.waterIntake.target} L</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${Math.min(100, plan.nutritionDashboard.waterIntake.percentage)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-cyan-600 font-black float-right mt-0.5">
                    {plan.nutritionDashboard.waterIntake.percentage}%
                  </span>
                </div>
              </div>
            </div>

            {/* 2. COMPLETE DAY PLAN CHECKOUT CARD (REAL DB PRICING) */}
            <div className="bg-white dark:bg-card p-5 rounded-2xl border-2 border-emerald-500/60 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                  COMPLETE {plan.subcategory.toUpperCase()} PLAN
                </h3>
                <span className="bg-emerald-800 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                  Best Value
                </span>
              </div>

              {/* Tag Strip */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 bg-slate-50 dark:bg-muted/40 p-2.5 rounded-xl border border-slate-100">
                <span className="flex items-center gap-1">🍽 {plan.meals.length} Meals</span>
                <span className="flex items-center gap-1">
                  📦 {plan.meals.reduce((acc, m) => acc + m.products.length, 0)} Products
                </span>
                <span className="flex items-center gap-1">🛡 100% Farm Fresh</span>
              </div>

              {/* Price Calculation with Global Currency Context */}
              <div className="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Total Products Cost</span>
                  <span className="font-black text-slate-900 dark:text-slate-100">
                    {format(plan.pricing.totalProductsCost, { sourceCurrency: "GBP" })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Diet Plan Service Fee</span>
                  <span className="font-black text-slate-900 dark:text-slate-100">
                    {format(plan.pricing.dietPlanServiceFee, { sourceCurrency: "GBP" })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="font-black text-emerald-700">FREE</span>
                </div>

                <div className="border-t border-slate-200 dark:border-border/60 pt-2.5 flex items-baseline justify-between">
                  <span className="font-black text-sm text-slate-900 dark:text-slate-100">TOTAL AMOUNT</span>
                  <span className="font-black text-2xl text-slate-900 dark:text-slate-100">
                    {format(plan.pricing.totalAmount, { sourceCurrency: "GBP" })}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                onClick={() => buyCompletePlanMutation.mutate()}
                disabled={buyCompletePlanMutation.isPending}
                className="w-full h-11 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs sm:text-sm rounded-xl shadow-md gap-2 transition-all uppercase tracking-wide cursor-pointer"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>{buyCompletePlanMutation.isPending ? "ADDING PLAN…" : "BUY COMPLETE DAY PLAN"}</span>
              </Button>

              {/* Trust badges */}
              <p className="text-[11px] text-slate-400 text-center font-bold flex items-center justify-center gap-1.5 pt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Secure Payment • 7-Day Money Back Guarantee</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
