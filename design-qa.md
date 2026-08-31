# Seller Storefront Compact Layout Design QA

- Source visual truth: `C:\Users\harsh\AppData\Local\Temp\codex-clipboard-321430ea-b3af-4091-86e3-ae74824de470.png`
- Implementation route: `http://localhost:5000/sellers/{sellerId}`
- Implementation screenshot: unavailable because the existing local application is not listening on port 5000.
- Target viewport: 1441 x 967 pixel wide desktop capture.
- Source dimensions: 1441 x 967 pixels.
- Implementation dimensions: unavailable.
- CSS viewport and density normalization: unavailable because no browser-rendered implementation could be captured.
- State: light theme, owner storefront, verified seller, 1,636 public products, zero reviews, owner actions visible, Available Produce selected, and Mumbai store map visible.

**Full-view comparison evidence**

- The source image was opened at original resolution. It shows a narrow centered storefront rail surrounded by large unused horizontal gutters, a tall profile hero, three product columns, and a 360px map rail.
- A post-change browser capture could not be obtained, so no valid same-viewport full-view comparison is available.

**Focused region comparison evidence**

- Source regions inspected: breadcrumb and Seller Hub action, seller avatar and identity, verification and owner badges, favorite and listing controls, product tabs, product-card grid, Store Location header, map, and nearby-products panel.
- A focused post-change comparison was not possible because the local application is unavailable.

**Findings**

- [P1] Post-change rendered evidence is unavailable.
  - Location: `/sellers/{sellerId}`, owner storefront state.
  - Evidence: no process is listening on port 5000.
  - Impact: exact wide-screen balance, four- and five-column product-card wrapping, map height, sticky sidebar behavior, responsive stacking, and interaction states cannot be visually accepted.
  - Fix: restart the existing local development server, capture the same seller at 1441 x 967, and compare it with the source image.

**Required fidelity surfaces**

- Fonts and typography: existing font family, weights, sizes, truncation, price hierarchy, badges, and small metadata remain unchanged; only layout chrome has been tightened. Rendered fidelity remains unverified.
- Spacing and layout rhythm: centered `max-w-7xl` ceilings were removed from the breadcrumb, hero, and main workspace; outer gutters, hero padding, action heights, tab height, section gaps, card gaps, empty state, and map panel were reduced.
- Colors and visual tokens: existing emerald, amber, slate, card, border, background, verification, owner, gradient, and dark-mode tokens are preserved.
- Image quality and asset fidelity: all real seller avatars, product images, fallback image resolution, map tiles, and map markers remain supplied by their existing components and data sources; no image was replaced or approximated.
- Copy and content: seller data, counts, prices, locations, listings, tabs, favorite state, add-listing behavior, product navigation, cart behavior, owner controls, and map content remain unchanged.

**Comparison history**

- Initial source review found large unused side gutters, a tall breadcrumb and hero stack, only three product columns, generous grid gaps, non-compact product cards, and an oversized location map relative to the product workspace.
- Implemented fixes: expanded the layout to the available viewport; tightened breadcrumb, hero, avatar, actions, tabs, empty state, and section rhythm; enabled the existing compact ProductCard treatment; increased the grid to four columns at `xl` and five at `2xl`; narrowed and shortened the map rail; and made the location panel sticky on desktop.
- Post-fix visual evidence: blocked because the local application is not listening on port 5000.

**Implementation checklist**

- [x] Use the full seller-storefront workspace instead of a centered maximum-width rail.
- [x] Compact the breadcrumb, seller hero, avatar, and action controls.
- [x] Increase product density with responsive four- and five-column layouts.
- [x] Reuse the existing compact ProductCard variant without changing product behavior.
- [x] Reduce and pin the desktop Store Location panel while preserving map and empty-coordinate states.
- [x] Preserve seller API data, owner permissions, favorites, listing navigation, cart actions, tabs, and test IDs.
- [x] Validate the updated TSX source transform.
- [ ] Capture and compare the owner storefront at the source viewport.
- [ ] Exercise Favorite, Add Listing, product navigation, Add to Cart, Store & Farm Details, map behavior, responsive layouts, and browser console errors.

**Follow-up polish**

- Reassess product-card title wrapping and the 20rem map rail at the exact browser zoom used for the source capture.

final result: blocked
