import { useMemo, useState, type ReactElement } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import type { ActionResult } from '../actions/install.js';
import { readConfig } from '../config.js';
import type { Scope } from '../fsdDir.js';
import { Footer, Header } from './Chrome.js';
import { catalogRows, conflictsFor, executeInstall, executeUninstall, languageApplies, languageOptions, registeredRows, type InstallChoices } from './flows.js';
import { Pick } from './Pick.js';
import { progressFraction, stepLabel, stepsFor, type Flow, type StepId } from './progress.js';
import { resolveTheme, symbolSets, Theme, themes, tint, useTheme } from './theme.js';

type Screen = { kind: 'menu' } | { kind: 'step'; flow: Flow; step: StepId } | { kind: 'result'; lines: string[]; failed: boolean };

const HINT_MOVE = '↑↓ move · enter confirm · esc back';
const HINT_MARK = '↑↓ move · space mark · enter confirm · esc back';

const stepTitle: Record<StepId, string> = {
  scope: 'Scope',
  skills: 'Skills',
  language: 'Language',
  update: 'Updates',
  theme: 'Theme',
  symbols: 'Symbols',
  summary: 'Summary',
};

const line = (r: ActionResult) => `${r.action}${r.note ? ` (${r.note})` : ''} ${r.name} ${r.version} [${r.lang}] ${r.destination}`;

export function App({ version, onExit }: { version: string; onExit: (code: number) => void }) {
  const { exit } = useApp();
  const config = useMemo(() => readConfig(), []);
  const [screen, setScreen] = useState<Screen>({ kind: 'menu' });
  const [menu, setMenu] = useState('install');
  const [removal, setRemoval] = useState<string[]>([]);
  const [choices, setChoices] = useState<InstallChoices>({
    scope: 'global',
    skills: [],
    lang: '',
    autoUpdate: config.autoUpdate,
    updateSkills: config.updateSkills,
    theme: config.theme,
    symbols: config.symbols,
    overwrite: [],
  });
  const set = (patch: Partial<InstallChoices>) => setChoices((current) => ({ ...current, ...patch }));
  const finish = (code: number) => {
    onExit(code);
    exit();
  };

  const rows = useMemo(() => catalogRows(choices.scope), [choices.scope]);
  const registered = useMemo(() => registeredRows(choices.scope), [choices.scope]);
  const hasLang = languageApplies(choices.skills, rows);
  const langs = languageOptions(choices.skills, rows);
  const flow = screen.kind === 'step' ? screen.flow : 'install';
  const steps = stepsFor(flow, hasLang);
  const theme = resolveTheme(choices.theme, choices.symbols);

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
    if (screen.kind === 'result') return finish(screen.failed ? 1 : 0);
    const { step } = screen;
    if (step === 'skills') {
      if (flow === 'install' && choices.skills.length === 0) return;
      if (flow === 'uninstall' && removal.length === 0) return;
      if (flow === 'install' && languageApplies(choices.skills, rows) && !langs.includes(choices.lang)) set({ lang: langs[0] ?? '' });
    }
    if (step === 'summary') {
      const outcome = flow === 'install' ? executeInstall(choices) : executeUninstall(choices.scope, removal);
      const lines = [...outcome.results.map(line), ...outcome.errors.map((e) => `error: ${e}`)];
      return setScreen({ kind: 'result', lines, failed: outcome.errors.length > 0 });
    }
    move(1);
  };

  useInput((input, key) => {
    if (key.ctrl && input === 'c') return finish(130);
    if (key.return) return confirm();
    if (key.escape && screen.kind === 'step') move(-1);
  });

  const detail = screen.kind === 'step' ? `${choices.scope === 'global' ? '~' : '.'}/.claude/skills` : undefined;

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
      return <Pick multi={false} selected={[choices.scope]} onChange={([value]) => { set({ scope: (value as Scope) ?? 'global', skills: [], overwrite: [] }); setRemoval([]); }} options={[
        { value: 'global', label: 'Global', hint: '~/.claude/skills' },
        { value: 'project', label: 'Local', hint: './.claude/skills' },
      ]} />;
    }
    if (step === 'skills' && flow === 'uninstall') {
      if (registered.length === 0) return <Text>nothing installed</Text>;
      return <Pick multi withAll selected={removal} onChange={setRemoval} options={registered.map((row) => ({ value: row.name, label: row.name, hint: `${row.version} [${row.lang}] ${row.state}` }))} />;
    }
    if (step === 'skills') {
      return <Pick multi withAll selected={choices.skills} onChange={(skills) => set({ skills })} options={rows.map((row) => ({ value: row.name, label: row.name, hint: `${row.version} [${row.langs.join(', ')}] ${row.state}` }))} />;
    }
    if (step === 'language') {
      return <Pick multi={false} selected={[choices.lang]} onChange={([value]) => set({ lang: value ?? '' })} options={langs.map((lang) => ({ value: lang, label: lang }))} />;
    }
    if (step === 'update') {
      const selected = [...(choices.autoUpdate ? ['autoUpdate'] : []), ...(choices.updateSkills ? ['updateSkills'] : [])];
      return <Pick multi selected={selected} onChange={(next) => set({ autoUpdate: next.includes('autoUpdate'), updateSkills: next.includes('updateSkills') })} options={[
        { value: 'autoUpdate', label: 'Update the CLI when `fsd init` opens' },
        { value: 'updateSkills', label: 'Make `fsd update` update the skills too' },
      ]} />;
    }
    if (step === 'theme') {
      return <Pick multi={false} selected={[choices.theme]} onChange={([value]) => set({ theme: value ?? 'dracula' })} options={Object.entries(themes).map(([id, t]) => ({ value: id, label: t.label }))} />;
    }
    if (step === 'symbols') {
      return <Pick multi={false} selected={[choices.symbols]} onChange={([value]) => set({ symbols: value ?? 'unicode' })} options={Object.entries(symbolSets).map(([id, s]) => ({ value: id, label: s.label, hint: `${s.checked} ${s.unchecked} ${s.barFull}${s.barEmpty}` }))} />;
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
        <Text>Scope: {choices.scope} · Theme: {themes[choices.theme]?.label} · Symbols: {symbolSets[choices.symbols]?.label}</Text>
        <Text>Skills: {choices.skills.join(', ')}{hasLang ? ` · Language: ${choices.lang}` : ''}</Text>
        <Text>CLI auto-update: {String(choices.autoUpdate)} · Update skills with `fsd update`: {String(choices.updateSkills)}</Text>
        {conflicts.length > 0 && (
          <>
            <Text {...tint(palette.warning, color)}>These folders exist and are not managed by fsd. Mark the ones to overwrite:</Text>
            <Pick multi selected={choices.overwrite} onChange={(overwrite) => set({ overwrite })} options={conflicts.map((name) => ({ value: name, label: name }))} />
          </>
        )}
      </>
    );
  }

  return (
    <Theme.Provider value={theme}>
      <Box flexDirection="column" paddingX={1}>
        <Header version={version} {...(detail ? { detail } : {})} />
        {body}
        <Footer fraction={fraction} label={label} hint={hint} />
      </Box>
    </Theme.Provider>
  );
}

function Title({ text }: { text: string }) {
  const { palette, color } = useTheme();
  return <Text bold {...tint(palette.title, color)}>{text}{'\n'}</Text>;
}
