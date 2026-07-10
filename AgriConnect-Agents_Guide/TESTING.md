# AgriConnect Testing and Verification Guide

**Status:** Project-wide verification policy  
**Important:** This document defines how validation should be designed. It does not grant Codex permission to execute commands.

## 1. Purpose

AgriConnect requires reliable validation because it includes identity, role-based workflows, marketplace behavior, user data, and potentially financial or logistics operations.

Testing must provide useful evidence without consuming unnecessary execution or AI usage limits.

The active root `AGENTS.md` controls what Codex may execute. Unless the user explicitly authorizes commands, Codex performs focused static review and, when available, a focused browser check on an already-running local server.

## 2. Permission Boundary

Unless the user explicitly requests it, Codex must not run:

- development or production servers
- production builds or preview builds
- lint commands
- type-check commands
- unit or integration tests
- Playwright, Cypress, Selenium, or other E2E suites
- broad route sweeps
- CI/CD workflows
- Docker or container commands
- dependency installation or updates
- database migrations or seeds
- deployment commands
- performance, load, or security scanners

The existence of a script does not grant permission to run it.

## 3. Default Verification Workflow

For a normal implementation or bug fix, Codex should:

1. Inspect the requested feature and directly related code.
2. Trace the relevant data and control flow.
3. Compare with existing repository patterns.
4. Implement the smallest correct change.
5. Review the focused diff.
6. Check imports, exports, routes, types, schemas, and references statically.
7. Use an already-running browser only for the exact changed behavior when available.
8. Report what was and was not verified.

Static review is useful evidence but is not equivalent to runtime validation.

## 4. Verification Status Language

Use only accurate labels:

### Implemented

The requested code change was made.

### Statically reviewed

The relevant code, references, and diff were inspected without executing the application or validation commands.

### Browser verified

The exact changed behavior was successfully exercised in a browser.

### Browser verification incomplete

The browser could not access or complete the focused check, or the result was ambiguous.

### User-run validation required

The user must run build, lint, type checking, tests, migrations, deployment, or other commands not authorized for Codex.

Never say “all tests passed,” “production-ready,” “fully verified,” or “no regressions” without corresponding evidence.

## 5. Focused Browser Verification

Use the in-app browser or approved browser integration only when:

- a local server is already running
- the relevant route is known
- the exact changed feature can be checked directly
- the action is non-destructive or uses safe local data

A focused check may verify:

- the relevant page loads
- the changed component appears
- the changed interaction works
- expected navigation occurs
- expected title or metadata appears
- no new related console or request error is visible

Do not:

- perform broad application sweeps
- navigate every route
- test unrelated features
- repeatedly retry the same failing evaluation
- treat a browser timeout as application success
- automatically switch to Playwright after an in-app browser timeout

## 6. Browser Timeout Policy

When a focused browser check times out:

1. Identify whether the failure occurred during browser evaluation, navigation, application rendering, a request, or an assertion when that information is available.
2. Retry once only if a narrower, clearly different check can isolate the problem.
3. Stop after the repeated timeout.
4. Review the affected code statically.
5. Report the exact error and verification limitation.
6. Provide the smallest manual check for the user.

Do not increase timeouts or add arbitrary waits merely to force a pass.

## 7. Playwright Policy

Playwright is the preferred automated E2E framework when the user explicitly authorizes E2E execution.

Playwright must not be used automatically as a fallback for an in-app browser timeout.

When execution is authorized:

- use one isolated test per route, feature, or user flow
- avoid a single broad multi-route test
- ensure one failure does not prevent unrelated tests from running
- begin with Chromium and one worker for stability
- run against the approved environment, preferably a production preview for release validation
- use `domcontentloaded` or a targeted readiness condition rather than defaulting to `networkidle`
- wait for specific user-visible or application state
- avoid arbitrary `waitForTimeout` sleeps
- capture trace, screenshot, console errors, page errors, and failed requests on failure
- run the smallest failing test independently before the full suite

## 8. Test Layers

Use the smallest layer that can prove the behavior.

### Static and compile-time checks

Suitable for:

- imports and exports
- route and configuration references
- type contracts
- schema consistency
- translation-key references
- dead code and lint rules

Execution still requires explicit permission.

### Unit tests

Suitable for:

- pure calculations
- validators
- formatters and unit conversions
- permission policies
- status-transition rules
- reducers and deterministic hooks
- fee or total calculations

### Integration tests

Suitable for:

- service and repository behavior
- API validation and authorization
- transaction behavior
- database constraints
- provider adapters with controlled test doubles
- webhooks and idempotency
- background jobs

### Component tests

Suitable for:

- form states
- accessibility behavior
- conditional role-aware UI
- loading, empty, and error states
- interaction logic that does not need a full browser flow

### E2E tests

Reserve for critical user journeys and browser integration:

- sign-up, login, OTP, OAuth, logout, and session expiry
- role and organization switching where implemented
- listing creation and publication
- search and discovery
- order or enquiry creation
- payment confirmation where safely testable
- logistics state updates
- storefront purchase flow
- critical administrative workflows

Do not use E2E for every small conditional branch.

## 9. Critical Test Invariants

Validation should cover, where relevant:

- unauthorized access is denied
- one user cannot access another user's private resource
- organization scope is enforced
- invalid input is rejected
- duplicate requests do not create duplicate critical effects
- unsupported state transitions fail
- authoritative totals are calculated server-side
- inventory cannot become negative
- failed provider actions do not return fake success
- secrets are not exposed
- localized UI preserves meaning
- accessibility remains usable
- errors are actionable and non-sensitive

## 10. Authentication Testing

When authorized, cover:

- valid and invalid login
- account status restrictions
- OTP generation, expiry, attempt limit, replay prevention, and single use
- OAuth state and account linking behavior
- session renewal and logout
- protected-route access
- authorization after role or organization changes
- API-key creation, scope, use, rotation, and revocation where implemented

Never use real production credentials or send uncontrolled messages to real users.

## 11. Marketplace and Order Testing

When authorized, cover relevant workflows for:

- listing ownership
- publication eligibility
- price and unit display
- quantity and inventory rules
- role-specific access
- order term preservation
- idempotent order creation
- allowed and rejected status transitions
- cancellation, dispute, return, and refund rules where implemented
- private data visibility

Use deterministic fixtures and avoid modifying production data.

## 12. Payment and Webhook Testing

Use provider-supported test or sandbox environments only.

Cover:

- amount and currency verification
- provider failure and timeout
- authenticated webhook processing
- duplicate webhook delivery
- out-of-order events
- payment-state reconciliation
- refund limits
- authorization for financial actions

Client-side success alone must never satisfy a payment test.

## 13. Logistics Testing

Where implemented, cover:

- serviceability
- valid and invalid status transitions
- authorized actors
- pickup and delivery evidence access
- duplicate tracking events
- order, payment, and logistics state separation
- privacy of address and precise location

## 14. Internationalization Testing

Cover supported locales for:

- translation presence
- pluralization
- text expansion
- dates and time zones
- currency and number formatting
- agricultural units
- right-to-left behavior where supported
- route metadata
- validation and error messages

Do not treat fallback English as complete multilingual coverage unless the approved policy explicitly permits it.

## 15. Accessibility Testing

Use both automated checks and manual keyboard or screen-reader-oriented review for critical journeys when authorized.

Verify:

- labels and accessible names
- heading hierarchy
- keyboard order
- visible focus
- dialog focus trapping and restoration
- error announcements
- contrast
- touch targets
- reduced motion
- semantic tables and forms

Automated accessibility scans do not prove full accessibility.

## 16. Browser and Device Coverage

Do not run a large browser matrix by default.

For user-authorized release validation, prioritize based on supported users and analytics. A practical starting point may include:

- Chromium desktop
- one representative mobile viewport
- additional browsers only when required by product support or a known compatibility risk

Keep browser coverage separate from broad route coverage to avoid one oversized suite.

## 17. Route and Metadata Coverage

Use static or unit tests for broad metadata rules such as:

- every configured public route has a title
- titles are nonempty
- descriptions exist where required
- canonical paths are valid
- duplicate metadata is detected where prohibited

Use browser tests only for important runtime metadata behavior. Create one isolated test per route when browser coverage is necessary.

## 18. Test Data

- Never use production personal or financial data.
- Use synthetic, deterministic fixtures.
- Keep role and ownership relationships explicit.
- Avoid shared mutable data between tests.
- Clean up safely through the established test strategy.
- Do not depend on execution order.
- Do not send real SMS, email, payment, or external-provider actions from local tests.

## 19. Flaky Test Policy

A flaky test is a defect.

Do not:

- add excessive retries
- add arbitrary sleeps
- loosen assertions until the test passes
- skip without documenting the cause
- make tests depend on prior tests

Investigate:

- unstable selectors
- shared state
- asynchronous readiness
- network dependence
- clock or timezone dependence
- race conditions
- inadequate isolation
- overloaded local server

## 20. Selectors

Prefer selectors that represent user intent and accessibility:

1. role and accessible name
2. label
3. visible text when stable
4. explicit test identifier when needed

Avoid brittle selectors based on DOM depth, generated classes, or styling structure.

## 21. Mocking and Test Doubles

- Mock only at a clear boundary.
- Preserve the real contract.
- Do not mock the behavior under test.
- Use integration or provider sandbox tests for critical contracts where available.
- Do not let mocks hide authorization, transaction, or serialization defects.
- Never use mock success as production fallback behavior.

## 22. Performance and Load Validation

Run only with explicit permission and a defined environment.

Prioritize critical scenarios such as:

- public catalog and search
- authenticated dashboard loading
- listing creation
- order creation
- webhook ingestion
- notification or job queues
- AI endpoints with cost limits

Define success criteria before running. Do not load-test a shared or production environment without explicit authorization.

## 23. Security Validation

Security testing requires explicit permission.

Potential authorized checks include:

- dependency audit
- static analysis
- secret scanning
- authorization tests
- input and upload tests
- rate-limit behavior
- CSRF and CORS validation
- webhook signature tests
- safe dynamic scanning in an approved environment

Do not perform intrusive scanning or exploit testing without explicit scope.

## 24. User-Run Release Gate

A complete release gate may include the following, executed by the user or by Codex only when explicitly authorized:

1. dependency integrity check as appropriate
2. lint
3. type checking
4. unit tests
5. integration tests
6. production build
7. focused smoke tests
8. authorized critical E2E tests
9. migration validation where applicable
10. deployment and post-deployment health checks

The exact commands must come from the repository. Do not invent command names.

## 25. Failure Reporting

For every failed check, report:

- command or browser action
- affected test, route, or feature
- exact error
- likely layer of failure
- evidence collected
- change made, if any
- remaining uncertainty

Do not hide failures in a success summary.

## 26. Final Task Report

After a normal Codex task, report:

1. What was implemented or fixed.
2. Files changed.
3. Static checks performed.
4. Focused browser checks performed, if any.
5. What passed or failed.
6. Commands not run because permission was not granted.
7. Remaining risk or smallest manual check required.

## 27. Prohibited Verification Shortcuts

Never:

- claim success without evidence
- run broad sweeps by default
- switch tools automatically after a timeout
- add large timeouts to hide hangs
- add retries to hide flakiness
- weaken assertions
- suppress console or application errors
- skip required scenarios without disclosure
- use production user data
- treat static review as end-to-end verification
