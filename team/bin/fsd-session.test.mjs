// F3.2 (T3.2.1), teste D com o stub-claude: ligar, turno novo na mesma conversa (ocioso: stop + resume, sem cópia), nunca resume de
// sessão trabalhando, parar, e depois de um reinício simulado cada papel ativo volta com a mesma conversa.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = dirname(fileURLToPath(import.meta.url)); const STUB = join(BIN, '..', 'setup', 'stub-claude');
const world = () => ({ FSD_STATE: mkdtempSync(join(tmpdir(), 'ses-')), STUB_CLAUDE_DIR: mkdtempSync(join(tmpdir(), 'stub-')), FSD_REPO: mkdtempSync(join(tmpdir(), 'repo-')), FSD_CLAUDE: STUB, STUB_RUN_HOOKS: '1', FSD_SESSION_ALLOW_UNISOLATED: '1' });
const ses = (w, args, extra = {}) => spawnSync(join(BIN, 'fsd-session'), args, { encoding: 'utf8', env: { ...process.env, FSD_AGENT: '', FSD_RUNNER: '', ...w, ...extra } });
const stub = (w) => JSON.parse(readFileSync(join(w.STUB_CLAUDE_DIR, 'state.json'), 'utf8'));
const status = (w) => JSON.parse(ses(w, ['status', '--json']).stdout);

test('start: one --bg session per role, with --session-id, FSD_RUNNER=session and FSD_AGENT, at the repo root; the Stop hook leaves it idle', () => {
  const w = world();
  const r = ses(w, ['start', 'stuart', 'tarefa #12']); assert.equal(r.status, 0, r.stdout);
  const [s] = stub(w).sessions;
  assert.equal(s.name, 'stuart'); assert.equal(s.agent, 'stuart'); assert.equal(s.runner, 'session'); assert.equal(s.cwd, w.FSD_REPO);
  assert.ok(s.args.includes('--session-id')); assert.deepEqual(s.prompts, ['tarefa #12']);
  assert.deepEqual(status(w).stuart, { state: 'idle', id: s.id, sessionId: s.sessionId });
  assert.equal(status(w).mel.state, 'off');
});

test('turn on an idle session: stop + resume of the same conversation, no copy', () => {
  const w = world(); ses(w, ['start', 'mel', 'primeira']);
  const before = stub(w).sessions[0];
  assert.equal(ses(w, ['turn', 'mel', 'segunda']).status, 0);
  const after = stub(w);
  assert.equal(after.sessions.length, 1); assert.equal(after.sessions[0].sessionId, before.sessionId);
  assert.deepEqual(after.sessions[0].prompts, ['primeira', 'segunda']);
  assert.ok(after.calls.some((c) => c[0] === 'stop' && c[1] === before.id));
});

test('turn on a working session is refused (resume would make a copy)', () => {
  const w = world(); ses(w, ['start', 'bob', 'qa'], { STUB_WORKING: '1' });
  const r = ses(w, ['turn', 'bob', 'mais'], { STUB_WORKING: '1' });
  assert.equal(r.status, 1); assert.match(r.stdout, /trabalhando: --resume criaria uma cópia/);
  assert.equal(stub(w).sessions.length, 1); assert.ok(!stub(w).sessions.some((s) => s.copyOf));
});

test('after a simulated container restart, boot brings back each active role with the same conversation; a stopped role stays off', () => {
  const w = world(); ses(w, ['start', 'stuart', 'a']); ses(w, ['start', 'mel', 'b']); ses(w, ['start', 'kevin', 'c']); ses(w, ['stop', 'kevin']);
  const ids = Object.fromEntries(stub(w).sessions.map((s) => [s.name, s.sessionId]));
  spawnSync(STUB, ['reboot'], { env: { ...process.env, ...w } });
  assert.deepEqual(Object.values(status(w)).map((x) => x.state), ['off', 'off', 'off', 'off']);
  const r = ses(w, ['boot']); assert.equal(r.status, 0); assert.match(r.stdout, /religou mel, stuart|religou stuart, mel/);
  const s = status(w);
  assert.equal(s.stuart.sessionId, ids.stuart); assert.equal(s.mel.sessionId, ids.mel); assert.equal(s.stuart.state, 'idle'); assert.equal(s.kevin.state, 'off');
  assert.equal(stub(w).sessions.length, 3);   // nenhuma conversa nova nem cópia
  assert.match(stub(w).sessions.find((x) => x.name === 'stuart').prompts.at(-1), /religada depois de um reinício/);
});

test('a message waiting in the inbox reaches the session through its hooks on the new turn', () => {
  const w = world(); ses(w, ['start', 'stuart', 'a']);
  spawnSync(join(BIN, 'fsd-diga'), ['stuart', 'use o mergeGate'], { env: { ...process.env, ...w, FSD_AGENT: 'mel' } });
  const M = spawnSync(process.execPath, ['-e', `const M=await import(${JSON.stringify(join(BIN, 'fsd-messenger.mjs'))}); for (const m of M.collect({uidToRole:null}).messages) M.deliver(m);`], { env: { ...process.env, ...w }, encoding: 'utf8' });
  assert.equal(M.status, 0, M.stderr);
  ses(w, ['turn', 'stuart', 'b']);
  const ctx = stub(w).sessions[0].context.map((c) => c.out).join('\n');
  assert.match(ctx, /mel: use o mergeGate/);
});

test('usage errors', () => { const w = world(); assert.equal(ses(w, ['start', 'eve', 'x']).status, 2); assert.equal(ses(w, ['nada']).status, 2); });
