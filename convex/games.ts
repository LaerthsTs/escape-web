import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  sessionTokenV,
  requireCompany,
  requireBookingOf,
} from "./companySession";

// ═══════════════════════════════════════════════════════════════════════
// End-of-game QR
// ═══════════════════════════════════════════════════════════════════════
// 1. The room calls `completeGame` with the real number of players. That marks
//    the booking completed and returns a token to show as a QR.
// 2. Players scan it: `previewClaim` (no login) shows what game it is, then
//    `claimSeat` adds it to their profile.
// 3. The token stops working after 30 minutes or when all seats are taken.

export const CLAIM_WINDOW_MS = 30 * 60 * 1000;

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Room marks a booking as played and gets a 30-minute QR token. */
export const completeGame = mutation({
  args: {
    bookingId: v.id("bookings"),
    actualPlayers: v.number(),
    hintsUsed: v.optional(v.number()),
    escapeSeconds: v.optional(v.number()),
    escaped: v.optional(v.boolean()),
    companyId: v.optional(v.id("companies")),
    sessionToken: sessionTokenV,
  },
  handler: async (ctx, args) => {
    const company = await requireCompany(
      ctx,
      { companyId: args.companyId, sessionToken: args.sessionToken },
      "games:completeGame"
    );
    const booking = await requireBookingOf(ctx, company, args.bookingId);
    if (booking.status === "cancelled" || booking.status === "pending_payment") {
      throw new ConvexError("This booking cannot be completed");
    }
    const players = Math.floor(args.actualPlayers);
    if (!Number.isFinite(players) || players < 1 || players > 50) {
      throw new ConvexError("Invalid number of players");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("gameSessions")
      .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
      .first();

    let gameId;
    if (existing) {
      // The room can reopen the QR: new token, new 30 minutes. Seats already
      // claimed stay claimed, and the total can only be raised past them.
      gameId = existing._id;
      await ctx.db.patch(existing._id, {
        claimToken: newToken(),
        claimExpiresAt: now + CLAIM_WINDOW_MS,
        seatsTotal: Math.max(players, existing.seatsClaimed),
        hintsUsed: args.hintsUsed ?? existing.hintsUsed,
        escapeSeconds: args.escapeSeconds ?? existing.escapeSeconds,
        escaped: args.escaped ?? existing.escaped,
      });
    } else {
      gameId = await ctx.db.insert("gameSessions", {
        bookingId: booking._id,
        roomId: booking.roomId,
        companyId: booking.companyId ?? company._id,
        completedAt: now,
        seatsTotal: players,
        seatsClaimed: 0,
        hintsUsed: args.hintsUsed,
        escapeSeconds: args.escapeSeconds,
        escaped: args.escaped,
        claimToken: newToken(),
        claimExpiresAt: now + CLAIM_WINDOW_MS,
      });
    }

    if (booking.status !== "completed") {
      await ctx.db.patch(booking._id, { status: "completed" });
    }

    // The booker is a confirmed participant without scanning.
    if (booking.userId) {
      const already = await ctx.db
        .query("gameParticipants")
        .withIndex("by_game_user", (q) => q.eq("gameId", gameId).eq("userId", booking.userId!))
        .first();
      if (!already) {
        await ctx.db.insert("gameParticipants", {
          gameId,
          userId: booking.userId,
          roomId: booking.roomId,
          companyId: booking.companyId ?? company._id,
          status: "confirmed",
          joinedAt: now,
        });
        const g = (await ctx.db.get(gameId))!;
        await ctx.db.patch(gameId, { seatsClaimed: g.seatsClaimed + 1 });
      }
    }

    const game = (await ctx.db.get(gameId))!;
    return {
      gameId,
      claimToken: game.claimToken,
      claimExpiresAt: game.claimExpiresAt,
      seatsTotal: game.seatsTotal,
      seatsClaimed: game.seatsClaimed,
    };
  },
});

/** For the room's QR screen: how many have scanned, when it expires. */
export const getGameForBooking = query({
  args: {
    bookingId: v.id("bookings"),
    companyId: v.optional(v.id("companies")),
    sessionToken: sessionTokenV,
  },
  handler: async (ctx, args) => {
    const company = await requireCompany(
      ctx,
      { companyId: args.companyId, sessionToken: args.sessionToken },
      "games:getGameForBooking"
    );
    await requireBookingOf(ctx, company, args.bookingId);
    const game = await ctx.db
      .query("gameSessions")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .first();
    if (!game) return null;
    return {
      gameId: game._id,
      claimToken: game.claimToken,
      claimExpiresAt: game.claimExpiresAt,
      seatsTotal: game.seatsTotal,
      seatsClaimed: game.seatsClaimed,
      expired: Date.now() > game.claimExpiresAt,
    };
  },
});

/** What a scanned QR is about. Safe without login: no player data. */
export const previewClaim = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("gameSessions")
      .withIndex("by_claimToken", (q) => q.eq("claimToken", args.token))
      .first();
    if (!game) return { state: "invalid" as const };
    const room = await ctx.db.get(game.roomId);
    const booking = await ctx.db.get(game.bookingId);
    const base = {
      roomName: room?.title,
      date: booking?.date,
      time: booking?.time,
      seatsLeft: Math.max(0, game.seatsTotal - game.seatsClaimed),
      expiresAt: game.claimExpiresAt,
    };
    if (Date.now() > game.claimExpiresAt) return { state: "expired" as const, ...base };
    if (game.seatsClaimed >= game.seatsTotal) return { state: "full" as const, ...base };
    return { state: "open" as const, ...base };
  },
});

/** A player scans the room's QR and the game enters their profile. */
export const claimSeat = mutation({
  args: { token: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query("gameSessions")
      .withIndex("by_claimToken", (q) => q.eq("claimToken", args.token))
      .first();
    if (!game) throw new ConvexError("This QR code is not valid");

    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("User not found");

    const already = await ctx.db
      .query("gameParticipants")
      .withIndex("by_game_user", (q) => q.eq("gameId", game._id).eq("userId", args.userId))
      .first();
    if (already) return { result: "already_in" as const, gameId: game._id };

    if (Date.now() > game.claimExpiresAt) throw new ConvexError("This QR code has expired");
    if (game.seatsClaimed >= game.seatsTotal) throw new ConvexError("All seats for this game are taken");

    await ctx.db.insert("gameParticipants", {
      gameId: game._id,
      userId: args.userId,
      roomId: game.roomId,
      companyId: game.companyId,
      status: "confirmed",
      joinedAt: Date.now(),
    });
    await ctx.db.patch(game._id, { seatsClaimed: game.seatsClaimed + 1 });
    return { result: "joined" as const, gameId: game._id };
  },
});

/** A player's shared game history (games they booked and games they scanned into). */
export const listForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("gameParticipants")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    const out = [];
    for (const p of rows) {
      const game = await ctx.db.get(p.gameId);
      if (!game) continue;
      const [room, booking] = await Promise.all([
        ctx.db.get(game.roomId),
        ctx.db.get(game.bookingId),
      ]);
      out.push({
        gameId: game._id,
        status: p.status,
        roomId: game.roomId,
        roomName: room?.title,
        date: booking?.date,
        time: booking?.time,
        players: game.seatsTotal,
        escaped: game.escaped,
        escapeSeconds: game.escapeSeconds,
        hintsUsed: game.hintsUsed,
        completedAt: game.completedAt,
      });
    }
    return out.sort((a, b) => b.completedAt - a.completedAt);
  },
});