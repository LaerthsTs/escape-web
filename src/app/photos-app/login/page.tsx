'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useCompanyAuth } from '@/lib/companyAuth';
import { useTranslation } from '@/lib/i18n';
import { LanguageToggle } from '@/components/LanguageToggle';
import { friendlyError } from '@/lib/errors';
import { mailto } from '@/lib/plans';

export default function PhotosLoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { login, isAuthenticated } = useCompanyAuth();
  const [justRegistered, setJustRegistered] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setJustRegistered(new URLSearchParams(window.location.search).get('registered') === 'true');
  }, []);

  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated, router]);

  if (isAuthenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (err: any) {
      setError(friendlyError(err, t, 'cx.err.login_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4 py-12">
      <div className="fixed top-4 right-4 z-50">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-brand-red rounded-lg flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-display font-bold tracking-wider">
              UN<span className="text-brand-red-light">LOCKED</span>
              <span className="text-brand-text-muted text-sm ml-1.5 font-normal">Photos</span>
            </span>
          </div>
          <p className="text-brand-text-secondary text-sm">{t('ph.auth.login_sub')}</p>
        </div>

        {/* Form */}
        <div className="bg-brand-surface rounded-2xl p-5 sm:p-8 border border-white/5">
          <h1 className="text-2xl font-bold mb-2">{t('ph.auth.login_title')}</h1>
          <p className="text-xs text-brand-text-secondary mb-6">{t('ph.auth.same_account')}</p>

          {justRegistered && !error && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4 text-green-400 text-sm">
              {t('cx.auth.registered')}
            </div>
          )}

          {error && (
            <div role="alert" className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="ph-email" className="block text-sm text-brand-text-secondary mb-1.5">{t('company.auth.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-secondary" />
                <input
                  id="ph-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-brand-bg border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-brand-text-secondary/50 focus:border-brand-red focus:outline-hidden transition-colors"
                  placeholder="you@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="ph-password" className="block text-sm text-brand-text-secondary mb-1.5">{t('company.auth.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-secondary" />
                <input
                  id="ph-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-brand-bg border border-white/10 rounded-xl pl-11 pr-11 py-3 text-white placeholder-brand-text-secondary/50 focus:border-brand-red focus:outline-hidden transition-colors"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  aria-label={t('cx.auth.show_password')}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-secondary hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end -mt-1">
              <a
                href={mailto(t('cx.auth.forgot_subject'), t('cx.auth.forgot_body', { email: email || '' }))}
                className="text-xs text-brand-text-secondary hover:text-white hover:underline"
              >
                {t('cx.auth.forgot')}
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3! text-base flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {t('company.auth.login')} <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-brand-text-secondary mt-6">
          {t('company.auth.no_account')}{' '}
          <Link href="/register" className="text-brand-red-light hover:underline font-medium">
            {t('company.auth.register_link')}
          </Link>
        </p>

        <p className="text-center text-xs text-brand-text-muted mt-4">
          {t('ph.powered_by')} <span className="text-brand-red-light font-bold">UNLOCKED</span>
        </p>
      </div>
    </div>
  );
}
