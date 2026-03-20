import type { CalendarEvent } from "@useanysh/calendar-contracts";

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

export function formatDate(isoOrEpoch: string | number | null | undefined): string {
  if (isoOrEpoch == null) return "-";
  const date = new Date(isoOrEpoch);
  if (isNaN(date.getTime())) return String(isoOrEpoch);
  return date.toLocaleString();
}

function formatReminderMinutes(minutes: number): string {
  if (minutes === 0) return "at start";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  return `${parts.join(" ")} before`;
}

export function formatEvent(event: CalendarEvent, isJson: boolean): string {
  if (isJson) {
    return JSON.stringify(event, null, 2);
  }

  const lines: string[] = [];
  lines.push(`${BOLD}${event.title}${RESET} ${DIM}(${event.id})${RESET}`);

  if (event.status === "cancelled") {
    lines.push(`  ${RED}CANCELLED${RESET}`);
  }

  if (event.isAllDay) {
    lines.push(`  ${CYAN}All day${RESET}: ${event.startDate ?? "-"} to ${event.endDateExclusive ?? "-"}`);
  } else {
    lines.push(`  ${CYAN}Start${RESET}: ${formatDate(event.startTime)}`);
    lines.push(`  ${CYAN}End${RESET}:   ${formatDate(event.endTime)}`);
  }

  if (event.timezone) {
    lines.push(`  ${CYAN}Timezone${RESET}: ${event.timezone}`);
  }
  if (event.location) {
    lines.push(`  ${CYAN}Location${RESET}: ${event.location}`);
  }
  if (event.description) {
    lines.push(`  ${CYAN}Description${RESET}: ${event.description}`);
  }
  if (event.rrule) {
    lines.push(`  ${CYAN}Recurrence${RESET}: ${event.rrule}`);
  }
  if (event.reminders && event.reminders.length > 0) {
    const formatted = event.reminders.map((r) => formatReminderMinutes(r.minutes)).join(", ");
    lines.push(`  ${CYAN}Reminders${RESET}: ${formatted}`);
  }

  return lines.join("\n");
}

export function printTable(headers: string[], rows: string[][]): void {
  const colWidths = headers.map((h, i) => {
    const maxRow = rows.reduce((max, row) => Math.max(max, (row[i] ?? "").length), 0);
    return Math.max(h.length, maxRow);
  });

  const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join("  ");
  const separator = colWidths.map((w) => "-".repeat(w)).join("  ");

  console.log(`${BOLD}${headerLine}${RESET}`);
  console.log(`${DIM}${separator}${RESET}`);

  for (const row of rows) {
    const line = row.map((cell, i) => (cell ?? "").padEnd(colWidths[i])).join("  ");
    console.log(line);
  }
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printError(message: string): void {
  process.stderr.write(`${RED}${BOLD}Error${RESET}${RED}: ${message}${RESET}\n`);
}

export function printSuccess(message: string): void {
  console.log(`${GREEN}${message}${RESET}`);
}
