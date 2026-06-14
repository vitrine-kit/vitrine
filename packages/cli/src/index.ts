#!/usr/bin/env node
// @maks417/vitrine — CLI. Команды-обёртки над примитивом установки.
// Поверхность §9: init/add/remove/list реализованы (M4); update/diff/doctor/
// kit/design — M7+/M9.
import { resolve } from 'node:path';
import { Command } from 'commander';
import * as p from '@clack/prompts';
import type { Backend, Tier } from '@maks417/contracts';
import { addFeatures, listFeatures, removeFeatureCmd } from './commands.js';
import { createRegistrySource } from './registry.js';
import { defaultBackend, initProject, suggestFeatures } from './init.js';

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
  .command('list')
  .description('Установленные и доступные фичи')
  .option('--registry <path>', 'путь к реестру')
  .action((opts: { registry?: string }) => {
    const { installed, available } = listFeatures(opts.registry);
    console.log('Установлены:', installed.join(', ') || '—');
    console.log('Доступны:  ', available.join(', ') || '—');
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
    const finalFeatures = features ?? suggestFeatures(finalTier, registry);
    const root = resolve(String(opts.dir ?? process.cwd()), name);

    const res = initProject({ root, name, backend, tier: finalTier, features: finalFeatures, registry });
    console.log(`Создан проект "${name}" → ${root}`);
    console.log(`Установлено: ${res.installed.join(', ') || '—'}`);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
