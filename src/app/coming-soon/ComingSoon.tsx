'use client';

import { useState } from 'react';
import { Eye, EyeOff, Lock, ArrowRight } from 'lucide-react';
import { EyeKeyhole } from '@/components/brand/EyeKeyhole';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useTranslation } from '@/lib/i18n';

export function ComingSoon({ next, error }: { next: string; error: boolean }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [sending, setSending] = useState(false);

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 45% at 50% 35%, rgba(92,0,8,0.45), transparent 70%), radial-gradient(90% 60% at 50% 110%, rgba(200,16,27,0.18), transparent 70%)',
        }}
      />

      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle />
      </div>

      <div className="relative w-full max-w-md text-center animate-fade-up">
        <div className="mx-auto mb-6 w-16 h-16 bg-linear-to-b from-[#e0141f] to-brand-red rounded-lg flex items-center justify-center shadow-[0_0_32px_rgba(200,16,27,0.65)]">
          <EyeKeyhole className="w-12 h-12" blink />
        </div>

        <p className="font-blood text-2xl tracking-wider text-brand-bone">
          UN<span className="text-brand-red-light text-blood-glow">LOCKED</span>
        </p>

        <span className="inline-block mt-6 px-3 py-1 rounded-full border border-brand-red/50 bg-brand-red/10 text-brand-red-light text-xs font-semibold tracking-[0.2em] uppercase">
          {t('soon.badge')}
        </span>

        <h1 className="mt-5 font-display text-3xl sm:text-4xl font-bold text-brand-bone leading-tight">
          {t('soon.title')}
        </h1>
        <p className="mt-4 text-brand-text-secondary leading-relaxed">{t('soon.subtitle')}</p>

        <form
          action="/api/preview-access"
          method="post"
          onSubmit={() => setSending(true)}
          className="card mt-8 p-6 text-left hover:translate-y-0"
        >
          <input type="hidden" name="next" value={next} />
          <label htmlFor="preview-password" className="block text-sm font-medium text-brand-text mb-2">
            {t('soon.password')}
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" aria-hidden />
            <input
              id="preview-password"
              name="password"
              type={show ? 'text' : 'password'}
              required
              autoFocus
              autoComplete="current-password"
              aria-invalid={error || undefined}
              aria-describedby={error ? 'preview-error' : undefined}
              className="input-field pl-12! pr-12!"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? t('soon.hide') : t('soon.show')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brand-text-muted hover:text-brand-text"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p id="preview-error" role="alert" className="mt-3 text-sm text-brand-red-light">
              {t('soon.error')}
            </p>
          )}

          <button type="submit" disabled={sending} className="btn-primary w-full mt-5 flex items-center justify-center gap-2">
            {t('soon.enter')}
            <ArrowRight className="w-4 h-4" aria-hidden />
          </button>
        </form>
      </div>
    </main>
  );
}
