import { accessSync, constants, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { claudeLinkPath } from '../core/claudeLink.js';
import { conflictPaths } from '../core/conflicts.js';
import { gitignoreProblem } from '../core/gitignore.js';
import { exists, isInside, nearestExisting, readTextOrNull } from '../core/fs.js';
import { readRegistry } from '../core/registry.js';
import type { ScopePaths } from '../core/scope.js';
import { snapshotOf, type Plan } from '../plan/types.js';
import { Stop } from './recovery.js';

const CHANGED = 'state changed since the summary';

// The Verify phase (SPEC 6.9): read-only checks before anything is written. Throws when the plan cannot run as planned.
export function verifyPlan(plan: Plan, paths: ScopePaths): void {
  const allowed = [paths.fsd, paths.nook, paths.skills];
  const inScope = (path: string) => {
    if (!allowed.some((root) => isInside(root, path))) throw new Error(`${path} is outside the scope directories`);
  };
  const writable = (path: string) => {
    try {
      // Creating or replacing `path` needs write access to the directory that holds (or will hold) it.
      accessSync(exists(path) ? dirname(path) : nearestExisting(path), constants.W_OK);
    } catch {
      throw new Error(`no write permission for ${path}`);
    }
  };

  writable(paths.cache);
  // The only file outside `.fsd/` and `nook/` a plan may write: `<root>/.gitignore`.
  for (const file of plan.textFiles ?? []) {
    if (file.path !== join(paths.root, '.gitignore')) throw new Error(`${file.path} is outside the scope directories`);
    const problem = gitignoreProblem(file.path);
    if (problem) throw new Error(problem);
    writable(file.path);
    if (readTextOrNull(file.path) !== file.expected) throw new Stop('changed', CHANGED);
  }
  for (const item of plan.items) {
    const destination = item.kind === 'remove' ? item.entry.path : item.destination;
    inScope(destination);
    writable(destination);
    if (item.kind !== 'remove') writable(claudeLinkPath(plan.scope, item.name, plan.env));
    if (item.kind === 'install' && !existsSync(item.variantDir)) throw new Error(`catalog files of ${item.name} not found`);

    if (snapshotOf(readRegistry(plan.scope, plan.env).skills[item.name]) !== item.entrySnapshot) throw new Stop('changed', CHANGED);
    if (item.kind !== 'remove') {
      const found = conflictPaths(plan.scope, item.name, item.destination, plan.env);
      if (found.some((path) => !item.expectConflicts.includes(path))) throw new Stop('changed', CHANGED);
    }
  }
}
