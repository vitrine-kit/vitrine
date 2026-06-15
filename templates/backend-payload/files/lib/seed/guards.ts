// Чистые гарды zero-config dev-процедур (§18). Сид и dev-админ выполняются
// ТОЛЬКО в dev И при пустой коллекции — идемпотентно и никогда на проде.
export function shouldRunDevTask(opts: { isProd: boolean; existingCount: number }): boolean {
  return !opts.isProd && opts.existingCount === 0;
}
