import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmdirSync, statSync, unlinkSync, writeSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isAlive } from './runJournal.js';

// SPEC 5.5 and 6.9: `.fsd/cache/lock`, created with O_EXCL, serializes the fsd runs that write in a project (task new,
// task step, task done/archive, skill installs). It holds `{pid, startedAt}`; a lock whose process is gone is stale and
// is taken over. Nobody waits for it: a busy lock is a refusal. This is the second raw write allowed in core/, besides
// the atomic files of core/fs.ts.

export const BUSY = 'another fsd run is in progress';

export class LockBusyError extends Error {
  constructor() {
    super(BUSY);
    this.name = 'LockBusyError';
  }
}

export interface Lock {
  /** Deletes the lock (only while it is still ours) and the directories this call created, when they are empty. */
  release(options?: { keepDirs?: boolean }): void;
}

const LOCK_FILE = 'lock';

const readRaw = (file: string): string | undefined => {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return undefined;
  }
};

const pidIn = (raw: string | undefined): number | undefined => {
  try {
    const pid = (JSON.parse(raw ?? '') as { pid?: unknown }).pid;
    return typeof pid === 'number' && Number.isInteger(pid) && pid > 0 ? pid : undefined;
  } catch {
    return undefined; // unreadable, empty or garbage: stale
  }
};

/**
 * True when the file was created by this call (`openSync` with `wx`, i.e. O_EXCL); false when it already exists.
 * Between the open and the write the file is briefly empty: a reader treats an empty file younger than FRESH_MS as busy.
 */
function tryCreate(file: string, now: Date): boolean {
  let fd: number;
  try {
    fd = openSync(file, 'wx');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
    throw error;
  }
  try {
    writeSync(fd, JSON.stringify({ pid: process.pid, startedAt: now.toISOString() }));
  } finally {
    closeSync(fd);
  }
  return true;
}

const FRESH_MS = 2000;

const isFresh = (file: string): boolean => {
  try {
    return Date.now() - statSync(file).mtimeMs < FRESH_MS;
  } catch {
    return false;
  }
};

function removeEmptyDirs(dirs: string[]): void {
  for (const dir of [...dirs].reverse()) {
    try {
      rmdirSync(dir); // only when empty
    } catch {
      return;
    }
  }
}

export function acquireLock(cacheDir: string, now: () => Date = () => new Date()): Lock {
  const created: string[] = [];
  for (let dir = cacheDir; !existsSync(dir) && dirname(dir) !== dir; dir = dirname(dir)) created.unshift(dir);
  const file = join(cacheDir, LOCK_FILE);
  try {
    mkdirSync(cacheDir, { recursive: true });
    if (!tryCreate(file, now())) {
      const raw = readRaw(file);
      const pid = pidIn(raw);
      if ((pid !== undefined && isAlive(pid)) || (pid === undefined && isFresh(file))) throw new LockBusyError();
      // Stale: take it over once. Re-read first, so a lock another process just retook is not deleted (the residual
      // race between the re-read and the unlink is accepted). A second EEXIST means another process won.
      if (readRaw(file) === raw) {
        try {
          unlinkSync(file);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; // the holder released meanwhile
        }
      }
      if (!tryCreate(file, now())) throw new LockBusyError();
    }
  } catch (error) {
    removeEmptyDirs(created);
    throw error;
  }
  return {
    release: ({ keepDirs = false } = {}) => {
      if (pidIn(readRaw(file)) === process.pid) unlinkSync(file);
      if (!keepDirs) removeEmptyDirs(created);
    },
  };
}
