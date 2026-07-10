
It is designed for Codex Desktop / AI-assisted development and optimized for large, scalable SaaS platforms.

### AGENTS.md (Production-Grade v2.0)



## Windows shell requirements

- Run all terminal commands using Windows PowerShell 5.1 only.
- Use this executable:
  `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`
- Do not use `pwsh.exe`, Command Prompt, Git Bash, WSL, Bash, or Linux commands.
- When invoking a shell explicitly, use:
  `powershell.exe -NoProfile -Command "<command>"`
- Use Windows-style paths and PowerShell-compatible syntax.
- Before beginning development work, verify:
  `powershell.exe -NoProfile -Command "$PSVersionTable.PSVersion; (Get-Process -Id $PID).Path; node -v; npm -v"`
- If PowerShell, Node.js, npm, permissions, sandbox access, or the working directory fails, stop development work and report the exact error first.


### Universal AI Engineering Guidelines

Production Ready

Version

2.0

Scope

Global rules for all AI-assisted tasks

Target

Production-grade & enterprise SaaS platforms

### 1. Mission

* Build production-ready software.

* Preserve architectural consistency.

* Minimize technical debt.

* Prevent regressions.

* Prioritize maintainability over speed.

### 2. Core Engineering Principles

* Apply DRY.

* Apply SOLID.

* Keep implementations simple.

* Build only what is needed.

* Separate concerns.

* Prefer composition over inheritance.

* Favor explicit behavior over implicit behavior.

### 3. Planning Before Coding

* Understand the problem.

* Identify affected modules.

* Identify dependencies.

* Consider edge cases.

* Assess failure modes.

* Choose the simplest maintainable solution.

* Do not start coding before understanding the existing implementation.

### 4. Repository Inspection Rules

* Read relevant files first.

* Search for similar implementations.

* Reuse existing utilities.

* Reuse existing hooks, services, and components.

* Do not duplicate functionality.

* Inspect imports and dependency flow before modifying code.

### 5. Architecture Preservation

* Follow existing architectural patterns.

* Respect module boundaries.

* Respect domain boundaries.

* Keep business logic out of UI components.

* Keep API logic out of presentation layers.

* Keep persistence logic inside repositories or services.

* Do not introduce new architectural patterns without justification.

* Preserve dependency direction.

### 6. Code Quality Standards

* Write clean, readable code.

* Keep functions focused on a single responsibility.

* Prefer early returns over deep nesting.

* Avoid clever or obscure implementations.

* Remove dead code.

* Remove unused imports.

* Keep files well organized.

### 7. Naming & Organization

Use descriptive names.

Avoid generic names such as:

* foo

* bar

* temp

* data

* value1

Prefer:

* userProfile

* paymentHistory

* authenticationService

* translatedContent

### 8. Error Handling

Always handle:

* Invalid input

* Null and undefined values

* Network failures

* API failures

* Permission errors

* Database errors

* Timeouts

Never:

* Swallow exceptions.

* Return ambiguous errors.

* Expose sensitive internal details.

### 9. Logging & Observability

Use:

* Structured logging

* Metrics

* Tracing

* Health checks

* Correlation IDs where applicable

Never log:

* Passwords

* Tokens

* API keys

* Personal information

* Secrets

### 10. Security Requirements

Always:

* Validate all external input.

* Sanitize user-generated content.

* Encode output appropriately.

* Enforce authentication.

* Enforce authorization.

* Apply least-privilege access.

* Use environment variables for secrets.

* Mask sensitive data in logs.

* Protect against SQL injection.

* Protect against XSS.

* Protect against CSRF when applicable.

* Apply rate limiting where appropriate.

* Follow OWASP best practices.

Never:

* Hardcode credentials.

* Commit secrets.

* Expose internal stack traces to users.

### 11. Performance & Scalability

Prefer:

* Memoization

* Lazy loading

* Pagination

* Code splitting

* Debouncing

* Throttling

* Efficient queries

* Batch operations

* Caching where beneficial

Avoid:

* Unnecessary rerenders

* N+1 queries

* Blocking operations

* Excessive bundle size

* Repeated API calls

Design for:

* Horizontal scaling

* Stateless services

* Asynchronous processing

* Queue-based workloads

* High-concurrency traffic

avoid creating fallback logic anywhere , keep the code working using one logic code be it with google auth , mobile otp login , api key access , multilinugal website and all . use one logic only 

do not create or delete files , just fix the errors/issues the user will give to you.
u can only edit the files and fix the errors and only create and delete files if user explicitly says to you.


### 12. Database Rules

Always:

* Use indexes appropriately.

* Validate inputs.

* Handle transactions safely.

* Preserve referential integrity.

* Write reversible migrations when possible.

* Design migrations for zero-downtime deployment.

Never:

* Perform unnecessary joins.

* Create duplicate records.

* Lock large tables without necessity.

### 13. API Standards

APIs must:

* Follow REST conventions when applicable.

* Use consistent response formats.

* Validate all inputs.

* Return proper HTTP status codes.

* Provide meaningful error messages.

* Maintain backward compatibility.

* Support idempotency where appropriate.

### 14. Frontend Standards

Components must be:

* Small

* Reusable

* Accessible

* Responsive

* Testable

Extract reusable logic into hooks or utilities.

Avoid monolithic components.

### 15. Forms & Validation

Every form must include:

* Validation

* Loading state

* Error state

* Disabled state

* Success feedback

* Server-side validation handling

### 16. Accessibility

Ensure:

* Keyboard navigation

* Semantic HTML

* ARIA labels where needed

* Focus management

* Color contrast compliance

* Screen reader compatibility

### 17. Internationalization (i18n)

Never hardcode user-facing text.

All visible strings must be translatable.

Use the project's translation utilities consistently.

### 18. State Management

Prefer:

* Local state

* Context

* Global store

Avoid unnecessary global state.

### 19. Dependencies

Before adding a dependency:

* Check if functionality already exists.

* Justify the addition.

* Prefer mature libraries.

* Avoid abandoned packages.

* Minimize dependency count.

### 20. Refactoring Rules

* Preserve behavior.

* Reduce complexity.

* Improve readability.

* Avoid unnecessary rewrites.

* Keep changes focused.

### 21. Documentation Requirements

Update documentation when applicable:

* README

* API documentation

* Environment variables

* Configuration

* Migration guides

* Architecture diagrams


Before completion:

- Ensure the implementation is logically complete.
- Verify changes through code inspection.
- Do not run build, lint, test, or deployment commands unless explicitly instructed.
- Assume the user will execute verification commands locally.
- If the user provides build, lint, or test errors, use those outputs to diagnose and fix the underlying issues.

### 23. Production Safety

Require confirmation before destructive changes involving:

* Databases

* Authentication

* Billing

* Payments

* Production configuration

* User data

* Infrastructure

Prefer backward-compatible deployments.

### 24. Backward Compatibility

Avoid breaking changes.

When modifying APIs, schemas, events, or configuration, ensure existing integrations continue working unless explicitly instructed otherwise.

### 25. Git & Pull Requests

* Make atomic commits.

* Keep diffs focused.

* Do not modify unrelated files.

* Review changes before completion.

### 26. Configuration

Never hardcode:

* URLs

* Secrets

* API keys

* Credentials

* Feature flags

* Environment-specific values

### 27. Large Task Workflow

* Plan

* Implement

* Verify

* Optimize

* Document

### 28. Bug Fix Workflow

* Identify the root cause.

* Fix the root cause.

* Add safeguards against regression.

* Verify affected workflows end-to-end.

### 29. AI Operating Rules

Never assume implementation details.

Always inspect existing code first.

Do not invent:

* APIs

* Database schemas

* Environment variables

* Project conventions

* File structures

If information is missing, inspect additional files before proceeding.

### 30. Minimal Change Principle

* Make the smallest change necessary.

* Avoid unrelated refactoring.

* Avoid formatting-only changes.

* Avoid unnecessary renaming.

* Keep pull requests narrowly scoped.

### 31. Self-Review Checklist

Before completing a task:

* Review the diff.

* Remove unnecessary changes.

* Simplify where possible.

* Verify consistency with existing code.

* Confirm production readiness.

### 32. Definition of Done

A task is complete only when:

* Implementation is complete.

* Verification succeeds.

* Documentation is updated.

* No regressions exist.

* Feature works end-to-end.

* Production readiness has been confirmed.

# 33. Build & Verification Policy

Unless explicitly instructed by the user:

Do NOT run:

- Full production builds
- Docker builds
- Container builds
- Mobile app builds
- Long-running test suites
- End-to-end test suites
- Benchmarking
- Performance profiling
- Large code generation tasks
- Dependency installation or updates
- Any command that is computationally expensive or consumes significant AI execution limits

Instead:

- Analyze the code.
- Apply the required fixes.
- Ensure changes are logically correct.
- Verify correctness through static analysis and code inspection whenever possible.

The user is responsible for running:

- build commands
- lint commands
- type checking
- test suites
- deployment commands

If the user runs these commands and encounters errors, they will provide the output for further fixes.

Only execute build, test, lint, or other resource-intensive commands when the user explicitly requests it.

### 33. Final Verification Checklist

No TypeScript errors

No lint errors

No unused imports

No duplicated logic

No dead code

No debugging statements

Proper error handling

Responsive UI

Accessible UI

Translation support

Consistent naming

Architecture respected

Documentation updated

Feature verified end-to-end

### Enterprise SaaS Ready

v2.0

This version is suitable for production-grade SaaS development, AI-assisted engineering workflows, and long-term enterprise-scale maintenance.

