import { lstatSync, mkdirSync, readlinkSync, renameSync, writeFileSync, type Stats } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';

// Small filesystem queries and the atomic JSON write shared by the whole CLI.

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
  const temp = `${file}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(data, null, 2) + '\n');
  renameSync(temp, file);
}
