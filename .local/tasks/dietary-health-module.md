# Dietary & Lifestyle Health Module

## What & Why
E.17.2–E.17.5 are unimplemented: the dietary category exists but only shows product grids. This task adds the Diet Chart Module (two-table layout: diet procedures + direct buy), health/nutritional guidance linked to products, a meal planning feature, and a dietary restriction filter that works across the main marketplace.

## Done looks like
- A new "Diet Chart" section on the dietary page shows two side-by-side tables: (1) a structured diet plan table with meal timing, recommended foods, and nutritional notes, and (2) a "Buy These Ingredients" panel that lists matching products from the marketplace with direct add-to-cart
- 14 dietary plan charts are available (one per lifestyle: Keto, Vegan, High-Protein, Gluten-Free, Diabetic-Friendly, Heart Healthy, Pregnancy, Baby, Senior, Paleo, Mediterranean, Whole30, Ayurvedic, plus one General Balance)
- A "Meal Planner" section lets users build a weekly meal plan by selecting 3 meals/day from a dropdown of farm-direct recipes; the planner aggregates the required ingredients and adds them to cart in one click
- A "Dietary Filters" panel appears on the main homepage product grid — a horizontal chip bar below the search bar letting buyers filter all products by dietary tag (Vegan, Gluten-Free, Organic, Diabetic-Friendly, etc.) — tags stored as product metadata
- Nutritional information (calories, protein, carbs, fat) is shown on product cards when a dietary filter is active

## Out of scope
- Integration with external health APIs or calorie-tracking apps
- Personalised AI diet recommendations (future work)
- Changes to the database schema beyond adding dietary tags to products

## Tasks
1. **Diet Chart Module UI** — Build the two-table diet chart component for each dietary category. Table 1: meal timing + food guidance. Table 2: matching products from `/api/products` with add-to-cart. Add a category switcher to select which diet plan to view.

2. **Meal Planner** — Add a "Meal Planner" tab to the dietary page with a 7-day grid. Each cell has a recipe/meal dropdown. Clicking "Add All to Cart" aggregates ingredients and calls the cart API. Seed 20+ farm-direct recipes with ingredient lists.

3. **Dietary restriction filters on homepage** — Add a horizontal chip filter bar below the search bar on the home page for dietary tags. Tag products in the seed data with relevant dietary attributes. The `/api/products` endpoint should accept `?dietary=vegan` etc. filters.

4. **Nutritional metadata on product cards** — When a dietary filter is active, product cards show a small nutritional badge (e.g., "Vegan • 45 cal/100g") using metadata from the product seed data.

## Relevant files
- `client/src/pages/home.tsx`
- `client/src/pages/farmers-help.tsx`
- `client/src/components/product-card.tsx`
- `client/src/components/product-filters.tsx`
- `client/src/components/product-grid.tsx`
- `server/routes.ts`
- `server/storage.ts`
- `client/src/lib/categories.ts`
- `client/src/App.tsx`
