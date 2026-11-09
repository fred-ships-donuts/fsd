import { accessSync, constants } from 'node:fs';
import { exists, nearestExisting } from '../core/fs.js';
import { findTask, nookPaths, openSteps } from '../core/nook.js';
import type { Env } from '../core/scope.js';
import { changedMessage, nookRel, type TaskMovePlan } from '../plan/task.js';
import { Stop } from './recovery.js';
import { runTransaction, type TransactionOptions, type TransactionOutcome } from './transactionRun.js';

// SPEC 5.5 and 6.9: `task done|archive` as a client of the transaction core. One phase of its own, `apply`: rewrite
// plan.md with the new status, create nook/<to> when missing and move the folder. A failure or a cancel before the
// commit puts everything back; installed.json is neither read nor written.

export type TaskPhase = 'apply';
export type TaskMove = Extract<TaskMovePlan, { kind: 'move' }>;
export type TaskOutcome = TransactionOutcome<TaskPhase, string>;

export function runTaskMove(env: Env, move: TaskMove, options: TransactionOptions<TaskPhase> = {}): Promise<TaskOutcome> {
  const dirs = nookPaths(env).dirs;
  const planRel = nookRel(move.from, move.slug, 'plan.md');
  return runTransaction<TaskPhase, string>(
    {
      scope: 'project',
      env,
      label: move.label,
      firstPhase: 'apply',
      keepAncestors: false,
      verify: () => {
        // The task must be exactly as it was planned.
        const task = findTask(env, move.slug);
        if (!task || task.invalid || task.dir !== move.from || task.planText !== move.snapshot) throw new Stop('changed', changedMessage(planRel));
        if (move.command === 'done' && openSteps(task).length > 0) throw new Stop('changed', changedMessage(planRel));
        // The destination must be free, and every folder involved writable.
        if (exists(move.destination) !== undefined) throw new Stop('failed', `task ${move.slug} already exists in ${nookRel(move.to)} (run: fsd task list --all)`);
        const toDir = dirs[move.to];
        if (exists(toDir)?.isSymbolicLink()) throw new Stop('failed', `${nookRel(move.to)} is a symbolic link`);
        for (const path of [move.taskPath, dirs[move.from], nearestExisting(toDir)]) accessSync(path, constants.W_OK);
      },
      work: async (tx, ctx) => {
        tx.writeTextFiles([{ path: move.planPath, content: move.newPlanText, expected: move.snapshot }]);
        await ctx.step();
        tx.ensureDirs(dirs[move.to]);
        await ctx.step();
        try {
          tx.relocate(move.taskPath, move.destination);
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code === 'EPERM' || code === 'EBUSY') throw new Stop('failed', `task ${move.slug} is in use by another program, close it and try again`);
          throw error;
        }
        await ctx.step();
      },
      result: () => `moved ${move.slug} to ${nookRel(move.to)}`,
    },
    options,
  );
}
