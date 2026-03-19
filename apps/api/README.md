# @use-calendar/api

Backend API powered by Cloudflare Workers + Hono.

## Endpoints

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
