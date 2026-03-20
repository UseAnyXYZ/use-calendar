# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install              # Install dependencies
pnpm dev                  # Start all dev servers (API :8787, Web proxies to it)
pnpm build                # Build all packages (Turborepo)
pnpm typecheck            # Type check all packages
pnpm lint                 # Lint all packages
pnpm test                 # Run all tests (Vitest)

# Run a single test file
pnpm --filter @useanysh/calendar-ics test -- src/serializer.test.ts

# Database
pnpm db:generate          # Generate migrations from schema changes
pnpm db:migrate:local     # Apply migrations locally
pnpm db:migrate:remote    # Apply migrations to remote D1
```

## Architecture

Turborepo monorepo with pnpm workspaces. Three apps share code through three packages.

### Apps

- **`apps/api`** — Cloudflare Workers backend using Hono. Cloudflare D1 (SQLite) database via Drizzle ORM. Serves the web app as static assets and exposes `/api/*` routes plus `/calendar/:token.ics` for public ICS feeds. Auth: session cookies (web) and Bearer tokens (CLI/API).
- **`apps/web`** — React 19 SPA built with Vite. Dev server proxies `/api` and `/calendar` to localhost:8787.
- **`apps/cli`** — Published as `@useanysh/calendar-cli` (bin: `use-calendar`). Commands: `auth login/whoami`, `events list/create/update/delete`, `url`. Authenticates via browser-based polling flow. Stores config in platform-specific dirs.

### Packages

- **`packages/contracts`** — Shared TypeScript types and Zod validation schemas used by all three apps.
- **`packages/db`** — Drizzle ORM schema definitions. Migrations output to `apps/api/migrations/`.
- **`packages/ics`** — RFC 5545 iCalendar serializer with proper line folding and UTF-8 support.

### Key Patterns

- Shared Zod schemas in `contracts` validate inputs across CLI, API, and web.
- Drizzle ORM schema in `packages/db/src/schema.ts` is the source of truth for the database; run `pnpm db:generate` after schema changes.
- API build depends on web build (static assets are bundled into the Worker via `wrangler.jsonc` assets config).
- Events support both timed (startTime/endTime with timezone) and all-day (startDate/endDateExclusive) variants.
- Soft deletes: events are marked as cancelled, not removed from the database.
