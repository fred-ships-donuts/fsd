import { Command } from 'commander';
import {
  compareVersions,
  installedVersion,
  isInstalled,
  listSkills,
  skillLangs,
  skillsTarget,
  skillVersion,
  type Skill,
} from '../skills.js';

interface ListOptions {
  installed?: boolean;
  project?: boolean;
}

export const listCommand = new Command('list')
  .alias('ls')
  .description('list the available skills')
  .option('-i, --installed', 'show the installation state of each skill')
  .option('-p, --project', 'check the project destination instead of the global one')
  .action((options: ListOptions) => commandAction(options));

function state(skill: Skill, target: string): string {
  if (!isInstalled(target, skill.name)) return 'not installed';
  const current = installedVersion(target, skill.name);
  const latest = skillVersion(skill);
  if (current === undefined || latest === undefined) return 'unknown';
  return compareVersions(current, latest) < 0 ? `outdated (${current})` : 'up to date';
}

const commandAction = (options: ListOptions) => {
  const target = skillsTarget(options.project ?? false);

  for (const skill of listSkills()) {
    const columns = [skill.name, skillVersion(skill) ?? '?', skillLangs(skill).join(',')];
    if (options.installed) columns.push(state(skill, target));
    console.log(columns.join('  '));
  }
};
