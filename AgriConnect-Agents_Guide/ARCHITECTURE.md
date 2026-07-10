# AgriConnect Architecture Guide

**Status:** Baseline architectural guidance  
**Audience:** Developers, reviewers, Codex, and other AI-assisted engineering tools

## 1. Purpose

This document describes the architectural boundaries and decision rules for AgriConnect, a multi-sided agriculture SaaS and commerce platform.

It is intentionally technology-aware but not technology-inventing. The actual repository structure, framework configuration, schemas, deployed services, and approved architecture decisions remain authoritative.

When this guide conflicts with implemented architecture, do not silently rewrite the system. Inspect the repository, identify the mismatch, and request or document an explicit architecture decision before broad change.

## 2. Product Context

AgriConnect may support approved capabilities across:

- agricultural input discovery and commerce
- produce discovery and commerce
- farmer, seller, buyer, and partner workflows
- D2C storefronts
- logistics coordination
- government-scheme discovery or integration
- multilingual agricultural content and taxonomy
- community and engagement capabilities
- AI-assisted agricultural decision support
- administration, moderation, analytics, and platform operations
- future approved fintech, sustainability, insight, white-label, or public-private workflows

Not every capability is necessarily implemented. Do not treat this list as permission to create missing modules.

## 3. Architectural Goals

The system should prioritize:

- correctness of identity, permissions, orders, and financial state
- clear domain boundaries
- secure handling of personal and commercial data
- maintainability for a solo developer and future team growth
- modular evolution without premature microservices
- reliable behavior under real-user traffic
- multilingual and regional adaptability
- observability of critical flows
- backward-compatible change
- graceful, explicit failure without fake success or silent fallback

## 4. Source-of-Truth Order

Use this order when determining system behavior:

1. Approved user requirement for the current task.
2. Active root `AGENTS.md`.
3. Accepted architecture decisions and approved specifications.
4. Current repository code and schema.
5. This architecture guide.
6. General engineering practice.

If repository behavior and approved product behavior disagree, surface the mismatch instead of guessing.

## 5. System Context

Conceptually, AgriConnect consists of:

### User-facing clients

- public web experience
- authenticated web application
- responsive or installable PWA behavior where implemented
- future approved mobile or partner clients

### Platform application

- identity and access
- user and organization profiles
- catalog and taxonomy
- marketplace listings
- storefronts
- orders and commerce
- logistics
- payments and financial records where implemented
- government-scheme information or integration
- notifications
- content, community, and moderation
- AI-assisted features
- administrative and operational tooling

### Data and infrastructure

- primary transactional data store
- object or file storage where implemented
- cache where implemented
- search system where implemented
- queue or background processing where implemented
- monitoring and audit systems

### External services

Only approved integrations should exist, such as:

- identity providers
- SMS or email providers
- payment gateways
- logistics or mapping services
- government systems
- storage or CDN services
- analytics services
- AI model providers

Do not assume a specific provider unless the repository or user confirms it.

## 6. Preferred Deployment Shape

Prefer a modular monolith while the product and team benefit from one deployable application, unless the existing repository already uses another architecture.

A modular monolith should still maintain clear boundaries between domains. Extract a separate service only when there is a concrete reason such as:

- independent scaling requirements
- regulatory or security isolation
- distinct availability requirements
- independent deployment ownership
- clearly separated data lifecycle
- proven operational bottleneck

Do not introduce microservices solely because the platform is large.

## 7. Logical Layers

Preserve equivalent layers already present in the repository:

### Presentation layer

- pages, layouts, components, API transport adapters
- no authoritative business or authorization rules

### Application layer

- use-case coordination
- transaction orchestration
- permission and workflow invocation

### Domain layer

- entities, value objects, invariants, policies, status transitions
- framework-independent where practical

### Infrastructure layer

- database repositories
- external provider clients
- storage
- queues
- cache
- monitoring adapters

Dependencies should point inward toward stable domain and application behavior where the current architecture supports it.

## 8. Domain Boundaries

Keep these conceptual domains separated even when they share one codebase:

### Identity and access

Owns:

- accounts
- authentication methods
- sessions or tokens
- roles and permissions
- organization or tenant membership where implemented
- account status and security controls

### Profiles and organizations

Owns:

- user profile data
- business or farm profiles
- addresses and contact preferences
- verification state where implemented

### Catalog and agricultural taxonomy

Owns:

- categories
- crops
- inputs
- produce types
- varieties
- units and attributes
- localized names and descriptions

### Listings and inventory

Owns:

- input and produce offers
- publication state
- pricing presentation data
- quantity and availability
- seller ownership

### Storefronts

Owns:

- storefront identity and presentation
- approved catalog exposure
- public seller or brand information
- storefront configuration

### Orders and commerce

Owns:

- carts or quote requests where implemented
- orders
- line items
- authoritative totals
- discounts, fees, taxes, and commissions where implemented
- cancellation, dispute, return, and refund coordination

### Payments and financial records

Owns, where implemented:

- payment intent and provider references
- payment status
- settlement or payout records
- refunds
- immutable financial events or ledgers

### Logistics

Owns:

- delivery requirements
- shipment or trip coordination
- transport partners
- tracking events
- proof of pickup or delivery where implemented

### Government schemes

Owns:

- scheme information
- eligibility rules or external eligibility results
- application links or workflow state where implemented
- provenance and last-updated metadata

### Content, community, and moderation

Owns:

- posts, comments, reviews, educational content, or community metrics where implemented
- moderation status
- reporting and enforcement records

### AI assistance

Owns:

- approved AI use cases
- prompt and response orchestration
- safety constraints
- source attribution where required
- user feedback and model observability

AI must not become the authoritative source for identity, permission, pricing, payment, legal eligibility, diagnosis, or irreversible agricultural action.

### Administration and operations

Owns:

- approved platform configuration
- moderation tools
- support workflows
- audit views
- operational dashboards

Administrative interfaces must call the same protected backend rules rather than bypass them.

## 9. Identity, Role, and Scope Model

The implementation may support individual users, businesses, farms, organizations, or multiple roles. Before changing role or scope behavior, inspect the existing model.

Architectural rules:

- authentication answers who the caller is
- authorization answers what the caller may do
- resource scope answers which records the caller may access
- UI visibility does not grant permission
- role names must not be duplicated as uncontrolled strings across the codebase
- permission decisions should be centralized and testable
- organization or tenant scope must be applied to queries, caches, jobs, and file access where applicable

## 10. State Machines

Use explicit state machines or centralized transition rules for workflows such as:

- account verification
- listing review and publication
- order lifecycle
- payment lifecycle
- shipment or delivery lifecycle
- cancellation, dispute, return, and refund lifecycle
- government-scheme application lifecycle
- moderation lifecycle

Rules:

- validate current state before transition
- record actor and timestamp for material transitions
- reject unsupported transitions
- make retryable transitions idempotent
- avoid one overloaded status field for independent workflows

Exact statuses must come from the implemented domain model or an approved specification.

## 11. Data Ownership

Each domain should own its authoritative data and expose it through approved interfaces.

- Do not allow multiple modules to independently mutate the same critical state.
- Avoid cross-domain direct database writes.
- Use application services or domain interfaces for coordinated changes.
- Duplicate data only for a documented read model, cache, search index, or integration requirement.
- Define reconciliation behavior for derived or replicated data.

## 12. API Boundaries

APIs should expose use cases, not raw database structures.

- Keep contracts stable and versioned according to the existing strategy.
- Validate all input.
- Apply authentication and authorization consistently.
- Use pagination for unbounded collections.
- Keep public, authenticated, administrative, and integration APIs clearly separated.
- Avoid leaking internal database identifiers or provider payloads without need.
- Use idempotency for retryable critical mutations.

## 13. Event and Asynchronous Boundaries

Use events or background jobs only when the repository has approved infrastructure or the user explicitly approves it.

Good candidates may include:

- email and notification delivery
- search indexing
- image processing
- analytics aggregation
- provider webhook processing
- long-running report generation
- AI processing that does not need to block the request

Events must have:

- a stable schema
- clear ownership
- idempotent consumers
- bounded retry behavior
- safe payloads
- observability

Do not use asynchronous processing to bypass transaction or consistency requirements.

## 14. Integration Architecture

Each external provider should be isolated behind an internal interface or client.

The internal domain must not depend on provider-specific status names, raw payloads, or error formats.

Required properties:

- bounded timeout
- signature or credential validation
- idempotency where supported
- normalized internal errors
- safe logging
- explicit retry policy
- no silent provider fallback
- reconciliation for externally confirmed transactions where necessary

## 15. Data Consistency

Choose consistency according to business impact:

### Strong consistency expected

- identity and permission changes
- inventory reservation where overselling matters
- order totals and status transitions
- payment, refund, settlement, or ledger state
- one-time token or OTP consumption
- API-key creation and revocation

### Eventual consistency may be acceptable when approved

- search indexing
- analytics dashboards
- noncritical counters
- recommendation updates
- public cache refresh
- notification delivery

The user experience must not present eventually consistent data as confirmed transactional truth.

## 16. Caching

Caching must have explicit:

- purpose
- key scope
- expiry
- invalidation behavior
- privacy classification
- source of truth

Never let cache entries omit identity, role, organization, locale, or permission dimensions that affect the response.

Do not cache authorization decisions or transactional confirmations longer than the approved design permits.

## 17. Multilingual Architecture

Separate:

- interface translations
- localized taxonomy
- user-generated content
- machine-translated content
- authoritative government or legal text

Rules:

- preserve source language and provenance where required
- avoid overwriting original user content with machine translation
- distinguish approved translations from generated translations
- use locale-aware formatting for dates, numbers, currency, and agricultural units
- do not silently fall back to an unintended language

## 18. AI Architecture

AI features must be isolated behind an application service or approved integration layer.

Required controls:

- clearly defined use case
- input and output limits
- prompt-injection resistance appropriate to the feature
- protection of secrets and personal data
- user-visible uncertainty where relevant
- source or evidence handling where required
- human confirmation before high-impact actions
- safe failure when the model is unavailable
- no fake success or unrelated fallback model without approval

AI output must not directly authorize, charge, pay, delete, publish, diagnose, or make irreversible domain changes without deterministic validation and approved user confirmation.

## 19. Security Architecture

Security must exist across layers:

- secure identity and session handling
- server-side authorization
- input validation
- output encoding
- CSRF protection where applicable
- rate limiting
- secret management
- encrypted transport
- sensitive-data controls
- audit logging
- dependency and deployment security

See `SECURITY.md` for detailed requirements.

## 20. Observability

Critical flows should support appropriate:

- structured logs
- request or correlation identifiers
- metrics
- traces
- audit events
- health and readiness checks
- alerting

Observability must not expose secrets or unnecessary personal, financial, location, or agricultural business data.

## 21. Environment Boundaries

Keep development, testing, staging, and production configuration separate.

- Never use production secrets or personal data in local development.
- Do not hardcode environment URLs.
- Keep feature flags and provider configuration explicit.
- Avoid hidden behavior that changes only because a hostname or debug flag is present.
- Production behavior must not depend on local-only fallbacks.

## 22. Scalability Guidance

Scale the measured bottleneck while preserving simplicity.

Prefer, where appropriate:

- pagination and bounded queries
- indexes aligned with query patterns
- code splitting
- caching with correct invalidation
- asynchronous processing for nontransactional long work
- horizontal scaling of stateless application layers
- object storage and CDN delivery for approved public assets

Do not introduce infrastructure complexity before a concrete need.

## 23. Availability and Failure Behavior

For every dependency, define:

- timeout
- retryability
- user-visible failure
- data-integrity behavior
- observability
- recovery or reconciliation path

Failure must remain explicit. A degraded noncritical feature may be unavailable, but the system must not claim that an order, payment, authentication, upload, or other critical action succeeded when it did not.

## 24. Architecture Decision Records

Create an ADR only when the user explicitly authorizes file creation and the decision is material, long-lived, and not already documented.

An ADR should record:

- context
- decision
- alternatives considered
- consequences
- migration or compatibility impact
- status and date

Examples include authentication strategy, order-state model, payment provider boundary, multilingual content model, or service extraction.

## 25. Architecture Change Checklist

Before an architecture-affecting change, determine:

- which domain owns the behavior
- which modules are affected
- whether a public contract changes
- whether data ownership changes
- whether permissions or privacy change
- whether a transaction boundary changes
- whether migration or backward compatibility is required
- whether new operational burden is introduced
- whether the change can be implemented more simply within the existing architecture

## 26. Known Unknowns

The following must be confirmed from the repository or user before implementation when relevant:

- exact frontend and backend frameworks
- exact deployment topology
- authentication providers and token/session model
- role and organization model
- database technology and schema
- payment, logistics, messaging, government, storage, analytics, and AI providers
- exact status enums and workflows
- data-residency and retention requirements
- supported locales and regional units

Do not resolve these unknowns by invention.
