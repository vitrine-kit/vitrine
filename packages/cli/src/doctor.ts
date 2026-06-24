// vitrine doctor (spec §7): reconciles four axes of the client repository's
// consistency — vitrine.json ↔ the files actually present ↔ installed packages
// (package.json) ↔ env (.env.example) — and suggests a fix for each discrepancy.
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

  // Global contract packages.
  for (const core of ['@vitrine-kit/contracts', '@vitrine-kit/core']) {
    if (!deps[core]) {
      add({ severity: 'error', scope: 'packages', message: `missing dependency ${core}`, fix: 'add it to package.json' });
    }
  }

  // Design instruction in CLAUDE.md (§7: doctor suggests refreshing it).
  if (exists(paths.claude) && !readText(paths.claude).includes('INSTRUCTION: apply the design')) {
    add({
      severity: 'warn',
      scope: 'design',
      message: 'CLAUDE.md has no design-instruction block',
      fix: 'update CLAUDE.md (kit update brings a fresh instruction)',
    });
  }

  for (const [name, pin] of Object.entries(project.lock.features)) {
    const scope = `feature:${name}`;
    if (!registry.hasFeature(name)) {
      add({ severity: 'error', scope, message: `feature not found in the registry`, fix: 'vitrine kit update' });
      continue;
    }
    const manifest = registry.loadManifest(name);

    // version: repo ↔ registry (cache)
    if (pin.version !== manifest.kitVersion) {
      add({
        severity: 'warn',
        scope,
        message: `repo version ${pin.version}, registry offers ${manifest.kitVersion}`,
        fix: `vitrine update ${name}`,
      });
    }

    // files (per registry source file — catches even a single deleted file)
    const featDir = registry.featureDir(name);
    for (const map of manifest.files) {
      for (const file of eachFeatureFile(featDir, map)) {
        if (!exists(join(project.root, file.repoRel))) {
          add({
            severity: 'error',
            scope,
            message: `missing file "${file.toRel}"`,
            fix: `vitrine add ${name} (reinstalls)`,
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
          message: `missing env key "${e.key}"${e.required ? ' (required)' : ''}`,
          fix: 'add it to .env.example/.env',
        });
      }
    }

    // feature packages
    const need = [...Object.keys(manifest.corePackages ?? {}), ...(manifest.npm ?? []).map((s) => parseNpmSpec(s).name)];
    for (const dep of need) {
      if (!deps[dep]) {
        add({ severity: 'error', scope, message: `missing dependency ${dep}`, fix: `vitrine add ${name} (merges deps)` });
      }
    }

    // slots: registration in lib/slots.ts
    if ((manifest.slots?.length ?? 0) > 0) {
      const fn = `register${pascalCase(name)}Slots`;
      if (!slotsText.includes(fn)) {
        add({ severity: 'error', scope, message: `lib/slots.ts does not call ${fn}`, fix: `vitrine add ${name} (regenerates slots)` });
      }
    }

    // flag in site.config
    if (!configText.includes(`"${name}": true`)) {
      add({ severity: 'warn', scope, message: `site.config has no features.${name} flag`, fix: `vitrine add ${name} (regenerates flags)` });
    }

    // payment provider: registration in lib/payments.ts + active in site.config
    if (manifest.payment) {
      const fn = `register${pascalCase(name)}Provider`;
      if (!paymentsText.includes(fn)) {
        add({ severity: 'error', scope, message: `lib/payments.ts does not call ${fn}`, fix: `vitrine add ${name} (regenerates payments)` });
      }
      if (!configText.includes(`payments: ${JSON.stringify(manifest.payment.provider)}`)) {
        add({ severity: 'warn', scope, message: `site.config integrations.payments ≠ "${manifest.payment.provider}"`, fix: `vitrine add ${name} (regenerates integrations)` });
      }
    }
  }

  return { ok: !issues.some((i) => i.severity === 'error'), issues };
}
