import { realEnv, type Env, type Scope } from '../fsdDir.js';
import { readRegistry, skillState } from '../registry.js';
import { runPlan, type RunOptions, type RunOutcome } from '../run.js';
import type { Plan, RemoveItem } from './types.js';

// Removes only what the registry knows: the registered folder, our link and the entry.
export function planUninstall(scope: Scope, names: string[], env: Env = realEnv()): Plan {
  const plan: Plan = { scope, env, items: [], results: [], errors: [], ensureBase: false };
  const registry = readRegistry(scope, env);
  for (const name of names) {
    const entry = registry.skills[name];
    if (!entry) {
      plan.errors.push(`skill ${name} is not installed`);
      continue;
    }
    const missing = skillState(entry, entry.version) === 'missing';
    const item: RemoveItem = {
      kind: 'remove',
      name,
      entry,
      expectConflicts: [],
      entrySnapshot: JSON.stringify(entry),
      result: { name, action: 'remove', version: entry.version, lang: entry.lang, destination: entry.path, ...(missing ? { note: 'folder already missing; entry cleared' } : {}) },
    };
    plan.items.push(item);
    plan.results.push(item.result);
  }
  return plan;
}

export function runUninstall(scope: Scope, names: string[], env: Env = realEnv(), options: RunOptions = {}): Promise<RunOutcome> {
  return runPlan(planUninstall(scope, names, env), options);
}
