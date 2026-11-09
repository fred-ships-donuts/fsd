import { listSkills, skillLangs, skillVersion } from '../core/catalog.js';
import { defaultSkillPath } from '../core/claudeLink.js';
import { conflictPaths, hasConflict } from '../core/conflicts.js';
import { planGitignore } from '../core/gitignore.js';
import { readRegistry, skillState, type SkillState } from '../core/registry.js';
import { realEnv, type Env, type Scope } from '../core/scope.js';
import { isValidVersion } from '../core/semver.js';
import type { InstallChoices } from './choices.js';

// What the wizard's screens show: read-only questions about the catalog, the registry and the conflicts.

export interface SkillRow {
  name: string;
  version: string;
  langs: string[];
  state: SkillState;
}

export interface InstalledRow {
  name: string;
  version: string;
  lang: string;
  state: SkillState;
}

export function catalogRows(scope: Scope, env: Env = realEnv()): SkillRow[] {
  const registry = readRegistry(scope, env);
  return listSkills().map((skill) => {
    const version = skillVersion(skill) ?? '';
    return {
      name: skill.name,
      version,
      langs: skillLangs(skill),
      state: isValidVersion(version) ? skillState(registry.skills[skill.name], version) : 'not installed',
    };
  });
}

export function installedRows(scope: Scope, env: Env = realEnv()): InstalledRow[] {
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

/** The chosen skills that have a same-name skill in the way. */
export function conflictsFor(choices: InstallChoices, env: Env = realEnv()): string[] {
  return choices.skills.filter((name) => hasConflict(choices.scope, name, env));
}

export const conflictWhere = (choices: InstallChoices, name: string, env: Env = realEnv()): string[] => conflictPaths(choices.scope, name, undefined, env);

// `unlinked` needs the original to be in .claude/skills, not at our own destination.
export function unlinkedAvailable(choices: InstallChoices, name: string, env: Env = realEnv()): boolean {
  const where = conflictWhere(choices, name, env);
  return where.length > 0 && !where.includes(defaultSkillPath(choices.scope, name, env));
}

/** The summary line for the project `.gitignore`: only when Install will change it (SPEC 4.2); null otherwise. */
export function gitignoreNoteFor(scope: Scope, cwd: string): string | null {
  if (scope !== 'project') return null;
  const change = planGitignore(cwd);
  if (!change) return null;
  if ('error' in change) return change.error;
  return change.expected === null ? `.gitignore: creates it with ${change.lines.join(', ')}` : `.gitignore: adds ${change.lines.join(', ')}`;
}
