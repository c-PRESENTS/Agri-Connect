# AgriTech & Precision Farming Catalog

## What & Why
Items E.7.9–E.7.12 are fully unimplemented: there is no dedicated page or product catalog for agricultural sensors, GIS tools, remote sensing technology, or precision farming equipment. Farmers need a showcase page to discover and browse modern agri-technology products.

## Done looks like
- A new `/agritech` page (linked from top navigation and the Agricultural Inputs category) with 4 clearly sectioned panels: Agricultural Sensors & IoT, GIS & Mapping Tools, Remote Sensing Technology, and Precision Farming Equipment
- Each section shows product cards (soil moisture sensors, GPS trackers, drone kits, satellite imagery services, variable-rate applicators, etc.) using the existing ProductCard component, filterable by section
- A "GIS Systems" informational panel explains how to use mapping/survey integration with a CTA linking to the Farmers Help page
- A "Remote Sensing Showcase" with visual tiles for satellite imagery, NDVI maps, and drone aerial surveys (static informational with representative images)
- All products are seeded in `server/storage.ts` under the existing `inputs-tools` category with appropriate subcategory IDs (sensors, gis, remote-sensing, precision)
- Page is mobile-responsive and linked from the main top navigation under a "Tools" or "AgriTech" label

## Out of scope
- Actual GIS/satellite data API integration (real-time data feeds)
- Drone flight planning software
- Any backend beyond product seeding

## Tasks
1. **Seed AgriTech products** — Add 20–30 precision farming products to `server/storage.ts` under `inputs-tools` with new subcategory IDs (`sensors`, `gis`, `remote-sensing`, `precision`). Add these subcategories to `categories.ts`.

2. **Build `/agritech` page** — Create `client/src/pages/agritech.tsx` with 4 sectioned panels (Sensors, GIS, Remote Sensing, Precision Farming), displaying product cards from the API filtered by subcategory. Include a static informational GIS panel and a remote sensing showcase with imagery tiles.

3. **Navigation & routing** — Register the new page in `App.tsx`, add a link in the top navigation, and ensure the AgriTech section in the category sidebar routes to this page.

## Relevant files
- `client/src/lib/categories.ts`
- `server/storage.ts`
- `server/routes.ts`
- `client/src/App.tsx`
- `client/src/components/top-navigation.tsx`
- `client/src/components/product-card.tsx`
- `client/src/pages/farmers-help.tsx`
