import { accessSync, constants, existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, sep } from 'node:path';
import type { ActionResult, InstallItem, LinkItem, Plan, PlanItem, RemoveItem } from './actions/types.js';
import { conflictPaths } from './actions/conflicts.js';
import { baseDirs, scopePaths, type Scope } from './fsdDir.js';
import { claudeLinkPath, exists, pointsTo } from './link.js';
import { realOps, type Ops } from './ops.js';
import { discard, recoverRuns, Stop, undo, type Journal } from './recovery.js';
import { readRegistry, type Entry } from './registry.js';

// SPEC 6.9: the run after the user confirms. Phases, journal, undo and recovery.

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
  | { status: 'failed' | 'cancelled' | 'changed' | 'busy'; phase: Phase; message: string; warnings: string[] };


const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

const inside = (root: string, path: string) => path === root || path.startsWith(root + sep);

function missingAncestors(path: string): string[] {
  const missing: string[] = [];
  let current = path;
  while (!exists(current)) {
    missing.unshift(current);
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return missing;
}

function nearestExisting(path: string): string {
  let current = path;
  while (!exists(current) && dirname(current) !== current) current = dirname(current);
  return current;
}

// ---------- the run ----------

export async function runPlan(plan: Plan, options: RunOptions = {}): Promise<RunOutcome> {
  const ops = options.ops ?? realOps;
  const control = options.control ?? { cancelled: false };
  const emit = options.onEvent ?? (() => {});
  const now = options.now ?? (() => new Date());
  const paths = scopePaths(plan.scope, plan.env);
  const cacheDir = join(paths.fsd, 'cache');
  const warnings: string[] = [];
  const id = `${process.pid}-${now().getTime().toString(36)}`;
  const runDir = join(cacheDir, `run-${id}`);
  let phase: Phase = 'verify';
  let journal: Journal | undefined;

  const onSignal = () => {
    control.cancelled = true;
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  const step = async () => {
    await tick();
    if (control.cancelled && !journal?.committed) throw new Stop('cancelled', 'cancelled (changes undone)');
  };
  // The journal is written before the change it describes (SPEC 6.9 rule 3).
  const record = (change: (j: Journal) => void) => {
    change(journal!);
    ops.writeJson(join(runDir, 'journal.json'), journal);
  };
  const create = (path: string) => {
    record((j) => j.created.push(path));
    ops.mkdir(path);
  };
  const ensureDirs = (target: string) => {
    for (const dir of missingAncestors(target)) create(dir);
  };
  const displace = (path: string) => {
    const backup = join(runDir, 'displaced', String(journal!.displaced.length));
    if (!exists(join(runDir, 'displaced'))) ops.mkdir(join(runDir, 'displaced'));
    record((j) => j.displaced.push({ path, backup }));
    ops.move(path, backup);
  };

  try {
    const needsWork = plan.items.length > 0 || plan.ensureBase || plan.config !== undefined;
    if (needsWork) {
      // 1. Verify: reads, and recovers dead runs.
      phase = 'verify';
      emit({ phase, state: 'running' });
      recoverRuns(cacheDir, warnings);
      verify(plan, paths);
      await step();
      emit({ phase, state: 'done' });

      // 2. Prepare: journal, base structure, staging copies.
      phase = 'prepare';
      emit({ phase, state: 'running' });
      const runAncestors = missingAncestors(runDir);
      for (const dir of runAncestors) ops.mkdir(dir);
      journal = {
        id,
        pid: process.pid,
        startedAt: now().toISOString(),
        scope: plan.scope,
        runAncestors,
        cacheCreated: runAncestors.includes(cacheDir) && !plan.ensureBase,
        created: [],
        displaced: [],
        restore: [],
        committed: false,
      };
      ops.writeJson(join(runDir, 'journal.json'), journal);
      recoverRuns(cacheDir, warnings, runDir);
      await step();
      if (plan.ensureBase) {
        for (const dir of baseDirs) {
          ensureDirs(join(paths.root, dir));
          await step();
        }
      }
      for (const item of plan.items) {
        if (item.kind !== 'install') continue;
        ensureDirs(dirname(staging(item)));
        record((j) => j.created.push(staging(item)));
        ops.copyDir(item.variantDir, staging(item));
        await step();
      }
      emit({ phase, state: 'done' });

      // 3. Apply: displace what exists, move the staged copy in place, link.
      phase = 'apply';
      emit({ phase, state: 'running' });
      for (const item of plan.items) {
        emit({ phase, state: 'running', item: item.name });
        applyItem(item);
        await step();
      }
      emit({ phase, state: 'done' });

      // 4. Register: the point of no return.
      phase = 'register';
      emit({ phase, state: 'running' });
      register();
      record((j) => (j.committed = true));
      emit({ phase, state: 'done' });

      // 5. Conclude: a failure here is only a warning.
      phase = 'conclude';
      emit({ phase, state: 'running' });
      try {
        discard(journal, runDir, !journal.cacheCreated);
      } catch (error) {
        warnings.push(`could not clean up ${runDir}: ${errorText(error)}`);
      }
      emit({ phase, state: 'done' });
    }
    return { status: 'done', results: plan.results, warnings };
  } catch (error) {
    emit({ phase, state: 'failed' });
    const kind = error instanceof Stop ? error.kind : 'failed';
    let message = error instanceof Stop ? error.message : `install failed and was undone (${phase}: ${errorText(error)})`;
    if (journal && !journal.committed) {
      try {
        undo(journal, runDir);
      } catch (undoError) {
        message += `; undo failed (${errorText(undoError)}); run fsd again to recover`;
      }
    }
    return { status: kind, phase, message, warnings };
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
  }

  // ---- helpers that need the run state ----

  function staging(item: InstallItem): string {
    return `${item.destination}.fsd-new-${id}`;
  }

  function linkIn(item: InstallItem | LinkItem): void {
    const link = claudeLinkPath(plan.scope, item.name, plan.env);
    const occupant = exists(link);
    if (occupant && occupant.isSymbolicLink() && pointsTo(link, item.destination)) return;
    if (occupant) {
      if (!item.replaceLink) throw new Error(`${link} is in use`);
      displace(link);
    }
    ensureDirs(dirname(link));
    record((j) => j.created.push(link));
    ops.symlink(item.destination, link);
  }

  function applyItem(item: PlanItem): void {
    if (item.kind === 'install') {
      if (exists(item.destination)) displace(item.destination);
      record((j) => j.created.push(item.destination));
      ops.move(staging(item), item.destination);
      if (item.link) linkIn(item);
    } else if (item.kind === 'link') {
      linkIn(item);
    } else {
      removeItem(item);
    }
  }

  function removeItem(item: RemoveItem): void {
    if (exists(item.entry.path)) displace(item.entry.path);
    const link = claudeLinkPath(plan.scope, item.name, plan.env);
    if (exists(link)?.isSymbolicLink() && pointsTo(link, item.entry.path)) displace(link);
  }

  function register(): void {
    const registry = readRegistry(plan.scope, plan.env);
    const stamp = now().toISOString();
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
    for (const [file] of files) {
      let backup: string | null = null;
      if (exists(file)) {
        backup = join(runDir, `backup-${basename(file)}`);
        ops.copyFile(file, backup);
      }
      record((j) => j.restore.push({ path: file, backup }));
    }
    for (const [file, data] of files) ops.writeJson(file, data);
  }
}

// Read-only checks before anything is written.
function verify(plan: Plan, paths: ReturnType<typeof scopePaths>): void {
  const allowed = [paths.fsd, paths.nook, paths.skills];
  const check = (path: string) => {
    if (!allowed.some((root) => inside(root, path))) throw new Error(`${path} is outside the scope directories`);
  };
  const writable = (path: string) => {
    try {
      // Creating or replacing `path` needs write access to the directory that holds (or will hold) it.
      accessSync(exists(path) ? dirname(path) : nearestExisting(path), constants.W_OK);
    } catch {
      throw new Error(`no write permission for ${path}`);
    }
  };
  writable(join(paths.fsd, 'cache'));
  for (const item of plan.items) {
    const destination = item.kind === 'remove' ? item.entry.path : item.destination;
    check(destination);
    writable(destination);
    if (item.kind !== 'remove') writable(claudeLinkPath(plan.scope, item.name, plan.env));
    if (item.kind === 'install' && !existsSync(item.variantDir)) throw new Error(`catalog files of ${item.name} not found`);

    const snapshot = readRegistry(plan.scope, plan.env).skills[item.name];
    if ((snapshot ? JSON.stringify(snapshot) : '') !== item.entrySnapshot) throw new Stop('changed', 'state changed since the summary');
    if (item.kind !== 'remove') {
      const now = conflictPaths(plan.scope, item.name, item.destination, plan.env);
      if (now.some((path) => !item.expectConflicts.includes(path))) throw new Stop('changed', 'state changed since the summary');
    }
  }
}
