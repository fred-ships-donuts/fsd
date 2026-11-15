import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { markdownFiles, readBakers, skillNotInstalled, type BakerLang, type BakerReport } from './bakers.js';
import { nookPaths } from './nook.js';
import { readRegistry } from './registry.js';
import type { Env } from './scope.js';
import { isSlug } from './slug.js';
import { InvalidTaskFileError, parseFrontmatterMap } from './taskFiles.js';

// The Recipes of `<cwd>/nook/cookbook/<name>.md` (flavor Cookbook): read and validate. Read-only, never throws for what
// is inside the folder, no printing; `recipeMessage` makes the text. The Bakers come from the Baker reader.

export interface RecipeStep {
  title: string;
  baker: string;
  skills: string[];
  instruction?: string;
}

export interface Recipe {
  file: string;
  name: string;
  description: string;
  steps: RecipeStep[];
}

export type RecipeReason =
  | { kind: 'bad-file-name' }
  | { kind: 'bad-yaml'; parser: string }
  | { kind: 'missing-field'; field: string }
  | { kind: 'wrong-type'; field: string }
  | { kind: 'name-differs'; name: string }
  | { kind: 'baker-missing'; step: number; baker: string };

export interface InvalidRecipe {
  file: string;
  reason: RecipeReason;
}

/** A skill used by a step of a valid Recipe that is not installed; one per distinct skill. */
export interface RecipeSkillNote {
  recipe: string;
  skill: string;
}

export interface RecipeReport {
  recipes: Recipe[];
  invalid: InvalidRecipe[];
  notes: RecipeSkillNote[];
}

const nonEmptyText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';
const textList = (value: unknown): value is string[] => Array.isArray(value) && value.every(nonEmptyText);
const isMap = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

// The steps of the Recipe, or the reason one is wrong. `<n>` in the field text is 1-based, like `step <n>`.
function readSteps(value: unknown): RecipeStep[] | RecipeReason {
  if (value === undefined || value === null) return { kind: 'missing-field', field: 'steps' };
  if (!Array.isArray(value) || value.length === 0) return { kind: 'wrong-type', field: 'steps' };
  const steps: RecipeStep[] = [];
  for (const [index, raw] of value.entries()) {
    const at = `steps[${index + 1}]`;
    if (!isMap(raw)) return { kind: 'wrong-type', field: at };
    for (const key of ['title', 'baker'] as const) {
      if (raw[key] === undefined || raw[key] === null) return { kind: 'missing-field', field: `${at}.${key}` };
      if (!nonEmptyText(raw[key])) return { kind: 'wrong-type', field: `${at}.${key}` };
    }
    const skills = raw.skills ?? [];
    if (!textList(skills)) return { kind: 'wrong-type', field: `${at}.skills` };
    const instruction = raw.instruction ?? undefined;
    if (instruction !== undefined && typeof instruction !== 'string') return { kind: 'wrong-type', field: `${at}.instruction` };
    steps.push({ title: raw.title as string, baker: raw.baker as string, skills, ...(instruction === undefined ? {} : { instruction }) });
  }
  return steps;
}

// The Recipe in `file`, or why it is invalid. The first failure wins.
function readRecipe(dir: string, file: string, bakers: BakerReport): Recipe | RecipeReason {
  const base = file.slice(0, -'.md'.length);
  if (!isSlug(base)) return { kind: 'bad-file-name' };
  let data: Record<string, unknown>;
  try {
    data = parseFrontmatterMap(readFileSync(join(dir, file), 'utf8'));
  } catch (error) {
    return { kind: 'bad-yaml', parser: error instanceof InvalidTaskFileError ? error.reason : 'cannot be read' };
  }
  for (const field of ['name', 'description'] as const) {
    if (data[field] === undefined || data[field] === null) return { kind: 'missing-field', field };
    if (!nonEmptyText(data[field])) return { kind: 'wrong-type', field };
  }
  const steps = readSteps(data.steps);
  if (!Array.isArray(steps)) return steps;
  const name = data.name as string;
  if (name !== base) return { kind: 'name-differs', name };
  const known = new Set(bakers.bakers.map((baker) => baker.name));
  for (const [index, step] of steps.entries()) if (!known.has(step.baker)) return { kind: 'baker-missing', step: index + 1, baker: step.baker };
  return { file, name, description: data.description as string, steps };
}

/** Reads `nook/cookbook/`: the valid Recipes, the invalid ones with the reason, and the skills that are not installed. */
export function readRecipes(env: Env, bakers: BakerReport = readBakers(env)): RecipeReport {
  const dir = nookPaths(env).cookbook;
  const report: RecipeReport = { recipes: [], invalid: [], notes: [] };
  const project = readRegistry('project', env).skills;
  const global = readRegistry('global', env).skills;
  for (const file of markdownFiles(dir)) {
    const result = readRecipe(dir, file, bakers);
    if ('kind' in result) {
      report.invalid.push({ file, reason: result });
      continue;
    }
    report.recipes.push(result);
    const seen = new Set<string>();
    for (const skill of result.steps.flatMap((step) => step.skills)) {
      if (seen.has(skill)) continue;
      seen.add(skill);
      if (skillNotInstalled(skill, project, global)) report.notes.push({ recipe: result.name, skill });
    }
  }
  return report;
}

const REASON: Record<BakerLang, (reason: RecipeReason) => string> = {
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
      case 'baker-missing':
        return `step ${r.step}: Baker ${r.baker} not found or invalid`;
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
      case 'baker-missing':
        return `passo ${r.step}: Baker ${r.baker} ausente ou inválido`;
    }
  },
};

/** The text of an invalid Recipe or of a skill note, in `lang`. */
export function recipeMessage(item: InvalidRecipe | RecipeSkillNote, lang: BakerLang): string {
  if ('reason' in item) {
    return lang === 'en'
      ? `Recipe ${item.file} is invalid: ${REASON.en(item.reason)}`
      : `Recipe ${item.file} é inválida: ${REASON['pt-BR'](item.reason)}`;
  }
  return lang === 'en'
    ? `Recipe ${item.recipe}: skill ${item.skill} is not installed (run fsd init, Install flow)`
    : `Recipe ${item.recipe}: a skill ${item.skill} não está instalada (rode fsd init, fluxo Instalar)`;
}
