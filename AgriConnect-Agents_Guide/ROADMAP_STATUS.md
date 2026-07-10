# AgriConnect Roadmap Status

Source: `docs/Copy of agriconnect em.xlsx`, sheet `feaure phase update`.

Total yellow-highlighted features tracked: 113.

Status meanings:
- Done: already present or retained according to the roadmap and ready for verification.
- Partial: exists but needs improvement, cleanup, or end-to-end completion.
- Not Started: not yet implemented for the 20-day sprint.
- Planned: intentionally scoped as a safe shell, foundation, or later provider-backed milestone.
- Frozen: authentication-related area is completed/stable and must not be modified during this sprint.

## Authentication Completion and Freeze

Authentication is treated as completed and stable for this revised roadmap.

Completed already:
- Login page UI is done.
- Mobile number login is done.
- OTP authentication is done end-to-end.
- Google authentication is done end-to-end.

Do not change during the remaining sprint:
- Login UI
- OTP authentication
- Google authentication
- Mobile number login
- Auth routes, auth handlers, auth APIs, auth buttons, callbacks, tokens, or existing working auth flows

The remaining 20-day roadmap below focuses only on non-auth features. Any feature that touches user onboarding, verification badges, or profile completion must be implemented as a profile/marketplace layer and must not alter the stable authentication system.

## Feature Tracker

| # | Feature name | Complexity | Status | Dependency | Risk level | Test status | Notes |
|---:|---|---|---|---|---|---|---|
| 1 | Privacy Policy page | Easy | Done | None | Medium | Needs Manual Review | Public draft page added; legal content should be reviewed before public launch. |
| 2 | Terms of Service / User Agreement | Easy | Done | None | Medium | Needs Manual Review | Public draft page added; legal content should be reviewed before public launch. |
| 3 | Cookie consent banner (basic) | Easy | Done | Privacy Policy page | Medium | Needs Manual Review | Frontend consent foundation supports saved category choices, a settings panel, and future script gating; this is not full GDPR/compliance implementation. |
| 4 | Refund / Cancellation Policy page | Easy | Done | Terms of Service / User Agreement | Medium | Needs Manual Review | Public draft page added; payment-provider behavior still requires legal/provider review before live payment flow. |
| 5 | Contact Us / Support page | Easy | Done | None | Low | Needs Manual Review | Existing public support page verified by code inspection and linked from legal pages. |
| 6 | 404 / error page handling | Easy | Done | None | Low | Needs Manual Review | Existing catch-all route retained last; missing translation copy added. |
| 7 | Email verification on signup | Medium | Frozen | Auth completed and stable | Medium | Not Reopened | Auth sprint is closed; do not add or modify email-verification behavior unless mentor explicitly reopens auth scope. |
| 8 | Password reset flow | Medium | Frozen | Auth completed and stable | Medium | Not Reopened | Auth sprint is closed; do not add or modify reset-password behavior unless mentor explicitly reopens auth scope. |
| 9 | Basic SEO meta tags (title/description per page) | Easy | Done | None | Low | Needs Manual Review | Public route-aware document title and description support added without route rewrites. |
| 10 | Vertical sidebar navigation implemented | Easy | Done | None | Low | Not Tested | Retain current navigation. |
| 11 | Add text labels under sidebar icons | Easy | Partial | Vertical sidebar navigation implemented | Low | Not Tested | Improve clarity without changing nav behavior. |
| 12 | Increase icon sizes platform-wide | Easy | Partial | Vertical sidebar navigation implemented | Low | Not Tested | Visual improvement only. |
| 16 | Sticky top navigation bar | Easy | Partial | Main menu items (LAND/SHARE/SHIP/HELP/USER) | Low | Not Tested | Keep existing top nav behavior intact. |
| 17 | Main menu items (LAND/SHARE/SHIP/HELP/USER) | Easy | Done | None | Low | Not Tested | Retain existing menu items. |
| 18 | Search functionality | Medium | Partial | Product display grid | Medium | Not Tested | Needs stable product/farmer search behavior. |
| 20 | Currency selector (GB £) | Easy | Done | None | Low | Not Tested | Retain existing selector. |
| 21 | User authentication button | Easy | Done | Auth completed and stable | Medium | Stable | Auth button is working; do not rename, rewire, or replace handlers. |
| 22 | Light theme | Easy | Done | None | Low | Not Tested | Retain. |
| 23 | Dark theme | Easy | Done | Light theme | Low | Not Tested | Retain. |
| 35 | All agriculture taxonomy categories included | Easy | Done | None | Medium | Not Tested | Validate during taxonomy pass. |
| 36 | Manual recheck: verify categories correctly aligned | Medium | Partial | All agriculture taxonomy categories included | Medium | Not Tested | Must be completed before launch. |
| 37 | Ensure proper hierarchy/nesting of subcategories | Medium | Partial | Manual recheck: verify categories correctly aligned | Medium | Not Tested | Must be completed before launch. |
| 38 | Daily Needs Market (main category) | Easy | Done | All agriculture taxonomy categories included | Low | Not Tested | Retain. |
| 39 | Food Grains & Cereals | Easy | Done | Daily Needs Market (main category) | Low | Not Tested | Retain. |
| 40 | Pulses & Lentils | Easy | Partial | Daily Needs Market (main category) | Low | Not Tested | Verify listing completeness. |
| 41 | Cooking Oils | Easy | Partial | Daily Needs Market (main category) | Low | Not Tested | Verify listing completeness. |
| 42 | Vegetables (47+ varieties) | Medium | Partial | Daily Needs Market (main category) | Medium | Not Tested | Verify top varieties first. |
| 43 | Fruits (50+ varieties) | Medium | Partial | Daily Needs Market (main category) | Medium | Not Tested | Verify top varieties first. |
| 44 | Dairy & Eggs | Easy | Partial | Daily Needs Market (main category) | Low | Not Tested | Verify listing completeness. |
| 45 | Meat & Poultry | Easy | Partial | Daily Needs Market (main category) | Low | Not Tested | Verify listing completeness. |
| 46 | Fish & Seafood | Easy | Partial | Daily Needs Market (main category) | Low | Not Tested | Verify listing completeness. |
| 47 | Spices & Condiments | Easy | Partial | Daily Needs Market (main category) | Low | Not Tested | Verify listing completeness. |
| 50 | Fresh Farm Produce (Wholesale) | Easy | Done | All agriculture taxonomy categories included | Low | Not Tested | Retain. |
| 51 | Vegetables (Wholesale) | Easy | Partial | Fresh Farm Produce (Wholesale) | Low | Not Tested | Verify listing completeness. |
| 52 | Fruits (Wholesale) | Easy | Partial | Fresh Farm Produce (Wholesale) | Low | Not Tested | Verify listing completeness. |
| 54 | Livestock & Animals | Easy | Done | All agriculture taxonomy categories included | Low | Not Tested | Retain. |
| 55 | Dairy Animals | Easy | Partial | Livestock & Animals | Low | Not Tested | Verify listing completeness. |
| 56 | Meat Animals | Easy | Partial | Livestock & Animals | Low | Not Tested | Verify listing completeness. |
| 57 | Poultry Birds | Easy | Partial | Livestock & Animals | Low | Not Tested | Verify listing completeness. |
| 59 | Agricultural Inputs & Tools | Easy | Done | All agriculture taxonomy categories included | Low | Not Tested | Retain. |
| 60 | Seeds & Planting Material | Easy | Partial | Agricultural Inputs & Tools | Low | Not Tested | Verify listing completeness. |
| 61 | Fertilizers | Easy | Partial | Agricultural Inputs & Tools | Low | Not Tested | Verify listing completeness. |
| 62 | Pesticides & Protection | Easy | Partial | Agricultural Inputs & Tools | Low | Not Tested | Verify listing completeness. |
| 63 | Farming Tools & Equipment | Easy | Partial | Agricultural Inputs & Tools | Low | Not Tested | Verify listing completeness. |
| 65 | Irrigation Equipment | Easy | Partial | Agricultural Inputs & Tools | Low | Not Tested | Verify listing completeness. |
| 72 | Processed & Value-Added Products | Easy | Done | All agriculture taxonomy categories included | Low | Not Tested | Retain. |
| 73 | Spices & Powders | Easy | Partial | Processed & Value-Added Products | Low | Not Tested | Verify listing completeness. |
| 90 | Animal Feed | Easy | Partial | All agriculture taxonomy categories included | Low | Not Tested | High-frequency purchase category. |
| 153 | Full taxonomy visible only to sellers for listing/management; buyers see only shoppable items and basic categories (Amazon-style) | Medium | Not Started | Manual recheck: verify categories correctly aligned; Ensure proper hierarchy/nesting of subcategories | Medium | Not Tested | Important UX/architecture split. |
| 154 | Product display grid | Easy | Done | None | Low | Not Tested | Retain. |
| 155 | Product listing (basic) | Medium | Partial | Product display grid | Medium | Not Tested | Finish create/edit/delete flow. |
| 164 | Cart and checkout flow | Hard | Not Started | Product display grid; Product listing (basic) | High | Not Tested | Core transaction flow. |
| 165 | Order confirmation and basic order history | Medium | Not Started | Cart and checkout flow | High | Not Tested | Required before fulfillment and emails. |
| 166 | Interactive map on homepage | Easy | Done | None | Low | Not Tested | Retain. |
| 167 | Farmer location markers | Easy | Done | Interactive map on homepage | Low | Not Tested | Retain. |
| 168 | Search farmers functionality | Easy | Done | Interactive map on homepage | Low | Not Tested | Retain. |
| 169 | "Located" filter button | Easy | Done | Interactive map on homepage | Low | Not Tested | Retain. |
| 178 | Logistics/Delivery category visible | Easy | Done | None | Low | Not Tested | Retain. |
| 179 | Basic logistics integration | Medium | Partial | Cart and checkout flow; Order confirmation and basic order history | Medium | Not Tested | Support basic order fulfillment only. |
| 193 | Community metrics display | Easy | Done | None | Low | Not Tested | Retain. |
| 199 | Verified buyer/seller indicators | Medium | Not Started | Auth completed and stable; profile data | Medium | Not Tested | Add marketplace/profile trust indicators only; do not modify auth logic. |
| 201 | Integrated payment gateway with escrow | Hard | Not Started | Cart and checkout flow; Order confirmation and basic order history | High | Not Tested | Provider-backed, high risk. |
| 222 | Farmer help point category visible | Easy | Done | None | Low | Not Tested | Retain. |
| 236 | Government schemes category visible | Easy | Done | None | Low | Not Tested | Retain visible category. |
| 253 | Platform operator dashboards | Medium | Not Started | Auth completed and stable; role/permission data | Medium | Not Tested | Minimum admin/operator view; do not alter auth routes or login flow. |
| 259 | Audit trail and compliance reporting | Hard | Not Started | Platform operator dashboards; Order confirmation and basic order history | High | Not Tested | Must avoid logging secrets/PII unnecessarily. |
| 260 | Free selling model with $1 minimal listing | Easy | Planned | Product listing (basic) | Medium | Not Tested | Pricing decision must be confirmed before enforcement. |
| 261 | Zero entry barriers for small farmers | Easy | Planned | Product listing (basic) | Medium | Not Tested | Policy and UX decision. |
| 262 | Progressive verification tiers | Medium | Not Started | Verified buyer/seller indicators; profile data | Medium | Not Tested | Launch with simple non-auth tier display first. |
| 288 | Product display (basic implementation) | Medium | Partial | Product display grid | Medium | Not Tested | Finalize product detail display. |
| 289 | Favorite feature icon (products/profiles) | Medium | Not Started | Product display (basic implementation) | Low | Not Tested | Can start local-first or authenticated. |
| 290 | Dedicated favorites page | Medium | Not Started | Favorite feature icon (products/profiles) | Medium | Not Tested | Depends on saved favorites state. |
| 296 | Multi-sales management (centralized seller dashboard) | Hard | Not Started | Product listing (basic); Order confirmation and basic order history | High | Not Tested | Seller operations surface. |
| 299 | "My Profile" for all listed products | Medium | Not Started | Auth completed and stable; Product listing (basic) | Medium | Not Tested | Seller-owned listing management; consume existing auth state only. |
| 300 | Future product editing capability | Medium | Not Started | Product listing (basic); "My Profile" for all listed products | Medium | Not Tested | Must preserve product APIs. |
| 303 | Order fulfillment dashboard | Hard | Not Started | Multi-sales management (centralized seller dashboard); Order confirmation and basic order history | High | Not Tested | Needed for real orders. |
| 306 | Seller verification badges | Medium | Not Started | Verified buyer/seller indicators; profile data | Medium | Not Tested | Duplicate trust signal; ship simple marketplace badge first without auth changes. |
| 360 | Student help point (UG/PG/PhD support) | Medium | Not Started | Auth completed and stable | Medium | Not Tested | Safe shell acceptable for sprint; do not change auth. |
| 371 | Login page (needs complete redesign) | Medium | Done | Auth completed and stable | Low | Stable | Completed already; freeze login UI and do not modify. |
| 372 | Modern authentication UI | Medium | Done | Login page UI completed | Low | Stable | Completed already; freeze modern auth UI and do not modify. |
| 378 | Profile completion wizard | Medium | Not Started | Auth completed and stable; user profile data | Medium | Not Tested | Implement as profile/onboarding layer only; do not touch auth routes, handlers, APIs, or working buttons. |
| 385 | About page (benefits/vision/mission/impact) | Easy | Not Started | None | Low | Not Tested | Content-led credibility page. |
| 386 | Company story and values | Easy | Not Started | About page (benefits/vision/mission/impact) | Low | Not Tested | Bundle with About page. |
| 393 | Multi-vendor support (various collaboration types) | Hard | Planned | Auth completed and stable; Profile completion wizard | High | Not Tested | Use safe foundation/shell only in sprint; do not alter auth. |
| 397 | Transaction fees (1.5-3%) | Hard | Not Started | Integrated payment gateway with escrow | High | Not Tested | Must be configured in payment logic. |
| 421 | Manifest file configuration | Easy | Done | None | Low | Needs Manual Review | Production manifest references normal and maskable public logo exports, with Apple touch and favicon exports linked from the app shell. |
| 422 | Add to home screen prompt | Medium | Partial | Manifest file configuration | Low | Needs Manual Review | Browser-safe prompt foundation displays only after a supported browser emits `beforeinstallprompt`. |
| 424 | SSL certificate (verify configuration) | Easy | Planned | Domain agriconnect.group (live) | High | Not Tested | Production hosting configuration. |
| 425 | GDPR compliance (data protection) | Hard | Planned | Privacy Policy page; Cookie consent banner (basic) | High | Not Tested | Legal/compliance review needed. |
| 426 | Data encryption (end-to-end communications) | Medium | Planned | SSL certificate (verify configuration) | High | Not Tested | HTTPS/provider configuration plus secure handling. |
| 428 | Penetration testing | Hard | Planned | Rate limiting on APIs; Secure payment gateway (PCI DSS) | High | Not Tested | External/security review recommended. |
| 429 | DDoS protection | Medium | Planned | SSL certificate (verify configuration) | High | Not Tested | Usually CDN/hosting-backed. |
| 430 | Secure payment gateway (PCI DSS) | Hard | Not Started | Integrated payment gateway with escrow | High | Not Tested | Do not store card data. |
| 431 | Rate limiting on APIs | Medium | Not Started | API endpoint testing | High | Not Tested | Apply carefully to auth/payment endpoints. |
| 433 | Keyboard navigation support | Easy | Not Started | None | Medium | Not Tested | Accessibility baseline. |
| 437 | Alt text for all images | Easy | Not Started | None | Low | Not Tested | Accessibility baseline. |
| 445 | Email support automation | Medium | Not Started | Contact Us / Support page | Medium | Not Tested | Provider may be needed. |
| 448 | Automated order confirmation emails | Medium | Not Started | Order confirmation and basic order history | Medium | Not Tested | Provider may be needed. |
| 460 | Domain agriconnect.group (live) | Easy | Done | None | Medium | Not Tested | Retain and verify separately. |
| 464 | Regional compliance (GDPR/CCPA etc.) | Hard | Planned | GDPR compliance (data protection) | High | Not Tested | Expand after baseline compliance. |
| 470 | International payment gateways (Stripe/PayPal/Razorpay) | Hard | Planned | Secure payment gateway (PCI DSS); Integrated payment gateway with escrow | High | Not Tested | Select one gateway first. |
| 475 | Test every clickable element | Hard | Not Started | Practical working status of all features | Medium | Not Tested | Manual/automated QA batch. |
| 476 | Image verification (load and link) | Medium | Partial | Alt text for all images | Medium | Not Tested | Verify broken/missing assets. |
| 477 | Practical working status of all features | Hard | Partial | Feature Tracker | High | Not Tested | Launch-readiness audit. |
| 478 | Cross-browser testing (Chrome/Firefox/Safari/Edge) | Hard | Not Started | Test every clickable element | Medium | Not Tested | Safari requires Apple/browser access. |
| 479 | Mobile responsiveness testing (all devices) | Hard | Not Started | Test every clickable element | Medium | Not Tested | Focus high-traffic screens first. |
| 480 | Performance optimization (page load speed) | Hard | Not Started | Practical working status of all features | Medium | Not Tested | Avoid premature broad rewrites. |
| 482 | Link checker (broken links) | Easy | Partial | None | Low | Needs Manual Review | Public-route registry and configuration validation foundation added; no automated crawler or runtime link requests. |
| 483 | Form validation testing | Medium | Not Started | Product listing (basic); checkout; support forms | Medium | Not Tested | Exclude stable auth forms unless only smoke-testing; do not modify auth handlers. |
| 484 | Payment gateway testing | Hard | Not Started | Secure payment gateway (PCI DSS); Integrated payment gateway with escrow | High | Not Tested | Requires sandbox provider keys. |
| 485 | Security vulnerability scan | Hard | Not Started | Rate limiting on APIs; Data encryption (end-to-end communications) | High | Not Tested | Do not run destructive tests on production. |
| 487 | API endpoint testing | Medium | Not Started | Backend route inventory | Medium | Not Tested | Start with smoke tests. |
| 488 | User acceptance testing (UAT) | Hard | Not Started | Practical working status of all features; Test every clickable element | Medium | Not Tested | Final launch gate. |

## 20-Day Implementation Plan — Revised for Auth-Stable Sprint

Authentication is already complete and stable. This plan excludes login UI, mobile login, OTP, Google authentication, auth routes, auth handlers, auth APIs, and working auth buttons.

### Day 1: Roadmap update and safety baseline
- Keep this roadmap tracker updated for the remaining non-auth features.
- Add/confirm auth freeze notes.
- Confirm build/lint status before feature work.
- No application feature implementation beyond roadmap/documentation.

### Day 2: Static legal launch essentials
- Privacy Policy page
- Terms of Service / User Agreement
- Refund / Cancellation Policy page
- 404 / error page handling
- Basic SEO meta tags (title/description per page)

### Day 3: Support, cookie, and public trust basics
- Cookie consent banner (basic)
- Contact Us / Support page
- Email support automation as a safe foundation if provider details are ready; otherwise mark as Planned/Needs Provider Setup.
- Do not touch auth buttons or auth routes from the support page.

### Day 4: Navigation polish without auth changes
- Add text labels under sidebar icons
- Increase icon sizes platform-wide
- Sticky top navigation bar
- Keep existing main menu, auth button, and currency behavior unchanged.

### Day 5: About, story, and credibility pages
- About page (benefits/vision/mission/impact)
- Company story and values
- Community metrics display verification
- Free selling model and zero-entry-barrier messaging as content only unless pricing logic is explicitly required later.

### Day 6: PWA and accessibility baseline
- Manifest file configuration
- Add to home screen prompt
- Keyboard navigation support
- Alt text for all images
- Image verification (load and link)
- Link checker/broken links foundation

### Day 7: Taxonomy cleanup and hierarchy
- Manual recheck: verify categories correctly aligned
- Ensure proper hierarchy/nesting of subcategories
- Validate all Easy taxonomy categories without scattering category data across components.

### Day 8: Full taxonomy varieties and buyer/seller split
- Vegetables (47+ varieties)
- Fruits (50+ varieties)
- Full taxonomy visible only to sellers for listing/management
- Buyers see only shoppable items and basic categories, Amazon-style

### Day 9: Product listing foundation
- Product listing (basic)
- Product display (basic implementation)
- Product create form validation
- Keep cart, checkout, and payment untouched.

### Day 10: Product grid, detail, and images
- Product display grid verification
- Product cards/detail display
- Image verification, broken-image fallback, and empty states
- Mobile product grid check

### Day 11: Search, farmer discovery, and filters
- Search functionality
- Search farmers functionality verification
- "Located" filter button verification/improvement
- No private location exposure.

### Day 12: Map discovery and visible marketplace categories
- Interactive map on homepage verification
- Farmer location markers verification
- Logistics/Delivery category visible
- Farmer help point category visible
- Government schemes category visible

### Day 13: Favorites and seller profile products
- Favorite feature icon (products/profiles)
- Dedicated favorites page
- "My Profile" for all listed products
- Future product editing capability as safe foundation/shell if full editing is risky

### Day 14: Trust indicators and profile completion without auth changes
- Verified buyer/seller indicators
- Seller verification badges
- Progressive verification tiers
- Profile completion wizard as profile/onboarding layer only
- Do not change auth routes, handlers, APIs, callbacks, OTP, Google auth, or login UI.

### Day 15: Cart and checkout without payment
- Cart and checkout flow
- Add to cart, quantity update, remove from cart
- Checkout summary
- Create pending/manual-payment order only
- Do not integrate payment, escrow, or transaction fees yet.

### Day 16: Orders and order communication
- Order confirmation and basic order history
- Seller order visibility
- Automated order confirmation emails if provider details are ready; otherwise provider-safe foundation
- Keep payment status separate from order status.

### Day 17: Seller, operator, and fulfillment dashboards
- Platform operator dashboards
- Multi-sales management (centralized seller dashboard)
- Order fulfillment dashboard
- Practical working status of marketplace features initial audit

### Day 18: Logistics, audit, and multi-vendor foundation
- Basic logistics integration
- Audit trail and compliance reporting foundation
- Multi-vendor support as safe shell/foundation only
- Student help point (UG/PG/PhD support) as safe shell if full workflow is risky

### Day 19: Security, compliance, and payment foundation
- SSL certificate verification documentation
- Rate limiting on APIs
- DDoS protection notes/foundation
- Data encryption notes/foundation
- GDPR and regional compliance foundation
- Integrated payment gateway, escrow, PCI DSS, transaction fees, and international gateways as provider-ready plan/foundation only unless sandbox keys and webhook design are ready

### Day 20: QA, performance, and release readiness
- Test every clickable element
- Link checker (broken links)
- Form validation testing excluding stable auth internals
- API endpoint testing smoke tests
- Cross-browser testing (Chrome/Firefox/Safari/Edge)
- Mobile responsiveness testing
- Performance optimization (page load speed)
- Security vulnerability scan checklist
- Penetration testing checklist
- Payment gateway testing only if a real sandbox gateway was implemented
- User acceptance testing (UAT)
- Update all tracker statuses and document remaining Planned/Partial/UI Shell/Needs External Setup items.

### Auth Freeze Rule for Every Day

For every daily batch, Codex must follow this rule:

```text
Authentication is completed and stable. Do not modify login UI, mobile number login, OTP authentication, Google authentication, auth routes, auth handlers, auth APIs, callbacks, tokens, or working auth buttons. If a feature needs user identity, consume the existing stable auth state only.
```

## Batch Completion Template

Use this after each daily implementation batch:

1. Changed files:
2. Implemented:
3. Manual test:
4. Incomplete or risky parts:
5. Rollback notes:
