import { realEnv, type Env, type Scope } from '../fsdDir.js';
import { claudeLinkPath, exists, pointsTo } from '../link.js';
import { readRegistry, skillState } from '../registry.js';
import type { LinkItem, Plan } from './types.js';

// Links installed skills that have no link yet (SPEC 5.4). `names` empty = all of them.
export function planLink(scope: Scope, names: string[], force: boolean, env: Env = realEnv()): Plan {
  const plan: Plan = { scope, env, items: [], results: [], errors: [], ensureBase: false };
  const registry = readRegistry(scope, env);
  for (const [name, entry] of Object.entries(registry.skills)) {
    if (names.length > 0 && !names.includes(name)) continue;
    const result = (action: 'link' | 'skip', note: string, conflict?: string[]) => ({ name, action, version: entry.version, lang: entry.lang, destination: entry.path, note, ...(conflict ? { conflict } : {}) });
    if (skillState(entry, entry.version) === 'missing') {
      plan.errors.push(`skill ${name}: folder ${entry.path} is missing; install it again`);
      continue;
    }
    const link = claudeLinkPath(scope, name, env);
    const occupant = exists(link);
    if (occupant?.isSymbolicLink() && pointsTo(link, entry.path)) {
      plan.results.push(result('skip', 'already linked'));
      continue;
    }
    if (occupant && !force) {
      plan.results.push(result('skip', 'a skill of the same name is in the way', [link]));
      continue;
    }
    const item: LinkItem = {
      kind: 'link',
      name,
      destination: entry.path,
      replaceLink: occupant !== undefined,
      expectConflicts: occupant ? [link] : [],
      entrySnapshot: JSON.stringify(entry),
      result: result('link', occupant ? 'replaced the original' : 'linked'),
    };
    plan.items.push(item);
    plan.results.push(item.result);
  }
  return plan;
}
