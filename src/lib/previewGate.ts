/**
 * Password-protected "coming soon" gate.
 *
 * The gate is on only while the PREVIEW_PASSWORD environment variable is set on
 * the server. Visitors without the preview cookie are sent to /coming-soon;
 * entering the password there sets the cookie for 30 days. Changing the
 * password logs everyone out, because the cookie holds a hash of it.
 * To open the site to everyone, remove PREVIEW_PASSWORD and restart the app.
 */

export const PREVIEW_COOKIE = 'unl-preview';
export const PREVIEW_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function previewPassword(): string | undefined {
  const pw = process.env.PREVIEW_PASSWORD?.trim();
  return pw ? pw : undefined;
}

export async function previewToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`unlocked-preview:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Only allow same-site relative paths as the post-login destination. */
export function safeNext(next: unknown): string {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return '/';
  }
  if (next.startsWith('/coming-soon')) return '/';
  return next;
}

/** Share the cookie across unlocked.gr, business.unlocked.gr and photos.unlocked.gr. */
export function cookieDomain(host: string | null): string | undefined {
  const h = (host || '').split(':')[0].toLowerCase();
  return h === 'unlocked.gr' || h.endsWith('.unlocked.gr') ? '.unlocked.gr' : undefined;
}
