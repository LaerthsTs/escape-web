import { PasswordResetForm } from '@/components/auth/PasswordForms';

// Photos accounts are company accounts.
export default function PhotosForgotPasswordPage() {
  return <PasswordResetForm kind="company" loginHref="/photos-app/login" />;
}
