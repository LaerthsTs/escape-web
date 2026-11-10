'use client';

import { useEffect } from 'react';
import { photosPortalUrl } from '@/lib/companyAuth';
import { useTranslation } from '@/lib/i18n';

// Old link target: the Photos tool now lives on its own subdomain.
export default function CompanyPhotosPage() {
  const { t } = useTranslation();
  useEffect(() => {
    window.location.href = photosPortalUrl();
  }, []);
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <p className="text-brand-text-muted">{t('cx.photos.redirecting')}</p>
    </div>
  );
}
