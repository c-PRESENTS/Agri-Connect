# Backend Engineering Guide

**Scope:** AgriConnect APIs, services, persistence, integrations, jobs, and server-side logic  
**Applies with:** `docs/AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DOMAIN_RULES.md`, `docs/SECURITY.md`, and `docs/TESTING.md`

## 1. Purpose

This document defines backend-specific rules for implementing and fixing AgriConnect server behavior.

The backend must protect:

- identity and authorization
- business invariants
- marketplace and order integrity
- financial correctness
- data privacy
- auditability
- reliability under concurrent traffic

Repository code, approved schemas, and accepted product specifications are authoritative. Do not invent endpoints, tables, columns, roles, events, environment variables, providers, queues, or infrastructure.

## 2. Instruction Priority

For backend tasks, follow this order:

1. The user's current request.
2. The active root `AGENTS.md` instructions.
3. This backend guide.
4. The architecture, domain, security, and testing documents.
5. Existing repository conventions.

## 3. Scope and Change Control

- Change only the service, handler, controller, repository, schema, configuration, or job required by the request.
- Read the complete request flow before editing a single layer.
- Reuse existing validators, errors, repositories, transactions, authorization helpers, and integration clients.
- Do not perform broad service rewrites or framework migrations unless explicitly requested.
- Do not create, delete, move, or rename files unless explicitly authorized.
- Do not install dependencies, run migrations, seed data, or change infrastructure without explicit authorization.

## 4. Backend Layer Boundaries

Follow the repository's established layering. Where equivalent layers exist, preserve these responsibilities:

### Transport layer

Controllers, route handlers, resolvers, or request adapters should:

- parse transport input
- authenticate the request through approved middleware
- validate the request using approved schemas
- invoke application services
- map approved results and errors to transport responses

They should not contain complex business rules or persistence logic.

### Application or service layer

Application services should:

- coordinate use cases
- enforce workflow order
- invoke authorization and domain rules
- control transaction boundaries where appropriate
- call repositories and approved integration clients
- return explicit outcomes

### Domain layer

Domain logic should:

- enforce invariants
- model allowed state transitions
- avoid framework-specific coupling where the current architecture permits
- remain deterministic where possible

### Persistence layer

Repositories or data-access modules should:

- isolate database operations
- use parameterized queries or the approved ORM/query builder
- return domain-relevant results
- avoid leaking database details into presentation or transport layers

### Integration layer

External provider clients should:

- encapsulate provider-specific protocols
- apply bounded timeouts
- validate provider responses
- translate failures into approved internal error types
- avoid silent provider fallback

## 5. Input Validation

Validate every untrusted boundary, including:

- HTTP request bodies, params, and query strings
- headers and cookies
- webhook payloads
- uploaded files
- queue messages
- scheduled-job inputs
- provider responses
- administrator-entered data
- AI-generated or user-generated content

Rules:

- Reject unknown or unsupported values where the API contract requires strictness.
- Normalize only according to documented rules.
- Use allowlists for enums, roles, status transitions, MIME types, and sortable fields.
- Enforce size, length, range, precision, and cardinality limits.
- Do not rely on frontend validation.

## 6. Authentication

Use one authoritative implementation for each approved authentication method.

For password, Google OAuth, mobile OTP, session, token, or API-key flows:

- use secure random generation where applicable
- store only hashed or encrypted secrets according to the approved design
- enforce expiry and rotation rules
- prevent replay
- rate-limit attempts
- avoid account enumeration
- invalidate sessions or credentials through established revocation behavior
- never log passwords, OTP values, session tokens, refresh tokens, or API keys

Do not add mock success, bypass flags, alternate providers, or silent fallback authentication.

## 7. Authorization

Authorization must be enforced server-side for every protected operation.

Check, as applicable:

- authenticated identity
- active account status
- role or permission
- organization or tenant scope
- resource ownership
- marketplace participation eligibility
- action-specific constraints
- current resource state

Rules:

- Deny by default.
- Do not infer authorization only from route access or UI visibility.
- Centralize repeated authorization rules.
- Prevent horizontal and vertical privilege escalation.
- Do not disclose the existence or details of resources a caller cannot access.

## 8. Domain Invariants

Backend code is the authority for domain rules.

Examples of invariant categories include:

- listing ownership and publication eligibility
- inventory and quantity availability
- order totals and fees
- allowed order and logistics transitions
- payment state
- refund or cancellation eligibility
- government-scheme eligibility
- user and organization status
- data visibility
- role-specific actions

Never trust client-supplied totals, fees, roles, ownership, status, eligibility, or completion flags.

## 9. API Design

Follow the project's existing API style and versioning strategy.

APIs should:

- use consistent request and response shapes
- return appropriate status codes
- provide stable machine-readable error codes where the project supports them
- avoid exposing internal exceptions
- support pagination for unbounded collections
- use bounded filter and sort options
- preserve backward compatibility unless a breaking change is explicitly approved
- document or reuse idempotency behavior for retryable mutations

Avoid endpoints that combine unrelated actions merely for convenience.

## 10. Error Handling

- Use established typed or structured errors.
- Distinguish validation, authentication, authorization, conflict, not-found, rate-limit, dependency, timeout, and internal failures.
- Fail safely and explicitly.
- Do not return success when persistence or a required external operation failed.
- Do not swallow exceptions.
- Preserve safe diagnostic context for logs without exposing it to users.
- Map provider-specific failures to stable internal errors.

## 11. Transactions and Concurrency

Use transactions when multiple writes must succeed or fail together.

Protect against:

- duplicate orders
- duplicate payments
- overselling inventory
- repeated webhook processing
- race conditions in status transitions
- conflicting account or permission updates
- partial fee, refund, or ledger updates

Use the established mechanisms for:

- row or optimistic locking
- unique constraints
- compare-and-set transitions
- idempotency keys
- deduplication records
- retry-safe operations

Do not hold transactions open across slow external network calls unless the existing architecture explicitly requires it.

## 12. Database Access

- Use parameterized queries or the approved ORM/query builder.
- Select only required columns.
- Use indexes according to real query patterns.
- Avoid N+1 queries.
- Bound list queries.
- Preserve referential integrity.
- Treat database constraints as an additional correctness layer, not a replacement for clear domain validation.
- Do not modify schemas or run migrations without explicit authorization.
- Do not perform destructive or production-data operations without explicit confirmation.

For schema changes, when explicitly authorized:

- preserve backward compatibility where possible
- use staged, zero-downtime-safe changes
- provide a rollback or recovery strategy
- account for existing data
- avoid long table locks

## 13. Money, Fees, and Quantities

- Use the project's approved decimal or integer-minor-unit representation.
- Never use binary floating-point for authoritative money calculations.
- Store currency explicitly where multiple currencies are possible.
- Apply rounding only at documented boundaries.
- Calculate authoritative totals, taxes, commissions, discounts, logistics charges, and refunds on the backend.
- Treat agricultural quantity units explicitly; do not mix kilograms, quintals, tonnes, pieces, acres, hectares, or other units without approved conversion rules.
- Preserve the exact input and normalized value where auditability requires it.

## 14. Orders, Inventory, and Logistics

- Centralize status definitions and allowed transitions.
- Validate the current state before every transition.
- Record who initiated material changes and when.
- Prevent inventory from becoming negative.
- Use reservation or allocation behavior only according to the approved domain design.
- Distinguish order, payment, fulfillment, shipment, delivery, cancellation, dispute, and refund states.
- Do not collapse independent state machines into one ambiguous status field unless that is the established model.

## 15. External Integrations

For payment gateways, SMS/OTP providers, email, maps, logistics, government services, storage, AI services, analytics, or other APIs:

- use the existing integration client
- set bounded connect and request timeouts
- validate signatures and responses
- use idempotency where supported
- handle rate limits explicitly
- avoid logging sensitive payloads
- keep provider credentials in approved secret storage
- separate provider status from internal domain status
- do not silently switch providers or return fake success

When the authoritative provider is unavailable, fail safely and surface an actionable error.

## 16. Webhooks

- Verify authenticity before processing.
- Preserve the raw body when required for signature verification.
- Validate event type and schema.
- Deduplicate by provider event identifier or the approved equivalent.
- Make processing idempotent.
- Handle out-of-order delivery.
- Do not trust webhook metadata for resource ownership without server-side lookup.
- Record safe processing outcomes for audit and troubleshooting.
- Return provider-compatible responses without hiding internal failure states.

## 17. Background Jobs and Queues

When the existing architecture uses asynchronous processing:

- make jobs idempotent
- bound retries
- use exponential backoff where appropriate
- classify retryable and permanent failures
- include safe correlation identifiers
- avoid placing secrets or unnecessary personal data in queue payloads
- use dead-letter or failure handling through the established system
- ensure delayed processing cannot bypass current authorization or state rules

Do not introduce a queue or background job merely to move complexity elsewhere.

## 18. Caching

- Use the existing cache strategy.
- Cache only data with an explicit invalidation or expiry model.
- Never allow cache keys to omit user, role, organization, locale, or permission scope when those affect data.
- Do not cache secrets, OTPs, raw tokens, or sensitive responses.
- Prevent stale cache values from authorizing actions or confirming transactional state.
- Treat the primary data store as authoritative unless the approved architecture states otherwise.

## 19. File Uploads and Storage

- Validate file size, type, extension, and actual content where applicable.
- Generate server-controlled storage names.
- Prevent path traversal.
- Keep uploads outside executable paths.
- Use private access by default for user or transaction documents.
- Apply signed or authorized access through the established system.
- Strip or manage metadata where privacy requires it.
- Scan files according to the approved security architecture.
- Do not trust client-provided MIME types or filenames.

## 20. Logging, Metrics, and Audit

Use existing observability tools.

Logs should be:

- structured
- actionable
- appropriately leveled
- correlated across requests and background work where supported

Never log:

- passwords
- OTPs
- session or access tokens
- API keys
- payment credentials
- sensitive identity documents
- unnecessary personal or agricultural business data

Audit material actions such as approved changes to:

- identity and permissions
- listings and publication state
- orders and logistics state
- financial state
- API keys
- administrative settings
- security controls

## 21. Privacy and Data Retention

- Collect only data required for approved product behavior.
- Use purpose-limited fields.
- Apply access controls to personal, commercial, location, agricultural, and transaction data.
- Respect established retention and deletion rules.
- Avoid duplicating sensitive data across services.
- Do not expose internal identifiers unnecessarily.
- Do not use production personal data for testing.

## 22. Configuration and Secrets

- Use established environment or secret-management systems.
- Do not hardcode secrets, URLs, credentials, feature flags, provider identifiers, or environment-specific values.
- Validate required configuration at the established startup boundary.
- Do not print secret values in errors.
- Preserve separate development, staging, and production behavior without hidden environment shortcuts.

## 23. Reliability and Performance

- Bound external calls, queries, payloads, and collection sizes.
- Use pagination and streaming where appropriate.
- Avoid blocking work on request threads when the established architecture provides asynchronous processing.
- Prevent retry storms and unbounded loops.
- Use circuit-breaking only if already established or explicitly approved; do not treat it as provider fallback.
- Optimize based on evidence and critical flows.

## 24. Focused Verification Policy

Unless explicitly authorized, do not run builds, lint, type checking, tests, servers, migrations, seed commands, Docker, or deployment workflows.

Allowed default verification:

- inspect all affected layers
- trace the request and data flow statically
- inspect schemas, validation, authorization, persistence, and error mapping
- review the focused diff
- compare with similar established code

When verification commands are not authorized, do not claim:

- tests passed
- migration safety was executed
- deployment readiness was proven
- end-to-end behavior was confirmed

Use accurate status labels:

- Implemented
- Statically reviewed
- Runtime verification not performed
- User-run validation required

## 25. Completion Checklist

Before reporting completion, confirm through available inspection that:

- the requested backend behavior is implemented
- transport, service, domain, and persistence boundaries remain consistent
- input validation exists at all affected boundaries
- authorization remains server-side and deny-by-default
- transaction and concurrency risks were considered
- no secrets or sensitive values were introduced
- no silent fallback or fake-success path was added
- errors fail safely and explicitly
- the diff is narrowly scoped
- unperformed tests, builds, migrations, or runtime checks are clearly disclosed
