import { existsSync, readFileSync } from 'node:fs';
import { compareVersions } from './semver.js';
import { realEnv, scopePaths, type Env, type Scope } from './scope.js';

// installed.json of a scope (SPEC 4.4): what fsd installed there. Only the run (engine/run.ts) writes it.

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

export function skillState(entry: Entry | undefined, catalogVersion: string): SkillState {
  if (!entry) return 'not installed';
  if (!existsSync(entry.path)) return 'missing';
  return compareVersions(entry.version, catalogVersion) < 0 ? 'outdated' : 'up to date';
}
