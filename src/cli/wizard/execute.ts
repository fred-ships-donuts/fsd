import { listSkills, skillLangs, type Skill } from '../core/catalog.js';
import { readConfig, type Config } from '../core/config.js';
import { realEnv, type Env, type Scope } from '../core/scope.js';
import { runPlan, type RunOptions, type RunOutcome } from '../engine/run.js';
import { planInstall, type InstallRequest } from '../plan/install.js';
import type { Plan } from '../plan/types.js';
import { planUninstall } from '../plan/uninstall.js';
import { conflictChoiceOf, type InstallChoices } from './choices.js';

// What the wizard does after the summary is confirmed (SPEC 6.9): plan, then run the phases.

export interface ExecuteOptions {
  env?: Env;
  run?: RunOptions;
  // When the npm check ran in this session; saved with the preferences.
  lastUpdateCheck?: string | undefined;
}

// The skill's language: the one chosen when the skill has it, else its first.
const pickLang = (skill: Skill | undefined, wanted: string): string | undefined => {
  const langs = skill ? skillLangs(skill) : [];
  return langs.includes(wanted) ? wanted : langs[0];
};

function installRequests(choices: InstallChoices): InstallRequest[] {
  const catalog = listSkills();
  return choices.skills.map((name) => {
    const lang = pickLang(catalog.find((skill) => skill.name === name), choices.lang);
    return { name, ...(lang ? { lang } : {}), onConflict: conflictChoiceOf(choices, name) };
  });
}

function preferences(choices: InstallChoices, env: Env, lastUpdateCheck: string | undefined): Config {
  return { ...readConfig(env), theme: choices.theme, autoUpdate: choices.autoUpdate, updateSkills: choices.updateSkills, ...(lastUpdateCheck ? { lastUpdateCheck } : {}) };
}

// A plan with errors is not run at all.
function runChecked(plan: Plan, options: RunOptions | undefined): Promise<RunOutcome> {
  if (plan.errors.length > 0) return Promise.resolve({ status: 'failed', phase: 'verify', message: plan.errors.join('; '), warnings: [] });
  return runPlan(plan, options);
}

export function executeInstall(choices: InstallChoices, options: ExecuteOptions = {}): Promise<RunOutcome> {
  const env = options.env ?? realEnv();
  const plan = planInstall(choices.scope, installRequests(choices), env, { ensureBase: true, config: preferences(choices, env, options.lastUpdateCheck) });
  return runChecked(plan, options.run);
}

export function executeUninstall(scope: Scope, names: string[], options: ExecuteOptions = {}): Promise<RunOutcome> {
  return runChecked(planUninstall(scope, names, options.env ?? realEnv()), options.run);
}
