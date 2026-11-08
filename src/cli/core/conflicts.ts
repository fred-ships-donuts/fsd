import { existsSync } from 'node:fs';
import { claudeLinkPath, defaultSkillPath } from './claudeLink.js';
import { exists, isLinkTo } from './fs.js';
import { readRegistry } from './registry.js';
import { deadRunPaths } from './runJournal.js';
import { realEnv, type Env, type Scope } from './scope.js';

// Paths that already hold a skill with this name and are not ours (SPEC 6.2 rule 3). Read-only: the planners use it to
// decide, and the run's Verify phase uses it to notice that something changed since the summary.
export function conflictPaths(scope: Scope, name: string, destination?: string, env: Env = realEnv()): string[] {
  const target = destination ?? defaultSkillPath(scope, name, env);
  const entry = readRegistry(scope, env).skills[name];
  const link = claudeLinkPath(scope, name, env);
  // Leftovers of a run that died are cleaned up by the next run, so they are not skills in the way.
  const stale = deadRunPaths(scope, env);
  const found: string[] = [];
  if (!entry && existsSync(target) && !stale.includes(target)) found.push(target);
  if (exists(link) && !stale.includes(link) && !isLinkTo(link, target)) found.push(link);
  return found;
}

export const hasConflict = (scope: Scope, name: string, env: Env = realEnv()): boolean => conflictPaths(scope, name, undefined, env).length > 0;
