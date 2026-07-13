# AgriConnect Project Memory

> Compact context for a new coding chat. The source code and verified browser evidence take precedence.

## Current state

AgriConnect is a React/Vite frontend with an Express/TypeScript backend, PostgreSQL/Drizzle models, and shared TypeScript contracts. It is an agriculture marketplace and support platform covering products, sellers/farmers, discovery, logistics/help content, maps, and profile UX.

The active roadmap position is **Day 15 implemented in code; focused E2E verification is still pending for Days 13–15**.

## Status through Day 15

| Day | Area | Status |
|---|---|---|
| 1 | Roadmap tracker and build inspection | Documented; no current build evidence retained |
| 2 | Legal, support, and 404 pages | **E2E Verified** |
| 3 | SEO, cookies, manifest, PWA foundation | **Partial E2E** — custom preferences/reload verified; clean-profile accept/reject and install prompt need setup |
| 4 | Navigation and responsive polish | **Partial E2E** — desktop controls and mobile rendering verified; full interaction/accessibility sweep pending |
| 5 | About and credibility | **Partial E2E** — content and honest metrics messaging verified; loading/empty states need controlled data |
| 6 | Central taxonomy and hierarchy | **Partial E2E** — Daily Needs/Vegetables route verified; full branch traversal and state coverage pending |
| 7 | Vegetable and fruit expansion | **Partial E2E** — centralized lists contain 51 vegetables and 54 fruits; full browser traversal/duplicate sweep pending |
| 8 | Buyer/seller taxonomy split | **Implemented; Not Verified** |
| 9 | Seller product listing | **Implemented; Not Verified** |
| 10 | Product grid/cards/image safety | **Partial E2E** — desktop/mobile grid verified; fallback and fault states need fixtures |
| 11 | Public search and discovery | **Partial E2E** — public farmer search verified; empty/loading/error and location-filter coverage pending |
| 12 | Public map discovery and marker cleanup | **E2E Verified** |
| 13 | Favorites and My Profile products | **Implemented; Not Verified** |
| 14 | Verification tiers, profile completion, Student Help Point | **Implemented; Not Verified** |
| 15 | $1 minimal listing policy (UI foundation) | **Implemented; Not Verified** |

See `AgriConnect-Agents_Guide/roadmap.md` for feature details and gaps.

## Architecture and important contracts

- Frontend: `frontend/src`; routes in `frontend/src/app/routes.tsx`; Wouter routing and TanStack Query data fetching.
- Backend: `backend`; modular catalog, farmer, auth, OTP, payment, notification, and shipping routes.
- Shared models/contracts: `shared/schema.ts`, `shared/models/*`; Drizzle configuration: `drizzle.config.ts`.
- User profile (`shared/models/auth.ts`): role, public/business name and location, optional coordinates, rating/reviews, `isVerified`, and `profileComplete`.
- Relevant APIs: `PATCH /api/auth/profile`, `POST /api/auth/profile/complete`, and `GET /api/farmers/:farmerId/products`. Preserve `/api/*` paths and response shapes.

### Key routes

- Public: `/`, `/about`, `/support`, `/privacy-policy`, `/terms-of-service`, `/refund-policy`, `/products/:id`, `/sellers/:id`, `/map`, `/farmers-help`, `/logistics`, `/agritech`.
- Protected: `/dashboard`, `/dashboard/list-product`, `/settings`, `/favorites`, `/my-profile`, `/profile-completion`, `/student-help-point`, `/seller`, `/cart`, `/checkout`, `/orders`.

### Days 13–15 facts

- Favorites are a local, per-authenticated-user store in `use-favorites.ts`, keyed as `agriconnect-favorites:<userId>`. Product/seller IDs are deduplicated; no server persistence API exists.
- `/favorites` supports product/seller lists and empty/unavailable states.
- `/my-profile` fetches the current user's listings via `/api/farmers/:userId/products`, includes safe product fallbacks, and intentionally has a disabled `Edit soon` control; editing is not implemented.
- `/profile-completion` is optional onboarding UI that links to existing settings and must not change sign-in access.
- Verification tiers derive from profile fields. Trusted seller requires `isVerified`, rating >= 4.5, and at least 20 reviews; UI labels are not external identity proof.
- `/student-help-point` is a protected **Coming soon/Foundation only** shell and collects no records or requests.
- **Day 15 — Listing policy:** New `frontend/src/lib/listing-policy.ts` defines `MINIMAL_LISTING_FEE_USD = 1`, status `confirmed_ui_foundation`, and messaging. Policy notice appears on `/dashboard/list-product` and `/my-profile`. `PublicSellerBadges` now always shows "Seller" badge + conditional "Trusted seller". Seller profile uses unified badges.

## Constraints and verification

- Auth is frozen: do not modify login UI, mobile/OTP/Google auth, auth routes/handlers/APIs, callbacks, sessions, tokens, or working auth buttons without explicit authorization.
- Do not expose private phone/email, exact address, private coordinates, sessions, or internal IDs in public UI. Maps render only safe public markers with valid coordinates; otherwise show city/region or `Location not specified`.
- Preserve taxonomy IDs/slugs/routes and align frontend/backend taxonomy behavior. Do not touch cart, checkout, payments, escrow, orders, or database schema outside approved scope.
- Do not call a feature E2E verified from static inspection. Use focused route-by-route browser evidence when requested.
- Do not run build, lint, type-check, Playwright, migrations, deployment, or dependency commands unless explicitly asked.
- Days 13–15 have no focused automated or browser verification evidence retained. Product fault states need controlled fixtures/network faults; cookie clean-state checks need a disposable profile; PWA prompts need installability/browser support.

## Working approach

Read `AGENTS.md`, trace the direct frontend, backend, shared model, validation, and test path, then make the smallest aligned change. Preserve unrelated user changes and update this file and `roadmap.md` only when the current state changes.