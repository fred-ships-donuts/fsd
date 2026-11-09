import { join } from 'node:path';
import { exists, readTextOrNull } from './fs.js';

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

/** Why the project `.gitignore` cannot be written (same text in Plan and Verify), or null when it can. Never throws. */
export function gitignoreProblem(path: string): string | null {
  const stats = exists(path);
  if (!stats) return null;
  if (stats.isSymbolicLink()) return '.gitignore is a symbolic link';
  if (!stats.isFile()) return '.gitignore is not a regular file';
  return null;
}

/** What Install must write to `<root>/.gitignore`: null when it already has every line, `{ error }` when it cannot be written. Reads the disk only. */
export function planGitignore(root: string): GitignoreChange | { error: string } | null {
  const path = join(root, '.gitignore');
  const error = gitignoreProblem(path);
  if (error) return { error };
  const expected = readTextOrNull(path);
  const lines = missingGitignoreLines(expected);
  return lines.length === 0 ? null : { path, expected, content: appendGitignore(expected, lines), lines };
}
