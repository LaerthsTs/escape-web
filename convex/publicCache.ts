import { internalMutation, type QueryCtx } from "./_generated/server";
import { computeLeaderboard } from "./users";
import { computePlatformStats } from "./stats";
import { computeBadgeLeaderboard } from "./badges";

/**
 * Public pages (leaderboard, homepage counters, badge stats) used to load
 * every user, booking and badge on each visit (checklist item 27). Now a cron
 * computes them every 10 minutes and the public queries read one document.
 */

export async function readPublicCache<T>(ctx: QueryCtx, key: string): Promise<T | null> {
  const row = await ctx.db
    .query("publicCache")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  return row ? (row.value as T) : null;
}

export const refresh = internalMutation({
  args: {},
  handler: async (ctx) => {
    const values: Record<string, unknown> = {
      leaderboard: await computeLeaderboard(ctx, 100),
      platformStats: await computePlatformStats(ctx),
      badgeLeaderboard: await computeBadgeLeaderboard(ctx),
    };
    const now = Date.now();
    for (const [key, value] of Object.entries(values)) {
      const row = await ctx.db
        .query("publicCache")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      if (row) await ctx.db.patch(row._id, { value, updatedAt: now });
      else await ctx.db.insert("publicCache", { key, value, updatedAt: now });
    }
  },
});
