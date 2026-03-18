import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema.js";

/**
 * Create a typed Drizzle instance backed by a Cloudflare D1 binding.
 */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

// ---------------------------------------------------------------------------
// ULID generator (avoids external dependency)
// ---------------------------------------------------------------------------

const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Encode a 48-bit millisecond timestamp into 10 Crockford Base32 characters.
 */
function encodeTime(now: number): string {
  let chars = "";
  let ts = now;
  for (let i = 0; i < 10; i++) {
    chars = CROCKFORD_BASE32[ts & 31] + chars;
    ts = Math.floor(ts / 32);
  }
  return chars;
}

/**
 * Generate 16 random Crockford Base32 characters.
 */
function encodeRandom(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let chars = "";
  for (let i = 0; i < 16; i++) {
    // Use 5 bits at a time from the random bytes (80 bits total = 10 bytes)
    const byteIndex = Math.floor((i * 5) / 8);
    const bitOffset = (i * 5) % 8;
    let value = bytes[byteIndex] >> bitOffset;
    if (bitOffset > 3) {
      // Need bits from the next byte
      value |= (bytes[byteIndex + 1] ?? 0) << (8 - bitOffset);
    }
    chars += CROCKFORD_BASE32[value & 31];
  }
  return chars;
}

/**
 * Generate a ULID (Universally Unique Lexicographically Sortable Identifier).
 *
 * Format: 10 chars timestamp (ms) + 16 chars randomness, Crockford Base32.
 */
export function generateId(): string {
  return encodeTime(Date.now()) + encodeRandom();
}
