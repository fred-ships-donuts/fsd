import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { appendGitignore, gitignoreLines, gitignoreProblem, missingGitignoreLines, planGitignore } from './gitignore.js';

describe('missingGitignoreLines', () => {
  it('no file or an empty file: both lines', () => {
    assert.deepEqual(missingGitignoreLines(null), gitignoreLines);
    assert.deepEqual(missingGitignoreLines(''), gitignoreLines);
  });
  it('finds lines with spaces at the ends, a BOM and CRLF', () => {
    assert.deepEqual(missingGitignoreLines('﻿ .fsd/cache/ \r\n.fsd/logs/\r\n'), []);
  });
  it('exact line only: a pattern or a longer line does not count', () => {
    assert.deepEqual(missingGitignoreLines('.fsd/\n.fsd/cache\n'), gitignoreLines);
  });
  it('returns only what is missing', () => {
    assert.deepEqual(missingGitignoreLines('.fsd/logs/'), ['.fsd/cache/']);
  });
});

describe('appendGitignore', () => {
  it('no file: the lines and a final break', () => {
    assert.equal(appendGitignore(null, gitignoreLines), '.fsd/cache/\n.fsd/logs/\n');
  });
  it('empty file: no break before', () => {
    assert.equal(appendGitignore('', gitignoreLines), '.fsd/cache/\n.fsd/logs/\n');
  });
  it('no final break: adds one first, the rest untouched', () => {
    assert.equal(appendGitignore('a\nb', gitignoreLines), 'a\nb\n.fsd/cache/\n.fsd/logs/\n');
  });
  it('keeps CRLF, also without a final break', () => {
    assert.equal(appendGitignore('a\r\nb', gitignoreLines), 'a\r\nb\r\n.fsd/cache/\r\n.fsd/logs/\r\n');
    assert.equal(appendGitignore('a\r\n', ['.fsd/logs/']), 'a\r\n.fsd/logs/\r\n');
  });
  it('never strips the BOM', () => {
    assert.equal(appendGitignore('﻿a\n', gitignoreLines).startsWith('﻿a\n'), true);
  });
});

describe('planGitignore', () => {
  let root: string;
  beforeEach(() => (root = mkdtempSync(join(tmpdir(), 'fsd-gi-'))));
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('no file: a change that creates it', () => {
    assert.deepEqual(planGitignore(root), { path: join(root, '.gitignore'), expected: null, content: '.fsd/cache/\n.fsd/logs/\n', lines: gitignoreLines });
  });
  it('both lines present: null', () => {
    writeFileSync(join(root, '.gitignore'), '.fsd/cache/\n.fsd/logs/\n');
    assert.equal(planGitignore(root), null);
  });
  it('a directory, a link to a file and a dangling link do not throw: the exact messages', () => {
    mkdirSync(join(root, '.gitignore'));
    assert.deepEqual(planGitignore(root), { error: '.gitignore is not a regular file' });
    rmSync(join(root, '.gitignore'), { recursive: true });
    writeFileSync(join(root, 'real'), 'x');
    symlinkSync(join(root, 'real'), join(root, '.gitignore'));
    assert.deepEqual(planGitignore(root), { error: '.gitignore is a symbolic link' });
    rmSync(join(root, '.gitignore'));
    symlinkSync(join(root, 'nowhere'), join(root, '.gitignore'));
    assert.equal(gitignoreProblem(join(root, '.gitignore')), '.gitignore is a symbolic link');
  });
});
