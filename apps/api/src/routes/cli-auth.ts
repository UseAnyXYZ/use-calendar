import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { apiTokens, cliAuthSessions, generateId } from "@useanysh/calendar-db";
import { cliAuthApproveSchema } from "@useanysh/calendar-contracts";
import { generateToken, hashToken } from "../lib/crypto.js";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../types.js";

const cliAuth = new Hono<AppEnv>();

function generateCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  let hex = "";
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, "0");
  }
  return hex;
}

// Start a CLI auth session
cliAuth.post("/start", async (c) => {
  const db = c.get("db");
  const now = Date.now();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes

  const id = generateId();
  const code = generateCode();

  await db.insert(cliAuthSessions).values({
    id,
    code,
    status: "pending",
    expiresAt,
    createdAt: now,
  });

  return c.json({
    code,
    expiresAt: new Date(expiresAt).toISOString(),
  });
});

// Poll for CLI auth session status
cliAuth.get("/poll", async (c) => {
  const code = c.req.query("code");
  if (!code) {
    return c.json(
      { code: "VALIDATION_ERROR", message: "Missing code parameter", requestId: c.get("requestId") },
      400,
    );
  }

  const db = c.get("db");
  const session = await db
    .select()
    .from(cliAuthSessions)
    .where(eq(cliAuthSessions.code, code))
    .get();

  if (!session || session.expiresAt < Date.now()) {
    return c.json({ status: "expired" as const });
  }

  if (session.status === "pending") {
    return c.json({ status: "pending" as const });
  }

  if (session.status === "completed" && session.tokenValue) {
    const token = session.tokenValue;

    // Clear the raw token so it can only be retrieved once
    await db
      .update(cliAuthSessions)
      .set({ tokenValue: null })
      .where(eq(cliAuthSessions.id, session.id));

    return c.json({
      status: "completed" as const,
      token,
      tokenName: "CLI Login",
    });
  }

  return c.json({ status: "expired" as const });
});

// Approve a CLI auth session (requires authenticated user)
cliAuth.post("/approve", requireAuth, async (c) => {
  const body = await c.req.json();
  const parsed = cliAuthApproveSchema.safeParse(body);
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

  const { code } = parsed.data;
  const userId = c.get("userId")!;
  const db = c.get("db");
  const now = Date.now();

  const session = await db
    .select()
    .from(cliAuthSessions)
    .where(eq(cliAuthSessions.code, code))
    .get();

  if (!session || session.status !== "pending" || session.expiresAt < now) {
    return c.json(
      {
        code: "NOT_FOUND",
        message: "Invalid or expired CLI auth session",
        requestId: c.get("requestId"),
      },
      404,
    );
  }

  // Generate a PAT
  const rawToken = generateToken();
  const tokenHash = await hashToken(rawToken);
  const tokenId = generateId();
  const tokenName = "CLI Login";

  await db.insert(apiTokens).values({
    id: tokenId,
    userId,
    name: tokenName,
    tokenHash,
    createdAt: now,
  });

  // Mark session as completed with the raw token
  await db
    .update(cliAuthSessions)
    .set({
      status: "completed",
      tokenValue: rawToken,
      userId,
    })
    .where(eq(cliAuthSessions.id, session.id));

  return c.json({ success: true });
});

export { cliAuth };
