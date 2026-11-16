'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { Mail, ArrowRight } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { useTranslation } from '@/lib/i18n';

/**
 * Step 2 of a company sign-up: the 6-digit code we emailed
 * (convex/signupCodes.ts). Calls onConfirmed once the account exists.
 */
const CODE_ERRORS: Record<string, string> = {
  CODE_INVALID: 'auth.code_invalid',
  CODE_EXPIRED: 'auth.code_expired',
  TOO_MANY_ATTEMPTS: 'auth.code_too_many',
};

export function CompanySignupCodeStep({
  email,
  onConfirmed,
  onBack,
}: {
  email: string;
  onConfirmed: () => Promise<void> | void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const confirm = useMutation(api.companies.confirmRegister);
  const resend = useMutation(api.signupCodes.resend);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const cleanEmail = email.trim().toLowerCase();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const r = await confirm({ email: cleanEmail, code, client: 'web' });
      if ('error' in r) {
        setError(CODE_ERRORS[r.error] ? t(CODE_ERRORS[r.error]) : r.error);
        return;
      }
      await onConfirmed();
    } catch {
      setError(t('auth.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setError('');
    setInfo('');
    try {
      await resend({ kind: 'company', email: cleanEmail });
      setCode('');
      setInfo(t('auth.code_resent'));
    } catch (err: any) {
      setError(t(err?.data === 'TOO_MANY_ATTEMPTS' ? 'auth.code_too_many' : 'auth.error_generic'));
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="text-center">
        <Mail className="w-10 h-10 mx-auto mb-3 text-brand-red-light" />
        <h2 className="text-lg font-bold mb-1">{t('auth.code_title')}</h2>
        <p className="text-sm text-brand-text-secondary">{t('auth.code_sent', { email: cleanEmail })}</p>
      </div>
      {error && (
        <div role="alert" className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
          {error}
        </div>
      )}
      {info && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-400 text-sm">
          {info}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-2 text-brand-text-secondary">{t('auth.code_label')}</label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
          placeholder="000000"
          className="w-full bg-brand-surface border border-white/10 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono text-white focus:border-brand-red focus:outline-hidden"
          autoFocus
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading || code.length !== 6}
        className="w-full py-3 rounded-xl bg-brand-red text-white font-semibold hover:bg-brand-red/90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? '…' : t('auth.code_confirm')}
        {!loading && <ArrowRight className="w-4 h-4" />}
      </button>
      <div className="flex justify-between text-sm">
        <button type="button" onClick={onBack} className="text-brand-text-secondary hover:text-white">
          {t('auth.code_back')}
        </button>
        <button type="button" onClick={onResend} className="text-brand-red-light hover:underline">
          {t('auth.code_resend')}
        </button>
      </div>
    </form>
  );
}
