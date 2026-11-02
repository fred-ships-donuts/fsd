import { conflictPaths, hasConflict, planInstall } from '../actions/install.js';
import { planUninstall } from '../actions/uninstall.js';
import type { ConflictChoice } from '../actions/types.js';
import { readConfig } from '../config.js';
import { runPlan, type RunOptions, type RunOutcome } from '../run.js';
import { join } from 'node:path';
import { realEnv, scopePaths, type Env, type Scope } from '../fsdDir.js';
import { readRegistry, skillState, type SkillState } from '../registry.js';
import { isValidVersion, listSkills, type Skill } from '../skills.js';

export interface InstallChoices {
  scope: Scope;
  skills: string[];
  lang: string;
  autoUpdate: boolean;
  updateSkills: boolean;
  theme: string;
  // Choice per skill that has a same-name skill in the way (SPEC 6.2 rule 3); missing = keep.
  conflicts: Record<string, ConflictChoice>;
}

export interface SkillRow {
  name: string;
  version: string;
  langs: string[];
  state: SkillState;
}

export function catalogRows(scope: Scope, env: Env = realEnv()): SkillRow[] {
  const registry = readRegistry(scope, env);
  return listSkills().map((skill) => {
    const version = skill.variants[0]?.version ?? '';
    return {
      name: skill.name,
      version,
      langs: skill.variants.map((variant) => variant.lang),
      state: isValidVersion(version) ? skillState(registry.skills[skill.name], version) : 'not installed',
    };
  });
}

export function registeredRows(scope: Scope, env: Env = realEnv()) {
  return Object.entries(readRegistry(scope, env).skills).map(([name, entry]) => ({
    name,
    version: entry.version,
    lang: entry.lang,
    state: skillState(entry, entry.version),
  }));
}

// The language step only applies when a chosen skill has more than one language (SPEC 6.2).
export function languageApplies(chosen: string[], rows: SkillRow[]): boolean {
  return rows.some((row) => chosen.includes(row.name) && row.langs.length > 1);
}

export function languageOptions(chosen: string[], rows: SkillRow[]): string[] {
  return [...new Set(rows.filter((row) => chosen.includes(row.name)).flatMap((row) => row.langs))].sort();
}

const pickLang = (skill: Skill | undefined, wanted: string): string | undefined => {
  const langs = skill?.variants.map((variant) => variant.lang) ?? [];
  return langs.includes(wanted) ? wanted : langs[0];
};

export function conflictsFor(choices: InstallChoices, env: Env = realEnv()): string[] {
  return choices.skills.filter((name) => hasConflict(choices.scope, name, env));
}

export const conflictWhere = (choices: InstallChoices, name: string, env: Env = realEnv()): string[] => conflictPaths(choices.scope, name, undefined, env);

// `unlinked` needs the original to be in .claude/skills, not at our own destination.
export function unlinkedAvailable(choices: InstallChoices, name: string, env: Env = realEnv()): boolean {
  const where = conflictWhere(choices, name, env);
  return where.length > 0 && !where.includes(join(scopePaths(choices.scope, env).skills, name));
}

const failedBeforeRun = (message: string): RunOutcome => ({ status: 'failed', phase: 'verify', message, warnings: [] });

// Runs after the summary confirmation (SPEC 6.9): plan, then the phases.
export function executeInstall(choices: InstallChoices, env: Env = realEnv(), options: RunOptions = {}, lastUpdateCheck?: string): Promise<RunOutcome> {
  const catalog = listSkills();
  const requests = choices.skills.map((name) => {
    const lang = pickLang(catalog.find((skill) => skill.name === name), choices.lang);
    return { name, ...(lang ? { lang } : {}), onConflict: choices.conflicts[name] ?? ('keep' as const) };
  });
  const previous = readConfig(env);
  const config = { ...previous, theme: choices.theme, autoUpdate: choices.autoUpdate, updateSkills: choices.updateSkills, ...(lastUpdateCheck ? { lastUpdateCheck } : {}) };
  const plan = planInstall(choices.scope, requests, env, { ensureBase: true, config });
  if (plan.errors.length > 0) return Promise.resolve(failedBeforeRun(plan.errors.join('; ')));
  return runPlan(plan, options);
}

export function executeUninstall(scope: Scope, names: string[], env: Env = realEnv(), options: RunOptions = {}): Promise<RunOutcome> {
  const plan = planUninstall(scope, names, env);
  if (plan.errors.length > 0) return Promise.resolve(failedBeforeRun(plan.errors.join('; ')));
  return runPlan(plan, options);
}
