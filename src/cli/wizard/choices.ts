import { listSkills } from '../core/catalog.js';
import { readConfig, type Config } from '../core/config.js';
import type { Scope } from '../core/scope.js';
import type { ConflictChoice } from '../plan/types.js';

// What the user picked in the install flow.
export interface InstallChoices {
  scope: Scope;
  skills: string[];
  lang: string;
  autoUpdate: boolean;
  updateSkills: boolean;
  theme: string;
  // Choice per skill that has a same-name skill in the way (SPEC 6.2 rule 3); missing = keep.
  conflicts: Record<string, ConflictChoice>;
}

/** The choices the wizard opens with: every skill marked, the preferences as saved. */
export function initialChoices(config: Config, skills: string[]): InstallChoices {
  return { scope: 'global', skills, lang: '', autoUpdate: config.autoUpdate, updateSkills: config.updateSkills, theme: config.theme, conflicts: {} };
}

/** initialChoices from the saved preferences and the whole catalog. */
export const startingChoices = (): InstallChoices => initialChoices(readConfig(), listSkills().map((skill) => skill.name));

export const conflictChoiceOf = (choices: InstallChoices, name: string): ConflictChoice => choices.conflicts[name] ?? 'keep';
