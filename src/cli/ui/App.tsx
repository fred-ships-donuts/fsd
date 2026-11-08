import { useMemo, useRef, useState, type ReactElement } from 'react';
import { Box, useApp, useInput } from 'ink';
import type { RunEvent, RunOutcome } from '../engine/run.js';
import { EXIT_CANCELLED, EXIT_FAILED, EXIT_OK } from '../exitCodes.js';
import { formatResult } from '../plan/types.js';
import { startingChoices, type InstallChoices } from '../wizard/choices.js';
import { executeInstall, executeUninstall } from '../wizard/execute.js';
import { catalogRows, conflictsFor, installedRows, languageApplies, languageOptions } from '../wizard/queries.js';
import { progressFraction, stepLabel, stepsFor, type Flow, type StepId } from '../wizard/steps.js';
import { Footer } from './components/Footer.js';
import { Header } from './components/Header.js';
import { Title } from './components/Title.js';
import { HINT_MARK, HINT_MOVE, HINT_RESULT, HINT_RUNNING, STEP_TITLE } from './labels.js';
import { listRows } from './layout.js';
import { Menu, type MenuChoice } from './screens/Menu.js';
import { Result } from './screens/Result.js';
import { pendingPhases, Running, type PhaseStates } from './screens/Running.js';
import { Step } from './screens/Step.js';
import { useTerminalSize, type TerminalSize } from './terminal/useTerminalSize.js';
import { resolveTheme, Theme } from './theme.js';

// The wizard (SPEC 6): which screen is shown, the user's choices, and the keys that move between screens.

type Screen = { kind: 'menu' } | { kind: 'step'; flow: Flow; step: StepId } | { kind: 'running' } | { kind: 'result'; lines: string[]; code: number };

const STEPS_WITH_MARKS: StepId[] = ['skills', 'update', 'summary'];

export interface AppProps {
  version: string;
  onExit: (code: number) => void;
  lastUpdateCheck?: string;
  terminal?: TerminalSize;
}

export function App({ version, onExit, lastUpdateCheck, terminal }: AppProps) {
  const { exit } = useApp();
  const size = useTerminalSize(terminal);
  const [screen, setScreen] = useState<Screen>({ kind: 'menu' });
  const [menu, setMenu] = useState<MenuChoice>('install');
  const [removal, setRemoval] = useState<string[]>([]);
  const [choices, setChoices] = useState<InstallChoices>(startingChoices);
  const [phaseStates, setPhaseStates] = useState<PhaseStates>(pendingPhases);
  const [currentItem, setCurrentItem] = useState('');
  const control = useRef({ cancelled: false });

  const catalog = useMemo(() => catalogRows(choices.scope), [choices.scope]);
  const installed = useMemo(() => installedRows(choices.scope), [choices.scope]);
  const conflicts = useMemo(() => (screen.kind === 'menu' ? [] : conflictsFor(choices)), [choices.scope, choices.skills, screen.kind]);
  const hasLang = languageApplies(choices.skills, catalog);
  const langs = languageOptions(choices.skills, catalog);
  const flow: Flow = screen.kind === 'step' ? screen.flow : 'install';
  const steps = stepsFor(flow, hasLang, flow === 'install' && conflicts.length > 0);
  const theme = resolveTheme(choices.theme);

  const updateChoices = (patch: Partial<InstallChoices>) => setChoices((current) => ({ ...current, ...patch }));
  const finish = (code: number) => {
    onExit(code);
    exit();
  };
  const go = (step: StepId, next: Flow = flow) => setScreen({ kind: 'step', flow: next, step });
  const move = (delta: 1 | -1) => {
    if (screen.kind !== 'step') return;
    const index = steps.indexOf(screen.step) + delta;
    if (index < 0) return setScreen({ kind: 'menu' });
    const next = steps[index];
    if (next) go(next);
  };

  const confirm = () => {
    if (screen.kind === 'menu') {
      if (menu === 'exit') return finish(EXIT_OK);
      return go('scope', menu);
    }
    if (screen.kind === 'result') return finish(screen.code);
    if (screen.kind !== 'step') return;
    if (screen.step === 'skills') {
      if (flow === 'install' && choices.skills.length === 0) return;
      if (flow === 'uninstall' && removal.length === 0) return;
      if (flow === 'install' && hasLang && !langs.includes(choices.lang)) updateChoices({ lang: langs[0] ?? '' });
    }
    if (screen.step === 'summary') return void run();
    move(1);
  };

  // After the summary is confirmed the run does its own undo; ctrl+c asks it to stop between operations.
  async function run() {
    control.current.cancelled = false;
    setPhaseStates(pendingPhases());
    setScreen({ kind: 'running' });
    const runOptions = {
      control: control.current,
      onEvent: (event: RunEvent) => {
        setPhaseStates((current) => ({ ...current, [event.phase]: event.state }));
        if (event.item) setCurrentItem(event.item);
      },
    };
    const outcome: RunOutcome = await (flow === 'install' ? executeInstall(choices, { run: runOptions, lastUpdateCheck }) : executeUninstall(choices.scope, removal, { run: runOptions }));
    if (outcome.status === 'done') setScreen({ kind: 'result', lines: [...outcome.results.map(formatResult), ...outcome.warnings], code: EXIT_OK });
    else setScreen({ kind: 'result', lines: [outcome.message, ...outcome.warnings], code: outcome.status === 'cancelled' ? EXIT_CANCELLED : EXIT_FAILED });
  }

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      if (screen.kind === 'running') control.current.cancelled = true;
      else finish(EXIT_CANCELLED);
      return;
    }
    if (screen.kind === 'running') return;
    if (key.return) return confirm();
    if (key.leftArrow && screen.kind === 'step') move(-1);
  });

  let body: ReactElement;
  let hint = HINT_MOVE;
  let fraction = 0;
  let label = '';
  if (screen.kind === 'menu') {
    body = <Menu selected={menu} onChange={setMenu} />;
  } else if (screen.kind === 'running') {
    body = <Running states={phaseStates} item={currentItem} />;
    hint = HINT_RUNNING;
    fraction = 1;
    label = 'running';
  } else if (screen.kind === 'result') {
    body = <Result lines={screen.lines} />;
    hint = HINT_RESULT;
    fraction = 1;
    label = 'done';
  } else {
    const { step } = screen;
    fraction = progressFraction(steps, step);
    label = stepLabel(steps, step);
    if (STEPS_WITH_MARKS.includes(step)) hint = HINT_MARK;
    body = (
      <>
        <Title text={STEP_TITLE[step]} />
        {/* Keyed by step: each step's list starts with its own cursor. */}
        <Box key={step} flexDirection="column">
          <Step
            step={step}
            flow={flow}
            choices={choices}
            onChoices={updateChoices}
            removal={removal}
            onRemoval={setRemoval}
            catalog={catalog}
            installed={installed}
            langs={langs}
            hasLang={hasLang}
            conflicts={conflicts}
            maxRows={listRows(size.rows, size.columns)}
          />
        </Box>
      </>
    );
  }

  const where = screen.kind === 'step' ? `${choices.scope} · ${label}` : undefined;

  return (
    <Theme.Provider value={theme}>
      <Box flexDirection="column" paddingTop={1} width={size.columns} height={size.rows}>
        <Header version={version} {...(where ? { where } : {})} hero={screen.kind === 'menu'} columns={size.columns} rows={size.rows} />
        {/* The body takes what the header and the footer leave and cuts what does not fit; it never squeezes its rows. The window's side padding
            is on the body and the footer, not on the root: the big header (the snow in it) goes edge to edge. */}
        <Box flexDirection="column" flexGrow={1} flexShrink={1} overflowY="hidden" paddingX={1}>
          <Box flexDirection="column" flexShrink={0}>
            {body}
          </Box>
        </Box>
        <Box flexDirection="column" paddingX={1}>
          <Footer fraction={fraction} label={label} hint={hint} rows={size.rows} columns={size.columns} />
        </Box>
      </Box>
    </Theme.Provider>
  );
}
