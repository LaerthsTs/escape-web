import { ConvexError, v } from "convex/values";
import { mutation, type MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { rateLimit, HOUR, MINUTE } from "./rateLimit";

// ═══════════════════════════════════════════════════════════════════════
// 6-digit email code at sign-up (players and companies)
// ═══════════════════════════════════════════════════════════════════════
// Sign-up no longer creates the account straight away:
//   1. start*  -> checks the form, keeps it in pendingSignups, emails a code
//   2. confirm* -> right code: the account is created (email already proven)
// So nobody can open an account with an email they don't own.
// Codes last 15 minutes, 5 wrong tries kill the code, resends are limited.

export type SignupKind = "player" | "company";

const CODE_TTL_MS = 15 * MINUTE;
const MAX_TRIES = 5;
const SENDS_PER_HOUR = 5;

export const CODE_INVALID = "CODE_INVALID";
export const CODE_EXPIRED = "CODE_EXPIRED";
export const TOO_MANY_ATTEMPTS = "TOO_MANY_ATTEMPTS";

/** The old sign-ups without a code. Off unless ALLOW_LEGACY_SIGNUP=1 (for old app builds). */
export function requireLegacySignupAllowed() {
  if (process.env.ALLOW_LEGACY_SIGNUP !== "1") throw new ConvexError("UPDATE_REQUIRED");
}

function newCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, "0");
}

async function hashCode(code: string, email: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${email}:${code}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function findPending(ctx: MutationCtx, kind: SignupKind, email: string) {
  return await ctx.db
    .query("pendingSignups")
    .withIndex("by_kind_email", (q) => q.eq("kind", kind).eq("email", email))
    .first();
}

async function sendCode(ctx: MutationCtx, kind: SignupKind, email: string, lang: string | undefined) {
  await rateLimit(ctx, `signupCode:${kind}:${email}`, SENDS_PER_HOUR, HOUR);
  const code = newCode();
  await ctx.scheduler.runAfter(0, internal.email.sendSignupCode, { to: email, code, lang, kind });
  return { codeHash: await hashCode(code, email), expiresAt: Date.now() + CODE_TTL_MS };
}

/**
 * Step 1. Saves the checked form (password already hashed) and emails a code.
 * A new start for the same email replaces the earlier one.
 */
export async function startPendingSignup(
  ctx: MutationCtx,
  kind: SignupKind,
  email: string,
  data: Record<string, unknown>,
  lang?: string
): Promise<void> {
  const { codeHash, expiresAt } = await sendCode(ctx, kind, email, lang);
  const old = await findPending(ctx, kind, email);
  if (old) await ctx.db.delete(old._id);
  await ctx.db.insert("pendingSignups", {
    kind,
    email,
    data,
    lang,
    codeHash,
    expiresAt,
    attempts: 0,
    createdAt: Date.now(),
  });
}

/**
 * Step 2. Checks the code. On success returns the saved form and deletes the
 * pending row. Failures are returned (not thrown) so the try is counted.
 */
export async function takePendingSignup(
  ctx: MutationCtx,
  kind: SignupKind,
  email: string,
  code: string
): Promise<{ ok: true; row: Doc<"pendingSignups"> } | { ok: false; error: string }> {
  const row = await findPending(ctx, kind, email);
  if (!row || row.expiresAt < Date.now()) return { ok: false, error: CODE_EXPIRED };
  if (row.attempts >= MAX_TRIES) return { ok: false, error: TOO_MANY_ATTEMPTS };
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean) || (await hashCode(clean, email)) !== row.codeHash) {
    await ctx.db.patch(row._id, { attempts: row.attempts + 1 });
    return { ok: false, error: row.attempts + 1 >= MAX_TRIES ? TOO_MANY_ATTEMPTS : CODE_INVALID };
  }
  await ctx.db.delete(row._id);
  return { ok: true, row };
}

/** "Send the code again": new code, tries reset. */
export const resend = mutation({
  args: { kind: v.union(v.literal("player"), v.literal("company")), email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const row = await findPending(ctx, args.kind, email);
    // Same answer either way, so this can't be used to probe emails.
    if (!row) return { ok: true };
    const { codeHash, expiresAt } = await sendCode(ctx, args.kind, email, row.lang);
    await ctx.db.patch(row._id, { codeHash, expiresAt, attempts: 0 });
    return { ok: true };
  },
});
