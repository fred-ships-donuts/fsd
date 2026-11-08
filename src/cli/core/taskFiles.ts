import { Document, isMap, isScalar, parseDocument, Scalar, type ToStringOptions } from 'yaml';

// The formats of a task's files (SPEC 4.5): `plan.md` (YAML frontmatter + free Markdown body) and the steps
// `NN-<slug>.yaml`. Pure: text in, model or text out. The only module that imports `yaml`.

export const TASK_STATUSES = ['in_progress', 'done', 'archived'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const STEP_STATUSES = ['pending', 'in_progress', 'done', 'skipped'] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

export const PLAN_FILE = 'plan.md';

/** A file that cannot be read as a task file; `reason` says why. */
export class InvalidTaskFileError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = 'InvalidTaskFileError';
  }
}

// YAML 1.2 core (the default): unquoted dates stay text and `no` is not a boolean. Long lines are not folded.
const TO_STRING: ToStringOptions = { lineWidth: 0 };

const eolOf = (text: string): '\r\n' | '\n' => (text.includes('\r\n') ? '\r\n' : '\n');
const withEol = (text: string, eol: string): string => (eol === '\n' ? text : text.replace(/\r?\n/g, eol));

// ---------------------------------------------------------------------------------------------------------------
// Frontmatter

// The block between two `---` lines at the very start of the file (BOM and CRLF accepted).
const FRONTMATTER = /^(﻿?---\r?\n)([\s\S]*?)(\r?\n---[ \t]*(?:\r?\n|$))/;
// Two `---` lines with nothing between them: a frontmatter, but not a map.
const EMPTY_FRONTMATTER = /^﻿?---\r?\n---[ \t]*(?:\r?\n|$)/;
const BOM = '﻿';

interface Frontmatter {
  head: string;
  yaml: string;
  close: string;
  body: string;
}

function splitFrontmatter(text: string): Frontmatter {
  const match = FRONTMATTER.exec(text);
  if (!match && EMPTY_FRONTMATTER.test(text)) throw new InvalidTaskFileError('frontmatter is not a map');
  if (!match) throw new InvalidTaskFileError('no frontmatter between --- lines');
  const [whole, head = '', yaml = '', close = ''] = match;
  return { head, yaml, close, body: text.slice(whole.length) };
}

// ---------------------------------------------------------------------------------------------------------------
// YAML maps

function parseMap(text: string, what: string): Document.Parsed {
  const doc = parseDocument(text);
  const error = doc.errors[0];
  if (error) throw new InvalidTaskFileError(`${what} is not valid YAML (${error.message.split('\n')[0]?.replace(/:$/, '')})`);
  if (!isMap(doc.contents)) throw new InvalidTaskFileError(`${what} is not a map`);
  return doc;
}

// `loose`: a scalar number or boolean written by hand (`title: 2026`) is read as text; the file is not rewritten.
function readText(doc: Document, key: string, required: boolean, loose = false): string | undefined {
  const node = doc.get(key, true);
  if (node === undefined || (isScalar(node) && node.value === null)) {
    if (required) throw new InvalidTaskFileError(`${key} is missing`);
    return undefined;
  }
  if (loose && isScalar(node) && (typeof node.value === 'number' || typeof node.value === 'boolean')) return String(node.value);
  if (!isScalar(node) || typeof node.value !== 'string') throw new InvalidTaskFileError(`${key} is not text`);
  if (required && node.value.trim() === '') throw new InvalidTaskFileError(`${key} is empty`);
  return node.value;
}

function readStatus<S extends string>(doc: Document, allowed: readonly S[]): S {
  const value = readText(doc, 'status', true) as string;
  if (!(allowed as readonly string[]).includes(value)) throw new InvalidTaskFileError(`status ${value} is unknown (expected ${allowed.join(', ')})`);
  return value as S;
}

// Changes a value in place when it is a scalar, so a comment on the same line (`status: pending # note`) stays.
function setText(doc: Document, key: string, value: string): void {
  const node = doc.get(key, true);
  if (isScalar(node)) node.value = value;
  else doc.set(key, value);
}

// ---------------------------------------------------------------------------------------------------------------
// plan.md

export interface PlanFields {
  title: string;
  status: TaskStatus;
}

export function parsePlan(text: string): PlanFields {
  const doc = parseMap(splitFrontmatter(text).yaml, 'frontmatter');
  return { title: readText(doc, 'title', true, true) as string, status: readStatus(doc, TASK_STATUSES) };
}

/** `plan.md` with a new status and `updatedAt`; the body keeps its exact bytes. The same text when nothing changes. */
export function setPlanStatus(text: string, status: TaskStatus, now: Date): string {
  const parts = splitFrontmatter(text);
  const doc = parseMap(parts.yaml, 'frontmatter');
  if (readStatus(doc, TASK_STATUSES) === status) return text;
  setText(doc, 'status', status);
  setText(doc, 'updatedAt', now.toISOString());
  const yaml = doc.toString(TO_STRING).replace(/\n$/, '');
  return parts.head + withEol(yaml, eolOf(parts.head)) + parts.close + parts.body;
}

/** A new `plan.md`: frontmatter and the title as the heading. */
export function newPlan(title: string, now: Date): string {
  const stamp = now.toISOString();
  const doc = new Document({ title, status: 'in_progress' satisfies TaskStatus, createdAt: stamp, updatedAt: stamp });
  return `---\n${doc.toString(TO_STRING)}---\n\n# ${title}\n`;
}

// ---------------------------------------------------------------------------------------------------------------
// Steps

export interface StepFields {
  title: string;
  status: StepStatus;
  description?: string;
}

// Only these names are steps; anything else in the folder (notes, temporaries, `1-x.yaml`) is ignored.
const STEP_FILE = /^(\d{2,})-[a-z0-9-]+\.yaml$/;

/** The step number of a file name, or undefined when the file is not a step. */
export function stepNumber(fileName: string): number | undefined {
  const digits = STEP_FILE.exec(fileName)?.[1];
  return digits === undefined ? undefined : Number(digits);
}

export const stepLabel = (n: number): string => String(n).padStart(2, '0');

export const stepFileName = (n: number, slug: string): string => `${stepLabel(n)}-${slug}.yaml`;

export function parseStep(text: string): StepFields {
  const doc = parseMap(text, 'step');
  const description = readText(doc, 'description', false);
  return { title: readText(doc, 'title', true, true) as string, status: readStatus(doc, STEP_STATUSES), ...(description !== undefined ? { description } : {}) };
}

/** The step with a new status and `updatedAt`, keeping its other fields and comments. The same text when nothing changes. */
export function setStepStatus(text: string, status: StepStatus, now: Date): string {
  const doc = parseMap(text, 'step');
  if (readStatus(doc, STEP_STATUSES) === status) return text;
  setText(doc, 'status', status);
  setText(doc, 'updatedAt', now.toISOString());
  // yaml reads a BOM but does not write it back.
  return (text.startsWith(BOM) ? BOM : '') + withEol(doc.toString(TO_STRING), eolOf(text));
}

/** A new step, `pending`, with an optional description (a block when it has several lines). */
export function newStep(title: string, description: string | undefined, now: Date): string {
  const doc = new Document({ title, status: 'pending' satisfies StepStatus });
  if (description !== undefined) {
    const node = doc.createNode(description);
    if (description.includes('\n')) node.type = Scalar.BLOCK_LITERAL;
    doc.set('description', node);
  }
  doc.set('updatedAt', now.toISOString());
  return doc.toString(TO_STRING);
}
