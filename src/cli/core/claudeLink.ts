import { join } from 'node:path';
import { realEnv, scopePaths, scopeRoot, type Env, type Scope } from './scope.js';

// Skills live in `.fsd/skills/<name>`; Claude Code reads `.claude/skills/<name>`, which is a symbolic link to it.

export function claudeLinkPath(scope: Scope, name: string, env: Env = realEnv()): string {
  return join(scopeRoot(scope, env), '.claude', 'skills', name);
}

/** Where a skill is installed when nothing else is registered for it. */
export function defaultSkillPath(scope: Scope, name: string, env: Env = realEnv()): string {
  return join(scopePaths(scope, env).skills, name);
}
