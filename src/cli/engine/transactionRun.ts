import { join } from 'node:path';
import { missingAncestors } from '../core/fs.js';
import { JOURNAL_SCHEMA, type Journal } from '../core/runJournal.js';
import type { Scope } from '../core/scope.js';
import { realOps, type Ops } from './ops.js';
import { discard, recoverRuns, Stop, undo, type StopKind } from './recovery.js';
import { Transaction } from './transaction.js';

// SPEC 6.9: the run of a transaction, whatever it changes. The lock, the journal, ctrl+c, the commit, the undo and the
// phase events live here; what to verify and what to do belong to the client (engine/run.ts for skills).
// Phases: 'verify', then the client's own (the first one opens the journal), then 'conclude'.

export interface PhaseEvent<P extends string> {
  phase: 'verify' | P | 'conclude';
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

export type TransactionOutcome<P extends string, R> =
  | { status: 'done'; result: R; warnings: string[] }
  | { status: StopKind; phase: 'verify' | P | 'conclude'; message: string; warnings: string[] };

export interface TransactionContext<P extends string> {
  readonly tx: Transaction;
  readonly id: string;
  readonly warnings: string[];
  /** Starts a phase (the one running is marked done). */
  enter(phase: P): void;
  /** Announces the item being worked on in the current phase. */
  item(name: string): void;
  /** Between operations: lets ctrl+c arrive, and stops (undoing) when it was asked to. */
  step(): Promise<void>;
}

export interface TransactionSpec<P extends string, R> {
  scope: Scope;
  // `.fsd/cache` of the scope, where the run directory and the lock live.
  cacheDir: string;
  // Names the run in the failure message: `<label> failed and was undone (...)`.
  label: string;
  // The phase in which the journal is opened; a failure creating it is reported as this phase.
  firstPhase: P;
  // Keep the directories the run created to hold its own directory (they are the client's to keep).
  keepAncestors: boolean;
  /** Read-only checks, before anything is written. Throws when the run cannot go as planned. */
  verify(): void;
  /** Does the changes in `ctx.tx`, entering its phases in order. The last phase ends with the commit, done by the core. */
  work(ctx: TransactionContext<P>): Promise<R>;
}

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

export async function runTransaction<P extends string, R>(spec: TransactionSpec<P, R>, options: TransactionOptions<P> = {}): Promise<TransactionOutcome<P, R>> {
  const ops = options.ops ?? realOps;
  const control = options.control ?? { cancelled: false };
  const emit = options.onEvent ?? (() => {});
  const now = options.now ?? (() => new Date());
  const warnings: string[] = [];
  const id = `${process.pid}-${now().getTime().toString(36)}`;
  const runDir = join(spec.cacheDir, `run-${id}`);
  let phase: 'verify' | P | 'conclude' = 'verify';
  let open = false;
  let tx: Transaction | undefined;

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
    if (open) emit({ phase, state: 'done' });
    open = false;
  };
  const enter = (next: 'verify' | P | 'conclude') => {
    leave();
    phase = next;
    open = true;
    emit({ phase, state: 'running' });
  };

  try {
    // 1. Verify: reads, and recovers dead runs.
    enter('verify');
    recoverRuns(spec.cacheDir, warnings);
    spec.verify();
    await step();

    // 2. The journal: opened inside the client's first phase.
    enter(spec.firstPhase);
    const runAncestors = missingAncestors(runDir);
    for (const dir of runAncestors) ops.mkdir(dir);
    const journal: Journal = {
      schema: JOURNAL_SCHEMA,
      id,
      pid: process.pid,
      startedAt: now().toISOString(),
      scope: spec.scope,
      runAncestors,
      cacheCreated: runAncestors.includes(spec.cacheDir) && !spec.keepAncestors,
      actions: [],
      committed: false,
    };
    const opened = new Transaction(ops, runDir, journal);
    tx = opened;
    opened.save();
    recoverRuns(spec.cacheDir, warnings, runDir);
    await step();

    const result = await spec.work({
      tx: opened,
      id,
      warnings,
      enter: (next) => enter(next),
      item: (name) => emit({ phase, state: 'running', item: name }),
      step,
    });

    // The point of no return.
    opened.commit();

    // Conclude: a failure here is only a warning.
    enter('conclude');
    try {
      discard(journal, runDir, !journal.cacheCreated);
    } catch (error) {
      warnings.push(`could not clean up ${runDir}: ${errorText(error)}`);
    }
    leave();
    return { status: 'done', result, warnings };
  } catch (error) {
    emit({ phase, state: 'failed' });
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
  }
}
