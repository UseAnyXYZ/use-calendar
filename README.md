# use-calendar

A full-featured calendar management system with three interfaces: web app, CLI, and REST API. Create, manage, and share calendar events with support for timed and all-day events, timezone handling, and public iCalendar (ICS) feeds.

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

- **Authentication** — Email/password registration and login with session-based auth
- **Events** — Create, update, and delete timed or all-day events with optional location, description, and timezone
- **API Tokens** — Personal access tokens for CLI and programmatic access
- **Calendar Feeds** — Public ICS feed URLs for subscribing in any calendar app (Google Calendar, Apple Calendar, etc.)
- **Soft Deletes** — Events are marked as cancelled rather than permanently removed
- **Multi-Client** — Same API serves the web app, CLI, and public ICS feeds

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/me` | Current user profile |
| `GET` | `/api/calendar` | Calendar metadata |
| `PATCH` | `/api/calendar` | Rename calendar |
| `GET` | `/api/events` | List events (query: `from`, `to`) |
| `POST` | `/api/events` | Create event |
| `GET` | `/api/events/:id` | Get event |
| `PATCH` | `/api/events/:id` | Update event |
| `DELETE` | `/api/events/:id` | Delete event (soft) |
| `GET` | `/api/tokens` | List API tokens |
| `POST` | `/api/tokens` | Create API token |
| `DELETE` | `/api/tokens/:id` | Revoke token |
| `GET` | `/api/calendar-feed` | Feed metadata |
| `POST` | `/api/calendar-feed/rotate` | Rotate feed token |
| `GET` | `/calendar/:token.ics` | Public ICS feed |

## CLI Usage

```bash
# Authenticate
use-calendar auth login --token <PAT>
use-calendar auth whoami

# Manage events
use-calendar events list [--from DATE] [--to DATE] [--json]
use-calendar events create --title "Meeting" [--start-time ISO] [--end-time ISO]
use-calendar events update <id> [--title "New Title"]
use-calendar events delete <id>

# Calendar feed
use-calendar calendar feed-url
```

## License

MIT
