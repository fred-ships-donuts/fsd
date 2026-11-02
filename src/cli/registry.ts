import { existsSync, readFileSync } from 'node:fs';
import { writeJsonAtomic, scopePaths, realEnv, type Env, type Scope } from './fsdDir.js';
import { compareVersions } from './skills.js';

export interface Entry {
  scope: Scope;
  lang: string;
  version: string;
  path: string;
  installedAt: string;
  updatedAt: string;
  // false = installed without the link in .claude/skills (an original was kept there); absent = linked.
  linked?: boolean;
}

export interface Registry {
  schema: 1;
  skills: Record<string, Entry>;
}

export type SkillState = 'not installed' | 'up to date' | 'outdated' | 'missing';

const empty = (): Registry => ({ schema: 1, skills: {} });

// Never throws: a missing or unreadable file is an empty registry.
export function readRegistry(scope: Scope, env: Env = realEnv()): Registry {
  try {
    const data = JSON.parse(readFileSync(scopePaths(scope, env).installed, 'utf8')) as Partial<Registry>;
    if (data.schema !== 1 || typeof data.skills !== 'object' || data.skills === null) return empty();
    return { schema: 1, skills: data.skills };
  } catch {
    return empty();
  }
}

export function writeRegistry(scope: Scope, registry: Registry, env: Env = realEnv()): void {
  writeJsonAtomic(scopePaths(scope, env).installed, registry);
}

export function registerSkill(
  scope: Scope,
  name: string,
  info: { lang: string; version: string; path: string },
  env: Env = realEnv(),
  now: Date = new Date(),
): Entry {
  const registry = readRegistry(scope, env);
  const previous = registry.skills[name];
  const stamp = now.toISOString();
  const entry: Entry = { scope, ...info, installedAt: previous?.installedAt ?? stamp, updatedAt: stamp };
  registry.skills[name] = entry;
  writeRegistry(scope, registry, env);
  return entry;
}

export function unregisterSkill(scope: Scope, name: string, env: Env = realEnv()): void {
  const registry = readRegistry(scope, env);
  delete registry.skills[name];
  writeRegistry(scope, registry, env);
}

export function skillState(entry: Entry | undefined, catalogVersion: string): SkillState {
  if (!entry) return 'not installed';
  if (!existsSync(entry.path)) return 'missing';
  return compareVersions(entry.version, catalogVersion) < 0 ? 'outdated' : 'up to date';
}
