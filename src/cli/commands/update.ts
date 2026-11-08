import { spawnSync } from 'node:child_process';
import { findSkill } from '../core/catalog.js';
import { readConfig } from '../core/config.js';
import { readRegistry } from '../core/registry.js';
import { fetchLatestVersion, installLatest, isGlobalInstall } from '../core/selfUpdate.js';
import { isNewer } from '../core/semver.js';
import { planInstall } from '../plan/install.js';
import { EXIT_FAILED, EXIT_OK } from '../exitCodes.js';
import { consoleIo, type Io } from './io.js';
import { isInstalledSomewhere, runSkillPlans, skillsContext, type SkillsCommandOptions } from './skillPlans.js';

// `fsd update skill [name]`: global scope, plus the project scope when it has a registry (SPEC 5.3).
export async function updateSkillsCommand(name: string | undefined, options: SkillsCommandOptions = {}): Promise<number> {
  const context = skillsContext(options);
  if (name && !isInstalledSomewhere(context, name)) {
    context.io.err(`skill ${name} is not installed`);
    return EXIT_FAILED;
  }
  if (name && !findSkill(name)) {
    context.io.err(`skill ${name} not found in catalog`);
    return EXIT_FAILED;
  }
  return runSkillPlans(context, (scope) => {
    const requests = Object.entries(readRegistry(scope, context.env).skills)
      .filter(([skillName]) => !name || skillName === name)
      // --force replaces originals only for skills that should be linked (SPEC 5.3).
      .map(([skillName, entry]) => ({ name: skillName, lang: entry.lang, destination: entry.path, onConflict: context.force && entry.linked !== false ? ('replace' as const) : ('keep' as const) }));
    return planInstall(scope, requests, context.env);
  });
}

export interface UpdateDeps {
  isGlobal: () => boolean;
  fetchLatest: () => Promise<string>;
  install: () => boolean;
  updateSkills: () => number;
  updateSkillsEnabled: () => boolean;
}

const defaultDeps: UpdateDeps = {
  isGlobal: () => isGlobalInstall(),
  fetchLatest: () => fetchLatestVersion(10_000),
  install: installLatest,
  // The catalog lives in the package, so the skills step runs in the new version's process.
  updateSkills: () => spawnSync('fsd', ['update', 'skill'], { stdio: 'inherit' }).status ?? EXIT_FAILED,
  updateSkillsEnabled: () => readConfig().updateSkills,
};

// `fsd update`: updates the CLI itself, regardless of `autoUpdate` and of the 24h limit.
export async function updateCliCommand(version: string, io: Io = consoleIo, deps: UpdateDeps = defaultDeps): Promise<number> {
  if (!deps.isGlobal()) {
    io.out('nothing to update (not installed globally)');
    return EXIT_OK;
  }
  let latest: string;
  try {
    latest = await deps.fetchLatest();
  } catch (error) {
    io.err(`could not check for updates: ${error instanceof Error ? error.message : String(error)}`);
    return EXIT_FAILED;
  }
  if (isNewer(latest, version)) {
    io.out(`updating fsd ${version} -> ${latest}`);
    if (!deps.install()) {
      io.err('update failed');
      return EXIT_FAILED;
    }
  } else {
    io.out(`fsd is up to date (${version})`);
  }
  return deps.updateSkillsEnabled() ? deps.updateSkills() : EXIT_OK;
}
