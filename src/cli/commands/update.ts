import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { planInstall } from '../actions/install.js';
import type { ActionResult } from '../actions/types.js';
import { readConfig } from '../config.js';
import { realEnv, scopePaths, type Env, type Scope } from '../fsdDir.js';
import { readRegistry } from '../registry.js';
import { runPlan, type RunOptions } from '../run.js';
import { fetchLatestVersion, installLatest, isGlobalInstall, isNewer } from '../selfUpdate.js';
import { findSkill } from '../skills.js';

export interface Io {
  out: (line: string) => void;
  err: (line: string) => void;
}

export const consoleIo: Io = { out: (line) => console.log(line), err: (line) => console.error(line) };

export const formatResult = (r: ActionResult): string =>
  `${r.action}${r.note ? ` (${r.note})` : ''} ${r.name} ${r.version} [${r.lang}] ${r.destination}`;

export interface SkillsOptions {
  force?: boolean;
  run?: RunOptions;
}

// `fsd update skill [nome]`: global scope, plus the project scope when it has a registry (SPEC 5.3).
export async function updateSkillsCommand(name: string | undefined, io: Io = consoleIo, env: Env = realEnv(), options: SkillsOptions = {}): Promise<number> {
  const force = options.force ?? false;
  const scopes: Scope[] = ['global'];
  if (env.cwd !== env.home && existsSync(scopePaths('project', env).installed)) scopes.push('project');

  const registries = scopes.map((scope) => ({ scope, skills: readRegistry(scope, env).skills }));
  if (name && !registries.some((registry) => registry.skills[name])) {
    io.err(`skill ${name} is not installed`);
    return 1;
  }
  if (name && !findSkill(name)) {
    io.err(`skill ${name} not found in catalog`);
    return 1;
  }

  let failed = false;
  for (const { scope, skills } of registries) {
    const requests = Object.entries(skills)
      .filter(([skillName]) => !name || skillName === name)
      // --force replaces originals only for skills that should be linked (SPEC 5.3).
      .map(([skillName, entry]) => ({ name: skillName, lang: entry.lang, destination: entry.path, onConflict: force && entry.linked !== false ? ('replace' as const) : ('keep' as const) }));
    const plan = planInstall(scope, requests, env);
    for (const error of plan.errors) {
      io.err(error);
      failed = true;
    }
    const outcome = await runPlan(plan, options.run);
    if (outcome.status !== 'done') {
      io.err(outcome.message);
      if (outcome.status === 'cancelled') return 130;
      failed = true;
      continue;
    }
    for (const warning of outcome.warnings) io.out(warning);
    for (const result of outcome.results) {
      if (result.conflict && !force) {
        io.err(`skill ${result.name}: ${result.conflict[0]} exists and is not managed by fsd (use --force to replace)`);
        failed = true;
      } else {
        io.out(formatResult(result));
      }
    }
  }
  return failed ? 1 : 0;
}

export interface UpdateDeps {
  isGlobal: () => boolean;
  fetchLatest: () => Promise<string>;
  install: () => boolean;
  updateSkills: () => number;
  updateSkillsEnabled: () => boolean;
}

const defaultDeps = (version: string): UpdateDeps & { version: string } => ({
  version,
  isGlobal: () => isGlobalInstall(),
  fetchLatest: () => fetchLatestVersion(10_000),
  install: installLatest,
  // The catalog lives in the package, so the skills step runs in the new version's process.
  updateSkills: () => spawnSync('fsd', ['update', 'skill'], { stdio: 'inherit' }).status ?? 1,
  updateSkillsEnabled: () => readConfig().updateSkills,
});

// `fsd update`: updates the CLI itself, regardless of `autoUpdate` and of the 24h limit.
export async function updateCliCommand(version: string, io: Io = consoleIo, deps: UpdateDeps = defaultDeps(version)): Promise<number> {
  if (!deps.isGlobal()) {
    io.out('nothing to update (not installed globally)');
    return 0;
  }
  let latest: string;
  try {
    latest = await deps.fetchLatest();
  } catch (error) {
    io.err(`could not check for updates: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  if (isNewer(latest, version)) {
    io.out(`updating fsd ${version} -> ${latest}`);
    if (!deps.install()) {
      io.err('update failed');
      return 1;
    }
  } else {
    io.out(`fsd is up to date (${version})`);
  }
  return deps.updateSkillsEnabled() ? deps.updateSkills() : 0;
}
