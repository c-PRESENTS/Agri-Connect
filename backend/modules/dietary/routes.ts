import type { Express, Request, Response } from "express";
import { storage } from "../../storage";

export interface DietaryProductItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  formattedPrice: string;
}

export interface DietaryMeal {
  id: string;
  time: string;
  mealType: "BREAKFAST" | "MORNING SNACK" | "LUNCH" | "EVENING SNACK" | "DINNER";
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
  title: string;
  totalCalories: number;
  seller: {
    name: string;
    logo: string;
    verified: boolean;
    rating: number;
    reviewCount: number;
    activeDietPlans: number;
    ordersDelivered: number;
    tags: string[];
    bio: string;
    farmerPhoto: string;
    storeUrl: string;
  };
  meals: DietaryMeal[];
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

export const KETO_DAY_PLAN: DietaryPlanData = {
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
      nutrition: {
        protein: 46,
        fat: 36,
        carbs: 8,
        fibre: 7,
        netCarbs: 4,
      },
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
      nutrition: {
        protein: 25,
        fat: 6,
        carbs: 6,
        fibre: 3,
        netCarbs: 3,
      },
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
      nutrition: {
        protein: 40,
        fat: 42,
        carbs: 5,
        fibre: 2,
        netCarbs: 3,
      },
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
      nutrition: {
        protein: 4,
        fat: 2,
        carbs: 2,
        fibre: 1,
        netCarbs: 1,
      },
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
      nutrition: {
        protein: 71,
        fat: 86,
        carbs: 13,
        fibre: 7,
        netCarbs: 6,
      },
      products: [
        { id: "p-sal-1", name: "Atlantic Salmon Fillet", qty: 200, unit: "g", price: 5.80, formattedPrice: "£5.80" },
        { id: "p-asp-1", name: "Asparagus", qty: 150, unit: "g", price: 1.60, formattedPrice: "£1.60" },
        { id: "p-oil-2", name: "Olive Oil (Extra Virgin)", qty: 15, unit: "ml", price: 0.40, formattedPrice: "£0.40" },
      ],
      bundlePrice: 7.80,
      bundlePriceFormatted: "£7.80",
    },
  ],
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

export function registerDietaryRoutes(
  app: Express,
  deps: { getUserIdOrSession(req: Request): string },
): void {
  // Get active keto / diet plan
  app.get("/api/dietary/plans/keto-day", (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "public, max-age=120");
    return res.json(KETO_DAY_PLAN);
  });

  // Order individual meal bundle into user cart
  app.post("/api/dietary/add-bundle", async (req: Request, res: Response) => {
    const { mealId, bundleTitle, price, products } = req.body;
    const userIdOrSession = deps.getUserIdOrSession(req);

    try {
      if (Array.isArray(products) && products.length > 0) {
        for (const item of products) {
          const productId = item.id || `diet-${mealId}-${Math.random().toString(36).slice(2, 6)}`;
          await storage.addToCart(userIdOrSession, productId, 1, { unitPrice: item.price });
        }
      } else {
        const productId = `bundle-${mealId || Date.now()}`;
        await storage.addToCart(userIdOrSession, productId, 1, { unitPrice: price || 8.10 });
      }

      return res.json({
        success: true,
        message: `Added ${bundleTitle || "Meal Bundle"} to cart!`,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to add bundle to cart" });
    }
  });

  // Order complete day plan
  app.post("/api/dietary/buy-complete-plan", async (req: Request, res: Response) => {
    const userIdOrSession = deps.getUserIdOrSession(req);

    try {
      // Add all 5 meal bundles / 12 products
      for (const meal of KETO_DAY_PLAN.meals) {
        for (const product of meal.products) {
          await storage.addToCart(userIdOrSession, product.id, 1, { unitPrice: product.price });
        }
      }

      return res.json({
        success: true,
        message: "Complete 12-product Day Keto Plan added to your cart!",
        totalAmount: KETO_DAY_PLAN.pricing.totalAmount,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to order complete plan" });
    }
  });
}
