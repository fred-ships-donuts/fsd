import { join } from 'node:path';
import { readTextOrNull } from './fs.js';

// The `.gitignore` lines the Install flow adds in the project scope (SPEC 4.2).
export const gitignoreLines = ['.fsd/cache/', '.fsd/logs/'];

/** The lines of `gitignoreLines` the text does not have. Exact line match, trimmed at both ends and without a leading BOM. */
export function missingGitignoreLines(text: string | null): string[] {
  if (text === null) return [...gitignoreLines];
  const present = new Set(text.replace(/^﻿/, '').split(/\r\n|\n|\r/).map((line) => line.trim()));
  return gitignoreLines.filter((line) => !present.has(line));
}

/** The text with `lines` appended: a line break first when the file does not end in one; the file's own EOL; the rest untouched. */
export function appendGitignore(text: string | null, lines: string[]): string {
  if (lines.length === 0) return text ?? '';
  const eol = text !== null && text.includes('\r\n') ? '\r\n' : '\n';
  const body = lines.join(eol) + eol;
  if (text === null) return body;
  const needsBreak = text.length > 0 && !text.endsWith('\n') && !text.endsWith('\r');
  return text + (needsBreak ? eol : '') + body;
}

export interface GitignoreChange {
  path: string;
  /** What the file held when it was read (null: no file). */
  expected: string | null;
  content: string;
  lines: string[];
}

/** What Install must write to `<root>/.gitignore`, or null when it already has every line. Reads the disk only. */
export function planGitignore(root: string): GitignoreChange | null {
  const path = join(root, '.gitignore');
  const expected = readTextOrNull(path);
  const lines = missingGitignoreLines(expected);
  return lines.length === 0 ? null : { path, expected, content: appendGitignore(expected, lines), lines };
}
