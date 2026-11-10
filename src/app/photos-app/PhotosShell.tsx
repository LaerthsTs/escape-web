'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Camera, LogOut, Building2 } from 'lucide-react';
import { ConvexClientProvider } from '@/components/providers/ConvexClientProvider';
import { CompanyAuthProvider, useCompanyAuth } from '@/lib/companyAuth';
import { I18nProvider, useTranslation } from '@/lib/i18n';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ToastProvider } from '@/components/company/Toast';

function businessPortalUrl() {
  if (typeof window === 'undefined') return 'https://business.unlocked.gr';
  const { hostname, port, protocol } = window.location;
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return `${protocol}//business.localhost${port ? ':' + port : ''}`;
  }
  return 'https://business.unlocked.gr';
}

function PhotosShell({ children }: { children: React.ReactNode }) {
  const { company, isLoading, isAuthenticated, logout } = useCompanyAuth();
  const { t } = useTranslation();
  const [businessUrl, setBusinessUrl] = useState('https://business.unlocked.gr');
  useEffect(() => setBusinessUrl(businessPortalUrl()), []);
  useEffect(() => {
    document.title = 'UNLOCKED Photos';
  });
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === '/login' || pathname === '/photos-app/login';
  const isRegisterPage = pathname === '/register' || pathname === '/photos-app/register';
  const isAuthPage = isLoginPage || isRegisterPage;

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isAuthPage) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, isAuthPage, router]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-red/30 border-t-brand-red rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Top bar */}
      <header className="h-14 bg-brand-surface border-b border-white/5 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand-red rounded-lg flex items-center justify-center">
            <Camera className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-base font-display font-bold tracking-wider">
            UN<span className="text-brand-red-light">LOCKED</span>
            <span className="text-brand-text-muted text-xs ml-1.5 font-normal">Photos</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <span className="text-sm text-brand-text-secondary hidden md:block max-w-48 truncate">
            {company?.name}
          </span>
          <a
            href={businessUrl}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-brand-text-secondary hover:text-white"
            title={t('ph.to_business')}
          >
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">{t('ph.to_business')}</span>
          </a>
          <LanguageToggle />
          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            aria-label={t('company.nav.logout')}
            title={t('company.nav.logout')}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-brand-text-muted hover:text-brand-red-light"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main>{children}</main>
    </div>
  );
}

export function PhotosLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexClientProvider>
      <I18nProvider>
        <CompanyAuthProvider>
          <ToastProvider>
            <PhotosShell>{children}</PhotosShell>
          </ToastProvider>
        </CompanyAuthProvider>
      </I18nProvider>
    </ConvexClientProvider>
  );
}
