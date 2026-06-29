# Mobile Responsive Rebuild

## What & Why
The site currently feels like a shrunk-desktop on real phones. Spot-fixes have not converged because the underlying problems are coordinated — fluid grids that overflow when image children dictate min-width, navigation that doesn't reflow, oversized media, and inconsistent vertical rhythm between sections. This task does a single coordinated mobile-first pass across the home/landing experience and the most-used flow pages so the site behaves like a polished mobile app at 360–430px viewports while keeping desktop (≥1024px) untouched.

## Done looks like
- On a real iPhone (390×844) and Android (360×800) viewport, the home page renders end-to-end with **zero horizontal scroll**, true mobile-first DOM (not shrunk desktop), and section-to-section vertical rhythm comparable to the Amazon / Flipkart mobile app.
- The All Categories section renders as a true 4-column fluid grid on mobile, 5/7/10 cols at sm/md/lg, with each tile sized to its column not to its image's intrinsic width.
- Hero, Quick Access, My Sites, Stats strip, Fresh Picks, Featured, Free Items, All Categories, and bottom nav each have a clear standardized vertical padding and section-header treatment, not a different one per section.
- Top navigation row 2 on mobile collapses Voice/Language/Theme/Currency into a single "More" bottom-sheet so the row stays at one tap-target height.
- All images and embedded media (hero map, product cards, category tiles, seller logos, share-and-care emojis) are flexible — they fill their column, never push past it.
- The same coordinated pass is applied to: Home (`/`), Cart (`/cart`), Checkout (`/checkout`), Orders (`/orders`), Product Detail (`/product/:id`), Smart Map (`/map`), Compare (`/compare`), Dashboard (`/dashboard`), and Seller Profile (`/seller/:id`) — these are the high-traffic pages that show table/grid overflow today.
- Bottom navigation persistently anchored on every mobile page, safe-area-padded, never overlapping content.
- An e2e mobile-viewport test passes confirming: no horizontal overflow on any of the listed pages, category grid is 4-col with tile widths under 110px, and the "More" sheet opens and closes correctly.

## Out of scope
- Desktop (≥1024px) layout changes — desktop remains exactly as-is.
- New features or new pages.
- Backend/API changes (Postgres migration, rate-limit work, Coming Soon flag — those are tracked separately).
- Visual redesign / re-theming — colors, fonts, brand stay identical. This is purely a layout/density pass.
- Tablet (640–1023px) optimization beyond what falls out naturally from mobile-first defaults.

## Steps
1. **Diagnose and fix the fluid-grid overflow root cause.** The current All Categories grid renders as 4 columns of 378px each (1500+px wide) on a 400px viewport because grid items default to `min-width: auto` and the absolutely-positioned `<img>` inside each `aspectRatio` wrapper dictates min-content. Apply a global rule that grid/flex children with bounded aspect ratios get `min-width: 0`, so columns honor `1fr` instead of inflating to image natural width. Verify by inspecting the rendered grid template columns in DevTools.
2. **Standardize the responsive grid system.** Establish one set of column counts per content-type (category tiles: 4/5/7/10, product cards: 2/3/4/6, free-items: 2/3/4/5/6, stats: scroll/4) and apply consistently across the home page and listing pages. Replace any ad-hoc `grid-cols-N` mismatches.
3. **Standardize section vertical rhythm.** Every top-level section between hero and footer uses the same `py-2 sm:py-4` padding and the same compact section-header treatment (small dot + 11px uppercase label on mobile, larger on sm+). No section should eat 30+px of header chrome on mobile.
4. **Mobile-only top nav: collapse row 2 tools.** Voice / Language / Theme / Currency switchers move into a single "More" trigger that opens a bottom sheet. The remaining row 2 stays a thin (~28px) horizontal nav strip. Desktop nav unchanged.
5. **Compact hero block.** Keep the existing mobile hero rebuild (live pill + stat strip + 20px headline + side-by-side h-9 CTAs). Trim the inline mobile map block to ~180px tall (down from 240px) so the user reaches Quick Access in the first scroll on a 6.1-inch phone.
6. **Audit and wrap every table for horizontal scroll.** Orders, Dashboard, Compare, Seller Profile, and any other page with tabular data must wrap their `<table>` (or table-like grid) in an `overflow-x-auto -mx-4 px-4` container so tables scroll inside their card, not push the page wide. Add `min-w-0` to flex/grid parents that contain tables.
7. **Flexible media pass.** Confirm every `<img>`, `<video>`, `<iframe>`, `<canvas>`, and Leaflet map container has `max-width: 100%` (already in CSS but verify it applies — some Leaflet tiles use `!important` which is fine, but absolutely-positioned images inside aspect-ratio wrappers need their parent to be `min-w-0`).
8. **Bottom navigation polish.** Verify the 5-tab bottom nav (Home/Browse/Map/Cart/Profile) is fixed-position, safe-area padded for iOS notched devices, and the page-content has matching `pb-` padding so nothing is hidden behind it. Already implemented but confirm on cart/checkout/orders.
9. **End-to-end test pass.** Run a Playwright mobile-viewport (390×844) sweep across Home, Cart, Checkout, Orders, Product Detail, Smart Map, Compare, Dashboard, Seller Profile. Each page must show: no horizontal overflow, no element wider than viewport, "More" sheet opens, bottom nav visible, all interactive elements tap-target ≥36px. Capture before/after screenshots for the user.

## Relevant files
- `client/index.html`
- `client/src/index.css:180-220`
- `client/src/index.css:740-755`
- `client/src/components/hero-section.tsx:188-345`
- `client/src/components/hero-section.tsx:594-720`
- `client/src/components/hero-service-grid.tsx`
- `client/src/components/user-bookmarks.tsx`
- `client/src/components/top-navigation.tsx:286-345`
- `client/src/components/bottom-nav.tsx`
- `client/src/pages/home.tsx`
- `client/src/pages/cart.tsx`
- `client/src/pages/checkout.tsx`
- `client/src/pages/orders.tsx`
- `client/src/pages/product-detail.tsx`
- `client/src/pages/smart-map.tsx`
- `client/src/pages/compare.tsx`
- `client/src/pages/dashboard.tsx`
- `client/src/pages/seller-profile.tsx`
- `tailwind.config.ts`
