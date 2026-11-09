import { readdirSync, rmdirSync } from 'node:fs';
import { exists } from '../core/fs.js';
import { liveRun, readJournal, runDirs, type Action, type Journal } from '../core/runJournal.js';
import { realOps } from './ops.js';

// Undoing a run from its journal, and recovering runs whose process is gone (SPEC 6.9). Uses the real operations only.
// Every undo checks the disk before acting, so undoing the same journal twice (a recovery that died) changes nothing.

export type StopKind = 'failed' | 'cancelled' | 'changed' | 'busy';

/** Ends a run on purpose (cancelled, state changed, another run alive), as opposed to an operation that failed. */
export class Stop extends Error {
  constructor(
    readonly kind: StopKind,
    message: string,
  ) {
    super(message);
  }
}

// The run directory's ancestors that the run created, innermost first, removed when they are left empty.
function removeEmptyAncestors(journal: Journal): void {
  for (const dir of [...journal.runAncestors].reverse()) {
    try {
      if (readdirSync(dir).length === 0) realOps.remove(dir);
    } catch {
      // already gone
    }
  }
}

function undoAction(action: Action, keep: Set<string>): void {
  switch (action.kind) {
    case 'created':
      if (!keep.has(action.path)) realOps.remove(action.path);
      break;
    case 'createdDir':
      if (keep.has(action.path)) break;
      try {
        rmdirSync(action.path); // only when empty
      } catch {
        // not empty (left as it is) or already gone
      }
      break;
    case 'displaced':
      if (exists(action.backup)) {
        realOps.remove(action.path);
        realOps.move(action.backup, action.path);
      }
      break;
    case 'moved':
      if (exists(action.to) && !exists(action.from)) realOps.rename(action.to, action.from);
      break;
    case 'restore':
      if (action.backup === null) realOps.remove(action.path);
      else if (exists(action.backup)) realOps.copyFile(action.backup, action.path);
      break;
  }
}

export function undo(journal: Journal, runDir: string): void {
  const keep = new Set([runDir, ...journal.runAncestors]);
  for (const action of [...journal.actions].reverse()) undoAction(action, keep);
  realOps.remove(runDir);
  removeEmptyAncestors(journal);
}

export function discard(journal: Journal, runDir: string, keepAncestors: boolean): void {
  realOps.remove(runDir);
  if (!keepAncestors) removeEmptyAncestors(journal);
}

// Recovers runs whose process is gone; stops, before touching anything, if another live run exists or if a dead run
// left a journal of a newer fsd (undoing it, or writing over the paths it still has to give back, could lose data).
export function recoverRuns(cacheDir: string, warnings: string[], self?: string): void {
  if (liveRun(cacheDir, self)) throw new Stop('busy', 'another fsd run is in progress');
  const dead = runDirs(cacheDir)
    .filter((runDir) => runDir !== self)
    .map((runDir) => ({ runDir, read: readJournal(runDir) }));
  const newer = dead.find(({ read }) => read !== undefined && 'unknownSchema' in read);
  if (newer) throw new Stop('failed', `${newer.runDir} was written by a newer fsd; update fsd or remove it by hand`);
  for (const { runDir, read } of dead) {
    const journal = read && 'journal' in read ? read.journal : undefined;
    if (!journal) realOps.remove(runDir);
    else if (journal.committed) discard(journal, runDir, journal.runAncestors.length === 0);
    else undo(journal, runDir);
    warnings.push('recovered an interrupted run');
  }
}
