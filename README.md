# AgriConnect

AgriConnect is a full-stack agricultural marketplace with a React/Vite frontend, Express backend, shared TypeScript models, and PostgreSQL/Drizzle persistence.

## Quick Start

```bash
npm install
npm run db:push
npm run dev
```

## Project Map

- `frontend/` - React application, public static files, UI assets, pages, components, hooks, and browser utilities.
- `backend/` - Express server, API routes, auth, integrations, runtime adapters, and backend feature modules.
- `shared/` - Types, interfaces, validation schemas, and database table models shared across frontend and backend.
- `database/` - SQL migrations and seed placeholders.
- `scripts/` - Build, maintenance, and operational helper scripts.
- `docs/` - Architecture notes, environment setup, agent guidance, screenshots, and project documents.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before adding new modules.
