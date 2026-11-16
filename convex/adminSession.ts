import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { hashPassword, verifyPassword } from "./passwordUtils";
import { failureLock, recordFailure, clearFailures, TOO_MANY_ATTEMPTS } from "./rateLimit";

// Admin sessions: same idea as companySession.ts, but for platform admins.
// The raw token lives on the client; only its SHA-256 is stored.

export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours, not sliding
export const ADMIN_SESSION_EXPIRED = "Your admin session has expired. Please log in again.";

type Ctx = QueryCtx | MutationCtx;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return toHex(new Uint8Array(digest));
}

/** Use at the top of every admin function. Returns the admin or throws. */
export async function requireAdminSession(
  ctx: Ctx,
  token: string | undefined
): Promise<Doc<"admins">> {
  if (!token || token.length > 128) throw new ConvexError(ADMIN_SESSION_EXPIRED);
  const tokenHash = await hashToken(token);
  const session = await ctx.db
    .query("adminSessions")
    .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
    .first();
  if (!session || session.expiresAt < Date.now()) throw new ConvexError(ADMIN_SESSION_EXPIRED);
  const admin = await ctx.db.get(session.adminId);
  if (!admin) throw new ConvexError(ADMIN_SESSION_EXPIRED);
  return admin;
}

/** Terminal only: npx convex run adminSession:createAdmin '{"email":"...","password":"..."}' */
export const createAdmin = internalMutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    if (!email.includes("@")) throw new Error("Invalid email");
    if (args.password.length < 12) throw new Error("Password must be at least 12 characters");
    const existing = await ctx.db
      .query("admins")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) throw new Error("Admin already exists");
    await ctx.db.insert("admins", {
      email,
      passwordHash: await hashPassword(args.password),
      createdAt: Date.now(),
    });
    return "Admin created";
  },
});

/**
 * Public: email + password -> session token. Same error for every failure.
 * Failures are returned as { error } (not thrown) so they are saved and count
 * towards the lockout (see rateLimit.ts).
 */
export const login = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const lockKey = `admin:${email}`;
    const { locked, attempt } = await failureLock(ctx, lockKey);
    if (locked) return { error: TOO_MANY_ATTEMPTS };
    const admin = await ctx.db
      .query("admins")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    // Always do the same amount of work so the answer time does not reveal if the email exists.
    const ok = admin
      ? await verifyPassword(args.password, admin.passwordHash)
      : (await hashPassword(args.password), false);
    if (!admin || !ok) {
      await recordFailure(ctx, lockKey, attempt);
      return { error: "Invalid email or password" };
    }
    await clearFailures(ctx, attempt);

    const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
    const now = Date.now();
    const old = await ctx.db
      .query("adminSessions")
      .withIndex("by_admin", (q) => q.eq("adminId", admin._id))
      .collect();
    for (const s of old) if (s.expiresAt < now) await ctx.db.delete(s._id);
    await ctx.db.insert("adminSessions", {
      adminId: admin._id,
      tokenHash: await hashToken(token),
      createdAt: now,
      expiresAt: now + ADMIN_SESSION_TTL_MS,
    });
    return { token, email: admin.email };
  },
});

export const logout = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    if (args.sessionToken.length > 128) return;
    const tokenHash = await hashToken(args.sessionToken);
    const row = await ctx.db
      .query("adminSessions")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .first();
    if (row) await ctx.db.delete(row._id);
  },
});

/** For actions (they cannot read the database): checks the admin session first. */
export const verify = internalQuery({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdminSession(ctx, args.sessionToken);
    return { email: admin.email };
  },
});