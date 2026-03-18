import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { eq, and } from "drizzle-orm";
import { sessions, apiTokens } from "@use-calendar/db";
import { hashToken } from "../lib/crypto.js";
import type { AppEnv } from "../types.js";

/**
 * Authenticate via session cookie.
 * Sets `userId` in context if a valid, non-expired session is found.
 * Returns 401 otherwise.
 */
export const sessionAuth = createMiddleware<AppEnv>(async (c, next) => {
  const sessionId = getCookie(c, "session_id");
  if (!sessionId) {
    return c.json(
      {
        code: "UNAUTHORIZED",
        message: "No session cookie provided",
        requestId: c.get("requestId"),
      },
      401,
    );
  }

  const db = c.get("db");
  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();

  if (!session || session.expiresAt < Date.now()) {
    return c.json(
      {
        code: "UNAUTHORIZED",
        message: "Invalid or expired session",
        requestId: c.get("requestId"),
      },
      401,
    );
  }

  c.set("userId", session.userId);
  await next();
});

/**
 * Authenticate via Authorization: Bearer token.
 * Sets `userId` in context and updates lastUsedAt.
 * Returns 401 otherwise.
 */
export const tokenAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json(
      {
        code: "UNAUTHORIZED",
        message: "No bearer token provided",
        requestId: c.get("requestId"),
      },
      401,
    );
  }

  const rawToken = authHeader.slice(7);
  const tokenHash = await hashToken(rawToken);
  const db = c.get("db");

  const token = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.tokenHash, tokenHash))
    .get();

  if (!token) {
    return c.json(
      {
        code: "UNAUTHORIZED",
        message: "Invalid API token",
        requestId: c.get("requestId"),
      },
      401,
    );
  }

  // Update lastUsedAt
  await db
    .update(apiTokens)
    .set({ lastUsedAt: Date.now() })
    .where(eq(apiTokens.id, token.id));

  c.set("userId", token.userId);
  await next();
});

/**
 * Try session auth first, then token auth. Returns 401 if neither works.
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  // Try session cookie first
  const sessionId = getCookie(c, "session_id");
  if (sessionId) {
    const db = c.get("db");
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (session && session.expiresAt >= Date.now()) {
      c.set("userId", session.userId);
      await next();
      return;
    }
  }

  // Try bearer token
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const rawToken = authHeader.slice(7);
    const tokenHash = await hashToken(rawToken);
    const db = c.get("db");

    const token = await db
      .select()
      .from(apiTokens)
      .where(eq(apiTokens.tokenHash, tokenHash))
      .get();

    if (token) {
      await db
        .update(apiTokens)
        .set({ lastUsedAt: Date.now() })
        .where(eq(apiTokens.id, token.id));

      c.set("userId", token.userId);
      await next();
      return;
    }
  }

  return c.json(
    {
      code: "UNAUTHORIZED",
      message: "Authentication required",
      requestId: c.get("requestId"),
    },
    401,
  );
});
