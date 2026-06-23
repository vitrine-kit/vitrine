// vitrine design apply — ИИ-шаг дизайна (§11 спеки). Обёртка над установленным
// Claude Code: CLI НЕ имеет своей Anthropic-интеграции/ключа, а шеллит в `claude`
// с инструкцией из CLAUDE.md + указанием на /design. Агент задаёт ТОЛЬКО значения
// токенов в theme/client.css. Шаг идемпотентен (повторный прогон сходится).
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { TOKEN_CSS_VARS } from '@vitrine-kit/contracts';
import type { Project } from './project.js';
import { readText } from './util.js';

const DESIGN_HEADING = '## ИНСТРУКЦИЯ: применить дизайн из /design';

/** Находит бинарь Claude Code: явный путь → VITRINE_CLAUDE_BIN → поиск в PATH. */
export function findClaudeBin(explicit?: string): string {
  const pinned = explicit ?? process.env.VITRINE_CLAUDE_BIN;
  if (pinned) {
    if (existsSync(pinned)) return pinned;
    throw new Error(`[vitrine] Claude Code не найден по пути "${pinned}"`);
  }

  const names =
    process.platform === 'win32'
      ? ['claude.cmd', 'claude.exe', 'claude.ps1', 'claude']
      : ['claude'];
  for (const dir of (process.env.PATH ?? '').split(delimiter).filter(Boolean)) {
    for (const name of names) {
      const full = join(dir, name);
      if (existsSync(full)) return full;
    }
  }

  throw new Error(
    '[vitrine] Claude Code CLI не найден в PATH. Установите его ' +
      '(npm i -g @anthropic-ai/claude-code) или укажите путь через --bin / VITRINE_CLAUDE_BIN. ' +
      'design apply — обёртка над Claude Code, своего ключа Anthropic не требует.',
  );
}

/** Есть ли в /design что применять (что-то кроме README). */
export function designHasInput(root: string): boolean {
  const dir = join(root, 'design');
  if (!existsSync(dir)) return false;
  return readdirSync(dir).some((entry) => !/^readme\.md$/i.test(entry));
}

/** Блок инструкции дизайна из CLAUDE.md (от заголовка до следующего ## или конца). */
export function extractDesignInstruction(claudeMd: string): string | null {
  const start = claudeMd.indexOf(DESIGN_HEADING);
  if (start === -1) return null;
  const next = claudeMd.indexOf('\n## ', start + DESIGN_HEADING.length);
  return claudeMd.slice(start, next === -1 ? undefined : next).trim();
}

/** Промпт для Claude Code: инструкция из CLAUDE.md + контекст + замкнутый набор токенов. */
export function buildDesignPrompt(project: Project): string {
  const claudeMd = existsSync(join(project.root, 'CLAUDE.md'))
    ? readText(join(project.root, 'CLAUDE.md'))
    : '';
  const instruction = extractDesignInstruction(claudeMd) ?? DESIGN_HEADING;
  const tokens = TOKEN_CSS_VARS.map((v) => `  ${v}`).join('\n');

  return [
    instruction,
    '',
    'Контекст применения:',
    '- Источник дизайна: папка `design/` (экспорт из Claude Design).',
    '- Единственный редактируемый файл: `theme/client.css` — задайте значения CSS-переменных.',
    '- Замкнутый набор имён токенов (других не вводить):',
    tokens,
    '',
    'НЕ редактировать: компоненты, адаптеры, роуты, site.config, lib/*. Только значения',
    'переменных в theme/client.css. Идемпотентность: повторный прогон не накапливает изменения.',
  ].join('\n');
}

export interface DesignApplyOptions {
  bin?: string;
  dryRun?: boolean;
  /** Доп. аргументы для Claude Code (после стандартных). */
  extraArgs?: string[];
}

export interface DesignCommand {
  bin: string;
  args: string[];
  cwd: string;
  prompt: string;
}

export type DesignRunner = (cmd: DesignCommand) => number;

const defaultRunner: DesignRunner = ({ bin, args, cwd }) => {
  const res = spawnSync(bin, args, { cwd, stdio: 'inherit' });
  if (res.error) throw res.error;
  return res.status ?? 0;
};

/** Собирает команду запуска Claude Code (без исполнения) — удобно для dry-run/тестов. */
export function planDesignApply(project: Project, opts: DesignApplyOptions = {}): DesignCommand {
  const bin = findClaudeBin(opts.bin);
  const prompt = buildDesignPrompt(project);
  const args = ['-p', prompt, '--permission-mode', 'acceptEdits', ...(opts.extraArgs ?? [])];
  return { bin, args, cwd: project.root, prompt };
}

export function designApply(
  project: Project,
  opts: DesignApplyOptions = {},
  runner: DesignRunner = defaultRunner,
): number {
  if (!designHasInput(project.root)) {
    throw new Error(
      '[vitrine] папка design/ пуста — положите экспорт из Claude Design и повторите.',
    );
  }
  const cmd = planDesignApply(project, opts);
  if (opts.dryRun) {
    console.log(`[vitrine] dry-run: ${cmd.bin} -p <промпт ${cmd.prompt.length} симв.> --permission-mode acceptEdits`);
    return 0;
  }
  return runner(cmd);
}
