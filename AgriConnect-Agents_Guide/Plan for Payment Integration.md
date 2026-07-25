# AgriConnect Payment Architecture — Final Controlled Implementation Plan

## 1. Baseline and Safety Constraints

The current payment implementation is divided between provider wrappers, commerce routes, in-memory storage, and provider-specific checkout logic. The target architecture will centralize payment behavior while preserving existing APIs through compatibility adapters.

System-wide rules:

- Never call Stripe, PayPal, Razorpay, or another remote service inside an open database transaction.
- Never infer payment success from redirects, SDK callbacks, browser state, or unverified provider responses.
- All prices, totals, currencies, provider eligibility, seller eligibility, limits, and capabilities are server-authoritative.
- Customer-facing language uses “protected payment” and “seller payout on hold,” not legal escrow terminology.
- Authentication, roles, taxonomy, product names, and unrelated features remain unchanged.
- Existing payment and order APIs remain available through compatibility adapters during migration.
- Every implementation phase is independently implemented, reviewed, tested, and committed.
- Persistence, checkout migration, individual provider integrations, payouts, refunds, and disputes remain separate phases.
- Pre-existing image changes remain outside scope and must not be included in payment commits.

## 2. Shared State and Data Models

### Monetary representation

All new monetary APIs use:

```ts
interface Money {
  currency: "GBP" | "INR";
  amountMinor: string;
}
```

Amounts are stored as PostgreSQL `bigint` minor units and serialized as strings. Existing numeric fields remain temporarily available through compatibility serializers.

### Financial payment state

`paymentStatus` represents only the financial lifecycle:

```ts
type PaymentStatus =
  | "created"
  | "requires_action"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "expired"
  | "partially_refunded"
  | "refunded"
  | "disputed";
```

### Technical provider-call state

`providerCallStatus` represents remote-call execution independently:

```ts
type ProviderCallStatus =
  | "not_started"
  | "queued"
  | "started"
  | "completed"
  | "failed"
  | "outcome_unknown";
```

Before an external provider call, persist and commit:

- `providerCallStatus = "started"`.
- Lease owner.
- Lease expiry.
- Incremented attempt count.
- Deterministic provider idempotency reference.
- Provider-call start time.

The financial `paymentStatus` does not change merely because a provider call started or returned.

### Reconciliation state

`reconciliationStatus` tracks recovery separately:

```ts
type ReconciliationStatus =
  | "not_required"
  | "pending"
  | "in_progress"
  | "resolved"
  | "manual_review";
```

`provider_result_unpersisted` is not a stored state. It is inferred when:

```text
providerCallStatus = started
AND provider-call lease has expired
AND no conclusive provider result was persisted
```

The recovery scanner then sets `reconciliationStatus` to `pending`, retrieves the provider result, and resolves or escalates it.

### Other state machines

- Allocation: `pending_payment`, `held`, `release_scheduled`, `release_blocked`, `releasing`, `released`, `refunding`, `partially_refunded`, `refunded`, `disputed`.
- Transfer: `not_ready`, `queued`, `submitted`, `pending`, `paid`, `failed`, `reversed`, `recovery_required`.
- Refund: `requested`, `submitted`, `pending`, `succeeded`, `failed`, `cancelled`.
- Dispute: `open`, `evidence_required`, `under_review`, `resolved_buyer`, `resolved_seller`, `resolved_split`, `cancelled`.
- Provider activation: `disabled`, `configuration_incomplete`, `approval_required`, `verification_pending`, `sandbox_ready`, `active`, `degraded`, `suspended`, `revoked`.

Payment, provider-call, reconciliation, fulfilment, refund, dispute, allocation, and payout states remain independent.

## 3. PostgreSQL Persistence

### Migration 0004 — Commerce persistence

`database/migrations/0004_commerce_persistence.sql` adds:

- `products`
- `carts`
- `cart_items`
- `orders`
- `order_items`
- `order_status_history`
- `inventory_reservations`

Requirements:

- Preserve existing product IDs, names, and taxonomy.
- Backfill existing product currency as GBP.
- Store immutable price, tax, shipping, seller, and currency snapshots.
- Use row-level locking for reservations.
- Prevent overselling through transactional constraints.

### Migration 0005 — Payment core

`database/migrations/0005_payment_core.sql` adds:

- `checkout_quotes`
- `checkout_intents`
- `payment_attempts`
- `provider_webhook_events`
- `api_idempotency_keys`
- `refunds`

`payment_attempts` contains separate:

- `payment_status`
- `provider_call_status`
- `reconciliation_status`
- Provider-call lease fields.
- Idempotency reference.
- Attempt count.
- Provider identifiers.
- Request and response fingerprints.
- Optimistic version.

### Migration 0006 — Protected seller settlement

`database/migrations/0006_protected_settlement.sql` adds:

- `seller_payment_accounts`
- `protected_allocations`
- `seller_transfers`
- `disputes`
- `dispute_events`
- `dispute_evidence`

AgriConnect stores provider account identifiers and capability states, not bank details, card data, KYC documents, or provider access credentials.

### Migration 0007 — Payment operations

`database/migrations/0007_payment_operations.sql` adds:

- `payment_provider_configs`
- `payment_provider_capabilities`
- `payment_jobs`
- `ledger_transactions`
- `ledger_entries`
- `reconciliation_runs`
- `operator_recovery_cases`
- `provider_health_events`

Jobs use PostgreSQL leases and `FOR UPDATE SKIP LOCKED`. Ledger transactions must balance within each currency.

### Model and repository files

Add:

- `shared/models/commerce.ts`
- `shared/models/payments.ts`
- `shared/models/payment-operations.ts`
- `backend/repositories/commerce-repository.ts`
- `backend/repositories/payment-repository.ts`
- `backend/repositories/payment-operations-repository.ts`

Update `shared/schema.ts` to re-export new models and preserve compatibility schemas.

## 4. Provider Configuration and Capabilities

### Operational verification

Provider and seller records store separate verification timestamps for:

- Platform business approval.
- Platform KYC.
- Provider product approval.
- Platform and seller countries.
- Seller KYC.
- Payment, refund, transfer, reversal, and hold capabilities.
- Supported currencies and countries.
- Multi-seller limits.
- Webhook registration.
- Webhook secret configuration.
- Webhook operational health.
- Last capability refresh.
- Next required review.
- Suspension reason and audit event.

Missing, stale, rejected, revoked, or expired required verification makes the provider or seller ineligible.

### Multi-seller capabilities

```ts
interface MultiSellerCapabilities {
  maximumSellersPerCheckout: number;
  maximumAllocationsPerPayment: number;
  supportsPartialSellerRefund: boolean;
  supportsIndependentSellerRelease: boolean;
  supportsIdempotentPaymentCreation: boolean;
  supportsLookupByMerchantReference: boolean;
  verifiedAt: string;
  expiresAt: string;
  source: "provider_api" | "provider_contract" | "approved_configuration";
  sourceReference: string;
}
```

Rules:

- Limits come only from verified provider responses or approved configuration.
- Frontend state cannot define or expand them.
- Environment configuration may reduce a verified limit but never increase it.
- Carts exceeding either limit are rejected before payment-attempt creation.
- Partial seller refunds and independent releases remain unavailable unless explicitly supported.
- Live payment creation requires provider idempotency or a verified lookup/recovery mechanism.
- Missing or expired capability information is treated as unsupported.

## 5. Transaction-Safe Checkout Processing

### Canonical APIs

- `GET /api/payments/methods?cartId=...`
- `POST /api/checkout/quotes`
- `POST /api/checkout/intents`
- `GET /api/payments/attempts/:attemptId`
- `POST /api/payments/attempts/:attemptId/confirm`
- `POST /api/payments/attempts/:attemptId/cancel`
- `POST /api/payments/attempts/:attemptId/retry`
- `POST /api/webhooks/payments/:provider`

### Processing sequence

1. Load the authenticated buyer, canonical cart, products, sellers, address, and shipping selection.
2. Validate one cart currency.
3. Check provider, platform, seller, country, currency, KYC, webhook, and multi-seller eligibility.
4. Begin a PostgreSQL transaction.
5. Lock inventory rows.
6. Recalculate subtotal, tax, shipping, platform fee, and total from canonical data.
7. Create:
   - Expiring checkout quote.
   - Inventory reservation.
   - Draft order and immutable order items.
   - Protected seller allocations.
   - Payment attempt with:
     - `paymentStatus = "created"`
     - `providerCallStatus = "queued"`
     - `reconciliationStatus = "not_required"`
   - Deterministic idempotency reference.
   - Durable provider-call job.
8. Commit the transaction.
9. Claim the provider-call job in a new short transaction.
10. Persist and commit:
    - `providerCallStatus = "started"`
    - Lease owner and expiry.
    - Incremented attempt count.
    - Idempotency reference.
    - Call start time.
11. Call the provider outside every database transaction.
12. Open a separate short transaction.
13. Store provider IDs, response fingerprint, normalized next action, and provider-call result.
14. Commit the provider response.
15. Return the normalized next action.

### Failure and reconciliation behavior

If the provider succeeds but local persistence fails:

- Do not mark the payment succeeded or failed.
- Do not attempt an uncontrolled second provider creation.
- The durable attempt remains detectable as `providerCallStatus = "started"`.
- After lease expiry, the scanner infers an unpersisted provider result.
- Set `reconciliationStatus = "pending"` when the database is reachable.
- Retrieve by provider ID, idempotency key, metadata, or merchant reference.
- Persist the verified result through a short transaction.
- Escalate to `manual_review` if no conclusive result is obtainable.

Other recovery cases:

- Crash before provider call: reclaim the job after lease expiry.
- Timeout with unknown provider outcome: set `providerCallStatus = "outcome_unknown"` and reconcile.
- Provider failure confirmed: set provider-call failure and financial failure separately.
- Duplicate checkout: return the existing attempt.
- Same idempotency key with a different request hash: return `409`.
- Clear the cart only after verified payment success.
- Expose the order to sellers only after verified success or accepted manual payment.

## 6. Automatic Provider and Seller Suspension

A durable capability-monitor job periodically rechecks:

- Platform approval and KYC.
- Provider product approval.
- Seller KYC and restrictions.
- Account payment and transfer capabilities.
- Supported currencies and countries.
- Multi-seller limits.
- Webhook registration and registered secret validity.
- Provider API authentication.
- Trusted webhook delivery health.

Suspension rules:

- Revoked KYC, approval, or required capability causes immediate suspension.
- Stale capability information suspends after its freshness deadline.
- Provider authentication failure can suspend the provider.
- Invalid or expired registered webhook configuration can suspend the provider.
- Confirmed expected-event delivery gaps can suspend the provider.
- Provider API or dashboard delivery-failure evidence can suspend the provider.
- Operator-confirmed configuration issues can suspend the provider.
- Seller-level failures suspend only that seller/provider account.
- Provider-level failures remove the provider from every checkout.
- Existing financial records remain accessible and enter recovery workflows.

Recovery rules:

- Transient operational suspension may recover after two consecutive trusted successful checks.
- Compliance, KYC, approval, liability, or secret-related suspension requires operator acknowledgement.
- Every suspension and recovery is audited.
- Cached eligibility may make checkout more restrictive, never more permissive.

## 7. Hardened Webhook Routing

Retain:

```text
POST /api/webhooks/payments/:provider
```

Register only the strict enum:

```ts
type WebhookProvider = "stripe" | "paypal" | "razorpay" | "mock";
```

Requirements:

- Reject unknown providers before body processing.
- Reject mock webhooks in production.
- Use provider-specific:
  - Raw-body parsers.
  - Body-size limits.
  - Content-type rules.
  - Secrets.
  - Signature verification.
  - Timestamp and replay policies.
  - Allowed event types.
  - Event-ID extraction.
- Preserve exact raw bytes until verification completes.
- Apply unique `(provider, provider_event_id)` constraints.
- Detect event-ID reuse with conflicting payload hashes.
- Persist verified events before asynchronous processing.
- Revalidate amount, currency, provider account, order, and allocation metadata.
- Process through idempotent state transitions and database locks.
- Record unknown event types without allowing financial transitions.
- Redact sensitive fields from logs.

Invalid signatures, malformed requests, replay attempts, unknown providers, oversized bodies, and abusive traffic must:

- Be rejected.
- Be rate-limited where appropriate.
- Be logged with redaction.
- Produce security metrics and alerts.
- Never independently suspend a provider.

Provider suspension requires trusted evidence such as:

- Provider API or dashboard delivery failures.
- Invalid or expired registered webhook configuration.
- Expected-event gaps confirmed through provider retrieval.
- Provider authentication failure.
- Operator-confirmed configuration problems.

Provider inactivity without confirmed expected events is not a delivery failure.

## 8. Provider-Specific Restrictions

### Stripe

Stripe remains disabled until verification of:

- Platform legal country.
- Connect approval and eligibility.
- Seller-country eligibility.
- Required account capabilities.
- Platform merchant/business responsibility.
- Fees, refunds, disputes, chargebacks, negative balances, and loss liability.
- Permitted cross-border funds flow.
- Platform and seller KYC.
- Platform and Connect webhooks.

A UK platform cannot assume eligibility to transfer to Indian sellers. Separate charges and transfers make the platform responsible for relevant Stripe fees and payment losses. No multi-seller Stripe flow activates until those responsibilities are accepted.

### PayPal

PayPal requires:

- Approved partner status.
- Multiparty Checkout approval.
- Delayed-disbursement approval.
- Seller onboarding with `DELAY_FUNDS_DISBURSEMENT`.
- Supported seller country and currency.
- Registered and healthy webhooks.

Enforce:

```text
latestEstimatedDelivery
+ releaseDelay
+ safetyBuffer
<= captureTime + 28 days
```

The 28-day maximum cannot be increased. The default safety buffer is 24 hours. Orders without a reliable latest delivery estimate are PayPal-ineligible.

### Razorpay Route

Razorpay Route requires:

- Currency is INR.
- Platform entity and settlement account are Indian.
- Platform KYC and payment activation are complete.
- Route product access is approved.
- Every seller has a KYC- and bank-verified linked account.
- Transfer, hold, reversal, and refund capabilities are active.
- Webhooks are registered and operational.
- Required financial-turnover eligibility is verified.
- Payer-payee transparency declaration is approved.
- Route compliance submission is complete.
- Route compliance approval is active.
- Compliance verification date is recorded.
- Next compliance review date is current.
- Compliance expiry date has not passed.

These conditions are server-authoritative. Razorpay remains disabled when any compliance requirement is incomplete, pending, rejected, suspended, stale, or expired.

GBP and other currencies never receive Razorpay Route through this architecture, regardless of international payment acceptance.

## 9. Frontend Architecture

Centralize frontend payment execution in:

- `frontend/src/lib/payment-client.ts`
- `frontend/src/hooks/use-payment-checkout.ts`
- `frontend/src/components/payments/provider-checkout.tsx`

Provider business logic must not exist in checkout or result pages.

Add:

- Payment-method selector.
- Protected-payment summary.
- Payment-state panel.
- Payment-status badge.
- Protected-allocation timeline.
- Transaction table.
- Refund summary.
- Dispute dialog.
- Seller onboarding card.
- Seller balance and payout components.

Routes:

- `/payment/:attemptId/processing`
- `/payment/:attemptId/success`
- `/payment/:attemptId/failed`
- `/payment/:attemptId/cancelled`
- `/payment/:attemptId/retry`
- `/transactions`

Every result page loads authoritative server state. Redirects never directly confirm an order.

Buyer pages display separate:

- Payment status.
- Fulfilment status.
- Protected allocation status.
- Refund status.
- Dispute status.

Seller pages display:

- Held balances.
- Scheduled releases.
- Transfers in progress.
- Paid, refunded, disputed, and recovery balances.
- Provider onboarding and suspension remediation.

Operator controls display:

- Provider health and suspension.
- Seller capability failures.
- Reconciliation cases.
- Webhook registration and delivery health.
- Release queue.
- Payout failures.
- Refunds.
- Disputes.
- Recovery cases.

## 10. Protected Allocation, Release, Refund, and Dispute Rules

### Release

- Verified payment creates held seller allocations.
- Only carrier-verified delivery or buyer confirmation sets `delivery_verified_at`.
- Seller-entered delivery status cannot start release.
- Default release is delivery verification plus 48 hours.
- Buyer confirmation may schedule earlier release.
- Disputes atomically block affected allocations.
- Multi-seller allocations release independently only when the provider supports it.
- Release jobs recheck provider, seller, dispute, refund, delivery, chargeback, capability, and deadline status.

### Refunds

- Before capture: cancel and release inventory.
- Captured but unreleased: refund without seller payout.
- Released: reverse the transfer before refund when supported.
- Failed reversal creates an operator recovery case.
- Partial seller refunds require verified provider support.
- Refunds remain pending until provider verification.

### Disputes

- Marketplace disputes and provider chargebacks remain separate but linked.
- Operators can resolve for buyer, seller, or a defined split.
- Every submission, evidence item, decision, release, refund, reversal, and recovery action is audited.

## 11. Controlled Implementation Phases

Every phase must:

1. Implement only its defined scope.
2. Inspect integrations and compatibility behavior.
3. Run relevant tests and static checks.
4. Fix all introduced issues.
5. Review the exact diff.
6. Update `PLAN.md` with evidence.
7. Stage only phase-related files.
8. Create one dedicated commit.
9. Proceed only after the commit succeeds.

The repository currently has no lint script. No lint completion will be claimed unless lint tooling is introduced separately.

### Phase 0 — Plan and inert guards

- Add the repository `PLAN.md`, `.env.example`, activation guide, operations runbook, and state documentation.
- Add strict configuration schemas.
- Keep every real provider disabled.

Gate: configuration tests, environment-readiness test, TypeScript check, review, commit.

### Phase 1 — Commerce persistence

- Persist products, carts, orders, order items, history, and reservations.
- Preserve APIs and product data.
- Add inventory locking and expiration.

Gate: migrations, repository tests, restart, overselling, catalog regression, marketplace tests, review, commit.

### Phase 2 — Payment persistence

- Add payment, provider-call, reconciliation, provider config, seller account, webhook, idempotency, job, ledger, and recovery records.
- Add independent state-machine constraints.

Gate:

- Migration and rollback/cutover tests.
- Financial/provider-call/reconciliation state-separation tests.
- Job lease and idempotency tests.
- Verify `providerCallStatus = started` is committed before external execution.
- Verify unpersisted provider results are inferred rather than stored.
- Review and commit.

### Phase 3 — Provider-neutral core and mock

- Add provider registry, pricing, eligibility, payment, capability, suspension, and mock services.
- Add verified multi-seller capability models.
- Add deterministic failure and recovery scenarios.

Gate: adapter contracts, capability expiry, automatic suspension, state transitions, ambiguous outcomes, production mock isolation, review, commit.

### Phase 4 — Checkout API migration

- Add authoritative quotes, intents, reservations, outbox calls, and normalized next actions.
- Implement commit-before-provider-call.
- Implement separate short provider-response persistence.
- Preserve legacy endpoints.

Gate:

- Total and currency tampering.
- Duplicate checkout.
- Inventory concurrency.
- Provider-call transaction boundaries.
- Crash before/during/after provider calls.
- Provider success followed by database failure.
- Inferred reconciliation.
- Review and commit.

### Phase 5 — Webhooks and reconciliation

- Add strict provider routing.
- Add provider-specific raw-body limits and verification.
- Add event deduplication and reconciliation workers.

Gate:

- Unknown provider rejection.
- Body limits and raw-body integrity.
- Invalid signatures and replay rejection.
- Prove invalid traffic does not suspend providers.
- Prove abusive traffic does not suspend providers.
- Trusted provider delivery failure suspension.
- Invalid registered configuration suspension.
- Confirmed expected-event-gap suspension.
- Authentication-failure suspension.
- Lost webhook and multi-worker reconciliation.
- Review and commit.

### Phase 6 — Frontend checkout and results

- Replace checkout provider branches with normalized orchestration.
- Add selection, review, processing, success, failure, cancellation, and retry pages.
- Use mock provider only.

Gate: lifecycle browser flows, refresh, duplicate submission, browser navigation, accessibility, regression tests, review, commit.

### Phase 7A — Stripe sandbox adapter

- Implement Stripe adapter, capability refresh, webhook verification, reconciliation, refunds, and transfer primitives.
- Keep checkout disabled until platform responsibilities are verified.

Gate: sandbox contracts, webhook tests, capability tests, disabled-eligibility assertion, review, commit.

### Phase 7B — PayPal sandbox adapter

- Implement Multiparty Checkout and delayed disbursement.
- Enforce the 28-day window.
- Add seller capability refresh.

Gate: sandbox lifecycle, seller onboarding, deadline boundaries, reconciliation, review, commit.

### Phase 7C — Razorpay sandbox adapter

- Implement Razorpay payment and Route primitives.
- Enforce INR-only eligibility.
- Add linked-account and compliance refresh.

Gate:

- INR acceptance and GBP rejection.
- Seller KYC and linked-account suspension.
- Financial-turnover eligibility.
- Payer-payee transparency approval.
- Route compliance submission and approval.
- Stale review and expired approval suspension.
- Controlled recovery after re-verification.
- Webhook signature and reconciliation.
- Review and commit.

### Phase 8 — Seller onboarding

- Add provider-hosted onboarding.
- Add capability, suspension, and remediation UI.
- Do not add payout execution.

Gate: ownership, onboarding return, KYC suspension, stale capability, cross-seller isolation, review, commit.

### Phase 9 — Protected allocations and payouts

- Add held allocations, verified delivery, scheduled releases, provider transfers, payout failures, and operator recovery.
- Do not add refunds or disputes.

Gate: release timing, races, provider limits, independent-release capability, ledger, payout recovery, review, commit.

### Phase 10 — Refunds and reversals

- Add full and partial refunds.
- Enforce provider partial-refund capability.
- Add transfer reversal and recovery.

Gate: pre/post-release refunds, unsupported partial refund, reversal failure, duplicate refund, ledger, review, commit.

### Phase 11 — Marketplace disputes

- Add buyer disputes, evidence, allocation blocking, operator review, and resolutions.
- Keep provider chargebacks separate.

Gate: release boundary races, authorization, evidence auditing, split resolution, provider deadlines, review, commit.

### Phase 12 — Histories and dashboards

- Add buyer transactions.
- Add seller balances and payout history.
- Add operator health, reconciliation, refund, dispute, payout, and recovery controls.

Gate: authorization isolation, pagination, derived balances, accessibility, dashboard regression, review, commit.

### Phase 13 — Hardening and activation

- Add CSP, rate controls, redaction, metrics, retention, alerts, and recovery drills.
- Validate real webhook registrations.
- Activate providers individually only after external approvals.

Gate: production-readiness review, complete payment and marketplace suites, security checks, TypeScript check, production build, final plan update, commit.

## 12. Test Requirements

Coverage must include:

- No provider call inside an open database transaction.
- Separate financial, provider-call, and reconciliation states.
- `providerCallStatus = started` committed before provider execution.
- Inferred unpersisted-provider-result recovery.
- Provider success followed by local persistence failure.
- Crashes before, during, and after provider creation.
- Deterministic idempotency.
- Duplicate and conflicting checkout requests.
- Provider and seller capability expiry.
- Automatic suspension and controlled recovery.
- Multi-seller and allocation limits.
- Unsupported partial refunds and independent releases.
- Unknown webhook providers.
- Provider-specific body limits.
- Raw-body verification.
- Invalid signatures, malformed requests, and replay attacks.
- Invalid webhook traffic never independently suspends a provider.
- Trusted delivery, configuration, authentication, and expected-event evidence can suspend a provider.
- PayPal 28-day limits.
- Razorpay INR-only behavior.
- Razorpay turnover, payer-payee, submission, approval, review, and expiry checks.
- Stripe disabled until responsibility verification.
- Compatibility behavior for existing APIs.
- Per-phase regression checks and clean commit boundaries.

## 13. Production Activation Requirements

A provider becomes live only after:

1. Legal entity and payment-responsibility review.
2. Platform business verification and KYC.
3. Provider product approval.
4. Seller onboarding and KYC.
5. Country and currency capability verification.
6. Multi-seller limit verification.
7. Webhook registration and trusted health verification.
8. Production secrets stored in the deployment secret manager.
9. Reconciliation against provider dashboards.
10. Operator activation of the server-side flag.
11. Controlled monitoring after activation.

Features remaining disabled:

- Stripe until Connect, platform-country, payment-responsibility, and liability approval.
- PayPal delayed disbursement until partner approval and seller onboarding.
- Razorpay Route until Indian KYC, Route approval, linked-account verification, turnover eligibility, payer-payee approval, and current compliance review.
- Live webhooks until production registration is verified.
- India checkout until tax requirements are approved.
- Legal escrow wording until legal approval.
- Non-zero platform fees until separately approved.

## Final Deliverables

The completed implementation report must contain:

- Architecture corrections.
- Migrations and changed files.
- Per-phase commit identifiers.
- APIs and compatibility adapters.
- Frontend and backend flows.
- Provider and seller suspension behavior.
- Verified multi-seller limits and sources.
- Tests completed per phase.
- Provider-specific restrictions.
- Remaining approvals, KYC, tax, legal, webhook, and production tasks.
- Features still disabled and their unmet conditions.
- Confirmation that unrelated image changes were excluded.

## Final Revision Summary

- **State separation:** financial payment status, technical provider-call status, and reconciliation status are independent. An unpersisted provider result is inferred from a started call with an expired lease and no stored result.
- **Razorpay compliance:** Route eligibility now requires verified financial turnover, an approved payer-payee transparency declaration, approved compliance submission, and current review/expiry dates.
- **Webhook suspension safety:** invalid or abusive inbound webhook traffic is rejected and alerted on but cannot independently suspend a provider; suspension requires trusted operational evidence.

No implementation files or unrelated plan sections are changed by this final planning revision.
