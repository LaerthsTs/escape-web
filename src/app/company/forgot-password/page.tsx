'use client';

import { PasswordResetForm } from '@/components/auth/PasswordForms';
import { useCompanyPath } from '@/lib/companyAuth';

export default function CompanyForgotPasswordPage() {
  const p = useCompanyPath();
  return <PasswordResetForm kind="company" loginHref={p('/company/login')} />;
}
