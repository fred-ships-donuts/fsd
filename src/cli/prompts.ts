import { cancel, confirm, isCancel, multiselect, select } from '@clack/prompts';
import { skillLangs, skillVersion, type Skill } from './skills.js';

export const interactive = () => Boolean(process.stdin.isTTY && process.stdout.isTTY);

function answer<T>(value: T): Exclude<T, symbol> {
  if (isCancel(value)) {
    cancel('cancelled');
    process.exit(130);
  }
  return value as Exclude<T, symbol>;
}

export async function askSkills(skills: Skill[]): Promise<string[]> {
  return answer(
    await multiselect({
      message: 'Which skills do you want to install?',
      options: skills.map((skill) => ({
        value: skill.name,
        label: skill.name,
        hint: `${skillVersion(skill) ?? '?'} (${skillLangs(skill).join(', ')})`,
      })),
      required: true,
    }),
  );
}

export async function askScope(): Promise<boolean> {
  return answer(
    await select({
      message: 'Where do you want to install?',
      options: [
        { value: false, label: 'Global', hint: '~/.claude/skills' },
        { value: true, label: 'This project', hint: './.claude/skills' },
      ],
    }),
  );
}

export async function askLang(langs: string[]): Promise<string> {
  return answer(
    await select({
      message: 'Which language?',
      options: langs.map((lang) => ({ value: lang, label: lang })),
    }),
  );
}

export async function askConfirm(message: string): Promise<boolean> {
  return answer(await confirm({ message }));
}
