// Pure guards for zero-config dev procedures (§18). The seed and dev admin run
// ONLY in dev AND when the collection is empty — idempotent and never in prod.
export function shouldRunDevTask(opts: { isProd: boolean; existingCount: number }): boolean {
  return !opts.isProd && opts.existingCount === 0;
}
