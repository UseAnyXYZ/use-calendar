# <img src="apps/web/src/assets/calendar-icon.svg" width="28" height="28" alt="icon" style="vertical-align: middle;"> Use Calendar

A calendar management system with a web app, CLI, and REST API.

## Monorepo Structure

```
apps/
  web/          → React web application (Vite)
  api/          → Backend API (Cloudflare Workers + Hono)
  cli/          → Command-line interface
packages/
  contracts/    → Shared types & Zod validation schemas
  db/           → Database schema & Drizzle ORM
  ics/          → iCalendar (RFC 5545) serialization
```

## Tech Stack

- **Runtime:** TypeScript, Cloudflare Workers, Node.js
- **Frontend:** React 19, Vite 6
- **Backend:** Hono, Cloudflare D1 (SQLite), Drizzle ORM
- **Validation:** Zod
- **Tooling:** Turborepo, pnpm, Vitest, Wrangler

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (v10.15+)

### Install

```bash
pnpm install
```

### Development

```bash
# Start all dev servers
pnpm dev

# Or run individually
pnpm --filter @use-calendar/api dev    # API on localhost:8787
pnpm --filter @use-calendar/web dev    # Web app (proxies API to :8787)
```

### Database

```bash
pnpm db:generate           # Generate migrations from schema changes
pnpm db:migrate:local      # Apply migrations locally
pnpm db:migrate:remote     # Apply migrations to remote D1
```

### Build & Test

```bash
pnpm build        # Build all packages
pnpm typecheck    # Type check all packages
pnpm lint         # Lint all packages
pnpm test         # Run tests
```

## Features

- Email/password auth with session-based login
- Timed and all-day events with location, description, and timezone
- Personal access tokens for CLI and programmatic access
- Public ICS feed URLs for subscribing in Google Calendar, Apple Calendar, etc.
- Soft deletes — events are cancelled, not permanently removed

## License

MIT
