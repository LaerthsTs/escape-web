'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useTranslation } from '@/lib/i18n';

// Link from the "confirm your email" / "confirm your booking" emails
// (convex/emailVerify.ts). Confirms only on a button press, so mail
// scanners that open links don't confirm anything.
export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const confirm = useMutation(api.emailVerify.confirm);
  const [token, setToken] = useState('');
  const [state, setState] = useState<'ready' | 'working' | 'account' | 'booking' | 'invalid'>('ready');
  const [bookingCode, setBookingCode] = useState('');

  useEffect(() => {
    const tk = new URLSearchParams(window.location.search).get('token') || '';
    setToken(tk);
    if (!tk) setState('invalid');
  }, []);

  const onConfirm = async () => {
    setState('working');
    try {
      const r = await confirm({ token });
      if (!r.ok) return setState('invalid');
      if (r.kind === 'booking') setBookingCode(r.bookingCode ?? '');
      setState(r.kind);
    } catch {
      setState('invalid');
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-brand-surface border border-white/10 rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">
          {state === 'booking' ? t('verify.title_booking') : t('verify.title_account')}
        </h1>

        {(state === 'ready' || state === 'working') && (
          <button
            onClick={onConfirm}
            disabled={state === 'working' || !token}
            className="w-full py-3 rounded-xl bg-brand-red text-white font-semibold hover:bg-brand-red/90 disabled:opacity-50"
          >
            {state === 'working' ? '…' : t('verify.button')}
          </button>
        )}

        {state === 'account' && <p className="text-emerald-400">{t('verify.done_account')}</p>}
        {state === 'booking' && (
          <p className="text-emerald-400">
            {t('verify.done_booking')}
            {bookingCode && <span className="block mt-2 font-mono text-white">{bookingCode}</span>}
          </p>
        )}
        {state === 'invalid' && <p className="text-red-400">{t('verify.invalid')}</p>}

        {state !== 'ready' && state !== 'working' && (
          <Link href="/" className="inline-block mt-6 text-sm text-brand-text-secondary underline">
            {t('verify.home')}
          </Link>
        )}
      </div>
    </div>
  );
}
