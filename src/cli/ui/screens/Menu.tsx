import { Pick } from '../components/Pick.js';
import { Title } from '../components/Title.js';

export type MenuChoice = 'install' | 'uninstall' | 'exit';

const OPTIONS = [
  { value: 'install', label: 'Install', hint: 'install and update skills' },
  { value: 'uninstall', label: 'Uninstall' },
  { value: 'exit', label: 'Exit' },
];

export function Menu({ selected, onChange }: { selected: MenuChoice; onChange: (choice: MenuChoice) => void }) {
  return (
    <>
      <Title text="What do you want to do?" />
      <Pick multi={false} selected={[selected]} onChange={([value]) => onChange((value as MenuChoice | undefined) ?? 'install')} options={OPTIONS} />
    </>
  );
}
