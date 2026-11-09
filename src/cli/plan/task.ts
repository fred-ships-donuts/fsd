import { join } from 'node:path';
import { invalidText, nookPaths, openSteps, type Task, type TaskDir } from '../core/nook.js';
import type { Env } from '../core/scope.js';
import { setPlanStatus, type TaskStatus } from '../core/taskFiles.js';

// What `fsd task done|archive` decides after reading the disk (SPEC 5.5). Pure: reads nothing, writes nothing. The
// messages of the refusals live here, one copy for the planner and for the step commands.

export type TaskMoveCommand = 'done' | 'archive';

export const LIST_ALL = '(run: fsd task list --all)';

// Paths in messages are relative to the project, with `/` on every platform.
export const nookRel = (...parts: string[]): string => ['nook', ...parts].join('/');

/** The refusal for a task that cannot be read. */
export function invalidMessage(task: Task): string {
  const invalid = task.invalid as NonNullable<Task['invalid']>;
  const file = invalid.file === '.' || invalid.file === task.slug ? nookRel(task.dir, task.slug) : nookRel(task.dir, task.slug, invalid.file);
  return `task ${task.slug} is invalid: ${invalidText(invalid)} (fix ${file} and run again)`;
}

export const notFoundMessage = (name: string): string => `task ${name} not found ${LIST_ALL}`;

export const notInBenchMessage = (task: Task): string => `task ${task.slug} is not in nook/bench: it is in ${nookRel(task.dir)} (run: fsd task new "<new title>")`;

export const changedMessage = (path: string): string => `${path} changed while writing, try again`;

export type TaskMovePlan =
  | { kind: 'error'; message: string }
  | { kind: 'already'; message: string }
  | {
      kind: 'move';
      slug: string;
      command: TaskMoveCommand;
      from: TaskDir;
      to: TaskDir;
      taskPath: string;
      destination: string;
      planPath: string;
      // The plan.md as it was read, and as it will be written.
      snapshot: string;
      newPlanText: string;
      label: string;
    };

const TARGET: Record<TaskMoveCommand, { from: TaskDir; to: TaskDir; status: TaskStatus }> = {
  done: { from: 'bench', to: 'rack', status: 'done' },
  archive: { from: 'rack', to: 'fridge', status: 'archived' },
};

/** Order of the checks: not found, invalid, already, wrong folder, open steps (`done` only). */
export function planTaskMove(env: Env, task: Task | undefined, name: string, command: TaskMoveCommand, now: Date): TaskMovePlan {
  const target = TARGET[command];
  if (!task) return { kind: 'error', message: notFoundMessage(name) };
  if (task.invalid) return { kind: 'error', message: invalidMessage(task) };
  if (task.dir === target.to) return { kind: 'already', message: `task ${task.slug} already ${command === 'done' ? 'done' : 'archived'}` };
  if (task.dir !== target.from) {
    const hint = command === 'archive' ? (task.dir === 'bench' ? `run: fsd task done ${task.slug}` : 'run: fsd task list --all') : 'run: fsd task new "<new title>"';
    return { kind: 'error', message: `task ${task.slug} is not in ${nookRel(target.from)}: it is in ${nookRel(task.dir)} (${hint})` };
  }
  if (command === 'done') {
    const open = openSteps(task);
    const first = open[0];
    if (first) return { kind: 'error', message: `task ${task.slug} has open steps: ${open.map((step) => step.label).join(', ')} (run: fsd task step done ${task.slug} ${first.label})` };
  }
  const dirs = nookPaths(env).dirs;
  const snapshot = task.planText as string;
  return {
    kind: 'move',
    slug: task.slug,
    command,
    from: target.from,
    to: target.to,
    taskPath: task.path,
    destination: join(dirs[target.to], task.slug),
    planPath: task.planPath,
    snapshot,
    newPlanText: setPlanStatus(snapshot, target.status, now),
    label: `task ${task.slug}`,
  };
}
