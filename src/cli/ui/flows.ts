import { installSkill, hasConflict, type ActionResult } from '../actions/install.js';
import { uninstallSkill } from '../actions/uninstall.js';
import { readConfig, writeConfig } from '../config.js';
import { ensureBaseStructure, realEnv, type Env, type Scope } from '../fsdDir.js';
import { readRegistry, skillState, type SkillState } from '../registry.js';
import { isValidVersion, listSkills, type Skill } from '../skills.js';

export interface InstallChoices {
  scope: Scope;
  skills: string[];
  lang: string;
  autoUpdate: boolean;
  updateSkills: boolean;
  theme: string;
  symbols: string;
  overwrite: string[];
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

// Runs on the summary confirmation: base structure, installs, then preferences (SPEC 4.2, 6.2, 8.2).
export function executeInstall(choices: InstallChoices, env: Env = realEnv()): { results: ActionResult[]; errors: string[] } {
  ensureBaseStructure(choices.scope, env);
  const catalog = listSkills();
  const results: ActionResult[] = [];
  const errors: string[] = [];
  for (const name of choices.skills) {
    try {
      const lang = pickLang(catalog.find((skill) => skill.name === name), choices.lang);
      results.push(installSkill(choices.scope, { name, ...(lang ? { lang } : {}), overwriteConflict: choices.overwrite.includes(name) }, env));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  const previous = readConfig(env);
  writeConfig({ ...previous, theme: choices.theme, symbols: choices.symbols, autoUpdate: choices.autoUpdate, updateSkills: choices.updateSkills }, env);
  return { results, errors };
}

export function executeUninstall(scope: Scope, names: string[], env: Env = realEnv()): { results: ActionResult[]; errors: string[] } {
  const results: ActionResult[] = [];
  const errors: string[] = [];
  for (const name of names) {
    try {
      results.push(uninstallSkill(scope, name, env));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return { results, errors };
}
