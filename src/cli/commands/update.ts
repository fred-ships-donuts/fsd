import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { installSkill, type ActionResult } from '../actions/install.js';
import { readConfig } from '../config.js';
import { realEnv, scopePaths, type Env, type Scope } from '../fsdDir.js';
import { readRegistry } from '../registry.js';
import { fetchLatestVersion, installLatest, isGlobalInstall, isNewer } from '../selfUpdate.js';
import { findSkill } from '../skills.js';

export interface Io {
  out: (line: string) => void;
  err: (line: string) => void;
}

export const consoleIo: Io = { out: (line) => console.log(line), err: (line) => console.error(line) };

export const formatResult = (r: ActionResult): string =>
  `${r.action}${r.note ? ` (${r.note})` : ''} ${r.name} ${r.version} [${r.lang}] ${r.destination}`;

// `fsd update skill [nome]`: global scope, plus the project scope when it has a registry.
export function updateSkillsCommand(name: string | undefined, io: Io = consoleIo, env: Env = realEnv()): number {
  const scopes: Scope[] = ['global'];
  if (env.cwd !== env.home && existsSync(scopePaths('project', env).installed)) scopes.push('project');

  const targets = scopes.flatMap((scope) =>
    Object.entries(readRegistry(scope, env).skills).map(([skillName, entry]) => ({ scope, skillName, entry })),
  );
  const selected = name ? targets.filter((target) => target.skillName === name) : targets;

  if (name && selected.length === 0) {
    io.err(`skill ${name} is not installed`);
    return 1;
  }
  if (name && !findSkill(name)) {
    io.err(`skill ${name} not found in catalog`);
    return 1;
  }

  let failed = false;
  for (const { scope, skillName, entry } of selected) {
    try {
      io.out(formatResult(installSkill(scope, { name: skillName, lang: entry.lang, destination: entry.path }, env)));
    } catch (error) {
      io.err(error instanceof Error ? error.message : String(error));
      failed = true;
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
