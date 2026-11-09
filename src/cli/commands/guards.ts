import { acquireLock, BUSY, LockBusyError } from '../core/lock.js';
import { liveRun } from '../core/runJournal.js';
import { scopePaths, type Env } from '../core/scope.js';

// Checks shared by the commands that write outside the engine (task new, task step): one place for the rule and its
// message (SPEC 5.5).

export { BUSY };

/**
 * Runs `body` (the check and the write of a task command) holding `.fsd/cache/lock` (SPEC 5.5 "Gravação"). Throws
 * LockBusyError when another fsd run is in progress: the lock is held, or a run of an older fsd left a live run directory.
 */
export function withTaskLock<T>(env: Env, body: () => T): T {
  const cache = scopePaths('project', env).cache;
  const lock = acquireLock(cache);
  try {
    if (liveRun(cache)) throw new LockBusyError();
    return body();
  } finally {
    lock.release();
  }
}
