import { cpSync, copyFileSync, mkdirSync, renameSync, rmSync, symlinkSync } from 'node:fs';
import { copyFilter } from '../core/catalog.js';
import { writeJsonAtomic, writeTextAtomic, type WriteTextOptions } from '../core/fs.js';

// Every filesystem change of a run goes through these operations, so a caller can replace any of them.
export interface Ops {
  mkdir(path: string): void;
  copyDir(from: string, to: string): void;
  copyFile(from: string, to: string): void;
  // Falls back to copy + remove across filesystems: for staging copies, which can be made again.
  move(from: string, to: string): void;
  // A plain rename, never a copy: for the user's own folders, which a half-made copy would damage.
  rename(from: string, to: string): void;
  remove(path: string): void;
  symlink(target: string, link: string): void;
  // The run's journal.
  writeJson(file: string, data: unknown): void;
  // The files a run rewrites (registry, config, task files).
  writeText(file: string, content: string, options?: WriteTextOptions): void;
}

export const realOps: Ops = {
  mkdir: (path) => mkdirSync(path),
  copyDir: (from, to) => cpSync(from, to, { recursive: true, filter: copyFilter }),
  copyFile: (from, to) => copyFileSync(from, to),
  move: (from, to) => {
    try {
      renameSync(from, to);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error;
      cpSync(from, to, { recursive: true, verbatimSymlinks: true });
      rmSync(from, { recursive: true, force: true });
    }
  },
  rename: (from, to) => renameSync(from, to),
  remove: (path) => rmSync(path, { recursive: true, force: true }),
  symlink: (target, link) => symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir'),
  writeJson: (file, data) => writeJsonAtomic(file, data),
  writeText: (file, content, options) => writeTextAtomic(file, content, options),
};
