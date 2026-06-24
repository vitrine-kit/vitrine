#!/usr/bin/env node
// @vitrine-kit/vitrine — CLI. Command wrappers over the install primitive:
// init/add/remove/list plus update/diff/doctor/kit/design.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';
import * as p from '@clack/prompts';
import type { Backend, Tier } from '@vitrine-kit/contracts';
import {
  addFeatures,
  designApplyCmd,
  diffFeatureCmd,
  doctorCmd,
  listFeatures,
  removeFeatureCmd,
  updateFeaturesCmd,
} from './commands.js';
import { createRegistrySource } from './registry.js';
import { defaultBackend, initProject, suggestFeatures, PAYMENT_PROVIDER_FEATURES } from './init.js';
import { formatChangelog } from './cache.js';
import { kitStatus, kitUpdate, selfUpdate } from './kit-update.js';
import { renderPlan } from './update.js';
import { preflightNode } from './util.js';

// The version is read from package.json at runtime (dist/index.js → ../package.json),
// so `vitrine --version` never drifts from the release (changeset bumps package.json).
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  version: string;
};

const program = new Command();
program.name('vitrine').description('Vitrine CLI').version(pkg.version);

program
  .command('add')
  .description('Add feature(s) to the current repository')
  .argument('<features...>', 'feature names')
  .option('--registry <path>', 'path to the registry')
  .action((features: string[], opts: { registry?: string }) => {
    const res = addFeatures(features, opts.registry);
    console.log(res.installed.length ? `Installed: ${res.installed.join(', ')}` : 'Already installed — no changes.');
  });

program
  .command('remove')
  .description('Remove a feature (if removable)')
  .argument('<feature>', 'feature name')
  .option('--registry <path>', 'path to the registry')
  .action((feature: string, opts: { registry?: string }) => {
    removeFeatureCmd(feature, opts.registry);
    console.log(`Removed: ${feature}`);
  });

program
  .command('update')
  .description('Update an installed feature (3-way merge); all if no arguments')
  .argument('[features...]', 'feature names')
  .option('--registry <path>', 'path to the registry')
  .option('--dry-run', 'show the plan without writing')
  .action((features: string[], opts: { registry?: string; dryRun?: boolean }) => {
    const outcomes = updateFeaturesCmd(features, opts.registry, { dryRun: opts.dryRun });
    let conflicts = 0;
    for (const { plan, applied } of outcomes) {
      console.log(renderPlan(plan));
      if (applied) console.log('  → applied');
      conflicts += plan.files.reduce((n, f) => n + f.conflicts, 0);
    }
    if (conflicts > 0) {
      console.log(`\n⚠ conflicts: ${conflicts}. Resolve the git markers (<<<<<<< / >>>>>>>) by hand.`);
    }
  });

program
  .command('diff')
  .description('Preview update changes (without writing)')
  .argument('<feature>', 'feature name')
  .option('--registry <path>', 'path to the registry')
  .action((feature: string, opts: { registry?: string }) => {
    console.log(renderPlan(diffFeatureCmd(feature, opts.registry)));
  });

program
  .command('list')
  .description('Installed and available features')
  .option('--registry <path>', 'path to the registry')
  .action((opts: { registry?: string }) => {
    const { installed, available } = listFeatures(opts.registry);
    console.log('Installed:', installed.join(', ') || '—');
    console.log('Available:', available.join(', ') || '—');
  });

const design = program.command('design').description('AI design step (wrapper over Claude Code)');
design
  .command('apply')
  .description('Apply the design from /design to the tokens (via Claude Code)')
  .option('--bin <path>', 'path to Claude Code (otherwise VITRINE_CLAUDE_BIN / PATH)')
  .option('--dry-run', 'show the command without running')
  .action((opts: { bin?: string; dryRun?: boolean }) => {
    const code = designApplyCmd({ bin: opts.bin, dryRun: opts.dryRun });
    if (code !== 0) process.exit(code);
  });

const kit = program.command('kit').description('Local tooling (the ~/.vitrine registry cache)');
kit
  .command('update')
  .description('Update the local registry/templates cache from GitHub (or --from <dir>)')
  .option('--from <path>', 'local kit tree (clone / unpacked tarball) instead of the network')
  .option('--version <tag>', 'a specific release')
  .option('--channel <channel>', 'stable | main', 'stable')
  .action((opts: { from?: string; version?: string; channel?: string }) => {
    const res = kitUpdate({ from: opts.from, version: opts.version, channel: opts.channel });
    console.log(`Cache updated to kit ${res.kitVersion}.`);
    console.log(formatChangelog(res.changelog));
  });
kit
  .command('status')
  .description('Cache version and what is newer than the installed CLI')
  .action(() => {
    const s = kitStatus();
    if (!s.cached) {
      console.log('Cache is empty. Run "vitrine kit update".');
      return;
    }
    console.log(`Cache: kit ${s.kitVersion} (${s.channel}), features: ${s.featureCount ?? '—'}, updated ${s.updatedAt}.`);
    console.log(`CLI expects kit ${s.cliKitVersion}.`);
  });

program
  .command('self-update')
  .description('Update the CLI itself (@vitrine-kit/vitrine)')
  .option('--dry-run', 'show the command without running')
  .action((opts: { dryRun?: boolean }) => {
    const code = selfUpdate({ dryRun: opts.dryRun });
    if (code !== 0) process.exit(code);
  });

program
  .command('doctor')
  .description('Check consistency: vitrine.json ↔ files ↔ packages ↔ env')
  .option('--registry <path>', 'path to the registry')
  .action((opts: { registry?: string }) => {
    const report = doctorCmd(opts.registry);
    if (report.issues.length === 0) {
      console.log('✓ No issues found.');
      return;
    }
    for (const i of report.issues) {
      const tag = i.severity === 'error' ? 'ERROR' : 'warn';
      console.log(`[${tag}] ${i.scope}: ${i.message}${i.fix ? ` → ${i.fix}` : ''}`);
    }
    if (!report.ok) process.exit(1);
  });

program
  .command('init')
  .description('Create a new client repository')
  .argument('[name]', 'project name')
  .option('--dir <path>', 'parent directory', process.cwd())
  .option('--tier <tier>', 'catalog | simple-store | full-store')
  .option('--backend <backend>', 'payload | vendure')
  .option('--features <list>', 'comma-separated list')
  .option('--registry <path>', 'path to the registry')
  .option('--yes', 'skip interactive questions')
  .action(async (nameArg: string | undefined, opts: Record<string, string | boolean>) => {
    const registry = createRegistrySource(opts.registry as string | undefined);
    let name = nameArg;
    let tier = opts.tier as Tier | undefined;
    let features = opts.features ? String(opts.features).split(',') : undefined;

    if (!opts.yes && (!name || !tier)) {
      p.intro('vitrine init');
      if (!name) name = String(await p.text({ message: 'Project name', placeholder: 'my-shop' }));
      if (!tier) {
        tier = (await p.select({
          message: 'Tier',
          options: [
            { value: 'catalog', label: 'Catalog' },
            { value: 'simple-store', label: 'Simple store' },
            { value: 'full-store', label: 'Full store' },
          ],
        })) as Tier;
      }
      const suggested = suggestFeatures(tier, registry);
      // The payment provider is a separate step; remove it from the general feature list.
      const baseline = suggested.filter((f) => !PAYMENT_PROVIDER_FEATURES.includes(f));
      const picked = await p.multiselect({
        message: 'Features',
        options: baseline.map((f) => ({ value: f, label: f })),
        initialValues: baseline,
        required: false,
      });
      features = Array.isArray(picked) ? (picked as string[]) : baseline;

      // Payment provider — only for a Payload store (on Vendure payments are native,
      // checkout-* features are Payload-specific). Mutually exclusive choice.
      const wizardBackend = (opts.backend as Backend | undefined) ?? defaultBackend(tier);
      if (tier !== 'catalog' && wizardBackend === 'payload') {
        const labels: Record<string, string> = {
          'checkout-stripe': 'Stripe',
          'checkout-paddle': 'Paddle',
          'checkout-yookassa': 'YooKassa',
        };
        const available = PAYMENT_PROVIDER_FEATURES.filter((f) => registry.hasFeature(f));
        if (available.length > 0) {
          const provider = await p.select({
            message: 'Payment provider',
            options: [
              { value: 'none', label: 'None (add later: vitrine add checkout-<provider>)' },
              ...available.map((f) => ({ value: f, label: labels[f] ?? f })),
            ],
            initialValue: available[0],
          });
          if (typeof provider === 'string' && provider !== 'none') features.push(provider);
        }
      }
      p.outro('Ready');
    }

    if (!name) throw new Error('[vitrine] a project name is required');
    const finalTier: Tier = tier ?? 'catalog';
    const backend: Backend = (opts.backend as Backend | undefined) ?? defaultBackend(finalTier);
    const finalFeatures = features ?? suggestFeatures(finalTier, registry, backend);
    const root = resolve(String(opts.dir ?? process.cwd()), name);

    const res = initProject({ root, name, backend, tier: finalTier, features: finalFeatures, registry });
    console.log(`Created project "${name}" → ${root}`);
    console.log(`Installed: ${res.installed.join(', ') || '—'}`);
  });

async function main(): Promise<void> {
  preflightNode(); // step 0: Node 20+ runtime — for all commands, not just init
  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
