# AgriConnect

AgriConnect is a full-stack agricultural marketplace for farmer-to-buyer discovery, product listings, cart and checkout flows, orders, logistics, support, maps, authentication, and AI-assisted marketplace tools.

The repository is intended to evolve as a modular monolith: one deployable app with clear frontend, backend, shared contract, database, script, and test boundaries.

## Tech Stack

- Frontend: React, Vite, TypeScript, Wouter, TanStack Query, Tailwind CSS, shadcn-style UI primitives.
- Backend: Express, TypeScript, sessions, auth, OTP, Stripe, AI integrations, notifications, and shipping adapters.
- Shared code: TypeScript models, Zod validators, and Drizzle schema exports.
- Database: PostgreSQL with Drizzle migrations.
- Testing: Playwright E2E tests in `tests/e2e/`.

## Project Map

- `frontend/` - React app, routes, pages, components, hooks, i18n, assets, PWA files, and browser utilities.
- `backend/` - Express server, API routes, auth, OTP, AI, payments, notifications, shipping, runtime adapters, and storage logic.
- `shared/` - Shared interfaces, validation schemas, and database table models used by frontend and backend.
- `database/` - SQL migrations.
- `scripts/` - Build, environment, notification, and maintenance helpers.
- `tests/e2e/` - Playwright E2E and smoke coverage.
- `AgriConnect-Agents_Guide/` - Preserved project guide assets, including `ENV_GUIDE.md`, `Daily_Plan.md`, the AgriConnect PDF-derived Markdown, PDF, XLSX, DOCX, screenshots, and other media.

## Protected Local Configuration

The root `.env` file contains local integration configuration and must be preserved. Do not overwrite, sanitize, delete, rename, expose, or commit secrets from `.env`.

For environment details, read `AgriConnect-Agents_Guide/ENV_GUIDE.md`.

## User-Run Commands

These commands are for the user to run locally. Coding agents should not run them unless explicitly asked.

```bash
npm install
npm run dev
npm run check
npm run build
npm run e2e:env
npm run db:push
```

Playwright commands are also user-run unless explicitly authorized.

## Development Rules

- Read `AGENTS.md` before making changes.
- Preserve existing features, routes, API contracts, auth behavior, payment behavior, database values, test IDs, i18n keys, and business behavior.
- Keep changes small, scoped, and easy to review.
- Do not create, delete, rename, or move files unless explicitly requested.
- Create a new file only when necessary for a requested feature or fix.
- Do not update Markdown files unless explicitly requested.
- If a frontend change requires backend data, validation, API, schema, seed, permission, or business-rule alignment, update the related backend code in the same scoped change.
- If a backend change requires frontend contract, UI, query, or state alignment, update the related frontend code in the same scoped change.

## Agent Verification

Agents should implement requested changes and verify with static inspection plus focused Codex in-app browser checks when a local app is already running.

Browser verification should be one route at a time and one focused behavior at a time. Agents should not start dev servers, run builds, run Playwright, run Docker, run migrations, install dependencies, lint, type-check, or test unless the user explicitly asks.
