import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import type { Scope } from './fsdDir.js';
import { scopePaths, type Env } from './fsdDir.js';
import { exists } from './link.js';
import { realOps } from './ops.js';

// Journal of a run and the recovery of runs whose process is gone (SPEC 6.9). Uses the real operations only.

export class Stop extends Error {
  constructor(
    readonly kind: 'failed' | 'cancelled' | 'changed' | 'busy',
    message: string,
  ) {
    super(message);
  }
}

export interface Journal {
  id: string;
  pid: number;
  startedAt: string;
  scope: Scope;
  // Directories that hold the run directory itself (removed last, only if empty).
  runAncestors: string[];
  cacheCreated: boolean;
  created: string[];
  displaced: Array<{ path: string; backup: string }>;
  restore: Array<{ path: string; backup: string | null }>;
  committed: boolean;
}

const isAlive = (pid: number): boolean => {
  if (pid === process.pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
};


export function undo(journal: Journal, runDir: string): void {
  const ancestors = new Set([runDir, ...journal.runAncestors]);
  for (const path of [...journal.created].reverse()) {
    if (!ancestors.has(path)) realOps.remove(path);
  }
  for (const { path, backup } of [...journal.displaced].reverse()) {
    if (exists(backup)) {
      realOps.remove(path);
      realOps.move(backup, path);
    }
  }
  for (const { path, backup } of [...journal.restore].reverse()) {
    if (backup && exists(backup)) realOps.copyFile(backup, path);
    else if (!backup) realOps.remove(path);
  }
  realOps.remove(runDir);
  for (const dir of [...journal.runAncestors].reverse()) {
    try {
      if (readdirSync(dir).length === 0) realOps.remove(dir);
    } catch {
      // already gone
    }
  }
}

export function discard(journal: Journal, runDir: string, keepAncestors: boolean): void {
  realOps.remove(runDir);
  if (keepAncestors) return;
  for (const dir of [...journal.runAncestors].reverse()) {
    try {
      if (readdirSync(dir).length === 0) realOps.remove(dir);
    } catch {
      // already gone
    }
  }
}

export const readJournal = (runDir: string): Journal | undefined => {
  try {
    return JSON.parse(readFileSync(join(runDir, 'journal.json'), 'utf8')) as Journal;
  } catch {
    return undefined;
  }
};

export const runDirs = (cacheDir: string): string[] => {
  try {
    return readdirSync(cacheDir).filter((name) => /^run-\d+-/.test(name)).map((name) => join(cacheDir, name));
  } catch {
    return [];
  }
};
export const pidOf = (runDir: string) => Number(/^run-(\d+)-/.exec(basename(runDir))?.[1]);

// Recovers runs whose process is gone; stops if another live run exists.
export function recoverRuns(cacheDir: string, warnings: string[], self?: string): void {
  for (const runDir of runDirs(cacheDir)) {
    if (runDir === self) continue;
    if (isAlive(pidOf(runDir))) throw new Stop('busy', 'another fsd run is in progress');
    const journal = readJournal(runDir);
    if (!journal) realOps.remove(runDir);
    else if (journal.committed) discard(journal, runDir, journal.runAncestors.length === 0);
    else undo(journal, runDir);
    warnings.push('recovered an interrupted run');
  }
}


// Paths created by runs that died before committing: leftovers, not skills "in the way" (read-only).
export function deadRunPaths(scope: Scope, env: Env): string[] {
  const cacheDir = join(scopePaths(scope, env).fsd, 'cache');
  const paths: string[] = [];
  for (const runDir of runDirs(cacheDir)) {
    if (isAlive(pidOf(runDir))) continue;
    const journal = readJournal(runDir);
    if (journal && !journal.committed) paths.push(...journal.created);
  }
  return paths;
}
