# AgriConnect Project Memory

> This file gives coding agents fast project context across new chats.
> Read this file before exploring the repository. Do not scan the entire codebase unless the task genuinely requires it.

## 1. Project Overview

**AgriConnect** is a multi-sided agriculture commerce and services platform being developed at:

* Production domain: `agriconnect.group`
* Current phase: active development
* Development model: primarily maintained by a solo developer with assistance from coding agents such as Codex, Claude Code and Cursor

The platform is intended to connect:

* Farmers and producers
* Agricultural input sellers
* Produce buyers
* Consumers
* Logistics providers
* Agriculture service providers
* Government schemes and agriculture support systems

The product vision includes:

* Agricultural input marketplace
* Produce marketplace
* Farmer and seller storefronts
* D2C agricultural commerce
* Smart logistics
* Location and map-based discovery
* Government scheme integration
* AI-assisted agricultural decision support
* Global agriculture taxonomy
* Community and profile systems
* Future agri-fintech, sustainability and data products
* Future white-label and public-private deployments

## 2. Current Development Approach

The project is being implemented through a feature roadmap divided into daily batches.

Each feature should be completed end-to-end where practical:

1. Frontend UI
2. Backend/API support
3. Database or schema support where required
4. Validation and permissions
5. Loading, error and empty states
6. Browser-based E2E verification

Do not mark a feature complete merely because UI code exists.

Use these statuses:

* **E2E Verified** — frontend, backend and user flow were successfully verified
* **Partial E2E** — implemented, but part of the flow depends on unavailable setup or was not fully verified
* **Not Verified** — implementation may exist, but the complete flow has not been confirmed
* **Broken** — a verified defect prevents the expected flow
* **Needs External Setup** — requires credentials, paid services, deployment configuration or third-party access

## 3. Current Roadmap Status

Latest known project state:

| Day    | Feature Area                                         | Latest Known Status                                      |
| ------ | ---------------------------------------------------- | -------------------------------------------------------- |
| Day 1  | Roadmap tracker and existing build inspection        | Completed                                                |
| Day 2  | Privacy, terms, refund, support and 404 pages        | E2E Verified                                             |
| Day 3  | SEO, cookie consent, manifest and PWA foundation     | Partial E2E                                              |
| Day 4  | Sidebar, navigation, icons, currency and menu polish | Partial E2E                                              |
| Day 5  | About page, story, values and credibility sections   | Not fully verified                                       |
| Day 6  | Taxonomy cleanup and hierarchy                       | Not fully verified                                       |
| Day 7  | Vegetables and fruits taxonomy expansion             | Not fully verified                                       |
| Day 8  | Buyer and seller taxonomy split                      | Implemented; verify current E2E status                   |
| Day 9  | Basic seller product listing                         | Implemented; verify current E2E status                   |
| Day 10 | Product grid, cards and image fallback               | Implemented; verify current E2E status                   |
| Day 11 | Search, farmer search and located filter             | Treat E2E status as pending unless newer evidence exists |
| Day 12 | Map discovery and marker cleanup                     | E2E Verified                                             |

Update this table whenever a roadmap batch is implemented or verified.

## 4. Day 13 Scope

Current planned Day 13 features:

* Favorite icon for products and profiles
* Dedicated favorites page
* My Profile section showing all products listed by the logged-in seller
* Seller-owned product management view
* Foundation for future product editing

Rules:

* Use the existing logged-in user context
* Prevent duplicate favorites
* Do not modify authentication internals
* Do not break the existing product grid or listing flow
* If advanced editing is risky, implement only a safe UI and data-flow foundation
* Keep the implementation compatible with future product editing

## 5. Frozen Authentication Area

Authentication is already working and must be treated as frozen unless the task explicitly targets an authentication defect.

Existing completed authentication:

* Login page UI
* Mobile number login
* OTP authentication
* Google authentication
* Existing auth routes, handlers and APIs

Do not unnecessarily modify:

* Login UI
* OTP flow
* Google sign-in flow
* Auth routes
* Auth handlers
* Auth middleware
* Working login buttons
* Existing session or logged-in user behavior

Features that require identity must consume the existing logged-in user context instead of creating a parallel authentication system.

## 6. Product and Taxonomy Rules

### Taxonomy

AgriConnect uses a broad agricultural taxonomy covering areas such as:

* Crops
* Vegetables
* Fruits
* Livestock
* Aquaculture
* Agricultural inputs
* Modern farming
* Bio-based industries
* Daily-needs and agriculture-related commerce

Important rules:

* Preserve existing IDs, slugs and routes whenever possible
* Avoid changing identifiers that may already be referenced by products or APIs
* Sellers may require access to the full taxonomy
* Buyers should primarily see categories containing purchasable or discoverable products
* Handle missing user role safely
* Keep frontend and backend taxonomy behavior aligned
* Update seed data, validation, enums and permissions when required by the scoped feature

### Product listings

A basic product listing may include:

* Product name
* Category
* Price or price note
* Quantity or availability
* Location
* Seller reference
* Optional product image

Keep product cards and grids stable while extending product functionality.

Provide a safe fallback for:

* Missing images
* Broken image URLs
* Missing seller profile data
* Missing location
* Missing coordinates
* Empty search results

Do not add cart, checkout, payment or escrow behavior unless the task explicitly includes it.

## 7. Existing PWA and Cookie Foundation

Existing assets include:

* `icon-192x192.png`
* `icon-512x512.png`
* `maskable-icon-192x192.png`
* `maskable-icon-512x512.png`
* `apple-touch-icon.png`
* `favicon-32x32.png`
* `favicon-16x16.png`

The manifest and HTML favicon references have already been configured.

Cookie consent uses the local storage key:

`agriconnect_cookie_consent`

Expected stored structure:

```json
{
  "version": "...",
  "timestamp": "...",
  "essential": true,
  "analytics": false,
  "marketing": false,
  "preferences": false
}
```

Do not replace this format without checking existing usage and migration impact.

## 8. Implementation Safety Rules

Before modifying code:

1. Read this file.
2. Read the relevant instructions in `AGENTS.md`.
3. Inspect only files related to the requested feature.
4. Trace the current frontend-to-backend flow before introducing new logic.
5. Reuse existing patterns, components, APIs and data models.
6. Avoid unrelated refactoring.

Do not:

* Scan the entire repository by default
* Rewrite stable systems without a clear need
* Create duplicate services, routes or state management
* Change unrelated roadmap features
* Modify frozen authentication code
* Rename stable IDs, slugs, routes or database fields casually
* Use placeholder success responses that make incomplete features appear functional
* Mark a feature production-ready without verification

Prefer small, isolated changes.

Separate:

* Backend inspection
* Backend changes
* Frontend inspection
* Frontend changes
* Browser verification

Avoid large combined searches or combined edits because they may trigger editor, terminal or sandbox timeouts.

## 9. Fallback Logic Rules

Use fallback logic when external or optional data may legitimately be unavailable, including:

* Missing product image
* Missing profile image
* Missing location
* Missing coordinates
* Missing optional user role
* Empty API result
* Temporary third-party service failure
* Unsupported browser capability

Do not use fallback logic to hide:

* Backend defects
* Database failures
* Invalid permissions
* Broken authentication
* Incorrect API contracts
* Required fields that were never implemented
* Failed writes that should be shown to the user

Fallbacks should preserve usability, not create false success.

## 10. Testing and Verification Rules

Primary verification should be performed route-by-route and feature-by-feature.

Do not run one large browser verification pass covering many routes. A single tool failure should not erase the entire verification result.

Recommended order:

1. Confirm frontend and backend services are reachable
2. Open one route
3. Verify one focused user flow
4. Record the result
5. Continue to the next route

Browser priority:

1. Use the requested browser tool
2. If the Codex in-app browser is blocked, errors or times out, switch to external Chrome
3. Use Playwright when repeatable automated E2E coverage is required

Known environment issue:

* The Codex in-app browser has previously returned `net::ERR_BLOCKED_BY_CLIENT`
* Chrome and PowerShell health checks have successfully reached local services
* Playwright has previously encountered CDP and selector timeouts
* Avoid repeated attempts with the same failing browser connection

Known backend health routes:

* `http://localhost:5000/api/health`
* `http://127.0.0.1:5000/api/health`

The user generally does not want build, lint, test, deployment or production build commands executed unless explicitly requested.

Do not claim that tests passed when they were not run.

## 11. Codebase Inspection Strategy

For a new task, do not re-read the full repository.

Use this sequence:

1. Identify the feature area from this memory file
2. Search for the relevant route, component, API, model or service
3. Inspect its direct imports and dependencies
4. Inspect matching backend endpoints and database models
5. Make the smallest safe change
6. Verify only the affected flow
7. Update this memory file when the project state changes

A full repository audit is appropriate only when explicitly requested for:

* Architecture review
* Security review
* Repository restructuring
* Cross-cutting refactoring
* Complete release readiness
* Large dependency migrations

## 12. Completion Requirements

At the end of a task, report:

* What was implemented
* Frontend files changed
* Backend files changed
* Database or schema changes
* What was verified
* What was not verified
* External setup still required
* Any risks or follow-up work
* Final feature status

Do not report unrelated existing issues as newly introduced defects.

## 13. Maintaining This File

Update `MEMORY.md` whenever any of these change:

* Roadmap status
* Current implementation day
* Architecture
* Authentication behavior
* Database schema
* Core routes or APIs
* Major environment constraints
* Testing strategy
* Important project rules
* Known blockers

Keep this file concise and factual.

Remove outdated information instead of continuously appending history.

The repository and current code remain the source of truth. When this file conflicts with inspected code, report the conflict and update this file after determining the correct current state.

---

**Last known focus:** Day 13 — favorites, favorites page and seller-owned profile products.

**Critical standing rule:** Preserve authentication and existing stable feature flows while creating the file , also from the features overview , create a roadmap.md file also to keep track of how many features are implemented E2E ,partial E2E and pending and all