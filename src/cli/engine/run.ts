import { dirname, join } from 'node:path';
import { claudeLinkPath } from '../core/claudeLink.js';
import { exists, isLinkTo, missingAncestors } from '../core/fs.js';
import { readRegistry, type Entry } from '../core/registry.js';
import type { Journal } from '../core/runJournal.js';
import { baseDirs, scopePaths } from '../core/scope.js';
import type { ActionResult, InstallItem, LinkItem, Plan, PlanItem, RemoveItem } from '../plan/types.js';
import { realOps, type Ops } from './ops.js';
import { discard, recoverRuns, Stop, undo, type StopKind } from './recovery.js';
import { Transaction } from './transaction.js';
import { verifyPlan } from './verify.js';

// SPEC 6.9: the run after the user confirms. Five phases; a failure or a cancel before the end of Register undoes
// everything the run did.

export type Phase = 'verify' | 'prepare' | 'apply' | 'register' | 'conclude';
export const phases: Phase[] = ['verify', 'prepare', 'apply', 'register', 'conclude'];

export interface RunEvent {
  phase: Phase;
  state: 'running' | 'done' | 'failed';
  item?: string;
}

export interface RunControl {
  cancelled: boolean;
}

export interface RunOptions {
  ops?: Ops;
  onEvent?: (event: RunEvent) => void;
  control?: RunControl;
  now?: () => Date;
}

export type RunOutcome =
  | { status: 'done'; results: ActionResult[]; warnings: string[] }
  | { status: StopKind; phase: Phase; message: string; warnings: string[] };

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

export async function runPlan(plan: Plan, options: RunOptions = {}): Promise<RunOutcome> {
  const ops = options.ops ?? realOps;
  const control = options.control ?? { cancelled: false };
  const emit = options.onEvent ?? (() => {});
  const now = options.now ?? (() => new Date());
  const paths = scopePaths(plan.scope, plan.env);
  const warnings: string[] = [];
  const id = `${process.pid}-${now().getTime().toString(36)}`;
  const runDir = join(paths.cache, `run-${id}`);
  let phase: Phase = 'verify';
  let tx: Transaction | undefined;

  const onSignal = () => {
    control.cancelled = true;
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  // Between operations: lets the event loop deliver ctrl+c, and stops when it was asked to.
  const step = async () => {
    await tick();
    if (control.cancelled && !tx?.committed) throw new Stop('cancelled', 'cancelled (changes undone)');
  };
  const enter = (next: Phase) => {
    phase = next;
    emit({ phase, state: 'running' });
  };
  const leave = () => emit({ phase, state: 'done' });

  try {
    if (plan.items.length > 0 || plan.ensureBase || plan.config !== undefined) {
      // 1. Verify: reads, and recovers dead runs.
      enter('verify');
      recoverRuns(paths.cache, warnings);
      verifyPlan(plan, paths);
      await step();
      leave();

      // 2. Prepare: journal, base structure, staging copies.
      enter('prepare');
      const runAncestors = missingAncestors(runDir);
      for (const dir of runAncestors) ops.mkdir(dir);
      tx = new Transaction(ops, runDir, newJournal(id, plan, now(), runAncestors, runAncestors.includes(paths.cache) && !plan.ensureBase));
      tx.save();
      recoverRuns(paths.cache, warnings, runDir);
      await step();
      if (plan.ensureBase) {
        for (const dir of baseDirs) {
          tx.ensureDirs(join(paths.root, dir));
          await step();
        }
      }
      for (const item of plan.items) {
        if (item.kind !== 'install') continue;
        stage(tx, item, id);
        await step();
      }
      leave();

      // 3. Apply: displace what exists, move the staged copy in place, link.
      enter('apply');
      for (const item of plan.items) {
        emit({ phase, state: 'running', item: item.name });
        applyItem(tx, plan, item, id);
        await step();
      }
      leave();

      // 4. Register: the point of no return.
      enter('register');
      register(tx, plan, now());
      tx.commit();
      leave();

      // 5. Conclude: a failure here is only a warning.
      enter('conclude');
      try {
        discard(tx.journal, runDir, !tx.journal.cacheCreated);
      } catch (error) {
        warnings.push(`could not clean up ${runDir}: ${errorText(error)}`);
      }
      leave();
    }
    return { status: 'done', results: plan.results, warnings };
  } catch (error) {
    emit({ phase, state: 'failed' });
    const kind = error instanceof Stop ? error.kind : 'failed';
    let message = error instanceof Stop ? error.message : `install failed and was undone (${phase}: ${errorText(error)})`;
    if (tx && !tx.committed) {
      try {
        undo(tx.journal, runDir);
      } catch (undoError) {
        message += `; undo failed (${errorText(undoError)}); run fsd again to recover`;
      }
    }
    return { status: kind, phase, message, warnings };
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
  }
}

function newJournal(id: string, plan: Plan, startedAt: Date, runAncestors: string[], cacheCreated: boolean): Journal {
  return { id, pid: process.pid, startedAt: startedAt.toISOString(), scope: plan.scope, runAncestors, cacheCreated, created: [], displaced: [], restore: [], committed: false };
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
    tx.move(stagingPath(item, id), item.destination);
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
