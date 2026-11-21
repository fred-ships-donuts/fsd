// F2.2 (parte 2): na sessão nova as marcas do branch vão para ~/.fsd/marks.json (o .git/config é do root); no time antigo, para a
// config do git. O dono de um worktree na sessão nova é a home em que ele está.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, statSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { markSet, markGet } from './fsd-mark.mjs';
import { unsaved } from './fsd-eod.mjs';

const sh = (cwd, ...a) => { const r = spawnSync('git', ['-C', cwd, ...a], { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
const repo = () => { const d = mkdtempSync(join(tmpdir(), 'mk-')); sh(d, 'init', '-q'); writeFileSync(join(d, 'a'), '1'); sh(d, 'add', 'a'); sh(d, 'commit', '-qm', 'i'); return d; };
const withEnv = (env, fn) => { const keep = {}; for (const k of Object.keys(env)) { keep[k] = process.env[k]; process.env[k] = env[k]; } try { return fn(); } finally { for (const [k, v] of Object.entries(keep)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } } };

test('session runner: marks in ~/.fsd/marks.json (0600), never in the git config', () => {
  const r = repo(), home = mkdtempSync(join(tmpdir(), 'home-'));
  withEnv({ FSD_RUNNER: 'session', HOME: home }, () => {
    assert.equal(markSet('fix/12-x', { issue: 12, agent: 'stuart' }, { repo: r }), true);
    assert.equal(markGet('fix/12-x', 'issue', { cwd: r }), '12'); assert.equal(markGet('fix/12-x', 'agent', { cwd: r }), 'stuart');
    assert.equal(statSync(join(home, '.fsd', 'marks.json')).mode & 0o777, 0o600);
    assert.equal(spawnSync('git', ['-C', r, 'config', '--get', 'branch.fix/12-x.fsd-issue']).status, 1);
    markSet('fix/12-x', { issue: null }, { repo: r }); assert.equal(markGet('fix/12-x', 'issue', { cwd: r }), '');
    assert.deepEqual(JSON.parse(readFileSync(join(home, '.fsd', 'marks.json'), 'utf8')), { 'fix/12-x': { agent: 'stuart' } });
  });
});

test('tmux team: marks stay in the git config, and markGet still reads them', () => {
  const r = repo(), home = mkdtempSync(join(tmpdir(), 'home-'));
  withEnv({ FSD_RUNNER: '', HOME: home }, () => {
    markSet('feature/7-y', { issue: 7, agent: 'mel' }, { repo: r });
    assert.equal(sh(r, 'config', '--get', 'branch.feature/7-y.fsd-issue'), '7');
    assert.equal(markGet('feature/7-y', 'agent', { cwd: r }), 'mel');
    markSet('feature/7-y', { issue: '' }, { repo: r }); assert.equal(markGet('feature/7-y', 'issue', { cwd: r }), '');
  });
});

test('unsaved: in the session layout the owner is the home the worktree lives in', () => {
  const r = repo(), homes = mkdtempSync(join(tmpdir(), 'homes-')); mkdirSync(join(homes, 'fsd-stuart', 'wt'), { recursive: true });
  const w = join(homes, 'fsd-stuart', 'wt', 'fix-1'); sh(r, 'worktree', 'add', '-q', '-b', 'fix/1', w); writeFileSync(join(w, 'b'), 'x');
  withEnv({ FSD_ROLE_HOME_PREFIX: join(homes, 'fsd-') }, () => {
    assert.deepEqual(unsaved('stuart', { repo: r }).map((x) => [x.branch, x.dirty]), [['fix/1', 1]]);
    assert.deepEqual(unsaved('mel', { repo: r }), []);
  });
});

test('the commands use the marks module and the session layout', () => {
  const dev = readFileSync(new URL('./fsd-dev', import.meta.url), 'utf8');
  assert.match(dev, /\$\{process\.env\.HOME\}\/wt\//); assert.match(dev, /--no-write-fetch-head/); assert.match(dev, /--no-track/); assert.match(dev, /markSet\(branch/);
  const pr = readFileSync(new URL('./fsd-pr', import.meta.url), 'utf8');
  assert.match(pr, /markGet\(branch, 'issue'/); assert.match(pr, /FSD_RUNNER === 'session' \? \[\] : \['-u'\]/);
  assert.match(readFileSync(new URL('./fsd-redirect-hook', import.meta.url), 'utf8'), /markGet\(b, 'issue'/);
});
