import { join } from 'node:path';
import { FileChangedError, missingAncestors } from '../core/fs.js';
import { acquireLock, LockBusyError, type Lock } from '../core/lock.js';
import { JOURNAL_SCHEMA, type Journal } from '../core/runJournal.js';
import { scopePaths, type Env, type Scope, type ScopePaths } from '../core/scope.js';
import { realOps, type Ops } from './ops.js';
import { discard, recoverRuns, Stop, undo, type StopKind } from './recovery.js';
import { Transaction } from './transaction.js';

// SPEC 6.9: the generic part of a run, shared by its clients (skills in engine/run.ts, tasks in engine/taskRun.ts).
// The core owns the lock and the recovery of dead runs, the journal, SIGINT/SIGTERM, the commit, Conclude, the undo and
// the phase events; the client gives Verify (read-only) and the work in between (its own phases). A failure or a cancel
// before the commit undoes everything the run did.

/** The phases of a run: Verify, the client's own, and Conclude. */
export type RunPhase<P extends string> = 'verify' | P | 'conclude';

export interface PhaseEvent<P extends string> {
  phase: RunPhase<P>;
  state: 'running' | 'done' | 'failed';
  item?: string;
}

export interface RunControl {
  cancelled: boolean;
}

export interface TransactionOptions<P extends string> {
  ops?: Ops;
  onEvent?: (event: PhaseEvent<P>) => void;
  control?: RunControl;
  now?: () => Date;
}

export interface WorkContext<P extends string> {
  readonly id: string;
  readonly paths: ScopePaths;
  readonly ops: Ops;
  /** Ends the current phase and starts `phase`. */
  enter(phase: P): void;
  /** Reports the item the current phase is working on. */
  item(name: string): void;
  /** Between operations: lets the event loop deliver ctrl+c, and stops when it was asked to. */
  step(): Promise<void>;
}

export interface TransactionSpec<P extends string, R> {
  scope: Scope;
  env: Env;
  // Names the run in a failure: `<label> failed and was undone (<phase>: <reason>)`.
  label: string;
  // The phase the journal is opened in (a failure creating the run directory is reported there).
  firstPhase: P;
  // True when the run's own `.fsd/cache` (if it created one) stays after the run.
  keepAncestors: boolean;
  // Read-only checks, after the recovery of dead runs. Throws Stop('changed') or an Error.
  verify(): void;
  // Everything between Verify and the commit, with the journal open, in `firstPhase` and the phases it enters.
  work(tx: Transaction, ctx: WorkContext<P>): Promise<void>;
  result(): R;
}

export type TransactionOutcome<P extends string, R> =
  | { status: 'done'; result: R; warnings: string[] }
  | { status: StopKind; phase: RunPhase<P>; message: string; warnings: string[] };

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

export async function runTransaction<P extends string, R>(spec: TransactionSpec<P, R>, options: TransactionOptions<P> = {}): Promise<TransactionOutcome<P, R>> {
  const ops = options.ops ?? realOps;
  const control = options.control ?? { cancelled: false };
  const emit = options.onEvent ?? (() => {});
  const now = options.now ?? (() => new Date());
  const paths = scopePaths(spec.scope, spec.env);
  const warnings: string[] = [];
  const id = `${process.pid}-${now().getTime().toString(36)}`;
  const runDir = join(paths.cache, `run-${id}`);
  let phase: RunPhase<P> = 'verify';
  let running = false;
  let tx: Transaction | undefined;
  let lock: Lock | undefined;

  const onSignal = () => {
    control.cancelled = true;
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  const step = async () => {
    await tick();
    if (control.cancelled && !tx?.committed) throw new Stop('cancelled', 'cancelled (changes undone)');
  };
  const leave = () => {
    if (running) emit({ phase, state: 'done' });
    running = false;
  };
  const enter = (next: RunPhase<P>) => {
    leave();
    phase = next;
    running = true;
    emit({ phase, state: 'running' });
  };
  const ctx: WorkContext<P> = { id, paths, ops, enter, item: (name) => emit({ phase, state: 'running', item: name }), step };

  try {
    // The project lock (SPEC 6.9), before anything is read or recovered. It serializes this run against `task step`
    // and the other runs; the user scope has no task writers, so it keeps only the journal's own check.
    if (spec.scope === 'project') lock = acquireLock(paths.cache, now);

    // Verify: reads, and recovers dead runs.
    enter('verify');
    recoverRuns(paths.cache, warnings);
    spec.verify();
    await step();

    // The journal, before the first change.
    enter(spec.firstPhase);
    const runAncestors = missingAncestors(runDir);
    for (const dir of runAncestors) ops.mkdir(dir);
    tx = new Transaction(ops, runDir, newJournal(id, spec.scope, now(), runAncestors, runAncestors.includes(paths.cache) && !spec.keepAncestors));
    tx.save();
    recoverRuns(paths.cache, warnings, runDir);
    await step();

    await spec.work(tx, ctx);

    // The point of no return.
    tx.commit();
    leave();

    // Conclude: a failure here is only a warning.
    enter('conclude');
    try {
      discard(tx.journal, runDir, !tx.journal.cacheCreated);
    } catch (error) {
      warnings.push(`could not clean up ${runDir}: ${errorText(error)}`);
    }
    leave();
    return { status: 'done', result: spec.result(), warnings };
  } catch (error) {
    emit({ phase, state: 'failed' });
    // A file that changed under the run is a stop, not a failure: one place for every client (#8, #7).
    if (error instanceof LockBusyError) error = new Stop('busy', error.message);
    if (error instanceof FileChangedError) error = new Stop('changed', `${error.file} changed while writing, try again`);
    const kind = error instanceof Stop ? error.kind : 'failed';
    let message = error instanceof Stop ? error.message : `${spec.label} failed and was undone (${phase}: ${errorText(error)})`;
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
    // After the undo or the discard. The first install keeps the base directories it made (keepAncestors).
    try {
      lock?.release({ keepDirs: spec.keepAncestors === true && tx?.committed === true });
    } catch (error) {
      warnings.push(`could not release the lock: ${errorText(error)}`);
    }
  }
}

function newJournal(id: string, scope: Scope, startedAt: Date, runAncestors: string[], cacheCreated: boolean): Journal {
  return { schema: JOURNAL_SCHEMA, id, pid: process.pid, startedAt: startedAt.toISOString(), scope, runAncestors, cacheCreated, actions: [], committed: false };
}
