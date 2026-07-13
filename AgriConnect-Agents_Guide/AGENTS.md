# AgriConnect Universal Agent Guide

This file is the single universal instruction file for all coding agents working in this repository, including Codex, Claude Code, Cursor, and any future AI coding tool.

It applies to frontend, backend, shared code, database files, scripts, tests, E2E coverage, browser verification, `.env`, and project assets.

## Core Rules

- Implement only what the user explicitly asks for.
- Preserve existing features, business behavior, route paths, API contracts, auth behavior, payment behavior, database values, test IDs, i18n keys, and user data.
- Keep changes small, scoped, and easy to review.
- Inspect the relevant frontend, backend, shared contracts, database schema, and tests before editing.
- Do not touch unrelated user changes.
- Do not reformat unrelated files.
- Do not update roadmap, planning, guide, or Markdown files unless the user explicitly asks.

2. Run route-by-route automated tests.
3. Use the @Browser in-app Browser only for final visual checks.
4. Inspect only affected routes, responsive layouts, and difficult UI states.
5. Avoid asking the browser to verify the entire application in one run.


## File Rules

- Do not create, delete, rename, or move files unless the user explicitly requests it.
- Create a new file only when it is genuinely necessary to implement the requested feature or fix.
- Edit one file at a time where practical.
- Use small patches instead of broad rewrites to avoid sandbox, browser, or patch timeouts.
- Before editing a file, inspect its current contents.
- After editing, review the focused diff.

Do not use combined searches, combined patches, bulk edits, or multi-file editor operations that may hit workspace or tool timeouts.

Always work in small, separate steps:

- Search one area, module, route, or file group at a time.
- Edit backend and frontend separately.
- Apply changes file-by-file or in small related batches.
- Verify each change before starting the next one.
- Run tests, builds, and browser checks route-by-route.
- Do not let one failed operation cancel the remaining work.
- When an operation times out, reduce its scope and retry only that specific step.
- Preserve completed changes and continue from the last verified point.

Prioritize reliable incremental changes over large combined operations.

## Protected Files And Assets

- Preserve the root `.env` file. It contains local integration configuration.
- Never overwrite, sanitize, delete, rename, or expose `.env`.
- Never copy secrets from `.env` into docs, logs, commits, screenshots, or chat responses.
- Preserve `AgriConnect-Agents_Guide/ENV_GUIDE.md`.
- Preserve `AgriConnect-Agents_Guide/Daily_Plan.md`.
- Preserve `AgriConnect-Agents_Guide/Agriconnect An Agri Innovation on the Web.md`; it is the Markdown version of the project PDF and helps agents understand the product.
- Preserve all non-Markdown assets in `AgriConnect-Agents_Guide/`, including PDF, XLSX, DOCX, screenshots, and media files.

## Frontend And Backend Alignment

- Do not make frontend-only changes when the feature depends on backend data, validation, seed data, API behavior, enums, permissions, database fields, or business rules.
- Do not make backend-only changes when the feature requires frontend contract, UI, query, form, or state updates.
- If a frontend change requires related backend alignment, update the related backend files in the same scoped change.
- If a backend change requires related frontend alignment, update the related frontend files in the same scoped change.
- Preserve all existing `/api/*` paths and response shapes unless the user explicitly asks for a breaking change.

## Command Rules

Do not run expensive or broad commands unless the user explicitly asks.

Agents must not run by default:

- `npm run build`
- production builds
- Playwright commands
- broad E2E suites
- Docker commands
- database migrations
- dependency installation or updates
- lint commands
- type-check commands
- test commands

The user will run build, lint, type-check, Playwright, tests, migrations, and final verification locally.

## Browser Verification

- Use static inspection first.
- Use the @Browser(in-app Browser) only for focused verification when a local app is already running.
- Do not start a dev server unless the user explicitly asks.
- Do not run Playwright unless the user explicitly asks.
- Verify browser behavior one route at a time.
- Check one focused behavior at a time.
- Record the result before moving to another route.
- Retry a failed browser route at most once with a narrower check.
- Avoid broad browser sweeps that can hit browser, sandbox, or timeout limits.
- If browser verification is unavailable, blocked, or incomplete, say so clearly and give the exact local check the user should run.
Use the @Browser  in-app browser  for verification first. If it fails, times out, becomes blocked, crashes, or returns any browser-tool error, stop retrying immediately and explain what issue u faced. 

For browser verification, work in small route-by-route step , http://localhost:5000/ this is the URL    use 60 seconds time out to load features and pages , since it is a big heavay SaaS website , rendering pages takes time

Before interacting:
1. Open the route and wait for the page to finish its initial render.
2. Inspect the current DOM/accessibility tree or take a screenshot.
3. Confirm the target element’s actual role, accessible name, and visibility.
4. Only then interact with it.

Do not assume that "Map" is a button. Use the selector that actually exists,
preferably a stable data-testid or accessible role.

Never use a 3000 ms timeout for dynamic pages, maps, API-backed content, or
initial page loading. Allow 15–30 seconds for navigation and element visibility.

Do not execute large combined DOM evaluations or multiple browser actions at
once. Perform each navigation, wait, inspection, click, and assertion separately



## Testing Policy

- Add or update tests only when necessary for the requested feature or fix.
- Prefer the smallest useful test layer.
- Do not weaken tests to make a change pass.
- Do not skip or delete tests unless the user explicitly asks.
- Do not claim tests passed unless they were actually run.
- If commands were not run, state that verification was static or browser-only.

## Documentation Policy

- Do not update `.md` files unless explicitly requested.
- The only standard Markdown docs intentionally kept in this repo are:
  - `AGENTS.md`
  - `README.md`
  - `AgriConnect-Agents_Guide/ENV_GUIDE.md`
  - `AgriConnect-Agents_Guide/Daily_Plan.md`
  - `AgriConnect-Agents_Guide/Agriconnect An Agri Innovation on the Web.md`

## Git Safety

- Do not run destructive git commands unless the user explicitly asks.
- Do not revert user changes.
- If the worktree is dirty, work around unrelated changes and mention relevant risk.
- Commit, stage, push, or open PRs only when explicitly requested.
