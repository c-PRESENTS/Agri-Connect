# Frontend Engineering Guide

**Scope:** AgriConnect web and PWA frontend work  
**Applies with:** `docs/AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DOMAIN_RULES.md`, `docs/SECURITY.md`, and `docs/TESTING.md`

## 1. Purpose

This document defines frontend-specific guidance for Codex and other AI-assisted development tools working on AgriConnect.

The frontend must remain:

- secure
- accessible
- responsive
- multilingual
- maintainable
- resilient under real user traffic
- consistent across user roles and product surfaces

Repository code and approved product specifications remain the source of truth. Do not invent routes, components, APIs, environment variables, design tokens, permissions, or domain behavior.

## 2. Instruction Priority

For frontend tasks, follow this order:

1. The user's current request.
2. The active root `AGENTS.md` instructions.
3. This frontend guide.
4. The architecture, domain, security, and testing documents.
5. Existing repository conventions.

When documents conflict, follow the higher-priority instruction and report the conflict.

## 3. Frontend Scope Control

- Modify only the route, component, hook, utility, style, or configuration required by the request.
- Inspect the directly related files before editing.
- Reuse existing components, hooks, providers, schemas, API clients, and design tokens.
- Do not perform broad UI redesigns, route restructuring, framework migration, or state-management replacement unless explicitly requested.
- Do not create, delete, rename, or move files unless the user explicitly authorizes it.
- Do not install or update packages without explicit authorization.

## 4. Layer Boundaries

Keep responsibilities separated:

### Presentation components

Presentation components should:

- render UI
- receive clear props
- expose user interactions
- avoid direct persistence or network logic
- avoid embedding domain rules

### Feature components

Feature components may:

- coordinate page-level state
- call approved hooks or services
- map API data to UI models
- handle role-aware presentation

They must not duplicate authorization or business rules that belong on the backend.

### Hooks and services

Use existing hooks and service modules for:

- API requests
- authentication state
- localization
- form coordination
- shared feature behavior
- browser storage access

Do not make ad hoc `fetch` or HTTP calls inside unrelated UI components when the project has an established API client.

### Utilities

Utilities must be:

- deterministic where possible
- narrowly focused
- free of hidden side effects
- named according to the domain behavior they implement

## 5. Component Design

- Keep components focused on one clear responsibility.
- Prefer composition over large configurable components with many unrelated modes.
- Extract shared UI only when there is real reuse or a clear consistency benefit.
- Avoid premature component abstraction.
- Keep role-specific behavior explicit and readable.
- Do not create duplicate desktop and mobile business logic. Share behavior while allowing responsive presentation differences.
- Use stable keys for rendered lists; never use array indexes when item identity exists.
- Preserve existing design-system primitives and spacing, typography, color, and interaction conventions.

## 6. Routing and Navigation

- Use the project's established routing system.
- Verify route names, parameters, layouts, and guards before changing navigation.
- Keep public, authenticated, role-specific, administrative, and error routes clearly separated.
- Do not rely on client-side route guards as the only authorization control.
- Preserve deep links, browser navigation, refresh behavior, and shareable URLs.
- Handle invalid or missing route parameters safely.
- Avoid redirect loops.
- Use route-aware titles and metadata through the project's centralized metadata mechanism.

## 7. State Management

Use the smallest suitable state scope:

1. local component state
2. feature or route state
3. shared context or approved global store
4. server-state or query cache through the existing project pattern

Rules:

- Do not put temporary UI state into the global store without need.
- Do not duplicate server data across unrelated stores.
- Keep derived state derived instead of synchronizing duplicate copies.
- Treat URL state as the source of truth for shareable filters, searches, pagination, or tabs when the existing product pattern supports it.
- Clear role-sensitive or user-sensitive state on logout and account switching.

## 8. Data Fetching

- Use the existing API client, query library, or service layer.
- Validate assumptions about response shapes by inspecting types, schemas, or backend contracts.
- Handle loading, empty, error, unauthorized, forbidden, and stale-data states explicitly.
- Prevent duplicate submissions and accidental repeated mutations.
- Cancel or ignore stale requests when route or input state changes.
- Avoid repeated requests caused by unstable dependencies or rerender loops.
- Use pagination, cursor loading, or bounded queries for potentially large datasets.
- Do not silently display mock, cached, or placeholder data as live production data.

## 9. Forms and Mutations

Every production form should handle, where applicable:

- required fields
- field formats
- cross-field rules
- server-side validation responses
- loading state
- disabled state during submission
- duplicate-submission prevention
- success feedback
- actionable error feedback
- focus movement to the first invalid field or error summary
- unsaved-change behavior for destructive or long forms

Additional rules:

- Client-side validation improves UX but is not a security boundary.
- Keep validation rules aligned with shared schemas or backend contracts.
- Do not expose internal validation details or stack traces.
- Confirm destructive actions clearly.
- Preserve user-entered values after recoverable failures.

## 10. Authentication and Account UX

For Google authentication, mobile OTP, sessions, API-key account features, or other identity flows:

- Use one authoritative implementation path.
- Do not add silent provider fallbacks, mock authentication, or bypass logic.
- Do not store access tokens, refresh tokens, OTP values, or secrets in unsafe browser storage unless the approved architecture explicitly requires it.
- Never log credentials, OTPs, or tokens.
- Show clear expired-session and permission-denied states.
- Prevent authenticated content from flashing before authorization state resolves.
- Ensure logout clears relevant client state.
- Do not treat hidden UI as authorization.

## 11. Role-Aware Interfaces

AgriConnect may expose different workflows for farmers, input sellers, produce sellers, buyers, transport or logistics participants, storefront operators, administrators, government-related users, and future approved roles.

- Read role definitions and permissions from approved sources.
- Do not infer permissions from labels, route names, or UI visibility.
- Avoid duplicating the same permission map in multiple components.
- A user may have more than one role only if the existing domain model supports it.
- Preserve context when users switch approved roles or organizations.
- Do not reveal restricted counts, pricing, records, actions, or metadata in disabled or hidden UI.

## 12. Marketplace and Commerce UI

For product listings, produce listings, D2C storefronts, carts, orders, pricing, logistics, fees, or payments:

- Display currency, quantity, weight, unit, tax, delivery, fee, and availability information unambiguously.
- Do not calculate authoritative totals only on the client.
- Treat backend-calculated totals and eligibility as authoritative.
- Prevent stale price or inventory assumptions from being presented as confirmed.
- Show status using centralized labels and allowed transitions.
- Do not allow unsupported status changes through UI shortcuts.
- Preserve idempotency and duplicate-submission protection for order and payment actions.
- Distinguish estimates from confirmed values.

## 13. Internationalization

- Do not hardcode user-facing strings when the project uses translation resources.
- Reuse the established translation utility and namespace organization.
- Keep translation keys stable, descriptive, and domain-based.
- Do not use English text as a translation key unless that is the established project convention.
- Support variable interpolation, pluralization, dates, numbers, currencies, units, and relative time through locale-aware utilities.
- Avoid concatenating translated fragments that may break grammar in other languages.
- Preserve layout for longer translations.
- Support right-to-left presentation only through the project's approved strategy.
- Do not silently fall back to another language unless the approved i18n configuration defines that behavior.

## 14. Accessibility

Target practical WCAG 2.2 AA behavior unless the project specifies a stricter requirement.

Ensure:

- semantic HTML
- keyboard access to all interactive controls
- visible focus states
- correct labels and accessible names
- logical heading hierarchy
- sufficient color contrast
- error identification not based on color alone
- focus management for dialogs, menus, route transitions, and validation errors
- appropriate live regions for asynchronous status updates
- alternatives for meaningful images and icons
- reduced-motion support where animation is nonessential

Use ARIA only when native HTML cannot express the required behavior.

## 15. Responsive Design

- Build mobile-first where consistent with the existing codebase.
- Test behavior conceptually across small phones, large phones, tablets, laptops, and desktop widths.
- Avoid fixed dimensions that cause clipping or horizontal scrolling.
- Keep touch targets usable.
- Preserve critical actions without relying only on hover.
- Ensure tables and dense marketplace data have an intentional small-screen pattern.
- Do not hide required information merely to fit a smaller viewport.

## 16. SEO, Metadata, and Public Pages

For public routes:

- Use unique, accurate titles and descriptions.
- Preserve canonical URL handling where implemented.
- Use semantic heading and landmark structure.
- Keep structured data centralized and valid when used.
- Avoid duplicate or conflicting metadata systems.
- Do not expose private user or marketplace data in metadata.
- Ensure social-preview metadata uses approved public assets and URLs.

## 17. PWA and Browser Storage

- Follow the existing manifest, service worker, caching, offline, and installation strategy.
- Do not add aggressive caching that can serve stale authenticated or transactional data.
- Version cache behavior through the established system.
- Store only the minimum necessary data in browser storage.
- Never store secrets or sensitive personal data in clear text.
- Handle storage unavailability and quota errors safely.
- Keep cookie consent behavior aligned with actual analytics and tracking behavior.

## 18. Performance

Optimize measured or clearly material bottlenecks, not hypothetical ones.

Use where appropriate:

- route-level code splitting
- image sizing and modern formats
- lazy loading below-the-fold content
- pagination or virtualization for large collections
- stable memoization for expensive computations
- debouncing for high-frequency search input
- request deduplication through existing tooling

Avoid:

- excessive client JavaScript
- unnecessary hydration work
- large unbounded lists
- repeated API calls
- unnecessary rerenders
- speculative caching
- premature memoization that obscures logic

## 19. Error and Empty States

- Provide a specific, actionable state for expected failures.
- Distinguish no results from request failure.
- Distinguish unauthorized from forbidden.
- Avoid generic success when only part of an operation completed.
- Never suppress runtime errors to make the page appear healthy.
- Do not expose internal stack traces, identifiers, or sensitive response bodies.
- Use the project's existing error boundary and reporting patterns.

## 20. Frontend Security

- Treat all external and user-generated content as untrusted.
- Avoid unsafe HTML injection.
- Sanitize approved rich content with the project's established sanitizer.
- Protect sensitive actions against CSRF according to the backend/session architecture.
- Do not expose secrets in source code, bundles, runtime configuration, or logs.
- Do not trust client-side role, price, quantity, eligibility, or ownership values.
- Validate file type, size, and presentation safely before upload; backend validation remains mandatory.
- Use safe URL handling and prevent open redirects.

## 21. Analytics and Consent

- Do not add tracking without explicit approval.
- Load analytics only according to the approved consent policy.
- Avoid collecting unnecessary personal or sensitive agricultural data.
- Do not place tokens, emails, phone numbers, addresses, order details, or free-form user content in analytics events.
- Use stable, documented event names through the existing analytics layer.

## 22. Focused Verification Policy

Unless explicitly authorized, do not run builds, lint, type checking, test suites, Playwright, Cypress, servers, or broad browser sweeps.

Allowed default verification:

- inspect changed code
- inspect imports, exports, route references, and types
- compare with established project patterns
- review the focused diff
- use an already-running browser session only for the exact changed feature when available

For focused browser verification:

- visit only the relevant route
- check only the changed UI and interaction
- check for new related console or request failures
- do not perform application-wide navigation
- do not switch automatically to Playwright after an in-app browser timeout
- stop after one focused retry if the same browser-evaluation timeout repeats

Report verification status honestly as one or more of:

- Implemented
- Statically reviewed
- Browser verified
- Browser verification incomplete
- User-run build or tests required

## 23. Completion Checklist

Before reporting completion, confirm through available inspection that:

- the requested behavior is implemented
- the diff is narrowly scoped
- architecture and domain boundaries are respected
- no new hardcoded visible strings violate i18n conventions
- loading, error, empty, and disabled states are considered
- accessibility is preserved
- no secrets or sensitive values were introduced
- no silent fallback logic was added
- unperformed build or test validation is clearly disclosed
