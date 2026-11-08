import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { packageRoot } from './package.js';

// The skills shipped in the package: src/skills/_i18n/<name>/<lang>/SKILL.md.

export const skillsSource = join(packageRoot, 'src', 'skills', '_i18n');

export interface SkillVariant {
  lang: string;
  dir: string;
  name: string | undefined;
  version: string | undefined;
}

export interface Skill {
  name: string;
  variants: SkillVariant[];
}

export function readFrontmatter(skillMd: string): { name: string | undefined; version: string | undefined } {
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(skillMd)?.[1] ?? '';
  const name = /^name:\s*(\S+)\s*$/m.exec(block)?.[1];
  const metadata = /^metadata:\s*\r?\n((?:[ \t]+.*(?:\r?\n|$))*)/m.exec(block)?.[1] ?? '';
  const version = /^[ \t]+version:\s*["']?([^"'\s]+)["']?\s*$/m.exec(metadata)?.[1];
  return { name, version };
}

function readVariant(dir: string, lang: string): SkillVariant | undefined {
  const file = join(dir, 'SKILL.md');
  if (!existsSync(file)) return undefined;
  return { lang, dir, ...readFrontmatter(readFileSync(file, 'utf8')) };
}

export function listSkills(): Skill[] {
  if (!existsSync(skillsSource)) return [];

  return readdirSync(skillsSource, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const root = join(skillsSource, entry.name);
      const variants = readdirSync(root, { withFileTypes: true })
        .filter((child) => child.isDirectory())
        .map((child) => readVariant(join(root, child.name), child.name))
        .filter((variant): variant is SkillVariant => variant !== undefined)
        .sort((a, b) => a.lang.localeCompare(b.lang));
      return { name: entry.name, variants };
    })
    .filter((skill) => skill.variants.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function findSkill(name: string): Skill | undefined {
  return listSkills().find((skill) => skill.name === name);
}

/** The catalog version of a skill: the one of its first variant. */
export const skillVersion = (skill: Skill): string | undefined => skill.variants[0]?.version;

export const skillLangs = (skill: Skill): string[] => skill.variants.map((variant) => variant.lang);

// evals/ and README.md are authoring material, not part of an installed skill.
export const copyFilter = (source: string): boolean => {
  const name = basename(source);
  return name !== 'evals' && name !== 'README.md';
};
