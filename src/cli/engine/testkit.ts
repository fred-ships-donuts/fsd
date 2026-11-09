import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JOURNAL_SCHEMA, type Action, type Journal } from '../core/runJournal.js';
import { scopePaths, type Env } from '../core/scope.js';
import { realOps, type Ops } from './ops.js';

// Helpers of the engine tests: a temporary HOME and project, failures injected through Ops, hand-written journals.

export interface TempEnv {
  base: string;
  env: Env;
  cache: string;
  cleanup(): void;
}

export function tempEnv(): TempEnv {
  const base = mkdtempSync(join(tmpdir(), 'fsd-test-'));
  const env: Env = { home: join(base, 'home'), cwd: join(base, 'proj') };
  mkdirSync(env.home);
  mkdirSync(env.cwd);
  return { base, env, cache: scopePaths('project', env).cache, cleanup: () => rmSync(base, { recursive: true, force: true }) };
}

/** Real operations, except that the n-th call (1-based, any operation) throws `boom`; `n` of 0 never fails. */
export function failingOps(n: number): Ops {
  let calls = 0;
  const ops = {} as Record<string, unknown>;
  for (const [name, op] of Object.entries(realOps)) {
    ops[name] = (...args: unknown[]) => {
      if (++calls === n) throw new Error('boom');
      return (op as (...a: unknown[]) => unknown)(...args);
    };
  }
  return ops as unknown as Ops;
}

/** Real operations, except that the named one always throws `boom`. */
export function opsFailing(name: keyof Ops): Ops {
  return { ...realOps, [name]: () => { throw new Error('boom'); } };
}

export const DEAD_PID = 2999999;

export function journalOf(runDir: string, actions: Action[], extra: Partial<Journal> = {}): Journal {
  return { schema: JOURNAL_SCHEMA, id: 'x', pid: DEAD_PID, startedAt: '2026-01-01T00:00:00.000Z', scope: 'project', runAncestors: [], cacheCreated: false, actions, committed: false, ...extra };
}

/** Creates `<cache>/run-<pid>-<name>` holding `journal` (any JSON), and returns its path. */
export function writeRun(cache: string, pid: number, name: string, journal: unknown): string {
  const runDir = join(cache, `run-${pid}-${name}`);
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'journal.json'), JSON.stringify(journal));
  return runDir;
}
