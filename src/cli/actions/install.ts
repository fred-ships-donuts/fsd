import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { scopePaths, realEnv, type Env, type Scope } from '../fsdDir.js';
import { readRegistry, registerSkill, skillState } from '../registry.js';
import { copySkill, findSkill, isValidVersion, type SkillVariant } from '../skills.js';

export type Action = 'install' | 'upgrade' | 'skip' | 'remove';

// One result per skill; the wizard and `fsd update skill` both print this.
export interface ActionResult {
  name: string;
  action: Action;
  version: string;
  lang: string;
  destination: string;
  note?: string;
}

export interface InstallRequest {
  name: string;
  lang?: string;
  // Allows replacing a folder that exists but is not in the registry.
  overwriteConflict?: boolean;
  // Overrides the default `<scope>/.claude/skills/<name>` (used with a registered path).
  destination?: string;
}

function pickVariant(name: string, variants: SkillVariant[], lang: string | undefined): SkillVariant {
  const variant = lang ? variants.find((candidate) => candidate.lang === lang) : variants.length === 1 ? variants[0] : undefined;
  if (!variant) throw new Error(`skill ${name}: language '${lang ?? ''}' not available (${variants.map((v) => v.lang).join(', ')})`);
  return variant;
}

// A folder at the destination that the registry does not know about.
export function hasConflict(scope: Scope, name: string, env: Env = realEnv()): boolean {
  const registered = readRegistry(scope, env).skills[name] !== undefined;
  return !registered && existsSync(join(scopePaths(scope, env).skills, name));
}

export function installSkill(scope: Scope, request: InstallRequest, env: Env = realEnv()): ActionResult {
  const skill = findSkill(request.name);
  if (!skill) throw new Error(`skill ${request.name} not found in catalog`);
  const version = skill.variants[0]?.version;
  if (!isValidVersion(version)) throw new Error(`skill ${skill.name}: missing or invalid 'metadata.version' in SKILL.md`);

  const entry = readRegistry(scope, env).skills[skill.name];
  const destination = request.destination ?? join(scopePaths(scope, env).skills, skill.name);
  const state = skillState(entry, version);
  const result = (action: Action, lang: string, note?: string): ActionResult => ({
    name: skill.name,
    action,
    version,
    lang,
    destination,
    ...(note ? { note } : {}),
  });

  if (state === 'up to date') return result('skip', entry!.lang, 'up to date');

  if (state === 'not installed' && existsSync(destination) && !request.overwriteConflict) {
    return result('skip', request.lang ?? '', 'folder exists and is not managed by fsd');
  }

  const variant = pickVariant(skill.name, skill.variants, request.lang);
  copySkill(variant, destination);
  // The registry is written only after the copy succeeded.
  registerSkill(scope, skill.name, { lang: variant.lang, version, path: destination }, env);
  return result(state === 'outdated' ? 'upgrade' : 'install', variant.lang);
}
