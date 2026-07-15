# AgriConnect Revised 20-Day Roadmap — Authentication Stable Version

## Important Completed Authentication Scope

The following authentication work is already completed and stable:

* Login page UI is done
* Mobile number login is done
* OTP authentication is done end-to-end
* Google authentication is done end-to-end

## Authentication Freeze Rules

Do not modify:

* Login UI
* Mobile number login
* OTP authentication
* Google authentication
* Auth routes
* Auth handlers
* Auth APIs
* Auth callbacks
* Auth tokens/session logic
* Working login/signup/auth buttons

Authentication must be treated as completed, stable, and frozen unless explicitly reopened later.

## Updated Execution Rule

Proceed with ROADMAP_STATUS.md, but update the 20-day execution plan for the remaining non-auth features only.

Do not treat the 20-day roadmap as a promise that every hard feature will be fully production-ready.

For hard/high-risk features such as payment gateway, escrow, PCI DSS, GDPR, DDoS protection, penetration testing, international payments, and full compliance, create safe foundations, UI shells, documentation, or provider-ready architecture unless full implementation is explicitly safe and testable.

## Status Rules

Mark features honestly as one of:

* Done
* Partial
* Planned
* UI Shell
* Blocked
* Needs External Setup
* Frozen

Do not mark payments, escrow, PCI DSS, GDPR, penetration testing, DDoS, or international payment gateways as Done unless they are truly implemented, configured, tested, and verified.

---

# Revised 20-Day Implementation Plan

## Day 1: Roadmap Tracker + Build Safety Check

Tasks:
* Confirm all remaining features are tracked
* Confirm current app builds successfully
* Add clear status meanings: Done, Partial, Planned, UI Shell, Blocked, Needs External Setup, Frozen

Rules:

* Do not modify application code
* Do not touch auth
* Do not change routes, handlers, APIs, or UI logic
* Documentation/tracker only

---

## Day 2: Static Legal Pages

Tasks:

* Privacy Policy page
* Terms of Service / User Agreement
* Refund / Cancellation Policy page
* Contact Us / Support page
* 404 / error page handling

Rules:

* Do not touch auth
* Do not touch product, cart, checkout, payment, or database logic
* Use existing layout/navigation
* Legal content should be treated as draft unless reviewed

---

## Day 3: SEO, Cookie, Manifest, Support Basics

Tasks:

* Basic SEO meta tags per page
* Cookie consent banner
* Manifest file configuration
* Add to home screen prompt foundation
* Link checker foundation
* Contact/support flow foundation

Rules:

* Cookie banner should be simple and non-blocking
* Do not implement complex GDPR logic yet
* Do not claim full compliance
* Do not touch auth

---

## Day 4: Navigation and UI Polish

Tasks:

* Add text labels under sidebar icons
* Increase icon sizes platform-wide
* Sticky top navigation bar
* Verify main menu items: LAND, SHARE, SHIP, HELP, USER
* Verify currency selector: GB £
* Improve responsive layout where safe

Rules:

* UI/layout only
* Do not change auth buttons or handlers
* Do not rename existing routes
* Do not remove existing working navigation
* Do not break mobile layout

---
Get-Process ChatGPT,codex,node_repl -ErrorAction SilentlyContinue | Stop-Process -Force
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5000/api/health
## Day 5: About, Brand, and Homepage Credibility

Tasks:

* About page with benefits, vision, mission, and impact
* Company story and values
* Community metrics display verification
* Farmer help point category visibility
* Government schemes category visibility
* Logistics/Delivery category visibility
* Free selling model messaging
* Zero entry barriers for small farmers messaging

Rules:

* Do not fake live metrics
* Use existing data if available
* If data is not available, use honest static/marketing sections
* Do not touch auth

---

## Day 6: Taxonomy Cleanup and Hierarchy

Tasks:

* Manual recheck of category alignment
* Ensure proper hierarchy/nesting of subcategories
* Verify all easy agriculture taxonomy categories
* Keep taxonomy centralized

Rules:

* Do not scatter category arrays across components
* Do not delete existing categories
* Merge carefully with existing taxonomy
* Do not break product/category pages

---

## Day 7: Full Vegetable and Fruit Expansion

Tasks:

* Vegetables: 47+ varieties
* Fruits: 50+ varieties
* Validate Daily Needs Market categories
* Validate Fresh Farm Produce categories
* Validate wholesale vegetable and fruit categories

Rules:

* Use centralized taxonomy/config file
* Keep naming consistent
* Do not hardcode the same lists repeatedly
* Do not change product schema unless absolutely required

---

## Day 8: Buyer/Seller Taxonomy Split

Tasks:

* Full taxonomy visible to sellers for listing/management
* Buyers see only shoppable/basic categories
* Amazon-style buyer category browsing
* Seller category management/listing view

Rules:

* Do not touch auth
* Use existing user role/profile information only
* Add safe fallback if role is missing
* Do not break existing category browsing

---

## Day 9: Product Listing Basic

Tasks:

* Complete basic product listing flow
* Seller can create listing
* Listing uses centralized taxonomy
* Add basic validation
* Handle empty states

Rules:

* Do not implement cart
* Do not implement checkout
* Do not implement payment
* Do not implement escrow
* Do not touch auth logic
* Keep product fields minimal and stable

Recommended basic fields:

* Product name
* Category
* Price or price note
* Quantity/availability
* Location
* Seller/user reference
* Optional image

---

## Day 10: Product Grid, Cards, and Image Safety

Tasks:

* Product display grid verification
* Product card polish
* Product display basic implementation
* Image verification: load and link
* Broken image fallback
* Missing image fallback
* Responsive grid check

Rules:

* Do not change product creation unless required
* Do not add payment/cart logic
* Broken images must not break layout
* Use safe fallback image or placeholder

---

## Day 11: Search and Discovery

Tasks:

* Search functionality
* Search farmers functionality
* Located filter button
* Search empty states
* Search loading states if async

Rules:

* Do not rewrite product architecture
* Do not expose private user data
* Search should use public product/profile/location data only
* Do not touch auth

---

## Day 12: Map Discovery and Marker Cleanup

Tasks:

* Interactive map homepage verification
* Farmer location markers
* Search farmers connection to map if safe
* Located filter connection to map/location if safe
* Missing coordinate fallback
* Mobile map view check

Rules:

* Do not expose exact private addresses unless intentionally public
* Use city/region/approximate location where needed
* Do not add heavy map dependency unless already used
* Do not break existing map rendering

---

## Day 13: Favorites and My Profile Products

Tasks:

* Favorite icon for products/profiles
* Dedicated favorites page
* My Profile section for all listed products
* Seller-owned product management view
* Future product editing foundation

Rules:

* Do not touch auth internals
* Use existing logged-in user context only
* Prevent duplicate favorites
* If advanced editing is risky, create UI foundation only
* Do not break product listing/grid

---

## Day 14: Verification Badges and Profile Completion

Tasks:

* Verified buyer/seller indicators
* Seller verification badges
* Progressive verification tiers
* Profile completion wizard/checklist
* Student help point shell if safe

Important distinction:

Profile completion is not authentication. It should be treated as onboarding/profile UX only.

Rules:

* Do not change login, OTP, Google auth, mobile login, or auth routes
* Do not block existing users from logging in
* Use safe default values for existing users
* If database fields are required, make them optional/backward-compatible

Suggested verification tiers:

* Basic Profile
* Contact Details Added
* Seller Details Added
* Verified Seller
* Trusted Seller

---

## Day 15: Trust, Onboarding, and Marketplace Policy

Tasks:

* Verified buyer/seller indicator polish
* Progressive verification display polish
* Free selling model with $1 minimal listing as policy/config/UI foundation
* Zero entry barriers for small farmers as policy/config/UI foundation
* Student help point page or shell
* Seller verification badge display consistency

Rules:

* Do not enforce payment/listing fee unless confirmed
* If pricing is not final, mark as Planned or Policy Pending
* Do not modify payment logic
* Do not touch auth

---

## Day 16: Basic Orders and Order History Without Payment

Tasks:

* Order confirmation
* Basic order history
* Buyer order history view
* Seller order visibility
* Basic order status model

Rules:

* Do not implement payment gateway
* Do not implement escrow
* Do not implement transaction fees
* Payment status can be pending/manual for now
* Validate product availability
* Do not touch auth internals

Suggested order statuses:

* pending
* confirmed
* processing
* shipped
* delivered
* cancelled
* refunded

---

## Day 17: Cart and Checkout Without Payment

Tasks:

* Cart flow
* Add to cart
* Quantity update
* Remove from cart
* Checkout summary
* Create order from checkout
* Connect checkout to order confirmation/order history

Rules:

* Do not integrate payment gateway
* Do not add escrow
* Do not add transaction fees
* Do not store card/payment data
* Use pending/manual payment state only
* Do not touch auth internals

---

## Day 18: Dashboards, Logistics, and Email Foundation

Tasks:

* Basic logistics integration foundation
* Multi-sales management / centralized seller dashboard
* Order fulfillment dashboard
* Platform operator dashboard
* Automated order confirmation email foundation
* Email support automation foundation

Rules:

* Do not integrate real logistics provider unless already configured
* Do not block order creation if email fails
* Do not expose email credentials
* Use environment variables for provider config
* Use empty states, not fake data
* Keep dashboards simple and role-safe

---

## Day 19: Security, Accessibility, Compliance Foundation

Tasks:

* Rate limiting on APIs where safe
* SSL certificate verification documentation
* DDoS protection notes/foundation
* Data encryption notes/foundation
* GDPR compliance foundation
* Regional compliance foundation
* Audit trail foundation
* Keyboard navigation support
* Alt text for all images
* API endpoint testing foundation
* Form validation testing foundation

Rules:

* Do not claim full GDPR/CCPA compliance
* Do not claim penetration testing is complete
* Do not weaken auth
* Do not touch auth routes/handlers/APIs
* Do not expose secrets
* Do not run destructive scans on production
* Mark provider/security-dependent items as Needs External Setup where appropriate

---

## Day 20: QA, Performance, Release Notes, Final Status

Tasks:

* Test every clickable element
* Cross-browser testing checklist: Chrome, Firefox, Safari, Edge
* Mobile responsiveness testing checklist
* Performance optimization pass
* Link checker / broken links
* Security vulnerability scan checklist
* Penetration testing checklist
* User acceptance testing checklist
* Practical working status of all features
* CLIENT_DEMO_CHECKLIST.md
* Final update to ROADMAP_STATUS.md

Rules:

* Do not add large new features today
* Focus on stabilization, documentation, status accuracy, and demo readiness
* Do not make risky architecture changes

---

# Features That Must Stay Frozen

The following should not be touched in this sprint:

* Login page UI
* Mobile login
* OTP authentication
* Google authentication
* Existing auth APIs
* Existing auth handlers
* Existing auth routes
* Existing auth buttons
* Existing auth session/token behavior

---

# High-Risk Features Handling

Treat the following as safe foundation, UI shell, documentation, or Needs External Setup unless already fully configured and testable:

* Integrated payment gateway with escrow
* Secure payment gateway / PCI DSS
* Transaction fees
* Stripe / PayPal / Razorpay international gateway setup
* GDPR/CCPA full compliance
* DDoS protection
* Penetration testing
* Security vulnerability scan
* Full audit/compliance reporting
* Payment gateway testing

Do not mark these as Done unless they are truly working, tested, verified, and externally configured where required.

---

