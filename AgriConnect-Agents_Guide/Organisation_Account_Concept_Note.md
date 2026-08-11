# AgriConnect Organisation Account

## Concept Note for Mentor Review

**Prepared by:** Harsh Gavand
**Date:** 6 August 2026
**Proposed delivery period:** Approximately 9 weeks
**Development model:** Single engineer managing frontend, backend, database, security, testing, and deployment

---

## 1. Concept Overview

The proposed **AgriConnect Organisation Account** will become the central management and administration system for the AgriConnect platform.

At present, AgriConnect supports marketplace users, products, farmers, buyers, orders, payments, logistics, maps, and other agricultural services. As the platform grows, it requires a secure and organised way to manage these activities without directly accessing source code or the database.

The Organisation Account will solve this problem by providing authorised employees and approved organisations with structured dashboards, role-based access, verification tools, analytics, revenue reporting, and operational controls.

The main objective is to make AgriConnect manageable as a real organisation and scalable digital platform rather than only as a public-facing marketplace.

---

## 2. Problem Being Addressed

As AgriConnect expands, several management challenges will arise:

- Different employees require different levels of access.
- User and organisation verification must be controlled and recorded.
- Products and categories must be reviewed before appearing publicly.
- Administrators need reliable information about users, orders, revenue, and platform activity.
- Sensitive data must not be accessible to every employee.
- Important administrative actions must be traceable.
- External organisations must manage their own information without seeing data belonging to others.
- Platform management should not depend on manually editing the database or application code.

Without a dedicated administration system, these activities become difficult to control, insecure, and unsuitable for future growth.

---

## 3. Proposed Solution

The solution consists of two connected but securely separated portals.

### 3.1 AgriConnect Central Admin Portal

The Central Admin Portal will be used only by authorised AgriConnect employees. It will control the complete platform, including:

- Employees and permissions
- Farmers, sellers, buyers, students, researchers, and service providers
- External organisations
- Products and categories
- Verification applications and documents
- Orders, payments, refunds, and payouts
- Platform analytics
- Revenue and financial reports
- Security activity and audit history

### 3.2 External Organisation Workspace

Approved external organisations will receive a separate workspace. They will only be able to manage information belonging to their own organisation, such as:

- Organisation profile
- Employees
- Verification documents
- Products and services
- Orders and reports
- Organisation-level analytics

An external organisation will never receive access to the central AgriConnect control panel or another organisation’s information.

---

## 4. Organisation Registration Process

The proposed registration and approval process is:

1. An organisation creates an application using its official or approved email address.
2. The email address is verified.
3. The organisation enters its business details.
4. Required documents are uploaded securely.
5. The application enters a review queue.
6. An authorised AgriConnect employee reviews the application.
7. The application is approved, rejected, or returned for additional information.
8. An approved organisation receives access to its restricted workspace.

Organisation statuses will include:

- Draft
- Email verification pending
- Documents required
- Pending review
- Approved
- Rejected
- Suspended
- Archived

This process prevents an unverified organisation from immediately gaining management access.

---

## 5. Employee Roles

AgriConnect employees will receive access according to their responsibilities.

| Role | Responsibility |
|---|---|
| Super Admin | Full platform and security control |
| Admin | General administration |
| Manager | Operational supervision and approvals |
| Moderator | Product and content review |
| Customer Support | User assistance and limited account management |
| Finance | Revenue, payments, refunds, invoices, and payouts |
| Operations | Orders, logistics, products, and verification workflows |
| Data Analyst | Analytics and authorised reporting |
| Marketing | Promotions, featured products, and engagement reporting |
| Viewer | Read-only access |

Each role will receive specific permissions, such as View, Create, Edit, Approve, Publish, Suspend, Export, or Manage Users.

The system will check permissions in both the interface and the backend. Therefore, an employee cannot bypass restrictions by directly calling an API.

---

## 6. Main Functional Areas

### Employee Management

- Invite employees
- Assign and change roles
- Configure permissions
- Deactivate accounts
- Reset passwords
- Require two-factor authentication
- Review employee activity
- Revoke active sessions

### User Management

- Search all registered users
- Filter by user type, region, verification, or status
- Review registration and login information
- Approve, suspend, or reactivate accounts
- Export authorised information

### Category Management

- Create and edit categories
- Add subcategories
- Reorder the taxonomy
- Save changes as drafts
- Review before publishing
- Archive categories safely

Only published categories will appear on the public platform.

### Product Management

- Review product listings
- Approve or reject products
- Suspend unsafe or unsuitable products
- Restore listings after review
- Manage Featured Products and Fresh Picks
- Correct category assignments
- Maintain a moderation history

### Verification Centre

- Review organisation and user documents
- Assign applications to reviewers
- Approve or reject verification
- Record reasons and reviewer notes
- Track expiring documents
- Maintain a complete decision history

### Analytics Dashboard

- Total and active users
- Farmers, sellers, and organisations
- Products and orders
- Revenue and refunds
- Customer growth
- Category performance
- Regional activity
- Engagement indicators
- Verification and moderation performance

### Revenue Dashboard

The dashboard will track income and costs from:

- Marketplace commissions
- Subscriptions
- Advertising
- Premium listings
- Featured products
- Logistics services
- Analytics services
- Payment-provider fees
- Refunds
- Taxes
- Seller payouts

The presentation will follow a structured, business-focused reporting style similar to Helium 10, using clear KPI cards, charts, filters, and downloadable reports.

### Data Management

- Secure search and filtering
- Approved CSV/XLSX exports
- Validated imports
- Import preview and error checking
- Expiring report download links
- Managed database backups
- Recovery testing

The portal will not allow unrestricted downloading or uploading of the entire production database.

---

## 7. Security Approach

Security is central to the concept because the portal will manage sensitive operational and financial information.

The proposed controls include:

- Verified email addresses
- Secure password rules
- Mandatory two-factor authentication for central employees
- Role-based and permission-based access
- Shorter administrative sessions
- Session and device monitoring
- Remote logout
- Login rate limiting
- Encrypted sensitive information
- Secure document storage
- Temporary document links
- Audit records for every important action
- Additional authentication before high-risk actions
- Backup and recovery procedures

The system will prevent removal of the last Super Admin. External organisations will be technically restricted to their own data.

---

## 8. External Services Required

Most management features can be developed directly within AgriConnect. Some production capabilities require external services.

### Required

- **PostgreSQL:** platform database
- **SendGrid:** invitation, verification, and password-reset emails
- **Cloudflare R2 or AWS S3:** secure document and report storage
- **Managed backup storage:** encrypted database backups
- **Existing payment providers:** Stripe, PayPal, and Razorpay for live financial reconciliation

### No External API Required

- Roles and permissions
- Employee and user management
- Category and product management
- Internal audit logs
- Authenticator-app 2FA
- Internal analytics
- Revenue calculations
- Login history
- Session management

### Optional Future Services

- Persona, Onfido, or Stripe Identity for automated verification
- Sentry for technical error monitoring
- PostHog for advanced product analytics
- QuickBooks or Xero for accounting integration
- MaxMind or IPinfo for IP-location enrichment
- Vonage for SMS backup authentication

Manual document verification is recommended for the first version because it is more affordable and achievable for a single engineer.

---

## 9. Proposed Nine-Week Delivery

| Week | Main outcome |
|---|---|
| 1 | Organisation database, employee memberships, roles, and permissions |
| 2 | Invitations, email verification, password reset, 2FA, and secure sessions |
| 3 | Admin Portal structure and Employee Management |
| 4 | Organisation registration, document submission, and Verification Centre |
| 5 | Complete User Management directory and approval tools |
| 6 | Category publishing and Product Moderation |
| 7 | Platform Analytics Dashboard |
| 8 | Revenue Dashboard, reports, imports, and exports |
| 9 | Security review, testing, backup restoration, and controlled release |

The system will be released gradually: Super Admin first, internal employees second, and external organisation applications last.

---

## 10. Version 1 Boundaries

To maintain a realistic single-engineer timeline, the following should be delivered later:

- Automated KYC decisions
- Advanced fraud scoring
- Enterprise SSO/SAML
- QuickBooks/Xero integration
- Automated tax filing
- Custom report builders
- Real-time data streaming
- Data warehouse infrastructure
- AI financial forecasting
- Multi-region disaster recovery

The first version will still provide the full operational foundation required to add these capabilities later.

---

## 11. Expected Benefits

### For AgriConnect

- Centralised platform management
- Reduced dependence on manual database work
- Stronger security and accountability
- Faster verification and moderation
- Clear business and financial visibility
- Better readiness for growth, partnerships, and investment

### For Employees

- Access limited to actual responsibilities
- Clear workflows and approval queues
- Better collaboration and traceability
- Reduced risk of accidental changes

### For External Organisations

- Secure onboarding
- Transparent verification
- A dedicated business workspace
- Access to their own operational and performance information

### For Mentors and Stakeholders

- Measurable platform governance
- Transparent operational reporting
- Clear revenue visibility
- Improved compliance readiness
- A practical path from MVP to scalable platform

---

## 12. Success Criteria

The concept will be considered successfully implemented when:

- Only approved employees can access the central portal.
- External organisations can access only their own workspace.
- Every employee role has tested permissions.
- Employees, users, organisations, products, and categories can be managed without direct database access.
- Categories use a draft-and-publish workflow.
- Products use an approval and moderation workflow.
- Verification documents remain private.
- Analytics match actual platform data.
- Revenue reports match orders, payments, refunds, fees, and payouts.
- Sensitive actions require 2FA or additional authentication.
- Important administrative actions are recorded permanently.
- A backup has been restored successfully in a test environment.
- Existing AgriConnect marketplace features remain operational.

---

## 13. Conclusion

The Organisation Account will transform AgriConnect from a feature-rich marketplace into a platform that can be securely governed and operated at scale.

The proposal is technically achievable using the existing React, Express, PostgreSQL, authentication, payment, and dashboard foundations. A nine-week phased delivery is realistic for a single engineer if Version 1 remains focused on core administration, security, verification, analytics, and revenue management.

The result will provide AgriConnect with a central operational foundation suitable for future employees, external organisations, partnerships, compliance work, and commercial growth.
