'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useCompanyAction, useCompanyQuery, useCompanyAuth, uiLocale, useCompanyPath } from '@/lib/companyAuth';
import { api } from '../../../../convex/_generated/api';
import { useTranslation } from '@/lib/i18n';
import { PlanBadge } from '../PlanBadge';
import { PLANS, UNLIMITED_PRICE, PAYG_FEE, PAYG_CAP, asPlanId, euros } from '@/lib/plans';
import { friendlyError } from '@/lib/errors';
import {
  CreditCard,
  Calendar,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Receipt,
  Loader2,
  Check,
  Infinity as InfinityIcon,
  FileText,
} from 'lucide-react';

function BillingContent() {
  const { t, language } = useTranslation();
  const { company, refreshCompany } = useCompanyAuth();
  const p = useCompanyPath();
  const params = useSearchParams();
  const companyId = company?.id;

  // Always read fresh data from the database, not cached localStorage
  const companyData = useCompanyQuery(
    api.companies.getById,
    companyId ? { id: companyId as any } : 'skip'
  );
  const usage = useCompanyQuery(
    api.billing.getPaygUsage,
    companyId ? { companyId: companyId as any } : 'skip'
  );

  const createPortalSession = useCompanyAction(api.stripe.createPortalSession);
  const getSubscriptionDetails = useCompanyAction(api.stripe.getSubscriptionDetails);
  const createCheckout = useCompanyAction(api.stripe.createCheckoutSession);

  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [upgradePeriod, setUpgradePeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [error, setError] = useState('');

  const rawPlan = (companyData as any)?.platformPlan || company?.platformPlan || 'payg';
  const planId = asPlanId(rawPlan);
  const period = (companyData as any)?.billingPeriod || company?.billingPeriod || 'monthly';
  const paymentStatus = (companyData as any)?.stripePaymentStatus || company?.stripePaymentStatus || null;
  const subscribedAt = (companyData as any)?.platformSubscribedAt || company?.platformSubscribedAt;
  const hasStripeCustomer = !!(companyData as any)?.stripeCustomerId || !!company?.stripeCustomerId;
  const justUpgraded = params.get('upgraded') === '1';

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;

    async function fetchSubscription() {
      try {
        setLoading(true);
        const details = await getSubscriptionDetails({ companyId: companyId as any });
        if (!cancelled) setSubscription(details);
      } catch (err: any) {
        if (!cancelled) setError(friendlyError(err, t, 'cx.billing.load_failed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSubscription();
    return () => { cancelled = true; };
    // Re-fetch when the webhook switches the plan after an upgrade
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, rawPlan]);

  // Sync fresh DB data back into localStorage session
  useEffect(() => {
    if (companyData) {
      refreshCompany({
        platformPlan: (companyData as any).platformPlan || null,
        billingPeriod: (companyData as any).billingPeriod || null,
        stripePaymentStatus: (companyData as any).stripePaymentStatus || null,
        stripeCustomerId: (companyData as any).stripeCustomerId || null,
        platformSubscribedAt: (companyData as any).platformSubscribedAt || null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyData]);

  const handleManageSubscription = async () => {
    if (!companyId) return;
    try {
      setPortalLoading(true);
      const url = await createPortalSession({
        companyId: companyId as any,
        returnUrl: window.location.href.split('?')[0],
      });
      window.location.href = url;
    } catch (err: any) {
      setError(friendlyError(err, t, 'cx.billing.portal_failed'));
      setPortalLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!companyId) return;
    try {
      setCheckoutLoading(true);
      setError('');
      const base = `${window.location.origin}${p('/company/billing')}`;
      const url = await createCheckout({
        companyId: companyId as any,
        plan: 'unlimited',
        period: upgradePeriod,
        successUrl: `${base}?upgraded=1`,
        cancelUrl: base,
      });
      window.location.href = url;
    } catch (err: any) {
      setError(friendlyError(err, t, 'cx.onboarding.checkout_failed'));
      setCheckoutLoading(false);
    }
  };

  const locale = uiLocale(language);
  const formatDate = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  const formatDateMs = (ts: number) =>
    new Date(ts).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  const formatMonth = (month: string) => {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  };

  // A live subscription (Unlimited, or a legacy plan until Stripe ends it)
  const liveSub =
    subscription && ['active', 'trialing', 'past_due'].includes(subscription.status) ? subscription : null;

  const statusConfig = (() => {
    switch (paymentStatus) {
      case 'active':
        return { label: t('billing.status_active'), color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', Icon: CheckCircle };
      case 'cancelled':
        return { label: t('billing.status_cancelled'), color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', Icon: XCircle };
      case 'past_due':
        return { label: t('billing.status_past_due'), color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', Icon: AlertTriangle };
      default:
        return { label: t('billing.status_pending'), color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', Icon: Clock };
    }
  })();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-red-light animate-spin" />
      </div>
    );
  }

  // The cap is for booking fees only; the merch fee comes on top.
  const usageCents = usage?.bookingAmountCents ?? usage?.amountCents ?? 0;
  const merchFee = usage?.merchFeeCents ?? 0;
  const capCents = usage?.capCents ?? PAYG_CAP * 100;
  const capPct = Math.min(100, Math.round((usageCents / capCents) * 100));

  return (
    <div>
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">{t('billing.title')}</h1>
            <p className="text-brand-text-secondary mt-1">{t('billing.subtitle')}</p>
          </div>
          <Receipt className="w-8 h-8 text-brand-red-light" />
        </div>

        {error && (
          <div role="alert" className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {justUpgraded && planId !== 'unlimited' && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin shrink-0" />
            <p className="text-sm text-emerald-400">{t('plans.upgrade_processing')}</p>
          </div>
        )}

        {/* Plan Overview Card */}
        <div className="bg-brand-surface border border-white/5 rounded-2xl p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
            <div>
              <p className="text-sm text-brand-text-secondary mb-2">{t('billing.current_plan')}</p>
              <PlanBadge plan={rawPlan} size="lg" />
            </div>
            {liveSub && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusConfig.bg} ${statusConfig.border} border`}>
                <statusConfig.Icon className={`w-4 h-4 ${statusConfig.color}`} />
                <span className={`text-sm font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
              </div>
            )}
          </div>

          {planId === 'payg' && !liveSub ? (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <p className="text-sm text-brand-text-secondary">
                  {t('plans.this_month', { month: usage ? formatMonth(usage.month) : '' })}
                </p>
                <p className="text-sm text-brand-text-secondary">
                  {t('plans.bookings_times_fee', {
                    count: String(usage?.bookingCount ?? 0),
                    fee: euros(PAYG_FEE * 100),
                  })}
                </p>
              </div>
              <p className="text-3xl font-bold">
                {euros(usageCents)}
                <span className="text-sm text-brand-text-secondary font-normal ml-2">
                  {t('plans.of_cap', { cap: euros(capCents) })}
                </span>
              </p>
              <div
                className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden"
                role="progressbar"
                aria-valuenow={capPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`h-full rounded-full ${capPct >= 100 ? 'bg-purple-400' : 'bg-emerald-400'}`}
                  style={{ width: `${capPct}%` }}
                />
              </div>
              {capPct >= 100 && <p className="text-xs text-purple-400 mt-2">{t('plans.cap_reached')}</p>}
              {merchFee > 0 && (
                <p className="text-sm text-brand-text-secondary mt-3">
                  {t('shop.billing.merch_fee_line', {
                    fee: euros(merchFee),
                    sales: euros(usage?.merchSalesCents ?? 0),
                  })}
                </p>
              )}
              <p className="text-xs text-brand-text-secondary mt-3">{t('plans.payg_counted')}</p>
              <p className="text-xs text-brand-text-secondary mt-1">{t('plans.payg_invoice_note')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-brand-text-secondary mb-2">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">{t('billing.amount')}</span>
                </div>
                <p className="text-2xl font-bold">
                  €{liveSub?.amount ?? (period === 'yearly' ? UNLIMITED_PRICE.yearly : UNLIMITED_PRICE.monthly)}
                  <span className="text-sm text-brand-text-secondary font-normal ml-1">
                    /{period === 'yearly' ? t('billing.year') : t('billing.month')}
                  </span>
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-brand-text-secondary mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">{t('billing.billing_period')}</span>
                </div>
                <p className="text-lg font-semibold">{period === 'yearly' ? t('billing.yearly') : t('billing.monthly')}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-brand-text-secondary mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">{t('billing.member_since')}</span>
                </div>
                <p className="text-lg font-semibold">{subscribedAt ? formatDateMs(subscribedAt) : '—'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Subscription details (Unlimited, or a legacy plan until it ends) */}
        {liveSub && (
          <div className="bg-brand-surface border border-white/5 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand-red-light" />
              {t('billing.subscription_details')}
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-brand-text-secondary text-sm">
                  {liveSub.cancelAtPeriodEnd ? t('billing.expires_on') : t('billing.next_payment')}
                </span>
                <span className="text-sm font-medium">
                  {liveSub.currentPeriodEnd ? formatDate(liveSub.currentPeriodEnd) : '—'}
                </span>
              </div>
              {liveSub.defaultPaymentMethod && (
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <span className="text-brand-text-secondary text-sm">{t('billing.payment_method')}</span>
                  <span className="text-sm font-medium capitalize flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-brand-text-secondary" />
                    {liveSub.defaultPaymentMethod.brand} •••• {liveSub.defaultPaymentMethod.last4}
                  </span>
                </div>
              )}
              {liveSub.cancelAtPeriodEnd && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-400">
                    {t('plans.ends_then_payg', {
                      date: liveSub.currentPeriodEnd ? formatDate(liveSub.currentPeriodEnd) : '',
                    })}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading || !hasStripeCustomer}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-red hover:bg-brand-red/90 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {portalLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ExternalLink className="w-5 h-5" />}
                {t('billing.manage_subscription')}
              </button>
            </div>
            {!liveSub.cancelAtPeriodEnd && (
              <p className="text-xs text-brand-text-secondary mt-3">{t('plans.switch_payg_hint')}</p>
            )}
          </div>
        )}

        {/* Upgrade to Unlimited */}
        {!liveSub && (
          <div className="bg-brand-surface border border-white/5 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <InfinityIcon className="w-5 h-5 text-purple-400" />
              {t('plans.switch_unlimited')}
            </h2>
            <p className="text-sm text-brand-text-secondary mb-4">{t('plans.switch_unlimited_desc')}</p>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {(['monthly', 'yearly'] as const).map((per) => (
                <button
                  key={per}
                  onClick={() => setUpgradePeriod(per)}
                  aria-pressed={upgradePeriod === per}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    upgradePeriod === per
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'bg-white/5 text-brand-text-secondary border border-white/10 hover:text-white'
                  }`}
                >
                  {per === 'monthly'
                    ? `€${UNLIMITED_PRICE.monthly}/${t('billing.month')}`
                    : `€${UNLIMITED_PRICE.yearly}/${t('billing.year')}`}
                </button>
              ))}
              {upgradePeriod === 'yearly' && (
                <span className="text-xs text-emerald-400 font-medium">{t('plans.yearly_save')}</span>
              )}
            </div>
            <ul className="grid sm:grid-cols-2 gap-1.5 mb-5">
              {PLANS.unlimited.features.slice(0, 4).map((k) => (
                <li key={k} className="text-xs text-brand-text-secondary flex items-start gap-1.5">
                  <Check className="w-3 h-3 mt-0.5 shrink-0 text-purple-400" /> {t(k)}
                </li>
              ))}
            </ul>
            <button
              onClick={handleUpgrade}
              disabled={checkoutLoading}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              {checkoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
              {t('plans.subscribe_unlimited')}
            </button>
          </div>
        )}

        {/* Pay-as-you-go invoices */}
        {usage && usage.invoices.length > 0 && (
          <div className="bg-brand-surface border border-white/5 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-red-light" />
              {t('plans.invoices')}
            </h2>
            <ul className="divide-y divide-white/5">
              {usage.invoices.map((inv) => (
                <li key={inv.month} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-medium">{formatMonth(inv.month)}</p>
                    <p className="text-xs text-brand-text-secondary">
                      {t('plans.bookings_count', { count: String(inv.bookingCount) })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{euros(inv.amountCents)}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        inv.status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : inv.status === 'void'
                            ? 'bg-white/5 text-brand-text-secondary'
                            : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {t(`plans.invoice_${inv.status}`)}
                    </span>
                    {inv.hostedInvoiceUrl && (
                      <a
                        href={inv.hostedInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-red-light hover:underline flex items-center gap-1"
                      >
                        {inv.status === 'open' ? t('plans.pay_invoice') : t('plans.view_invoice')}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-brand-text-secondary">
          <Shield className="w-3.5 h-3.5" />
          {t('billing.stripe_powered')}
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-red-light animate-spin" />
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}
