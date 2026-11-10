/**
 * Single source of truth for platform plans on the web side.
 * Prices mirror convex/stripe.ts (PLAN_PRICES, in euro) and room limits mirror
 * convex/companies.ts (PLAN_ROOM_LIMITS). When the server sends its own
 * roomLimit (getDashboardStats), prefer that.
 */
export type PlanId = 'free' | 'starter' | 'pro' | 'enterprise';

export const PLAN_ORDER: PlanId[] = ['free', 'starter', 'pro', 'enterprise'];

export const PLANS: Record<
  PlanId,
  { monthly: number; yearly: number; roomLimit: number; color: string; features: string[] }
> = {
  free: {
    monthly: 0,
    yearly: 0,
    roomLimit: 1,
    color: '#64748B',
    features: [
      'company.onboarding.free_f1',
      'company.onboarding.free_f2',
      'company.onboarding.free_f3',
      'company.onboarding.free_f4',
      'company.onboarding.free_f5',
    ],
  },
  starter: {
    monthly: 58,
    yearly: 580,
    roomLimit: 1,
    color: '#4CAF50',
    features: [
      'company.onboarding.starter_f1',
      'company.onboarding.starter_f2',
      'company.onboarding.starter_f3',
      'company.onboarding.starter_f4',
      'company.onboarding.starter_f5',
    ],
  },
  pro: {
    monthly: 98,
    yearly: 980,
    roomLimit: 2,
    color: '#E53E3E',
    features: [
      'company.onboarding.pro_f1',
      'company.onboarding.pro_f2',
      'company.onboarding.pro_f3',
      'company.onboarding.pro_f4',
      'company.onboarding.pro_f5',
    ],
  },
  enterprise: {
    monthly: 198,
    yearly: 1980,
    roomLimit: Infinity,
    color: '#7C4DFF',
    features: [
      'company.onboarding.ent_f1',
      'company.onboarding.ent_f2',
      'company.onboarding.ent_f3',
      'company.onboarding.ent_f4',
      'company.onboarding.ent_f5',
      'company.onboarding.ent_f6',
      'company.onboarding.ent_f7',
      'company.onboarding.ent_f8',
      'company.onboarding.ent_f9',
    ],
  },
};

export function asPlanId(plan: unknown): PlanId {
  return plan === 'free' || plan === 'starter' || plan === 'pro' || plan === 'enterprise'
    ? plan
    : 'starter';
}

/** Room limit for a plan, preferring the value the server reports. */
export function roomLimitFor(plan: unknown, serverLimit?: unknown): number {
  if (typeof serverLimit === 'number' && serverLimit > 0) return serverLimit;
  return PLANS[asPlanId(plan)].roomLimit;
}

export const SUPPORT_EMAIL = 'hello@unlocked.gr';

export function mailto(subject: string, body = '') {
  const q = new URLSearchParams({ subject, ...(body ? { body } : {}) });
  return `mailto:${SUPPORT_EMAIL}?${q.toString().replace(/\+/g, '%20')}`;
}
