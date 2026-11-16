import { ConvexError } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

/**
 * Rate limits (checklist item 13).
 *
 * Convex mutations don't see the caller's IP, so limits are per email, per
 * account, per room, or global. Two tools:
 *
 * - `rateLimit`: caps how often something succeeds (bookings, alerts, sign-ups).
 *   It throws when over the cap. A thrown error rolls the whole mutation back,
 *   so only calls that went through are counted. That is fine for a volume cap.
 *
 * - `failureLock` / `recordFailure` / `clearFailures`: wrong-password lockout.
 *   The caller must RETURN a failure instead of throwing, or the failed attempt
 *   is rolled back and never counted (same as users.loginAttempt).
 */

export const TOO_MANY_ATTEMPTS = "TOO_MANY_ATTEMPTS";

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;

export async function rateLimit(
  ctx: MutationCtx,
  key: string,
  max: number,
  windowMs: number
): Promise<void> {
  const now = Date.now();
  const row = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (!row) {
    await ctx.db.insert("rateLimits", { key, count: 1, windowStart: now });
    return;
  }
  if (now - row.windowStart >= windowMs) {
    await ctx.db.patch(row._id, { count: 1, windowStart: now });
    return;
  }
  if (row.count >= max) throw new ConvexError(TOO_MANY_ATTEMPTS);
  await ctx.db.patch(row._id, { count: row.count + 1 });
}

/**
 * Like rateLimit, but returns false instead of throwing (for counters where
 * going over the cap should just be ignored). Window is one hour.
 */
export async function underCap(ctx: MutationCtx, key: string, maxPerHour: number): Promise<boolean> {
  try {
    await rateLimit(ctx, key, maxPerHour, HOUR);
    return true;
  } catch {
    return false;
  }
}

// Wrong-password lockout, shared by company and admin login.
// (Player login has its own copy in users.loginAttempt.)
const MAX_FAILURES = 5;
const FAILURE_WINDOW_MS = 15 * MINUTE;
const LOCK_MS = 15 * MINUTE;

/** Returns the attempt row (or null) and whether the key is locked right now. */
export async function failureLock(
  ctx: MutationCtx,
  key: string
): Promise<{ locked: boolean; attempt: Doc<"loginAttempts"> | null }> {
  const attempt = await ctx.db
    .query("loginAttempts")
    .withIndex("by_email", (q) => q.eq("email", key))
    .first();
  const locked = !!attempt?.lockedUntil && attempt.lockedUntil > Date.now();
  return { locked, attempt };
}

export async function recordFailure(
  ctx: MutationCtx,
  key: string,
  attempt: Doc<"loginAttempts"> | null
): Promise<void> {
  const now = Date.now();
  const inWindow = attempt && now - attempt.windowStart < FAILURE_WINDOW_MS;
  const failures = (inWindow ? attempt.failures : 0) + 1;
  const fields = {
    failures,
    windowStart: inWindow ? attempt.windowStart : now,
    lockedUntil: failures >= MAX_FAILURES ? now + LOCK_MS : undefined,
  };
  if (attempt) await ctx.db.patch(attempt._id, fields);
  else await ctx.db.insert("loginAttempts", { email: key, ...fields });
}

export async function clearFailures(
  ctx: MutationCtx,
  attempt: Doc<"loginAttempts"> | null
): Promise<void> {
  if (attempt) await ctx.db.delete(attempt._id);
}

/** Daily cleanup of old counters (see crons.ts). */
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * HOUR;
    const limits = await ctx.db.query("rateLimits").take(2000);
    for (const r of limits) if (r.windowStart < cutoff) await ctx.db.delete(r._id);
    // Sign-ups whose code was never entered (see signupCodes.ts).
    const pending = await ctx.db.query("pendingSignups").take(2000);
    for (const p of pending) if (p.expiresAt < cutoff) await ctx.db.delete(p._id);
    const resets = await ctx.db.query("passwordResets").take(2000);
    for (const r of resets) if (r.expiresAt < cutoff) await ctx.db.delete(r._id);
    const attempts = await ctx.db.query("loginAttempts").take(2000);
    for (const a of attempts) {
      if (a.windowStart < cutoff && (!a.lockedUntil || a.lockedUntil < Date.now())) {
        await ctx.db.delete(a._id);
      }
    }
  },
});
