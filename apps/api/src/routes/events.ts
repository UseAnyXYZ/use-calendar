import { Hono } from "hono";
import { eq, and, gte, lte, ne, or } from "drizzle-orm";
import { events, calendars, generateId } from "@use-calendar/db";
import { createEventSchema, updateEventSchema } from "@use-calendar/contracts";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv, AppDb } from "../types.js";

const eventsRouter = new Hono<AppEnv>();

eventsRouter.use("/*", requireAuth);

/** Helper: get the user's calendar (first one). */
async function getUserCalendar(
  db: AppDb,
  userId: string,
) {
  return db
    .select()
    .from(calendars)
    .where(eq(calendars.userId, userId))
    .get();
}

/** Convert a DB event row to the API response format. */
function formatEvent(row: typeof events.$inferSelect) {
  return {
    id: row.id,
    calendarId: row.calendarId,
    title: row.title,
    description: row.description,
    location: row.location,
    timezone: row.timezone,
    startTime: row.startTime ? new Date(row.startTime).toISOString() : null,
    endTime: row.endTime ? new Date(row.endTime).toISOString() : null,
    startDate: row.startDate,
    endDateExclusive: row.endDateExclusive,
    isAllDay: row.isAllDay === 1,
    status: row.status as "confirmed" | "cancelled",
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

// List events in a date range
eventsRouter.get("/", async (c) => {
  const userId = c.get("userId")!;
  const db = c.get("db");

  const from = c.req.query("from");
  const to = c.req.query("to");
  const includeCancelled = c.req.query("includeCancelled") === "true";

  if (!from || !to) {
    return c.json(
      {
        code: "VALIDATION_ERROR",
        message: "Both 'from' and 'to' query parameters are required",
        requestId: c.get("requestId"),
      },
      400,
    );
  }

  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();

  const calendar = await getUserCalendar(db, userId);
  if (!calendar) {
    return c.json([]);
  }

  // Build conditions
  const conditions = [eq(events.calendarId, calendar.id)];

  if (!includeCancelled) {
    conditions.push(ne(events.status, "cancelled"));
  }

  // For timed events: startTime < toMs AND endTime > fromMs (overlap)
  // For all-day events: startDate < toDateStr AND endDateExclusive > fromDateStr (overlap)
  const fromDateStr = from.slice(0, 10); // YYYY-MM-DD
  const toDateStr = to.slice(0, 10);

  const timedOverlap = and(lte(events.startTime, toMs), gte(events.endTime, fromMs));
  const allDayOverlap = and(
    lte(events.startDate, toDateStr),
    gte(events.endDateExclusive, fromDateStr),
  );

  conditions.push(or(timedOverlap, allDayOverlap)!);

  const rows = await db
    .select()
    .from(events)
    .where(and(...conditions));

  return c.json(rows.map(formatEvent));
});

// Create a new event
eventsRouter.post("/", async (c) => {
  const userId = c.get("userId")!;
  const db = c.get("db");

  const body = await c.req.json();
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: parsed.error.flatten(),
        requestId: c.get("requestId"),
      },
      400,
    );
  }

  const calendar = await getUserCalendar(db, userId);
  if (!calendar) {
    return c.json(
      {
        code: "NOT_FOUND",
        message: "No calendar found for user",
        requestId: c.get("requestId"),
      },
      404,
    );
  }

  const data = parsed.data;
  const now = Date.now();
  const id = generateId();

  const newEvent = {
    id,
    calendarId: calendar.id,
    title: data.title,
    description: data.description ?? null,
    location: data.location ?? null,
    timezone: data.timezone ?? null,
    startTime: data.startTime ? new Date(data.startTime).getTime() : null,
    endTime: data.endTime ? new Date(data.endTime).getTime() : null,
    startDate: data.startDate ?? null,
    endDateExclusive: data.endDateExclusive ?? null,
    isAllDay: data.isAllDay ? 1 : 0,
    status: "confirmed" as const,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(events).values(newEvent);

  return c.json(formatEvent(newEvent), 201);
});

// Get a single event
eventsRouter.get("/:id", async (c) => {
  const eventId = c.req.param("id");
  const userId = c.get("userId")!;
  const db = c.get("db");

  const calendar = await getUserCalendar(db, userId);
  if (!calendar) {
    return c.json(
      {
        code: "NOT_FOUND",
        message: "Event not found",
        requestId: c.get("requestId"),
      },
      404,
    );
  }

  const event = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.calendarId, calendar.id)))
    .get();

  if (!event) {
    return c.json(
      {
        code: "NOT_FOUND",
        message: "Event not found",
        requestId: c.get("requestId"),
      },
      404,
    );
  }

  return c.json(formatEvent(event));
});

// Update an event
eventsRouter.patch("/:id", async (c) => {
  const eventId = c.req.param("id");
  const userId = c.get("userId")!;
  const db = c.get("db");

  const body = await c.req.json();
  const parsed = updateEventSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: parsed.error.flatten(),
        requestId: c.get("requestId"),
      },
      400,
    );
  }

  const calendar = await getUserCalendar(db, userId);
  if (!calendar) {
    return c.json(
      {
        code: "NOT_FOUND",
        message: "Event not found",
        requestId: c.get("requestId"),
      },
      404,
    );
  }

  const existing = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.calendarId, calendar.id)))
    .get();

  if (!existing) {
    return c.json(
      {
        code: "NOT_FOUND",
        message: "Event not found",
        requestId: c.get("requestId"),
      },
      404,
    );
  }

  const data = parsed.data;
  const now = Date.now();

  const updates: Record<string, unknown> = { updatedAt: now };

  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.location !== undefined) updates.location = data.location;
  if (data.timezone !== undefined) updates.timezone = data.timezone;
  if (data.isAllDay !== undefined) updates.isAllDay = data.isAllDay ? 1 : 0;
  if (data.startTime !== undefined)
    updates.startTime = data.startTime ? new Date(data.startTime).getTime() : null;
  if (data.endTime !== undefined)
    updates.endTime = data.endTime ? new Date(data.endTime).getTime() : null;
  if (data.startDate !== undefined) updates.startDate = data.startDate;
  if (data.endDateExclusive !== undefined)
    updates.endDateExclusive = data.endDateExclusive;

  await db
    .update(events)
    .set(updates)
    .where(and(eq(events.id, eventId), eq(events.calendarId, calendar.id)));

  // Re-fetch the updated event
  const updated = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .get();

  return c.json(formatEvent(updated!));
});

// Delete (soft) an event
eventsRouter.delete("/:id", async (c) => {
  const eventId = c.req.param("id");
  const userId = c.get("userId")!;
  const db = c.get("db");

  const calendar = await getUserCalendar(db, userId);
  if (!calendar) {
    return c.json(
      {
        code: "NOT_FOUND",
        message: "Event not found",
        requestId: c.get("requestId"),
      },
      404,
    );
  }

  const existing = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.calendarId, calendar.id)))
    .get();

  if (!existing) {
    return c.json(
      {
        code: "NOT_FOUND",
        message: "Event not found",
        requestId: c.get("requestId"),
      },
      404,
    );
  }

  const now = Date.now();
  await db
    .update(events)
    .set({ status: "cancelled", updatedAt: now })
    .where(and(eq(events.id, eventId), eq(events.calendarId, calendar.id)));

  return c.json({ success: true });
});

export { eventsRouter };
