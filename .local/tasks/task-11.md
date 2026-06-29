---
title: Make tables on Orders and Dashboard scroll inside their card on mobile
---
# Make tables on Orders and Dashboard scroll inside their card on mobile

  ## What & Why
  A quick audit showed the Orders and Dashboard pages render tabular data using flex/grid rows rather than `<table>`, but on narrow viewports several rows still risk pushing their parent wide because individual cells (status badges, currency, action buttons) have intrinsic content widths. The current fix relies on global `overflow-x: hidden` on body, which clips overflow but hides data instead of letting users scroll to see it.

  ## Done looks like
  - Every tabular section on Orders and Dashboard is wrapped in `overflow-x-auto -mx-4 px-4` so the row scrolls horizontally inside its card while the surrounding page does not.
  - Sticky first column where appropriate (e.g. order ID, product name) so users keep context while scrolling.

  ## Relevant files
  - `client/src/pages/orders.tsx`
  - `client/src/pages/dashboard.tsx`