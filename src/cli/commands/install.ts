import { Command } from 'commander';
import { askConfirm, askLang, askScope, askSkills, interactive } from '../prompts.js';
import {
  compareVersions,
  copySkill,
  installedVersion,
  isInstalled,
  listSkills,
  skillLangs,
  skillsTarget,
  type InstallResult,
  type Skill,
} from '../skills.js';

interface InstallOptions {
  all?: boolean;
  project?: boolean;
  force?: boolean;
  lang?: string;
  dryRun?: boolean;
}

export const installCommand = new Command('install')
  .description('install skills into ~/.claude/skills (or ./.claude/skills with --project)')
  .argument('[skills...]', 'names of the skills to install')
  .option('-a, --all', 'install every available skill')
  .option('-p, --project', 'install into the current project instead of globally')
  .option('-f, --force', 'overwrite skills even when the installed version is not older')
  .option('-l, --lang <lang>', 'language of the skills (skips the language question)')
  .option('--dry-run', 'show what would be done without writing anything')
  .action((names: string[], options: InstallOptions) => commandAction(names, options));

export function installSkill(
  skill: Skill,
  lang: string,
  target: string,
  force: boolean,
  dryRun: boolean,
): InstallResult {
  const variant = skill.variants.find((candidate) => candidate.lang === lang)!;
  const present = isInstalled(target, skill.name);
  let result: InstallResult = 'installed';

  if (present) {
    const current = installedVersion(target, skill.name);
    if (!force) {
      if (current === undefined) {
        console.log(`skip    ${skill.name} (installed version unknown, use --force to overwrite)`);
        return 'skipped';
      }
      if (variant.version !== undefined && compareVersions(variant.version, current) <= 0) {
        console.log(`skip    ${skill.name} (${current} is up to date, use --force to overwrite)`);
        return 'skipped';
      }
    }
    result = 'upgraded';
  }

  if (dryRun) {
    console.log(`would ${result === 'upgraded' ? 'upgrade' : 'install'} ${skill.name} [${lang}] -> ${target}`);
  } else {
    const destination = copySkill(variant, target, skill.name);
    console.log(`${result === 'upgraded' ? 'upgrade' : 'install'} ${skill.name} [${lang}] -> ${destination}`);
  }
  return result;
}

const commandAction = async (names: string[], options: InstallOptions) => {
  const catalog = listSkills();
  const available = catalog.map((skill) => skill.name);
  const tty = interactive();
  let prompted = false;

  let selected = options.all ? available : names;
  if (selected.length === 0) {
    if (!tty) installCommand.error(`no skill given. Available: ${available.join(', ')} (or use --all)`);
    selected = await askSkills(catalog);
    prompted = true;
  }

  const unknown = selected.filter((name) => !available.includes(name));
  if (unknown.length > 0) {
    installCommand.error(`unknown skill(s): ${unknown.join(', ')}. Available: ${available.join(', ')}`);
  }
  const skills = catalog.filter((skill) => selected.includes(skill.name));

  let project = options.project;
  if (project === undefined) {
    project = tty ? await askScope() : false;
    prompted ||= tty;
  }

  // One language per run; single-language skills just use their only one.
  const choices = [...new Set(skills.flatMap(skillLangs))].sort();
  const needsLang = skills.some((skill) => skill.variants.length > 1);
  let lang = options.lang;
  if (lang === undefined && needsLang) {
    if (!tty) installCommand.error(`--lang is required (${choices.join(', ')})`);
    lang = await askLang(choices);
    prompted = true;
  }

  const plan = skills.map((skill) => {
    const chosen = lang ?? skillLangs(skill)[0]!;
    if (!skillLangs(skill).includes(chosen)) {
      installCommand.error(`skill ${skill.name} has no language '${chosen}'. Available: ${skillLangs(skill).join(', ')}`);
    }
    return { skill, lang: chosen };
  });

  const target = skillsTarget(project);
  if (prompted && !options.dryRun) {
    const summary = plan.map((item) => `${item.skill.name} [${item.lang}]`).join(', ');
    if (!(await askConfirm(`Install ${summary} into ${target}?`))) {
      console.log('aborted');
      return;
    }
  }

  for (const item of plan) {
    installSkill(item.skill, item.lang, target, options.force ?? false, options.dryRun ?? false);
  }
};
