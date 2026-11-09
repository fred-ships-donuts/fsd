import { readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { exists } from '../core/fs.js';
import { liveRun, readJournal, runDirs, type Action, type Journal } from '../core/runJournal.js';
import { realOps } from './ops.js';

// Undoing a run from its journal, and recovering runs whose process is gone (SPEC 6.9). Uses the real operations only.

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

// Undoes one action. Each one checks the state first, so running it again (a recovery that was itself interrupted)
// changes nothing more.
function undoAction(action: Action, skip: Set<string>): void {
  switch (action.kind) {
    case 'created':
      if (!skip.has(action.path)) realOps.remove(action.path);
      break;
    case 'createdDir':
      if (!skip.has(action.path) && isEmptyDir(action.path)) realOps.remove(action.path);
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
      if (action.backup === null) {
        realOps.remove(action.path);
      } else if (exists(action.backup)) {
        // Through a temporary file, so a death in the middle never leaves the file cut short.
        const temp = join(dirname(action.path), `.${basename(action.path)}.fsd-undo.tmp`);
        realOps.copyFile(action.backup, temp);
        realOps.rename(temp, action.path);
      }
      break;
  }
}

function isEmptyDir(path: string): boolean {
  try {
    return readdirSync(path).length === 0;
  } catch {
    return false;
  }
}

export function undo(journal: Journal, runDir: string): void {
  const skip = new Set([runDir, ...journal.runAncestors]);
  for (const action of [...journal.actions].reverse()) undoAction(action, skip);
  realOps.remove(runDir);
  removeEmptyAncestors(journal);
}

export function discard(journal: Journal, runDir: string, keepAncestors: boolean): void {
  realOps.remove(runDir);
  if (!keepAncestors) removeEmptyAncestors(journal);
}

// Recovers runs whose process is gone; stops, before touching anything, if another live run exists.
export function recoverRuns(cacheDir: string, warnings: string[], self?: string): void {
  if (liveRun(cacheDir, self)) throw new Stop('busy', 'another fsd run is in progress');
  const others = runDirs(cacheDir).filter((runDir) => runDir !== self);
  // A journal of a newer fsd may hold changes this one does not know how to undo: touch nothing before saying so.
  for (const runDir of others) {
    if (readJournal(runDir) === 'newer') throw new Stop('failed', `${runDir} was written by a newer fsd; update fsd or remove it by hand`);
  }
  for (const runDir of others) {
    const journal = readJournal(runDir);
    if (!journal || journal === 'newer') realOps.remove(runDir);
    else if (journal.committed) discard(journal, runDir, journal.runAncestors.length === 0);
    else undo(journal, runDir);
    warnings.push('recovered an interrupted run');
  }
}
