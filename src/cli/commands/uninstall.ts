import { Command } from 'commander';
import { isInstalled, listSkills, removeSkill, skillsTarget } from '../skills.js';

interface UninstallOptions {
  project?: boolean;
}

export const uninstallCommand = new Command('uninstall')
  .alias('rm')
  .description('remove installed skills')
  .argument('<skills...>', 'names of the skills to remove')
  .option('-p, --project', 'use the project destination instead of the global one')
  .action((names: string[], options: UninstallOptions) => commandAction(names, options));

const commandAction = (names: string[], options: UninstallOptions) => {
  const available = listSkills().map((skill) => skill.name);

  // Only skills from this catalog are ever removed, never anything installed by other means.
  const unknown = names.filter((name) => !available.includes(name));
  if (unknown.length > 0) {
    uninstallCommand.error(`unknown skill(s): ${unknown.join(', ')}. Available: ${available.join(', ')}`);
  }

  const target = skillsTarget(options.project ?? false);
  for (const name of names) {
    if (!isInstalled(target, name)) {
      console.log(`skip    ${name} (not installed)`);
      continue;
    }
    removeSkill(target, name);
    console.log(`remove  ${name}`);
  }
};
