import { Text } from 'ink';
import { planGitignore } from '../../core/gitignore.js';
import type { Scope } from '../../core/scope.js';
import { conflictChoiceOf, type InstallChoices } from '../../wizard/choices.js';
import { conflictWhere, unlinkedAvailable, type InstalledRow, type SkillRow } from '../../wizard/queries.js';
import type { Flow, StepId } from '../../wizard/steps.js';
import { Conflicts } from '../components/Conflicts.js';
import { Pick } from '../components/Pick.js';
import { CONFLICT_CHOICE_TEXT } from '../labels.js';
import { DEFAULT_THEME, themes, tint, useTheme } from '../theme.js';

// The body of one step of a flow (SPEC 6.2, 6.8). It shows the choices and reports changes; the App owns them.
export interface StepProps {
  step: StepId;
  flow: Flow;
  choices: InstallChoices;
  onChoices: (patch: Partial<InstallChoices>) => void;
  removal: string[];
  onRemoval: (names: string[]) => void;
  catalog: SkillRow[];
  installed: InstalledRow[];
  langs: string[];
  hasLang: boolean;
  conflicts: string[];
  maxRows: number;
}

export function Step(props: StepProps) {
  const { step, flow, choices, onChoices, removal, onRemoval, catalog, installed, langs, conflicts, maxRows } = props;
  switch (step) {
    case 'scope':
      return (
        <Pick maxRows={maxRows} multi={false} selected={[choices.scope]} onChange={([value]) => { onChoices({ scope: (value as Scope) ?? 'global', skills: catalog.map((row) => row.name), conflicts: {} }); onRemoval([]); }} options={[
          { value: 'global', label: 'Global', hint: '~/.fsd/skills' },
          { value: 'project', label: 'Local', hint: './.fsd/skills' },
        ]} />
      );
    case 'skills':
      if (flow === 'uninstall') {
        if (installed.length === 0) return <Text>nothing installed</Text>;
        return <Pick maxRows={maxRows} multi withAll selected={removal} onChange={onRemoval} options={installed.map((row) => ({ value: row.name, label: row.name, hint: `${row.version} [${row.lang}] ${row.state}` }))} />;
      }
      return <Pick maxRows={maxRows} multi withAll selected={choices.skills} onChange={(skills) => onChoices({ skills })} options={catalog.map((row) => ({ value: row.name, label: row.name, hint: `${row.version} [${row.langs.join(', ')}] ${row.state}` }))} />;
    case 'language':
      return <Pick maxRows={maxRows} multi={false} selected={[choices.lang]} onChange={([value]) => onChoices({ lang: value ?? '' })} options={langs.map((lang) => ({ value: lang, label: lang }))} />;
    case 'conflicts':
      return (
        <Conflicts
          rows={conflicts.map((name) => ({ name, paths: conflictWhere(choices, name), canUnlinked: unlinkedAvailable(choices, name) }))}
          choices={choices.conflicts}
          onChange={(name, choice) => onChoices({ conflicts: { ...choices.conflicts, [name]: choice } })}
        />
      );
    case 'update': {
      const selected = [...(choices.autoUpdate ? ['autoUpdate'] : []), ...(choices.updateSkills ? ['updateSkills'] : [])];
      return (
        <Pick maxRows={maxRows} multi selected={selected} onChange={(next) => onChoices({ autoUpdate: next.includes('autoUpdate'), updateSkills: next.includes('updateSkills') })} options={[
          { value: 'autoUpdate', label: 'Update the CLI when `fsd init` opens' },
          { value: 'updateSkills', label: 'Make `fsd update` update the skills too' },
        ]} />
      );
    }
    case 'theme':
      return <Pick maxRows={maxRows} multi={false} selected={[choices.theme]} onChange={([value]) => onChoices({ theme: value ?? DEFAULT_THEME })} options={Object.entries(themes).map(([id, t]) => ({ value: id, label: t.label }))} />;
    case 'summary':
      return <Summary {...props} />;
  }
}

function Summary({ flow, choices, removal, hasLang, conflicts }: StepProps) {
  const { palette, color } = useTheme();
  if (flow === 'uninstall') {
    return (
      <>
        <Text>Remove from {choices.scope === 'global' ? 'global' : 'local'} scope:</Text>
        {removal.map((name) => <Text key={name}>  {name}</Text>)}
      </>
    );
  }
  return (
    <>
      <Text>Scope: {choices.scope} · Theme: {themes[choices.theme]?.label}</Text>
      <Text>Skills: {choices.skills.join(', ')}{hasLang ? ` · Language: ${choices.lang}` : ''}</Text>
      <Text>CLI auto-update: {String(choices.autoUpdate)} · Update skills with `fsd update`: {String(choices.updateSkills)}</Text>
      {gitignoreNote(choices.scope) ? <Text>{gitignoreNote(choices.scope)}</Text> : null}
      {conflicts.map((name) => <Text key={name} {...tint(palette.warning, color)}>Conflict {name}: {CONFLICT_CHOICE_TEXT[conflictChoiceOf(choices, name)]}</Text>)}
    </>
  );
}

// The summary line for the project `.gitignore`: only when Install will change it (SPEC 4.2).
function gitignoreNote(scope: Scope): string | null {
  if (scope !== 'project') return null;
  try {
    const change = planGitignore(process.cwd());
    if (!change) return null;
    return change.expected === null ? `.gitignore: creates it with ${change.lines.join(', ')}` : `.gitignore: adds ${change.lines.join(', ')}`;
  } catch {
    return null;
  }
}
