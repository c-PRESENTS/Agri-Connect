# AgriConnect Design Guidelines - Award-Winning Premium Design

## Design Philosophy
Inspired by Awwwards winners: Getty Persepolis (cinematic storytelling), Opal Camera (premium minimalism), Wolfpack Group (bold visual impact).

## Typography System

### Primary Font: Space Grotesk
- Headlines, titles, navigation
- Weights: 500 (Medium), 600 (SemiBold), 700 (Bold)
- Letter-spacing: -0.02em for headlines

### Secondary Font: Inter
- Body text, UI elements
- Weights: 400 (Regular), 500 (Medium), 600 (SemiBold)

### Type Scale
- Display: 4rem (64px) - Hero headlines
- H1: 2.5rem (40px) - Page titles
- H2: 1.875rem (30px) - Section headers
- H3: 1.5rem (24px) - Card titles
- Body: 1rem (16px)
- Small: 0.875rem (14px)
- Tiny: 0.75rem (12px)

## Color Palette

### Primary - Agricultural Green
- Primary: hsl(142, 76%, 36%)
- Primary Light: hsl(142, 60%, 45%)
- Primary Dark: hsl(142, 80%, 28%)

## Spacing System - Ultra Compact

### Category Grid Spacing
- Grid gap: 6px (ultra-compact)
- Item padding: 8px
- Touch targets: minimum 48px
- Category items: minmax(72px, 1fr)

### Layout Margins
- Mobile: 12px
- Tablet: 16px
- Desktop: 24px

## Animation Principles

### Timing Functions
- Quick: 100ms ease-out (touch feedback)
- Standard: 200ms cubic-bezier(0.4, 0, 0.2, 1)
- Entrance: 300ms cubic-bezier(0.16, 1, 0.3, 1)

### Micro-interactions
- Hover: translateY(-2px), scale(1.02)
- Press: scale(0.98), instant
- Focus: ring-2 offset-2

### Scroll Animations
- Fade-in-up staggered entrance
- Parallax hero sections

## Category Grid Design

### Compact Image-Based Layout
```css
grid: auto-fit, minmax(72px, 1fr)
gap: 6px
padding: 8px
border-radius: 12px
image: 40x40px centered
text: 10px, single line, truncated
background: subtle gradient on hover
```

### Touch Optimization
- Active state < 50ms response
- Full item clickable area
- Visual ripple effect

## Visual Effects

### Glass Morphism
- backdrop-blur: 20px
- background: rgba with 0.8-0.95 opacity
- border: 1px solid border/30

### Premium Shadows
- Minimal use
- Glow effects on primary elements

### Gradient System
- Primary gradient: from-primary to-green-600
- Mesh gradients for backgrounds
