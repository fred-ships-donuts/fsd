import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { listSkills } from './skills.js';

const entry = fileURLToPath(new URL('./index.js', import.meta.url));
const skill = listSkills().find((candidate) => candidate.variants.length > 1)!.name;

function sandbox() {
  const home = mkdtempSync(join(tmpdir(), 'fsd-home-'));
  const cwd = mkdtempSync(join(tmpdir(), 'fsd-cwd-'));
  // stdin/stdout are pipes, so the CLI runs in its non-interactive mode.
  const run = (...args: string[]) => {
    const result = spawnSync(process.execPath, [entry, ...args], { cwd, env: { ...process.env, HOME: home }, encoding: 'utf8' });
    return { code: result.status, out: result.stdout, err: result.stderr };
  };
  return { home, cwd, run, global: join(home, '.claude', 'skills'), project: join(cwd, '.claude', 'skills') };
}

describe('fsd install', () => {
  it('installs the chosen language without evals/ and README.md', () => {
    const { run, global } = sandbox();
    const result = run('install', skill, '--lang', 'en');
    assert.equal(result.code, 0, result.err);
    assert.ok(existsSync(join(global, skill, 'SKILL.md')));
    assert.ok(!existsSync(join(global, skill, 'evals')));
    assert.ok(!existsSync(join(global, skill, 'README.md')));
    assert.deepEqual(JSON.parse(readFileSync(join(global, skill, '.fsd.json'), 'utf8')), { lang: 'en' });
  });

  it('is idempotent: the second run skips and exits 0', () => {
    const { run } = sandbox();
    run('install', skill, '--lang', 'en');
    const again = run('install', skill, '--lang', 'en');
    assert.equal(again.code, 0);
    assert.match(again.out, /skip/);
  });

  it('writes only to the project with --project', () => {
    const { run, global, project } = sandbox();
    assert.equal(run('install', skill, '--lang', 'pt-BR', '--project').code, 0);
    assert.ok(existsSync(join(project, skill, 'SKILL.md')));
    assert.ok(!existsSync(global));
  });

  it('fails without --lang when not interactive and writes nothing', () => {
    const { run, global } = sandbox();
    const result = run('install', skill);
    assert.equal(result.code, 1);
    assert.match(result.err, /--lang is required/);
    assert.ok(!existsSync(global));
  });

  it('installs nothing when one name is unknown', () => {
    const { run, global } = sandbox();
    const result = run('install', skill, 'nope', '--lang', 'en');
    assert.equal(result.code, 1);
    assert.match(result.err, /unknown skill\(s\): nope/);
    assert.ok(!existsSync(global));
  });

  it('rejects a language the skill does not have', () => {
    const { run } = sandbox();
    const result = run('install', skill, '--lang', 'fr');
    assert.equal(result.code, 1);
    assert.match(result.err, /no language 'fr'/);
  });

  it('--dry-run writes nothing', () => {
    const { run, global } = sandbox();
    const result = run('install', skill, '--lang', 'en', '--dry-run');
    assert.equal(result.code, 0);
    assert.ok(!existsSync(global));
  });
});

describe('fsd update / uninstall / list', () => {
  it('update upgrades only an older install and keeps the language', () => {
    const { run, global } = sandbox();
    run('install', skill, '--lang', 'pt-BR');
    const file = join(global, skill, 'SKILL.md');
    writeFileSync(file, readFileSync(file, 'utf8').replace(/version: "[^"]+"/, 'version: "0.0.1"'));

    assert.match(run('list', '--installed').out, /outdated \(0\.0\.1\)/);
    assert.match(run('update').out, /upgrade .*\[pt-BR\]/);
    assert.match(run('list', '--installed').out, /up to date/);
    assert.match(run('update').out, /skip/);
  });

  it('update skips skills that are not installed', () => {
    const { run, global } = sandbox();
    const result = run('update', skill);
    assert.equal(result.code, 0);
    assert.match(result.out, /not installed/);
    assert.ok(!existsSync(global));
  });

  it('uninstall removes only the named catalog skill', () => {
    const { run, global } = sandbox();
    run('install', skill, '--lang', 'en');
    mkdirSync(join(global, 'foreign'), { recursive: true });

    assert.equal(run('uninstall', 'foreign').code, 1);
    assert.equal(run('uninstall', skill).code, 0);
    assert.ok(!existsSync(join(global, skill)));
    assert.ok(existsSync(join(global, 'foreign')));
  });
});
