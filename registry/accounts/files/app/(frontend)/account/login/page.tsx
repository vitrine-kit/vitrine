import type { Metadata } from 'next';
import { LoginForm } from '@/components/accounts/LoginForm';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default function AccountLoginPage() {
  return (
    <div className="flex max-w-md flex-col gap-section">
      <header className="flex flex-col gap-unit">
        <h1 className="font-heading text-fg">Sign in</h1>
        <p className="text-muted-fg">
          No account yet?{' '}
          <a href="/account/register" className="underline underline-offset-2">
            Create one
          </a>
        </p>
      </header>
      <LoginForm />
      <p className="text-sm text-muted-fg">
        <a href="/account/forgot-password" className="underline underline-offset-2">
          Forgot password?
        </a>
      </p>
    </div>
  );
}
