// Avoid importing `payload` types here — registry typecheck has no Payload deps.
export type VitrineEmailAdapter = {
  name: string;
  defaultFromAddress: string;
  defaultFromName: string;
  sendEmail: (message: unknown) => Promise<unknown>;
};

type EmailMessage = {
  to?: string | string[];
  subject?: string;
  html?: string;
  text?: string;
};

export function emailFromAddress(): string | undefined {
  return process.env.EMAIL_FROM?.trim() || undefined;
}

export function emailFromName(): string {
  return process.env.EMAIL_FROM_NAME?.trim() || 'Store';
}

/** Dev/zero-config adapter: logs the full message (incl. reset links) to the console. */
function consoleEmailAdapter(from: string): VitrineEmailAdapter {
  return {
    name: 'vitrine-console',
    defaultFromAddress: from,
    defaultFromName: emailFromName(),
    async sendEmail(message: unknown) {
      const msg = (message ?? {}) as EmailMessage;
      const to = Array.isArray(msg.to) ? msg.to.join(', ') : (msg.to ?? '(unknown)');
      const body = msg.text || msg.html || '';
      console.info(
        [
          '[vitrine] console email (no SMTP_HOST)',
          `  from: ${from}`,
          `  to: ${to}`,
          `  subject: ${msg.subject ?? '(none)'}`,
          '  ---',
          body,
          '  ---',
        ].join('\n'),
      );
      return { messageId: `console-${Date.now()}` };
    },
  };
}

/**
 * Resolve Payload's `email` config entry. Dynamic-imports `@payloadcms/email-nodemailer`
 * when SMTP is configured; otherwise returns a console adapter so auth reset links
 * and order mail still surface in docker logs / the terminal.
 */
export async function resolveEmailAdapter(): Promise<VitrineEmailAdapter | undefined> {
  const from = emailFromAddress();
  const host = process.env.SMTP_HOST?.trim();
  if (!from) return undefined;

  if (!host) {
    console.info(`[vitrine] EMAIL_FROM=${from} (no SMTP_HOST — console email adapter)`);
    return consoleEmailAdapter(from);
  }

  try {
    const { nodemailerAdapter } = await import('@payloadcms/email-nodemailer');
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS ?? '';
    console.info(`[vitrine] SMTP email adapter → ${host}:${port} from ${from}`);
    return nodemailerAdapter({
      defaultFromAddress: from,
      defaultFromName: emailFromName(),
      skipVerify: process.env.NODE_ENV !== 'production',
      transportOptions: {
        host,
        port,
        secure: port === 465,
        auth: user ? { user, pass } : undefined,
      },
    }) as unknown as VitrineEmailAdapter;
  } catch (error) {
    console.warn(
      '[vitrine] @payloadcms/email-nodemailer not installed — falling back to console email adapter',
      error instanceof Error ? error.message : error,
    );
    return consoleEmailAdapter(from);
  }
}
