---
name: use-calendar
description: Use when the user wants to manage calendar events — list, create, update, delete events, check schedule, or get calendar feed URL.
allowed-tools: Bash(npx use-calendar *)
---

# use-calendar CLI

A CLI for managing calendar events via the use-calendar REST API.

## Usage

```
npx use-calendar <command> [options]
```

Run `npx use-calendar --help` to discover available commands and flags.

## Auth

A token must be configured before use. Run `npx use-calendar auth login` to authenticate. Ask the user if auth is not set up.

## Agent guidelines

- Always pass `--json` for machine-readable output.
- Use `--help` on any command to discover available flags.
