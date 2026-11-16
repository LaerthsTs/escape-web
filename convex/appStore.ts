import { ConvexError } from "convex/values";
import { internalAction } from "./_generated/server";

/**
 * App Store Server API (checklist item 9): ask Apple about a purchase instead
 * of trusting what the app says.
 *
 * Convex environment variables (App Store Connect -> Users and Access ->
 * Integrations -> In-App Purchase):
 *   APPSTORE_ISSUER_ID, APPSTORE_KEY_ID, APPSTORE_PRIVATE_KEY (the .p8 text),
 *   APPSTORE_BUNDLE_ID (com.unlocked.escapeapp)
 *
 * Written without backslashes on purpose (they got lost in this repo before).
 */

const NL = String.fromCharCode(10);
const BS = String.fromCharCode(92);

const PRODUCTION_URL = "https://api.storekit.itunes.apple.com";
const SANDBOX_URL = "https://api.storekit-sandbox.itunes.apple.com"; // TestFlight and App Review

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new ConvexError("In-app purchases aren't set up on the server yet. Please try again later.");
  return v;
}

export function bundleId(): string {
  return process.env.APPSTORE_BUNDLE_ID || "com.unlocked.escapeapp";
}

function bytesToB64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).split("+").join("-").split("/").join("_").split("=").join("");
}

function jsonToB64url(obj: unknown): string {
  return bytesToB64url(new TextEncoder().encode(JSON.stringify(obj)));
}

function b64urlToText(s: string): string {
  let t = s.split("-").join("+").split("_").join("/");
  while (t.length % 4) t += "=";
  const bin = atob(t);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** The .p8 key (PEM) as DER bytes. Accepts real newlines or literal "\n". */
function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const text = pem.split(BS + "n").join(NL);
  const b64 = text
    .split(NL)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("-----"))
    .join("");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Short-lived ES256 token for the App Store Server API. */
async function apiToken(): Promise<string> {
  const header = { alg: "ES256", kid: env("APPSTORE_KEY_ID"), typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: env("APPSTORE_ISSUER_ID"),
    iat: now,
    exp: now + 10 * 60,
    aud: "appstoreconnect-v1",
    bid: bundleId(),
  };
  const signingInput = `${jsonToB64url(header)}.${jsonToB64url(payload)}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(env("APPSTORE_PRIVATE_KEY")),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  // WebCrypto gives the raw r||s signature, which is what JWS ES256 uses.
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${bytesToB64url(new Uint8Array(sig))}`;
}

export type AppleTransaction = {
  transactionId: string;
  originalTransactionId: string;
  bundleId: string;
  productId: string;
  expiresDate?: number;
  revocationDate?: number;
  environment: string; // "Production" | "Sandbox"
};

/**
 * Looks the transaction up at Apple (production first, then sandbox, as
 * Apple recommends). Returns null if Apple doesn't know it.
 */
export async function getAppleTransaction(transactionId: string): Promise<AppleTransaction | null> {
  if (!/^[0-9]{1,30}$/.test(transactionId)) return null;
  const token = await apiToken();
  for (const base of [PRODUCTION_URL, SANDBOX_URL]) {
    const res = await fetch(`${base}/inApps/v1/transactions/${transactionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) continue;
    if (res.status === 401) {
      console.error("[appStore] 401 from Apple: check APPSTORE_ISSUER_ID / KEY_ID / PRIVATE_KEY");
      throw new ConvexError("In-app purchases aren't set up correctly on the server. Please try again later.");
    }
    if (!res.ok) {
      console.error("[appStore] lookup failed", res.status);
      throw new ConvexError("Couldn't reach the App Store. Please try again.");
    }
    const json: any = await res.json();
    const jws: string = json.signedTransactionInfo ?? "";
    // We fetched this ourselves from Apple over HTTPS with our own key, so
    // the payload can be read directly.
    const p = JSON.parse(b64urlToText(jws.split(".")[1] ?? ""));
    return {
      transactionId: String(p.transactionId),
      originalTransactionId: String(p.originalTransactionId),
      bundleId: String(p.bundleId),
      productId: String(p.productId),
      expiresDate: typeof p.expiresDate === "number" ? p.expiresDate : undefined,
      revocationDate: typeof p.revocationDate === "number" ? p.revocationDate : undefined,
      environment: String(p.environment ?? ""),
    };
  }
  return null;
}

/**
 * Checks the keys work, without a real purchase:
 *   npx.cmd convex run appStore:selfTest
 * "ok" = Apple accepted our token (an unknown transaction just isn't found).
 */
export const selfTest = internalAction({
  args: {},
  handler: async () => {
    const token = await apiToken();
    const res = await fetch(`${SANDBOX_URL}/inApps/v1/transactions/1000000000000000`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) return { ok: false, status: 401, hint: "Apple rejected the token: check ISSUER_ID, KEY_ID and PRIVATE_KEY" };
    return { ok: true, status: res.status, bundleId: bundleId() };
  },
});
