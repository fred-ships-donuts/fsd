import { createHash } from 'node:crypto';
import { lstatSync, mkdtempSync, readdirSync, readFileSync, readlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { planInstall, type InstallRequest } from './actions/install.js';
import type { ActionResult } from './actions/types.js';
import type { Env, Scope } from './fsdDir.js';
import { runPlan, type RunOptions, type RunOutcome } from './run.js';

// Helpers shared by the tests; not part of the published package.

export const tempEnv = (): Env => ({ home: mkdtempSync(join(tmpdir(), 'fsd-home-')), cwd: mkdtempSync(join(tmpdir(), 'fsd-cwd-')) });

// Every path under `dir` with its kind and a hash of its content: equal snapshots mean identical trees.
export function snapshot(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (current: string, prefix: string) => {
    for (const name of readdirSync(current).sort()) {
      const path = join(current, name);
      const key = `${prefix}/${name}`;
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) out[key] = `link:${readlinkSync(path)}`;
      else if (stat.isDirectory()) {
        out[key] = 'dir';
        walk(path, key);
      } else out[key] = `file:${createHash('sha1').update(readFileSync(path)).digest('hex')}:${stat.mode & 0o111 ? 'x' : '-'}`;
    }
  };
  walk(dir, '');
  return out;
}

export async function install(scope: Scope, request: InstallRequest, env: Env, options: RunOptions = {}): Promise<RunOutcome> {
  return runPlan(planInstall(scope, [request], env), options);
}

// The single result of a run that must have succeeded.
export async function installed(scope: Scope, request: InstallRequest, env: Env, options: RunOptions = {}): Promise<ActionResult> {
  const outcome = await install(scope, request, env, options);
  if (outcome.status !== 'done') throw new Error(`run ${outcome.status}: ${outcome.message}`);
  return outcome.results[0]!;
}
