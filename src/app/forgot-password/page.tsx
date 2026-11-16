import { PasswordResetForm } from '@/components/auth/PasswordForms';

export default function ForgotPasswordPage() {
  return <PasswordResetForm kind="player" loginHref="/login" />;
}
