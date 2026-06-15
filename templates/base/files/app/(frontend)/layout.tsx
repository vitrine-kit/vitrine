// Корневой layout витрины (route group (frontend)). Payload-админка живёт в
// своём route group (payload) со своим layout — поэтому корневого app/layout
// нет, а каждая группа рендерит свой <html> (паттерн Payload 3 + Next).
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import '../globals.css';
import { siteConfig } from '@/site.config';
import { registerSlots } from '@/lib/slots';
import { Slot } from '@maks417/core/react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';

// Регистрация слотов установленных фич (lib/slots.ts генерируется CLI).
registerSlots();

export const metadata: Metadata = {
  title: { default: 'Vitrine', template: '%s · Vitrine' },
};

export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={siteConfig.i18n.defaultLocale}>
      <body className="min-h-screen bg-bg font-sans text-fg antialiased">
        <Slot name="global.banner-top" />
        <SiteHeader />
        <main className="mx-auto w-full max-w-container px-gutter py-section">{children}</main>
        <SiteFooter />
        <Slot name="global.body-end" />
      </body>
    </html>
  );
}
