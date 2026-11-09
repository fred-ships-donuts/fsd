import { dirname, join } from 'node:path';
import { claudeLinkPath } from '../core/claudeLink.js';
import { exists, isLinkTo } from '../core/fs.js';
import { readRegistry, type Entry } from '../core/registry.js';
import { baseDirs, scopePaths } from '../core/scope.js';
import type { ActionResult, InstallItem, LinkItem, Plan, PlanItem, RemoveItem } from '../plan/types.js';
import type { Ops } from './ops.js';
import type { StopKind } from './recovery.js';
import type { Transaction } from './transaction.js';
import { runTransaction, type PhaseEvent, type RunControl } from './transactionRun.js';
import { verifyPlan } from './verify.js';

// SPEC 6.9: the run of a skills plan after the user confirms, as a client of the transaction core
// (engine/transactionRun.ts). Five phases; a failure or a cancel before the end of Register undoes everything the run did.

export type Phase = 'verify' | 'prepare' | 'apply' | 'register' | 'conclude';
export const phases: Phase[] = ['verify', 'prepare', 'apply', 'register', 'conclude'];

export type RunEvent = PhaseEvent<Phase>;
export type { RunControl };

export interface RunOptions {
  ops?: Ops;
  onEvent?: (event: RunEvent) => void;
  control?: RunControl;
  now?: () => Date;
}

export type RunOutcome =
  | { status: 'done'; results: ActionResult[]; warnings: string[] }
  | { status: StopKind; phase: Phase; message: string; warnings: string[] };

type SkillPhase = 'prepare' | 'apply' | 'register';

export async function runPlan(plan: Plan, options: RunOptions = {}): Promise<RunOutcome> {
  if (plan.items.length === 0 && !plan.ensureBase && plan.config === undefined && !plan.textFiles?.length) return { status: 'done', results: plan.results, warnings: [] };
  const now = options.now ?? (() => new Date());
  const paths = scopePaths(plan.scope, plan.env);
  const outcome = await runTransaction<SkillPhase, ActionResult[]>(
    {
      scope: plan.scope,
      env: plan.env,
      // The same text for every skills plan (install, remove, link): changing it is out of F-40a.
      label: 'install',
      firstPhase: 'prepare',
      keepAncestors: plan.ensureBase,
      verify: () => verifyPlan(plan, paths),
      work: async (tx, ctx) => {
        // 2. Prepare (the journal is open): base structure, staging copies.
        if (plan.ensureBase) {
          for (const dir of baseDirs) {
            tx.ensureDirs(join(paths.root, dir));
            await ctx.step();
          }
        }
        for (const item of plan.items) {
          if (item.kind !== 'install') continue;
          stage(tx, item, ctx.id);
          await ctx.step();
        }

        // 3. Apply: displace what exists, move the staged copy in place, link.
        ctx.enter('apply');
        for (const item of plan.items) {
          ctx.item(item.name);
          applyItem(tx, plan, item, ctx.id);
          await ctx.step();
        }

        if (plan.textFiles?.length) tx.writeTextFiles(plan.textFiles);

        // 4. Register: the point of no return comes right after it.
        ctx.enter('register');
        register(tx, plan, now());
      },
      result: () => plan.results,
    },
    { ...options, now },
  );
  return outcome.status === 'done' ? { status: 'done', results: outcome.result, warnings: outcome.warnings } : outcome;
}

// The catalog copy is made next to its destination first, and moved in place in Apply.
const stagingPath = (item: InstallItem, id: string): string => `${item.destination}.fsd-new-${id}`;

function stage(tx: Transaction, item: InstallItem, id: string): void {
  const staging = stagingPath(item, id);
  tx.ensureDirs(dirname(staging));
  tx.copyDir(item.variantDir, staging);
}

function applyItem(tx: Transaction, plan: Plan, item: PlanItem, id: string): void {
  if (item.kind === 'install') {
    if (exists(item.destination)) tx.displace(item.destination);
    tx.moveIn(stagingPath(item, id), item.destination);
    if (item.link) linkIn(tx, plan, item);
  } else if (item.kind === 'link') {
    linkIn(tx, plan, item);
  } else {
    removeItem(tx, plan, item);
  }
}

function linkIn(tx: Transaction, plan: Plan, item: InstallItem | LinkItem): void {
  const link = claudeLinkPath(plan.scope, item.name, plan.env);
  if (isLinkTo(link, item.destination)) return;
  if (exists(link)) {
    if (!item.replaceLink) throw new Error(`${link} is in use`);
    tx.displace(link);
  }
  tx.ensureDirs(dirname(link));
  tx.symlink(item.destination, link);
}

function removeItem(tx: Transaction, plan: Plan, item: RemoveItem): void {
  if (exists(item.entry.path)) tx.displace(item.entry.path);
  const link = claudeLinkPath(plan.scope, item.name, plan.env);
  if (isLinkTo(link, item.entry.path)) tx.displace(link);
}

function register(tx: Transaction, plan: Plan, now: Date): void {
  const paths = scopePaths(plan.scope, plan.env);
  const registry = readRegistry(plan.scope, plan.env);
  const stamp = now.toISOString();
  for (const item of plan.items) {
    if (item.kind === 'remove') {
      delete registry.skills[item.name];
    } else if (item.kind === 'link') {
      const entry = registry.skills[item.name];
      if (entry) delete entry.linked;
    } else {
      const previous = registry.skills[item.name];
      const entry: Entry = { scope: plan.scope, lang: item.lang, version: item.version, path: item.destination, installedAt: previous?.installedAt ?? stamp, updatedAt: stamp };
      if (!item.link) entry.linked = false;
      registry.skills[item.name] = entry;
    }
  }
  const files: Array<[string, unknown]> = [[paths.installed, registry]];
  if (plan.config) files.push([paths.config, plan.config]);
  tx.writeJsonFiles(files);
}
