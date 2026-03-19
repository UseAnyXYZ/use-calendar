import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import {
  calendars,
  calendarFeeds,
  events,
  generateId,
} from "@useanysh/calendar-db";
import { serializeCalendar } from "@useanysh/calendar-ics";
import type { IcsEvent } from "@useanysh/calendar-ics";
import { generateFeedToken, hashToken } from "../lib/crypto.js";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";

// API routes (require auth)
const feedApi = new Hono<AppEnv>();

feedApi.use("/*", requireAuth);

// Get current calendar feed info
feedApi.get("/", async (c) => {
  const userId = c.get("userId")!;
  const db = c.get("db");

  const calendar = await db
    .select()
    .from(calendars)
    .where(eq(calendars.userId, userId))
    .get();

  if (!calendar) {
    return c.json(
      {
        code: "NOT_FOUND",
        message: "No calendar found",
        requestId: c.get("requestId"),
      },
      404,
    );
  }

  const feed = await db
    .select()
    .from(calendarFeeds)
    .where(eq(calendarFeeds.calendarId, calendar.id))
    .get();

  if (!feed) {
    return c.json(
      {
        code: "NOT_FOUND",
        message: "No calendar feed configured. Use POST /api/calendar-feed/rotate to create one.",
        requestId: c.get("requestId"),
      },
      404,
    );
  }

  // We can't recover the raw token from the hash, so we return a placeholder
  // The actual URL is only shown when rotating
  const origin = new URL(c.req.url).origin;
  return c.json({
    url: `${origin}/calendar/<feed-token>.ics`,
    hasToken: false,
    calendarName: calendar.name,
    createdAt: new Date(feed.createdAt).toISOString(),
  });
});

// Rotate (create or replace) the calendar feed token
feedApi.post("/rotate", async (c) => {
  const userId = c.get("userId")!;
  const db = c.get("db");

  const calendar = await db
    .select()
    .from(calendars)
    .where(eq(calendars.userId, userId))
    .get();

  if (!calendar) {
    return c.json(
      {
        code: "NOT_FOUND",
        message: "No calendar found",
        requestId: c.get("requestId"),
      },
      404,
    );
  }

  // Delete any existing feed for this calendar
  await db
    .delete(calendarFeeds)
    .where(eq(calendarFeeds.calendarId, calendar.id));

  // Create new feed token
  const rawFeedToken = generateFeedToken();
  const feedTokenHash = await hashToken(rawFeedToken);
  const now = Date.now();

  await db.insert(calendarFeeds).values({
    id: generateId(),
    calendarId: calendar.id,
    feedTokenHash,
    createdAt: now,
  });

  const origin = new URL(c.req.url).origin;
  return c.json({
    url: `${origin}/calendar/${rawFeedToken}.ics`,
    hasToken: true,
    calendarName: calendar.name,
    createdAt: new Date(now).toISOString(),
  });
});

// Public feed route (no auth)
const feedPublic = new Hono<AppEnv>();

feedPublic.get("/:feedToken{.+\\.ics$}", async (c) => {
  const rawFeedToken = c.req.param("feedToken").replace(/\.ics$/, "");
  const db = c.get("db");

  const feedTokenHash = await hashToken(rawFeedToken);

  const feed = await db
    .select()
    .from(calendarFeeds)
    .where(eq(calendarFeeds.feedTokenHash, feedTokenHash))
    .get();

  if (!feed) {
    return c.json(
      {
        code: "NOT_FOUND",
        message: "Calendar feed not found",
        requestId: c.get("requestId"),
      },
      404,
    );
  }

  // Get the calendar
  const calendar = await db
    .select()
    .from(calendars)
    .where(eq(calendars.id, feed.calendarId))
    .get();

  if (!calendar) {
    return c.json(
      {
        code: "NOT_FOUND",
        message: "Calendar not found",
        requestId: c.get("requestId"),
      },
      404,
    );
  }

  // Get ALL events (including cancelled for proper ICS representation)
  const calendarEvents = await db
    .select()
    .from(events)
    .where(eq(events.calendarId, calendar.id));

  // Map to IcsEvent format
  const icsEvents: IcsEvent[] = calendarEvents.map((e) => ({
    uid: e.id,
    summary: e.title,
    description: e.description ?? undefined,
    location: e.location ?? undefined,
    isAllDay: e.isAllDay === 1,
    startTime: e.startTime ?? undefined,
    endTime: e.endTime ?? undefined,
    timezone: e.timezone ?? undefined,
    startDate: e.startDate ?? undefined,
    endDateExclusive: e.endDateExclusive ?? undefined,
    status: e.status as "confirmed" | "cancelled",
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }));

  const icsContent = serializeCalendar({
    name: calendar.name,
    events: icsEvents,
  });

  // Compute ETag from latest updatedAt
  const latestUpdatedAt = calendarEvents.reduce(
    (max, e) => Math.max(max, e.updatedAt),
    0,
  );
  const etag = `"${latestUpdatedAt}"`;

  // Check If-None-Match
  const ifNoneMatch = c.req.header("If-None-Match");
  if (ifNoneMatch === etag) {
    return c.body(null, 304);
  }

  return new Response(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      ETag: etag,
    },
  });
});

export { feedApi, feedPublic };
