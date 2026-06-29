# Government Schemes Digital Module

## What & Why
E.12.5–E.12.7 are unimplemented: there is no government integration module, no digital subsidy application forms, and no API layer for government data. The existing government-schemes page (E.12.1–E.12.4) only displays static scheme cards. This task upgrades it into a functional digital bridge.

## Done looks like
- The government schemes page gets a new "Apply Online" flow: clicking "Apply" on any scheme opens a multi-step application form (eligibility check → document checklist → form submission) with confirmation
- A "Subsidy Repository" section is added: a searchable, filterable list of 20+ schemes with category filters (Input Subsidies, Insurance, Training, Financial), eligibility tags, and downloadable information sheets (PDF links)
- A visible "Government Data API" informational panel explains the platform's data-sharing capability with a sample JSON preview of scheme data — positioned as a trust/transparency feature for institutional buyers
- Submitted applications are stored (in-memory/server) and visible in the user's dashboard under a "My Applications" tab
- All forms use proper validation (react-hook-form + zod) and show success/error states clearly

## Out of scope
- Real integration with government IT systems or payment gateways
- Actual PDF generation (links to external govt portals instead)
- Authentication changes

## Tasks
1. **Subsidy repository UI** — Expand the government-schemes page with a searchable, filterable scheme directory (20+ schemes). Add category filter tabs, eligibility badges, and "Download Info" buttons linking to official govt portal URLs.

2. **Online application form flow** — Build a multi-step application dialog (eligibility → documents → submit) triggered from any scheme card. Add a `POST /api/government/applications` endpoint and in-memory storage for submitted applications.

3. **Dashboard "My Applications" tab** — Add an "Applications" tab to the farmer dashboard showing submitted scheme applications with status (Submitted / Under Review / Approved).

4. **Government Data API showcase panel** — Add an informational section at the bottom of the government-schemes page showing a sample JSON response from `/api/government/schemes` as a transparency feature for institutional partners.

## Relevant files
- `client/src/pages/government-schemes.tsx`
- `client/src/pages/dashboard.tsx`
- `server/routes.ts`
- `server/storage.ts`
- `client/src/App.tsx`
