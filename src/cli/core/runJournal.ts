import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { scopePaths, type Env, type Scope } from './scope.js';

// The journal a run keeps in `.fsd/cache/run-<pid>-<id>/` (SPEC 6.9), and the read-only questions about it.
// Writing it and undoing it belong to the engine (engine/).

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

export const JOURNAL_FILE = 'journal.json';

export const journalPath = (runDir: string): string => join(runDir, JOURNAL_FILE);

export function readJournal(runDir: string): Journal | undefined {
  try {
    return JSON.parse(readFileSync(journalPath(runDir), 'utf8')) as Journal;
  } catch {
    return undefined;
  }
}

export function runDirs(cacheDir: string): string[] {
  try {
    return readdirSync(cacheDir).filter((name) => /^run-\d+-/.test(name)).map((name) => join(cacheDir, name));
  } catch {
    return [];
  }
}

export const pidOf = (runDir: string): number => Number(/^run-(\d+)-/.exec(basename(runDir))?.[1]);

/** True when the process that owns a run is still running (this process never counts). */
export function isAlive(pid: number): boolean {
  if (pid === process.pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

// Paths created by runs that died before committing: leftovers, not skills "in the way".
export function deadRunPaths(scope: Scope, env: Env): string[] {
  const paths: string[] = [];
  for (const runDir of runDirs(scopePaths(scope, env).cache)) {
    if (isAlive(pidOf(runDir))) continue;
    const journal = readJournal(runDir);
    if (journal && !journal.committed) paths.push(...journal.created);
  }
  return paths;
}
