export interface ParsedRRule {
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  count?: number;
  until?: string; // YYYYMMDD or YYYYMMDDTHHMMSSZ
  byday?: string[]; // MO, TU, WE, etc.
  bymonthday?: number[];
  bymonth?: number[];
  wkst?: string;
}

const DAY_NAMES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

export function parseRRule(str: string): ParsedRRule {
  const parts = str.split(";");
  const map = new Map<string, string>();
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    map.set(part.slice(0, eqIdx), part.slice(eqIdx + 1));
  }

  const freq = map.get("FREQ") as ParsedRRule["freq"];
  if (!freq || !["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) {
    throw new Error(`Invalid FREQ: ${map.get("FREQ")}`);
  }

  const result: ParsedRRule = {
    freq,
    interval: map.has("INTERVAL") ? parseInt(map.get("INTERVAL")!, 10) : 1,
  };

  if (map.has("COUNT")) result.count = parseInt(map.get("COUNT")!, 10);
  if (map.has("UNTIL")) result.until = map.get("UNTIL")!;
  if (map.has("BYDAY")) result.byday = map.get("BYDAY")!.split(",");
  if (map.has("BYMONTHDAY"))
    result.bymonthday = map.get("BYMONTHDAY")!.split(",").map(Number);
  if (map.has("BYMONTH"))
    result.bymonth = map.get("BYMONTH")!.split(",").map(Number);
  if (map.has("WKST")) result.wkst = map.get("WKST")!;

  return result;
}

/**
 * Expand an RRULE into occurrence start timestamps/dates within a given range.
 *
 * For timed events: dtstart is epoch ms, returns epoch ms values.
 * For all-day events: dtstart is "YYYY-MM-DD" string, returns "YYYY-MM-DD" strings.
 *
 * Uses Intl.DateTimeFormat for timezone-aware expansion (CF Workers compatible).
 */
export function expandRRule(
  dtstart: number | string,
  rrule: string,
  rangeStart: number | string,
  rangeEnd: number | string,
  timezone?: string,
  isAllDay?: boolean,
): (number | string)[] {
  const parsed = parseRRule(rrule);
  const MAX_OCCURRENCES = 730;
  const results: (number | string)[] = [];

  if (isAllDay || typeof dtstart === "string") {
    return expandAllDay(
      String(dtstart),
      parsed,
      String(rangeStart),
      String(rangeEnd),
    );
  }

  return expandTimed(
    dtstart as number,
    parsed,
    rangeStart as number,
    rangeEnd as number,
    timezone,
  );
}

function parseUntilDate(until: string): Date {
  // YYYYMMDD or YYYYMMDDTHHMMSSZ
  if (until.length === 8) {
    return new Date(
      `${until.slice(0, 4)}-${until.slice(4, 6)}-${until.slice(6, 8)}T23:59:59Z`,
    );
  }
  // YYYYMMDDTHHMMSSZ
  return new Date(
    `${until.slice(0, 4)}-${until.slice(4, 6)}-${until.slice(6, 8)}T${until.slice(9, 11)}:${until.slice(11, 13)}:${until.slice(13, 15)}Z`,
  );
}

function dayOfWeekIndex(dayStr: string): number {
  return DAY_NAMES.indexOf(dayStr as (typeof DAY_NAMES)[number]);
}

function expandAllDay(
  dtstart: string,
  rule: ParsedRRule,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  const MAX_OCCURRENCES = 730;
  const results: string[] = [];

  // Parse YYYY-MM-DD
  const startParts = dtstart.split("-").map(Number) as [number, number, number];
  let [year, month, day] = startParts; // month is 1-indexed

  const untilDate = rule.until
    ? rule.until.slice(0, 4) + "-" + rule.until.slice(4, 6) + "-" + rule.until.slice(6, 8)
    : null;

  let count = 0;
  let totalGenerated = 0;

  while (totalGenerated < MAX_OCCURRENCES) {
    const dateStr = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (untilDate && dateStr > untilDate) break;
    if (rule.count && count >= rule.count) break;
    if (dateStr > rangeEnd) break;

    let include = true;

    if (rule.freq === "WEEKLY" && rule.byday && rule.byday.length > 0) {
      const d = new Date(`${dateStr}T12:00:00Z`);
      const dow = DAY_NAMES[d.getUTCDay()];
      if (!rule.byday.includes(dow!)) include = false;
    }

    if (rule.bymonthday && rule.bymonthday.length > 0) {
      if (!rule.bymonthday.includes(day)) include = false;
    }

    if (rule.bymonth && rule.bymonth.length > 0) {
      if (!rule.bymonth.includes(month)) include = false;
    }

    if (include) {
      count++;
      if (dateStr >= rangeStart) {
        results.push(dateStr);
      }
    }

    // Advance to next candidate
    const nextDate = advanceDate(year, month, day, rule);
    year = nextDate[0];
    month = nextDate[1];
    day = nextDate[2];
    totalGenerated++;
  }

  return results;
}

function advanceDate(
  year: number,
  month: number,
  day: number,
  rule: ParsedRRule,
): [number, number, number] {
  const d = new Date(Date.UTC(year, month - 1, day));

  switch (rule.freq) {
    case "DAILY":
      d.setUTCDate(d.getUTCDate() + rule.interval);
      break;
    case "WEEKLY":
      if (rule.byday && rule.byday.length > 0) {
        // Advance one day at a time, only counting full weeks by interval
        d.setUTCDate(d.getUTCDate() + 1);
      } else {
        d.setUTCDate(d.getUTCDate() + 7 * rule.interval);
      }
      break;
    case "MONTHLY":
      d.setUTCMonth(d.getUTCMonth() + rule.interval);
      break;
    case "YEARLY":
      d.setUTCFullYear(d.getUTCFullYear() + rule.interval);
      break;
  }

  return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
}

function expandTimed(
  dtstart: number,
  rule: ParsedRRule,
  rangeStart: number,
  rangeEnd: number,
  timezone?: string,
): number[] {
  const MAX_OCCURRENCES = 730;
  const results: number[] = [];

  const untilMs = rule.until ? parseUntilDate(rule.until).getTime() : null;

  // Work in terms of a "local" date for the timezone to correctly handle DST.
  // We use a helper to convert epoch → local parts → modify → convert back.
  const tz = timezone || "UTC";

  let current = dtstart;
  let count = 0;
  let totalGenerated = 0;

  while (totalGenerated < MAX_OCCURRENCES) {
    if (untilMs && current > untilMs) break;
    if (rule.count && count >= rule.count) break;
    if (current > rangeEnd) break;

    let include = true;

    if (rule.freq === "WEEKLY" && rule.byday && rule.byday.length > 0) {
      const dow = getDayOfWeek(current, tz);
      if (!rule.byday.includes(DAY_NAMES[dow]!)) include = false;
    }

    if (rule.bymonthday && rule.bymonthday.length > 0) {
      const localDay = getLocalParts(current, tz).day;
      if (!rule.bymonthday.includes(localDay)) include = false;
    }

    if (rule.bymonth && rule.bymonth.length > 0) {
      const localMonth = getLocalParts(current, tz).month;
      if (!rule.bymonth.includes(localMonth)) include = false;
    }

    if (include) {
      count++;
      if (current >= rangeStart) {
        results.push(current);
      }
    }

    // Advance
    current = advanceTimed(current, rule, tz);
    totalGenerated++;
  }

  return results;
}

interface LocalParts {
  year: number;
  month: number; // 1-indexed
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function getLocalParts(epochMs: number, timezone: string): LocalParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(epochMs));
  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const val = parts.find((p) => p.type === type)?.value ?? "0";
    return parseInt(val, 10);
  };

  let hour = get("hour");
  if (hour === 24) hour = 0;

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour,
    minute: get("minute"),
    second: get("second"),
  };
}

function getDayOfWeek(epochMs: number, timezone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  });
  const wd = formatter.format(new Date(epochMs));
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[wd] ?? 0;
}

function localPartsToEpoch(parts: LocalParts, timezone: string): number {
  // Create a date in the target timezone by finding the epoch that maps to these local parts.
  // Use a binary search / approximation approach.
  // Start with a UTC guess, then adjust.
  const guess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  // Get what that guess looks like in the target timezone
  const actualParts = getLocalParts(guess, timezone);

  // Compute hour difference and adjust
  const diffHours =
    (actualParts.hour - parts.hour + 24) % 24 > 12
      ? (actualParts.hour - parts.hour + 24) % 24 - 24
      : (actualParts.hour - parts.hour + 24) % 24;

  const adjusted = guess - diffHours * 3600_000;

  // Verify and do one more adjustment if needed (for DST edge cases)
  const verifyParts = getLocalParts(adjusted, timezone);
  if (verifyParts.hour !== parts.hour) {
    const diff2 =
      (verifyParts.hour - parts.hour + 24) % 24 > 12
        ? (verifyParts.hour - parts.hour + 24) % 24 - 24
        : (verifyParts.hour - parts.hour + 24) % 24;
    return adjusted - diff2 * 3600_000;
  }

  return adjusted;
}

function advanceTimed(
  epochMs: number,
  rule: ParsedRRule,
  timezone: string,
): number {
  const parts = getLocalParts(epochMs, timezone);

  switch (rule.freq) {
    case "DAILY":
      parts.day += rule.interval;
      break;
    case "WEEKLY":
      if (rule.byday && rule.byday.length > 0) {
        parts.day += 1;
      } else {
        parts.day += 7 * rule.interval;
      }
      break;
    case "MONTHLY":
      parts.month += rule.interval;
      break;
    case "YEARLY":
      parts.year += rule.interval;
      break;
  }

  // Normalize the date parts (e.g., day 32 of January → Feb 1)
  // by going through Date.UTC
  const normalized = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second),
  );

  return localPartsToEpoch(
    {
      year: normalized.getUTCFullYear(),
      month: normalized.getUTCMonth() + 1,
      day: normalized.getUTCDate(),
      hour: normalized.getUTCHours(),
      minute: normalized.getUTCMinutes(),
      second: normalized.getUTCSeconds(),
    },
    timezone,
  );
}
