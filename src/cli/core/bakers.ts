import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { nookPaths } from './nook.js';
import { readRegistry, skillState, type Entry } from './registry.js';
import type { Env } from './scope.js';
import { isSlug } from './slug.js';
import { InvalidTaskFileError, parseFrontmatterMap } from './taskFiles.js';

// The Bakers of `<cwd>/nook/bakers/<name>.md` (flavor Bakers): read and validate. Read-only, never throws for what is
// inside the folder, no printing; `bakerMessage` makes the text.

export interface Baker {
  file: string;
  name: string;
  responsibilities: string[];
  craft: string;
  skills: string[];
}

export type BakerReason =
  | { kind: 'bad-file-name' }
  | { kind: 'bad-yaml'; parser: string }
  | { kind: 'missing-field'; field: string }
  | { kind: 'wrong-type'; field: string }
  | { kind: 'name-differs'; name: string };

export interface InvalidBaker {
  file: string;
  reason: BakerReason;
}

/** A skill a valid Baker lists that is not installed (absent from `installed.json`, or its folder is gone). */
export interface SkillNote {
  baker: string;
  skill: string;
}

export interface BakerReport {
  bakers: Baker[];
  invalid: InvalidBaker[];
  notes: SkillNote[];
}

const nonEmptyText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';
const textList = (value: unknown): value is string[] => Array.isArray(value) && value.every(nonEmptyText);

// The regular files named `*.md` (a link to a regular file is read through it; a link to a folder or a broken link is
// ignored), sorted by name. Empty when the folder is missing or cannot be listed.
function bakerFiles(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.name.endsWith('.md'))
      .filter((entry) => {
        if (entry.isFile()) return true;
        if (!entry.isSymbolicLink()) return false;
        try {
          return statSync(join(dir, entry.name)).isFile();
        } catch {
          return false;
        }
      })
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

// The Baker in `file`, or why it is invalid. The first failure wins.
function readBaker(dir: string, file: string): Baker | BakerReason {
  const base = file.slice(0, -'.md'.length);
  if (!isSlug(base)) return { kind: 'bad-file-name' };
  let data: Record<string, unknown>;
  try {
    data = parseFrontmatterMap(readFileSync(join(dir, file), 'utf8'));
  } catch (error) {
    return { kind: 'bad-yaml', parser: error instanceof InvalidTaskFileError ? error.reason : 'cannot be read' };
  }
  for (const field of ['name', 'responsibilities', 'craft'] as const) {
    const value = data[field];
    if (value === undefined || value === null) return { kind: 'missing-field', field };
    const ok = field === 'responsibilities' ? textList(value) && value.length > 0 : nonEmptyText(value);
    if (!ok) return { kind: 'wrong-type', field };
  }
  const skills = data.skills ?? [];
  if (!textList(skills)) return { kind: 'wrong-type', field: 'skills' };
  const name = data.name as string;
  if (name !== base) return { kind: 'name-differs', name };
  return { file, name, responsibilities: data.responsibilities as string[], craft: data.craft as string, skills };
}

/** Reads `nook/bakers/`: the valid Bakers, the invalid ones with the reason, and the skills that are not installed. */
export function readBakers(env: Env): BakerReport {
  const dir = nookPaths(env).bakers;
  const report: BakerReport = { bakers: [], invalid: [], notes: [] };
  const project = readRegistry('project', env).skills;
  const global = readRegistry('global', env).skills;
  for (const file of bakerFiles(dir)) {
    const result = readBaker(dir, file);
    if ('kind' in result) {
      report.invalid.push({ file, reason: result });
      continue;
    }
    report.bakers.push(result);
    for (const skill of result.skills) {
      const entry: Entry | undefined = project[skill] ?? global[skill];
      const state = skillState(entry, entry?.version ?? '0.0.0');
      if (state === 'not installed' || state === 'missing') report.notes.push({ baker: result.name, skill });
    }
  }
  return report;
}

export type BakerLang = 'en' | 'pt-BR';

const REASON: Record<BakerLang, (reason: BakerReason) => string> = {
  en: (r) => {
    switch (r.kind) {
      case 'name-differs':
        return `name "${r.name}" differs from the file name`;
      case 'missing-field':
        return `missing field ${r.field}`;
      case 'wrong-type':
        return `field ${r.field} has the wrong type`;
      case 'bad-file-name':
        return 'invalid file name';
      case 'bad-yaml':
        return `invalid YAML: ${r.parser}`;
    }
  },
  'pt-BR': (r) => {
    switch (r.kind) {
      case 'name-differs':
        return `name "${r.name}" difere do nome do arquivo`;
      case 'missing-field':
        return `falta o campo ${r.field}`;
      case 'wrong-type':
        return `o campo ${r.field} tem o tipo errado`;
      case 'bad-file-name':
        return 'nome de arquivo inválido';
      case 'bad-yaml':
        return `YAML inválido: ${r.parser}`;
    }
  },
};

/** The text of an invalid Baker or of a skill note, in `lang`. */
export function bakerMessage(item: InvalidBaker | SkillNote, lang: BakerLang): string {
  if ('reason' in item) return lang === 'en' ? `Baker ${item.file} is invalid: ${REASON.en(item.reason)}` : `Baker ${item.file} é inválido: ${REASON['pt-BR'](item.reason)}`;
  return lang === 'en'
    ? `Baker ${item.baker}: skill ${item.skill} is not installed (run fsd init, Install flow)`
    : `Baker ${item.baker}: a skill ${item.skill} não está instalada (rode fsd init, fluxo Instalar)`;
}
