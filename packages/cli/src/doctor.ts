// vitrine doctor (spec §7): reconciles four axes of the client repository's
// consistency — vitrine.json ↔ the files actually present ↔ installed packages
// (package.json) ↔ env (.env.example) — and suggests a fix for each discrepancy.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Project } from './project.js';
import { projectPaths } from './project.js';
import type { RegistrySource } from './registry.js';
import { exists, isDir, parseEnvKeys, parseNpmSpec, pascalCase, readJson, readText } from './util.js';
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
  const claudeText = exists(paths.claude) ? readText(paths.claude) : '';

  // Global contract packages.
  for (const core of ['@vitrine-kit/contracts', '@vitrine-kit/core']) {
    if (!deps[core]) {
      add({ severity: 'error', scope: 'packages', message: `missing dependency ${core}`, fix: 'add it to package.json' });
    }
  }

  // Design instruction in CLAUDE.md (§7: doctor suggests refreshing it).
  if (exists(paths.claude) && !claudeText.includes('INSTRUCTION: apply the design')) {
    add({
      severity: 'warn',
      scope: 'design',
      message: 'CLAUDE.md has no design-instruction block',
      fix: 'update CLAUDE.md (kit update brings a fresh instruction)',
    });
  }

  // Managed-region markers must stay paired — add/update/remove throw mid-operation otherwise.
  const markerPairs = [
    { file: 'site.config.ts', text: configText, start: '// vitrine:features:start', end: '// vitrine:features:end' },
    { file: 'site.config.ts', text: configText, start: '// vitrine:integrations:start', end: '// vitrine:integrations:end' },
    ...(exists(paths.claude)
      ? [{ file: 'CLAUDE.md', text: claudeText, start: '<!-- vitrine:features:start -->', end: '<!-- vitrine:features:end -->' }]
      : []),
  ];
  for (const m of markerPairs) {
    const si = m.text.indexOf(m.start);
    const ei = m.text.indexOf(m.end);
    if (si === -1 || ei === -1 || ei < si) {
      add({
        severity: 'error',
        scope: 'markers',
        message: `${m.file}: managed markers "${m.start}" / "${m.end}" are missing or unpaired`,
        fix: 'restore the marker lines — add/update/remove cannot regenerate without them',
      });
    }
  }

  // .env holds real secrets — it must be gitignored.
  if (exists(join(project.root, '.env'))) {
    const gi = exists(join(project.root, '.gitignore')) ? readText(join(project.root, '.gitignore')) : '';
    const covered = gi.split('\n').some((l) => /^\.env(\*)?$/.test(l.trim()));
    if (!covered) {
      add({
        severity: 'warn',
        scope: 'env',
        message: '.env exists but .gitignore has no ".env" entry',
        fix: 'add ".env" to .gitignore — secrets must not be committed',
      });
    }
  }

  // Orphaned pristine snapshots (.vitrine/originals) — leftovers of manual lock edits;
  // a stale <feature>@<version> could shadow the base of a future 3-way merge.
  if (isDir(paths.originals)) {
    for (const entry of readdirSync(paths.originals)) {
      const at = entry.lastIndexOf('@');
      const name = at > 0 ? entry.slice(0, at) : entry;
      const version = at > 0 ? entry.slice(at + 1) : '';
      if (project.lock.features[name]?.version !== version) {
        add({
          severity: 'warn',
          scope: 'originals',
          message: `orphaned snapshot "${entry}" (no installed feature@version matches)`,
          fix: `delete .vitrine/originals/${entry}`,
        });
      }
    }
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
