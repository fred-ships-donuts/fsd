// T3.4.2 (D12): perto do limite de contexto o supervisor pede o fechamento; a sessão só fecha sem nada do papel só no disco; a
// próxima tarefa abre uma sessão nova que lê a passagem (stub-claude, D).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decide } from './fsd-dispatch.mjs';
import { unsaved, ctxOf, EOD_PROMPT, NEW_DAY_NOTE } from './fsd-eod.mjs';

const BIN = dirname(fileURLToPath(import.meta.url)); const STUB = join(BIN, '..', 'setup', 'stub-claude');
const off = { state: 'off' }, team = (o = {}) => ({ kevin: off, mel: off, stuart: off, bob: off, ...o });

test('decide: idle with context at the limit → endofday (and no task that round); asked and idle again → retire', () => {
  const cards = [{ n: 5, column: 'devReady' }];
  assert.deepEqual(decide({ endOfDayAt: 100000, sessions: team({ stuart: { state: 'idle', id: 's', ctx: 120000 } }), cards }), [{ type: 'endofday', to: 'stuart', id: 's' }]);
  assert.deepEqual(decide({ endOfDayAt: 100000, sessions: team({ stuart: { state: 'idle', id: 's', ctx: 120000, eod: true } }), cards }), [{ type: 'retire', to: 'stuart', id: 's' }]);
  assert.deepEqual(decide({ endOfDayAt: 100000, sessions: team({ stuart: { state: 'working', id: 's', ctx: 150000 } }), cards }), []);
  assert.deepEqual(decide({ endOfDayAt: 100000, sessions: team({ stuart: { state: 'idle', id: 's', ctx: 50000 } }), cards }).map((a) => a.type), ['turn']);
  assert.deepEqual(decide({ paused: true, endOfDayAt: 100000, sessions: team({ mel: { state: 'idle', id: 'm', ctx: 100000 } }) }), [{ type: 'endofday', to: 'mel', id: 'm' }]);
  assert.deepEqual(decide({ sessions: team({ mel: { state: 'idle', id: 'm', ctx: 900000 } }) }), []);   // sem endOfDayAt, nada
});

test('the end-of-day prompt asks for the handoff, the GitHub note, commit and push; the new day reads the handoff', () => {
  assert.match(EOD_PROMPT, /memory_handoff_begin/); assert.match(EOD_PROMPT, /comentário/); assert.match(EOD_PROMPT, /Commit e push/);
  assert.match(NEW_DAY_NOTE, /leia o handoff do ai-memory/);
});

const sh = (cwd, ...a) => { const r = spawnSync('git', ['-C', cwd, ...a], { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } }); assert.equal(r.status, 0, r.stderr); return r.stdout; };
test('unsaved: the role\'s worktrees with uncommitted changes or unpushed commits; other roles\' do not count; pushed → clean', () => {
  const base = mkdtempSync(join(tmpdir(), 'eod-')), bare = join(base, 'r.git'), repo = join(base, 'repo');
  sh(base, 'init', '-q', '--bare', bare); sh(base, 'clone', '-q', bare, repo);
  writeFileSync(join(repo, 'a'), '1'); sh(repo, 'add', 'a'); sh(repo, 'commit', '-qm', 'init'); sh(repo, 'push', '-q', 'origin', 'HEAD:develop');
  const w = join(base, 'wt'); sh(repo, 'worktree', 'add', '-q', '-b', 'fix/12-x', w); sh(repo, 'config', 'branch.fix/12-x.fsd-agent', 'stuart');
  const m = join(base, 'wm'); sh(repo, 'worktree', 'add', '-q', '-b', 'docs/arq', m); sh(repo, 'config', 'branch.docs/arq.fsd-agent', 'mel'); writeFileSync(join(m, 'z'), 'x');
  assert.deepEqual(unsaved('stuart', { repo }), []);
  writeFileSync(join(w, 'b'), '2'); assert.deepEqual(unsaved('stuart', { repo }).map((x) => [x.branch, x.dirty, x.ahead]), [['fix/12-x', 1, 0]]);
  sh(w, 'add', 'b'); sh(w, 'commit', '-qm', 'b'); assert.deepEqual(unsaved('stuart', { repo }).map((x) => [x.dirty, x.ahead]), [[0, 1]]);
  sh(w, 'push', '-q', '-u', 'origin', 'fix/12-x'); assert.deepEqual(unsaved('stuart', { repo }), []);
  assert.equal(unsaved('mel', { repo })[0].branch, 'docs/arq');
});

test('ctxOf: input + cache read + cache written + output of the last answer', () => {
  const f = join(mkdtempSync(join(tmpdir(), 'ctx-')), 's.jsonl');
  writeFileSync(f, [{ type: 'assistant', message: { usage: { input_tokens: 1, output_tokens: 1 } } }, { type: 'assistant', message: { usage: { input_tokens: 10, cache_read_input_tokens: 100000, cache_creation_input_tokens: 2000, output_tokens: 500 } } }].map((x) => JSON.stringify(x)).join('\n'));
  assert.equal(ctxOf(f), 102510); assert.equal(ctxOf('/nao/existe'), 0);
});

test('retire (stub-claude): stops and forgets the conversation; the next task opens a new one that starts by reading the handoff', () => {
  const w = { FSD_STATE: mkdtempSync(join(tmpdir(), 'ses-')), STUB_CLAUDE_DIR: mkdtempSync(join(tmpdir(), 'stub-')), FSD_REPO: mkdtempSync(join(tmpdir(), 'repo-')), FSD_CLAUDE: STUB, STUB_RUN_HOOKS: '1' };
  const ses = (args) => spawnSync(join(BIN, 'fsd-session'), args, { encoding: 'utf8', env: { ...process.env, FSD_AGENT: '', FSD_RUNNER: '', ...w } });
  assert.equal(ses(['start', 'stuart', 'dia 1']).status, 0);
  const day1 = JSON.parse(readFileSync(join(w.STUB_CLAUDE_DIR, 'state.json'), 'utf8')).sessions[0].sessionId;
  assert.equal(ses(['retire', 'stuart']).status, 0);
  assert.equal(JSON.parse(ses(['status', '--json']).stdout).stuart.state, 'off');
  assert.equal(ses(['turn', 'stuart', 'tarefa #12']).status, 0);
  const st = JSON.parse(readFileSync(join(w.STUB_CLAUDE_DIR, 'state.json'), 'utf8')).sessions;
  assert.equal(st.length, 2); assert.notEqual(st[1].sessionId, day1); assert.equal(st[0].alive, false);
  assert.ok(st[1].prompts[0].startsWith(NEW_DAY_NOTE)); assert.match(st[1].prompts[0], /tarefa #12/);
});
