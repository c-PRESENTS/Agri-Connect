# Security, Accessibility, and Compliance Foundation

This is an implementation and deployment checklist, not a compliance certification. Production owners must validate their provider settings with qualified security and legal advisers.

## Optional API rate limiting

The optional limiter is disabled by default, including local development. It covers selected catalog, support, cart, order, dashboard, and logistics API groups only. Authentication and OTP routes are deliberately excluded.

Set these variables in staging or production only after load testing:

- `ENABLE_API_RATE_LIMIT=true`
- `API_RATE_LIMIT_WINDOW_MS=900000`
- `API_RATE_LIMIT_MAX=100`

The in-process limiter is a foundation, not a distributed production control. Use a shared provider-backed limiter when multiple server instances are deployed.

## SSL, transport security, and DDoS protection — Needs External Setup

- Terminate TLS at a managed load balancer, reverse proxy, or hosting platform; redirect HTTP to HTTPS and enable HSTS only after HTTPS is verified for every domain.
- Verify certificate validity, renewal, modern TLS settings, and proxy forwarding before launch. The application cannot issue or monitor certificates.
- Put the public application behind a CDN/WAF with DDoS mitigation, request-size limits, bot controls, and upstream rate limiting. Configure allowlists and incident response outside this repository.

## Encryption — Needs External Setup

- Use managed PostgreSQL encryption at rest, encrypted backups, least-privilege database access, and TLS database connections where the provider supports them.
- Keep secrets in the deployment secret manager rather than source control or browser bundles. Rotate them using provider procedures.
- The application does not add field-level encryption. Introducing it requires a data-classification, key-management, recovery, searchability, and migration plan.

## Privacy and regional compliance — Needs External Setup

- The existing privacy and terms pages are policy foundations, not legal compliance proof.
- Obtain legal review for GDPR, UK GDPR, CCPA/CPRA, DPDPA, and any region in which the service is offered. Define lawful basis, processor agreements, retention, deletion/export workflows, consent records, incident response, and data-subject request handling.
- Review every hosting, analytics, email, shipping, SMS, payment, and support provider for data-processing terms and transfer mechanisms.

## Audit logging

Set `ENABLE_AUDIT_LOG=true` to emit structured audit events for cart changes, manual checkout, orders, seller product changes, and dashboard access. Events intentionally contain only timestamps, action names, actor IDs, target IDs/types, and outcomes.

Console output is not a durable audit trail. Production requires a managed, access-controlled log sink with retention, integrity, alerting, and access review policies.

## Verification foundation

`tests/e2e/security-accessibility.foundation.spec.ts` contains read-only API and form/keyboard checks. They are skipped unless `RUN_FOUNDATION_E2E=true`, and require a separately running target configured with `E2E_BASE_URL` when it is not local.
