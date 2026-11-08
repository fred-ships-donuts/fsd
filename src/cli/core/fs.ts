import { chmodSync, lstatSync, mkdirSync, readFileSync, readlinkSync, renameSync, rmdirSync, rmSync, statSync, writeFileSync, type Stats } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';

// Small filesystem queries and the atomic writes (JSON and text) shared by the whole CLI.

/** The entry at `path` itself (a link is not followed), or undefined when there is nothing there. */
export function exists(path: string): Stats | undefined {
  try {
    return lstatSync(path);
  } catch {
    return undefined;
  }
}

/** True when the symbolic link `link` resolves to `target`. */
export function pointsTo(link: string, target: string): boolean {
  try {
    return resolve(dirname(link), readlinkSync(link)) === resolve(target);
  } catch {
    return false;
  }
}

/** True when `link` is a symbolic link to `target`. */
export const isLinkTo = (link: string, target: string): boolean => exists(link)?.isSymbolicLink() === true && pointsTo(link, target);

export const isInside = (root: string, path: string): boolean => path === root || path.startsWith(root + sep);

/** The directories that would have to be created for `path` to exist, outermost first (`path` included). */
export function missingAncestors(path: string): string[] {
  const missing: string[] = [];
  let current = path;
  while (!exists(current)) {
    missing.unshift(current);
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return missing;
}

/** `path`, or its nearest ancestor that exists. */
export function nearestExisting(path: string): string {
  let current = path;
  while (!exists(current) && dirname(current) !== current) current = dirname(current);
  return current;
}

export function writeJsonAtomic(file: string, data: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  writeTextAtomic(file, JSON.stringify(data, null, 2) + '\n');
}

/** The file's text, or null when there is no file. Other read errors are thrown. */
export function readTextOrNull(file: string): string | null {
  try {
    return readFileSync(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/** The file changed on disk between reading it and replacing it. */
export class FileChangedError extends Error {
  constructor(readonly file: string) {
    super(`${file} changed while writing`);
    this.name = 'FileChangedError';
  }
}

export interface WriteTextOptions {
  // What the file must still contain right before it is replaced (null: the file must not exist). Compared by content,
  // not by mtime: editors that save by renaming change the mtime of an unchanged file.
  expected?: string | null;
}

// Hidden, in the same directory (a rename across devices is not atomic), and per process.
const tempPath = (file: string): string => join(dirname(file), `.${basename(file)}.${process.pid}.tmp`);

/**
 * Writes through a hidden temporary file and a rename, so a reader sees the old or the new text, never half of it.
 * With `expected`, refuses (FileChangedError) when the file no longer holds that text. Guards against lost updates,
 * not a lock: a write between the check and the rename can still be lost.
 */
export function writeTextAtomic(file: string, content: string, options: WriteTextOptions = {}): void {
  const temp = tempPath(file);
  try {
    writeFileSync(temp, content);
    // The rename replaces the file, so the new one gets the old one's permissions.
    const mode = modeOf(file);
    if (mode !== undefined) chmodSync(temp, mode);
    if (options.expected !== undefined && readTextOrNull(file) !== options.expected) throw new FileChangedError(file);
    renameSync(temp, file);
  } catch (error) {
    rmSync(temp, { force: true });
    throw error;
  }
}

function modeOf(file: string): number | undefined {
  try {
    return statSync(file).mode & 0o7777;
  } catch {
    return undefined;
  }
}

/**
 * Creates a file that must not exist yet, with the directories it needs. Throws FileChangedError when the file appeared
 * meanwhile; on any failure, removes the directories it created (so a failed `task new` leaves no empty folder).
 */
export function createTextFile(file: string, content: string): void {
  const created = missingAncestors(dirname(file));
  mkdirSync(dirname(file), { recursive: true });
  try {
    writeTextAtomic(file, content, { expected: null });
  } catch (error) {
    for (const dir of [...created].reverse()) {
      try {
        rmdirSync(dir); // only when empty
      } catch {
        break;
      }
    }
    throw error;
  }
}

export interface UpdateTextResult {
  changed: boolean;
  content: string;
}

/**
 * Reads `file`, applies `transform` and writes the result only when it differs. When the file changes in between, reads
 * and transforms again, up to `retries` more times, then throws FileChangedError. `transform` gets null when there is no
 * file, and may throw to refuse the change (nothing is written).
 */
export function updateTextFile(file: string, transform: (current: string | null) => string, options: { retries?: number } = {}): UpdateTextResult {
  const retries = options.retries ?? 1;
  for (let attempt = 0; ; attempt++) {
    const current = readTextOrNull(file);
    const next = transform(current);
    if (next === current) return { changed: false, content: next };
    try {
      writeTextAtomic(file, next, { expected: current });
      return { changed: true, content: next };
    } catch (error) {
      if (!(error instanceof FileChangedError) || attempt >= retries) throw error;
    }
  }
}
