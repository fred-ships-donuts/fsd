import { Command } from 'commander';
import { installSkill } from './install.js';
import { installedLang, isInstalled, listSkills, skillLangs, skillsTarget } from '../skills.js';

interface UpdateOptions {
  project?: boolean;
}

export const updateCommand = new Command('update')
  .description('reinstall installed skills that have a newer version')
  .argument('[skills...]', 'names of the skills to update (default: every installed one)')
  .option('-p, --project', 'use the project destination instead of the global one')
  .action((names: string[], options: UpdateOptions) => commandAction(names, options));

const commandAction = (names: string[], options: UpdateOptions) => {
  const catalog = listSkills();
  const available = catalog.map((skill) => skill.name);

  const unknown = names.filter((name) => !available.includes(name));
  if (unknown.length > 0) {
    updateCommand.error(`unknown skill(s): ${unknown.join(', ')}. Available: ${available.join(', ')}`);
  }

  const target = skillsTarget(options.project ?? false);
  const candidates = catalog.filter((skill) => (names.length > 0 ? names.includes(skill.name) : isInstalled(target, skill.name)));

  for (const skill of candidates) {
    if (!isInstalled(target, skill.name)) {
      console.log(`skip    ${skill.name} (not installed)`);
      continue;
    }
    const lang = installedLang(target, skill.name);
    if (lang === undefined || !skillLangs(skill).includes(lang)) {
      console.log(`skip    ${skill.name} (language unknown, run: fsd install ${skill.name} --force --lang <lang>)`);
      continue;
    }
    installSkill(skill, lang, target, false, false);
  }
};
