import type { Config } from '../core/config.js';
import type { Entry } from '../core/registry.js';
import type { Env, Scope } from '../core/scope.js';

// A plan is what a planner decided after reading the disk; the engine (engine/run.ts) carries it out.

export type Action = 'install' | 'upgrade' | 'skip' | 'remove' | 'link';

// One result per skill; the wizard and the update/link commands print this.
export interface ActionResult {
  name: string;
  action: Action;
  version: string;
  lang: string;
  destination: string;
  note?: string;
  // Set when the skill was skipped because a skill of the same name that is not ours is in the way.
  conflict?: string[];
}

export type ConflictChoice = 'keep' | 'unlinked' | 'replace';

interface ItemBase {
  name: string;
  result: ActionResult;
  // Conflict paths seen when planning; the Verify phase fails if new ones appear (SPEC 6.9).
  expectConflicts: string[];
  // JSON of the registry entry seen when planning ('' if none).
  entrySnapshot: string;
}

export interface InstallItem extends ItemBase {
  kind: 'install';
  variantDir: string;
  lang: string;
  version: string;
  destination: string;
  link: boolean;
  replaceLink: boolean;
}

export interface RemoveItem extends ItemBase {
  kind: 'remove';
  entry: Entry;
}

export interface LinkItem extends ItemBase {
  kind: 'link';
  destination: string;
  replaceLink: boolean;
}

export type PlanItem = InstallItem | RemoveItem | LinkItem;

export interface Plan {
  scope: Scope;
  env: Env;
  items: PlanItem[];
  // Every result in request order, including skips that need no work.
  results: ActionResult[];
  // Problems found while planning (unknown skill, invalid version...); no work is planned for them.
  errors: string[];
  ensureBase: boolean;
  config?: Config;
}

export interface PlanExtras {
  ensureBase?: boolean;
  config?: Config;
}

export function emptyPlan(scope: Scope, env: Env, extras: PlanExtras = {}): Plan {
  return { scope, env, items: [], results: [], errors: [], ensureBase: extras.ensureBase ?? false, ...(extras.config ? { config: extras.config } : {}) };
}

/** Adds an item that needs work, and its result. */
export function addItem(plan: Plan, item: PlanItem): void {
  plan.items.push(item);
  plan.results.push(item.result);
}

export const snapshotOf = (entry: Entry | undefined): string => (entry ? JSON.stringify(entry) : '');

/** One line per result, as the CLI and the wizard print it. */
export const formatResult = (r: ActionResult): string => `${r.action}${r.note ? ` (${r.note})` : ''} ${r.name} ${r.version} [${r.lang}] ${r.destination}`;
