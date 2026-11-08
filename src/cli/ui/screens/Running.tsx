import { Text } from 'ink';
import { phases, type Phase } from '../../engine/run.js';
import { Title } from '../components/Title.js';
import { PHASE_LABEL } from '../labels.js';

export type PhaseState = 'pending' | 'running' | 'done' | 'failed';
export type PhaseStates = Record<Phase, PhaseState>;

export const pendingPhases = (): PhaseStates => ({ verify: 'pending', prepare: 'pending', apply: 'pending', register: 'pending', conclude: 'pending' });

const MARK: Record<PhaseState, string> = { pending: ' ', running: '…', done: '✔', failed: '✖' };

// The run's phases as they go (SPEC 6.9), with the skill being applied.
export function Running({ states, item }: { states: PhaseStates; item: string }) {
  return (
    <>
      <Title text="Working" />
      {phases.map((phase) => (
        <Text key={phase}>
          {MARK[states[phase]]} {PHASE_LABEL[phase]}
          {phase === 'apply' && states.apply === 'running' && item ? `  ${item}` : ''}
        </Text>
      ))}
    </>
  );
}
