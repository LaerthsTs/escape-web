import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  PREVIEW_COOKIE,
  PREVIEW_MAX_AGE,
  cookieDomain,
  previewPassword,
  previewToken,
  safeNext,
} from '@/lib/previewGate';

function sameText(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// Relative Location headers keep the visitor on the host they came from
// (unlocked.gr, business. or photos.) without trusting request.url behind the proxy.
function seeOther(location: string) {
  return new NextResponse(null, { status: 303, headers: { Location: location } });
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const next = safeNext(form.get('next'));
  const password = previewPassword();

  if (!password) return seeOther(next);

  const given = String(form.get('password') ?? '').trim();
  if (!sameText(given, password)) {
    // Slow down guessing a little
    await new Promise((r) => setTimeout(r, 600));
    return seeOther(`/coming-soon?error=1&next=${encodeURIComponent(next)}`);
  }

  const resp = seeOther(next);
  resp.cookies.set(PREVIEW_COOKIE, await previewToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: PREVIEW_MAX_AGE,
    domain: cookieDomain(request.headers.get('host')),
  });
  return resp;
}
