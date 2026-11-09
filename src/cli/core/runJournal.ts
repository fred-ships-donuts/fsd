import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { scopePaths, type Env, type Scope } from './scope.js';

// The journal a run keeps in `.fsd/cache/run-<pid>-<id>/` (SPEC 6.9), and the read-only questions about it.
// Writing it and undoing it belong to the engine (engine/).

export const JOURNAL_SCHEMA = 2;

/** One change of a run, recorded before it is made. Undo walks the list from the end to the start. */
export type Action =
  // Made by the run from a staging copy or the catalog: undo removes it (rm -rf).
  | { kind: 'created'; path: string }
  // A directory the run created: undo removes it only when it is empty.
  | { kind: 'createdDir'; path: string }
  // What was at `path`, moved to `backup` inside the run directory: undo puts it back.
  | { kind: 'displaced'; path: string; backup: string }
  // A real folder moved by the run: undo moves it back only when `to` exists and `from` does not.
  | { kind: 'moved'; from: string; to: string }
  // A file the run rewrote: undo copies `backup` back, or removes the file when there was none (`backup: null`).
  | { kind: 'restore'; path: string; backup: string | null };

export interface Journal {
  schema: typeof JOURNAL_SCHEMA;
  id: string;
  pid: number;
  startedAt: string;
  scope: Scope;
  // Directories that hold the run directory itself (removed last, only if empty).
  runAncestors: string[];
  cacheCreated: boolean;
  actions: Action[];
  committed: boolean;
}

// The journal before `schema: 2`: one list per kind, undone created → displaced → restore, each from the end.
interface JournalV1 {
  id: string;
  pid: number;
  startedAt: string;
  scope: Scope;
  runAncestors: string[];
  cacheCreated: boolean;
  created: string[];
  displaced: Array<{ path: string; backup: string }>;
  restore: Array<{ path: string; backup: string | null }>;
  committed: boolean;
}

/** A journal this version can undo, or one written by a newer fsd (left alone). */
export type JournalRead = { journal: Journal } | { unknownSchema: unknown };

export const JOURNAL_FILE = 'journal.json';

export const journalPath = (runDir: string): string => join(runDir, JOURNAL_FILE);

/** The run's journal; undefined when it is missing or unreadable. A journal without `schema` is converted from v1. */
export function readJournal(runDir: string): JournalRead | undefined {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(readFileSync(journalPath(runDir), 'utf8')) as Record<string, unknown>;
  } catch {
    return undefined;
  }
  if (data === null || typeof data !== 'object') return undefined;
  if (data.schema === undefined) return { journal: fromV1(data as unknown as JournalV1) };
  if (data.schema === JOURNAL_SCHEMA) return { journal: data as unknown as Journal };
  return { unknownSchema: data.schema };
}

// `[...restore, ...displaced, ...created]` walked backwards is the old undo order. Every v1 `created` stays `created`
// (rm -rf), including the directories of `ensureDirs`.
function fromV1(old: JournalV1): Journal {
  const { created = [], displaced = [], restore = [], ...rest } = old;
  return {
    ...rest,
    schema: JOURNAL_SCHEMA,
    actions: [
      ...restore.map(({ path, backup }): Action => ({ kind: 'restore', path, backup })),
      ...displaced.map(({ path, backup }): Action => ({ kind: 'displaced', path, backup })),
      ...created.map((path): Action => ({ kind: 'created', path })),
    ],
  };
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

/** The run directory of a live run (other than `except`), or undefined when no other fsd run is in progress. */
export function liveRun(cacheDir: string, except?: string): string | undefined {
  return runDirs(cacheDir).find((runDir) => runDir !== except && isAlive(pidOf(runDir)));
}

// Paths created by runs that died before committing: leftovers, not skills "in the way". A folder a run moved
// (`moved.to`) is the user's, and a journal of a newer fsd says nothing this version can trust.
export function deadRunPaths(scope: Scope, env: Env): string[] {
  const paths: string[] = [];
  for (const runDir of runDirs(scopePaths(scope, env).cache)) {
    if (isAlive(pidOf(runDir))) continue;
    const read = readJournal(runDir);
    if (!read || !('journal' in read) || read.journal.committed) continue;
    for (const action of read.journal.actions) {
      if (action.kind === 'created' || action.kind === 'createdDir') paths.push(action.path);
    }
  }
  return paths;
}
