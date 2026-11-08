import { readRegistry, skillState } from '../core/registry.js';
import { realEnv, type Env, type Scope } from '../core/scope.js';
import { addItem, emptyPlan, snapshotOf, type Plan } from './types.js';

// Removal rules (SPEC 6.8): only what the registry knows, the registered folder, our link and the entry.
export function planUninstall(scope: Scope, names: string[], env: Env = realEnv()): Plan {
  const plan = emptyPlan(scope, env);
  const registry = readRegistry(scope, env);
  for (const name of names) {
    const entry = registry.skills[name];
    if (!entry) {
      plan.errors.push(`skill ${name} is not installed`);
      continue;
    }
    const missing = skillState(entry, entry.version) === 'missing';
    addItem(plan, {
      kind: 'remove',
      name,
      entry,
      expectConflicts: [],
      entrySnapshot: snapshotOf(entry),
      result: { name, action: 'remove', version: entry.version, lang: entry.lang, destination: entry.path, ...(missing ? { note: 'folder already missing; entry cleared' } : {}) },
    });
  }
  return plan;
}
