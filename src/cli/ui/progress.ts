// Steps and progress bar of the wizard flows (SPEC 6.2, 6.4). Pure functions.

export type Flow = 'install' | 'uninstall';
export type StepId = 'scope' | 'skills' | 'language' | 'update' | 'theme' | 'symbols' | 'summary';

export function stepsFor(flow: Flow, languageApplies: boolean): StepId[] {
  if (flow === 'uninstall') return ['scope', 'skills', 'summary'];
  const steps: StepId[] = ['scope', 'skills', 'language', 'update', 'theme', 'symbols', 'summary'];
  return languageApplies ? steps : steps.filter((step) => step !== 'language');
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

export function renderBar(fraction: number, width: number, full: string, empty: string): string {
  const filled = Math.round(Math.max(0, Math.min(1, fraction)) * width);
  return full.repeat(filled) + empty.repeat(width - filled);
}
