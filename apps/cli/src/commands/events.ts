import type { CreateEventInput, UpdateEventInput } from "@use-calendar/contracts";
import { ApiClient } from "../client.js";
import { formatEvent, formatDate, printTable, printJson, printError, printSuccess } from "../output.js";

function parseFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return undefined;
  return args[index + 1];
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/** Ensure a datetime string is full ISO 8601 (with timezone suffix). */
function toFullISO(s: string): string {
  // Already has Z or offset like +08:00
  if (/Z$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) return s;
  // Bare datetime — parse with Date to get full ISO with Z
  const d = new Date(s);
  if (isNaN(d.getTime())) return s; // pass through, let server validate
  return d.toISOString();
}

export async function list(args: string[]): Promise<void> {
  const isJson = hasFlag(args, "--json");

  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const from = parseFlag(args, "--from") ?? toISODate(today);
  const to = parseFlag(args, "--to") ?? toISODate(nextWeek);

  try {
    const client = new ApiClient();
    const events = await client.listEvents(from, to);

    if (isJson) {
      printJson(events);
      return;
    }

    if (events.length === 0) {
      console.log("No events found.");
      return;
    }

    for (const event of events) {
      console.log(formatEvent(event, false));
      console.log();
    }
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

export async function create(args: string[]): Promise<void> {
  const isJson = hasFlag(args, "--json");
  const title = parseFlag(args, "--title");

  if (!title) {
    printError("Usage: use-calendar events create --title \"...\" [options]");
    process.exit(1);
  }

  const isAllDay = hasFlag(args, "--all-day");
  const description = parseFlag(args, "--description");
  const location = parseFlag(args, "--location");
  const startTime = parseFlag(args, "--start");
  const endTime = parseFlag(args, "--end");
  const startDate = parseFlag(args, "--start-date");
  const endDate = parseFlag(args, "--end-date");
  const timezone = parseFlag(args, "--timezone");

  const input: CreateEventInput = {
    title,
    isAllDay,
  };

  if (description) input.description = description;
  if (location) input.location = location;
  if (timezone) input.timezone = timezone;

  if (isAllDay) {
    if (startDate) input.startDate = startDate;
    if (endDate) input.endDateExclusive = endDate;
  } else {
    if (startTime) input.startTime = toFullISO(startTime);
    if (endTime) input.endTime = toFullISO(endTime);
  }

  try {
    const client = new ApiClient();
    const event = await client.createEvent(input);

    if (isJson) {
      printJson(event);
    } else {
      printSuccess("Event created:");
      console.log(formatEvent(event, false));
    }
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

export async function update(args: string[]): Promise<void> {
  const isJson = hasFlag(args, "--json");

  // First non-flag argument is the event ID
  const id = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--title"
    && args[args.indexOf(a) - 1] !== "--description"
    && args[args.indexOf(a) - 1] !== "--location"
    && args[args.indexOf(a) - 1] !== "--start"
    && args[args.indexOf(a) - 1] !== "--end"
    && args[args.indexOf(a) - 1] !== "--start-date"
    && args[args.indexOf(a) - 1] !== "--end-date"
    && args[args.indexOf(a) - 1] !== "--timezone");

  if (!id) {
    printError("Usage: use-calendar events update <id> [options]");
    process.exit(1);
  }

  const input: UpdateEventInput = {};

  const title = parseFlag(args, "--title");
  const description = parseFlag(args, "--description");
  const location = parseFlag(args, "--location");
  const startTime = parseFlag(args, "--start");
  const endTime = parseFlag(args, "--end");
  const startDate = parseFlag(args, "--start-date");
  const endDate = parseFlag(args, "--end-date");
  const timezone = parseFlag(args, "--timezone");

  if (title) input.title = title;
  if (description) input.description = description;
  if (location) input.location = location;
  if (timezone) input.timezone = timezone;
  if (hasFlag(args, "--all-day")) input.isAllDay = true;
  if (startTime) input.startTime = toFullISO(startTime);
  if (endTime) input.endTime = toFullISO(endTime);
  if (startDate) input.startDate = startDate;
  if (endDate) input.endDateExclusive = endDate;

  try {
    const client = new ApiClient();
    const event = await client.updateEvent(id, input);

    if (isJson) {
      printJson(event);
    } else {
      printSuccess("Event updated:");
      console.log(formatEvent(event, false));
    }
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

export async function del(args: string[]): Promise<void> {
  const isJson = hasFlag(args, "--json");

  const id = args.find((a) => !a.startsWith("--"));

  if (!id) {
    printError("Usage: use-calendar events delete <id>");
    process.exit(1);
  }

  try {
    const client = new ApiClient();
    await client.deleteEvent(id);

    if (isJson) {
      printJson({ success: true, id });
    } else {
      printSuccess(`Event ${id} has been cancelled.`);
    }
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
