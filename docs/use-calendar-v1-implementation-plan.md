# Use Calendar Monorepo v1 Plan

## Summary

- The repo is currently empty, so phase 1 is greenfield bootstrap.
- Build a TypeScript monorepo with `pnpm` workspaces and `turbo`.
- Create `apps/api` as a Cloudflare Worker with Hono, `apps/web` as a React + Vite SPA, `apps/cli` as a Node CLI whose executable name is `use-calendar`, and shared packages for DB, contracts, and ICS serialization.
- Deploy as one Cloudflare Worker that serves `/api/*`, `GET /calendar/:feedToken.ics`, and the built SPA assets from `apps/web/dist`.
- Locked v1 scope: internal app-owned events only, email/password auth, PAT-based CLI auth, revocable ICS feed URL, one default calendar per user, non-recurring single events only.

## Implementation Changes

1. Bootstrap the workspace with root TypeScript config, shared lint/test settings, Turbo pipelines, `.env.example`, and GitHub Actions for `lint`, `typecheck`, `test`, and deploy-on-main.
2. Add `packages/db` with Drizzle schema, generated SQL migrations, D1 connection helpers, and `wrangler d1 migrations apply` flow for local and remote databases.
3. Create indexed D1 tables using ULIDs: `users`, `sessions`, `api_tokens`, `calendars`, `calendar_feeds`, and `events`.
4. Implement auth without third-party identity services: password hashing via Web Crypto PBKDF2 plus per-user salt, secure HttpOnly cookie sessions for web, hashed PATs for CLI, and separate hashed feed tokens for ICS URLs.
5. Model events as either timed or all-day. Timed events store UTC start/end timestamps plus an IANA timezone; all-day events store `start_date` and `end_date_exclusive`; both carry `status`, `created_at`, and `updated_at`.
6. Use soft deletion through `status = cancelled` instead of hard delete so the ICS feed can express removals safely.
7. Add Zod-validated Worker routes: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/me`, `GET|POST|DELETE /api/tokens`, `GET|POST /api/events`, `GET|PATCH|DELETE /api/events/:id`, `GET /api/calendar-feed`, `POST /api/calendar-feed/rotate`, and `GET /calendar/:feedToken.ics`.
8. Keep event querying range-based instead of page-based: `GET /api/events?from=...&to=...&includeCancelled=false`, with indexes centered on `calendar_id + start`.
9. Implement a small shared ICS serializer in `packages/ics` instead of a Node-centric library, and return stable `UID`, `DTSTAMP`, `LAST-MODIFIED`, correct all-day vs timed fields, short cache headers, and `ETag`/`Last-Modified`.
10. Build the web UI as agenda/list-first: register/login, event list, create/edit form, cancel/delete action, account settings, PAT management, and ICS URL reveal/regenerate.
11. Build the CLI as the `use-calendar` binary with `use-calendar auth login --token`, `use-calendar auth whoami`, `use-calendar events list`, `use-calendar events create`, `use-calendar events update`, `use-calendar events delete`, and `use-calendar calendar feed-url`, with JSON output mode and local config stored in the OS app-config directory.
12. Enable structured Worker logs and request IDs from day one, but keep v1 on Worker plus D1 only and avoid adding KV, Queues, Durable Objects, or external email infrastructure.

## Public APIs and Types

- Shared contracts package exports `UserProfile`, `AuthSession`, `Event`, `EventSummary`, `CreateEventInput`, `UpdateEventInput`, `ApiTokenSummary`, `CalendarFeedInfo`, and `ApiError`.
- API errors use a stable envelope: `code`, `message`, optional `details`, and `requestId`.
- CLI input uses ISO 8601 for timed events and `YYYY-MM-DD` for all-day events; `--timezone` accepts IANA zone names.
- The CLI package exposes a `bin` entry named `use-calendar`; the package name can remain workspace-scoped independently of the executable name.
- The ICS URL is read-only and opaque, not a bearer API token. Rotating the feed invalidates the previous URL immediately.

## Test Plan

- Unit test validation, password/token hashing, timezone normalization, all-day event serialization, and ICS output.
- Integration test D1-backed Worker routes in the Cloudflare runtime: register/login/logout, PAT create/revoke, event CRUD, range queries, feed rotation, and unauthorized access.
- CLI tests cover config persistence, command parsing, JSON output, and HTTP error handling with mocked API responses.
- Smoke test local `wrangler dev`: create an event with `use-calendar`, confirm it appears in web UI, fetch the `.ics` URL, and import it into a desktop calendar client to verify new, updated, and cancelled events.

## Assumptions and Defaults

- No Google/Outlook sync, invites, reminders, recurrence, shared calendars, email verification, or password reset in v1.
- Each user gets one default calendar row even though the UI presents a single calendar, so multi-calendar support can be added later without a schema break.
- The first web release is an agenda/list manager, not a full month-grid calendar.
- Platform choices are based on Cloudflare docs current on March 18, 2026:
  - React + Vite: https://developers.cloudflare.com/workers/framework-guides/web-apps/react/
  - Static Assets: https://developers.cloudflare.com/workers/static-assets/
  - Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
  - D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/
  - D1 getting started: https://developers.cloudflare.com/d1/get-started/
  - Drizzle D1 support: https://orm.drizzle.team/docs/connect-cloudflare-d1
