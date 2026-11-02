import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// src/cli/ and dist/cli/ both sit two levels below the package root.
export const packageRoot = fileURLToPath(new URL('../../', import.meta.url));

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

export function skillLangs(skill: Skill): string[] {
  return skill.variants.map((variant) => variant.lang);
}

export function skillVersion(skill: Skill): string | undefined {
  return skill.variants[0]?.version;
}

// Semver 2.0.0 precedence (section 11); build metadata is ignored.
export function compareVersions(a: string, b: string): number {
  const parse = (version: string) => {
    const [core = '', pre] = version.split('+')[0]!.split(/-(.*)/s);
    return { core: core.split('.').map(Number), pre: pre ? pre.split('.') : [] };
  };
  const left = parse(a);
  const right = parse(b);

  for (let i = 0; i < 3; i++) {
    const diff = (left.core[i] ?? 0) - (right.core[i] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }

  if (left.pre.length === 0 || right.pre.length === 0) {
    return Math.sign(right.pre.length - left.pre.length);
  }

  for (let i = 0; i < Math.max(left.pre.length, right.pre.length); i++) {
    const x = left.pre[i];
    const y = right.pre[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xNumeric = /^\d+$/.test(x);
    const yNumeric = /^\d+$/.test(y);
    if (xNumeric && yNumeric) {
      const diff = Number(x) - Number(y);
      if (diff !== 0) return Math.sign(diff);
    } else if (xNumeric !== yNumeric) {
      return xNumeric ? -1 : 1;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

export function isValidVersion(version: string | undefined): version is string {
  return version !== undefined && /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.test(version);
}

// evals/ and README.md are authoring material, not part of an installed skill.
export const copyFilter = (source: string): boolean => {
  const name = basename(source);
  return name !== 'evals' && name !== 'README.md';
};

export function findSkill(name: string): Skill | undefined {
  return listSkills().find((skill) => skill.name === name);
}
