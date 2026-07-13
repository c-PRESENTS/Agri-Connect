# AgriConnect Feature Roadmap Tracker

> Tracks implementation status across all roadmap days. Update this file whenever a batch is implemented or verified.

## Status Legend

| Status | Meaning |
|--------|---------|
| **E2E Verified** | Frontend, backend, and user flow successfully verified |
| **Partial E2E** | Implemented, but part of the flow depends on unavailable setup or was not fully verified |
| **Not Verified** | Implementation may exist, but complete flow not confirmed |
| **Broken** | Verified defect prevents expected flow |
| **Needs External Setup** | Requires credentials, paid services, deployment config, or third-party access |
| **UI Shell** | UI foundation exists, backend/logic incomplete or placeholder |
| **Planned** | Not yet started |
| **Frozen** | Explicitly locked — do not modify |

---

## Days 1–14 (Completed Sprint)

| Day | Feature Area | Status | Notes |
|-----|--------------|--------|-------|
| **Day 1** | Roadmap tracker + build inspection | **Completed** | Documentation only |
| **Day 2** | Privacy Policy, Terms of Service, Refund Policy, Support, 404 pages | **E2E Verified** | Static legal pages implemented and routed |
| **Day 3** | SEO meta tags, cookie consent banner, manifest, PWA foundation, link checker, support flow | **Partial E2E** | Cookie consent uses `agriconnect_cookie_consent` localStorage key; custom preferences/reload verified; clean-profile accept/reject and install prompt need setup |
| **Day 4** | Sidebar text labels, icon sizes, sticky top nav, menu items (LAND/SHARE/SHIP/HELP/USER), currency selector (GB £) | **Partial E2E** | Navigation polish implemented; full interaction/accessibility sweep pending |
| **Day 5** | About page (benefits, vision, mission, impact), company story, values, community metrics, category visibility (Farmer help, Govt schemes, Logistics), free selling model messaging | **Partial E2E** | Content and honest metrics messaging verified; loading/empty states need controlled data |
| **Day 6** | Taxonomy cleanup, hierarchy, subcategory nesting, centralized taxonomy | **Partial E2E** | Daily Needs/Vegetables route verified; full branch traversal and state coverage pending |
| **Day 7** | Vegetables (47+), Fruits (50+), Daily Needs Market, Fresh Farm Produce, wholesale categories | **Partial E2E** | Centralized lists contain 51 vegetables and 54 fruits in `categoryExamples`; full browser traversal/duplicate sweep pending |
| **Day 8** | Buyer/seller taxonomy split — sellers see full taxonomy, buyers see shoppable categories | **Implemented; Not Verified** | `hasSellerTaxonomyAccess` and `getSellerTaxonomy` in `categories.ts`; product-listing uses them |
| **Day 9** | Basic seller product listing flow, centralized taxonomy, validation, empty states | **Implemented; Not Verified** | `product-listing.tsx` with form, validation, POST `/api/products`; no cart/checkout/payment |
| **Day 10** | Product grid, cards, image fallback (broken/missing), responsive grid | **Partial E2E** | Desktop/mobile grid verified; fallback and fault states need fixtures |
| **Day 11** | Search, farmer search, located filter, empty/loading states | **Partial E2E** | Public farmer search verified; empty/loading/error and location-filter coverage pending |
| **Day 12** | Interactive map homepage, farmer location markers, search-to-map, located filter-to-map, coordinate fallback, mobile map | **E2E Verified** | Leaflet-based with multiple tile layers, drawing tools, marker clustering |
| **Day 13** | Favorite icon for products/profiles, dedicated favorites page, My Profile section (seller's listed products), seller-owned product management view, foundation for product editing | **Implemented; Not Verified** | `favorites.tsx`, `use-favorites.ts` (localStorage `agriconnect-favorites:<userId>`), `my-profile.tsx` with `/api/farmers/:userId/products`; edit control intentionally disabled |
| **Day 14** | Verification badges, profile completion wizard/checklist, progressive tiers (Basic → Contact → Seller Details → Verified Seller → Trusted Seller), Student Help Point shell | **Implemented; Not Verified** | `verification-badges.tsx` (5 tiers), `profile-completion.tsx` (checklist), `profile-wizard.tsx` (4-step), `profile-completion.tsx` page, `student-help-point.tsx` (protected, "Coming soon" badge) |

---

## Day 15 (Current Focus — Just Implemented)

| Feature | Status | Notes |
|---------|--------|-------|
| $1 minimal listing fee policy config | **Implemented; Not Verified** | New `frontend/src/lib/listing-policy.ts` with fee, status, messages |
| Policy notice on product listing form | **Implemented; Not Verified** | `product-listing.tsx` shows fee badge, zero-entry message, enforcement note |
| Policy notice on My Profile page | **Implemented; Not Verified** | `my-profile.tsx` shows policy + link to Student Help Point |
| Verification badge: always show "Seller" + conditional "Trusted seller" | **Implemented; Not Verified** | `verification-badges.tsx` `PublicSellerBadges` updated |
| Seller profile: unified badge via `PublicSellerBadges` | **Implemented; Not Verified** | Removed standalone "Seller" badge from `seller-profile.tsx` |

**Rules:** Policy is UI foundation only — no backend fee collection, no enforcement, no payment integration. Matches Day 15 spec: "Policy/UI foundation only".

---

## Days 16–20 (Future — from Daily_Plan.md)

| Day | Feature Area | Status | Notes |
|-----|--------------|--------|-------|
| **Day 16** | Basic orders without payment: confirmation, history (buyer/seller), status model (pending→confirmed→processing→shipped→delivered→cancelled/refunded) | **Planned** | Manual/pending payment state only |
| **Day 17** | Cart & checkout without payment: add/update/remove, summary, create order, connect to order history | **Planned** | No payment gateway, no escrow |
| **Day 18** | Logistics foundation, seller dashboard, order fulfillment dashboard, operator dashboard, email automation foundation | **Planned** | Use env vars for provider config |
| **Day 19** | Security/compliance foundation: rate limiting, SSL docs, DDoS notes, encryption notes, GDPR foundation, audit trail, keyboard nav, alt text, API/form testing foundation | **Planned** | Mark provider-dependent as Needs External Setup |
| **Day 20** | QA, performance, release notes: cross-browser, mobile, perf pass, link checker, security scan, pentest checklist, UAT, RELEASE_NOTES.md, CLIENT_DEMO_CHECKLIST.md, final ROADMAP_STATUS.md | **Planned** | Stabilization & documentation only |

---

## High-Risk / External Dependency Features

| Feature | Status | Blockers |
|---------|--------|----------|
| Stripe payment gateway + escrow | **Needs External Setup** | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, APP_ORIGINS |
| PCI DSS compliance | **Needs External Setup** | Requires full payment integration |
| GDPR / CCPA full compliance | **Needs External Setup** | Legal review + DPA |
| DDoS protection | **Needs External Setup** | Infrastructure/WAF config |
| Penetration testing | **Needs External Setup** | External audit required |
| International payment gateways | **Needs External Setup** | Provider accounts + KYC |
| SendGrid email (production) | **Needs External Setup** | SENDGRID_API_KEY, SENDGRID_FROM_EMAIL |
| Vonage SMS / WhatsApp | **Needs External Setup** | VONAGE_API_KEY, VONAGE_API_SECRET, WHATSAPP_TOKEN. Current audit constraint: `@vonage/jwt@1.14.0` pulls `uuid@13.0.0`; no compatible automatic fix. Do not force-downgrade the SDK; monitor upstream and re-audit on upgrade. |
| Google OAuth (production) | **Needs External Setup** | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET |
| Royal Mail / DPD live shipping | **Needs External Setup** | ROYAL_MAIL_API_KEY, DPD credentials |
| Gemini AI (production) | **Needs External Setup** | GEMINI_API_KEY |
| OpenAI (fallback) | **Needs External Setup** | OPENAI_API_KEY |

---

## Summary Counts

| Status | Count |
|--------|-------|
| E2E Verified | 2 |
| Partial E2E | 7 |
| Not Verified | 0 |
| Implemented; Not Verified | 9 |
| Planned | 10 |
| Needs External Setup | 12 |
| Frozen (Auth) | 1 |

> **Update rule:** When you change a feature's status, update both the detail row and the summary counts above.

---

## Maintenance Notes

* **Source of truth:** `Daily_Plan.md` for day-by-day tasks; `MEMORY.md` for rules and context.
* **Update this file** after each daily batch implementation or verification.
* **Do not** modify frozen authentication area (Days 1–2 auth work).
* **Map statuses** from Daily_Plan.md language to this tracker's standard statuses.
