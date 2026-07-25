import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/accounts/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Forgot password',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex max-w-md flex-col gap-section">
      <header className="flex flex-col gap-unit">
        <h1 className="font-heading text-fg">Forgot password</h1>
        <p className="text-muted-fg">
          Enter your account email. We send a reset link when the address is registered.
        </p>
      </header>
      <ForgotPasswordForm />
      <a href="/account/login" className="w-fit text-fg underline underline-offset-2">
        Back to sign in
      </a>
    </div>
  );
}
