import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// The two places fsd installs into (SPEC 4): the global scope (the home directory) and the project scope (the current one).

export type Scope = 'global' | 'project';

// Where the scopes live; a caller can point both at other directories.
export interface Env {
  home: string;
  cwd: string;
}

export function realEnv(): Env {
  return { home: homedir(), cwd: process.cwd() };
}

export interface ScopePaths {
  root: string;
  fsd: string;
  nook: string;
  cache: string;
  installed: string;
  config: string;
  skills: string;
}

export function scopeRoot(scope: Scope, env: Env): string {
  return scope === 'global' ? env.home : env.cwd;
}

export function scopePaths(scope: Scope, env: Env = realEnv()): ScopePaths {
  const root = scopeRoot(scope, env);
  const fsd = join(root, '.fsd');
  return {
    root,
    fsd,
    nook: join(root, 'nook'),
    cache: join(fsd, 'cache'),
    installed: join(fsd, 'installed.json'),
    config: join(fsd, 'config.json'),
    skills: join(fsd, 'skills'),
  };
}

/** The base structure the install flow creates (SPEC 4.2), relative to the scope's root. */
export const baseDirs = ['nook/kitchen', 'nook/bakers', '.fsd/oven', '.fsd/cache', '.fsd/logs'];

/** The scopes that have something installed: always the global one, plus the project one when it has a registry (SPEC 5.3). */
export function installedScopes(env: Env): Scope[] {
  const scopes: Scope[] = ['global'];
  if (env.cwd !== env.home && existsSync(scopePaths('project', env).installed)) scopes.push('project');
  return scopes;
}
