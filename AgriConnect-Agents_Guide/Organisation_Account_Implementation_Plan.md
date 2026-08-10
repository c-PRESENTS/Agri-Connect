# AgriConnect Organisation Account — End-to-End Implementation Plan

## 1. Objective

Build a secure Organisation Account system that allows AgriConnect employees to manage the complete platform and approved external organisations to manage only their own information.

Because one engineer will handle the frontend, backend, database, security, testing, and deployment, the realistic delivery target for a strong Version 1 is **approximately nine weeks**.

The first release will provide:

- A central AgriConnect Admin Portal.
- A restricted workspace for approved external organisations.
- Employee roles and configurable permissions.
- User, product, category, and verification management.
- Analytics and revenue reporting.
- Audit logs, two-factor authentication, exports, and essential security controls.
- A foundation that can later support automated KYC, accounting integrations, fraud detection, and advanced business intelligence.

---

## 2. Portal Structure

### 2.1 Central Admin Portal

**Route:** `/admin`

Only approved AgriConnect employees can use this portal. It will control:

- Employees and permissions
- Users and organisations
- Products and categories
- Verification applications
- Orders, payments, refunds, and payouts
- Platform analytics
- Revenue and financial reports
- Audit and security activity

The existing `/operator` dashboard should become part of this portal instead of creating a completely disconnected system.

### 2.2 Organisation Workspace

**Route:** `/organisation`

Approved external organisations can access this workspace, but only for their own organisation. They must never receive central-platform authority or access another organisation’s records.

External organisations can manage:

- Organisation profile
- Their employees
- Verification documents
- Products or services
- Orders and operational reports
- Organisation-level analytics

---

## 3. Roles and Permissions

The existing marketplace roles—`buyer`, `farmer`, `logistics`, and `admin`—must remain compatible. Administrative permissions should use a separate organisation membership and RBAC system.

### 3.1 Central Employee Roles

| Role | Primary responsibility |
|---|---|
| Super Admin | Complete platform control and security ownership |
| Admin | Most administrative operations except protected Super Admin controls |
| Manager | Operational oversight and approvals |
| Moderator | Product, category, and content moderation |
| Customer Support | User support and limited account management |
| Finance | Revenue, payments, refunds, invoices, and payouts |
| Operations | Orders, logistics, products, and verification queues |
| Data Analyst | Analytics and approved exports |
| Marketing | Promotions, featured products, and engagement reporting |
| Viewer | Read-only access |

External organisations should receive narrower roles such as Organisation Owner, Organisation Admin, Manager, Member, and Viewer.

### 3.2 Permission Examples

- View
- Create
- Edit
- Approve or reject
- Publish
- Suspend or restore
- Archive or delete
- Export or import
- Manage employees
- Manage roles and permissions
- View revenue
- Manage payouts
- View audit history
- Manage security settings

All permissions must be enforced by the backend. Hiding a button in the frontend is not sufficient authorization.

The system must prevent removal or deactivation of the last active Super Admin.

---

## 4. Nine-Week Implementation Timeline

## Week 1 — Database and RBAC Foundation

### Work

- Design and add database tables for:
  - Organisations
  - Organisation applications
  - Organisation memberships
  - Roles and permissions
  - Role-permission assignments
  - Employee invitations
  - Email-verification tokens
  - Password-reset tokens
  - 2FA settings and recovery codes
  - Login history
  - Durable audit events
- Create safe PostgreSQL migrations.
- Seed the default roles and permissions.
- Create reusable backend authorization middleware.
- Bootstrap the first Super Admin through an environment allowlist.
- Preserve existing user, authentication, marketplace, order, and payment behaviour.

### Result

The backend understands organisations, employees, roles, and permissions.

---

## Week 2 — Employee Authentication and 2FA

### Work

- Add employee invitation emails.
- Add invitation acceptance and password creation.
- Add verified-email requirements.
- Add forgot-password and reset-password workflows.
- Add authenticator-app 2FA using QR codes.
- Store 2FA recovery codes as hashes.
- Encrypt 2FA secrets.
- Require 2FA for central employees.
- Add admin session timeout and idle timeout.
- Add session/device listing and remote sign-out.
- Revoke sessions after password or permission changes.
- Add login rate limits and login history.

### Result

Employees can join and sign in securely. Public registration cannot directly create an administrator.

---

## Week 3 — Admin Portal and Employee Management

### Frontend

Build `/admin` with:

- Admin navigation and dashboard shell
- Employee Management
- Roles and Permissions
- Security Activity
- Responsive desktop and tablet layouts
- Permission-aware menus and actions

### Backend

Add APIs for:

- Listing and searching employees
- Inviting employees
- Assigning roles
- Adding permission overrides
- Deactivating and reactivating accounts
- Resetting passwords
- Requiring 2FA
- Revoking sessions
- Viewing employee activity

### Result

The Super Admin can manage the AgriConnect team without using the database directly.

---

## Week 4 — Organisation Registration and Verification

### Registration Flow

1. Organisation submits an application.
2. The email address is verified.
3. Organisation profile and documents are submitted.
4. The application enters Pending Review.
5. An authorized AgriConnect employee reviews it.
6. It is approved, rejected, or returned for more information.
7. An approved organisation receives access to `/organisation`.

### Organisation Statuses

- Draft
- Email verification pending
- Documents required
- Pending review
- Approved
- Rejected
- Suspended
- Archived

### Verification Centre

- Application queue
- Secure document viewer
- Reviewer assignment
- Approval and rejection reasons
- Review history
- Document expiry and reverification
- Temporary signed document links

### Result

External organisations can register safely, while AgriConnect retains approval control.

---

## Week 5 — User Management

Create a central user directory covering:

- Farmers and sellers
- Buyers
- Students and researchers
- Organisations
- Service providers
- Logistics partners

### Features

- Server-side search and pagination
- Filters by account type, verification, status, region, registration date, and last login
- User detail screen
- Account approval
- Verification status
- Suspension and reactivation
- Safe contact information
- Login history and activity
- Permission-controlled CSV export

### Privacy Rules

- Customer Support sees only information needed for support.
- Finance sees financial information but not unrestricted verification documents.
- Data Analysts receive approved and minimised datasets.
- Sensitive information is excluded from ordinary exports.

### Result

Admins can manage users without direct database access.

---

## Week 6 — Category and Product Management

### Category Management

Move the canonical category structure from static code into PostgreSQL while preserving all existing IDs, slugs, and routes.

Support:

- Create and edit
- Reorder
- Draft
- Submit for review
- Publish
- Archive
- Version history

Category workflow:

```text
Draft → Pending Review → Published → Archived
```

Only published categories appear publicly. Categories referenced by products should be archived instead of permanently deleted.

### Product Management

Product workflow:

```text
Draft → Pending Review → Approved
                     ↘ Rejected
Approved → Suspended → Restored or Removed
```

Admins can:

- Review products
- Approve or reject listings
- Edit approved administrative fields
- Suspend or restore listings
- Assign categories
- Mark products as Featured
- Mark products as Fresh Picks
- Review moderation history
- Moderate Share & Care items separately

Existing products should migrate as approved so the marketplace remains populated.

### Result

AgriConnect can control live marketplace content through the portal.

---

## Week 7 — Analytics Dashboard

### Metrics

- Total, new, and active users
- Active farmers and sellers
- Products and orders
- Gross merchandise value
- Revenue and refunds
- Active organisations
- Regional activity
- Category performance
- Verification turnaround
- Product approval and rejection rates
- Engagement activity

### Filters

- Date range
- Country or region
- User type
- Category
- Organisation
- Order status
- Payment provider
- Currency

Use PostgreSQL aggregation queries and summary tables. Refresh operational metrics every 30–60 seconds. This is sufficiently close to real time for Version 1 without introducing a complex streaming system.

### Result

Management can understand platform health through clear KPI cards, charts, and reports.

---

## Week 8 — Revenue Dashboard and Data Management

### Revenue Sources

- Marketplace commissions
- Subscriptions
- Advertising
- Premium listings
- Featured products
- Logistics fees
- Analytics services
- Payment-provider fees
- Refunds
- Taxes
- Seller payouts
- Manual financial adjustments

### Reports

- Revenue by source, category, region, and organisation
- Gross sales and net revenue
- Refund totals
- Payment-provider fees
- Seller liabilities and payouts
- Profit estimate
- Payment and invoice history

Store and calculate money in minor units—pence or paise—to prevent rounding errors.

### Data Management

- CSV/XLSX exports
- Permission and date-limited reports
- Expiring download links
- Validated import templates
- Import preview and error report
- Approval before final import
- Background export jobs

The portal must not provide unrestricted raw database imports or downloads.

### Result

Finance and management receive structured Helium 10-style reporting without raw database access.

---

## Week 9 — Security, Testing, Backup, and Controlled Release

### Security

- Permission-escalation testing
- Organisation-isolation testing
- CSRF protection
- Rate limiting
- Session fixation protection
- Secure password policy
- Upload validation and malware scanning
- Export permission checks
- Sensitive-data leakage review
- Step-up authentication for risky actions
- Audit completeness review

### Testing

- Test every employee role.
- Verify protected endpoints return `403` without permission.
- Test invitations, expiry, 2FA, and recovery codes.
- Test suspension and session revocation.
- Test organisation approval.
- Test category publishing and product moderation.
- Reconcile analytics with database totals.
- Reconcile revenue with orders, payments, refunds, fees, and payouts.
- Test responsive admin layouts.

### Backup and Recovery

- Enable managed PostgreSQL backups.
- Schedule encrypted off-site backups.
- Define retention rules.
- Restore a backup into an isolated database.
- Document the recovery procedure.

### Release Sequence

1. Enable access for the Super Admin.
2. Add Admin and Manager accounts.
3. Add remaining internal roles gradually.
4. Enable external organisation applications last.
5. Monitor errors, permissions, audit records, and performance.

---

## 5. External Services and API Keys

### Required in Production

| Feature | Service or configuration | Required values |
|---|---|---|
| Database | Managed PostgreSQL | `DATABASE_URL` |
| Secure sessions | Application configuration | `SESSION_SECRET` |
| Sensitive-field encryption | Application configuration | `APP_ENCRYPTION_KEY` |
| Invitations and verification emails | SendGrid | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` |
| Verification documents and exports | Cloudflare R2 or AWS S3 | Bucket, endpoint, access key, secret |
| Public redirects and WebAuthn | Hosting configuration | `PUBLIC_APP_URL`, `APP_ORIGINS` |

Recommended new environment variables:

```env
ORG_ADMIN_BOOTSTRAP_EMAILS=cpresents2024@gmail.com
APP_ENCRYPTION_KEY=<32-byte-secure-key>

OBJECT_STORAGE_ENDPOINT=
OBJECT_STORAGE_REGION=
OBJECT_STORAGE_BUCKET=
OBJECT_STORAGE_ACCESS_KEY=
OBJECT_STORAGE_SECRET_KEY=

ADMIN_SESSION_IDLE_MINUTES=30
ADMIN_SESSION_MAX_HOURS=8
ADMIN_REQUIRE_2FA=true
```

The Gmail address can be explicitly allowed as a staff identity. Production emails should still be sent from a verified AgriConnect sender domain.

### Existing Payment Credentials

Recorded manual transactions can appear in reports without new API keys. Live payment collection and reconciliation use the existing:

- Stripe secret and webhook credentials
- PayPal client, secret, partner, and webhook credentials
- Razorpay key, secret, and webhook credentials

### No External API Key Required

- RBAC
- Employee and user management
- Category and product management
- Audit logs
- Authenticator-app 2FA
- Internal analytics
- Revenue calculations
- CSV exports
- Login history
- Session management
- Basic IP/device monitoring

### Optional Services

- Automated KYC: Persona, Onfido, or Stripe Identity
- Malware scanning: self-hosted ClamAV or a commercial API
- Error monitoring: Sentry
- Product analytics: PostHog
- IP geolocation: MaxMind or IPinfo
- Accounting integration: QuickBooks or Xero
- SMS backup authentication: Vonage

Manual document verification should be used initially. Automated KYC can be introduced when application volume justifies its cost.

---

## 6. Important Security Rules

- Frontend permissions control visibility; backend permissions control access.
- Every sensitive administrative change must be audited.
- External organisations must never access central admin APIs.
- One organisation must never access another organisation’s records.
- Audit history should be append-only.
- Verification documents must use temporary signed URLs.
- Passwords, tokens, recovery codes, and 2FA secrets must never appear in logs.
- Financial adjustments require a reason and step-up authentication.
- Destructive bulk actions require confirmation and record limits.
- The last active Super Admin cannot be removed.
- Business records should normally be archived instead of permanently deleted.

---

## 7. Version 1 Boundaries

To keep the single-engineer timeline realistic, defer:

- Automated KYC decisions
- Advanced fraud-scoring models
- QuickBooks/Xero integration
- Custom report builders
- Data-warehouse infrastructure
- Real-time streaming analytics
- Enterprise SSO/SAML
- Automated tax filing
- AI-generated business forecasts
- Multi-region disaster-recovery automation

These can be added after the core portal is stable and actively used.

---

## 8. Definition of Completion

Version 1 is complete when:

- Only approved employees can access `/admin`.
- Approved external organisations can access only their own `/organisation` workspace.
- Every employee role has tested permissions.
- The Super Admin can manage employees without database access.
- Users, organisations, products, and categories can be managed from the portal.
- Categories follow a draft-and-publish workflow.
- Products follow an approval and moderation workflow.
- Verification documents are stored privately.
- Analytics match database totals.
- Revenue reports reconcile with orders, payments, refunds, fees, and payouts.
- Sensitive actions require 2FA or reauthentication.
- Every sensitive action creates a durable audit event.
- Backups have been successfully restored in a test environment.
- Existing marketplace, authentication, product, order, and payment behaviour remains operational.
