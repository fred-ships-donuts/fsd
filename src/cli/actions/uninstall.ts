import { rmSync } from 'node:fs';
import { realEnv, type Env, type Scope } from '../fsdDir.js';
import { readRegistry, skillState, unregisterSkill } from '../registry.js';
import type { ActionResult } from './install.js';

// Removes only what the registry knows: the registered folder and its entry.
export function uninstallSkill(scope: Scope, name: string, env: Env = realEnv()): ActionResult {
  const entry = readRegistry(scope, env).skills[name];
  if (!entry) throw new Error(`skill ${name} is not installed`);

  const missing = skillState(entry, entry.version) === 'missing';
  if (!missing) rmSync(entry.path, { recursive: true, force: true });
  unregisterSkill(scope, name, env);
  return {
    name,
    action: 'remove',
    version: entry.version,
    lang: entry.lang,
    destination: entry.path,
    ...(missing ? { note: 'folder already missing; entry cleared' } : {}),
  };
}
