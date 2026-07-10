# AgriConnect Security Guide

**Status:** Baseline security requirements  
**Applies to:** Frontend, backend, APIs, data, integrations, infrastructure, operations, and AI-assisted development

## 1. Security Objective

Protect AgriConnect users, marketplace participants, platform operations, and data against unauthorized access, fraud, leakage, manipulation, abuse, and unsafe automation.

Security controls must preserve usability without weakening identity, authorization, financial, privacy, or audit requirements.

Repository implementation and approved security decisions remain authoritative. Do not invent credentials, providers, encryption schemes, session models, or compliance claims.

## 2. Security Principles

- Deny by default.
- Apply least privilege.
- Validate every trust boundary.
- Keep one authoritative implementation path.
- Fail closed for critical authorization and financial operations.
- Minimize collected and exposed data.
- Separate authentication, authorization, ownership, and verification.
- Use defense in depth.
- Preserve auditability.
- Do not rely on obscurity, disabled UI, or client-side checks.

## 3. Threat Categories

Consider threats including:

- credential theft and account takeover
- OTP abuse and brute force
- OAuth misuse
- session theft and fixation
- API-key leakage
- broken access control
- cross-tenant or cross-organization access
- injection attacks
- XSS and CSRF
- file-upload attacks
- payment and webhook fraud
- inventory, order, or refund manipulation
- scraping and automated abuse
- personal or commercial data leakage
- supply-chain compromise
- prompt injection and AI data exfiltration
- administrator misuse
- denial of service and resource exhaustion

## 4. Authentication

Use only approved authentication methods implemented by the project.

### Passwords

Where password authentication exists:

- store passwords using an approved adaptive password hash
- enforce safe reset and recovery flows
- never log or return passwords
- avoid revealing whether an account exists
- invalidate or review sessions after sensitive credential changes according to policy

### OTP

Where mobile or email OTP exists:

- generate cryptographically secure codes
- use short expiry
- bind OTPs to the intended account and action
- enforce attempt limits and rate limits
- prevent replay
- invalidate after successful use
- do not log OTP values
- do not reveal excessive account information before verification
- do not add bypass or fallback OTP logic

### OAuth or Google authentication

- validate state and nonce where applicable
- validate issuer, audience, redirect URI, and token signature through approved libraries
- link accounts only through explicit secure rules
- prevent account takeover through email-only assumptions
- do not trust unverified provider claims
- keep provider secrets server-side
- use one approved provider path without silent fallback

### Sessions and tokens

- use secure, HttpOnly, and appropriate SameSite cookies where cookie sessions are used
- use TLS in production
- rotate or revoke sessions according to approved policy
- prevent session fixation
- use short-lived access credentials and protected refresh behavior where token architecture exists
- clear client state on logout
- never place long-lived secrets in URLs

## 5. API Keys

Where API-key access exists:

- show the full secret only at approved creation time
- store only a secure hash or approved protected form
- display a nonsecret prefix or identifier for management
- support explicit scope and least privilege
- support revocation and rotation
- record last-used metadata safely where approved
- rate-limit and audit use
- never log the raw key
- do not provide a fallback master key or environment bypass

## 6. Authorization

Every protected backend action must verify:

- identity
- account status
- role or permission
- organization or tenant scope where applicable
- resource ownership
- current resource state
- action-specific policy

Rules:

- centralize authorization logic
- use deny-by-default behavior
- prevent insecure direct object reference
- filter queries by authorized scope, not only after retrieval
- avoid leaking resource existence through error differences when harmful
- re-evaluate authorization for background jobs and delayed actions
- do not trust role or ownership fields supplied by the client

## 7. Administrative Access

- Use dedicated least-privilege permissions.
- Protect sensitive operations with stronger confirmation or reauthentication where appropriate.
- Audit material actions.
- Avoid shared administrator accounts.
- Restrict bulk operations.
- Do not let administrative UI bypass backend policies.
- Keep impersonation disabled unless explicitly designed, restricted, and audited.

## 8. Input Validation and Injection Prevention

Validate all external input using allowlists and schemas where possible.

Protect against:

- SQL or NoSQL injection
- command injection
- template injection
- path traversal
- server-side request forgery
- XML external entities where relevant
- unsafe deserialization
- mass assignment
- header injection
- open redirects

Rules:

- use parameterized queries
- avoid dynamic command construction
- allowlist sortable fields, filters, file types, and redirect destinations
- enforce size and depth limits on payloads
- validate provider responses and queue messages as untrusted input

## 9. Cross-Site Scripting

- Use framework output escaping.
- Avoid unsafe HTML rendering.
- Sanitize approved rich text with a maintained sanitizer and strict policy.
- Treat translations and user-generated content as untrusted.
- Use a Content Security Policy appropriate to the deployed frontend where implemented.
- Avoid placing secrets or sensitive values in the DOM.

## 10. CSRF

Where cookie-authenticated state-changing requests exist:

- use the project's approved CSRF protection
- use appropriate SameSite cookie behavior
- validate origin or referer where part of the approved defense
- do not exempt sensitive endpoints without justification
- do not confuse CORS with CSRF protection

## 11. CORS

- Allow only approved origins, methods, and headers.
- Do not use wildcard credentials.
- Keep development origins out of production configuration.
- Do not reflect arbitrary origins.
- Expose only necessary response headers.

## 12. Rate Limiting and Abuse Prevention

Apply appropriate limits to:

- login and OTP requests
- password reset
- account registration
- search and scraping-sensitive endpoints
- listing creation
- messages and notifications
- uploads
- payment, refund, and order actions
- API-key endpoints
- AI requests
- public forms
- administrative actions

Limits should consider identity, IP, device, organization, endpoint, and cost where appropriate. Do not rely on IP alone for all abuse prevention.

## 13. Secrets and Configuration

- Store secrets only in approved environment or secret-management systems.
- Never commit secrets.
- Never put private keys or server credentials in frontend bundles.
- Keep development, staging, and production credentials separate.
- Rotate exposed credentials.
- Redact secrets from logs and error reports.
- Validate required configuration without printing secret values.
- Do not create hardcoded fallback credentials.

## 14. Data Classification

Treat data according to sensitivity.

Potential sensitive categories include:

- credentials and tokens
- phone numbers and email addresses
- identity or verification documents
- exact addresses and geolocation
- financial and payment records
- order and business transaction history
- farm, crop, production, and commercial information
- government identifiers or applications
- private messages and support records
- API keys

Use the minimum data required for the approved purpose.

## 15. Data Protection

- Use encrypted transport in production.
- Use approved encryption at rest where required.
- Restrict data access by role and scope.
- Avoid duplicating sensitive data.
- Do not expose internal identifiers without need.
- Apply retention and deletion rules.
- Protect backups and exports.
- Do not use production personal data in development or tests.
- Avoid sending unnecessary sensitive data to external services or AI providers.

## 16. Logging and Audit Security

Never log:

- passwords
- OTP values
- raw access or refresh tokens
- raw API keys
- payment credentials
- sensitive identity documents
- complete private messages or free-form sensitive content unless explicitly required and protected

Logs should:

- use safe structured fields
- include correlation identifiers where supported
- avoid user-controlled log injection
- have access controls and retention
- distinguish operational logs from immutable audit events

## 17. File Upload Security

- Limit file size and count.
- Validate actual content and approved MIME types.
- Generate server-controlled filenames.
- prevent path traversal and executable placement.
- use private storage by default for sensitive files.
- authorize every download.
- use signed access only through approved behavior.
- scan files where required by the architecture.
- strip or manage metadata that may expose location or identity.
- prevent SVG, HTML, or active content from executing in unsafe contexts.

## 18. Payment and Financial Security

Where payments are implemented:

- do not handle raw card credentials unless the approved architecture and compliance scope explicitly require it
- use provider-hosted or tokenized flows where established
- verify webhook signatures
- process events idempotently
- reconcile provider and internal state
- do not trust client-side success
- enforce amount and currency equality
- protect refund, settlement, and payout actions with strict authorization and audit
- keep financial history append-only or otherwise tamper-evident according to the approved model

Never claim PCI, regulatory, or security compliance without verified evidence.

## 19. Webhook Security

- Verify signatures using the raw payload when required.
- Reject stale or replayed events where the provider supports timestamps.
- Deduplicate events.
- Validate event-resource relationships.
- Do not trust provider metadata as proof of internal ownership.
- Keep webhook endpoints bounded and observable.
- Do not expose detailed internal errors to external senders.

## 20. SSRF and External Fetching

For any server-side URL fetch:

- allowlist approved destinations where possible
- block private, loopback, link-local, metadata, and internal network ranges
- restrict protocols
- limit redirects, response size, and time
- validate resolved addresses
- avoid returning raw fetched content without safe handling

## 21. Dependency and Supply-Chain Security

- Do not install or update dependencies without explicit permission.
- Prefer existing maintained dependencies.
- Avoid executing untrusted install scripts.
- Pin or lock versions through the existing package-management strategy.
- Review security impact before introducing packages.
- Do not copy unknown code or commands from external sources without inspection.
- Keep CI and deployment credentials least-privilege.

## 22. Browser and PWA Security

- Do not store secrets in local storage, IndexedDB, service-worker caches, or source maps.
- Avoid caching authenticated or transactional responses publicly.
- Scope service workers correctly.
- Protect against stale privileged UI after logout.
- Keep consent behavior aligned with actual tracking.
- Use secure cookie settings and CSP through the approved deployment configuration.
- Prevent open redirects and unsafe URL handling.

## 23. AI Security

For AI-assisted features:

- treat model input and output as untrusted
- separate system instructions from user content
- minimize data sent to providers
- do not include secrets or unnecessary personal data
- defend tools and retrieval against prompt injection
- constrain allowed actions
- require deterministic authorization and validation outside the model
- require user confirmation before high-impact actions
- validate structured output
- rate-limit costly operations
- log safe metadata, not sensitive prompts by default

The model must never independently grant access, approve payments, reveal secrets, or execute destructive operations.

## 24. Error Handling and Information Disclosure

- Return clear but non-sensitive errors.
- Do not expose stack traces, SQL, filesystem paths, secrets, provider credentials, or internal topology to end users.
- Avoid account and resource enumeration.
- Record detailed diagnostics only in protected logs.
- Fail closed when authorization or security dependencies cannot be evaluated.

## 25. Destructive and High-Risk Actions

Require explicit user authorization before changing:

- authentication architecture
- production secrets or configuration
- authorization rules
- payment or billing behavior
- database schema or production data
- user deletion or anonymization behavior
- infrastructure and network controls
- audit logging
- encryption behavior

Use additional confirmation for irreversible data or financial actions.

## 26. Security Verification Boundary

Unless explicitly authorized, Codex must not run:

- dependency audits
- penetration tools
- dynamic scanners
- builds or tests
- servers
- infrastructure commands
- secret rotation
- production configuration changes

Default allowed work is focused static inspection of the affected code and configuration.

Do not claim a security control has been dynamically validated when it was only reviewed statically.

## 27. Incident Response Baseline

When a potential security issue is discovered:

1. Avoid exposing the sensitive details unnecessarily.
2. Identify affected code, data, users, and environments as far as available evidence supports.
3. Stop or isolate further risky action where authorized.
4. Preserve logs and audit evidence.
5. Rotate exposed credentials through an authorized process.
6. Fix the root cause.
7. Review related paths for the same weakness.
8. Document unverified impact honestly.

Do not delete evidence or make unsupported claims about impact.

## 28. Security Review Checklist

For every security-relevant change, inspect:

- trust boundaries
- authentication
- authorization and ownership
- input validation
- output encoding
- CSRF and CORS where applicable
- rate limits
- secrets and logs
- privacy and retention
- transaction and replay behavior
- provider and webhook validation
- file access
- AI tool permissions where applicable
- error disclosure
- auditability

## 29. Prohibited Shortcuts

Never:

- add authentication bypasses
- weaken authorization to make a feature work
- use hardcoded fallback credentials
- trust client-supplied role, ownership, price, or status
- disable TLS or signature checks in production behavior
- log secrets
- return fake success
- suppress a security error
- add silent provider fallback
- expose private data for debugging
- claim compliance without evidence
