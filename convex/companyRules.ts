import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Only companies the UNLOCKED team approved are public: their rooms show up
 * on the site and can be booked. Until then a company can set up its rooms
 * in the portal, but nobody else sees them or can pay them. Declined or
 * pending companies stay hidden. (Companies from before onboarding existed
 * have no status and count as approved, as in merch.companyIsLive.)
 */
export function companyIsPublic(c: Doc<"companies"> | null | undefined): boolean {
  return !!c && (c.onboardingStatus === undefined || c.onboardingStatus === "approved");
}

/** Keeps only rooms whose company is public (rooms without a company stay). */
export async function filterPublicRooms<T extends { companyId?: Id<"companies"> }>(
  ctx: QueryCtx | MutationCtx,
  rooms: T[]
): Promise<T[]> {
  const ids = Array.from(new Set(rooms.map((r) => r.companyId).filter((x): x is Id<"companies"> => !!x)));
  const companies = await Promise.all(ids.map((id) => ctx.db.get(id)));
  const ok = new Set(ids.filter((_, i) => companyIsPublic(companies[i])).map((id) => id.toString()));
  return rooms.filter((r) => !r.companyId || ok.has(r.companyId.toString()));
}

/** Throws unless the room's company is public. Use before creating any booking. */
export async function assertRoomOpen(
  ctx: QueryCtx | MutationCtx,
  room: { companyId?: Id<"companies"> }
): Promise<void> {
  if (!room.companyId) return;
  const company = await ctx.db.get(room.companyId);
  if (!companyIsPublic(company)) throw new ConvexError("Room is not available");
}
