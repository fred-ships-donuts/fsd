import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { realEnv, scopePaths, type Env, type Scope } from '../fsdDir.js';
import { claudeLinkPath, exists, pointsTo } from '../link.js';
import { deadRunPaths } from '../recovery.js';
import { readRegistry } from '../registry.js';

// Paths that already hold a skill with this name and are not ours.
export function conflictPaths(scope: Scope, name: string, destination?: string, env: Env = realEnv()): string[] {
  const target = destination ?? join(scopePaths(scope, env).skills, name);
  const entry = readRegistry(scope, env).skills[name];
  const link = claudeLinkPath(scope, name, env);
  // Leftovers of a run that died are cleaned up by the next run, so they are not skills in the way.
  const stale = deadRunPaths(scope, env);
  const found: string[] = [];
  if (!entry && existsSync(target) && !stale.includes(target)) found.push(target);
  const occupant = exists(link);
  if (occupant && !stale.includes(link) && !(occupant.isSymbolicLink() && pointsTo(link, target))) found.push(link);
  return found;
}

export const hasConflict = (scope: Scope, name: string, env: Env = realEnv()): boolean => conflictPaths(scope, name, undefined, env).length > 0;
