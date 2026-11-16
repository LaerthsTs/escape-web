import type { MutationCtx } from "./_generated/server";

/**
 * Human codes for bookings and merch orders (shown on tickets and in emails).
 * Random, not taken from the clock: the old codes repeated about every 25
 * days and two bookings in the same millisecond got the same code.
 * No 0/O or 1/I so they are easy to read out at the venue.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomCode(prefix: string, length = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `${prefix}-${out}`;
}

/** A booking code that no other booking has. */
export async function newBookingCode(ctx: MutationCtx, prefix: "UNL" | "WEB" | "EXT"): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = randomCode(prefix);
    const taken = await ctx.db
      .query("bookings")
      .withIndex("by_bookingCode", (q) => q.eq("bookingCode", code))
      .first();
    if (!taken) return code;
  }
  throw new Error("Could not create a booking code, please try again");
}
