'use client';

/**
 * Under a room's payment-term buttons: the room's own deposit % (optional,
 * falls back to the company default) and a warning when online terms are
 * selected but no Stripe/Viva account is connected yet.
 */
import Link from 'next/link';
import { useCompanyQuery, useCompanyPath } from '@/lib/companyAuth';
import { AlertCircle } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { useTranslation } from '@/lib/i18n';

type Terms = 'full' | 'deposit_20' | 'pay_on_arrival';

export function RoomPaymentExtras({
  companyId,
  terms,
  depositPercent,
  onDepositPercentChange,
}: {
  companyId?: string;
  terms: Terms[];
  depositPercent: string;
  onDepositPercentChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const p = useCompanyPath();
  const settings = useCompanyQuery(
    api.companyPaymentsData.getCompanySettings,
    companyId ? { companyId: companyId as any } : 'skip'
  );
  const online = terms.includes('full') || terms.includes('deposit_20');

  return (
    <div className="mt-4 space-y-3">
      {terms.includes('deposit_20') && (
        <div>
          <label className="block text-sm text-brand-text-secondary mb-1.5">{t('cx.pay.room_deposit')}</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              value={depositPercent}
              onChange={(e) => onDepositPercentChange(e.target.value)}
              placeholder={String(settings?.depositPercent ?? 20)}
              className="w-24 bg-brand-bg border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-brand-red focus:outline-hidden"
            />
            <span className="text-brand-text-secondary">%</span>
          </div>
          <p className="text-xs text-brand-text-secondary mt-1.5">
            {t('cx.pay.room_deposit_hint', { percent: String(settings?.depositPercent ?? 20) })}
          </p>
        </div>
      )}
      {online && settings && !settings.provider && (
        <div className="flex items-start gap-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 text-sm text-yellow-200">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-yellow-400" />
          <span>
            {t('cx.pay.room_not_connected')}{' '}
            <Link href={p('/company/payments')} className="underline text-white">
              {t('cx.pay.connect_now')}
            </Link>
          </span>
        </div>
      )}
    </div>
  );
}
