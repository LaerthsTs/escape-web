'use client';

import { useState, useEffect } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useCompanyAuth } from '@/lib/companyAuth';
import { useTranslation } from '@/lib/i18n';
import { PlanBadge } from '../PlanBadge';
import { PLANS, PLAN_ORDER, asPlanId, mailto, SUPPORT_EMAIL } from '@/lib/plans';
import { friendlyError } from '@/lib/errors';
import { uiLocale } from '@/lib/companyAuth';
import {
  CreditCard,
  Calendar,
  DollarSign,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Receipt,
  ArrowUpRight,
  Loader2,
  Check,
  Mail,
} from 'lucide-react';

export default function BillingPage() {
  const { t, language } = useTranslation();
  const { company, refreshCompany } = useCompanyAuth();
  const companyId = company?.id;

  // Always read fresh data from the database, not cached localStorage
  const companyData = useQuery(
    api.companies.getById,
    companyId ? { id: companyId as any } : 'skip'
  );

  const createPortalSession = useAction(api.stripe.createPortalSession);
  const getSubscriptionDetails = useAction(api.stripe.getSubscriptionDetails);

  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;

    async function fetchSubscription() {
      try {
        setLoading(true);
        const details = await getSubscriptionDetails({
          companyId: companyId as any,
        });
        if (!cancelled) setSubscription(details);
      } catch (err: any) {
        if (!cancelled) setError(friendlyError(err, t, 'cx.billing.load_failed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSubscription();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const handleManageSubscription = async () => {
    if (!companyId) return;
    try {
      setPortalLoading(true);
      const url = await createPortalSession({
        companyId: companyId as any,
        returnUrl: window.location.href,
      });
      window.location.href = url;
    } catch (err: any) {
      setError(friendlyError(err, t, 'cx.billing.portal_failed'));
      setPortalLoading(false);
    }
  };

  // Use fresh DB data (companyData) with localStorage fallback
  const plan = (companyData as any)?.platformPlan || company?.platformPlan || 'starter';
  const period = (companyData as any)?.billingPeriod || company?.billingPeriod || 'monthly';
  const paymentStatus = (companyData as any)?.stripePaymentStatus || company?.stripePaymentStatus || 'pending';
  const subscribedAt = (companyData as any)?.platformSubscribedAt || company?.platformSubscribedAt;
  const hasStripeCustomer = !!(companyData as any)?.stripeCustomerId || !!company?.stripeCustomerId;

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

  const planId = asPlanId(plan);
  const price = PLANS[planId][period === 'yearly' ? 'yearly' : 'monthly'];
  const locale = uiLocale(language);

  const formatDate = (ts: number) => {
    return new Date(ts * 1000).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateMs = (ts: number) => {
    return new Date(ts).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          label: t('billing.status_active'),
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
          Icon: CheckCircle,
        };
      case 'cancelled':
        return {
          label: t('billing.status_cancelled'),
          color: 'text-red-400',
          bg: 'bg-red-500/10',
          border: 'border-red-500/20',
          Icon: XCircle,
        };
      case 'past_due':
        return {
          label: t('billing.status_past_due'),
          color: 'text-amber-400',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          Icon: AlertTriangle,
        };
      default:
        return {
          label: t('billing.status_pending'),
          color: 'text-blue-400',
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20',
          Icon: Clock,
        };
    }
  };

  const statusConfig = getStatusConfig(paymentStatus);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-red-light animate-spin" />
      </div>
    );
  }

  const upgradeMail = (target: string) =>
    mailto(
      t('cx.billing.mail_subject', { plan: t(`company.onboarding.plan_${target}`) }),
      t('cx.billing.mail_body', {
        company: company?.name || '',
        email: company?.email || '',
        from: t(`company.onboarding.plan_${planId}`),
        to: t(`company.onboarding.plan_${target}`),
      })
    );

  return (
    <div>
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">
              {t('billing.title')}
            </h1>
            <p className="text-brand-text-secondary mt-1">
              {t('billing.subtitle')}
            </p>
          </div>
          <Receipt className="w-8 h-8 text-brand-red-light" />
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Plan Overview Card */}
        <div className="bg-brand-surface border border-white/5 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-sm text-brand-text-secondary mb-2">
                {t('billing.current_plan')}
              </p>
              <PlanBadge plan={plan} size="lg" />
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusConfig.bg} ${statusConfig.border} border`}>
              <statusConfig.Icon className={`w-4 h-4 ${statusConfig.color}`} />
              <span className={`text-sm font-medium ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Amount */}
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 text-brand-text-secondary mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  {t('billing.amount')}
                </span>
              </div>
              {plan === 'free' ? (
                <>
                  <p className="text-2xl font-bold">{t('company.onboarding.free')}</p>
                  <p className="text-xs text-brand-text-secondary mt-1">{t('billing.free_fee_note')}</p>
                </>
              ) : (
                <p className="text-2xl font-bold">
                  €{subscription?.amount ?? price}
                  <span className="text-sm text-brand-text-secondary font-normal ml-1">
                    /{period === 'yearly' ? t('billing.year') : t('billing.month')}
                  </span>
                </p>
              )}
            </div>

            {/* Billing Period */}
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 text-brand-text-secondary mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  {t('billing.billing_period')}
                </span>
              </div>
              <p className="text-lg font-semibold">
                {period === 'yearly' ? t('billing.yearly') : t('billing.monthly')}
              </p>
              {period === 'yearly' && (
                <p className="text-xs text-emerald-400 mt-1">
                  {t('billing.save_17')}
                </p>
              )}
            </div>

            {/* Subscribed Since */}
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 text-brand-text-secondary mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  {t('billing.member_since')}
                </span>
              </div>
              <p className="text-lg font-semibold">
                {subscribedAt ? formatDateMs(subscribedAt) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Subscription Details Card */}
        {subscription && plan !== 'free' && (
          <div className="bg-brand-surface border border-white/5 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand-red-light" />
              {t('billing.subscription_details')}
            </h2>

            <div className="space-y-4">
              {/* Next Billing Date */}
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-brand-text-secondary text-sm">
                  {subscription.cancelAtPeriodEnd
                    ? t('billing.expires_on')
                    : t('billing.next_payment')}
                </span>
                <span className="text-sm font-medium">
                  {subscription.currentPeriodEnd
                    ? formatDate(subscription.currentPeriodEnd)
                    : '—'}
                </span>
              </div>

              {/* Current Period Start */}
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-brand-text-secondary text-sm">
                  {t('billing.current_period_start')}
                </span>
                <span className="text-sm font-medium">
                  {subscription.currentPeriodStart
                    ? formatDate(subscription.currentPeriodStart)
                    : '—'}
                </span>
              </div>

              {/* Subscription ID */}
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-brand-text-secondary text-sm">
                  {t('billing.subscription_id')}
                </span>
                <span className="text-xs font-mono text-brand-text-secondary bg-white/5 px-2 py-1 rounded-sm">
                  {subscription.id}
                </span>
              </div>

              {/* Payment Method */}
              {subscription.defaultPaymentMethod && (
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <span className="text-brand-text-secondary text-sm">
                    {t('billing.payment_method')}
                  </span>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-brand-text-secondary" />
                    <span className="text-sm font-medium capitalize">
                      {subscription.defaultPaymentMethod.brand} •••• {subscription.defaultPaymentMethod.last4}
                    </span>
                  </div>
                </div>
              )}

              {/* Cancellation Notice */}
              {subscription.cancelAtPeriodEnd && (
                <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-400">
                      {t('billing.cancel_notice_title')}
                    </p>
                    <p className="text-xs text-amber-400/70 mt-1">
                      {t('billing.cancel_notice_body')}
                      {subscription.currentPeriodEnd
                        ? ` ${formatDate(subscription.currentPeriodEnd)}.`
                        : '.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Plans */}
        <div id="plans" className="bg-brand-surface border border-white/5 rounded-2xl p-6 mb-6 scroll-mt-20">
          <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-brand-red-light" />
            {t('cx.billing.plans_title')}
          </h2>
          <p className="text-sm text-brand-text-secondary mb-5">
            {planId === 'free' ? t('cx.billing.plans_desc_free') : t('cx.billing.plans_desc_paid')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PLAN_ORDER.map((id) => {
              const pl = PLANS[id];
              const current = id === planId;
              const isUp = PLAN_ORDER.indexOf(id) > PLAN_ORDER.indexOf(planId);
              return (
                <div
                  key={id}
                  className={`rounded-xl border p-4 flex flex-col ${
                    current ? 'border-brand-red/40 bg-brand-red/5' : 'border-white/5 bg-brand-bg/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold" style={{ color: pl.color }}>{t(`company.onboarding.plan_${id}`)}</p>
                    {current && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide bg-brand-red/15 text-brand-red-light px-2 py-0.5 rounded-full">
                        {t('cx.billing.current')}
                      </span>
                    )}
                  </div>
                  <p className="text-xl font-bold">
                    {id === 'free' ? t('company.onboarding.free') : `€${pl.monthly}`}
                    {id !== 'free' && <span className="text-xs font-normal text-brand-text-secondary">/{t('billing.month')}</span>}
                  </p>
                  {id !== 'free' && (
                    <p className="text-[11px] text-brand-text-secondary">€{pl.yearly}/{t('billing.year')}</p>
                  )}
                  <p className="text-xs text-brand-text-secondary mt-2">
                    {pl.roomLimit === Infinity
                      ? t('cx.billing.rooms_unlimited')
                      : t('cx.billing.rooms_upto', { count: String(pl.roomLimit) })}
                  </p>
                  <ul className="mt-2 space-y-1 flex-1">
                    {pl.features.slice(0, 4).map((k) => (
                      <li key={k} className="text-xs text-brand-text-secondary flex items-start gap-1.5">
                        <Check className="w-3 h-3 mt-0.5 shrink-0" style={{ color: pl.color }} /> {t(k)}
                      </li>
                    ))}
                  </ul>
                  {!current && id !== 'free' && (
                    planId !== 'free' && hasStripeCustomer ? (
                      <button
                        onClick={handleManageSubscription}
                        disabled={portalLoading}
                        className={`mt-3 w-full text-sm font-medium py-2 rounded-lg transition-colors ${
                          isUp ? 'bg-brand-red hover:bg-brand-red/90 text-white' : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        {isUp ? t('cx.billing.upgrade_to') : t('cx.billing.switch_to')}
                      </button>
                    ) : (
                      <a
                        href={upgradeMail(id)}
                        className={`mt-3 w-full text-center text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                          isUp ? 'bg-brand-red hover:bg-brand-red/90 text-white' : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5" /> {t('cx.billing.request')}
                      </a>
                    )
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-brand-text-secondary mt-4">
            {planId !== 'free' && hasStripeCustomer
              ? t('cx.billing.portal_note')
              : t('cx.billing.request_note', { email: SUPPORT_EMAIL })}
          </p>
        </div>

        {/* Manage */}
        {planId !== 'free' && (
          <div className="bg-brand-surface border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand-red-light" />
              {t('billing.manage_title')}
            </h2>
            <p className="text-sm text-brand-text-secondary mb-6">{t('billing.manage_description')}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading || !hasStripeCustomer}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-red hover:bg-brand-red/90 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {portalLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ExternalLink className="w-5 h-5" />}
                {t('billing.manage_subscription')}
              </button>
            </div>
            {!hasStripeCustomer && (
              <p className="text-xs text-brand-text-secondary mt-3 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {t('billing.no_stripe_customer')}
              </p>
            )}
          <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-brand-text-secondary">
            <Shield className="w-3.5 h-3.5" />
            {t('billing.stripe_powered')}
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
