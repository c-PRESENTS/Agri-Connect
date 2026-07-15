# AgriConnect Project Memory

> Compact context for a new coding chat. The source code and verified browser evidence take precedence.

## Current state

AgriConnect is a React/Vite frontend with an Express/TypeScript backend, PostgreSQL/Drizzle models, and shared TypeScript contracts. It is an agriculture marketplace and support platform covering products, sellers/farmers, discovery, logistics/help content, maps, and profile UX.

The planned implementation scope through Day 20 is code-complete; final manual, automated, provider, and deployment verification remains pending.

## Status through Day 20

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
| 16 | Basic manual orders, buyer history, seller visibility, and lifecycle status | **Implemented; Not Verified** |
| 17 | User cart and manual cart checkout | **Implemented; Not Verified** |
| 18 | Dashboards, logistics foundation, and email foundation | **Implemented; Not Verified** |
| 19 | Security, accessibility, and compliance foundation | **Implemented; Not Verified** |
| 20 | QA, performance, release notes, and final status | **Implemented; Not Verified** |

See `AgriConnect-Agents_Guide/roadmap.md` for feature details and gaps. Day 16's authenticated browser checks require a buyer and seller test session.

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

### Day 16 facts

- Manual orders use `pending -> confirmed -> processing -> shipped -> delivered`, with cancellation and refund transitions. Payment status is `manual`; checkout does not call a payment provider.
- `POST /api/orders` validates aggregated quantities, uses server-side product price and seller data, rejects self-purchases, and serializes in-memory stock reservation to prevent overselling.
- Buyers can read only their orders. Seller order responses contain only that seller's items; a seller can update a shared order only when every item belongs to them.

### Day 17 facts

- Cart entries are scoped to the current authenticated user or guest session, deduplicated by product, and validated against current product stock on add, update, and checkout.
- `POST /api/cart/checkout` builds a manual Day 16 order from the server-side cart and clears that cart only after the order is created successfully.

### Day 18 facts

- Seller summaries are scoped server-side to the authenticated farmer; fulfillment uses the existing seller-authorized Day 16 status endpoint. `/operator` is admin-only and exposes aggregate product/order counts and status totals only.
- Carrier adapters remain environment-configured with simulated fallbacks. `GET /api/logistics/providers` returns only provider names, handled IDs, and live state to authorized operational roles.
- Order confirmation and support emails are queued after persistence and failures are safely logged. `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, and optional `SUPPORT_INBOX_EMAIL` are required for production delivery/routing.

### Day 19 facts

- Optional API rate limiting is disabled by default and excludes frozen auth/OTP routes. Structured audit logging is opt-in (`ENABLE_AUDIT_LOG=true`) and records identifiers/outcomes only; general API logs no longer serialize response bodies.
- Shared skip navigation and native support-form submission improve keyboard use. Relevant image previews now have contextual alt text; deliberately decorative images retain empty alt text.
- `SECURITY_DEPLOYMENT_FOUNDATION.md` documents provider-dependent TLS, WAF/DDoS, encryption-at-rest, and regional-compliance work. Read-only Playwright API/form checks are skipped unless explicitly enabled.

### Day 20 facts

- `npm run qa:links` statically matches literal internal destinations to registered routes and validates external URL syntax. The current run checked 38 route patterns, 288 internal links, and 20 external references with no unmatched literal internal route remaining.
- Low-risk QA fixes corrected seller-product and mobile Ship navigation, replaced broken dashboard destinations, disabled unavailable land posting, improved keyboard semantics, lazy-loaded two routes and commerce thumbnails, and removed unused mobile-navigation code.
- `QA_RELEASE_CHECKLIST.md`, this memory, and `roadmap.md` separate code completion from retained/manual evidence and external setup. Final status is release candidate, not production-approved.

## Constraints and verification

- Auth is frozen: do not modify login UI, mobile/OTP/Google auth, auth routes/handlers/APIs, callbacks, sessions, tokens, or working auth buttons without explicit authorization.
- Do not expose private phone/email, exact address, private coordinates, sessions, or internal IDs in public UI. Maps render only safe public markers with valid coordinates; otherwise show city/region or `Location not specified`.
- Preserve taxonomy IDs/slugs/routes and align frontend/backend taxonomy behavior. Do not touch cart, checkout, payments, escrow, orders, or database schema outside approved scope.
- Do not call a feature E2E verified from static inspection. Use focused route-by-route browser evidence when requested.
- Do not run build, lint, type-check, Playwright, migrations, deployment, or dependency commands unless explicitly asked.
- Days 13–15 have no focused automated or browser verification evidence retained. Product fault states need controlled fixtures/network faults; cookie clean-state checks need a disposable profile; PWA prompts need installability/browser support.

- Dependency audit (2026-07-13): Drizzle no longer appears in `npm audit`. The remaining 19 moderate entries are one upstream chain, `@vonage/jwt@1.14.0` -> `uuid@13.0.0`, repeated through the Vonage SDK tree. Do not use `npm audit fix --force`: its only remediation is an out-of-range downgrade to `@vonage/server-sdk@3.25.1`. Keep the current SDK until Vonage supplies a compatible fix; re-audit after any Vonage upgrade and do not change OTP/SMS code for this advisory alone.

## Working approach

Read `AGENTS.md`, trace the direct frontend, backend, shared model, validation, and test path, then make the smallest aligned change. Preserve unrelated user changes and update this file and `roadmap.md` only when the current state changes.
