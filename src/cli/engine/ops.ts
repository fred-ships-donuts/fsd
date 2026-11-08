import { cpSync, copyFileSync, mkdirSync, renameSync, rmSync, symlinkSync } from 'node:fs';
import { copyFilter } from '../core/catalog.js';
import { writeJsonAtomic } from '../core/fs.js';

// Every filesystem change of a run goes through these operations, so a caller can replace any of them.
export interface Ops {
  mkdir(path: string): void;
  copyDir(from: string, to: string): void;
  copyFile(from: string, to: string): void;
  move(from: string, to: string): void;
  remove(path: string): void;
  symlink(target: string, link: string): void;
  writeJson(file: string, data: unknown): void;
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
  remove: (path) => rmSync(path, { recursive: true, force: true }),
  symlink: (target, link) => symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir'),
  writeJson: (file, data) => writeJsonAtomic(file, data),
};
