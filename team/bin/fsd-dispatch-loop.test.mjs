// F3.2 (T3.2.2): reinício do supervisor não duplica sessão nem tarefa (tarefa gravada antes da chamada; diário + reconcile);
// o lease da tarefa reenvia o que se perdeu; juiz uma vez por ref; o laço roda só da cópia fixada, e um PR mesclado não muda o
// supervisor sem fixar a cópia nova. Relógio injetável.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, cpSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = dirname(fileURLToPath(import.meta.url));
process.env.FSD_STATE = mkdtempSync(join(tmpdir(), 'dl-'));
const D = await import('./fsd-dispatch-loop.mjs'); const { STAGE } = await import('./fsd-stages.mjs');
const fresh = () => { process.env.FSD_STATE = mkdtempSync(join(tmpdir(), 'dl-')); };
const T0 = Date.parse('2026-11-21T12:00:00Z'), MIN = 60000;
const off = { state: 'off' }, team = (o = {}) => ({ kevin: off, mel: off, stuart: off, bob: off, ...o });
const g = (o = {}) => async () => ({ sessions: team(), cards: [], messages: [], deadlocks: [], ...o });

test('the task is recorded before the call; a call that fails gives it back (R23) and the next round sends it again', async () => {
  fresh(); const calls = [];
  const fail = async (a) => { calls.push(a); assert.equal(D.loadTasks().stuart?.n, 5); throw new Error('preflight recusou'); };
  const r1 = await D.round({ gather: g({ cards: [{ n: 5, column: 'devReady' }] }), exec: fail, now: T0 });
  assert.equal(r1.skipped.length, 1); assert.equal(D.loadTasks().stuart, undefined);
  assert.deepEqual(D.reconcile(T0 + MIN), []);   // failed tem fim; só intent sem fim é abandoned
  const r2 = await D.round({ gather: g({ cards: [{ n: 5, column: 'devReady' }] }), exec: async (a) => calls.push(a), now: T0 + MIN });
  assert.equal(r2.actions.length, 1); assert.equal(calls.length, 2); assert.equal(D.loadTasks().stuart?.n, 5);
});

test('a supervisor that dies in the middle of the call (intent without end) does not resend the task after the restart', async () => {
  fresh(); mkdirSync(D.dispatchDir(), { recursive: true });
  writeFileSync(join(D.dispatchDir(), 'tasks.json'), JSON.stringify({ stuart: { key: 'entrega-codigo:#5', kind: 'entrega-codigo', n: 5, at: T0 } }));
  writeFileSync(join(D.dispatchDir(), 'journal.jsonl'), JSON.stringify({ t: T0, id: 'x0', phase: 'intent', action: { type: 'turn', to: 'stuart' } }) + '\n');
  assert.equal(D.reconcile(T0 + MIN).length, 1);
  const calls = []; const r = await D.round({ gather: g({ cards: [{ n: 5, column: 'devReady' }] }), exec: async (a) => calls.push(a), now: T0 + MIN });
  assert.deepEqual(r.actions, []); assert.equal(calls.length, 0);
});

test('reconcile: an action left with intent only (process killed) becomes abandoned, once', async () => {
  fresh(); mkdirSync(D.dispatchDir(), { recursive: true });
  writeFileSync(join(D.dispatchDir(), 'journal.jsonl'), JSON.stringify({ t: T0, id: 'x1', phase: 'intent', action: { type: 'turn', to: 'mel' } }) + '\n');
  assert.equal(D.reconcile(T0 + MIN).length, 1); assert.equal(D.reconcile(T0 + 2 * MIN).length, 0);
  assert.equal(D.readJournal().at(-1).phase, 'abandoned');
});

test('task lease: after taskLeaseMin with the role stopped and no delivery, decide() sends it again; working or delivered, no', async () => {
  fresh(); const sent = [];
  const exec = async (a) => { sent.push(`${a.to}#${a.task?.n}`); };
  const cards = [{ n: 5, column: 'devReady' }];
  await D.round({ gather: g({ cards }), exec, now: T0, cfg: { taskLeaseMin: 120 } });
  await D.round({ gather: g({ cards, sessions: team({ stuart: { state: 'working', id: 's' } }) }), exec, now: T0 + 200 * MIN, cfg: { taskLeaseMin: 120 } });
  await D.round({ gather: g({ cards }), exec, now: T0 + 60 * MIN, cfg: { taskLeaseMin: 120 } });
  assert.deepEqual(sent, ['stuart#5']);
  await D.round({ gather: g({ cards }), exec, now: T0 + 121 * MIN, cfg: { taskLeaseMin: 120 } });
  assert.deepEqual(sent, ['stuart#5', 'stuart#5']);
  await D.round({ gather: g({ cards }), exec, now: T0 + 400 * MIN, cfg: { taskLeaseMin: 120, delivered: () => true } });
  assert.equal(sent.length, 2);
});

test('judge once per ref across rounds and restarts', async () => {
  fresh(); const seen = [];
  for (let i = 0; i < 3; i++) await D.round({ gather: g({ deadlocks: [{ ref: '#7', key: 'DEADLOCK #7' }] }), exec: async (a) => seen.push(a.type), now: T0 + i * MIN });
  // Validação R28: chamado uma vez; fica em judging até o supervisor ler a resposta (só então entra em judged).
  assert.deepEqual(seen, ['judge']); assert.deepEqual(D.loadJudged(), []); assert.equal(D.loadJudging()['#7'].state, 'running');
});

test('every action is in the journal with intent and done', async () => {
  fresh();
  await D.round({ gather: g({ cards: [{ n: 8, column: 'mergeReady', pr: 80 }] }), exec: async () => 'ok', now: T0 });
  assert.deepEqual(D.readJournal().map((e) => `${e.phase}:${e.action.type}`), ['intent:merge', 'done:merge']);
});

const cli = (args, env = {}, script = join(BIN, 'fsd-dispatch')) => spawnSync(script, args, { encoding: 'utf8', env: { ...process.env, FSD_DRY: '', FSD_DISPATCH_LIVE: '', ...env } });
test('pinned copy: the loop refuses the live checkout; the pinned copy runs and does not change when the live code changes', () => {
  fresh();
  const teamDir = mkdtempSync(join(tmpdir(), 'team-')); for (const p of ['bin', 'contracts', 'agents.json']) cpSync(join(BIN, '..', p), join(teamDir, p), { recursive: true });
  const refused = cli(['loop'], { FSD_DISPATCH_ROUNDS: '1' }); assert.equal(refused.status, 1); assert.match(refused.stdout, /só roda da cópia fixada/);
  const dst = D.pinCode('abc1234', teamDir);
  assert.equal(D.runningPinned(join(dst, 'bin', 'fsd-dispatch')), true); assert.equal(D.runningPinned(join(BIN, 'fsd-dispatch')), false);
  writeFileSync(join(teamDir, 'bin', 'fsd-dispatch.mjs'), '// mudou na develop\n');   // um PR mesclado no checkout vivo
  assert.doesNotMatch(readFileSync(join(dst, 'bin', 'fsd-dispatch.mjs'), 'utf8'), /mudou na develop/);
  const fx = join(process.env.FSD_STATE, 'fx.json'); writeFileSync(fx, JSON.stringify({ sessions: team(), cards: [{ n: 8, column: 'mergeReady', pr: 80 }], messages: [], deadlocks: [] }));
  const ok = cli(['loop'], { FSD_DISPATCH_ROUNDS: '1', FSD_DISPATCH_FIXTURE: fx, FSD_DRY: '1' }, join(dst, 'bin', 'fsd-dispatch'));   // dry: nada de merge de verdade
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.equal(D.readJournal().filter((e) => e.action.type === 'merge').length >= 1, true);   // a cópia fixada rodou a rodada
});

test('fsd-dispatch round --dry with a fixture prints the actions and executes nothing', () => {
  fresh(); const fx = join(process.env.FSD_STATE, 'fx.json');
  writeFileSync(fx, JSON.stringify({ sessions: team(), cards: [{ n: 9, column: 'changes' }], messages: [], deadlocks: [] }));
  const r = cli(['round', '--dry'], { FSD_DISPATCH_FIXTURE: fx });
  assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /\[dry\] \{"type":"turn","to":"stuart","how":"wake","task":\{"key":"correcao:#9","kind":"correcao","n":9\}/);
  assert.equal(cli(['nada']).status, 2);
});

// O laço de verdade (cópia fixada, gather e exec reais, fsd-session com o stub-claude) com um gh que falha nas N primeiras chamadas de um
// comando e depois é o fake-gh. Só o relógio do laço é curto; nada do caminho do erro é simulado.
const gitHub = { issues: { 5: { number: 5, title: 'Tarefa', body: 'x', state: 'OPEN', labels: [{ name: 'size:S' }], comments: [] } }, prs: {} };
function world({ failOn, times }) {
  fresh(); const st = process.env.FSD_STATE, w = mkdtempSync(join(tmpdir(), 'w-')); const TEAM = join(BIN, '..');
  const teamDir = join(w, 'team'); for (const p of ['bin', 'contracts', 'agents.json', 'setup/stub-claude', 'redirects.json', 'claude-settings.json', 'judge-prompt.md', 'agents']) { try { cpSync(join(TEAM, p), join(teamDir, p), { recursive: true }); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
  const a = JSON.parse(readFileSync(join(teamDir, 'agents.json'), 'utf8')); a.dispatch.loopSeconds = 0.01; a.dispatch.admitEveryMin = 1e9; writeFileSync(join(teamDir, 'agents.json'), JSON.stringify(a));
  writeFileSync(join(st, 'gh.json'), JSON.stringify(gitHub)); writeFileSync(join(st, 'board.json'), JSON.stringify({ 5: STAGE.devReady }));
  writeFileSync(join(w, 'gh'), `#!/bin/sh
case "$*" in "${failOn}"*) n=$(cat ${w}/n 2>/dev/null || echo 0); if [ "$n" -lt ${times} ]; then echo $((n+1)) > ${w}/n; echo "sem rede" >&2; exit 1; fi;; esac
exec node ${join(TEAM, 'setup', 'fake-gh')} "$@"
`, { mode: 0o755 });
  const dst = D.pinCode('def5678', teamDir); mkdirSync(join(w, 'repo'));
  const env = { FSD_STATE: st, FSD_GH: join(w, 'gh'), FAKE_GH_STATE: join(st, 'gh.json'), FSD_BOARD_FAKE: join(st, 'board.json'), STUB_CLAUDE_DIR: w, FSD_CLAUDE: join(TEAM, 'setup', 'stub-claude'), FSD_REPO: join(w, 'repo'),
    FSD_SESSION_ALLOW_UNISOLATED: '1', STUB_WORKING: '1', FSD_AGENT: '', FSD_RUNNER: 'session' };   // como no container: FSD_RUNNER=session e sem FSD_AGENT
  return { st, w, loop: (rounds, extra = {}) => cli(['loop'], { ...env, FSD_DISPATCH_ROUNDS: String(rounds), ...extra }, join(dst, 'bin', 'fsd-dispatch')),
    sessions: () => { try { return JSON.parse(readFileSync(join(w, 'state.json'), 'utf8')).sessions; } catch { return []; } } };
}
const card5 = (st) => { const f = join(st, 'fx.json'); writeFileSync(f, JSON.stringify({ sessions: team(), cards: [{ n: 5, column: 'devReady' }], messages: [], deadlocks: [] })); return f; };

test('gh fails when the state is gathered: the loop survives, says so, and the rounds after it run', () => {
  const x = world({ failOn: 'issue list', times: 2 });
  const r = x.loop(4); assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.stdout.match(/rodada falhou: .*sem rede/g)?.length, 2, r.stdout);   // rodadas 3 e 4 coletam
  assert.equal(x.sessions().filter((s) => s.agent === 'stuart').length, 1, r.stdout); assert.equal(D.loadTasks().stuart?.n, 5);   // e o card do quadro foi trabalhado
});

test('gh fails when the turn is sent (exec, real die): the task goes back (R23), the loop survives and the next round opens the session once', () => {
  const x = world({ failOn: 'issue view', times: 1 }); const fx = card5(x.st);
  const one = x.loop(1, { FSD_DISPATCH_FIXTURE: fx }); assert.equal(one.status, 0, one.stdout + one.stderr);
  assert.equal(D.loadTasks().stuart, undefined); assert.equal(x.sessions().length, 0);
  assert.deepEqual(D.readJournal().map((e) => `${e.phase}:${e.action.type}`), ['intent:turn', 'failed:turn']);
  assert.match(D.readJournal().at(-1).error, /gh falhou: sem rede/);
  assert.deepEqual(D.reconcile(T0), []);   // nada ficou "abandoned"
  const two = x.loop(1, { FSD_DISPATCH_FIXTURE: fx }); assert.equal(two.status, 0, two.stdout + two.stderr);
  assert.equal(D.loadTasks().stuart?.n, 5); assert.equal(x.sessions().filter((s) => s.agent === 'stuart').length, 1);
  assert.equal(D.readJournal().at(-1).phase, 'done');
});

test('the same in one process: fails in round 1, opens the session in round 2', () => {
  const x = world({ failOn: 'issue view', times: 1 });
  const r = x.loop(2, { FSD_DISPATCH_FIXTURE: card5(x.st) }); assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(D.readJournal().map((e) => e.phase), ['intent', 'failed', 'intent', 'done']);
  assert.equal(x.sessions().filter((s) => s.agent === 'stuart').length, 1); assert.equal(D.loadTasks().stuart?.n, 5);
});

test('the board cannot be read: the round fails and says why, never an empty board', () => {
  const x = world({ failOn: 'nada', times: 0 });
  const r = x.loop(1, { FSD_RUNNER: '' });   // fora da sessão nativa, sem FSD_AGENT: o fsd-board recusa
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /rodada falhou: .*fsd-board list falhou: .*rode dentro de uma sessão/);
});

test('the supervisor reads the board as in the container (FSD_RUNNER=session, no FSD_AGENT) and sends the ready card', () => {
  const x = world({ failOn: 'nada', times: 0 }); const r = x.loop(1);
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.doesNotMatch(r.stdout, /falhou/);
  assert.equal(x.sessions().filter((s) => s.agent === 'stuart').length, 1); assert.equal(D.loadTasks().stuart?.n, 5);
});
