import { join } from 'node:path';
import type { Config } from '../config.js';
import { realEnv, scopePaths, type Env, type Scope } from '../fsdDir.js';
import { claudeLinkPath, exists, pointsTo } from '../link.js';
import { readRegistry, skillState } from '../registry.js';
import { runPlan, type RunOptions, type RunOutcome } from '../run.js';
import { findSkill, isValidVersion } from '../skills.js';
import { conflictPaths } from './conflicts.js';
import type { ActionResult, ConflictChoice, InstallItem, LinkItem, Plan } from './types.js';

export { conflictPaths, hasConflict } from './conflicts.js';

export interface InstallRequest {
  name: string;
  lang?: string;
  // What to do when a skill of the same name that is not ours is in the way (SPEC 6.2 rule 3). Default: keep.
  onConflict?: ConflictChoice;
  // Overrides the default `<scope>/.fsd/skills/<name>` (used with a registered path).
  destination?: string;
}

export interface PlanExtras {
  ensureBase?: boolean;
  config?: Config;
}

// Reads the disk and decides; changes nothing. The run (run.ts) does the work in phases.
export function planInstall(scope: Scope, requests: InstallRequest[], env: Env = realEnv(), extras: PlanExtras = {}): Plan {
  const plan: Plan = { scope, env, items: [], results: [], errors: [], ensureBase: extras.ensureBase ?? false, ...(extras.config ? { config: extras.config } : {}) };
  const registry = readRegistry(scope, env);

  for (const request of requests) {
    const skill = findSkill(request.name);
    if (!skill) {
      plan.errors.push(`skill ${request.name} not found in catalog`);
      continue;
    }
    const version = skill.variants[0]?.version;
    if (!isValidVersion(version)) {
      plan.errors.push(`skill ${skill.name}: missing or invalid 'metadata.version' in SKILL.md`);
      continue;
    }
    const entry = registry.skills[skill.name];
    const destination = request.destination ?? join(scopePaths(scope, env).skills, skill.name);
    const link = claudeLinkPath(scope, skill.name, env);
    const state = skillState(entry, version);
    const conflicts = conflictPaths(scope, skill.name, destination, env);
    const choice = request.onConflict ?? 'keep';
    const result = (action: ActionResult['action'], lang: string, note?: string, conflict?: string[]): ActionResult => ({
      name: skill.name,
      action,
      version,
      lang,
      destination,
      ...(note ? { note } : {}),
      ...(conflict ? { conflict } : {}),
    });
    const base = { name: skill.name, expectConflicts: conflicts, entrySnapshot: entry ? JSON.stringify(entry) : '' };
    const unlinkedByChoice = entry?.linked === false;

    const linkItem = (note: string, replaceLink: boolean): void => {
      const item: LinkItem = { kind: 'link', ...base, destination, replaceLink, result: result('link', entry!.lang, note) };
      plan.items.push(item);
      plan.results.push(item.result);
    };

    if (state === 'up to date') {
      const occupant = exists(link);
      if (occupant?.isSymbolicLink() && pointsTo(link, destination)) plan.results.push(result('skip', entry!.lang, 'up to date'));
      else if (unlinkedByChoice && choice !== 'replace') plan.results.push(result('skip', entry!.lang, 'up to date'));
      else if (!occupant) linkItem('link restored', false);
      else if (choice === 'replace') linkItem('replaced the original', true);
      else plan.results.push(result('skip', entry!.lang, 'up to date', conflicts));
      continue;
    }

    // A skill the user chose to keep unlinked is updated without touching the link.
    const keepUnlinked = unlinkedByChoice && choice === 'keep' && conflicts.length > 0 && conflicts.every((path) => path === link);

    if (conflicts.length > 0 && choice === 'keep' && !keepUnlinked) {
      plan.results.push(result('skip', request.lang ?? '', 'folder exists and is not managed by fsd', conflicts));
      continue;
    }
    const destinationInConflict = conflicts.includes(destination);
    if (conflicts.length > 0 && choice === 'unlinked' && destinationInConflict) {
      plan.results.push(result('skip', request.lang ?? '', 'folder exists and is not managed by fsd', conflicts));
      continue;
    }

    const variants = skill.variants;
    const variant = request.lang ? variants.find((candidate) => candidate.lang === request.lang) : variants.length === 1 ? variants[0] : undefined;
    if (!variant) {
      plan.errors.push(`skill ${skill.name}: language '${request.lang ?? ''}' not available (${variants.map((v) => v.lang).join(', ')})`);
      continue;
    }

    const unlinked = keepUnlinked || (conflicts.length > 0 && choice === 'unlinked');
    const action = state === 'outdated' ? 'upgrade' : 'install';
    const note = keepUnlinked ? undefined : unlinked ? 'original kept, not linked' : conflicts.length > 0 ? 'replaced the original' : undefined;
    const item: InstallItem = {
      kind: 'install',
      ...base,
      variantDir: variant.dir,
      lang: variant.lang,
      version,
      destination,
      link: !unlinked && (choice === 'replace' || !unlinkedByChoice),
      replaceLink: !unlinked && conflicts.includes(link),
      result: result(action, variant.lang, note),
    };
    plan.items.push(item);
    plan.results.push(item.result);
  }
  return plan;
}

// Plan + run, for callers that have nothing to do between the two.
export function runInstall(scope: Scope, requests: InstallRequest[], env: Env = realEnv(), options: RunOptions = {}, extras: PlanExtras = {}): Promise<RunOutcome> {
  return runPlan(planInstall(scope, requests, env, extras), options);
}
