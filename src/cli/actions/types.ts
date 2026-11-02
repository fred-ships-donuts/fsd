import type { Config } from '../config.js';
import type { Env, Scope } from '../fsdDir.js';
import type { Entry } from '../registry.js';

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
