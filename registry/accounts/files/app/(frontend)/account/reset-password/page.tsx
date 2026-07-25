import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/accounts/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Reset password',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const { token = '' } = await searchParams;

  return (
    <div className="flex max-w-md flex-col gap-section">
      <header className="flex flex-col gap-unit">
        <h1 className="font-heading text-fg">Choose a new password</h1>
        <p className="text-muted-fg">Use at least 8 characters.</p>
      </header>
      <ResetPasswordForm token={token} />
    </div>
  );
}
