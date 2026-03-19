#!/usr/bin/env node

import { createRequire } from "node:module";
import { login, whoami } from "./commands/auth.js";
import { list, create, update, del } from "./commands/events.js";
import { feedUrl } from "./commands/calendar.js";
import { printError } from "./output.js";

const require = createRequire(import.meta.url);
const { version: VERSION } = require("../package.json") as { version: string };

const HELP = `\
use-calendar - CLI for use-calendar

Usage:
  use-calendar <command> [options]

Commands:
  auth login                      Authenticate via browser (opens web UI)
  auth login --token <PAT>        Save API token manually
  auth whoami [--json]            Show current user info

  events list [--from DATE] [--to DATE] [--json]
                                  List events (default: next 7 days)
  events create --title "..." [--description "..."] [--location "..."]
      [--start "ISO"] [--end "ISO"] [--start-date YYYY-MM-DD]
      [--end-date YYYY-MM-DD] [--timezone "..."] [--all-day] [--json]
                                  Create a new event
  events update <id> [same flags as create] [--json]
                                  Update an existing event
  events delete <id> [--json]     Cancel an event

  calendar feed-url [--json]      Show calendar feed URL

Options:
  --help                          Show this help message
  --version                       Show version
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }

  if (args.includes("--version") || args.includes("-v")) {
    console.log(VERSION);
    return;
  }

  const command = args[0];
  const subcommand = args[1];
  const rest = args.slice(2);

  switch (command) {
    case "auth":
      switch (subcommand) {
        case "login":
          await login(rest);
          break;
        case "whoami":
          await whoami(rest);
          break;
        default:
          printError(`Unknown auth command: ${subcommand ?? "(none)"}`);
          console.log('Available: auth login, auth whoami');
          process.exit(1);
      }
      break;

    case "events":
      switch (subcommand) {
        case "list":
          await list(rest);
          break;
        case "create":
          await create(rest);
          break;
        case "update":
          await update(rest);
          break;
        case "delete":
          await del(rest);
          break;
        default:
          printError(`Unknown events command: ${subcommand ?? "(none)"}`);
          console.log('Available: events list, events create, events update, events delete');
          process.exit(1);
      }
      break;

    case "calendar":
      switch (subcommand) {
        case "feed-url":
          await feedUrl(rest);
          break;
        default:
          printError(`Unknown calendar command: ${subcommand ?? "(none)"}`);
          console.log('Available: calendar feed-url');
          process.exit(1);
      }
      break;

    default:
      printError(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  printError(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
