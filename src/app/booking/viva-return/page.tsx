'use client';

/**
 * Viva Smart Checkout sends the player here (the Success URL and Failure URL
 * the escape room set on its Viva payment source) with ?s=<orderCode>&t=<transactionId>.
 * We check the payment with Viva on the server, then show the booking.
 */
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAction } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useTranslation } from '@/lib/i18n';

function VivaReturnContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const confirmVivaReturn = useAction(api.companyPayments.confirmVivaReturn);
  const [failed, setFailed] = useState(false);

  const orderCode = params.get('s') || '';
  const transactionId = params.get('t') || undefined;

  useEffect(() => {
    if (!orderCode) {
      setFailed(true);
      return;
    }
    let cancelled = false;
    confirmVivaReturn({ orderCode, transactionId })
      .then(({ bookingId }) => {
        if (cancelled) return;
        if (bookingId) router.replace(`/booking/confirmation?booking=${bookingId}`);
        else setFailed(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [orderCode, transactionId, confirmVivaReturn, router]);

  if (failed) {
    return (
      <section className="pt-28 pb-20">
        <div className="max-w-xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-display font-bold mb-3">{t('confirmation.viva_not_found_title')}</h1>
          <p className="text-brand-text-secondary mb-8">{t('confirmation.viva_not_found_desc')}</p>
          <Link href="/tickets" className="btn-primary inline-flex">
            {t('confirmation.go_to_tickets')}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="w-8 h-8 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
      <p className="text-brand-text-secondary">{t('confirmation.processing_subtitle')}</p>
    </div>
  );
}

export default function VivaReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
        </div>
      }
    >
      <VivaReturnContent />
    </Suspense>
  );
}
