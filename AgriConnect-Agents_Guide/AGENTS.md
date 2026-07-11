# AGENTS.md — Production-Grade AI Engineering Rules

**Version:** 2.1  
**Scope:** Global rules for Codex Desktop and AI-assisted development  
**Target:** Production-grade, scalable SaaS applications
always apply and implement features in smaller patches and edits and verify also in the same way in order to not get stucked in long big code file or hit the sandbox timeout error issue.
## 1. Mission

- Implement or fix only what the user explicitly requests.
- Build maintainable, secure, production-quality code.
- Preserve the repository's existing architecture and conventions.
- Minimize regressions, technical debt, unnecessary work, and usage consumption.
- Prefer the smallest correct change over broad refactoring.

## 2. Instruction Priority

Follow instructions in this order:

1. The user's current request.
2. This `AGENTS.md` file.
3. Existing repository conventions and documentation.
4. General engineering best practices.
Before coding, check whether this feature is frontend-only or requires backend alignment. If backend seed data, APIs, validation, enums, permissions, or database values are involved, update them safely within this feature scope. Do not make frontend-only changes that will conflict with backend behavior. Do not touch unrelated backend/auth/payment/order logic.
Do not expand the task beyond the requested scope.

## 3. Windows Shell Requirements

- Use Windows PowerShell 5.1 only when terminal access is required.
- Use this executable:
  `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`
- When invoking PowerShell explicitly, use:
  `powershell.exe -NoProfile -Command "<command>"`
- Use Windows-style paths and PowerShell-compatible syntax.
- Do not use `pwsh.exe`, Command Prompt, Git Bash, WSL, Bash, or Linux commands.
- Do not run a mandatory environment preflight before every task.
- Run only the minimum lightweight commands needed to inspect or edit the requested code.
- If PowerShell, permissions, sandbox access, or the working directory blocks the task, stop the affected action and report the exact error. Do not repeatedly retry the same failing command.

## 4. Default Permission Boundary

Unless the user explicitly authorizes it, do **not** run:

- `npm run build` or any production build
- development or production preview servers
- lint commands
- type-checking commands
- unit or integration tests
- Playwright, Cypress, Selenium, or other E2E test suites
- broad route or application sweeps
- CI/CD workflows
- Docker, container, or mobile builds
- deployment commands
- dependency installation, removal, or updates
- database migrations or seed commands
- benchmarking or performance profiling
- large code-generation tasks
- other resource-intensive commands that consume significant execution or usage limits

The user will run these commands locally unless they explicitly ask Codex to run them.

If the user provides build, lint, type-check, test, or deployment errors, diagnose those exact outputs and fix the underlying code without rerunning the command unless permission is given.

## 5. Allowed Lightweight Repository Work

Codex may use lightweight, targeted operations required to complete the request, including:

- reading relevant files
- searching the repository for related code
- inspecting imports, exports, routes, references, and configuration
- editing existing files within the requested scope
- reviewing the resulting diff
- checking Git status or diff without committing

Avoid repository-wide scans when a narrower search is sufficient.

## 6. File Creation, Deletion, and Renaming

By default:

- Edit existing files only.
- Do not create files.
- Do not delete files.
- Do not rename or move files.
- Do not reorganize folders.

Create, delete, rename, or move a file only when the user explicitly requests or authorizes that action.

If a requested implementation genuinely requires a new file, then only create it.

do not updated any the roadmap_status file , its for my understanding alone , we will update at the end , once we implement all the 113 features end-to-end

Global frontend-backend alignment rule for the full 20-day AgriConnect sprint:

For every feature in the 20-day roadmap, do not update frontend UI/data/config alone if that feature also depends on backend data, API validation, seed data, enums, database values, server-side permissions, or business rules.

Before implementing each feature batch:
1. Inspect the frontend files involved.
2. Inspect whether matching backend logic/data exists.
3. Check APIs, validation schemas, seed files, enums/constants, DTOs/types, database references, and shared config.
4. Decide whether the feature is frontend-only or requires backend alignment.

If backend alignment is required:
- Update only the related backend data/config/API validation needed for that feature.
- Keep the change within the current feature scope.
- Preserve existing IDs, slugs, routes, API contracts, database values, and user data.
- Do not rename/delete existing values unless backward-compatible aliases or mappings are added.
- Keep seed scripts idempotent and avoid duplicate records.
- Do not change database schema unless absolutely necessary and explicitly explained first.
- Do not change auth, payment, cart, checkout, order, or unrelated backend logic unless the current feature specifically requires it.
- If the backend change is risky or could break existing data, stop and explain before implementing.

If the feature is frontend-only:
- Do not touch backend files.
- Do not create unnecessary backend changes.


This rule applies to all 20-day roadmap features, including:
- legal/static pages
- SEO/cookie/manifest
- navigation/UI
- taxonomy/categories
- product listing/display
- search/filter/map
- favorites/profile
- verification badges/profile completion
- orders/cart/checkout
- dashboards/logistics/email
- security/compliance/testing

Do not implement frontend and backend inconsistently.

## 7. Planning Before Coding

Before editing:

- Understand the requested behavior or reported issue.
- Read the directly affected files.
- Identify the root cause or required integration point.
- Inspect similar existing implementations.
- Identify dependencies and potential side effects.
- Consider relevant edge cases and failure modes.
- Choose the smallest maintainable solution.

Do not start changing code based on assumptions that can be resolved by inspecting the repository.

## 8. Repository Inspection Rules

- Read relevant code before modifying it.
- Reuse existing components, hooks, utilities, services, schemas, and patterns.
- Inspect imports and dependency flow.
- Confirm filenames, paths, route definitions, API contracts, and configuration keys.
- Do not invent APIs, environment variables, database fields, file structures, or project conventions.
- Do not inspect unrelated areas of the repository without a clear reason.

## 9. Minimal Change Principle

- Make the smallest change necessary to solve the requested problem.
- Do not refactor unrelated code.
- Do not perform formatting-only changes outside the affected lines.
- Do not rename unrelated variables, files, components, or functions.
- Do not replace working architecture with a new pattern.
- Keep the diff focused and easy to review.

## 10. Architecture Preservation

- Follow existing architectural and domain patterns.
- Respect module and dependency boundaries.
- Keep business logic out of presentation-only components.
- Keep API logic out of UI rendering layers.
- Keep persistence logic inside the repository's established data layer.
- Prefer composition over inheritance.
- Do not introduce a new architectural pattern without an explicit need and user approval.

## 11. Core Engineering Principles

- Apply DRY where it removes meaningful duplication.
- Apply SOLID where appropriate without overengineering.
- Keep implementations simple and explicit.
- Build only what the task requires.
- Separate concerns.
- Prefer readable code over clever code.
- Prefer early returns over deep nesting.
- Keep functions focused on one responsibility.

## 12. Single-Logic and Fallback Policy

Each feature must have one authoritative implementation path.

Do not add alternate or silent fallback logic for features such as:

- Google authentication
- mobile OTP authentication
- API-key access
- payments or billing
- data fetching
- multilingual content
- file storage
- notifications
- permissions
- configuration

Do not silently switch providers, use mock values, return fake success responses, load placeholder data, bypass validation, or duplicate the same feature using a second logic path.

Error handling is not fallback logic. When the authoritative path fails:

- fail safely
- preserve data integrity
- show or return a clear error
- log only safe diagnostic information where the project already supports logging
- do not pretend the operation succeeded

Add fallback behavior only when the user explicitly requests and approves it. Reuse any existing centralized project behavior instead of inventing a new fallback.

## 13. Code Quality Standards

- Write clean, readable, maintainable code.
- Use descriptive names.
- Remove code made obsolete by the requested change when safe and within scope.
- Remove unused imports introduced or exposed by the change.
- Do not leave debugging statements, temporary flags, commented-out experiments, or placeholder code.
- Avoid generic names such as `foo`, `bar`, `temp`, `data`, or `value1` when a domain-specific name is available.

## 14. Error Handling

Handle relevant failures explicitly, including:

- invalid input
- null or undefined values
- network failures
- API failures
- authorization or permission failures
- database failures
- timeouts
- missing configuration

Never:

- swallow exceptions
- return ambiguous success states
- expose secrets or internal stack traces to end users
- suppress errors merely to make the feature appear functional

## 15. Logging and Observability

Use the repository's existing logging and observability conventions.

Where applicable, use:

- structured logs
- metrics
- tracing
- health checks
- correlation IDs

Never log:

- passwords
- OTP values
- access or refresh tokens
- API keys
- secrets
- unnecessary personal data

Do not introduce a new observability system unless requested.

## 16. Security Requirements

- Validate all external input.
- Sanitize user-generated content where appropriate.
- Encode output correctly for its context.
- Enforce authentication and authorization.
- Apply least-privilege access.
- Keep secrets in environment configuration.
- Protect against SQL injection, XSS, CSRF, and related risks where applicable.
- Apply rate limiting where the existing architecture supports it and the feature requires it.
- Follow established OWASP practices.

Never:

- hardcode credentials or secrets
- commit secrets
- weaken validation or authorization to make a test pass
- expose sensitive internal details

## 17. Performance and Scalability

Use performance techniques only when relevant to the requested change.

Prefer where beneficial:

- pagination
- lazy loading
- code splitting
- memoization
- debouncing or throttling
- efficient queries
- batching
- caching through the existing cache strategy

Avoid:

- unnecessary rerenders
- repeated API calls
- N+1 queries
- blocking operations
- avoidable bundle growth
- speculative optimization unrelated to the task

## 18. Database Rules

- Use the project's existing database access patterns.
- Validate inputs.
- Preserve referential integrity.
- Handle transactions safely.
- Avoid duplicate records.
- Avoid unnecessary joins and large-table locks.
- Do not change schemas, execute migrations, seed data, or modify production data without explicit authorization.
- Require explicit confirmation before destructive database operations.

## 19. API Standards

- Follow the project's existing API conventions.
- Validate request input.
- Use consistent response structures.
- Return appropriate HTTP status codes.
- Return meaningful, non-sensitive error messages.
- Preserve backward compatibility unless the user explicitly requests a breaking change.
- Support idempotency where the operation requires it.

## 20. Frontend Standards

Components should be:

- focused
- reusable where reuse is real
- responsive
- accessible
- consistent with the existing design system
- easy to test

Extract reusable logic into existing hooks or utilities when appropriate. Avoid creating monolithic components or introducing a new UI pattern unnecessarily.

## 21. Forms and Validation

Where applicable, forms must include:

- client-side validation
- server-side validation handling
- loading state
- disabled state during submission
- error feedback
- success feedback
- prevention of accidental duplicate submission

Do not treat client-side validation as a security boundary.

## 22. Accessibility

Preserve or improve:

- semantic HTML
- keyboard navigation
- focus management
- accessible labels
- ARIA usage only where needed
- color contrast
- screen-reader compatibility

Do not remove accessible behavior to simplify an implementation.

## 23. Internationalization

- Do not hardcode new user-facing text when the project uses translation utilities.
- Use the existing translation keys and utilities consistently.
- Do not create a separate translation path or duplicate localization logic.
- Do not add hardcoded fallback strings unless the user explicitly requests them or the existing i18n architecture requires them.

## 24. State Management

Use the simplest existing state mechanism appropriate for the scope:

1. local component state
2. existing context
3. existing global store

Do not introduce new global state or a new state-management library without explicit approval.

## 25. Dependencies

Do not add, remove, or update dependencies unless the user explicitly authorizes it.

When authorization is given:

- confirm the functionality is not already available
- prefer mature, maintained packages
- minimize dependency count
- avoid abandoned or unnecessarily large packages
- document why the dependency is required

## 26. Refactoring Rules

- Refactor only when needed to implement the requested fix safely.
- Preserve existing behavior outside the requested scope.
- Reduce complexity rather than moving it elsewhere.
- Avoid broad rewrites.
- Do not combine an unrelated refactor with a feature or bug fix.

## 27. Focused Browser Verification

After implementation, perform only focused browser verification for the exact feature or route changed, and only when an accessible local server is already running.

Do not start a server unless the user explicitly authorizes it.

For focused verification:

- open only the relevant route
- verify only the changed component, interaction, navigation, title, metadata, or visible result
- use small, separate browser actions
- check for new console or page errors related to the change when the browser tool exposes them
- avoid broad multi-route sweeps
- avoid one large browser evaluation containing many checks
- avoid repeatedly navigating through unrelated pages

Browser plugin / in-app browser for  browser-based End-to-End Testing and verification of the implemented features.

Default: Built-in browser for focused localhost feature verification.

Use external Chrome only when the feature requires:
- an existing signed-in session
- Google authentication
- third-party services
- real browser cookies/profile state
- file uploads
- reproduction of a Chrome-specific issue

Do not depend on the Codex Chrome plugin for your release gate. Use:

Codex in-app Browser for quick visual inspection.
Playwright through the terminal for reliable frontend/backend E2E testing.
Route-by-route Playwright tests instead of one large combined browser run.

## 28. Browser Timeout and Failure Handling

If browser verification times out or cannot access the page:

1. Do not treat the timeout alone as proof that the application is broken.
2. Reduce the verification to one route and one expected result.
3. Retry the focused action at most once when a retry is reasonable.
4. Do not repeat the same broad sweep.
5. Do not automatically switch to Playwright or another test runner.
6. Inspect the affected implementation statically for clear code-level issues.
7. Report the exact browser error and the point where verification stopped.
8. Mark runtime verification as incomplete.
9. Provide the smallest manual check the user can perform.

Never claim that a feature works in the browser when browser verification did not complete successfully.


For browser verification, always test the application in small route-by-route and flow-by-flow checks.

Do not run one large combined browser pass. Verify each route independently, record the result immediately, and continue to the next route so a single browser-tool failure does not erase the full verification progress.

For every route:

* Open the route separately.
* Verify page load, UI, console, network requests, and key interactions.
* Save the result before moving forward.
* Retry only the failed route.
* Keep successful route results.
* At the end, provide a complete pass/fail/partial report for all routes.

Never restart the entire verification because one route or browser action fails.


## 29. Playwright and E2E Policy

Do not run Playwright or any E2E suite unless the user explicitly requests it.

When the user explicitly authorizes Playwright:

- test against the environment specified by the user
- create isolated tests per route, feature, or user flow
- do not place a broad route sweep inside one test
- prefer `domcontentloaded` plus specific assertions over `networkidle`
- do not use arbitrary sleeps
- begin with one worker when diagnosing instability
- capture useful failure diagnostics
- ensure one failed route does not prevent unrelated tests from running
- do not hide failures with excessive timeouts, retries, skipped tests, or weak assertions

Do not modify test infrastructure unless the user requests it.

## 30. Static Verification When Commands Are Not Authorized

Perform targeted code inspection, including where relevant:

- syntax and structural consistency
- imports and exports
- route references
- filenames and paths
- component props
- state transitions
- event handlers
- API calls and response handling
- configuration references
- translation usage
- accessibility behavior
- consistency with nearby existing patterns
- unintended unrelated modifications

Static inspection is not equivalent to a successful build, test, or browser run. State the verification level accurately.

## 31. Bug-Fix Workflow

For bug fixes:

1. Identify the root cause.
2. Confirm the affected code path.
3. Apply the smallest root-cause fix.
4. Preserve unrelated behavior.
5. Add a safeguard only when it fits the existing implementation and does not create a second logic path.
6. Review the affected workflow statically.
7. Perform focused browser verification when available and authorized by this policy.
8. Report what was and was not verified.

## 32. Feature-Implementation Workflow

For requested features:

1. Inspect the existing implementation and patterns.
2. Define the smallest required change.
3. Edit only existing files unless file creation is explicitly authorized.
4. Preserve security, accessibility, responsiveness, and i18n conventions.
5. Review the diff.
6. Perform focused browser verification when possible.
7. Do not run broad validation commands without explicit permission.

## 33. Production Safety

Require explicit user confirmation before destructive or high-risk changes involving:

- databases
- authentication
- authorization
- billing or payments
- production configuration
- user data
- infrastructure
- deployments
- secret rotation

Prefer backward-compatible changes. Do not perform destructive actions merely because they appear necessary.

## 34. Git and Source Control

Unless explicitly requested:

- do not create or switch branches
- do not commit
- do not push
- do not open pull requests
- do not reset, revert, force-push, or rewrite history
- do not discard user changes

Codex may inspect `git status` and `git diff` to review its work.

## 35. Documentation

Update an existing documentation file only when:

- the user requests it, or
- the requested code change makes the existing documentation materially incorrect and the required file already exists

Do not create new documentation files without explicit permission.

Do not claim documentation was updated when it was not required or changed.

## 36. Self-Review Checklist

Before completing the task, review only what can be established without prohibited commands:

- requested behavior is implemented
- root cause is addressed where applicable
- diff is limited to relevant existing files
- architecture and naming remain consistent
- no obvious unused imports or dead code were introduced
- no debugging statements or temporary code remain
- error handling is explicit
- no fallback or duplicate logic was introduced
- security-sensitive behavior was not weakened
- responsive, accessible, and translated behavior was preserved where relevant
- browser verification result is reported accurately
- unrun build, lint, type-check, and test commands are clearly disclosed

Do not state “no TypeScript errors,” “no lint errors,” “all tests pass,” or “production-ready confirmed” unless the relevant command was explicitly authorized and completed successfully.

## 37. Definition of Done

A task may be reported complete when:

- the requested implementation or fix is logically complete
- the relevant existing files were reviewed
- the final diff is focused
- static inspection found no clear issue in the changed path
- focused browser verification passed, or its inability to run is explicitly disclosed
- prohibited commands were not run without permission
- remaining risks and user-run checks are clearly stated

Use accurate status labels:

- **Implemented** — code changes are complete.
- **Statically reviewed** — affected code was inspected, but commands were not run.
- **Browser verified** — the focused browser check completed successfully.
- **Browser verification incomplete** — the browser timed out, failed, or was unavailable.
- **Not build/test verified** — build, lint, type-check, or test commands were not authorized.

Do not claim full production readiness or absence of regressions without the appropriate release checks.

## 38. Final Response Format

After each task, report:

1. What was implemented or fixed.
2. Manual Steps to Verify the feature locally for the Developer.
3. The root cause, when applicable.
4. Existing files changed.
5. Focused browser checks performed.
6. What passed or failed.
7. Commands intentionally not run because permission was not granted.
8. Any remaining risk or smallest manual verification step.

Do not automatically recommend a broad build or test run as part of every response. Mention optional user-run release checks only when they are materially relevant.

---

**Enterprise SaaS Ready — v2.1**

This policy is optimized for focused Codex implementation, controlled execution usage, minimal repository changes, and honest verification reporting.