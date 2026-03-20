export interface IcsAlarm {
  /** Minutes before the event start to trigger the alarm. */
  minutes: number;
}

export interface IcsEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  isAllDay: boolean;
  startTime?: number;
  endTime?: number;
  timezone?: string;
  startDate?: string;
  endDateExclusive?: string;
  rrule?: string;
  status: "confirmed" | "cancelled";
  alarms?: IcsAlarm[];
  createdAt: number;
  updatedAt: number;
}

export interface IcsCalendar {
  name: string;
  events: IcsEvent[];
}

const CRLF = "\r\n";

/**
 * Format a UTC epoch millisecond timestamp as an iCalendar UTC datetime string.
 * Returns the form YYYYMMDDTHHMMSSZ.
 */
export function formatUtcDateTime(epochMs: number): string {
  const d = new Date(epochMs);
  const y = d.getUTCFullYear().toString().padStart(4, "0");
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  const h = d.getUTCHours().toString().padStart(2, "0");
  const min = d.getUTCMinutes().toString().padStart(2, "0");
  const s = d.getUTCSeconds().toString().padStart(2, "0");
  return `${y}${m}${day}T${h}${min}${s}Z`;
}

/**
 * Format an epoch millisecond timestamp as a local datetime string in the
 * given IANA timezone. Returns the form YYYYMMDDTHHMMSS (no trailing Z).
 *
 * Uses Intl.DateTimeFormat for timezone conversion so it works in
 * Cloudflare Workers without Node-specific APIs.
 */
export function formatLocalDateTime(
  epochMs: number,
  timezone: string,
): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(epochMs));
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? "00";

  const y = get("year").padStart(4, "0");
  const m = get("month").padStart(2, "0");
  const d = get("day").padStart(2, "0");
  const h = get("hour").padStart(2, "0");
  const min = get("minute").padStart(2, "0");
  const s = get("second").padStart(2, "0");

  // Intl may return "24" for midnight in some locales; normalise to "00".
  const hNorm = h === "24" ? "00" : h;

  return `${y}${m}${d}T${hNorm}${min}${s}`;
}

/**
 * Escape text values per RFC 5545 section 3.3.11.
 * Backslashes, semicolons, commas, and newlines must be escaped.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n/g, "\\n")
    .replace(/\r/g, "\\n")
    .replace(/\n/g, "\\n");
}

/**
 * Fold a content line so that no line exceeds 75 octets, per RFC 5545
 * section 3.1. Continuation lines start with a single space.
 *
 * The input `line` must NOT include the trailing CRLF.
 */
function foldLine(line: string): string {
  // We need to fold based on UTF-8 byte length, not JS string length.
  const encoder = new TextEncoder();
  const bytes = encoder.encode(line);

  if (bytes.length <= 75) {
    return line + CRLF;
  }

  const chunks: string[] = [];
  let offset = 0;

  // First line: up to 75 octets.
  // Subsequent lines: leading SPACE counts as 1 octet, so 74 octets of content.
  let maxOctets = 75;

  while (offset < bytes.length) {
    const end = Math.min(offset + maxOctets, bytes.length);
    // Decode the slice. We must be careful not to split in the middle of a
    // multi-byte UTF-8 sequence. Walk backwards if necessary.
    let sliceEnd = end;
    // If we're not at the end, ensure we don't cut a multi-byte char.
    // UTF-8 continuation bytes start with bits 10xxxxxx (0x80..0xBF).
    if (sliceEnd < bytes.length) {
      while (
        sliceEnd > offset &&
        bytes[sliceEnd] !== undefined &&
        (bytes[sliceEnd]! & 0xc0) === 0x80
      ) {
        sliceEnd--;
      }
    }

    const decoder = new TextDecoder();
    const chunk = decoder.decode(bytes.slice(offset, sliceEnd));
    chunks.push(chunk);

    offset = sliceEnd;
    // After the first chunk, subsequent continuation lines have 1 octet
    // consumed by the leading space, leaving 74 for content.
    maxOctets = 74;
  }

  return chunks.join(CRLF + " ") + CRLF;
}

/**
 * Format a duration in minutes as an RFC 5545 DURATION value.
 * Uses -PT{m}M for triggers before the event start.
 * 0 minutes means trigger at event start.
 */
function formatDuration(minutes: number): string {
  if (minutes === 0) return "PT0S";

  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;

  let dur = "-P";
  if (days > 0) dur += `${days}D`;
  if (hours > 0 || mins > 0) {
    dur += "T";
    if (hours > 0) dur += `${hours}H`;
    if (mins > 0) dur += `${mins}M`;
  }
  return dur;
}

function formatDateValue(dateStr: string): string {
  // dateStr is YYYY-MM-DD, output YYYYMMDD
  return dateStr.replace(/-/g, "");
}

function serializeEvent(event: IcsEvent): string {
  const lines: string[] = [];

  const addLine = (line: string) => {
    lines.push(foldLine(line));
  };

  addLine("BEGIN:VEVENT");
  addLine(`UID:${event.uid}`);
  addLine(`DTSTAMP:${formatUtcDateTime(event.createdAt)}`);
  addLine(`LAST-MODIFIED:${formatUtcDateTime(event.updatedAt)}`);
  addLine(`SUMMARY:${escapeText(event.summary)}`);

  if (event.description != null && event.description !== "") {
    addLine(`DESCRIPTION:${escapeText(event.description)}`);
  }

  if (event.location != null && event.location !== "") {
    addLine(`LOCATION:${escapeText(event.location)}`);
  }

  addLine(`STATUS:${event.status === "confirmed" ? "CONFIRMED" : "CANCELLED"}`);
  addLine(`SEQUENCE:${Math.floor(event.updatedAt / 1000)}`);

  if (event.isAllDay) {
    addLine(`DTSTART;VALUE=DATE:${formatDateValue(event.startDate!)}`);
    addLine(`DTEND;VALUE=DATE:${formatDateValue(event.endDateExclusive!)}`);
  } else {
    if (event.timezone) {
      addLine(
        `DTSTART;TZID=${event.timezone}:${formatLocalDateTime(event.startTime!, event.timezone)}`,
      );
      addLine(
        `DTEND;TZID=${event.timezone}:${formatLocalDateTime(event.endTime!, event.timezone)}`,
      );
    } else {
      addLine(`DTSTART:${formatUtcDateTime(event.startTime!)}`);
      addLine(`DTEND:${formatUtcDateTime(event.endTime!)}`);
    }
  }

  if (event.rrule) {
    addLine(`RRULE:${event.rrule}`);
  }

  if (event.alarms && event.alarms.length > 0) {
    for (const alarm of event.alarms) {
      addLine("BEGIN:VALARM");
      addLine("ACTION:DISPLAY");
      addLine(`DESCRIPTION:${escapeText(event.summary)}`);
      addLine(`TRIGGER:${formatDuration(alarm.minutes)}`);
      addLine("END:VALARM");
    }
  }

  addLine("END:VEVENT");

  return lines.join("");
}

/**
 * Serialize an IcsCalendar into a valid iCalendar (RFC 5545) string.
 */
export function serializeCalendar(calendar: IcsCalendar): string {
  const lines: string[] = [];

  const addLine = (line: string) => {
    lines.push(foldLine(line));
  };

  addLine("BEGIN:VCALENDAR");
  addLine("VERSION:2.0");
  addLine("PRODID:-//UseCalendar//v1//EN");
  addLine("CALSCALE:GREGORIAN");
  addLine("METHOD:PUBLISH");
  addLine(`X-WR-CALNAME:${escapeText(calendar.name)}`);

  for (const event of calendar.events) {
    lines.push(serializeEvent(event));
  }

  addLine("END:VCALENDAR");

  return lines.join("");
}
