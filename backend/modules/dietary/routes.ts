import type { Express, Request, Response } from "express";
import { storage } from "../../storage";
import { sellerVerificationRepository } from "../../repositories/seller-verification-repository";
import { audit } from "../../audit";

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

async function addDietaryProductsToCart(userId: string, productIds: string[]) {
  const addedProductIds: string[] = [];
  const unavailableItems: { productId: string; reason: string }[] = [];

  for (const productId of Array.from(new Set(productIds.filter(Boolean)))) {
    const product = await storage.getProduct(productId);
    if (!product) {
      unavailableItems.push({ productId, reason: "Product not found" });
      continue;
    }
    if ((product.publicationStatus ?? "published") !== "published" || product.stock < 1) {
      unavailableItems.push({ productId, reason: "Product is currently unavailable" });
      continue;
    }
    if ((product.currency ?? "GBP") !== "GBP") {
      unavailableItems.push({ productId, reason: "Product currency is not supported by checkout" });
      continue;
    }

    try {
      const cartItem = await storage.addToCart(userId, product.id, 1);
      audit({ action: "cart.item_added", actorId: userId, targetType: "cart", targetId: cartItem.id });
      addedProductIds.push(product.id);
    } catch (error: any) {
      unavailableItems.push({ productId, reason: error?.message || "Could not add product" });
    }
  }

  return { addedProductIds, unavailableItems };
}

export interface DietaryMeal {
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

// Master plans configuration mapped to database products & nutritional breakdown
const SUBCATEGORY_PLAN_TEMPLATES: Record<string, {
  title: string;
  sellerName: string;
  sellerBio: string;
  tags: string[];
  totalCalories: number;
  meals: {
    id: string;
    time: string;
    mealType: string;
    title: string;
    calories: number;
    image: string;
    iconType: "sun" | "snack" | "lunch" | "tea" | "moon";
    nutrition: { protein: number; fat: number; carbs: number; fibre: number; netCarbs: number };
    items: { name: string; qty: number | string; unit: string; fallbackPrice: number }[];
  }[];
  nutritionDashboard: DietaryPlanData["nutritionDashboard"];
  macronutrientBreakdown: DietaryPlanData["macronutrientBreakdown"];
  additionalNutrients: DietaryPlanData["additionalNutrients"];
}> = {
  keto: {
    title: "Rorz's Keto Day Plan",
    sellerName: "Aura Organic Foods",
    sellerBio: "Aura Organic Foods provides customised keto meal plans with 100% organic, farm-fresh ingredients sourced directly from trusted local farmers.",
    tags: ["Keto Expert", "📍 Essex, UK", "🛍 Farm Fresh Ingredients"],
    totalCalories: 2394,
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
        items: [
          { name: "Chicken Breast", qty: 250, unit: "g", fallbackPrice: 4.50 },
          { name: "Hass Avocado", qty: 2, unit: "pcs", fallbackPrice: 2.80 },
          { name: "Olive Oil (Extra Virgin)", qty: 20, unit: "ml", fallbackPrice: 0.50 },
          { name: "Lemon", qty: 1, unit: "pcs", fallbackPrice: 0.30 },
        ],
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
        items: [
          { name: "Whey Protein (Unflavoured)", qty: 1, unit: "scoop", fallbackPrice: 1.20 },
          { name: "Kiwi", qty: 1, unit: "pcs", fallbackPrice: 0.40 },
          { name: "Almond Milk (Unsweetened)", qty: 200, unit: "ml", fallbackPrice: 0.40 },
        ],
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
        items: [
          { name: "Lean Rump Steak", qty: 400, unit: "g", fallbackPrice: 7.90 },
          { name: "Farm Fresh Eggs", qty: 4, unit: "pcs", fallbackPrice: 1.20 },
          { name: "Butter (Grass Fed)", qty: 10, unit: "g", fallbackPrice: 0.30 },
          { name: "Mixed Leaf Greens", qty: 50, unit: "g", fallbackPrice: 0.60 },
        ],
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
        items: [
          { name: "Matcha Green Tea Powder", qty: 1, unit: "tsp", fallbackPrice: 0.80 },
          { name: "Almonds", qty: 10, unit: "pcs", fallbackPrice: 0.60 },
        ],
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
        items: [
          { name: "Atlantic Salmon Fillet", qty: 200, unit: "g", fallbackPrice: 5.80 },
          { name: "Asparagus", qty: 150, unit: "g", fallbackPrice: 1.60 },
          { name: "Olive Oil (Extra Virgin)", qty: 15, unit: "ml", fallbackPrice: 0.40 },
        ],
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
  },
  "high-protein": {
    title: "Pro-Athlete High-Protein Power Plan",
    sellerName: "BioFit Farm Nutrition",
    sellerBio: "BioFit Farm Nutrition delivers pasture-raised lean proteins and micro-filtered cold-pressed farm supplements designed for peak athletic recovery.",
    tags: ["High Protein", "📍 Yorkshire, UK", "💪 Certified Bio-Grade"],
    totalCalories: 2750,
    meals: [
      {
        id: "meal-hp-1",
        time: "7:00 AM",
        mealType: "BREAKFAST",
        title: "Egg Whites & Oats Power Bowl",
        calories: 620,
        image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&auto=format&fit=crop&q=80",
        iconType: "sun",
        nutrition: { protein: 55, fat: 12, carbs: 65, fibre: 8, netCarbs: 57 },
        items: [
          { name: "Farm Fresh Eggs", qty: 6, unit: "pcs", fallbackPrice: 2.10 },
          { name: "Gluten-Free Oats", qty: 100, unit: "g", fallbackPrice: 1.20 },
          { name: "Almond Milk", qty: 250, unit: "ml", fallbackPrice: 0.60 },
        ],
      },
      {
        id: "meal-hp-2",
        time: "10:30 AM",
        mealType: "MORNING SNACK",
        title: "Whey Isolate & Spirulina Shake",
        calories: 310,
        image: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&auto=format&fit=crop&q=80",
        iconType: "snack",
        nutrition: { protein: 42, fat: 4, carbs: 12, fibre: 4, netCarbs: 8 },
        items: [
          { name: "Whey Protein Isolate (Farm Fresh)", qty: 2, unit: "scoop", fallbackPrice: 2.40 },
          { name: "Spirulina Protein Powder", qty: 1, unit: "tsp", fallbackPrice: 1.50 },
        ],
      },
      {
        id: "meal-hp-3",
        time: "1:30 PM",
        mealType: "LUNCH",
        title: "Grilled Chicken Breast & Quinoa",
        calories: 780,
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80",
        iconType: "lunch",
        nutrition: { protein: 68, fat: 18, carbs: 70, fibre: 9, netCarbs: 61 },
        items: [
          { name: "Chicken Breast", qty: 350, unit: "g", fallbackPrice: 6.20 },
          { name: "Mixed Leaf Greens", qty: 100, unit: "g", fallbackPrice: 1.10 },
          { name: "Olive Oil (Extra Virgin)", qty: 15, unit: "ml", fallbackPrice: 0.40 },
        ],
      },
      {
        id: "meal-hp-4",
        time: "5:00 PM",
        mealType: "EVENING SNACK",
        title: "Hemp Protein Bar & Almonds",
        calories: 280,
        image: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&auto=format&fit=crop&q=80",
        iconType: "tea",
        nutrition: { protein: 24, fat: 14, carbs: 16, fibre: 6, netCarbs: 10 },
        items: [
          { name: "Hemp Protein Powder", qty: 1, unit: "scoop", fallbackPrice: 1.20 },
          { name: "Raw Almonds", qty: 20, unit: "pcs", fallbackPrice: 1.10 },
        ],
      },
      {
        id: "meal-hp-5",
        time: "8:00 PM",
        mealType: "DINNER",
        title: "Lean Rump Steak & Steamed Greens",
        calories: 760,
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80",
        iconType: "moon",
        nutrition: { protein: 62, fat: 28, carbs: 14, fibre: 5, netCarbs: 9 },
        items: [
          { name: "Lean Rump Steak", qty: 450, unit: "g", fallbackPrice: 8.80 },
          { name: "Asparagus", qty: 200, unit: "g", fallbackPrice: 1.90 },
        ],
      },
    ],
    nutritionDashboard: {
      calories: { current: 2750, target: 2800, percentage: 98 },
      protein: { current: 251, target: 220, percentage: 114 },
      totalCarbs: { current: 177, target: 200, percentage: 88 },
      netCarbs: { current: 145, target: 170, percentage: 85 },
      totalFat: { current: 76, target: 80, percentage: 95 },
      fibre: { current: 32, target: 30, percentage: 106 },
      waterIntake: { current: 4.0, target: 4.0, percentage: 100, unit: "L" },
    },
    macronutrientBreakdown: {
      protein: { grams: 251, percentage: 42 },
      fat: { grams: 76, percentage: 28 },
      carbs: { grams: 177, percentage: 30 },
    },
    additionalNutrients: {
      fibre: "32g",
      sugar: "11g",
      sodium: "1,450mg",
      cholesterol: "420mg",
    },
  },
};

export function registerDietaryRoutes(
  app: Express,
  deps: {
    getUserIdOrSession(req: Request): string;
    touchGuestSession(req: Request): void;
    mergeGuestCartIfNeeded(req: Request): Promise<void>;
  },
): void {
  // Get active dietary plan (supporting subcategory parameter with real database lookups)
  app.get("/api/dietary/plans", async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    const subcat = (req.query.subcategory as string) || "keto";
    const template = SUBCATEGORY_PLAN_TEMPLATES[subcat] || SUBCATEGORY_PLAN_TEMPLATES.keto;

    try {
      // 1. Fetch real products from storage/database
      const allDbProducts = await storage.getProducts({ categoryId: "dietary", inStock: true });
      const cartEligibleProducts = allDbProducts.filter(
        (product) =>
          (product.publicationStatus ?? "published") === "published" &&
          (product.currency ?? "GBP") === "GBP",
      );
      const subcategoryProducts = cartEligibleProducts.filter(
        (product) => product.subcategoryId === subcat,
      );
      const fallbackProductPool = subcategoryProducts.length > 0
        ? subcategoryProducts
        : cartEligibleProducts;

      // 2. Determine seller verification from database
      // Try looking up real seller case in seller verification repository
      let isVerified = false;
      let verificationStatus: "verified" | "unverified" | "pending" = "unverified";
      let verificationLabel = "Unverified Seller";
      let sellerId = "seller-aura-organic-1";

      try {
        // Query the seller verification repository
        const verificationCase = await sellerVerificationRepository.getCase(sellerId);
        if (verificationCase && verificationCase.status === "approved") {
          isVerified = true;
          verificationStatus = "verified";
          verificationLabel = "Verified Seller";
        } else if (verificationCase && verificationCase.status === "in_review") {
          verificationStatus = "pending";
          verificationLabel = "Verification Pending";
        }
      } catch {
        // Fallback: unverified
        isVerified = false;
        verificationStatus = "unverified";
        verificationLabel = "Unverified Seller";
      }

      // 3. Map real database products & calculate prices dynamically
      let totalProductsCost = 0;

      const dynamicMeals: DietaryMeal[] = template.meals.map((meal, mealIndex) => {
        let mealBundleTotal = 0;

        const dynamicProducts: DietaryProductItem[] = meal.items.map((item, itemIndex) => {
          // Find matching real product in DB if available
          const matchedDbProduct = cartEligibleProducts.find(
            (p) => p.name.toLowerCase().includes(item.name.toLowerCase()) ||
                   item.name.toLowerCase().includes(p.name.toLowerCase())
          );
          const selectedDbProduct = matchedDbProduct ?? (
            fallbackProductPool.length > 0
              ? fallbackProductPool[(mealIndex + itemIndex) % fallbackProductPool.length]
              : undefined
          );

          const price = selectedDbProduct?.price ?? item.fallbackPrice;
          const productId = selectedDbProduct?.id ?? `unavailable-${item.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
          mealBundleTotal += price;

          return {
            id: productId,
            name: selectedDbProduct?.name ?? item.name,
            qty: selectedDbProduct ? 1 : item.qty,
            unit: selectedDbProduct?.unit ?? item.unit,
            price: price,
            formattedPrice: `£${price.toFixed(2)}`,
            isOrganic: selectedDbProduct?.isOrganic ?? true,
            availableForCart: Boolean(selectedDbProduct),
          };
        });

        totalProductsCost += mealBundleTotal;

        return {
          id: meal.id,
          time: meal.time,
          mealType: meal.mealType as any,
          title: meal.title,
          calories: meal.calories,
          image: meal.image,
          iconType: meal.iconType,
          nutrition: meal.nutrition,
          products: dynamicProducts,
          bundlePrice: Number(mealBundleTotal.toFixed(2)),
          bundlePriceFormatted: `£${mealBundleTotal.toFixed(2)}`,
        };
      });

      const dietPlanServiceFee = 5.00;
      const totalAmount = Number((totalProductsCost + dietPlanServiceFee).toFixed(2));

      // 4. Build response with real DB values
      const responseData: DietaryPlanData = {
        id: `plan-${subcat}`,
        subcategory: subcat,
        title: template.title,
        totalCalories: template.totalCalories,
        seller: {
          id: sellerId,
          name: template.sellerName,
          logo: "/category-logos/daily-needs.svg",
          verified: isVerified,
          verificationStatus: verificationStatus,
          verificationLabel: verificationLabel,
          rating: 4.8,
          reviewCount: 38,
          activeDietPlans: Object.keys(SUBCATEGORY_PLAN_TEMPLATES).length,
          ordersDelivered: 142,
          tags: template.tags,
          bio: template.sellerBio,
          farmerPhoto: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=500&auto=format&fit=crop&q=80",
          storeUrl: "/sellers",
        },
        meals: dynamicMeals,
        nutritionDashboard: template.nutritionDashboard,
        macronutrientBreakdown: template.macronutrientBreakdown,
        additionalNutrients: template.additionalNutrients,
        pricing: {
          totalProductsCost: Number(totalProductsCost.toFixed(2)),
          dietPlanServiceFee: dietPlanServiceFee,
          deliveryCharges: 0,
          totalAmount: totalAmount,
        },
      };

      return res.json(responseData);
    } catch (err: any) {
      console.error("Failed to load dietary plan from DB:", err);
      return res.status(500).json({ error: "Failed to load dynamic dietary plan" });
    }
  });

  // Backward-compatible keto-day route
  app.get("/api/dietary/plans/keto-day", async (req: Request, res: Response) => {
    req.query.subcategory = "keto";
    return (app._router.handle as any)({ ...req, url: "/api/dietary/plans?subcategory=keto" }, res);
  });

  // Order individual meal bundle into user cart
  app.post("/api/dietary/add-bundle", async (req: Request, res: Response) => {
    const { bundleTitle, products } = req.body ?? {};

    try {
      deps.touchGuestSession(req);
      await deps.mergeGuestCartIfNeeded(req);
      const userIdOrSession = deps.getUserIdOrSession(req);
      const productIds = Array.isArray(products)
        ? products.map((item: any) => typeof item?.id === "string" ? item.id : "").filter(Boolean)
        : [];
      if (productIds.length === 0) {
        return res.status(400).json({ error: "This bundle has no available products" });
      }

      const result = await addDietaryProductsToCart(userIdOrSession, productIds);
      if (result.addedProductIds.length === 0) {
        return res.status(409).json({
          error: "The products in this bundle are currently unavailable",
          unavailableItems: result.unavailableItems,
        });
      }

      return res.json({
        success: true,
        message: `Added ${bundleTitle || "Meal Bundle"} to cart!`,
        addedCount: result.addedProductIds.length,
        unavailableItems: result.unavailableItems,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to add bundle to cart" });
    }
  });

  // Order complete day plan
  app.post("/api/dietary/buy-complete-plan", async (req: Request, res: Response) => {
    const subcat = (req.body?.subcategory as string) || "keto";
    const template = SUBCATEGORY_PLAN_TEMPLATES[subcat] || SUBCATEGORY_PLAN_TEMPLATES.keto;

    try {
      deps.touchGuestSession(req);
      await deps.mergeGuestCartIfNeeded(req);
      const userIdOrSession = deps.getUserIdOrSession(req);
      const requestedIds = Array.isArray(req.body?.productIds)
        ? req.body.productIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
        : [];
      let productIds = requestedIds;

      if (productIds.length === 0) {
        const subcategoryProducts = await storage.getProducts({
          categoryId: "dietary",
          subcategoryId: subcat,
          inStock: true,
        });
        const fallbackProducts = subcategoryProducts.length > 0
          ? subcategoryProducts
          : await storage.getProducts({ categoryId: "dietary", inStock: true });
        productIds = fallbackProducts.map((product) => product.id);
      }

      const result = await addDietaryProductsToCart(userIdOrSession, productIds);
      if (result.addedProductIds.length === 0) {
        return res.status(409).json({
          error: "No products from this plan are currently available",
          unavailableItems: result.unavailableItems,
        });
      }

      return res.json({
        success: true,
        message: `Complete ${template.title} added to your cart!`,
        addedCount: result.addedProductIds.length,
        unavailableItems: result.unavailableItems,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Failed to order complete plan" });
    }
  });
}
