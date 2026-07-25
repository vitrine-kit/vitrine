// Storefront footer. Hosts the global.footer slot.
import { Slot } from '@vitrine-kit/core/react';
import { siteName } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="mt-section border-t border-border">
      <div className="mx-auto max-w-container px-gutter py-section text-muted-fg">
        <Slot
          name="global.footer"
          fallback={
            <p>
              © {new Date().getFullYear()} {siteName}
            </p>
          }
        />
      </div>
    </footer>
  );
}
