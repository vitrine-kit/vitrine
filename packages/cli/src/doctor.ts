// vitrine doctor (§7 спеки): сверяет четыре оси консистентности репозитория
// клиента — vitrine.json ↔ реально лежащие файлы ↔ установленные пакеты
// (package.json) ↔ env (.env.example) — и предлагает фикс на каждое расхождение.
import { join } from 'node:path';
import type { Project } from './project.js';
import { projectPaths } from './project.js';
import type { RegistrySource } from './registry.js';
import { exists, parseEnvKeys, parseNpmSpec, pascalCase, readJson, readText } from './util.js';
import { eachFeatureFile } from './feature-files.js';

export interface DoctorIssue {
  severity: 'error' | 'warn';
  scope: string;
  message: string;
  fix?: string;
}

export interface DoctorReport {
  ok: boolean;
  issues: DoctorIssue[];
}

export function runDoctor(project: Project, registry: RegistrySource): DoctorReport {
  const paths = projectPaths(project.root);
  const issues: DoctorIssue[] = [];
  const add = (i: DoctorIssue): void => void issues.push(i);

  const pkg = exists(paths.pkg) ? readJson<{ dependencies?: Record<string, string> }>(paths.pkg) : {};
  const deps = pkg.dependencies ?? {};
  const env = exists(paths.env) ? parseEnvKeys(readText(paths.env)) : new Set<string>();
  const configText = exists(paths.config) ? readText(paths.config) : '';
  const slotsText = exists(paths.slots) ? readText(paths.slots) : '';
  const paymentsText = exists(paths.payments) ? readText(paths.payments) : '';

  // Глобальные пакеты-контракты.
  for (const core of ['@vitrine-kit/contracts', '@vitrine-kit/core']) {
    if (!deps[core]) {
      add({ severity: 'error', scope: 'packages', message: `нет зависимости ${core}`, fix: 'добавьте в package.json' });
    }
  }

  // Дизайн-инструкция в CLAUDE.md (§7: doctor предлагает освежить).
  if (exists(paths.claude) && !readText(paths.claude).includes('ИНСТРУКЦИЯ: применить дизайн')) {
    add({
      severity: 'warn',
      scope: 'design',
      message: 'в CLAUDE.md нет блока дизайн-инструкции',
      fix: 'обновите CLAUDE.md (kit update приносит свежую инструкцию)',
    });
  }

  for (const [name, pin] of Object.entries(project.lock.features)) {
    const scope = `feature:${name}`;
    if (!registry.hasFeature(name)) {
      add({ severity: 'error', scope, message: `фича не найдена в реестре`, fix: 'vitrine kit update' });
      continue;
    }
    const manifest = registry.loadManifest(name);

    // версия: репо ↔ реестр (кэш)
    if (pin.version !== manifest.kitVersion) {
      add({
        severity: 'warn',
        scope,
        message: `версия в репо ${pin.version}, реестр предлагает ${manifest.kitVersion}`,
        fix: `vitrine update ${name}`,
      });
    }

    // файлы (по каждому файлу источника реестра — ловит и удаление одного файла)
    const featDir = registry.featureDir(name);
    for (const map of manifest.files) {
      for (const file of eachFeatureFile(featDir, map)) {
        if (!exists(join(project.root, file.repoRel))) {
          add({
            severity: 'error',
            scope,
            message: `нет файла "${file.toRel}"`,
            fix: `vitrine add ${name} (переустановит)`,
          });
        }
      }
    }

    // env
    for (const e of manifest.env ?? []) {
      if (!env.has(e.key)) {
        add({
          severity: e.required ? 'error' : 'warn',
          scope,
          message: `нет ключа env "${e.key}"${e.required ? ' (обязателен)' : ''}`,
          fix: 'добавьте в .env.example/.env',
        });
      }
    }

    // пакеты фичи
    const need = [...Object.keys(manifest.corePackages ?? {}), ...(manifest.npm ?? []).map((s) => parseNpmSpec(s).name)];
    for (const dep of need) {
      if (!deps[dep]) {
        add({ severity: 'error', scope, message: `нет зависимости ${dep}`, fix: `vitrine add ${name} (домержит deps)` });
      }
    }

    // слоты: регистрация в lib/slots.ts
    if ((manifest.slots?.length ?? 0) > 0) {
      const fn = `register${pascalCase(name)}Slots`;
      if (!slotsText.includes(fn)) {
        add({ severity: 'error', scope, message: `lib/slots.ts не вызывает ${fn}`, fix: `vitrine add ${name} (регенерирует slots)` });
      }
    }

    // флаг в site.config
    if (!configText.includes(`"${name}": true`)) {
      add({ severity: 'warn', scope, message: `в site.config нет флага features.${name}`, fix: `vitrine add ${name} (регенерирует флаги)` });
    }

    // платёжный провайдер: регистрация в lib/payments.ts + активен в site.config
    if (manifest.payment) {
      const fn = `register${pascalCase(name)}Provider`;
      if (!paymentsText.includes(fn)) {
        add({ severity: 'error', scope, message: `lib/payments.ts не вызывает ${fn}`, fix: `vitrine add ${name} (регенерирует payments)` });
      }
      if (!configText.includes(`payments: ${JSON.stringify(manifest.payment.provider)}`)) {
        add({ severity: 'warn', scope, message: `в site.config integrations.payments ≠ "${manifest.payment.provider}"`, fix: `vitrine add ${name} (регенерирует integrations)` });
      }
    }
  }

  return { ok: !issues.some((i) => i.severity === 'error'), issues };
}
