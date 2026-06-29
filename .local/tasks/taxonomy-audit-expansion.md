# Taxonomy Audit, Expansion & Buyer/Seller Separation

## What & Why
The category hierarchy (E.4–E.16) needs a full audit and alignment pass: verify every subcategory has seeded products, add the two entirely missing top-level categories (E.14 Commercial/Industrial Crops, E.15 Bio-Based Products), and implement the buyer/seller taxonomy visibility rule — buyers see only shoppable product categories with available stock, while sellers (dashboard) see the full deep taxonomy for listing and management.

## Done looks like
- Every subcategory listed in E.4–E.13 has at least 3–5 seeded products with correct images
- Two new categories added: "Commercial & Industrial Crops" (sugar crops, beverage crops, latex/resin, other commercial) and "Bio-Based Products" (bioenergy, biofertilizers/biopesticides, herbal/pharma)
- Supermarket category (E.16) extended with Tech Accessories (E.16.17) and Allied Products (E.16.18) subcategories and seeded products
- Category sidebar on the buyer/storefront shows only categories that have shoppable products available; empty categories are hidden or show "coming soon"
- Farmer/seller dashboard listing flow shows the FULL taxonomy tree (all categories + subcategories) for product listing, including deep subcategories not visible to buyers
- Category IDs and hierarchy in `categories.ts` and `server/storage.ts` are consistent and aligned with the E.4–E.16 taxonomy numbering in the spec

## Out of scope
- Building new feature pages (AgriTech tools, Government module, Dietary module, Land expansion — those are separate tasks)
- Changing visual design or layout of the sidebar

## Tasks
1. **Audit subcategory product coverage** — Check each subcategory across all 15+ categories; identify and fill gaps by seeding missing products in `server/storage.ts` with correct Unsplash image IDs.

2. **Add E.14 and E.15 categories** — Insert "Commercial & Industrial Crops" (4 subcategories) and "Bio-Based Products" (3 subcategories) into `categories.ts` and seed 4–6 products each in `server/storage.ts`.

3. **Extend supermarket category** — Add Tech Accessories (E.16.17) and Allied Products (E.16.18) subcategories to the existing supermarket category with seeded example products.

4. **Buyer/seller taxonomy visibility** — Add a `buyerVisible` flag to each category/subcategory in `categories.ts`. Expose a filtered `/api/categories/buyer` endpoint that returns only shoppable categories. The storefront category sidebar uses the buyer-filtered list; the seller dashboard listing flow uses the full unfiltered list.

## Relevant files
- `client/src/lib/categories.ts`
- `server/storage.ts`
- `client/src/components/category-sidebar.tsx`
- `client/src/components/deep-nav-panel.tsx`
- `client/src/components/deep-sub-panel.tsx`
- `server/routes.ts`
- `client/src/pages/dashboard.tsx`
