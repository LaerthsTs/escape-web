import { ConvexError } from "convex/values";

/**
 * Where Stripe/Viva may send the user back after paying (checklist item 18).
 * Without this, anyone could start a checkout whose "success" page is a fake
 * site of theirs on our payment flow.
 *
 * Allowed:
 *  - https://unlocked.gr and https://<anything>.unlocked.gr
 *  - the app scheme unlocked://
 *  - http://localhost, 127.0.0.1 and *.localhost (local testing)
 *  - extra origins in the Convex env var RETURN_URL_ORIGINS, comma separated,
 *    e.g. "https://my-branch.vercel.app,exp://"  (prefix match)
 */
export function checkReturnUrl(url: string): string {
  if (typeof url !== "string" || url.length > 2000) throw new ConvexError("Invalid return URL");

  if (url.startsWith("unlocked://")) return url;

  const extra = (process.env.RETURN_URL_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (extra.some((origin) => url === origin || url.startsWith(origin.endsWith("/") ? origin : origin + "/") || (origin.endsWith("://") && url.startsWith(origin)))) {
    return url;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ConvexError("Invalid return URL");
  }
  if (parsed.username || parsed.password) throw new ConvexError("Invalid return URL");
  const host = parsed.hostname.toLowerCase();

  if (parsed.protocol === "https:" && (host === "unlocked.gr" || host.endsWith(".unlocked.gr"))) return url;
  if (
    parsed.protocol === "http:" &&
    (host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost"))
  ) {
    return url;
  }
  throw new ConvexError("Invalid return URL");
}
