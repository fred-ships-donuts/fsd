import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export type Scope = 'global' | 'project';

// Where the scopes live; tests point both at temporary directories.
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
    installed: join(fsd, 'installed.json'),
    config: join(fsd, 'config.json'),
    skills: join(fsd, 'skills'),
  };
}

export const baseDirs = ['nook/kitchen', 'nook/bakers', '.fsd/oven', '.fsd/cache', '.fsd/logs'];

// Idempotent. Only the install wizard calls this (SPEC 4.2).
export function ensureBaseStructure(scope: Scope, env: Env = realEnv()): string[] {
  const { root } = scopePaths(scope, env);
  return baseDirs.map((dir) => {
    const path = join(root, dir);
    mkdirSync(path, { recursive: true });
    return path;
  });
}

export function writeJsonAtomic(file: string, data: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(data, null, 2) + '\n');
  renameSync(temp, file);
}
