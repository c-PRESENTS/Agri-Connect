# Theme & Appearance Overhaul

## What & Why
Elevate the visual design with a Binance Q-Style inspired aesthetic — sleek, modern, high-contrast UI like a premium crypto/fintech exchange — combined with glassmorphism card effects, smooth theme-toggle animation, and polished micro-animations. This makes AgriConnect feel premium and trustworthy rather than generic.

## Done looks like
- Theme toggle has a smooth animated transition (sun↔moon icon rotation/scale with a brief full-screen crossfade overlay so the mode switch feels fluid)
- Overall UI feels like a premium dark-mode fintech app (Binance-Q style): strong dark backgrounds, glowing primary accents, sharp card borders with subtle glow, dense but clean information hierarchy
- Product cards, modals, sidebars, and hero section use glassmorphism: frosted glass backgrounds, translucent borders, soft backdrop blur
- Hover and tap interactions have micro-animations throughout: cards lift with shadow, buttons scale and glow, nav items slide/pulse, badges shimmer
- Light mode retains clarity but with same refined edge: subtle shadows, crisp borders, cleaner card elevation

## Out of scope
- Changing brand colors (green primary stays)
- Restructuring layouts or adding new pages
- Any backend changes

## Tasks
1. **Smooth theme toggle animation** — Wrap theme change in a brief CSS transition: fade/scale overlay on `<html>` root, animated sun/moon icon swap in ThemeToggle with spring physics.

2. **Binance Q-Style design tokens** — Update dark mode CSS variables for a richer dark palette (deep charcoal backgrounds, stronger contrast foreground, vibrant primary glow, sharp metallic borders). Light mode gets tighter shadows and cleaner card elevation.

3. **Glassmorphism card & modal system** — Apply consistent `backdrop-blur`, translucent backgrounds, and subtle inner-border highlights to product cards, cart sheet, modals, sidebars, hero, and feature panels.

4. **Micro-animations across the platform** — Add hover lift/glow to product cards, scale+shadow to CTA buttons, staggered list entrance for product grids, shimmer on badge/tags, and pulse animations on notification counts.

## Relevant files
- `client/src/index.css`
- `client/src/components/theme-toggle.tsx`
- `client/src/lib/theme-provider.tsx`
- `client/src/components/product-card.tsx`
- `client/src/components/cart-sheet.tsx`
- `client/src/components/hero-section.tsx`
- `client/src/components/top-navigation.tsx`
- `client/src/components/app-nav-rail.tsx`
- `client/src/components/product-filters.tsx`
- `client/src/components/deep-nav-panel.tsx`
- `client/src/components/feature-showcase.tsx`
