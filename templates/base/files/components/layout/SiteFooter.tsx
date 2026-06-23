// Подвал витрины. Хостит слот global.footer.
import { Slot } from '@vitrine-kit/core/react';

export function SiteFooter() {
  return (
    <footer className="mt-section border-t border-border">
      <div className="mx-auto max-w-container px-gutter py-section text-muted-fg">
        <Slot
          name="global.footer"
          fallback={<p>© {new Date().getFullYear()}</p>}
        />
      </div>
    </footer>
  );
}
