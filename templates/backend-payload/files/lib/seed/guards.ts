// Pure guards for zero-config bootstrap (§18). Seed and dev admin run when the
// collection is empty — in development always, and in production only when
// SEED_ON_BOOT=1 (docker compose demos / first boot).
export function shouldRunDevTask(opts: {
  isProd: boolean;
  existingCount: number;
  /** When true, allow empty-collection bootstrap even in production. */
  seedOnBoot?: boolean;
}): boolean {
  if (opts.existingCount !== 0) return false;
  if (!opts.isProd) return true;
  return Boolean(opts.seedOnBoot);
}

export function seedOnBootEnabled(): boolean {
  const v = process.env.SEED_ON_BOOT?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}
