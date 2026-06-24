// vitrine design apply — the AI design step (spec §11). A wrapper over an installed
// Claude Code: the CLI has NO Anthropic integration/key of its own, it shells out to `claude`
// with the instruction from CLAUDE.md + a pointer to /design. The agent sets ONLY the token
// values in theme/client.css. The step is idempotent (re-running converges).
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { TOKEN_CSS_VARS } from '@vitrine-kit/contracts';
import type { Project } from './project.js';
import { readText } from './util.js';

const DESIGN_HEADING = '## INSTRUCTION: apply the design from /design';

/** Finds the Claude Code binary: explicit path → VITRINE_CLAUDE_BIN → search in PATH. */
export function findClaudeBin(explicit?: string): string {
  const pinned = explicit ?? process.env.VITRINE_CLAUDE_BIN;
  if (pinned) {
    if (existsSync(pinned)) return pinned;
    throw new Error(`[vitrine] Claude Code not found at path "${pinned}"`);
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
    '[vitrine] Claude Code CLI not found in PATH. Install it ' +
      '(npm i -g @anthropic-ai/claude-code) or pass the path via --bin / VITRINE_CLAUDE_BIN. ' +
      'design apply is a wrapper over Claude Code; it needs no Anthropic key of its own.',
  );
}

/** Whether /design has anything to apply (something besides README). */
export function designHasInput(root: string): boolean {
  const dir = join(root, 'design');
  if (!existsSync(dir)) return false;
  return readdirSync(dir).some((entry) => !/^readme\.md$/i.test(entry));
}

/** The design instruction block from CLAUDE.md (from the heading to the next ## or the end). */
export function extractDesignInstruction(claudeMd: string): string | null {
  const start = claudeMd.indexOf(DESIGN_HEADING);
  if (start === -1) return null;
  const next = claudeMd.indexOf('\n## ', start + DESIGN_HEADING.length);
  return claudeMd.slice(start, next === -1 ? undefined : next).trim();
}

/** Prompt for Claude Code: the instruction from CLAUDE.md + context + the closed token set. */
export function buildDesignPrompt(project: Project): string {
  const claudeMd = existsSync(join(project.root, 'CLAUDE.md'))
    ? readText(join(project.root, 'CLAUDE.md'))
    : '';
  const instruction = extractDesignInstruction(claudeMd) ?? DESIGN_HEADING;
  const tokens = TOKEN_CSS_VARS.map((v) => `  ${v}`).join('\n');

  return [
    instruction,
    '',
    'Application context:',
    '- Design source: the `design/` folder (export from Claude Design).',
    '- The only editable file: `theme/client.css` — set the CSS variable values.',
    '- Closed set of token names (do not introduce others):',
    tokens,
    '',
    'Do NOT edit: components, adapters, routes, site.config, lib/*. Only the variable',
    'values in theme/client.css. Idempotency: re-running does not accumulate changes.',
  ].join('\n');
}

export interface DesignApplyOptions {
  bin?: string;
  dryRun?: boolean;
  /** Extra arguments for Claude Code (after the standard ones). */
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

/** Builds the Claude Code launch command (without executing) — handy for dry-run/tests. */
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
      '[vitrine] the design/ folder is empty — add an export from Claude Design and retry.',
    );
  }
  const cmd = planDesignApply(project, opts);
  if (opts.dryRun) {
    console.log(`[vitrine] dry-run: ${cmd.bin} -p <prompt ${cmd.prompt.length} chars> --permission-mode acceptEdits`);
    return 0;
  }
  return runner(cmd);
}
