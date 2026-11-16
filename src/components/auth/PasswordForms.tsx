'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from 'convex/react';
import { KeyRound } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { useTranslation } from '@/lib/i18n';

// Forgot password (6-digit email code) and change password.
// Server side: convex/passwordReset.ts

const ERRORS: Record<string, string> = {
  CODE_INVALID: 'auth.code_invalid',
  CODE_EXPIRED: 'auth.code_expired',
  TOO_MANY_ATTEMPTS: 'auth.code_too_many',
  PASSWORD_LENGTH: 'auth.error_password_length',
  PASSWORD_UPPERCASE: 'auth.error_password_uppercase',
  PASSWORD_NUMBER: 'auth.error_password_number',
  WRONG_PASSWORD: 'change.wrong_current',
};

const inputCls =
  'w-full bg-brand-surface border border-white/10 rounded-xl px-4 py-3 text-white placeholder-brand-text-secondary/50 focus:border-brand-red focus:outline-hidden';
const btnCls =
  'w-full py-3 rounded-xl bg-brand-red text-white font-semibold hover:bg-brand-red/90 disabled:opacity-50';

function useErrorText() {
  const { t } = useTranslation();
  return (code: unknown) => {
    const c = typeof code === 'string' ? code : (code as any)?.data;
    return t(typeof c === 'string' && ERRORS[c] ? ERRORS[c] : 'auth.error_generic');
  };
}

/** Full "forgot password" page body. */
export function PasswordResetForm({ kind, loginHref }: { kind: 'player' | 'company'; loginHref: string }) {
  const { t, language } = useTranslation();
  const errorText = useErrorText();
  const start = useMutation(api.passwordReset.start);
  const finish = useMutation(api.passwordReset.finish);
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setBusy(true);
    try {
      await start({ kind, email: email.trim().toLowerCase(), lang: language });
      setCode('');
      setStep('code');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (pw !== pw2) return setError(t('reset.mismatch'));
    setBusy(true);
    try {
      const r = await finish({ kind, email: email.trim().toLowerCase(), code, newPassword: pw });
      if ('error' in r) setError(errorText(r.error));
      else setStep('done');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-brand-surface/60 border border-white/10 rounded-2xl p-6 md:p-8">
        <div className="text-center mb-6">
          <KeyRound className="w-10 h-10 mx-auto mb-3 text-brand-red-light" />
          <h1 className="text-2xl font-bold text-white mb-2">{t('reset.title')}</h1>
          {step === 'email' && <p className="text-sm text-brand-text-secondary">{t('reset.subtitle')}</p>}
          {step === 'code' && (
            <p className="text-sm text-brand-text-secondary">{t('reset.code_sent', { email: email.trim().toLowerCase() })}</p>
          )}
        </div>

        {error && (
          <div role="alert" className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={send} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('reset.email_label')}
              className={inputCls}
              autoComplete="email"
              required
            />
            <button type="submit" disabled={busy || !email.trim()} className={btnCls}>
              {busy ? '…' : t('reset.send_code')}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={submit} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="000000"
              aria-label={t('reset.code_label')}
              className={`${inputCls} text-center text-2xl tracking-[0.5em] font-mono`}
              autoFocus
              required
            />
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder={t('reset.new_password')}
              className={inputCls}
              autoComplete="new-password"
              required
            />
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder={t('reset.confirm_password')}
              className={inputCls}
              autoComplete="new-password"
              required
            />
            <button type="submit" disabled={busy || code.length !== 6 || !pw} className={btnCls}>
              {busy ? '…' : t('reset.submit')}
            </button>
            <button type="button" onClick={() => send()} className="w-full text-sm text-brand-red-light hover:underline">
              {t('reset.resend')}
            </button>
          </form>
        )}

        {step === 'done' && <p className="text-emerald-400 text-sm text-center">{t('reset.done')}</p>}

        <div className="text-center mt-6">
          <Link href={loginHref} className="text-sm text-brand-text-secondary hover:text-white underline">
            {t('reset.back_to_login')}
          </Link>
        </div>
      </div>
    </div>
  );
}

/** "Change password" box for the profile / settings pages. */
export function ChangePasswordForm({ kind, sessionToken }: { kind: 'player' | 'company'; sessionToken: string }) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const changePlayer = useMutation(api.passwordReset.changePlayerPassword);
  const changeCompany = useMutation(api.passwordReset.changeCompanyPassword);
  const [current, setCurrent] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDone(false);
    if (pw !== pw2) return setError(t('reset.mismatch'));
    setBusy(true);
    try {
      const args = { sessionToken, currentPassword: current, newPassword: pw };
      const r = kind === 'player' ? await changePlayer(args) : await changeCompany(args);
      if ('error' in r) setError(errorText(r.error));
      else {
        setDone(true);
        setCurrent('');
        setPw('');
        setPw2('');
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-brand-red-light" /> {t('change.title')}
      </h3>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {done && <p className="text-sm text-emerald-400">{t('change.done')}</p>}
      <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder={t('change.current')} className={inputCls} autoComplete="current-password" required />
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t('change.new')} className={inputCls} autoComplete="new-password" required />
      <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder={t('change.confirm')} className={inputCls} autoComplete="new-password" required />
      <button type="submit" disabled={busy || !current || !pw} className={btnCls}>
        {busy ? '…' : t('change.submit')}
      </button>
    </form>
  );
}
