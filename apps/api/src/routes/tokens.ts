import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { apiTokens } from "@useanysh/calendar-db";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";

const tokens = new Hono<AppEnv>();

tokens.use("/*", requireAuth);

// List user's API tokens
tokens.get("/", async (c) => {
  const userId = c.get("userId")!;
  const db = c.get("db");

  const userTokens = await db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      createdAt: apiTokens.createdAt,
      lastUsedAt: apiTokens.lastUsedAt,
    })
    .from(apiTokens)
    .where(eq(apiTokens.userId, userId));

  return c.json(
    userTokens.map((t) => ({
      id: t.id,
      name: t.name,
      createdAt: new Date(t.createdAt).toISOString(),
      lastUsedAt: t.lastUsedAt ? new Date(t.lastUsedAt).toISOString() : null,
    })),
  );
});

// Delete an API token
tokens.delete("/:id", async (c) => {
  const tokenId = c.req.param("id");
  const userId = c.get("userId")!;
  const db = c.get("db");

  const token = await db
    .select({ id: apiTokens.id })
    .from(apiTokens)
    .where(and(eq(apiTokens.id, tokenId), eq(apiTokens.userId, userId)))
    .get();

  if (!token) {
    return c.json(
      {
        code: "NOT_FOUND",
        message: "Token not found",
        requestId: c.get("requestId"),
      },
      404,
    );
  }

  await db
    .delete(apiTokens)
    .where(and(eq(apiTokens.id, tokenId), eq(apiTokens.userId, userId)));

  return c.body(null, 204);
});

export { tokens };
