/**
 * Turn Convex / network errors into something a company owner can read.
 * Convex wraps thrown errors as
 *   "[CONVEX M(companies:loginCompany)] [Request ID: …] Server Error Uncaught Error: Incorrect password at handler …"
 * and in production hides the message entirely ("… Server Error").
 */
export function cleanError(err: unknown): string {
  const raw =
    err instanceof Error ? err.message : typeof err === 'string' ? err : (err as any)?.message || '';
  const uncaught = raw.match(/Uncaught (?:Error|ConvexError):\s*([\s\S]*?)(?:\s+at\s+\S+\s*\(|\n\s+at |$)/);
  let msg = (uncaught ? uncaught[1] : raw).trim();
  msg = msg
    .replace(/^\[CONVEX [^\]]*\]\s*/, '')
    .replace(/^\[Request ID: [^\]]*\]\s*/, '')
    .replace(/^Server Error\s*/, '')
    .trim();
  return msg;
}

/** Known server messages → translation keys. */
const KNOWN: Record<string, string> = {
  'No business account found with this email': 'cx.err.no_account',
  'Incorrect password': 'cx.err.wrong_password',
  'Email already registered': 'cx.err.email_taken',
  'Invalid email format': 'cx.err.invalid_email',
  'This time slot is already booked': 'cx.err.slot_taken',
  'This time slot is already booked or blocked': 'cx.err.slot_taken',
  'The new time slot is already booked': 'cx.err.slot_taken',
  'Password must be at least 8 characters': 'cx.pw.too_short',
  'Password must contain at least one uppercase letter': 'cx.pw.need_upper',
  'Password must contain at least one number': 'cx.pw.need_number',
  'Invalid discount code':'company.onboarding.discount_invalid_code',
  'This code is no longer active': 'cx.err.code_inactive',
  'This code has expired': 'cx.err.code_expired',
  'This code has been fully redeemed': 'cx.err.code_used_up',
};

export function friendlyError(
  err: unknown,
  t: (key: string, params?: Record<string, string>) => string,
  fallbackKey = 'cx.err.generic'
): string {
  const msg = cleanError(err);
  if (KNOWN[msg]) return t(KNOWN[msg]);
  if (/^Room limit reached/i.test(msg)) return t('cx.err.room_limit');
  if (
    !msg ||
    /Server Error|Request ID|ArgumentValidationError|Validator|Failed to fetch|NetworkError|network/i.test(msg)
  ) {
    return t(fallbackKey);
  }
  return msg;
}
