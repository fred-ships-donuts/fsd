import { claudeLinkPath } from '../core/claudeLink.js';
import { exists, isLinkTo } from '../core/fs.js';
import { readRegistry, skillState } from '../core/registry.js';
import { realEnv, type Env, type Scope } from '../core/scope.js';
import { addItem, emptyPlan, snapshotOf, type ActionResult, type Plan } from './types.js';

// Links installed skills that have no link yet (SPEC 5.4). `names` empty = all of them.
export function planLink(scope: Scope, names: string[], force: boolean, env: Env = realEnv()): Plan {
  const plan = emptyPlan(scope, env);
  const registry = readRegistry(scope, env);
  for (const [name, entry] of Object.entries(registry.skills)) {
    if (names.length > 0 && !names.includes(name)) continue;
    const result = (action: 'link' | 'skip', note: string, conflict?: string[]): ActionResult => ({ name, action, version: entry.version, lang: entry.lang, destination: entry.path, note, ...(conflict ? { conflict } : {}) });
    if (skillState(entry, entry.version) === 'missing') {
      plan.errors.push(`skill ${name}: folder ${entry.path} is missing; install it again`);
      continue;
    }
    const link = claudeLinkPath(scope, name, env);
    if (isLinkTo(link, entry.path)) {
      plan.results.push(result('skip', 'already linked'));
      continue;
    }
    const occupied = exists(link) !== undefined;
    if (occupied && !force) {
      plan.results.push(result('skip', 'a skill of the same name is in the way', [link]));
      continue;
    }
    addItem(plan, {
      kind: 'link',
      name,
      destination: entry.path,
      replaceLink: occupied,
      expectConflicts: occupied ? [link] : [],
      entrySnapshot: snapshotOf(entry),
      result: result('link', occupied ? 'replaced the original' : 'linked'),
    });
  }
  return plan;
}
