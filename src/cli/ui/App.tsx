import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import type { ActionResult, ConflictChoice } from '../actions/types.js';
import { readConfig } from '../config.js';
import type { Scope } from '../fsdDir.js';
import { Footer, Header, listRows } from './Chrome.js';
import { Conflicts, type ConflictRow } from './Conflicts.js';
import { catalogRows, conflictsFor, conflictWhere, executeInstall, executeUninstall, languageApplies, languageOptions, registeredRows, unlinkedAvailable, type InstallChoices } from './flows.js';
import { phases, type Phase, type RunOutcome } from '../run.js';
import { Pick } from './Pick.js';
import { progressFraction, stepLabel, stepsFor, type Flow, type StepId } from './progress.js';
import { listSkills } from '../skills.js';
import { DEFAULT_THEME, resolveTheme, Theme, themes, tint, useTheme } from './theme.js';

type Screen = { kind: 'menu' } | { kind: 'step'; flow: Flow; step: StepId } | { kind: 'running' } | { kind: 'result'; lines: string[]; code: number };

type PhaseState = 'pending' | 'running' | 'done' | 'failed';

const HINT_MOVE = '↑↓ move · enter confirm · ← back';
const HINT_MARK = '↑↓ move · space mark · enter confirm · ← back';

const stepTitle: Record<StepId, string> = {
  scope: 'Scope',
  skills: 'Skills',
  language: 'Language',
  update: 'Updates',
  conflicts: 'Conflicts',
  theme: 'Theme',
  summary: 'Summary',
};

const CHOICE_TEXT: Record<ConflictChoice, string> = { keep: 'keep the original, skip ours', unlinked: 'install ours, keep the original (not linked)', replace: 'replace the original with ours' };

const phaseLabel: Record<Phase, string> = { verify: 'Verify', prepare: 'Prepare', apply: 'Apply', register: 'Register', conclude: 'Conclude' };

const line = (r: ActionResult) => `${r.action}${r.note ? ` (${r.note})` : ''} ${r.name} ${r.version} [${r.lang}] ${r.destination}`;

export function App({ version, onExit, lastUpdateCheck, terminal }: { version: string; onExit: (code: number) => void; lastUpdateCheck?: string; terminal?: { columns: number; rows: number } }) {
  const { exit } = useApp();
  const size = useTerminalSize(terminal);
  const config = useMemo(() => readConfig(), []);
  const allSkills = useMemo(() => listSkills().map((skill) => skill.name), []);
  const [screen, setScreen] = useState<Screen>({ kind: 'menu' });
  const [menu, setMenu] = useState('install');
  const [removal, setRemoval] = useState<string[]>([]);
  const [choices, setChoices] = useState<InstallChoices>({
    scope: 'global',
    skills: allSkills,
    lang: '',
    autoUpdate: config.autoUpdate,
    updateSkills: config.updateSkills,
    theme: config.theme,
    conflicts: {},
  });
  const [phaseStates, setPhaseStates] = useState<Record<Phase, PhaseState>>({ verify: 'pending', prepare: 'pending', apply: 'pending', register: 'pending', conclude: 'pending' });
  const [currentItem, setCurrentItem] = useState('');
  const control = useRef({ cancelled: false });
  const set = (patch: Partial<InstallChoices>) => setChoices((current) => ({ ...current, ...patch }));
  const finish = (code: number) => {
    onExit(code);
    exit();
  };

  const rows = useMemo(() => catalogRows(choices.scope), [choices.scope]);
  const registered = useMemo(() => registeredRows(choices.scope), [choices.scope]);
  const hasLang = languageApplies(choices.skills, rows);
  const conflictNames = useMemo(() => (screen.kind === 'menu' ? [] : conflictsFor(choices)), [choices.scope, choices.skills, screen.kind]);
  const hasConflicts = conflictNames.length > 0;
  const langs = languageOptions(choices.skills, rows);
  const flow = screen.kind === 'step' ? screen.flow : 'install';
  const steps = stepsFor(flow, hasLang, flow === 'install' && hasConflicts);
  const theme = resolveTheme(choices.theme);

  const go = (step: StepId, f: Flow = flow) => setScreen({ kind: 'step', flow: f, step });
  const move = (delta: 1 | -1) => {
    if (screen.kind !== 'step') return;
    const index = steps.indexOf(screen.step) + delta;
    if (index < 0) return setScreen({ kind: 'menu' });
    const next = steps[index];
    if (next) go(next);
  };

  const confirm = () => {
    if (screen.kind === 'menu') {
      if (menu === 'exit') return finish(0);
      return go('scope', menu === 'install' ? 'install' : 'uninstall');
    }
    if (screen.kind === 'result') return finish(screen.code);
    if (screen.kind !== 'step') return;
    const { step } = screen;
    if (step === 'skills') {
      if (flow === 'install' && choices.skills.length === 0) return;
      if (flow === 'uninstall' && removal.length === 0) return;
      if (flow === 'install' && languageApplies(choices.skills, rows) && !langs.includes(choices.lang)) set({ lang: langs[0] ?? '' });
    }
    if (step === 'summary') return void run();
    move(1);
  };

  // After the summary is confirmed the run does its own undo; ctrl+c asks it to stop between operations.
  async function run() {
    control.current.cancelled = false;
    setPhaseStates({ verify: 'pending', prepare: 'pending', apply: 'pending', register: 'pending', conclude: 'pending' });
    setScreen({ kind: 'running' });
    const options = {
      control: control.current,
      onEvent: (event: { phase: Phase; state: PhaseState; item?: string }) => {
        setPhaseStates((current) => ({ ...current, [event.phase]: event.state }));
        if (event.item) setCurrentItem(event.item);
      },
    };
    const outcome: RunOutcome = await (flow === 'install' ? executeInstall(choices, undefined, options, lastUpdateCheck) : executeUninstall(choices.scope, removal, undefined, options));
    if (outcome.status === 'done') {
      setScreen({ kind: 'result', lines: [...outcome.results.map(line), ...outcome.warnings], code: 0 });
    } else {
      setScreen({ kind: 'result', lines: [outcome.message, ...outcome.warnings], code: outcome.status === 'cancelled' ? 130 : 1 });
    }
  }

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      if (screen.kind === 'running') control.current.cancelled = true;
      else finish(130);
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
    body = (
      <>
        <Title text="What do you want to do?" />
        <Pick multi={false} selected={[menu]} onChange={([value]) => setMenu(value ?? 'install')} options={[
          { value: 'install', label: 'Install', hint: 'install and update skills' },
          { value: 'uninstall', label: 'Uninstall' },
          { value: 'exit', label: 'Exit' },
        ]} />
      </>
    );
  } else if (screen.kind === 'running') {
    const mark: Record<PhaseState, string> = { pending: ' ', running: '…', done: '✔', failed: '✖' };
    body = (
      <>
        <Title text="Working" />
        {phases.map((phase) => (
          <Text key={phase}>{mark[phaseStates[phase]]} {phaseLabel[phase]}{phase === 'apply' && phaseStates.apply === 'running' && currentItem ? `  ${currentItem}` : ''}</Text>
        ))}
      </>
    );
    hint = 'ctrl+c cancel (everything done so far is undone)';
    fraction = 1;
    label = 'running';
  } else if (screen.kind === 'result') {
    body = (
      <>
        <Title text="Result" />
        {screen.lines.length === 0 ? <Text>nothing to do</Text> : screen.lines.map((text) => <Text key={text}>{text}</Text>)}
      </>
    );
    hint = 'enter exit';
    fraction = 1;
    label = 'done';
  } else {
    const { step } = screen;
    fraction = progressFraction(steps, step);
    label = stepLabel(steps, step);
    if (step === 'skills' || step === 'update' || step === 'summary') hint = HINT_MARK;
    body = (
      <>
        <Title text={stepTitle[step]} />
        <Box key={step} flexDirection="column">{renderStep()}</Box>
      </>
    );
  }

  function renderStep(): ReactElement | null {
    if (screen.kind !== 'step') return null;
    const { step } = screen;
    if (step === 'scope') {
      return <Pick maxRows={listRows(size.rows, size.columns)} multi={false} selected={[choices.scope]} onChange={([value]) => { set({ scope: (value as Scope) ?? 'global', skills: allSkills, conflicts: {} }); setRemoval([]); }} options={[
        { value: 'global', label: 'Global', hint: '~/.fsd/skills' },
        { value: 'project', label: 'Local', hint: './.fsd/skills' },
      ]} />;
    }
    if (step === 'skills' && flow === 'uninstall') {
      if (registered.length === 0) return <Text>nothing installed</Text>;
      return <Pick maxRows={listRows(size.rows, size.columns)} multi withAll selected={removal} onChange={setRemoval} options={registered.map((row) => ({ value: row.name, label: row.name, hint: `${row.version} [${row.lang}] ${row.state}` }))} />;
    }
    if (step === 'skills') {
      return <Pick maxRows={listRows(size.rows, size.columns)} multi withAll selected={choices.skills} onChange={(skills) => set({ skills })} options={rows.map((row) => ({ value: row.name, label: row.name, hint: `${row.version} [${row.langs.join(', ')}] ${row.state}` }))} />;
    }
    if (step === 'language') {
      return <Pick maxRows={listRows(size.rows, size.columns)} multi={false} selected={[choices.lang]} onChange={([value]) => set({ lang: value ?? '' })} options={langs.map((lang) => ({ value: lang, label: lang }))} />;
    }
    if (step === 'conflicts') {
      const rowsData: ConflictRow[] = conflictNames.map((name) => ({ name, paths: conflictWhere(choices, name), canUnlinked: unlinkedAvailable(choices, name) }));
      return <Conflicts rows={rowsData} choices={choices.conflicts} onChange={(name, choice) => set({ conflicts: { ...choices.conflicts, [name]: choice } })} />;
    }
    if (step === 'update') {
      const selected = [...(choices.autoUpdate ? ['autoUpdate'] : []), ...(choices.updateSkills ? ['updateSkills'] : [])];
      return <Pick maxRows={listRows(size.rows, size.columns)} multi selected={selected} onChange={(next) => set({ autoUpdate: next.includes('autoUpdate'), updateSkills: next.includes('updateSkills') })} options={[
        { value: 'autoUpdate', label: 'Update the CLI when `fsd init` opens' },
        { value: 'updateSkills', label: 'Make `fsd update` update the skills too' },
      ]} />;
    }
    if (step === 'theme') {
      return <Pick maxRows={listRows(size.rows, size.columns)} multi={false} selected={[choices.theme]} onChange={([value]) => set({ theme: value ?? DEFAULT_THEME })} options={Object.entries(themes).map(([id, t]) => ({ value: id, label: t.label }))} />;
    }
    return renderSummary();
  }

  function renderSummary(): ReactElement {
    const { palette, color } = theme;
    if (flow === 'uninstall') {
      return <><Text>Remove from {choices.scope === 'global' ? 'global' : 'local'} scope:</Text>{removal.map((name) => <Text key={name}>  {name}</Text>)}</>;
    }
    const conflicts = conflictsFor(choices);
    return (
      <>
        <Text>Scope: {choices.scope} · Theme: {themes[choices.theme]?.label}</Text>
        <Text>Skills: {choices.skills.join(', ')}{hasLang ? ` · Language: ${choices.lang}` : ''}</Text>
        <Text>CLI auto-update: {String(choices.autoUpdate)} · Update skills with `fsd update`: {String(choices.updateSkills)}</Text>
        {conflicts.length > 0 && conflicts.map((name) => <Text key={name} {...tint(palette.warning, color)}>Conflict {name}: {CHOICE_TEXT[choices.conflicts[name] ?? 'keep']}</Text>)}
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

// Current terminal size, updated on resize, so the wizard always fills the whole terminal.
function useTerminalSize(given?: { columns: number; rows: number }): { columns: number; rows: number } {
  // Ink types its stdout as a WritableStream; at runtime it is the terminal (or a test double) with columns and rows.
  const { stdout } = useStdout() as unknown as { stdout: NodeJS.WriteStream };
  const read = () => ({ columns: stdout.columns || 80, rows: stdout.rows || 24 });
  const [size, setSize] = useState(read);
  useEffect(() => {
    if (given) return; // the caller keeps the size up to date (see run.ts)
    const onResize = () => setSize(read);
    stdout.on('resize', onResize);
    return () => {
      stdout.off('resize', onResize);
    };
  }, [stdout, given]);
  return given ?? size;
}

function Title({ text }: { text: string }) {
  const { palette, color } = useTheme();
  return <Text bold {...tint(palette.title, color)}>{text}{'\n'}</Text>;
}
