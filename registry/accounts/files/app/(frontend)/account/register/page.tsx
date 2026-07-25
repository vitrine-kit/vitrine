import type { Metadata } from 'next';
import { RegisterForm } from '@/components/accounts/RegisterForm';

export const metadata: Metadata = {
  title: 'Create account',
  robots: { index: false, follow: false },
};

export default function AccountRegisterPage() {
  return (
    <div className="flex max-w-md flex-col gap-section">
      <header className="flex flex-col gap-unit">
        <h1 className="font-heading text-fg">Create account</h1>
        <p className="text-muted-fg">
          Already have an account?{' '}
          <a href="/account/login" className="underline underline-offset-2">
            Sign in
          </a>
        </p>
      </header>
      <RegisterForm />
    </div>
  );
}
