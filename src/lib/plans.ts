/**
 * Single source of truth for platform plans on the web side.
 * Mirrors convex/plans.ts: Unlimited (€198/mo or €1980/yr, Stripe
 * subscription) and Pay as you go (€3 per booking, at most €250 a month,
 * invoiced monthly). Both include every feature and unlimited rooms.
 * Legacy values (free/starter/pro/enterprise) read as pay-as-you-go.
 */
export type PlanId = 'unlimited' | 'payg';

export const PLAN_ORDER: PlanId[] = ['payg', 'unlimited'];

export const UNLIMITED_PRICE = { monthly: 198, yearly: 1980 } as const;
export const PAYG_FEE = 3;
export const PAYG_CAP = 250;

/** Features both plans share (i18n keys). */
export const SHARED_FEATURES = [
  'plans.f_rooms',
  'plans.f_widget',
  'plans.f_payments',
  'plans.f_analytics',
  'plans.f_featured',
  'plans.f_photos',
];

export const PLANS: Record<
  PlanId,
  { color: string; priceKey: string; descKey: string; roomLimit: number; features: string[] }
> = {
  payg: {
    color: '#10B981',
    priceKey: 'plans.price_payg',
    descKey: 'plans.payg_desc',
    roomLimit: Infinity,
    // The €250 cap is shown next to the price, so it isn't repeated here.
    features: ['plans.payg_f_nofixed', 'plans.payg_f_invoice', ...SHARED_FEATURES],
  },
  unlimited: {
    color: '#7C4DFF',
    priceKey: 'plans.price_unlimited',
    descKey: 'plans.unlimited_desc',
    roomLimit: Infinity,
    features: ['plans.unlimited_f_nofees', ...SHARED_FEATURES],
  },
};

export function asPlanId(plan: unknown): PlanId {
  return plan === 'unlimited' ? 'unlimited' : 'payg';
}

/** Room limit for a plan, preferring the value the server reports. */
export function roomLimitFor(plan: unknown, serverLimit?: unknown): number {
  if (typeof serverLimit === 'number' && serverLimit > 0) return serverLimit;
  return PLANS[asPlanId(plan)].roomLimit;
}

export function euros(cents: number): string {
  return `€${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export const SUPPORT_EMAIL = 'hello@unlocked.gr';

export function mailto(subject: string, body = '') {
  const q = new URLSearchParams({ subject, ...(body ? { body } : {}) });
  return `mailto:${SUPPORT_EMAIL}?${q.toString().replace(/\+/g, '%20')}`;
}
