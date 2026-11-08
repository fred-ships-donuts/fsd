import { readdirSync } from 'node:fs';
import { exists } from '../core/fs.js';
import { isAlive, pidOf, readJournal, runDirs, type Journal } from '../core/runJournal.js';
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
  removeEmptyAncestors(journal);
}

export function discard(journal: Journal, runDir: string, keepAncestors: boolean): void {
  realOps.remove(runDir);
  if (!keepAncestors) removeEmptyAncestors(journal);
}

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
