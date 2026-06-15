#!/usr/bin/env node
// @maks417/vitrine — CLI. Команды-обёртки над примитивом установки.
// Поверхность §9: init/add/remove/list реализованы (M4); update/diff/doctor/
// kit/design — M7+/M9.
import { resolve } from 'node:path';
import { Command } from 'commander';
import * as p from '@clack/prompts';
import type { Backend, Tier } from '@maks417/contracts';
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
import { defaultBackend, initProject, suggestFeatures } from './init.js';
import { formatChangelog } from './cache.js';
import { kitStatus, kitUpdate, selfUpdate } from './kit-update.js';
import { renderPlan } from './update.js';
import { preflightNode } from './util.js';

const program = new Command();
program.name('vitrine').description('Vitrine CLI').version('0.0.0');

program
  .command('add')
  .description('Добавить фичу(и) в текущий репозиторий')
  .argument('<features...>', 'имена фич')
  .option('--registry <path>', 'путь к реестру')
  .action((features: string[], opts: { registry?: string }) => {
    const res = addFeatures(features, opts.registry);
    console.log(res.installed.length ? `Установлено: ${res.installed.join(', ')}` : 'Уже установлено — нет изменений.');
  });

program
  .command('remove')
  .description('Удалить фичу (если removable)')
  .argument('<feature>', 'имя фичи')
  .option('--registry <path>', 'путь к реестру')
  .action((feature: string, opts: { registry?: string }) => {
    removeFeatureCmd(feature, opts.registry);
    console.log(`Удалено: ${feature}`);
  });

program
  .command('update')
  .description('Обновить установленную фичу (3-way merge); без аргументов — все')
  .argument('[features...]', 'имена фич')
  .option('--registry <path>', 'путь к реестру')
  .option('--dry-run', 'показать план без записи')
  .action((features: string[], opts: { registry?: string; dryRun?: boolean }) => {
    const outcomes = updateFeaturesCmd(features, opts.registry, { dryRun: opts.dryRun });
    let conflicts = 0;
    for (const { plan, applied } of outcomes) {
      console.log(renderPlan(plan));
      if (applied) console.log('  → применено');
      conflicts += plan.files.reduce((n, f) => n + f.conflicts, 0);
    }
    if (conflicts > 0) {
      console.log(`\n⚠ конфликтов: ${conflicts}. Разрешите git-маркеры (<<<<<<< / >>>>>>>) вручную.`);
    }
  });

program
  .command('diff')
  .description('Предпросмотр изменений update (без записи)')
  .argument('<feature>', 'имя фичи')
  .option('--registry <path>', 'путь к реестру')
  .action((feature: string, opts: { registry?: string }) => {
    console.log(renderPlan(diffFeatureCmd(feature, opts.registry)));
  });

program
  .command('list')
  .description('Установленные и доступные фичи')
  .option('--registry <path>', 'путь к реестру')
  .action((opts: { registry?: string }) => {
    const { installed, available } = listFeatures(opts.registry);
    console.log('Установлены:', installed.join(', ') || '—');
    console.log('Доступны:  ', available.join(', ') || '—');
  });

const design = program.command('design').description('ИИ-шаг дизайна (обёртка над Claude Code)');
design
  .command('apply')
  .description('Применить дизайн из /design к токенам (через Claude Code)')
  .option('--bin <path>', 'путь к Claude Code (иначе VITRINE_CLAUDE_BIN / PATH)')
  .option('--dry-run', 'показать команду без запуска')
  .action((opts: { bin?: string; dryRun?: boolean }) => {
    const code = designApplyCmd({ bin: opts.bin, dryRun: opts.dryRun });
    if (code !== 0) process.exit(code);
  });

const kit = program.command('kit').description('Локальный инструментарий (кэш реестра ~/.vitrine)');
kit
  .command('update')
  .description('Обновить локальный кэш реестра/шаблонов с GitHub (или --from <dir>)')
  .option('--from <path>', 'локальное дерево kit (клон / распакованный tarball) вместо сети')
  .option('--version <tag>', 'конкретный релиз')
  .option('--channel <channel>', 'stable | main', 'stable')
  .action((opts: { from?: string; version?: string; channel?: string }) => {
    const res = kitUpdate({ from: opts.from, version: opts.version, channel: opts.channel });
    console.log(`Кэш обновлён до kit ${res.kitVersion}.`);
    console.log(formatChangelog(res.changelog));
  });
kit
  .command('status')
  .description('Версия кэша и что новее установленного CLI')
  .action(() => {
    const s = kitStatus();
    if (!s.cached) {
      console.log('Кэш пуст. Запусти "vitrine kit update".');
      return;
    }
    console.log(`Кэш: kit ${s.kitVersion} (${s.channel}), фич: ${s.featureCount ?? '—'}, обновлён ${s.updatedAt}.`);
    console.log(`CLI ожидает kit ${s.cliKitVersion}.`);
  });

program
  .command('self-update')
  .description('Обновить сам CLI (@maks417/vitrine)')
  .option('--dry-run', 'показать команду без запуска')
  .action((opts: { dryRun?: boolean }) => {
    const code = selfUpdate({ dryRun: opts.dryRun });
    if (code !== 0) process.exit(code);
  });

program
  .command('doctor')
  .description('Проверить консистентность: vitrine.json ↔ файлы ↔ пакеты ↔ env')
  .option('--registry <path>', 'путь к реестру')
  .action((opts: { registry?: string }) => {
    const report = doctorCmd(opts.registry);
    if (report.issues.length === 0) {
      console.log('✓ Проблем не найдено.');
      return;
    }
    for (const i of report.issues) {
      const tag = i.severity === 'error' ? 'ОШИБКА' : 'предупр.';
      console.log(`[${tag}] ${i.scope}: ${i.message}${i.fix ? ` → ${i.fix}` : ''}`);
    }
    if (!report.ok) process.exit(1);
  });

program
  .command('init')
  .description('Создать новый репозиторий клиента')
  .argument('[name]', 'имя проекта')
  .option('--dir <path>', 'родительский каталог', process.cwd())
  .option('--tier <tier>', 'catalog | simple-store | full-store')
  .option('--backend <backend>', 'payload | vendure')
  .option('--features <list>', 'список через запятую')
  .option('--registry <path>', 'путь к реестру')
  .option('--yes', 'без интерактивных вопросов')
  .action(async (nameArg: string | undefined, opts: Record<string, string | boolean>) => {
    preflightNode(); // шаг 0: рантайм Node 20+
    const registry = createRegistrySource(opts.registry as string | undefined);
    let name = nameArg;
    let tier = opts.tier as Tier | undefined;
    let features = opts.features ? String(opts.features).split(',') : undefined;

    if (!opts.yes && (!name || !tier)) {
      p.intro('vitrine init');
      if (!name) name = String(await p.text({ message: 'Имя проекта', placeholder: 'my-shop' }));
      if (!tier) {
        tier = (await p.select({
          message: 'Уровень',
          options: [
            { value: 'catalog', label: 'Каталог' },
            { value: 'simple-store', label: 'Простой магазин' },
            { value: 'full-store', label: 'Полный магазин' },
          ],
        })) as Tier;
      }
      const suggested = suggestFeatures(tier, registry);
      const picked = await p.multiselect({
        message: 'Фичи',
        options: suggested.map((f) => ({ value: f, label: f })),
        initialValues: suggested,
        required: false,
      });
      features = Array.isArray(picked) ? (picked as string[]) : suggested;
      p.outro('Поехали');
    }

    if (!name) throw new Error('[vitrine] нужно имя проекта');
    const finalTier: Tier = tier ?? 'catalog';
    const backend: Backend = (opts.backend as Backend | undefined) ?? defaultBackend(finalTier);
    const finalFeatures = features ?? suggestFeatures(finalTier, registry, backend);
    const root = resolve(String(opts.dir ?? process.cwd()), name);

    const res = initProject({ root, name, backend, tier: finalTier, features: finalFeatures, registry });
    console.log(`Создан проект "${name}" → ${root}`);
    console.log(`Установлено: ${res.installed.join(', ') || '—'}`);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
