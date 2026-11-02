import { existsSync } from 'node:fs';
import { planLink } from '../actions/link.js';
import { realEnv, scopePaths, type Env, type Scope } from '../fsdDir.js';
import { readRegistry } from '../registry.js';
import { runPlan } from '../run.js';
import { consoleIo, formatResult, type Io, type SkillsOptions } from './update.js';

// `fsd link skill [nome]`: links installed skills that have no link (SPEC 5.4).
export async function linkSkillsCommand(name: string | undefined, io: Io = consoleIo, env: Env = realEnv(), options: SkillsOptions = {}): Promise<number> {
  const force = options.force ?? false;
  const scopes: Scope[] = ['global'];
  if (env.cwd !== env.home && existsSync(scopePaths('project', env).installed)) scopes.push('project');
  if (name && !scopes.some((scope) => readRegistry(scope, env).skills[name])) {
    io.err(`skill ${name} is not installed`);
    return 1;
  }

  let failed = false;
  for (const scope of scopes) {
    const plan = planLink(scope, name ? [name] : [], force, env);
    for (const error of plan.errors) {
      io.err(error);
      failed = true;
    }
    const outcome = await runPlan(plan, options.run);
    if (outcome.status !== 'done') {
      io.err(outcome.message);
      if (outcome.status === 'cancelled') return 130;
      failed = true;
      continue;
    }
    for (const warning of outcome.warnings) io.out(warning);
    for (const result of outcome.results) {
      if (result.conflict) {
        io.err(`skill ${result.name}: ${result.conflict[0]} exists and is not managed by fsd (use --force to replace)`);
        failed = true;
      } else {
        io.out(formatResult(result));
      }
    }
  }
  return failed ? 1 : 0;
}
