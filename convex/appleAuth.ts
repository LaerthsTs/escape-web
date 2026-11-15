/**
 * Sign in with Apple: verify the identity token (a JWT signed by Apple) so a
 * client can no longer just claim "I am Apple user X". Checks the signature
 * against Apple's published keys, the issuer, the audience (our app's bundle
 * id) and the expiry.
 *
 * Audience: APPLE_CLIENT_IDS (comma-separated) on the Convex deployment;
 * defaults to the iOS bundle id.
 */

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys";

export type AppleIdentity = {
  sub: string;
  email?: string;
  emailVerified: boolean;
};

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function parseJson(bytes: Uint8Array): any {
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function verifyAppleIdentityToken(token: string): Promise<AppleIdentity> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("APPLE_TOKEN_INVALID");
  const [h, p, sig] = parts;

  let header: any;
  let payload: any;
  try {
    header = parseJson(b64urlToBytes(h));
    payload = parseJson(b64urlToBytes(p));
  } catch {
    throw new Error("APPLE_TOKEN_INVALID");
  }
  if (header.alg !== "RS256" || typeof header.kid !== "string") throw new Error("APPLE_TOKEN_INVALID");

  const res = await fetch(APPLE_KEYS_URL);
  if (!res.ok) throw new Error("APPLE_KEYS_UNAVAILABLE");
  const { keys } = (await res.json()) as { keys: any[] };
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("APPLE_TOKEN_INVALID");

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64urlToBytes(sig).buffer as ArrayBuffer,
    new TextEncoder().encode(`${h}.${p}`).buffer as ArrayBuffer
  );
  if (!ok) throw new Error("APPLE_TOKEN_INVALID");

  const allowed = (process.env.APPLE_CLIENT_IDS ?? "com.unlocked.escapeapp")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (payload.iss !== APPLE_ISSUER) throw new Error("APPLE_TOKEN_INVALID");
  if (!allowed.includes(payload.aud)) throw new Error("APPLE_TOKEN_INVALID");
  if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) throw new Error("APPLE_TOKEN_EXPIRED");
  if (typeof payload.sub !== "string" || !payload.sub) throw new Error("APPLE_TOKEN_INVALID");

  return {
    sub: payload.sub,
    email: typeof payload.email === "string" ? payload.email.toLowerCase() : undefined,
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
  };
}
