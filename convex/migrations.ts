import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { hashPassword, isHashedPassword } from "./passwordUtils";

/**
 * Checklist item 20: turn any old plaintext passwords (users and companies)
 * into PBKDF2 hashes. Login no longer accepts plaintext, so run this right
 * after deploying:
 *
 *   npx.cmd convex run migrations:hashLegacyPasswords
 *
 * It works in small batches (hashing is slow on purpose) and schedules itself
 * until nothing is left. Running it again is harmless.
 */
const BATCH = 5;

export const hashLegacyPasswords = internalMutation({
  args: { done: v.optional(v.number()) },
  handler: async (ctx, args) => {
    let done = args.done ?? 0;
    let left = BATCH;

    for (const u of await ctx.db.query("users").collect()) {
      if (left === 0) break;
      if (u.password && !isHashedPassword(u.password)) {
        await ctx.db.patch(u._id, { password: await hashPassword(u.password) });
        done++;
        left--;
      }
    }
    for (const c of await ctx.db.query("companies").collect()) {
      if (left === 0) break;
      if (c.password && !isHashedPassword(c.password)) {
        await ctx.db.patch(c._id, { password: await hashPassword(c.password) });
        done++;
        left--;
      }
    }

    if (left === 0) {
      // Batch was full: there may be more.
      await ctx.scheduler.runAfter(0, internal.migrations.hashLegacyPasswords, { done });
    } else {
      console.log(`[migrations] hashLegacyPasswords finished: ${done} password(s) hashed`);
    }
    return { done, finished: left > 0 };
  },
});
