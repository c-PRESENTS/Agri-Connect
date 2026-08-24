import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
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

interface DietaryMealItem {
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
  products: {
    id: string;
    name: string;
    qty: number;
    unit: string;
    price: number;
    formattedPrice: string;
  }[];
  bundlePrice: number;
  bundlePriceFormatted: string;
}

const STATIC_PLAN = {
  id: "rorz-keto-day-plan",
  title: "Rorz's Keto Day Plan",
  totalCalories: 2394,
  seller: {
    name: "Aura Organic Foods",
    logo: "/category-logos/daily-needs.svg",
    verified: true,
    rating: 4.9,
    reviewCount: 1245,
    activeDietPlans: 12,
    ordersDelivered: 1245,
    tags: ["Keto Expert", "📍 Essex, UK", "🛍 Farm Fresh Ingredients"],
    bio: "Aura Organic Foods provides customised keto meal plans with 100% organic, farm-fresh ingredients sourced directly from trusted local farmers.",
    farmerPhoto: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=500&auto=format&fit=crop&q=80",
    storeUrl: "/sellers",
  },
  meals: [
    {
      id: "meal-1-breakfast",
      time: "7:30 AM",
      mealType: "BREAKFAST",
      title: "Chicken & Avocado Bowl",
      calories: 540,
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80",
      iconType: "sun",
      nutrition: { protein: 46, fat: 36, carbs: 8, fibre: 7, netCarbs: 4 },
      products: [
        { id: "p-chk-1", name: "Chicken Breast", qty: 250, unit: "g", price: 4.50, formattedPrice: "£4.50" },
        { id: "p-avo-1", name: "Hass Avocado", qty: 2, unit: "pcs", price: 2.80, formattedPrice: "£2.80" },
        { id: "p-oil-1", name: "Olive Oil (Extra Virgin)", qty: 20, unit: "ml", price: 0.50, formattedPrice: "£0.50" },
        { id: "p-lem-1", name: "Lemon", qty: 1, unit: "pcs", price: 0.30, formattedPrice: "£0.30" },
      ],
      bundlePrice: 8.10,
      bundlePriceFormatted: "£8.10",
    },
    {
      id: "meal-2-morning-snack",
      time: "10:30 AM",
      mealType: "MORNING SNACK",
      title: "Protein Shake & Kiwi",
      calories: 220,
      image: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&auto=format&fit=crop&q=80",
      iconType: "snack",
      nutrition: { protein: 25, fat: 6, carbs: 6, fibre: 3, netCarbs: 3 },
      products: [
        { id: "p-pro-1", name: "Whey Protein (Unflavoured)", qty: 1, unit: "scoop", price: 1.20, formattedPrice: "£1.20" },
        { id: "p-kiwi-1", name: "Kiwi", qty: 1, unit: "pcs", price: 0.40, formattedPrice: "£0.40" },
        { id: "p-mlk-1", name: "Almond Milk (Unsweetened)", qty: 200, unit: "ml", price: 0.40, formattedPrice: "£0.40" },
      ],
      bundlePrice: 2.00,
      bundlePriceFormatted: "£2.00",
    },
    {
      id: "meal-3-lunch",
      time: "1:00 PM",
      mealType: "LUNCH",
      title: "Steak & Eggs",
      calories: 580,
      image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80",
      iconType: "lunch",
      nutrition: { protein: 40, fat: 42, carbs: 5, fibre: 2, netCarbs: 3 },
      products: [
        { id: "p-stk-1", name: "Lean Rump Steak", qty: 400, unit: "g", price: 7.90, formattedPrice: "£7.90" },
        { id: "p-egg-1", name: "Farm Fresh Eggs", qty: 4, unit: "pcs", price: 1.20, formattedPrice: "£1.20" },
        { id: "p-but-1", name: "Butter (Grass Fed)", qty: 10, unit: "g", price: 0.30, formattedPrice: "£0.30" },
        { id: "p-grn-1", name: "Mixed Leaf Greens", qty: 50, unit: "g", price: 0.60, formattedPrice: "£0.60" },
      ],
      bundlePrice: 10.00,
      bundlePriceFormatted: "£10.00",
    },
    {
      id: "meal-4-evening-snack",
      time: "4:30 PM",
      mealType: "EVENING SNACK",
      title: "Matcha Green Tea",
      calories: 120,
      image: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&auto=format&fit=crop&q=80",
      iconType: "tea",
      nutrition: { protein: 4, fat: 2, carbs: 2, fibre: 1, netCarbs: 1 },
      products: [
        { id: "p-tea-1", name: "Matcha Green Tea Powder", qty: 1, unit: "tsp", price: 0.80, formattedPrice: "£0.80" },
        { id: "p-alm-1", name: "Almonds", qty: 10, unit: "pcs", price: 0.60, formattedPrice: "£0.60" },
      ],
      bundlePrice: 1.40,
      bundlePriceFormatted: "£1.40",
    },
    {
      id: "meal-5-dinner",
      time: "7:30 PM",
      mealType: "DINNER",
      title: "Salmon & Asparagus",
      calories: 934,
      image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&auto=format&fit=crop&q=80",
      iconType: "moon",
      nutrition: { protein: 71, fat: 86, carbs: 13, fibre: 7, netCarbs: 6 },
      products: [
        { id: "p-sal-1", name: "Atlantic Salmon Fillet", qty: 200, unit: "g", price: 5.80, formattedPrice: "£5.80" },
        { id: "p-asp-1", name: "Asparagus", qty: 150, unit: "g", price: 1.60, formattedPrice: "£1.60" },
        { id: "p-oil-2", name: "Olive Oil (Extra Virgin)", qty: 15, unit: "ml", price: 0.40, formattedPrice: "£0.40" },
      ],
      bundlePrice: 7.80,
      bundlePriceFormatted: "£7.80",
    },
  ] as DietaryMealItem[],
  nutritionDashboard: {
    calories: { current: 2394, target: 2500, percentage: 96 },
    protein: { current: 186, target: 180, percentage: 103 },
    totalCarbs: { current: 34, target: 50, percentage: 68 },
    netCarbs: { current: 17, target: 30, percentage: 57 },
    totalFat: { current: 172, target: 170, percentage: 101 },
    fibre: { current: 26, target: 25, percentage: 104 },
    waterIntake: { current: 3.0, target: 3.0, percentage: 100, unit: "L" },
  },
  macronutrientBreakdown: {
    protein: { grams: 186, percentage: 31 },
    fat: { grams: 172, percentage: 65 },
    carbs: { grams: 34, percentage: 6 },
  },
  additionalNutrients: {
    fibre: "26g",
    sugar: "6g",
    sodium: "1,240mg",
    cholesterol: "586mg",
  },
  pricing: {
    totalProductsCost: 37.50,
    dietPlanServiceFee: 5.00,
    deliveryCharges: 0,
    totalAmount: 42.50,
  },
};

export function DietaryComingSoon({ products = [] }: { products?: Product[] }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { format } = useCurrency();

  const [addedBundles, setAddedBundles] = useState<Set<string>>(new Set());
  const [isFollowing, setIsFollowing] = useState(false);

  // Fetch dynamic plan from backend or fallback to STATIC_PLAN
  const { data: plan = STATIC_PLAN } = useQuery<typeof STATIC_PLAN>({
    queryKey: ["/api/dietary/plans/keto-day"],
    staleTime: 60_000,
  });

  // Mutation to add individual meal bundle
  const addBundleMutation = useMutation({
    mutationFn: async (meal: DietaryMealItem) => {
      const res = await apiRequest("POST", "/api/dietary/add-bundle", {
        mealId: meal.id,
        bundleTitle: `${meal.title} Bundle`,
        price: meal.bundlePrice,
        products: meal.products,
      });
      return res.json();
    },
    onSuccess: (_data, meal) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      setAddedBundles((prev) => new Set(prev).add(meal.id));
      toast({
        title: `Added ${meal.title} Bundle to Cart!`,
        description: `${meal.products.length} fresh ingredients included (${meal.bundlePriceFormatted})`,
      });
    },
    onError: () => {
      toast({ title: "Failed to add bundle to cart", variant: "destructive" });
    },
  });

  // Mutation to buy complete day plan
  const buyCompletePlanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/dietary/buy-complete-plan", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Complete Day Keto Plan Added!",
        description: "12 farm-fresh products & custom meal guide (£42.50) added to your cart.",
      });
    },
    onError: () => {
      toast({ title: "Failed to order complete plan", variant: "destructive" });
    },
  });

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: "Rorz's Keto Day Plan - Aura Organic Foods",
          text: "Check out this customized keto day meal plan with 100% organic farm fresh ingredients on AgriConnect!",
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Plan link copied to clipboard!" });
    }
  };

  const handleDownload = () => {
    toast({
      title: "Downloading Diet Plan PDF...",
      description: "Rorz's Keto Day Plan with full nutritional guide & recipe instructions.",
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

  return (
    <div className="h-full overflow-y-auto bg-[#f8fafc] dark:bg-background text-slate-900 dark:text-slate-100 pb-20">
      {/* ─── 0. TOP BANNER ─── */}
      <div className="bg-[#1e4d2b] text-white px-4 py-2.5 flex items-center justify-between border-b border-emerald-900 shadow-xs">
        <h2 className="font-bold text-sm sm:text-base tracking-wide flex items-center gap-2">
          <span>14. Dietary Page - Coming Soon</span>
        </h2>
        <span className="bg-[#163a20] text-emerald-200 text-xs font-black px-3 py-1 rounded-sm border border-emerald-700/50 uppercase tracking-widest">
          TO DO
        </span>
      </div>

      <div className="px-4 py-2 bg-slate-100 dark:bg-muted/40 border-b border-slate-200/80 text-xs font-semibold text-slate-600 dark:text-slate-400">
        Mark the Dietary page as &ldquo;Coming Soon&rdquo;. A diet chart should be displayed on the right-hand side of the page.
      </div>

      {/* ─── MAIN CONTAINER ─── */}
      <div className="max-w-[1550px] mx-auto p-4 sm:p-6 space-y-6">
        {/* ─── 1. SELLER / CREATOR PROFILE CARD ─── */}
        <div className="bg-white dark:bg-card rounded-2xl border border-slate-200/80 dark:border-border/80 p-5 shadow-2xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4 flex-1">
            {/* Logo */}
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border border-slate-200 dark:border-border/80 bg-white dark:bg-muted flex flex-col items-center justify-center p-2 text-center shrink-0 shadow-xs">
              <Sprout className="h-6 w-6 text-emerald-600 mb-0.5" />
              <span className="text-[8px] font-black text-emerald-950 dark:text-emerald-300 leading-tight uppercase">
                Aura Organic
              </span>
            </div>

            {/* Seller Info */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {plan.seller.name}
                </h1>
                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="h-3 w-3" /> Verified Seller
                </span>
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
                className="flex-1 sm:flex-none border-slate-300 dark:border-border font-bold text-xs rounded-xl h-9 px-5 shadow-2xs hover:bg-slate-50"
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

            {/* ─── 5 MEAL CARDS EXACT FORMATTING & SPACING ─── */}
            <div className="space-y-3.5">
              {plan.meals.map((meal: DietaryMealItem) => {
                const isAdded = addedBundles.has(meal.id);

                return (
                  <div
                    key={meal.id}
                    className="bg-white dark:bg-card rounded-2xl border border-slate-200/80 dark:border-border/80 p-4 sm:p-4.5 shadow-2xs hover:shadow-xs transition-all duration-200"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
                      {/* Column 1: Time & Meal Type */}
                      <div className="w-24 shrink-0 flex flex-col items-center justify-center text-center">
                        <div className="h-8 w-8 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800 flex items-center justify-center shadow-2xs">
                          {getMealIcon(meal.iconType)}
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 mt-1 whitespace-nowrap">
                          {meal.time}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          {meal.mealType}
                        </span>
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

                      {/* Column 4: Products Included List */}
                      <div className="flex-1 min-w-[200px]">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                          PRODUCTS INCLUDED
                        </span>
                        <div className="space-y-0.5 text-xs">
                          {meal.products.map((prod) => (
                            <div key={prod.id} className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{prod.name}</span>
                              <div className="flex items-center gap-2 text-slate-400 font-medium shrink-0">
                                <span>{prod.qty} {prod.unit}</span>
                                <span className="font-bold text-slate-900 dark:text-slate-100">{prod.formattedPrice}</span>
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
                          disabled={addBundleMutation.isPending}
                          className="w-full h-24 rounded-2xl border-2 border-emerald-500/70 bg-emerald-50/40 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60 p-2 flex flex-col items-center justify-center text-center transition-all group shadow-2xs"
                        >
                          <ShoppingCart className="h-4 w-4 text-emerald-800 dark:text-emerald-400 mb-1 group-hover:scale-105 transition-transform" />
                          <span className="text-[11px] font-black text-emerald-900 dark:text-emerald-200 leading-tight">
                            {isAdded ? "Added to Cart" : `Add ${meal.mealType === "BREAKFAST" ? "Breakfast" : meal.mealType === "LUNCH" ? "Lunch" : meal.mealType === "DINNER" ? "Dinner" : "Snack"} Bundle`}
                          </span>
                          <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 mt-1">
                            {meal.bundlePriceFormatted}
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
                        2,394
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">kcal</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-600" />
                      <span className="font-bold text-slate-700 dark:text-slate-200">Protein 186g</span>
                      <span className="text-slate-400 font-semibold">(31%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-purple-600" />
                      <span className="font-bold text-slate-700 dark:text-slate-200">Fat 172g</span>
                      <span className="text-slate-400 font-semibold">(65%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="font-bold text-slate-700 dark:text-slate-200">Carbs 34g</span>
                      <span className="text-slate-400 font-semibold">(6%)</span>
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
                      <span className="text-slate-600">Protein 186g</span>
                      <span className="text-emerald-700 font-black">31%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: "31%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-600">Fat 172g</span>
                      <span className="text-purple-700 font-black">65%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-600 rounded-full" style={{ width: "65%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-600">Carbs 34g</span>
                      <span className="text-amber-700 font-black">6%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: "6%" }} />
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
                      2,394 <span className="text-slate-400 font-normal">/ 2,500 kcal</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full" style={{ width: "96%" }} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold float-right mt-0.5">96%</span>
                </div>

                {/* Protein */}
                <div className="pt-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <Dumbbell className="h-4 w-4 text-emerald-600" />
                      <span>Protein</span>
                    </span>
                    <span className="font-black text-slate-900 dark:text-slate-100">
                      186 <span className="text-slate-400 font-normal">/ 180 g</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: "100%" }} />
                  </div>
                  <span className="text-[10px] text-emerald-600 font-black float-right mt-0.5">103%</span>
                </div>

                {/* Total Carbs */}
                <div className="pt-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <Wheat className="h-4 w-4 text-amber-500" />
                      <span>Total Carbs</span>
                    </span>
                    <span className="font-black text-slate-900 dark:text-slate-100">
                      34 <span className="text-slate-400 font-normal">/ 50 g</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: "68%" }} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold float-right mt-0.5">68%</span>
                </div>

                {/* Net Carbs */}
                <div className="pt-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <Leaf className="h-4 w-4 text-emerald-600" />
                      <span>Net Carbs</span>
                    </span>
                    <span className="font-black text-slate-900 dark:text-slate-100">
                      17 <span className="text-slate-400 font-normal">/ 30 g</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: "57%" }} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold float-right mt-0.5">57%</span>
                </div>

                {/* Total Fat */}
                <div className="pt-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <Droplets className="h-4 w-4 text-purple-600" />
                      <span>Total Fat</span>
                    </span>
                    <span className="font-black text-slate-900 dark:text-slate-100">
                      172 <span className="text-slate-400 font-normal">/ 170 g</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600 rounded-full" style={{ width: "100%" }} />
                  </div>
                  <span className="text-[10px] text-purple-600 font-black float-right mt-0.5">101%</span>
                </div>

                {/* Fibre */}
                <div className="pt-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <Sprout className="h-4 w-4 text-emerald-600" />
                      <span>Fibre</span>
                    </span>
                    <span className="font-black text-slate-900 dark:text-slate-100">
                      26 <span className="text-slate-400 font-normal">/ 25 g</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: "100%" }} />
                  </div>
                  <span className="text-[10px] text-emerald-600 font-black float-right mt-0.5">104%</span>
                </div>

                {/* Water Intake */}
                <div className="pt-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <Droplets className="h-4 w-4 text-cyan-600" />
                      <span>Water Intake</span>
                    </span>
                    <span className="font-black text-slate-900 dark:text-slate-100">
                      3.0 <span className="text-slate-400 font-normal">/ 3.0 L</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: "100%" }} />
                  </div>
                  <span className="text-[10px] text-cyan-600 font-black float-right mt-0.5">100%</span>
                </div>
              </div>
            </div>

            {/* 2. COMPLETE DAY KETO PLAN CHECKOUT CARD */}
            <div className="bg-white dark:bg-card p-5 rounded-2xl border-2 border-emerald-500/60 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                  COMPLETE DAY KETO PLAN
                </h3>
                <span className="bg-emerald-800 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                  Best Value
                </span>
              </div>

              {/* Tag Strip */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 bg-slate-50 dark:bg-muted/40 p-2.5 rounded-xl border border-slate-100">
                <span className="flex items-center gap-1">🍽 5 Meals</span>
                <span className="flex items-center gap-1">📦 12 Products</span>
                <span className="flex items-center gap-1">🛡 100% Keto</span>
              </div>

              {/* Price Calculation */}
              <div className="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Total Products Cost</span>
                  <span className="font-black text-slate-900 dark:text-slate-100">£37.50</span>
                </div>
                <div className="flex justify-between">
                  <span>Diet Plan Service Fee</span>
                  <span className="font-black text-slate-900 dark:text-slate-100">£5.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="font-black text-emerald-700">FREE</span>
                </div>

                <div className="border-t border-slate-200 dark:border-border/60 pt-2.5 flex items-baseline justify-between">
                  <span className="font-black text-sm text-slate-900 dark:text-slate-100">TOTAL AMOUNT</span>
                  <span className="font-black text-2xl text-slate-900 dark:text-slate-100">£42.50</span>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                onClick={() => buyCompletePlanMutation.mutate()}
                disabled={buyCompletePlanMutation.isPending}
                className="w-full h-11 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs sm:text-sm rounded-xl shadow-md gap-2 transition-all uppercase tracking-wide"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>BUY COMPLETE DAY PLAN</span>
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
