# Architecture

AgriConnect is organized around runtime boundaries first, then feature ownership. The goal is to keep frontend code, backend code, shared contracts, database resources, scripts, and documentation easy to locate as the project grows.

## Top-Level Structure

```text
Agri-Connect/
├── frontend/          React/Vite application
├── backend/           Express API and server runtime
├── shared/            Cross-runtime schemas, interfaces, and validation
├── database/          Migrations and seed data
├── scripts/           Build and operational helper scripts
├── docs/              Documentation and verification artifacts
└── dist/              Generated production output
```

## Frontend

```text
frontend/
├── index.html
├── public/            Static files copied as-is during frontend builds
└── src/
    ├── assets/        Imported frontend-owned images and media
    ├── components/    Reusable UI and feature components
    ├── hooks/         React hooks
    ├── i18n/          Browser i18n setup and locale files
    ├── lib/           Browser utilities, providers, client data helpers
    ├── pages/         Route-level screens
    ├── App.tsx        Route composition and app shell
    ├── index.css      Global styles
    └── main.tsx       Browser entry point
```

Frontend modules should import application code through `@/`, shared contracts through `@shared/`, and frontend assets through `@assets/`.

## Backend

```text
backend/
├── index.ts           Express app bootstrap
├── routes.ts          API route registration
├── storage.ts         In-memory/domain storage implementation
├── ai/                AI provider orchestration
├── auth/              Authentication and user persistence
├── config/            Backend configuration and infrastructure clients
├── notifications/     Email/WhatsApp notification composition
├── otp/               OTP provider code
├── payments/          Payment provider clients and helpers
├── runtime/           Static serving and dev middleware adapters
└── shipping/          Shipping quote engine and carrier adapters
```

Backend modules should keep provider-specific clients in integration folders such as `payments/`, runtime/server adapters in `runtime/`, and infrastructure clients in `config/`.

## Shared

```text
shared/
├── schema.ts          Shared domain interfaces and validation schemas
└── models/           Database-backed shared table models
```

Use `shared/` for contracts used by both frontend and backend. Avoid importing frontend or backend implementation details from `shared/`.

## Database

```text
database/
├── migrations/        SQL migration history
└── seeds/             Seed data placeholders
```

Drizzle is configured in `drizzle.config.ts` to read schemas from `shared/schema.ts` and write migrations to `database/migrations`.

## Scripts

```text
scripts/
├── build.ts           Production frontend/backend build orchestration
├── post-merge.sh
└── notifications/     Notification provider test utilities
```

Add operational one-off scripts under a scoped subfolder instead of placing them in the repository root.

## Dependency Direction

- Frontend may import `frontend/src/*`, `shared/*`, and frontend assets.
- Backend may import `backend/*` and `shared/*`.
- Shared code must not import frontend or backend modules.
- Scripts may import project modules only when they are part of developer operations.
- Database migrations should remain independent SQL artifacts.

## Adding New Features

1. Put route-level UI in `frontend/src/pages`.
2. Put reusable UI in `frontend/src/components`.
3. Put browser utilities and providers in `frontend/src/lib`.
4. Put API/domain logic under the relevant `backend/` feature folder.
5. Put cross-runtime types or validation in `shared/`.
6. Put migrations in `database/migrations`.
7. Put operational helpers in `scripts/<domain>/`.

This keeps behavior discoverable for both developers and AI coding agents while preserving clear runtime boundaries.
