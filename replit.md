# AgriConnect - Agricultural Marketplace Platform

## Overview
AgriConnect is a comprehensive agricultural e-commerce platform designed to directly connect farmers with buyers, thereby removing intermediaries and fostering dignified economic opportunities across all demographics. The platform emphasizes zero-education accessibility through icon-based navigation, integrates real-time map functionalities, and leverages AI-powered features for enhanced user experience and operational efficiency. The project aims to create a global, multi-region platform supporting a wide array of agricultural products and services, including logistics, land leasing, and government scheme access, with a vision to empower farmers and streamline agricultural commerce worldwide.

## User Preferences
I prefer clear and concise communication. When making changes, prioritize core features and architectural improvements. For any significant modifications or new feature implementations, please ask for confirmation before proceeding. I value iterative development and prefer explanations that focus on the "why" behind design choices.

## System Architecture
The platform is built with a modern web stack: React 18+ with TypeScript for the frontend, utilizing TailwindCSS for styling and Framer Motion for animations. State management is handled by TanStack Query, and routing by Wouter. UI components are built using shadcn/ui with Radix primitives. The backend is an Express.js server also written in TypeScript.

**Key Architectural Decisions & Features:**

*   **Authentication:** A robust session-based authentication system using Passport.js supports local username/password (with bcryptjs), Google OAuth, 2FA (TOTP), passwordless magic links, and WebAuthn for passkeys. Post-registration, a profile wizard guides users through initial setup. **User accounts and sessions are persisted in PostgreSQL** via `server/db.ts` (drizzle-orm + node-postgres) and `connect-pg-simple` session store — both survive server restarts.
*   **UI/UX:** A mobile-first, responsive design with full dark mode support and a primary green color scheme (142° hue) to represent agriculture. The Inter font is used for readability. Accessibility is prioritized with large touch targets and icon-driven navigation, supporting zero-education accessibility.
*   **Internationalization:** Multi-language support for 6 languages (English, Hindi, Punjabi, Tamil, Welsh, Polish) using i18next, including a language switcher, auto-translate toggle for product descriptions, and AI-powered voice commands with localized regex patterns and text-to-speech capabilities.
*   **Mapping & GIS:** A sophisticated Smart Map (`/map`) powered by Leaflet (react-leaflet) offers multiple tile layers (OSM, Satellite, Terrain), advanced overlay toggles (farmers, demand, heatmap, survey, irrigation), drawing tools for parcel management with area calculation, and GeoJSON import/export capabilities. A reusable `LeafletFarmerMap` component is integrated across relevant pages.
*   **E-commerce Core:**
    *   **Marketplace Homepage:** Features an interactive map, product grid with filtering and sorting, and a two-level category sidebar.
    *   **Product Listing:** A "Photo-Sell Flow" allows instant listing via camera capture, with AI simulation for product, quantity, quality, and price detection.
    *   **Cart & Checkout:** Standard cart management with multiple delivery options and payment methods (UPI, Card, COD), leading to a multi-step checkout flow. Cart items carry an optional `unitPrice` + `purchaseMode` (`one-time`/`subscribe`) + `subFrequency` so PDP-side bulk-tier and Subscribe & Save discounts persist into cart totals and Stripe checkout line items.
    *   **Product Comparison (F.8):** Side-by-side comparison of up to 4 products via `useCompare` hook (localStorage + cross-component `compare-changed` event), a global floating `CompareBar`, and `/compare` page with winner highlighting (lowest price / highest rating / closest distance — only highlights distance when ≥1 product has a numeric distance).
    *   **Bulk Pricing Tiers (F.9):** PDP buy box shows 4 quantity tiers (1–9 base, 10–49 −10%, 50–199 −18%, 200+ −25%) with the active tier highlighted; clicking a tier jumps the quantity selector.
    *   **Subscribe & Save (F.10):** PDP toggle between One-time purchase and Subscribe & Save (−10% on top of any bulk discount) with frequency picker (weekly / bi-weekly / monthly). Buy Now is disabled in subscribe mode (subscriptions go to cart, not flash checkout).
    *   **Order Management:** Buyers have an order history with status tracking and detail views, while sellers have a dedicated hub for managing orders and updating statuses. Full post-cart lifecycle: pre-checkout `/api/cart/validate` confirms live stock before Stripe redirect; stock is restored idempotently on cancel / stale Stripe / payment-failed paths via `restoreStockForOrder` (guarded by `Order.stockRestored`); buyers can cancel `order_placed | payment_confirmed | processing` orders, with refund-first flow for paid Stripe orders (Stripe `refunds.create` with idempotency key, fails closed if Stripe errors so inventory isn't released while money is held); sellers capture `trackingNumber`/`carrier`/`trackingUrl` via a dialog when transitioning to `shipped`/`out_for_delivery`, surfaced on the buyer's order-detail page; "Support" deep-link from order-detail prefills the support form with the order number.
    *   **Review System:** Users can submit reviews for delivered orders, impacting product ratings.
*   **Farmer Empowerment Tools:**
    *   **Farmers Help Point:** AI-powered recommendations, geolocation analysis, competitor insights, comprehensive guidance across 10 agricultural categories, weather and market price info, and government schemes.
    *   **Farmer Dashboard:** Icon-based navigation, stats overview (earnings, orders, products, rating), activity feed, and demand alerts.
    *   **Demand Alerts:** Real-time buyer demand notifications with urgency levels and location information.
*   **Logistics:** Integration with 12+ logistics partners (international, national, hyperlocal, cold-chain, freight) and a "Milk Run" smart batching system for cost-effective routes. Real-time shipment tracking with temperature monitoring is also supported.
*   **Land Leasing Marketplace:** A comprehensive system for land discovery and leasing, including filtering options by type, price, area, and amenities. Expanded to include "For Sale," "Investment," "Community," and "Government Programs" tabs.
*   **Product Taxonomy & Filtering:** Extensive category and subcategory structure, with dietary and lifestyle filtering chips (e.g., Keto, Vegan, Gluten-Free) and corresponding badges on product cards.
*   **Global Reach:** Support for 75+ countries across 6 continents, featuring an enhanced RegionSwitcher with search, geo-detection, continent grouping, multi-currency display, and persistent region preferences.

## External Dependencies
*   **Payment Gateways:** UPI, Card processing (simulated), Cash on Delivery (COD)
*   **Logistics Partners:** DHL Express, FedEx, UPS, Royal Mail, DPD UK, Evri, Cold Chain UK, FreshLinc, Maersk, DB Schenker, Deliveroo Fresh, Stuart
*   **Mapping Services:** OpenStreetMap (OSM), ESRI WorldImagery, OpenTopoMap
*   **Authentication:** Google OAuth
*   **AI Services:** Internal AI detection simulation, AI-powered voice interpretation (via `/api/ai/voice`), auto-translation (via `/api/ai/translate`)
*   **Libraries/Frameworks:** React, Express.js, TypeScript, TailwindCSS, Framer Motion, TanStack Query, Wouter, shadcn/ui, Radix primitives, Passport.js, express-session, bcryptjs, passport-google-oauth20, speakeasy, qrcode, @simplewebauthn/server, @simplewebauthn/browser, Leaflet (react-leaflet), i18next.