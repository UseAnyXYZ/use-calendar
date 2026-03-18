import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { users, sessions, calendars, generateId } from "@use-calendar/db";
import { registerSchema, loginSchema } from "@use-calendar/contracts";
import { hashPassword, generateSalt } from "../lib/crypto.js";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";

const auth = new Hono<AppEnv>();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

auth.post("/register", async (c) => {
  const body = await c.req.json();
  const parsed = registerSchema.safeParse(body);
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

  const { email, password } = parsed.data;
  const db = c.get("db");

  // Check if email already taken
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (existing) {
    return c.json(
      {
        code: "CONFLICT",
        message: "Email already registered",
        requestId: c.get("requestId"),
      },
      409,
    );
  }

  const now = Date.now();
  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);
  const userId = generateId();

  // Create user
  await db.insert(users).values({
    id: userId,
    email,
    passwordHash,
    salt,
    createdAt: now,
  });

  // Create default calendar
  await db.insert(calendars).values({
    id: generateId(),
    userId,
    name: "My Calendar",
    createdAt: now,
  });

  // Create session
  const sessionId = generateId();
  const expiresAt = now + THIRTY_DAYS_MS;
  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
    createdAt: now,
  });

  setCookie(c, "session_id", sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
  });

  return c.json({
    id: userId,
    email,
    createdAt: new Date(now).toISOString(),
  });
});

auth.post("/login", async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
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

  const { email, password } = parsed.data;
  const db = c.get("db");

  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .get();

  if (!user) {
    return c.json(
      {
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
        requestId: c.get("requestId"),
      },
      401,
    );
  }

  const passwordHash = await hashPassword(password, user.salt);
  if (passwordHash !== user.passwordHash) {
    return c.json(
      {
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
        requestId: c.get("requestId"),
      },
      401,
    );
  }

  const now = Date.now();
  const sessionId = generateId();
  const expiresAt = now + THIRTY_DAYS_MS;

  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    expiresAt,
    createdAt: now,
  });

  setCookie(c, "session_id", sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  return c.json({
    id: user.id,
    email: user.email,
    createdAt: new Date(user.createdAt).toISOString(),
  });
});

auth.post("/logout", requireAuth, async (c) => {
  const db = c.get("db");

  // We need to find and delete the current session
  // Re-read the cookie to get the session ID
  const sessionId = c.req.header("Cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("session_id="))
    ?.split("=")[1];

  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  deleteCookie(c, "session_id", { path: "/" });

  return c.json({ success: true });
});

auth.get("/me", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const db = c.get("db");

  const user = await db
    .select({ id: users.id, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user) {
    return c.json(
      {
        code: "NOT_FOUND",
        message: "User not found",
        requestId: c.get("requestId"),
      },
      404,
    );
  }

  return c.json({
    id: user.id,
    email: user.email,
    createdAt: new Date(user.createdAt).toISOString(),
  });
});

export { auth };
