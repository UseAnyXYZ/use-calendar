import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb, users, calendars } from "@useanysh/calendar-db";
import { auth } from "./routes/auth.js";
import { tokens } from "./routes/tokens.js";
import { eventsRouter } from "./routes/events.js";
import { feedApi, feedPublic } from "./routes/feed.js";
import { requireAuth } from "./middleware/auth.js";
import type { AppEnv } from "./types.js";

const app = new Hono<AppEnv>();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------

// Request ID
app.use("*", async (c, next) => {
  c.set("requestId", crypto.randomUUID());
  await next();
});

// Create DB instance per request
app.use("*", async (c, next) => {
  c.set("db", createDb(c.env.DB));
  await next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.route("/api/auth", auth);
app.route("/api/tokens", tokens);
app.route("/api/events", eventsRouter);
app.route("/api/calendar-feed", feedApi);
app.route("/calendar", feedPublic);

// GET /api/calendar — get user's calendar info
app.get("/api/calendar", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const db = c.get("db");

  const calendar = await db
    .select()
    .from(calendars)
    .where(eq(calendars.userId, userId))
    .get();

  if (!calendar) {
    return c.json(
      { code: "NOT_FOUND", message: "No calendar found", requestId: c.get("requestId") },
      404,
    );
  }

  return c.json({
    id: calendar.id,
    name: calendar.name,
    createdAt: new Date(calendar.createdAt).toISOString(),
  });
});

// PATCH /api/calendar — rename user's calendar
app.patch("/api/calendar", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const db = c.get("db");
  const body = await c.req.json();

  const name = body.name;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return c.json(
      { code: "VALIDATION_ERROR", message: "Name is required", requestId: c.get("requestId") },
      400,
    );
  }
  if (name.length > 200) {
    return c.json(
      { code: "VALIDATION_ERROR", message: "Name must be 200 characters or less", requestId: c.get("requestId") },
      400,
    );
  }

  const calendar = await db
    .select()
    .from(calendars)
    .where(eq(calendars.userId, userId))
    .get();

  if (!calendar) {
    return c.json(
      { code: "NOT_FOUND", message: "No calendar found", requestId: c.get("requestId") },
      404,
    );
  }

  await db
    .update(calendars)
    .set({ name: name.trim() })
    .where(eq(calendars.id, calendar.id));

  return c.json({
    id: calendar.id,
    name: name.trim(),
    createdAt: new Date(calendar.createdAt).toISOString(),
  });
});

// GET /api/me — current user profile
app.get("/api/me", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const db = c.get("db");

  const user = await db
    .select({ id: users.id, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user) {
    return c.json(
      { code: "NOT_FOUND", message: "User not found", requestId: c.get("requestId") },
      404,
    );
  }

  return c.json({
    id: user.id,
    email: user.email,
    createdAt: new Date(user.createdAt).toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

app.onError((err, c) => {
  console.error(`[${c.get("requestId")}] Unhandled error:`, err);
  return c.json(
    {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      requestId: c.get("requestId"),
    },
    500,
  );
});

// ---------------------------------------------------------------------------
// 404 fallback
// ---------------------------------------------------------------------------

app.notFound((c) => {
  return c.json(
    {
      code: "NOT_FOUND",
      message: `Route not found: ${c.req.method} ${c.req.path}`,
      requestId: c.get("requestId"),
    },
    404,
  );
});

export default app;
