import { lstatSync, mkdirSync, readlinkSync, symlinkSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { realEnv, scopeRoot, type Env, type Scope } from './fsdDir.js';

// Skills live in `.fsd/skills/<name>`; Claude Code reads `.claude/skills/<name>`, which is a symbolic link to it.
export function claudeLinkPath(scope: Scope, name: string, env: Env = realEnv()): string {
  return join(scopeRoot(scope, env), '.claude', 'skills', name);
}

export type LinkResult = 'linked' | 'already linked' | 'path in use';

export const exists = (path: string) => {
  try {
    return lstatSync(path);
  } catch {
    return undefined;
  }
};

export const pointsTo = (link: string, target: string) => {
  try {
    return resolve(dirname(link), readlinkSync(link)) === resolve(target);
  } catch {
    return false;
  }
};

// Never replaces anything that is not already a link to this skill; the caller decides what to do then.
export function linkSkill(scope: Scope, name: string, target: string, env: Env = realEnv()): LinkResult {
  const link = claudeLinkPath(scope, name, env);
  const found = exists(link);
  if (found) return found.isSymbolicLink() && pointsTo(link, target) ? 'already linked' : 'path in use';
  mkdirSync(dirname(link), { recursive: true });
  symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
  return 'linked';
}

// Removes the link only when it points to the given skill folder.
export function unlinkSkill(scope: Scope, name: string, target: string, env: Env = realEnv()): boolean {
  const link = claudeLinkPath(scope, name, env);
  if (!exists(link)?.isSymbolicLink() || !pointsTo(link, target)) return false;
  unlinkSync(link);
  return true;
}
