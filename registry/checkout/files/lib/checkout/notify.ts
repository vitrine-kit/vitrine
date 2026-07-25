// Order confirmation email. Uses Payload sendEmail when the email feature + SMTP
// are configured; otherwise logs to the console (zero-config).
import type { Order } from '@vitrine-kit/contracts';
import { siteConfig } from '@/site.config';
import { siteName } from '@/lib/site';

export async function notifyOrderConfirmation(order: Order): Promise<void> {
  const to = order.email?.trim();
  if (!to) return;

  const provider = siteConfig.integrations.email;
  const subject = `Order confirmation — ${siteName}`;
  const body = [
    `Thanks for your order at ${siteName}.`,
    ``,
    `Order total: ${(order.total / 100).toFixed(2)} ${order.currency}`,
    `Status: ${order.status}`,
    `Lines: ${order.lines.map((l) => `${l.quantity}× ${l.title}`).join(', ')}`,
  ].join('\n');

  let from: string | undefined;
  try {
    const emailMod = await import('../email/adapter.js');
    from = emailMod.emailFromAddress();
  } catch {
    // email feature not installed
  }

  if (provider || from) {
    try {
      const { getPayload } = await import('payload');
      const config = (await import('@payload-config')).default;
      const payload = await getPayload({ config });
      await payload.sendEmail({
        to,
        from: from ?? undefined,
        subject,
        text: body,
      });
      return;
    } catch (error) {
      console.warn(
        '[vitrine] payload.sendEmail failed — falling back to console log',
        error instanceof Error ? error.message : error,
      );
    }
  }

  console.info(
    `[vitrine] order email${provider ? ` via "${provider}"` : ''}${from ? ` from ${from}` : ''} → ${to}\n${subject}\n${body}`,
  );
}
