# Land Marketplace Expansion

## What & Why
E.18.2–E.18.6 are unimplemented. The land-leasing page currently only shows lease listings. This task adds land sale listings, a rental marketplace tab, farmland investment opportunities, community farming plots, and a map layer showing land survey boundaries.

## Done looks like
- The land-leasing page gains a 4-tab structure: "For Lease" (existing), "For Sale", "Investment Opportunities", and "Community Farming Plots"
- "For Sale" tab: 8+ land sale listings with price per acre, total acreage, location, land type, soil type, water access, and seller contact CTA — same card design as lease listings
- "Investment Opportunities" tab: 6+ farmland investment deals showing projected returns, minimum investment, and co-investor count — with an "Express Interest" button that logs enquiries
- "Community Farming Plots" tab: 6+ shared plot listings showing plot size, monthly fee, crops grown, and available slots — with a "Join Plot" CTA
- "Rental Marketplace" sub-section within the "For Lease" tab: filters for short-term rentals (daily/weekly) vs long-term (seasonal/annual)
- An interactive map panel (using the existing compact map component) shows land parcel markers colour-coded by type (lease = green, sale = blue, investment = gold, community = purple). Clicking a marker opens the listing card.
- Map survey data layer: a toggle overlays approximate county-level agricultural zone boundaries as polygon outlines on the map

## Out of scope
- Real land registry or government parcel data integration
- Legal contract generation
- Payment processing for land transactions

## Tasks
1. **Seed additional land listing types** — Add 8 sale listings, 6 investment listings, and 6 community plot listings to in-memory storage. Create a `/api/land-listings` endpoint that accepts a `?type=lease|sale|investment|community` filter.

2. **4-tab land page structure** — Refactor the land-leasing page to use a tab layout (For Lease, For Sale, Investment, Community). Move existing lease content into the "For Lease" tab. Build card components for each listing type with appropriate fields.

3. **Map integration with coloured markers** — Add a map panel using the existing map component. Display land listings as coloured markers by type. Implement click-to-view that highlights the selected listing card.

4. **Agricultural zone boundary overlay** — Add a toggle button on the map that overlays county-level agricultural zone polygon outlines (static GeoJSON data of UK county boundaries). Colour-code by zone type (arable, pastoral, mixed).

## Relevant files
- `client/src/pages/land-leasing.tsx`
- `client/src/components/compact-map-view.tsx`
- `client/src/components/map-view.tsx`
- `server/routes.ts`
- `server/storage.ts`
- `client/src/App.tsx`
