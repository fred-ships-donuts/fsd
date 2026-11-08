import { join } from 'node:path';
import { createTextFile, FileChangedError } from '../core/fs.js';
import { invalidText, isProjectRoot, listTasks, locateTask, nookPaths, stepCounts, TASK_DIRS, type StepCounts, type Task, type TaskDir } from '../core/nook.js';
import { realEnv, type Env } from '../core/scope.js';
import { normalizeTitle, slug } from '../core/slug.js';
import { newPlan, PLAN_FILE } from '../core/taskFiles.js';
import { EXIT_FAILED, EXIT_OK } from '../exitCodes.js';
import { busyError } from './guards.js';
import { consoleIo, type Io } from './io.js';

// `fsd task …` (SPEC 5.5): non-interactive commands over `<cwd>/nook/`, for the user and for the agent. Messages are in
// English; an error goes to stderr with exit 1 and ends with the command that fixes it, when there is one.

export interface TaskCommandOptions {
  io?: Io;
  env?: Env;
  now?: () => Date;
}

interface Context {
  io: Io;
  env: Env;
  now: () => Date;
}

const contextOf = (options: TaskCommandOptions): Context => ({ io: options.io ?? consoleIo, env: options.env ?? realEnv(), now: options.now ?? (() => new Date()) });

/** An expected refusal: printed as is, exit 1. */
class TaskError extends Error {}

const NOT_ROOT = 'no nook/ or .fsd/ here: run from the project root';
const LIST_ALL = '(run: fsd task list --all)';

// Paths in messages are relative to the project, with `/` on every platform.
export const nookRel = (...parts: string[]): string => ['nook', ...parts].join('/');

// Runs a command body: a TaskError is the message, anything else is reported in one line, never as a stack trace.
function guarded(io: Io, body: () => number): number {
  try {
    return body();
  } catch (error) {
    if (error instanceof TaskError) io.err(error.message);
    else io.err(`error: ${error instanceof Error ? error.message : String(error)}`);
    return EXIT_FAILED;
  }
}

/** The slug of a title as typed, or the refusal (SPEC 4.5 and 5.5). */
export function slugOf(rawTitle: string): { title: string; slug: string } {
  const title = normalizeTitle(rawTitle);
  const result = slug(title);
  if (!result.ok && result.reason === 'empty') throw new TaskError('title produces an empty name (use latin letters)');
  if (!result.ok) throw new TaskError(`${result.slug} is a reserved name`);
  return { title, slug: result.slug };
}

function refuseWhenBusy(env: Env): void {
  const busy = busyError(env);
  if (busy) throw new TaskError(busy);
}

const alreadyExists = (name: string, dir: TaskDir): TaskError => new TaskError(`task ${name} already exists in ${nookRel(dir)} ${LIST_ALL}`);

// ---------------------------------------------------------------------------------------------------------------
// task new

export function taskNewCommand(rawTitle: string, options: TaskCommandOptions = {}): number {
  const { io, env, now } = contextOf(options);
  return guarded(io, () => {
    const { title, slug: name } = slugOf(rawTitle);
    if (!isProjectRoot(env)) throw new TaskError(NOT_ROOT);
    refuseWhenBusy(env);
    const found = locateTask(env, name)[0];
    if (found) throw alreadyExists(name, found);

    const file = join(nookPaths(env).dirs.bench, name, PLAN_FILE);
    try {
      createTextFile(file, newPlan(title, now()));
    } catch (error) {
      // Another process created it between the check and the write.
      if (error instanceof FileChangedError) throw alreadyExists(name, 'bench');
      throw error;
    }
    io.out(`created ${nookRel('bench', name, PLAN_FILE)}`);
    return EXIT_OK;
  });
}

// ---------------------------------------------------------------------------------------------------------------
// task list

export interface TaskListOptions {
  all?: boolean;
  json?: boolean;
}

// The `--json` contract with the agent (SPEC 5.5): within schema 1, fields are only ever added.
export interface TaskListJson {
  schema: 1;
  tasks: Array<{ slug: string; status: string | null; dir: TaskDir; steps: StepCounts | null; invalid?: string }>;
}

export function taskListJson(tasks: Task[]): TaskListJson {
  return {
    schema: 1,
    tasks: tasks.map((task) => ({
      slug: task.slug,
      status: task.status ?? null,
      dir: task.dir,
      steps: stepCounts(task),
      ...(task.invalid ? { invalid: invalidText(task.invalid) } : {}),
    })),
  };
}

// One line per task in aligned columns: slug, status, closed/total, and the reason when invalid. Free to change.
function taskListText(tasks: Task[]): string[] {
  const rows = tasks.map((task) => {
    const counts = stepCounts(task);
    return [task.slug, task.invalid ? 'invalid' : (task.status as string), counts ? `${counts.done + counts.skipped}/${counts.total}` : '-', task.invalid ? invalidText(task.invalid) : ''];
  });
  const widths = [0, 1, 2].map((column) => Math.max(0, ...rows.map((row) => (row[column] as string).length)));
  return rows.map((row) => row.map((cell, column) => (column < 3 ? cell.padEnd(widths[column] as number) : cell)).join('  ').trimEnd());
}

export function taskListCommand(listOptions: TaskListOptions, options: TaskCommandOptions = {}): number {
  const { io, env } = contextOf(options);
  return guarded(io, () => {
    const dirs: readonly TaskDir[] = listOptions.all ? TASK_DIRS : ['bench', 'rack'];
    // Without nook/ the list is empty (exit 0); listTasks already returns nothing then.
    const tasks = listTasks(env, dirs);
    if (listOptions.json) io.out(JSON.stringify(taskListJson(tasks), null, 2));
    else for (const line of taskListText(tasks)) io.out(line);
    return EXIT_OK;
  });
}
