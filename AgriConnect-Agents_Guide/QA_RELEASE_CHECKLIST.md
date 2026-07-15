# AgriConnect Manual QA and Release Checklist

Use a clean browser profile plus separate buyer, farmer, logistics, and admin test accounts. Record date, browser, viewport, account role, result, and evidence for every checked item. Unchecked items are not verified.

## Clickable elements and keyboard

- [ ] Tab from the skip link through desktop navigation, account menu, page controls, dialogs, and footer without a keyboard trap.
- [ ] Confirm visible focus, logical tab order, Enter/Space activation, Escape-to-close, disabled-state behavior, and accessible names.
- [ ] Check navigation on `/`, `/dashboard`, `/seller`, `/fulfillment`, `/operator`, `/cart`, `/checkout`, `/orders`, `/favorites`, `/my-profile`, `/map`, `/ship`, `/logistics`, `/support`, and legal pages.
- [ ] Check product cards, seller cards, category controls, search suggestions, favorite/cart controls, filters, menus, tabs, selects, quantity controls, forms, dialog actions, and empty/error retry buttons.
- [ ] Confirm protected links redirect unauthenticated users to login and return safely; do not alter auth configuration during QA.
- [ ] Confirm unavailable controls are disabled or labelled as foundations rather than navigating to 404 pages.

## Mobile responsiveness

- [ ] Test 320, 375, 390, 768, 1024, and 1440 CSS-pixel widths at 100% and 200% zoom.
- [ ] Check no horizontal overflow, clipped dialogs, overlapping fixed navigation, hidden submit buttons, or unreadable totals.
- [ ] Check portrait/landscape, touch target size, virtual-keyboard behavior, safe-area padding, scrolling, sticky headers, images, maps, tables, cards, and checkout steps.
- [ ] Confirm mobile navigation opens Home, Browse, Map, Cart, Profile, Ship, and role-safe destinations correctly.
- [ ] Verify loading, empty, error, validation, long-content, and large-text states on cart, checkout, orders, seller, fulfillment, and operator pages.

## Performance and assets

- [ ] Run an approved production build and review route chunks; do not remove functionality to improve scores.
- [ ] Record Lighthouse/Web Vitals on representative public, marketplace, map, dashboard, and checkout routes.
- [ ] Confirm below-the-fold images lazy-load and primary above-the-fold imagery is not delayed unnecessarily.
- [ ] Review the approximately 1 MB logo and maskable icon plus 400–500 KB stock images for lossless/responsive conversion before production.
- [ ] Confirm product/cart queries reuse cache where appropriate and that periodic map/seller refreshes stop when their views unmount.

## Links

- [ ] Run `npm run qa:links` for static internal-route matching and external URL syntax.
- [ ] Manually open parameterized routes for real product, seller, order, confirmation, and shipment IDs.
- [ ] Check external map, carrier, government, support-email, legal, OAuth, and provider links from the deployment network.
- [ ] Recheck redirects and outbound destinations after the production domain is configured.

## Security vulnerability review

- [ ] Run non-destructive dependency and secret scans in approved CI; retain reports and review findings rather than applying forced upgrades.
- [ ] Recheck the documented Vonage dependency chain. Do not use `npm audit fix --force` or modify frozen OTP/auth code without approval.
- [ ] Review security headers, CSP reports, cookie attributes, CORS/origin configuration, request-size limits, rate-limit settings, logs, backups, and secret-manager access.
- [ ] Confirm logs contain no passwords, tokens, message bodies, addresses, payment data, or full API responses.

## Penetration testing — Needs External Setup

- [ ] Define written scope, staging target, test accounts, data handling, rate limits, excluded providers, emergency contacts, and stop conditions.
- [ ] Obtain hosting/provider authorization and use synthetic data only.
- [ ] Cover authorization boundaries, IDOR, injection, XSS, CSRF, SSRF, file/URL handling, session security, business logic, inventory races, and API abuse.
- [ ] Triage findings by severity, remediate, retest, and retain a signed report. No penetration test was performed in this release pass.

## User acceptance testing

- [ ] Buyer: discover products, favorite, add/update/remove cart items, reject invalid stock, checkout manually, view/cancel permitted orders, and contact support.
- [ ] Farmer: create a valid listing, see only owned listings/orders/sales, process fulfillment transitions, and reject access to unrelated orders.
- [ ] Logistics: obtain configured/simulated quotes, book/track permitted shipments, and verify provider state without credential exposure.
- [ ] Admin/operator: view aggregate-only metrics; verify buyer/auth details are not exposed.
- [ ] Accessibility user: complete primary flows using keyboard, screen-reader labels, 200% zoom, reduced motion, and high contrast.
- [ ] Product owner: approve wording, legal/provider limitations, pricing/manual-payment language, empty states, and release notes.

## Release gate

- [ ] Build, type-check, focused tests, browser matrix, mobile checks, UAT, backup restore, rollback, monitoring, and external-provider smoke tests have recorded evidence.
- [ ] All critical/high defects are resolved or explicitly accepted by an authorized owner.
- [ ] External services and compliance controls are either configured and evidenced or remain labelled `Needs External Setup`.
