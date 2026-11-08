import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { exists } from './fs.js';
import { scopePaths, type Env } from './scope.js';
import { InvalidTaskFileError, parsePlan, parseStep, PLAN_FILE, stepLabel, stepNumber, type StepStatus, type TaskStatus } from './taskFiles.js';

// The tasks of `<cwd>/nook/` (SPEC 4.5): where they live, finding one by slug, and reading a task into a model.
// Read-only; writing goes through core/fs.ts (one file) or the engine (done/archive).

export const TASK_DIRS = ['bench', 'rack', 'fridge'] as const;
export type TaskDir = (typeof TASK_DIRS)[number];

/** The status that belongs to each folder. */
export const DIR_STATUS: Record<TaskDir, TaskStatus> = { bench: 'in_progress', rack: 'done', fridge: 'archived' };

export interface NookPaths {
  root: string;
  dirs: Record<TaskDir, string>;
}

export function nookPaths(env: Env): NookPaths {
  const root = scopePaths('project', env).nook;
  return { root, dirs: { bench: join(root, 'bench'), rack: join(root, 'rack'), fridge: join(root, 'fridge') } };
}

/** The project root guard: `task new` needs `nook/` or `.fsd/` in the cwd, so an agent does not create `src/nook/`. */
export function isProjectRoot(env: Env): boolean {
  const paths = scopePaths('project', env);
  return exists(paths.nook)?.isDirectory() === true || exists(paths.fsd)?.isDirectory() === true;
}

export const hasNook = (env: Env): boolean => exists(nookPaths(env).root)?.isDirectory() === true;

export interface Step {
  number: number;
  label: string;
  file: string;
  path: string;
  text: string;
  title?: string;
  status?: StepStatus;
  // Why the step cannot be read; a step like this makes the whole task invalid.
  invalid?: string;
}

export interface Invalid {
  // The file to fix, relative to the task folder.
  file: string;
  reason: string;
}

export interface Task {
  slug: string;
  dir: TaskDir;
  path: string;
  planPath: string;
  // The plan.md text as read (undefined when it could not be read).
  planText?: string;
  title?: string;
  status?: TaskStatus;
  // In number order. Undefined when the folder could not be listed.
  steps?: Step[];
  invalid?: Invalid;
}

export const invalidText = (invalid: Invalid): string => `${invalid.file}: ${invalid.reason}`;

const reasonOf = (error: unknown): string =>
  error instanceof InvalidTaskFileError ? error.reason : `cannot be read (${(error as NodeJS.ErrnoException).code ?? String(error)})`;

// The entries of a folder that are visible (names starting with `.` are temporaries or the user's own). Throws when
// the folder cannot be listed.
function visibleEntries(dir: string): Array<{ name: string; isDir: boolean }> {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.'))
    .map((entry) => ({ name: entry.name, isDir: entry.isDirectory() }));
}

// The subfolders of nook/<dir>; none when the folder does not exist or cannot be listed.
function taskFolders(dir: string): string[] {
  try {
    return visibleEntries(dir)
      .filter((entry) => entry.isDir)
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

// Throws when the task folder cannot be listed: "no steps" must never stand for "steps not read".
function readSteps(taskPath: string): Step[] {
  const steps: Step[] = [];
  for (const { name, isDir } of visibleEntries(taskPath)) {
    const number = stepNumber(name);
    if (number === undefined || isDir) continue;
    const path = join(taskPath, name);
    const step: Step = { number, label: stepLabel(number), file: name, path, text: '' };
    try {
      step.text = readFileSync(path, 'utf8');
      const fields = parseStep(step.text);
      step.title = fields.title;
      step.status = fields.status;
    } catch (error) {
      step.invalid = reasonOf(error);
    }
    steps.push(step);
  }
  return steps.sort((a, b) => a.number - b.number || (a.file < b.file ? -1 : 1));
}

/** Reads the task in `nook/<dir>/<slug>/`. Never throws: what is wrong goes in `invalid`. */
export function readTask(env: Env, dir: TaskDir, slug: string): Task {
  const path = join(nookPaths(env).dirs[dir], slug);
  const planPath = join(path, PLAN_FILE);
  const task: Task = { slug, dir, path, planPath };
  const fail = (file: string, reason: string): Task => {
    task.invalid ??= { file, reason };
    return task;
  };

  try {
    task.planText = readFileSync(planPath, 'utf8');
    const plan = parsePlan(task.planText);
    task.title = plan.title;
    task.status = plan.status;
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === 'ENOENT';
    fail(PLAN_FILE, missing ? 'is missing' : reasonOf(error));
  }

  try {
    task.steps = readSteps(path);
  } catch (error) {
    fail('.', `the task folder ${reasonOf(error)}`);
  }
  if (task.invalid || !task.steps) return task;

  if (task.status !== DIR_STATUS[dir]) return fail(PLAN_FILE, `status ${task.status} does not match nook/${dir}`);
  const broken = task.steps.find((step) => step.invalid !== undefined);
  if (broken) return fail(broken.file, broken.invalid as string);
  const repeated = task.steps.find((step, index) => index > 0 && task.steps?.[index - 1]?.number === step.number);
  if (repeated) return fail(repeated.file, `step number ${repeated.label} is used by more than one file`);
  return task;
}

/** The folders where a task with this slug exists, in bench, rack, fridge order. */
export function locateTask(env: Env, slug: string): TaskDir[] {
  const { dirs } = nookPaths(env);
  return TASK_DIRS.filter((dir) => exists(join(dirs[dir], slug))?.isDirectory() === true);
}

/**
 * The task with this slug, or undefined when there is none. A slug in more than one folder is invalid (the folder
 * names are unique in all of nook/).
 */
export function findTask(env: Env, slug: string): Task | undefined {
  const found = locateTask(env, slug);
  const first = found[0];
  if (first === undefined) return undefined;
  const task = readTask(env, first, slug);
  if (found.length > 1) task.invalid = { file: PLAN_FILE, reason: `the task is in more than one folder: ${found.map((dir) => `nook/${dir}`).join(', ')}` };
  return task;
}

/** The tasks of the given folders, in that folder order and by slug inside each. Never throws. */
export function listTasks(env: Env, dirs: readonly TaskDir[]): Task[] {
  const paths = nookPaths(env);
  const tasks: Task[] = [];
  for (const dir of dirs) {
    for (const slug of taskFolders(paths.dirs[dir])) {
      const task = readTask(env, dir, slug);
      const elsewhere = locateTask(env, slug).filter((other) => other !== dir);
      if (elsewhere.length > 0) task.invalid = { file: PLAN_FILE, reason: `the task is also in ${elsewhere.map((other) => `nook/${other}`).join(', ')}` };
      tasks.push(task);
    }
  }
  return tasks;
}

export interface StepCounts {
  total: number;
  done: number;
  skipped: number;
  pending: number;
  inProgress: number;
}

/** The step counts of a task, or null when its plan.md or any of its steps could not be read (SPEC 5.5, `--json`). */
export function stepCounts(task: Task): StepCounts | null {
  if (task.status === undefined || !task.steps || task.steps.some((step) => step.status === undefined)) return null;
  const counts: StepCounts = { total: task.steps.length, done: 0, skipped: 0, pending: 0, inProgress: 0 };
  for (const step of task.steps) {
    if (step.status === 'done') counts.done++;
    else if (step.status === 'skipped') counts.skipped++;
    else if (step.status === 'pending') counts.pending++;
    else counts.inProgress++;
  }
  return counts;
}

/** The steps that are neither done nor skipped (what blocks `task done`). */
export const openSteps = (task: Task): Step[] => (task.steps ?? []).filter((step) => step.status !== 'done' && step.status !== 'skipped');

/** The next step number: the highest one plus one (numbers left free are not reused). */
export const nextStepNumber = (task: Task): number => Math.max(0, ...(task.steps ?? []).map((step) => step.number)) + 1;

/** The step with number `n` (1 and 01 are the same). */
export const findStep = (task: Task, n: number): Step | undefined => task.steps?.find((step) => step.number === n);
