# <img src="apps/web/src/assets/calendar-icon.svg" width="28" height="28" alt="icon"> Use Calendar

A calendar CLI and API for AI agents. Works with any agent framework — includes a Claude Code plugin out of the box.

Web app: [calendar.useany.sh](https://calendar.useany.sh)

## Install CLI

```bash
npm i -g @useanysh/calendar-cli
```

## Auth Setup

```bash
use-calendar auth login
```

This stores a personal access token locally for future CLI and plugin use.

## Claude Code Plugin

This project includes a [Claude Code plugin](https://docs.anthropic.com/en/docs/claude-code/skills) that lets Claude manage your calendar directly from a conversation.

The public skill markdown is also available at [`https://calendar.useany.sh/SKILL.md`](https://calendar.useany.sh/SKILL.md). It mirrors [`.claude/skills/use-calendar/SKILL.md`](./.claude/skills/use-calendar/SKILL.md) in this repo.

Add the plugin to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "plugins": ["/path/to/use-calendar/.claude-plugin"]
}
```

Once installed, you can ask Claude to manage your calendar using natural language:

- **List events** — "What's on my calendar this week?"
- **Create events** — "Add a meeting with Alice tomorrow at 2pm"
- **Update events** — "Move my 3pm meeting to 4pm"
- **Delete events** — "Cancel my dentist appointment"
- **Check feed URL** — "Get my calendar feed URL"

Claude will use the `/use-calendar` skill, which runs the CLI under the hood via `npx use-calendar`.

## Features

- Email/password auth with session-based login
- Timed and all-day events with location, description, and timezone
- Personal access tokens for CLI and programmatic access
- Public ICS feed URLs for subscribing in Google Calendar, Apple Calendar, etc.
- Soft deletes — events are cancelled, not permanently removed

## License

MIT
