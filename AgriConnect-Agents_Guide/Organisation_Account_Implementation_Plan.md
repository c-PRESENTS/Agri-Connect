# AgriConnect Integrated Organisation Admin Portal — Implementation-Ready Plan

## Operational Rule 1 — Investor Prototype Milestone = End of Week 5

The mandatory investor-ready prototype milestone is the **end of Week 5**. By that point, the integrated Organisation Admin Portal must demonstrate all of the following with the existing AgriConnect frontend, backend, and PostgreSQL database:

1. A protected `/admin` portal with permission-aware navigation.
2. A live Organisation Dashboard and searchable Audit Logs.
3. User Management and a working Verification Centre.
4. Product approval, rejection, suspension, restoration, Featured, and Fresh Pick controls.
5. Category Draft, edit, reorder, publish, and archive controls.
6. Verified sellers, approved products, suspended records, and published categories updating the existing public website correctly.
7. Durable audit events for every sensitive administrative action.

Weeks 6–10 extend the prototype with multi-employee access, advanced RBAC management, 2FA, Analytics, Reports, Revenue, Organisation Settings, security hardening, deployment rehearsal, and final presentation readiness. They must not delay the Week 5 functional control milestone unless a Week 1–5 security or data-integrity blocker makes the demonstration unsafe or misleading.

## Operational Rule 2 — Implement One Week at a Time

Implementation must proceed sequentially. Do not begin the next week until the current week satisfies its complete **Done / Acceptance Criteria**.

For each week:

1. Inspect the existing affected frontend, backend, shared contracts, database schema, migrations, and tests.
2. Confirm dependencies from previous weeks are present and working.
3. Implement the smallest complete vertical slices: shared contract -> database/migration -> repository/service -> API route -> frontend workflow -> focused tests.
4. Verify backend authorization, validation, audit behaviour, and existing-platform integration for every mutation.
5. Run the required type check and focused automated verification.
6. Review the focused diff and complete the mandatory implementation report below.
7. Obtain confirmation that the week is complete before starting work from the next week.

Do not partially implement multiple weeks in parallel. Do not mark a week complete because its UI exists; its database state, APIs, RBAC, workflows, integration behaviour, error handling, tests, and acceptance criteria must also pass.

## Operational Rule 3 — Protected Existing Functionality / Do Not Change

The following existing AgriConnect functionality is protected and must remain operational throughout the Organisation Admin Portal implementation:

- Existing authentication, sessions, OTP, Google authentication, and profile completion.
- Public home page, product catalogue, product detail, search, category navigation, Quick Shop, favourites, and comparison.
- Buyer, farmer, seller, logistics, student, and existing admin/operator account behaviour.
- Seller dashboard, seller listings, seller verification, Regional Marketplace, maps, and location-aware discovery.
- Cart, checkout, delivery choices, CAPTCHA/Turnstile, orders, payments, refunds, disputes, settlements, payouts, and payment-provider integrations.
- Student Help Point, Share & Care, land leasing, logistics, support, government schemes, and other existing public modules.
- Existing route paths, API response contracts, database IDs, category/product slugs, marketplace records, translations, test IDs, and environment-variable behaviour.
- Existing user data, product data, order history, payment history, uploaded assets, and audit/security records.

Do not create a separate admin website, backend, database, authentication system, payment ledger, taxonomy source, or duplicate user/product model. Do not delete or rewrite existing data to simplify the portal. Any necessary contract change must be additive or protected by a compatibility adapter and must include regression verification for every affected existing consumer.

## Operational Rule 4 — Mandatory Implementation Report Format

At the end of every implementation week, provide a report using this exact structure. A week is not ready for sign-off without this report.

```markdown
# Organisation Admin Portal — Week [N] Implementation Report

## 1. Status
- Week: [number and title]
- Result: Complete / Partially complete / Blocked
- Investor milestone impact: On track / At risk / Blocked

## 2. Implemented Scope
- Frontend pages/components:
- Backend APIs/services:
- Shared contracts/validation:
- Database migrations/schema:
- RBAC permissions and guards:
- Audit events:
- Existing AgriConnect integrations:

## 3. Functional Workflows Verified
1. [workflow and observed result]
2. [workflow and observed result]

## 4. Protected Existing Functionality Regression Results
- Authentication:
- Public catalogue/search/product detail:
- Seller/farmer workflows:
- Cart/checkout/orders/payments:
- Regional Marketplace/verification:
- Other affected routes:

## 5. Validation and Security Results
- Input validation:
- Permission-denial tests:
- Sensitive-data handling:
- Transaction/concurrency handling:
- Audit completeness:

## 6. Commands and Tests Run
- `npm run check`: Passed / Failed / Not run with reason
- Focused automated tests:
- Database verification:
- Browser/E2E verification:

## 7. Files and Migrations Changed
- [path]: [reason]
- Migration applied: Yes / No / Not required

## 8. Known Limitations, Demo Data, and Deferred Work
- Functional limitations:
- Seeded/demo behaviour and visible labels:
- Prototype/UI-only behaviour:
- Deferred production work:

## 9. Acceptance Criteria
- [criterion]: Passed / Failed
- Overall Week [N] acceptance: Passed / Failed

## 10. Next Authorised Step
- Next week/phase:
- Dependencies or decisions required before starting:
```

Reports must distinguish facts from assumptions and must never claim that a test, migration, deployment, browser workflow, external service, or production integration passed unless it was actually executed and verified. Do not include secrets, private database URLs, tokens, personal documents, or sensitive values in the report.

## 1. Purpose, outcome, and timeline

This document is the sequential implementation plan for adding the **Organisation Admin Portal to the existing AgriConnect platform**. It must not be built as a separate website, backend, repository, authentication system, or database.

The portal extends the current system:

```text
Existing React/Vite frontend
  + protected /admin routes and components
Existing Express/TypeScript backend
  + permission-controlled /api/admin/* endpoints
Existing PostgreSQL database and Drizzle models
  + forward-only admin/governance migrations
```

The first priority is a functional investor-ready prototype proving that an authorised AgriConnect administrator can control what appears on the public website. The architecture must remain suitable for multiple employees and production hardening later.

The investor demonstration must prove these end-to-end flows:

1. A seller submits verification, an admin approves it, and the verified state appears on the existing public profile and Regional Marketplace.
2. A seller submits a product, an admin approves it, and the product appears in existing search, categories, product detail, and marketplace surfaces.
3. An admin suspends a product or account, and it disappears from every applicable public endpoint without destructive deletion.
4. An admin creates a Draft category, publishes it, and it appears in existing public navigation and seller listing forms.
5. Every sensitive action records actor, permission, target, reason, outcome, and a safe change summary.

For one engineer, the realistic target is **ten weeks**, including testing, deployment rehearsal, and investor-demo preparation. A functional control MVP should be demonstrable by the end of Week 5.

---

## 2. Non-negotiable architecture

### 2.1 One integrated application

- Preserve the current `frontend/`, `backend/`, `shared/`, `database/`, and `tests/` structure.
- Add `/admin/*` to `frontend/src/app/routes.tsx` and the existing application shell.
- Register admin routes through `backend/modules/register.ts`.
- Put shared contracts, enums, and validation schemas in `shared/models/` and export them through `shared/schema.ts`.
- Add forward-only migrations under `database/migrations/`; never rewrite an already-applied production migration.
- Preserve existing public `/api/*` contracts unless an additive change is required.
- Reuse the existing `/operator` dashboard, seller verification, regional operations, and payment components/services. Do not duplicate their data sources.
- Keep `/operator` compatible until all consumers are moved; it may later redirect to the matching `/admin` section.
- Preserve existing user authentication, buyer/farmer/logistics roles, marketplace, search, cart, checkout, orders, payments, Student Help Point, and seller workflows.

### 2.2 Surfaces and authority boundaries

| Surface | Route | User | Authority source |
|---|---|---|---|
| Public AgriConnect | Existing routes | Visitors and registered users | Existing public/authenticated rules |
| Central Organisation Admin Portal | `/admin/*` | AgriConnect employees | Active platform organisation membership plus RBAC |
| Seller/Farmer workspace | Existing seller routes | Sellers/farmers | Existing ownership rules |
| External organisation workspace | `/organisation/*` | Approved external organisations | Organisation-scoped membership; post-MVP unless reprioritised |

The legacy `users.role = 'admin'` value is not the final admin decision. Authoritative access requires an active `organisation_memberships` record, approved platform organisation, assigned `admin_roles` record, role permissions, and member overrides.

### 2.3 Backend authorization sequence

Every admin endpoint must follow:

```text
valid session
  -> active platform membership
  -> approved platform organisation
  -> exact permission
  -> validated target and transition
  -> transaction
  -> target history plus durable audit event
  -> safe response
```

Frontend permission checks control visibility only. Every hidden or disabled action must still have a backend permission check.

### 2.4 Data rules

- Suspend/archive users, employees, products, categories, and organisations instead of deleting business history.
- Preserve IDs, slugs, URLs, product relationships, and existing marketplace data.
- Use server-side pagination, filtering, allowlisted sorting, and parameterised SQL for admin lists.
- Store new monetary values in integer minor units and retain currency codes.
- Never expose passwords, tokens, MFA secrets, recovery codes, provider secrets, full tax IDs, private storage keys, or raw database errors.
- Use one authoritative public-visibility predicate for product list, search, detail, recommendations, seller profiles, and Regional Marketplace.

---

## 3. Existing implementation to reuse

| Area | Existing code |
|---|---|
| Organisation/RBAC | `shared/models/organisations.ts`, migration `0019_organisation_rbac_foundation.sql` |
| Permission middleware | `backend/organisations/access.ts` |
| Admin repository/bootstrap/audit | `backend/organisations/repository.ts` |
| Foundation endpoints | `backend/modules/admin/routes.ts` |
| Frontend access boundary | `frontend/src/components/admin-access-route.tsx`, `frontend/src/hooks/use-admin-access.ts` |
| Operator dashboard | `frontend/src/pages/operator-dashboard.tsx`, `backend/modules/dashboard/routes.ts` |
| Seller verification | `shared/models/seller-verification.ts`, seller verification routes/repository/components |
| Regional operations | Regional marketplace module, repository, and operator components |
| Payment operations | `backend/modules/payments/*`, `backend/payments/*`, operator payment components |
| Catalogue/search | Catalog/search routes, existing storage/repositories, product pages/components |
| Taxonomy | Existing category utilities and `shared/sub-subcategories.ts` |
| Tests | Existing `tests/e2e/*` suites |

Before each phase, trace the existing frontend query through backend route, service/repository/storage, shared contract, and database table. Extend it instead of creating a second source of truth.

Week 1 is complete in an environment only when:

- Organisation/RBAC tables exist.
- `agriconnect-platform` exists with approved platform status.
- Ten default platform roles and the complete permission catalogue are seeded.
- Role-permission mappings and five migration `0019` safety triggers exist.
- A registered user is an active Super Admin via `ORG_ADMIN_BOOTSTRAP_EMAILS`.
- `/api/admin/access` returns expected access for that user.
- An ordinary user receives `403` from a protected admin endpoint.

---

## 4. Investor-release scope classification

| Level | Required behaviour |
|---|---|
| **Functional MVP** | Real database state, API, backend permission, audit, UI workflow, and existing-platform integration |
| **Seeded/Demo** | Working UI/API contract using clearly labelled predictable demo history until real volume exists |
| **Prototype/UI-level** | Explanatory UI only; actions disabled and visibly marked `Coming soon` |

| Module | Investor-release level | Minimum result |
|---|---|---|
| Organisation Dashboard | Functional MVP | Live core totals, pending work, recent audit activity |
| User Management | Functional MVP | Search, detail, verify, suspend, reactivate, notes |
| Verification Centre | Functional MVP | Manual review with public verified-state integration |
| Product Management | Functional MVP | Approve, reject, suspend, restore, feature, Fresh Pick |
| Category Management | Functional MVP | Draft, edit, reorder, publish, archive, public integration |
| Employee Management | Functional MVP list/role/status; invite email may be Demo initially | Controlled staff access without DB editing |
| Roles & Permissions | Functional MVP | Built-in role matrix and member overrides |
| Analytics | Live core metrics plus Seeded/Demo advanced history | Definitions and demo labels are explicit |
| Revenue Dashboard | Live recorded totals plus Seeded/Demo future sources | Recorded, estimated, and projected values separated |
| Reports | Functional CSV; scheduled XLSX/PDF may be Prototype | Permission-controlled filtered export |
| Audit Logs | Functional MVP | Durable searchable sensitive-action history |
| Security | Functional baseline; advanced device intelligence may be Prototype | RBAC, secure session, audit, rate limits, protected secrets |
| Organisation Settings | Functional safe settings | No secret/environment-variable editor |

---

## 5. Portal routes and module ownership

```text
/admin
├── /admin/overview
├── /admin/users
│   └── /admin/users/:userId
├── /admin/verifications
│   └── /admin/verifications/:caseId
├── /admin/products
│   └── /admin/products/:productId
├── /admin/categories
├── /admin/employees
│   └── /admin/employees/:membershipId
├── /admin/roles
├── /admin/analytics
├── /admin/revenue
├── /admin/reports
├── /admin/audit
├── /admin/security
└── /admin/settings
```

Recommended frontend grouping is `frontend/src/admin/{components,hooks,layouts,pages,lib}` inside the same application. Recommended backend grouping is focused route files under `backend/modules/admin/`, services under `backend/admin/`, and repositories under the existing repository pattern. Route files validate HTTP input; services enforce business rules; repositories/storage perform data access.

### Core permission map

| Module | Read | Mutation |
|---|---|---|
| Dashboard | `dashboard.view` | None |
| Users | `users.view` | `users.edit`, `users.approve`, `users.suspend`, `users.export` |
| Verification | `verification.view` | `verification.review`, `verification.approve`, `verification.reject` |
| Products | `products.view` | `products.edit`, `products.approve`, `products.reject`, `products.suspend`, `products.feature`, `products.remove` |
| Categories | `categories.view` | `categories.create`, `categories.edit`, `categories.reorder`, `categories.publish`, `categories.archive` |
| Employees | `employees.view` | `employees.invite`, `employees.edit`, `employees.deactivate`, `employees.manage_permissions` |
| Organisations/settings | `organisations.view` | `organisations.review`, `organisations.approve`, `organisations.suspend`, `organisations.manage` |
| Analytics | `analytics.view` | `analytics.export` |
| Revenue | `revenue.view` | `revenue.export`, `revenue.manage_payouts` |
| Reports/data | Relevant read permission | `data.export`, `data.import`, `data.request_backup` |
| Audit | `audit.view` | `audit.export` |
| Security | `security.manage` | `security.manage` |

Every protected endpoint requires tests for no session (`401`), no membership (`403`), insufficient permission (`403` plus denied audit event), correct permission (success), inactive membership (`403`), and invalid input (`400/422` without mutation).

---

## 6. Detailed week-by-week roadmap

## Week 1 — Database and RBAC foundation

**Delivery:** Functional foundation. **Status:** Implemented; verify per environment.

### Objective and outcome

Establish organisations, memberships, roles, permissions, overrides, invitations, tokens, MFA records, login events, and durable audit records while preserving public identities and features.

### Frontend

- Retain `AdminAccessRoute` and `useAdminAccess` as common access boundaries.
- Verify loading, unauthenticated, forbidden, and authorised states.

### Backend/API

- Preserve `/api/admin/access`, `/api/admin/organisations/current`, `/api/admin/roles`, and `/api/admin/permissions`.
- Preserve `requireAdminPermission()` and environment-only Super Admin bootstrap.
- Never add public “register as admin”.

### Database

- Apply/verify migration `0019` tables, seeds, mappings, indexes, and triggers.
- Verify at least one active platform Super Admin membership.

### RBAC and integration

- Keep buyer/farmer/logistics roles intact.
- Store central authority in organisation membership.
- Prevent last-Super-Admin removal and cross-organisation role assignment.

### Validation/security/tests

- Test middleware allow/deny/unauthenticated paths and database guards.
- Verify seeded counts and bootstrap behaviour.
- Run `npm run check`.

### Dependencies

Existing authentication and PostgreSQL.

### Done

All Week 1 checks in Section 3 pass; one Super Admin succeeds, an ordinary user is denied, and public functionality is unchanged.

---

## Week 2 — Admin shell, Organisation Dashboard, and Audit Logs

**Delivery:** Functional MVP. **Expected outcome:** A credible protected control panel using live platform data.

### Frontend

- Add lazy `/admin/*` routes to existing routes.
- Build `AdminLayout`: sidebar, tablet drawer, header, employee identity, role badge, breadcrumbs, sign-out, forbidden page, and session-expired state.
- Build permission-aware navigation from one route-to-permission map.
- Build `/admin/overview` with live KPI cards, pending-work links, recent activity, provider/system status, refresh, last-updated time, skeletons, empty states, and local retry states.
- Build `/admin/audit` with actor, action, outcome, target, organisation, and date filters plus paginated detail.
- Reuse existing operator verification, regional, and payment widgets in appropriate admin sections; do not copy query logic.
- Redirect `/operator` to `/admin/overview` only after equivalent functionality exists.

### Backend APIs/services

- `GET /api/admin/dashboard/summary` — `dashboard.view`.
- `GET /api/admin/dashboard/pending-work` — `dashboard.view`.
- `GET /api/admin/audit-events` and `/:id` — `audit.view`.
- Aggregate from authoritative user, product, order, verification, payment, and audit repositories.
- Return `generatedAt`, filter metadata, stable types, and partial widget errors where appropriate.

### Database

- Prefer no new table.
- Add indexes only when query plans demonstrate a need; use a forward migration.

### RBAC/integration/business rules

- A dashboard permission cannot grant access to embedded finance/verification actions.
- Pending-work counts link to matching filtered pages.
- One optional widget failure must not crash the shell.
- Public navigation must not reveal admin links to unauthorised users.

### Validation/error/security

- Allowlist filters/sorts, cap page size/date range, and exclude documents, secrets, raw IPs, and sensitive audit payloads.
- Use a real forbidden page instead of an endless spinner.

### Tests/E2E

- Guard and permission tests; dashboard fixture reconciliation; audit pagination/filter tests; optional-widget failure test; `/operator` compatibility test.
- Run `npm run check`.

### Dependencies

Week 1, existing repositories, current operator dashboard.

### Done

Super Admin opens `/admin/overview`, sees real totals and audit activity; navigation follows permissions; unauthorised API/UI access is denied; desktop/tablet layouts work; operator users are not stranded.

---

## Week 3 — User Management and Verification Centre

**Delivery:** Functional MVP. **Expected outcome:** Admin decisions change real public verification and account eligibility.

### Frontend

- `/admin/users`: backend search, pagination, stable sort, URL-backed filters for account type, verification, status, country/region, registration, and last login.
- `/admin/users/:userId`: overview, public preview, seller data, product/order summary, login history, admin notes, and audit timeline.
- Confirmation dialogs with required reasons for verify, reject, suspend, and reactivate.
- `/admin/verifications`: reuse existing seller verification queue.
- `/admin/verifications/:caseId`: business data, masked GSTIN/tax data, document metadata/view, event history, review form, and public preview.

### Backend APIs/services

- `GET /api/admin/users`, `GET /api/admin/users/:userId` — `users.view`.
- `POST /api/admin/users/:id/verify` — `users.approve`.
- `POST /api/admin/users/:id/suspend|reactivate` — `users.suspend`.
- `POST /api/admin/users/:id/notes` — `users.edit`.
- Adapt existing verification endpoints to `GET /api/admin/verifications`, `GET /:caseId`, and `POST /:caseId/review` while keeping operator compatibility wrappers.
- Use transactions for decision, document states, capability change, target event, and audit event.

### Database

- Reuse seller business profiles, verification cases/documents/events, and encrypted tax identifiers.
- Add recoverable account status only if current users cannot represent it safely.
- Add `admin_user_notes` with author, subject, classification, text, timestamps.
- Add only required search/queue indexes.

### RBAC/integration/business rules

- Map user and verification actions to the permissions in Section 5.
- Derive public verification from one authoritative status; do not add a competing boolean.
- Approval drives public badges and Regional Marketplace eligibility.
- Suspension blocks protected seller actions and public seller discovery but preserves records.
- State machine: `not_started -> in_progress -> pending_review -> verified|needs_information|rejected`; verified may become expired/suspended; needs-information may resubmit.
- Approval requires all mandatory documents; every decision requires a reason.

### Validation/error/security

- Mask GSTIN/tax IDs; never return private storage keys.
- Use signed URLs or authenticated streaming for documents.
- Validate MIME type, size, filename, ownership, input lengths, and state transitions.
- Return `409` for stale review and `422` for business-rule failure.

### Tests/E2E

- Search/filter/sort/page tests; valid/invalid transition tests; permission tests by role; sensitive-field tests.
- E2E: submit verification -> admin approves -> public badge appears -> Regional Marketplace eligibility changes.
- Verify denied/successful audit events; run `npm run check`.

### Dependencies

Weeks 1–2 and existing seller verification.

### Done

Admin can manage supported user types; verification/suspension is consistent and recoverable; public surfaces update from the same status; sensitive data is protected; mutations are audited.

---

## Week 4 — Product Management and public marketplace moderation

**Delivery:** Functional MVP. **Expected outcome:** Admin approval publishes a seller product everywhere it should be public.

### Frontend

- `/admin/products`: product image/name, seller/verification, category, price, stock, moderation status, featured/Fresh Pick flags, region, dates, filters, pagination.
- `/admin/products/:id`: listing preview, seller context, gallery, category, moderation history, and explicit actions.
- Require reasons for reject, changes requested, suspend, restore, and removal.
- Permit only bounded safe bulk actions in MVP.

### Backend APIs/services

- `GET /api/admin/products`, `GET /api/admin/products/:id` — `products.view`.
- Explicit `/approve`, `/reject`, `/request-changes`, `/suspend`, `/restore`, `/feature`, `/fresh-pick` endpoints with matching permissions.
- Centralise the public visibility predicate and reuse it in list, detail, search, recommendations, seller profiles, Regional Marketplace, cart, and checkout validation.
- Preserve seller ownership/listing endpoints.

### Database

- Add moderation status, submitted/reviewed data, reviewer/reason, and history if not already represented.
- Migrate legitimate existing products to approved to preserve catalogue population.
- Add queue/search indexes for status/category/seller/region/featured/updated date.

### RBAC/integration/business rules

- Workflow: `draft -> pending_review -> approved|rejected|changes_requested`; changes requested may resubmit; approved may suspend/restore.
- Approval requires eligible seller, valid published category, valid price/stock/unit/image.
- Feature/Fresh Pick never overrides non-approved visibility.
- Sellers see their own non-public listings and reasons; public users do not.
- A product suspended after cart addition must fail revalidation before order creation.

### Validation/error/security

- Validate ID, transition, text, numeric limits, category, image reference, and authoritative seller/status.
- Use `updatedAt`/version conflict detection for simultaneous reviewers.
- Mutate state, moderation history, and audit event transactionally.

### Tests/E2E

- Every transition and invalid transition; moderator/operations/marketing/viewer/seller permission matrix.
- E2E: seller submits -> not public -> approve -> visible in search/detail -> suspend -> absent everywhere -> restore.
- Cart/checkout suspended-product test; Featured/Fresh Pick placement tests; `npm run check`.

### Dependencies

Weeks 1–3 and existing catalogue/search/cart/checkout.

### Done

Admin moderates without DB access; every public product route uses the canonical rule; seller views remain functional; suspension is immediate, recoverable, and audited.

---

## Week 5 — Category Management and publish workflow

**Delivery:** Functional MVP. **Expected outcome:** Published database taxonomy controls existing public navigation.

### Frontend

- `/admin/categories`: hierarchical category/subcategory manager with create, edit, image, order, Draft preview, publish, archive, reference counts.
- Prevent destructive deletion of referenced categories.
- Update sidebar, carousel, Quick Shop, category pages, filters, search suggestions, and seller listing forms to consume the published taxonomy API.

### Backend APIs/services

- `GET /api/admin/categories?includeDrafts=true` — `categories.view`.
- `POST /api/admin/categories` — `categories.create`.
- `PATCH /api/admin/categories/:id` — `categories.edit`.
- Explicit `/submit`, `/publish`, `/archive` transition endpoints.
- `POST /api/admin/categories/reorder` — `categories.reorder`, accepting a complete validated sibling order.
- Public `GET /api/catalog/categories` returns published taxonomy.
- Keep a temporary static fallback only during controlled migration, then remove it after parity.

### Database

- Add category hierarchy, lifecycle, display order, slug, image, translation/content, version, creator/reviewer/publisher timestamps.
- Import current canonical IDs/slugs from existing taxonomy sources.
- Add parent/order/status indexes and required uniqueness constraints.
- Record category versions/events.

### RBAC/integration/business rules

- Workflow: `draft -> pending_review -> published -> archived`; changes requested returns to Draft.
- Same Super Admin may submit and publish for MVP, but both events are audited.
- Only published categories are public; archived categories remain resolvable historically but cannot receive new listings.
- Reordering is transactional and deterministic; reject hierarchy cycles and duplicate slugs.

### Validation/error/security

- Validate hierarchy, slug/name/image, reference impact, upload type/size, optimistic version, and conflict details.
- Never orphan product navigation without an explicit reassignment plan.

### Tests/E2E

- Taxonomy import parity; Draft/private, publish/public, archive/no-new-listings; cycle/slug/reorder/reference tests.
- E2E: create Draft -> absent publicly -> publish -> appears in sidebar, filters, category page, suggestions, and seller form.
- Regression existing URLs/product assignments; `npm run check`.

### Dependencies

Weeks 1–4 and a complete inventory of taxonomy consumers.

### Done

PostgreSQL is canonical; all public/seller consumers use published taxonomy; existing links still work; category changes are audited. The investor control MVP is now demonstrable.

---

## Week 6 — Employee Management, Roles & Permissions, and admin authentication

**Delivery:** Functional staff access; real email requires provider configuration.

### Frontend

- `/admin/employees`: search/list status, role, 2FA, invite/accept dates, last login.
- Employee detail: assign role, allow/deny override, deactivate/reactivate, revoke sessions, activity.
- Invite/resend/revoke UI.
- `/admin/roles`: role-permission matrix using existing catalogue.
- `/admin/security`: TOTP setup, recovery codes, active sessions, security events.

### Backend APIs/services

- Employee list/detail/invite/resend/revoke; role/override; deactivate/reactivate; session-revoke endpoints.
- Invitation acceptance, email verification, password reset, TOTP enroll/confirm/disable, recovery-code regeneration, session list, remote sign-out.
- Revoke sessions after role, override, password, MFA, or membership changes.

### Database

- Reuse Week 1 invitation, token, MFA, recovery, login, role, permission, membership, and override tables.
- Extend session/device storage only if safe active-session listing is unavailable.
- Add required expiry/used/attempt indexes through a forward migration.

### RBAC/integration/business rules

- Apply employee permissions from Section 5.
- Only Super Admin may grant Super Admin or `security.manage`.
- No self-approval of privilege escalation; never remove the last Super Admin.
- Flow: `invite -> verify -> accept -> active`; deactivate revokes sessions.
- Tokens are hashed, single-use, expiring, and organisation-bound. TOTP secrets are encrypted; recovery codes hashed and shown once.

### Validation/error/security

- Normalise emails; prevent duplicate active invites; rate-limit login/invite/reset/MFA.
- Require recent authentication for high-risk changes.
- Never log or return raw tokens/secrets.

### Tests/E2E

- Invite success/duplicate/revoked/expired/replay; role/override allow-deny; self-escalation and last-admin guards; session revocation; TOTP/recovery one-time use.
- Run `npm run check`.

### Dependencies

Weeks 1–5; email provider for real invitations; `APP_ENCRYPTION_KEY` for MFA.

### Done

Super Admin manages staff without DB access; permission changes take effect immediately; deactivation revokes sessions; secrets remain protected.

---

## Week 7 — Analytics and Reports

**Delivery:** Live core metrics, labelled Seeded/Demo advanced history, functional CSV.

### Frontend

- `/admin/analytics`: filters for date, country/region, user type, category, organisation, order status, currency, provider; KPI cards and charts for growth, users, products, orders, GMV, regional/category performance, verification and moderation.
- Badge every seeded/demo series.
- `/admin/reports`: report type, filters, preview count, export request, job status, expiry, download history.

### Backend APIs/services

- Analytics summary/time-series endpoints — `analytics.view`.
- Report preview/generation/download — relevant read permission plus `data.export`, `analytics.export`, `users.export`, `revenue.export`, or `audit.export`.
- Use PostgreSQL aggregation first; add summary tables only for measured slow queries.

### Database

- Optional daily summaries and refresh bookkeeping.
- `report_jobs`: requester, type, validated filters, status, expiry, storage reference, safe error code, timestamps.
- Never store raw SQL in report filters.

### RBAC/integration/business rules

- Document definitions for active user, GMV, net revenue, completed order, approved seller.
- Reconcile metrics to authoritative operational tables.
- Escape CSV cells beginning with `=`, `+`, `-`, or `@`.

### Validation/error/security

- Cap date range, row count, page size, and concurrent jobs.
- Downloads expire and are owner/permission checked.
- Exclude secrets, tax IDs, tokens, document keys, and unnecessary personal data.

### Tests/E2E

- KPI reconciliation, filter/timezone boundaries, permission/ownership, CSV injection, sensitive exclusion, visible demo labels.
- Run `npm run check`.

### Dependencies

Weeks 1–6 and stable status definitions.

### Done

Core metrics reproduce from PostgreSQL; demo data is explicit; authorised users generate safe CSV; no cross-user report access.

---

## Week 8 — Revenue Dashboard and Organisation Settings

**Delivery:** Live recorded totals plus labelled Demo projections; functional safe settings.

### Frontend

- `/admin/revenue`: gross sales, refunds, fees, liabilities, payouts, net recorded revenue, provider status, history and filters.
- Separate `Recorded`, `Calculated estimate`, and `Demo projection` visually.
- Reuse payment operations/disputes/payout recovery/provider components with their existing permissions.
- `/admin/settings`: organisation identity/contact, regional defaults, support details, moderation defaults, safe feature flags.
- Show secrets only as configured/not configured.

### Backend APIs/services

- Revenue summary/breakdown/transactions/payouts/refunds/provider health — `revenue.view`; export — `revenue.export`.
- Reuse payment ledgers/repositories and reconciliation; do not create a second ledger.
- Settings read/update with explicit editable-key allowlist and `organisations.manage` or `security.manage`.

### Database

- Typed/versioned platform settings with sensitivity classification, updater, timestamp; secrets remain in environment/secret manager.
- Add only implemented revenue-source configuration.
- Manual financial adjustments, if required, are immutable reasoned entries with reversal, never destructive edits.

### RBAC/integration/business rules

- Separate revenue view/export/payout authority.
- Reconcile Stripe, PayPal, Razorpay, cash, refund, dispute, payout, and order records.
- Do not count authorised-but-not-captured payments as settled.
- Never aggregate different currencies without explicit rate/source/timestamp.
- Settings changes invalidate relevant caches and update existing consumers.

### Validation/error/security

- Integer minor units; typed settings; URL/country/currency validation; redacted provider errors; idempotent financial mutations; recent auth for high-risk actions.

### Tests/E2E

- Paid/refunded/failed/disputed/cash/fee/payout fixtures; multi-currency tests; settings allowlist/type/audit/cache tests; demo values never reported as recorded.
- Run `npm run check`.

### Dependencies

Weeks 1–7 and existing payments.

### Done

Recorded totals reconcile; projections are unmistakable; safe settings affect intended existing functionality; no credential exposure.

---

## Week 9 — Security hardening, integration regression, and recovery

**Delivery:** Functional release security baseline.

### Objective/outcome

Close authorization/data-leakage gaps, validate recoverability, and prove admin integration did not break the public platform.

### Frontend

- Standardise forbidden, expired session, validation, conflict, partial-failure, retry, and recent-auth states.
- Verify keyboard access, focus, labels, contrast, responsive tables/dialogs.
- Disable unfinished actions; no demo button may fail silently.

### Backend/security

- Audit every `/api/admin/*` route for session, exact permission, scope, validation, transaction, audit, safe error.
- Add CSRF protection compatible with current sessions; secure cookies, trusted origins, session rotation, idle/max limits, login rate limiting.
- Validate uploads by content/size and add malware scanning before uncontrolled production documents.
- Add request IDs and safe structured logs.

### Database/recovery

- Verify forward migration order, constraints, indexes, audit append-only behaviour.
- Enable managed backups; restore one into an isolated database and run integrity checks.

### RBAC/integration

- Test all ten roles and organisation isolation.
- Regression test public authentication, search, catalogue, detail, cart, checkout, orders, seller dashboard, verification, payments, Regional Marketplace, Student Help Point, and support.

### Tests/E2E

- Permission escalation, IDOR, mass assignment, CSRF, session fixation, export leakage, upload, brute force, reviewer concurrency, database trigger tests.
- Execute investor control flows on clean fixtures.
- Run `npm run check` and authorised focused suites/browser checks.

### Dependencies

Weeks 1–8.

### Done

No known high-severity auth/data issue; role matrix passes; backup restore succeeds; public regressions pass; failed/denied actions are safely handled and audited.

---

## Week 10 — Final integration, deployment rehearsal, and investor demo

**Delivery:** Release candidate.

### Frontend/demo

- Create deterministic, clearly identified demo accounts/data only where classification permits.
- Polish empty/loading/error/confirmation states and presentation resolutions.
- Prepare direct module links and an external-provider failure fallback.

### Backend/database/deployment

- Provide an idempotent demo seed mechanism gated so it cannot accidentally run in production.
- Rehearse migrations against a production-like backup.
- Confirm required environment-variable presence without printing values.
- Deploy the same integrated service, not a separate admin backend.
- Smoke-test health, login, admin access, dashboard, users, verification, products, categories, audit, analytics, revenue, settings, and public visibility.

### RBAC/security

- Use Super Admin plus optional Viewer/Moderator demo accounts to show permission differences.
- Disable public admin self-registration.
- Demo accounts must not expose production-sensitive data.

### Investor demonstration

1. Show live overview and pending work.
2. Approve a seller; show public badge and Regional Marketplace eligibility.
3. Approve a product; find it through public search/detail.
4. Suspend and restore the product.
5. Create a Draft category, prove it is private, publish it, and show navigation update.
6. Show preceding actions in Audit Logs.
7. Show Super Admin versus Viewer/Moderator access.
8. Show Analytics/Revenue with live, estimate, and demo labels.

### Tests/E2E

- Run the demo twice from clean state without DB editing.
- Record expected UI/API result per step.
- Rehearse deployment rollback/recovery.
- Run final `npm run check` and approved focused tests.

### Dependencies

Weeks 1–9 in a production-like environment.

### Done

The demonstration is repeatable; every public change comes from protected audited admin action; demo values are labelled; one frontend/backend/database serves public and admin experiences; deployment and rollback are known.

---

## 7. Cross-module implementation contracts

### 7.1 Sensitive mutation pattern

1. Validate with a shared schema.
2. Load authoritative actor and target.
3. Enforce exact permission and resource scope.
4. Validate current state and transition.
5. Start transaction and version-check/lock when concurrent review is possible.
6. Apply mutation.
7. Add target-specific history.
8. Add durable admin audit event with minimised changes.
9. Commit and return safe updated representation.
10. Roll back and return stable error code on failure.

Recommended error shape:

```json
{
  "error": "Human-readable message",
  "code": "STABLE_MACHINE_CODE",
  "fieldErrors": {},
  "requestId": "optional-request-id"
}
```

### 7.2 Admin list contract

All large lists accept bounded pagination, normalised search, allowlisted sort/direction, and module filters. Responses include rows, pagination metadata, active filters, and `generatedAt`. Never concatenate input into SQL.

### 7.3 Audit minimum

Audit employee invitation/role/override/deactivation/session revocation; user verification/suspension; document review; product moderation/feature; category create/edit/reorder/publish/archive; exports; settings; financial actions; denied sensitive access. Audit identifiers and safe summaries, never secrets or copied documents.

### 7.4 Public consistency

After public visibility mutation: commit DB first, invalidate relevant caches, ensure list/detail use identical rules, return authoritative status, and never rely on frontend refresh for enforcement.

---

## 8. Environment variables and external services

| Capability | Required configuration |
|---|---|
| PostgreSQL | `DATABASE_URL` |
| Sessions | `SESSION_SECRET` |
| First Super Admin | `ORG_ADMIN_BOOTSTRAP_EMAILS` |
| Sensitive/MFA encryption | `APP_ENCRYPTION_KEY` |
| Canonical links/origin checks | `PUBLIC_APP_URL` and approved origins |
| Real invitation email | Provider key and verified sender |
| Private documents/reports | Private object storage credentials |

Recommended operational settings:

```env
ADMIN_SESSION_IDLE_MINUTES=30
ADMIN_SESSION_MAX_HOURS=8
ADMIN_REQUIRE_2FA=true
```

No external API is required for RBAC, dashboard DB totals, user/product/category management, audit, PostgreSQL analytics, revenue calculation from existing records, CSV, or authenticator-app TOTP.

For MVP, manual verification is acceptable. Production document storage should use private R2/S3 with signed URLs; malware scanning and automated KYC can follow. Never put real secret values in this document, source control, logs, screenshots, or responses.

---

## 9. Post-MVP/deferred scope

- Automated KYC/fraud scoring
- Enterprise SSO/SAML
- Custom report designer and data warehouse
- Real-time streaming analytics
- Automated accounting/tax filing
- AI forecasts presented as operational truth
- Unrestricted database import/export
- Multi-region disaster-recovery automation
- Full external organisation self-service workspace unless separately prioritised
- Advanced dual-control finance approvals

Deferred pages may appear only as labelled prototypes with disabled actions.

---

## 10. Instructions for an implementing developer or LLM

For each week:

1. Read `AgriConnect-Agents_Guide/AGENTS.md` completely.
2. Inspect relevant frontend, backend, shared model, database, and tests before editing.
3. Check `git status`; preserve unrelated changes.
4. Implement vertical slices: shared contract -> migration/model -> repository/service -> route -> frontend query/page -> focused tests.
5. Do not invent a separate server, database, authentication system, repository, or duplicate public model.
6. Preserve existing endpoints during migration; use compatibility adapters when needed.
7. Use forward migrations and a backed-up/disposable database for verification.
8. Enforce backend permissions and mirror them in frontend navigation/actions.
9. Audit sensitive mutations in the same transaction where practical.
10. Run `npm run check` after implementation plus only authorised focused tests/browser checks.
11. Review the focused diff and report unverified production dependencies honestly.
12. Do not commit, push, deploy, or open a PR unless explicitly requested.

Do not advance because the UI exists. Advance only when the API, database state, permission checks, existing-platform integration, error handling, tests, and acceptance criteria pass.

---

## 11. Final definition of done

- `/admin` belongs to the existing AgriConnect frontend and uses the existing Express backend/PostgreSQL database.
- Only active authorised platform employees access each module.
- Verification updates existing public verified state.
- Product moderation controls all public discovery/detail routes.
- Published database categories drive existing public navigation and seller forms.
- Employee roles/overrides are enforced by backend APIs.
- Dashboard, Analytics, and Revenue distinguish live, estimated, and demo data.
- Reports are permission-controlled and minimise personal data.
- Every sensitive mutation creates a durable audit event.
- Existing public authentication, marketplace, seller, student, order, checkout, payment, regional, and support workflows still work.
- The investor demo runs without manual database changes.
- Production-only integrations and deferred features are explicitly identified, not simulated as live.
