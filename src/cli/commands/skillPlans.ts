import { readRegistry } from '../core/registry.js';
import { installedScopes, realEnv, type Env, type Scope } from '../core/scope.js';
import { runPlan, type RunOptions } from '../engine/run.js';
import { formatResult, type Plan } from '../plan/types.js';
import { EXIT_CANCELLED, EXIT_FAILED, EXIT_OK } from '../exitCodes.js';
import { consoleIo, type Io } from './io.js';

// What `fsd update skill` and `fsd link skill` share: every scope with something installed, one plan per scope, run and
// reported the same way.

export interface SkillsCommandOptions {
  force?: boolean;
  io?: Io;
  env?: Env;
  run?: RunOptions;
}

export interface SkillsCommandContext {
  force: boolean;
  io: Io;
  env: Env;
  run: RunOptions | undefined;
  scopes: Scope[];
}

export function skillsContext(options: SkillsCommandOptions): SkillsCommandContext {
  const env = options.env ?? realEnv();
  return { force: options.force ?? false, io: options.io ?? consoleIo, env, run: options.run, scopes: installedScopes(env) };
}

export const isInstalledSomewhere = (context: SkillsCommandContext, name: string): boolean => context.scopes.some((scope) => readRegistry(scope, context.env).skills[name] !== undefined);

/** Plans each scope with `planFor`, runs it and prints the results. Exit code: 0, 1 when anything failed, 130 when cancelled. */
export async function runSkillPlans(context: SkillsCommandContext, planFor: (scope: Scope) => Plan): Promise<number> {
  const { io, force } = context;
  let failed = false;
  for (const scope of context.scopes) {
    const plan = planFor(scope);
    for (const error of plan.errors) {
      io.err(error);
      failed = true;
    }
    const outcome = await runPlan(plan, context.run);
    if (outcome.status !== 'done') {
      io.err(outcome.message);
      if (outcome.status === 'cancelled') return EXIT_CANCELLED;
      failed = true;
      continue;
    }
    for (const warning of outcome.warnings) io.out(warning);
    for (const result of outcome.results) {
      if (result.conflict && !force) {
        io.err(`skill ${result.name}: ${result.conflict[0]} exists and is not managed by fsd (use --force to replace)`);
        failed = true;
      } else {
        io.out(formatResult(result));
      }
    }
  }
  return failed ? EXIT_FAILED : EXIT_OK;
}
