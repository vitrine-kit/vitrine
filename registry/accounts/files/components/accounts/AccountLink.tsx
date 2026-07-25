'use client';

import { useChromeLabel } from '@/lib/i18n/useChromeLabel';

export function AccountLink() {
  const label = useChromeLabel('account');
  return (
    <a
      href="/account"
      className="vt-account-link text-fg transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 ring-ring"
    >
      {label}
    </a>
  );
}
