import { planLink } from '../plan/link.js';
import { EXIT_FAILED } from '../exitCodes.js';
import { isInstalledSomewhere, runSkillPlans, skillsContext, type SkillsCommandOptions } from './skillPlans.js';

// `fsd link skill [name]`: links installed skills that have no link (SPEC 5.4).
export async function linkSkillsCommand(name: string | undefined, options: SkillsCommandOptions = {}): Promise<number> {
  const context = skillsContext(options);
  if (name && !isInstalledSomewhere(context, name)) {
    context.io.err(`skill ${name} is not installed`);
    return EXIT_FAILED;
  }
  return runSkillPlans(context, (scope) => planLink(scope, name ? [name] : [], context.force, context.env));
}
