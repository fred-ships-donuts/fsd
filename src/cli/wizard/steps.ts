// Steps and progress of the wizard flows (SPEC 6.2, 6.4). Pure functions.

export type Flow = 'install' | 'uninstall';
export type StepId = 'scope' | 'skills' | 'language' | 'conflicts' | 'update' | 'theme' | 'summary';

// Language and conflicts are conditional steps (SPEC 6.2): the total is 7, 6 or 5.
export function stepsFor(flow: Flow, languageApplies: boolean, conflictsApply = false): StepId[] {
  if (flow === 'uninstall') return ['scope', 'skills', 'summary'];
  const steps: StepId[] = ['scope', 'skills'];
  if (languageApplies) steps.push('language');
  if (conflictsApply) steps.push('conflicts');
  steps.push('update', 'theme', 'summary');
  return steps;
}

// Completed steps over total. The bar is full only once the last step (summary) is concluded.
export function progressFraction(steps: StepId[], current: StepId, concluded = false): number {
  const index = steps.indexOf(current);
  if (index < 0 || steps.length === 0) return 0;
  return (concluded ? index + 1 : index) / steps.length;
}

export function stepLabel(steps: StepId[], current: StepId): string {
  return `step ${steps.indexOf(current) + 1} of ${steps.length}`;
}
