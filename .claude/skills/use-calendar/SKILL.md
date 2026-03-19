---
name: use-calendar
description: Use when the user wants to manage calendar events — list, create, update, delete events, check schedule, or get calendar feed URL.
allowed-tools: Bash(npx use-calendar *), Bash(npm i -g @useanysh/calendar-cli)
---

# use-calendar CLI

A CLI for managing calendar events via the use-calendar REST API.

## Setup

Before running any command, check if `use-calendar` is available:

```
npx use-calendar --help
```

If the command is not found, install it globally:

```
npm i -g @useanysh/calendar-cli
```

## Usage

```
npx use-calendar <command> [options]
```

Run `npx use-calendar --help` to discover available commands and flags.

## Auth

A token must be configured before use. Run `npx use-calendar auth login` to authenticate. Ask the user if auth is not set up.

## Agent guidelines

- Always check that the CLI is installed before first use; install with `npm i -g @useanysh/calendar-cli` if missing.
- Always pass `--json` for machine-readable output.
- Use `--help` on any command to discover available flags.
