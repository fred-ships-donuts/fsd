import { cpSync, copyFileSync, mkdirSync, renameSync, rmSync, symlinkSync } from 'node:fs';
import { writeJsonAtomic } from './fsdDir.js';
import { copyFilter } from './skills.js';

// Every filesystem change of a run goes through these operations, so tests can make any of them fail.
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

export type OpName = keyof Ops;

// Test helper: an Ops that throws when `when` says so (a 1-based call number, or a predicate on the arguments).
export function failingOps(name: OpName, when: number | ((args: unknown[], call: number) => boolean) = 1, base: Ops = realOps): Ops {
  let calls = 0;
  const original = base[name] as (...args: unknown[]) => void;
  const fails = typeof when === 'number' ? (_: unknown[], call: number) => call === when : when;
  return {
    ...base,
    [name]: (...args: unknown[]) => {
      if (fails(args, ++calls)) throw new Error(`injected failure in ${name}`);
      original(...args);
    },
  } as Ops;
}
