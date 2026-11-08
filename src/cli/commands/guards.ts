import { liveRun } from '../core/runJournal.js';
import { scopePaths, type Env } from '../core/scope.js';

// Checks shared by the commands that write outside the engine (task new, task step): one place for the rule and its
// message (SPEC 5.5).

export const BUSY = 'another fsd run is in progress';

/**
 * The refusal when another fsd run is in progress in the project scope, or undefined. Only reads: there is no lock file,
 * so a run that starts right after this check is not seen (accepted in this version, SPEC 5.5 "Gravação").
 */
export function busyError(env: Env): string | undefined {
  return liveRun(scopePaths('project', env).cache) ? BUSY : undefined;
}
