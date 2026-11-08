import type { Phase } from '../engine/run.js';
import type { ConflictChoice } from '../plan/types.js';
import type { StepId } from '../wizard/steps.js';

// Every piece of text the wizard shows for a value of the model.

export const STEP_TITLE: Record<StepId, string> = {
  scope: 'Scope',
  skills: 'Skills',
  language: 'Language',
  update: 'Updates',
  conflicts: 'Conflicts',
  theme: 'Theme',
  summary: 'Summary',
};

export const CONFLICT_CHOICE_TEXT: Record<ConflictChoice, string> = {
  keep: 'keep the original, skip ours',
  unlinked: 'install ours, keep the original (not linked)',
  replace: 'replace the original with ours',
};

export const PHASE_LABEL: Record<Phase, string> = { verify: 'Verify', prepare: 'Prepare', apply: 'Apply', register: 'Register', conclude: 'Conclude' };

export const HINT_MOVE = '↑↓ move · enter confirm · ← back';
export const HINT_MARK = '↑↓ move · space mark · enter confirm · ← back';
export const HINT_RUNNING = 'ctrl+c cancel (everything done so far is undone)';
export const HINT_RESULT = 'enter exit';
