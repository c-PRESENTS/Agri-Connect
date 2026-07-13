# AgriConnect Feature Roadmap Tracker

> Tracks implementation status across all roadmap days. Update this file whenever a batch is implemented or verified.

## Status Legend

| Status | Meaning |
|--------|---------|
| **E2E Verified** | Frontend, backend, and user flow successfully verified |
| **Partial E2E** | Implemented, but part of flow depends on unavailable setup or not fully verified |
| **Not Verified** | Implementation may exist, but complete flow not confirmed |
| **Broken** | Verified defect prevents expected flow |
| **Needs External Setup** | Requires credentials, paid services, deployment config, or third-party access |
| **UI Shell** | UI foundation exists, backend/logic incomplete or placeholder |
| **Planned** | Not yet started |
| **Frozen** | Explicitly locked — do not modify |

---

## Days 1–12 (Current Sprint)

| Day | Feature Area | Status | Notes |
|-----|--------------|--------|-------|
| **Day 1** | Roadmap tracker + build inspection | **Completed** | Documentation only |
| **Day 2** | Privacy Policy, Terms of Service, Refund Policy, Support, 404 pages | **E2E Verified** | Static legal pages implemented |
| **Day 3** | SEO meta tags, cookie consent banner, manifest, PWA foundation, link checker, support flow | **Partial E2E** | Cookie consent uses `agriconnect_cookie_consent` localStorage key |
| **Day 4** | Sidebar text labels, icon sizes, sticky top nav, menu items (LAND/SHARE/SHIP/HELP/USER), currency selector (GB £) | **Partial E2E** | Navigation polish; responsive layout verified |
| **Day 5** | About page (benefits, vision, mission, impact), company story, values, community metrics, category visibility (Farmer help, Govt schemes, Logistics), free selling model messaging | **Not Verified** | Credibility sections need verification |
| **Day 6** | Taxonomy cleanup, hierarchy, subcategory nesting, centralized taxonomy | **Not Verified** | Category alignment review needed |
| **Day 7** | Vegetables (47+), Fruits (50+), Daily Needs Market, Fresh Farm Produce, wholesale categories | **Not Verified** | Uses centralized taxonomy config |
| **Day 8** | Buyer/seller taxonomy split — sellers see full taxonomy, buyers see shoppable categories | **Implemented; verify E2E** | Role-based category filtering |
| **Day 9** | Basic seller product listing flow, centralized taxonomy, validation, empty states | **Implemented; verify E2E** | No cart/checkout/payment |
| **Day 10** | Product grid, cards, image fallback (broken/missing), responsive grid | **Implemented; verify E2E** | Safe fallbacks in place |
| **Day 11** | Search, farmer search, located filter, empty/loading states | **Not Verified** | Pending E2E confirmation |
| **Day 12** | Interactive map homepage, farmer location markers, search-to-map, located filter-to-map, coordinate fallback, mobile map | **E2E Verified** | Leaflet-based with multiple tile layers |

---

## Day 13 (Current Focus)

| Feature | Status | Notes |
|---------|--------|-------|
| Favorite icon for products & profiles | **Planned** | Prevent duplicates |
| Dedicated favorites page | **Planned** | `/favorites` route |
| My Profile section (seller's listed products) | **Planned** | Authenticated seller view |
| Seller-owned product management view | **Planned** | Foundation for editing |
| Product editing foundation | **Planned** | UI + data flow only if risky |

**Rules:** Use existing logged-in user context; do not modify auth; do not break product grid/listing.

---

## Days 14–20 (Future — from Daily_Plan.md)

| Day | Feature Area | Status | Notes |
|-----|--------------|--------|-------|
| **Day 14** | Verification badges, profile completion wizard, progressive tiers (Basic → Contact → Seller Details → Verified Seller → Trusted Seller), student help point shell | **Planned** | Profile completion ≠ authentication |
| **Day 15** | Verification polish, free selling model ($1 minimal listing), zero entry barriers policy, seller badge consistency, student help point | **Planned** | Policy/UI foundation only |
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
| Vonage SMS / WhatsApp | **Needs External Setup** | VONAGE_API_KEY, VONAGE_API_SECRET, WHATSAPP_TOKEN |
| Google OAuth (production) | **Needs External Setup** | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET |
| Royal Mail / DPD live shipping | **Needs External Setup** | ROYAL_MAIL_API_KEY, DPD credentials |
| Gemini AI (production) | **Needs External Setup** | GEMINI_API_KEY |
| OpenAI (fallback) | **Needs External Setup** | OPENAI_API_KEY |

---

## Summary Counts (Auto-update on status change)

| Status | Count |
|--------|-------|
| E2E Verified | 2 |
| Partial E2E | 2 |
| Not Verified | 7 |
| Implemented; verify E2E | 3 |
| Planned | 19 |
| Needs External Setup | 12 |
| Frozen (Auth) | 1 |

> **Update rule:** When you change a feature's status, update both the detail row and the summary counts above.

---

## Maintenance Notes

* **Source of truth:** `Daily_Plan.md` for day-by-day tasks; `MEMORY.md` for rules and context.
* **Update this file** after each daily batch implementation or verification.
* **Do not** modify frozen authentication area (Days 1–2 auth work).
* **Map statuses** from Daily_Plan.md language to this tracker's standard statuses.