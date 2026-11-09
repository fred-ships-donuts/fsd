import { findSkill, skillVersion } from '../core/catalog.js';
import { claudeLinkPath, defaultSkillPath } from '../core/claudeLink.js';
import { conflictPaths } from '../core/conflicts.js';
import { exists, isLinkTo } from '../core/fs.js';
import { planGitignore } from '../core/gitignore.js';
import { readRegistry, skillState } from '../core/registry.js';
import { realEnv, type Env, type Scope } from '../core/scope.js';
import { isValidVersion } from '../core/semver.js';
import { addItem, emptyPlan, snapshotOf, type ActionResult, type ConflictChoice, type Plan, type PlanExtras } from './types.js';

export interface InstallRequest {
  name: string;
  lang?: string;
  // What to do when a skill of the same name that is not ours is in the way (SPEC 6.2 rule 3). Default: keep.
  onConflict?: ConflictChoice;
  // Overrides the default `<scope>/.fsd/skills/<name>` (used with a registered path).
  destination?: string;
}

const NOT_OURS = 'folder exists and is not managed by fsd';

// Install and upgrade rules (SPEC 6.2). Reads the disk and decides; changes nothing.
export function planInstall(scope: Scope, requests: InstallRequest[], env: Env = realEnv(), extras: PlanExtras = {}): Plan {
  const plan = emptyPlan(scope, env, extras);
  const registry = readRegistry(scope, env);
  // The project `.gitignore` gets the lines of SPEC 4.2 with the base structure; the global scope never touches one.
  if (scope === 'project' && extras.ensureBase) {
    const change = planGitignore(env.cwd);
    if (change && 'error' in change) plan.errors.push(change.error);
    else if (change) plan.textFiles = [{ path: change.path, content: change.content, expected: change.expected }];
  }

  for (const request of requests) {
    const skill = findSkill(request.name);
    if (!skill) {
      plan.errors.push(`skill ${request.name} not found in catalog`);
      continue;
    }
    const version = skillVersion(skill);
    if (!isValidVersion(version)) {
      plan.errors.push(`skill ${skill.name}: missing or invalid 'metadata.version' in SKILL.md`);
      continue;
    }
    const entry = registry.skills[skill.name];
    const destination = request.destination ?? defaultSkillPath(scope, skill.name, env);
    const link = claudeLinkPath(scope, skill.name, env);
    const state = skillState(entry, version);
    const conflicts = conflictPaths(scope, skill.name, destination, env);
    const choice = request.onConflict ?? 'keep';
    const unlinkedByChoice = entry?.linked === false;
    const result = (action: ActionResult['action'], lang: string, note?: string, conflict?: string[]): ActionResult => ({
      name: skill.name,
      action,
      version,
      lang,
      destination,
      ...(note ? { note } : {}),
      ...(conflict ? { conflict } : {}),
    });
    const base = { name: skill.name, expectConflicts: conflicts, entrySnapshot: snapshotOf(entry) };
    const skip = (lang: string, note: string, conflict?: string[]) => plan.results.push(result('skip', lang, note, conflict));

    if (state === 'up to date') {
      // Installed and current: at most the link needs work.
      const relink = (note: string, replaceLink: boolean) => addItem(plan, { kind: 'link', ...base, destination, replaceLink, result: result('link', entry!.lang, note) });
      if (isLinkTo(link, destination)) skip(entry!.lang, 'up to date');
      else if (unlinkedByChoice && choice !== 'replace') skip(entry!.lang, 'up to date');
      else if (!exists(link)) relink('link restored', false);
      else if (choice === 'replace') relink('replaced the original', true);
      else skip(entry!.lang, 'up to date', conflicts);
      continue;
    }

    // A skill the user chose to keep unlinked is updated without touching the link.
    const keepUnlinked = unlinkedByChoice && choice === 'keep' && conflicts.length > 0 && conflicts.every((path) => path === link);
    if (conflicts.length > 0 && choice === 'keep' && !keepUnlinked) {
      skip(request.lang ?? '', NOT_OURS, conflicts);
      continue;
    }
    if (conflicts.length > 0 && choice === 'unlinked' && conflicts.includes(destination)) {
      skip(request.lang ?? '', NOT_OURS, conflicts);
      continue;
    }

    const variants = skill.variants;
    const variant = request.lang ? variants.find((candidate) => candidate.lang === request.lang) : variants.length === 1 ? variants[0] : undefined;
    if (!variant) {
      plan.errors.push(`skill ${skill.name}: language '${request.lang ?? ''}' not available (${variants.map((v) => v.lang).join(', ')})`);
      continue;
    }

    const unlinked = keepUnlinked || (conflicts.length > 0 && choice === 'unlinked');
    const note = keepUnlinked ? undefined : unlinked ? 'original kept, not linked' : conflicts.length > 0 ? 'replaced the original' : undefined;
    addItem(plan, {
      kind: 'install',
      ...base,
      variantDir: variant.dir,
      lang: variant.lang,
      version,
      destination,
      link: !unlinked && (choice === 'replace' || !unlinkedByChoice),
      replaceLink: !unlinked && conflicts.includes(link),
      result: result(state === 'outdated' ? 'upgrade' : 'install', variant.lang, note),
    });
  }
  // Named by the first rule that matches: install > upgrade > enable.
  const actions = plan.items.map((item) => item.result.action);
  plan.label = actions.includes('install') ? 'install' : actions.includes('upgrade') ? 'upgrade' : 'enable';
  return plan;
}
