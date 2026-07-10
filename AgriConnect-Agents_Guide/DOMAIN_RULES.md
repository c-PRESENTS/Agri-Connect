# AgriConnect Domain Rules

**Status:** Baseline product-domain rules  
**Purpose:** Prevent technically valid changes from violating AgriConnect business behavior

## 1. How to Use This Document

This document defines stable invariants and decision boundaries for AgriConnect.

It does not authorize creation of features that are not already requested or implemented. Exact roles, statuses, fields, fees, limits, providers, and eligibility rules must come from approved specifications or repository code.

When an exact domain rule is missing:

- inspect the existing implementation
- preserve current behavior unless the user requests a change
- do not invent a business rule
- surface the unresolved decision in the final report

## 2. Product Principles

AgriConnect should:

- connect agricultural participants transparently
- preserve trust between farmers, sellers, buyers, logistics partners, and administrators
- display clear pricing, quantity, unit, quality, and fulfillment information
- avoid misleading certainty in AI, scheme, availability, or logistics information
- enforce critical rules on the backend
- preserve user ownership and privacy of data
- maintain auditable order, payment, and administrative actions
- support multilingual and regional use without changing the meaning of authoritative data

## 3. Actors and Roles

Potential approved actors may include:

- farmer or producer
- agricultural input seller
- produce seller
- consumer or D2C buyer
- business or wholesale buyer
- transporter or logistics partner
- storefront operator
- content contributor or community participant
- government or institutional participant
- support, moderator, operator, or administrator

Rules:

- Do not create or assume a role unless it exists in the approved model.
- A role grants only documented permissions.
- UI visibility is not permission.
- Role, ownership, account status, verification status, and organization scope are separate concerns.
- A user may hold multiple roles only if the implemented identity model supports it.
- Administrative roles must use explicit least-privilege permissions.

## 4. Account and Profile Invariants

- Every protected action must resolve to an authenticated account.
- Account status must be checked where relevant.
- Contact details and identity data must be validated according to the approved flow.
- Verification badges or statuses must not be inferred from profile completeness.
- Profile visibility must respect privacy and role rules.
- Deactivated, suspended, or restricted accounts must not continue performing blocked actions through old sessions or direct API calls.
- Ownership transfer must be explicit and auditable where supported.

## 5. Organization and Business Scope

Where businesses, farms, cooperatives, stores, or organizations exist:

- membership and role must be verified server-side
- records must be scoped to the correct organization
- users must not access another organization's private records
- organization switching must update authorization and cached state
- organization ownership and operator permissions must not be conflated
- removal from an organization must revoke associated access

Do not assume the platform is multi-tenant unless the repository confirms the model, but apply scope consistently wherever it exists.

## 6. Agricultural Taxonomy

Taxonomy may include crops, produce, inputs, categories, varieties, grades, units, seasons, locations, or attributes.

Rules:

- Use canonical identifiers separate from translated display labels.
- Preserve hierarchical relationships.
- Do not create duplicate concepts because of spelling, language, or capitalization differences.
- Keep localized names linked to one canonical entity.
- Preserve provenance for imported or government-defined taxonomy.
- Do not use free text where an approved canonical value is required.
- Changes to widely referenced taxonomy require compatibility consideration.

## 7. Units and Measurements

Agricultural values must include an explicit unit.

- Do not compare or aggregate quantities with incompatible units.
- Use approved conversions only.
- Preserve sufficient precision.
- Distinguish area, weight, volume, count, package, distance, and time units.
- Display localized units without changing stored meaning.
- Never silently reinterpret an entered quantity.
- Store original and normalized values where traceability requires it.

## 8. Location Rules

Location can affect availability, logistics, language, currency, scheme eligibility, and search.

- Use the approved location hierarchy and identifiers.
- Do not expose precise private location when an approximate location is sufficient.
- Treat user-provided location as untrusted input.
- Do not infer legal or scheme eligibility solely from browser geolocation.
- Preserve address and coordinate privacy.
- Use explicit serviceability checks for logistics or marketplace access.

## 9. Listings

A listing must have an identifiable owner and approved domain type.

Common invariants:

- required listing information must be complete before publication
- ownership must be verified
- publication state must be explicit
- unavailable, rejected, expired, suspended, or deleted listings must not be purchasable
- quantity, unit, price, quality, location, and fulfillment terms must not be ambiguous
- user-generated claims must not be presented as platform verification
- moderation or verification status must be distinct from publication status
- edits that materially affect active orders must follow approved rules

Exact required fields and statuses must come from the implemented model.

## 10. Input Marketplace Rules

For seeds, fertilizers, equipment, crop protection, or other agricultural inputs where supported:

- seller eligibility must be enforced according to approved policy
- regulated-product information must not be fabricated or hidden
- quantity and packaging must be explicit
- product claims and usage instructions must preserve approved source content
- expired, recalled, restricted, or unavailable products must not be sold
- inventory and price shown as confirmed must come from authoritative data
- compliance documents must be access-controlled and auditable where required

The platform must not generate unsafe application instructions or regulatory claims through generic AI output.

## 11. Produce Marketplace Rules

For crops and produce where supported:

- producer or seller ownership must be established
- variety, grade, harvest or availability timing, quantity, unit, location, and fulfillment expectations must be explicit where required
- quality claims must identify whether they are seller-provided, verified, or measured
- perishable availability must not be treated as indefinitely valid
- updates to quantity or price must not retroactively change confirmed order terms
- lot, batch, or traceability references must be preserved where implemented

## 12. D2C Storefront Rules

- A storefront must be owned or operated by an authorized account.
- Storefront presentation must not bypass listing eligibility or inventory rules.
- Public branding must not imply platform endorsement without approved verification.
- Only approved listings may be exposed publicly.
- Storefront configuration must not alter authoritative price, tax, fee, inventory, or order rules.
- Disabled or suspended storefronts must not continue accepting orders.

## 13. Search and Discovery

- Search results must respect visibility, status, location, and permission rules.
- Restricted or unpublished records must not leak through counts, suggestions, indexes, or cached responses.
- Ranking must not be represented as neutral when paid, sponsored, personalized, or promoted.
- Filters must use canonical fields and units.
- Empty results must not be replaced with fabricated listings.
- Search indexes are derived data; authoritative details must be confirmed from the primary system before a critical action.

## 14. Cart, Quote, and Intent Rules

Where carts, enquiries, bids, or quote requests exist:

- they do not guarantee price, stock, acceptance, or fulfillment unless the approved workflow says otherwise
- the system must revalidate authoritative details before confirmation
- duplicate submissions must be prevented or made idempotent
- expiry must be explicit where applicable
- one participant must not modify another participant's private cart or negotiation

## 15. Order Invariants

An order must preserve the terms confirmed at creation.

At minimum, authoritative records should preserve approved values for:

- buyer and seller
- items or lots
- quantities and units
- price basis
- taxes, fees, discounts, logistics charges, and total where applicable
- fulfillment method
- delivery or pickup terms
- timestamps and current state

Rules:

- totals must be calculated or validated server-side
- order creation must be idempotent where retries are possible
- status transitions must be centralized and validated
- one party must not unilaterally perform actions outside approved policy
- material changes after confirmation require explicit workflow and audit
- cancellation, return, dispute, and refund are distinct concepts
- order deletion must not erase required audit or financial history

## 16. Inventory and Availability

- Inventory must never become negative through concurrent actions.
- Availability displayed as confirmed must come from authoritative state.
- Reservation, allocation, deduction, release, and expiry must follow one approved model.
- Failed payment or cancelled orders must release inventory only according to the approved workflow.
- Manual inventory changes must be authorized and auditable.
- Do not silently substitute another product, lot, seller, or quantity.

## 17. Pricing and Fees

- Every monetary value must have a currency.
- Pricing basis must be explicit: per unit, per package, per weight, per area, fixed, estimated, or negotiated.
- Platform fees, commissions, taxes, logistics charges, discounts, and seller proceeds must be calculated through approved authoritative logic.
- Displayed estimates must be labelled as estimates.
- Confirmed order terms must not be recomputed from later catalog changes.
- Administrative overrides must be authorized and audited.
- Do not hide fees until after commitment.

## 18. Payments, Refunds, and Settlements

Where payments are implemented:

- internal payment state must be separate from provider transport state
- client-side success is not proof of payment
- provider callbacks must be authenticated and idempotently processed
- one provider transaction must not create duplicate internal financial effects
- refunds must not exceed eligible captured amounts
- settlements or payouts must follow approved ownership and reconciliation rules
- failed, pending, reversed, refunded, and disputed states must remain distinct
- financial history must not be rewritten to hide prior events

## 19. Logistics Rules

Where logistics is implemented:

- serviceability must be checked through approved data
- pickup, shipment, tracking, delivery, failure, and return events must be explicit
- actor authorization must be checked for every event
- estimated delivery must not be presented as guaranteed
- proof of pickup or delivery must be protected and auditable
- precise location and contact data must be shared only with authorized participants and only when needed
- logistics status must not automatically imply payment or order completion unless the approved workflow defines it

## 20. Government Scheme Rules

- Scheme content must show source and freshness where practical.
- Eligibility guidance must distinguish informational screening from official approval.
- Do not fabricate deadlines, benefits, documents, eligibility, or application status.
- Preserve authoritative wording for legal or government requirements.
- External government-system failures must be reported explicitly.
- User data sent to government integrations must be minimized and authorized.
- AI-generated scheme guidance must include appropriate uncertainty and must not impersonate an official decision.

## 21. AI-Assisted Agriculture Rules

AI may assist with approved informational, classification, recommendation, summarization, or workflow tasks.

AI must not independently:

- authorize users
- approve payments or refunds
- alter financial records
- publish regulated claims
- determine official scheme eligibility
- make definitive medical, veterinary, pesticide, or crop-safety diagnoses
- execute irreversible farm, marketplace, or administrative actions

Requirements:

- label generated or assisted content where appropriate
- communicate uncertainty
- protect personal and commercial data
- use deterministic validation before domain actions
- require human confirmation for high-impact actions
- fail safely when unavailable
- do not silently switch models or providers without approval

## 22. Multilingual Content Rules

- Canonical data must remain independent of translated labels.
- Original user-generated text must be preserved.
- Machine translation must not overwrite source content.
- Translation status and provenance should be distinguishable where material.
- Numbers, dates, currency, and units must be locale-aware.
- A translation must not change legal, safety, price, quantity, or eligibility meaning.
- Missing translations must follow the approved i18n policy; do not invent hidden language fallbacks.

## 23. Community, Reviews, and Moderation

Where community features exist:

- content ownership must be explicit
- reports and moderation actions must be auditable
- removed or restricted content must not remain accessible through caches or search
- review eligibility must follow approved transaction or participation rules
- users must not review themselves or manipulate ratings through duplicate identities
- moderation state must be distinct from deletion
- personal, financial, exact-location, and sensitive agricultural data must be protected

## 24. Notifications

- Notifications must correspond to real system events.
- Do not report success, payment, approval, dispatch, or delivery before authoritative confirmation.
- Respect user preferences where applicable, except mandatory security or transactional messages.
- Avoid including secrets or excessive sensitive information.
- Deduplicate retryable messages.
- Preserve localization and correct recipient scope.

## 25. Administration

- Administrative access must be least-privilege.
- Every material administrative action must be authorized and auditable.
- Admin interfaces must not bypass domain invariants.
- Impersonation, if implemented, must be explicit, restricted, time-bound, and audited.
- Bulk actions require clear scope and safeguards.
- Destructive changes require confirmation and recovery consideration.
- Administrative convenience must not weaken user privacy or financial correctness.

## 26. Deletion, Deactivation, and Retention

Distinguish:

- soft deletion
- deactivation
- suspension
- archival
- anonymization
- permanent deletion

Rules:

- preserve records required for orders, payments, disputes, audit, security, or legal obligations
- revoke access promptly when accounts or keys are deactivated
- do not expose deleted records in public or unauthorized views
- propagate deletion or anonymization to derived systems according to approved policy
- never promise immediate permanent deletion unless the implemented retention process guarantees it

## 27. Auditability

Material events should preserve, where appropriate:

- actor
- action
- affected resource
- prior and resulting state
- timestamp
- source or channel
- safe reason or correlation reference

Audit logs must not be editable through ordinary product workflows and must not contain secrets.

## 28. Domain Change Procedure

Before changing a business rule:

- identify all affected actors
- identify the current source of truth
- identify affected statuses and transitions
- identify money, inventory, permission, privacy, and notification impact
- preserve existing confirmed transactions
- define backward compatibility
- update related documentation when explicitly authorized
- do not implement a second parallel rule as a silent fallback

## 29. Unresolved Decisions

Confirm from repository code or the user when relevant:

- exact role catalogue and permission matrix
- exact marketplace transaction model
- exact order, payment, logistics, dispute, and refund statuses
- listing approval and verification rules
- inventory reservation model
- fee and commission model
- supported currencies, units, regions, and languages
- storefront ownership model
- government integration scope
- AI use cases and safety boundaries
- data-retention and deletion obligations

Do not fill these gaps by assumption.
