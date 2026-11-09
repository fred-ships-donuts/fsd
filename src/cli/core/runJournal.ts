import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { scopePaths, type Env, type Scope } from './scope.js';

// The journal a run keeps in `.fsd/cache/run-<pid>-<id>/` (SPEC 6.9), and the read-only questions about it.
// Writing it and undoing it belong to the engine (engine/).

/** One change of a run, kept in the order it was made; undo walks them from the last to the first. */
export type Action =
  | { kind: 'created'; path: string }
  | { kind: 'createdDir'; path: string }
  | { kind: 'displaced'; path: string; backup: string }
  | { kind: 'moved'; from: string; to: string }
  | { kind: 'restore'; path: string; backup: string | null };

export const JOURNAL_SCHEMA = 2;

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

// The journal before `schema` existed: one list per kind of change, undone in a fixed order.
type JournalV1 = Omit<Journal, 'schema' | 'actions'> & {
  created: string[];
  displaced: Array<{ path: string; backup: string }>;
  restore: Array<{ path: string; backup: string | null }>;
};

export const JOURNAL_FILE = 'journal.json';

export const journalPath = (runDir: string): string => join(runDir, JOURNAL_FILE);

// Walked backwards this gives the old undo: created, then displaced, then restore, each from the last to the first.
function fromV1(old: JournalV1): Journal {
  const { created, displaced, restore, ...rest } = old;
  const actions: Action[] = [
    ...restore.map((r): Action => ({ kind: 'restore', path: r.path, backup: r.backup })),
    ...displaced.map((d): Action => ({ kind: 'displaced', path: d.path, backup: d.backup })),
    ...created.map((path): Action => ({ kind: 'created', path })),
  ];
  return { ...rest, schema: JOURNAL_SCHEMA, actions };
}

/** The journal (an old one is converted), 'newer' when a newer fsd wrote it, undefined when there is none or it is unreadable. */
export function readJournal(runDir: string): Journal | 'newer' | undefined {
  try {
    const raw = JSON.parse(readFileSync(journalPath(runDir), 'utf8')) as { schema?: number } | null;
    if (raw === null || typeof raw !== 'object') return undefined;
    if (raw.schema === undefined) return fromV1(raw as unknown as JournalV1);
    if (raw.schema > JOURNAL_SCHEMA) return 'newer';
    return raw as Journal;
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

/** The run directory of a live run (other than `except`), or undefined when no other fsd run is in progress. */
export function liveRun(cacheDir: string, except?: string): string | undefined {
  return runDirs(cacheDir).find((runDir) => runDir !== except && isAlive(pidOf(runDir)));
}

// Paths created by runs that died before committing: leftovers, not skills "in the way".
export function deadRunPaths(scope: Scope, env: Env): string[] {
  const paths: string[] = [];
  for (const runDir of runDirs(scopePaths(scope, env).cache)) {
    if (isAlive(pidOf(runDir))) continue;
    const journal = readJournal(runDir);
    if (journal === undefined || journal === 'newer' || journal.committed) continue;
    for (const action of journal.actions) if (action.kind === 'created' || action.kind === 'createdDir') paths.push(action.path);
  }
  return paths;
}
