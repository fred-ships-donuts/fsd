// O supervisor de ponta a ponta, por processo: a coleta (o estado exato que chega ao decide), cada ação executada (sucesso e falha) e os
// comandos round/loop/pin/status. GitHub, quadro e claude falsos (fake-gh, FSD_BOARD_FAKE, stub-claude); o código é o de verdade, numa
// cópia do team/ em que só o decide (para ver o estado ou mandar uma ação) e os comandos chamados podem ser trocados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, cpSync, existsSync, renameSync, symlinkSync, chmodSync, rmSync } from 'node:fs';
import { spawnSync, spawn } from 'node:child_process';
import { tmpdir, userInfo } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = dirname(fileURLToPath(import.meta.url)), TEAM = join(BIN, '..');
const T0 = Date.parse('2026-11-21T12:00:00Z'), MIN = 60000;
const json = (f, d) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return d; } };
const exe = (f, s) => writeFileSync(f, `#!/bin/sh\n${s}\n`, { mode: 0o755 });
const tmp = (p) => mkdtempSync(join(tmpdir(), p));

// world({ decide, cmds, agents, issues, prs, board, gh }) — decide: 'real' | 'dump' (grava o estado, 0 ação) | [ações]
function world({ decide = 'real', cmds = {}, agents = () => {}, issues = {}, prs = {}, board = {}, gh } = {}) {
  const w = tmp('sup-'), team = join(w, 'team'), bin = join(team, 'bin'), st = join(w, 'st'), repo = join(w, 'repo'), home = join(w, 'home');
  for (const d of [st, repo, home]) mkdirSync(d);
  cpSync(BIN, bin, { recursive: true, filter: (s) => !s.endsWith('.test.mjs') }); cpSync(join(TEAM, 'contracts'), join(team, 'contracts'), { recursive: true });
  const cfg = json(join(TEAM, 'agents.json')); agents(cfg); writeFileSync(join(team, 'agents.json'), JSON.stringify(cfg));
  if (decide !== 'real') {
    renameSync(join(bin, 'fsd-dispatch.mjs'), join(bin, 'real-decide.mjs'));
    writeFileSync(join(bin, 'fsd-dispatch.mjs'), `import { writeFileSync } from 'node:fs';\nexport * from ${JSON.stringify(join(bin, 'real-decide.mjs'))};\nexport const decide = (s) => { writeFileSync(${JSON.stringify(join(w, 'state.dump'))}, JSON.stringify(s)); return ${JSON.stringify(decide === 'dump' ? [] : decide)}; };\n`);
  }
  for (const [c, body] of Object.entries(cmds)) exe(join(bin, c), `printf '%s|%s|%s\\n' "${c}" "$FSD_AGENT" "$*" >> ${join(w, 'calls')}\n${body}`);
  writeFileSync(join(st, 'gh.json'), JSON.stringify({ issues, prs })); writeFileSync(join(st, 'board.json'), JSON.stringify(board));
  if (gh) exe(join(w, 'gh'), `${gh}\nexec node ${join(TEAM, 'setup', 'fake-gh')} "$@"`);
  const base = { ...process.env, FSD_STATE: st, FSD_GH: gh ? join(w, 'gh') : join(TEAM, 'setup', 'fake-gh'), FAKE_GH_STATE: join(st, 'gh.json'), FSD_BOARD_FAKE: join(st, 'board.json'), STUB_CLAUDE_DIR: w,
    FSD_CLAUDE: join(TEAM, 'setup', 'stub-claude'), FSD_REPO: repo, HOME: home, FSD_SESSION_ALLOW_UNISOLATED: '1', STUB_WORKING: '1', FSD_AGENT: '', FSD_RUNNER: 'session', FSD_NOW: String(T0),
    FSD_STATE_ROOT: '', FSD_SESSION_VIA: '', FSD_DRY: '', FSD_DISPATCH_LIVE: '', FSD_DISPATCH_FIXTURE: '', FSD_DISPATCH_ROUNDS: '', FSD_PIN_SHA: '', CLAUDE_CONFIG_DIR: '' };
  const run = (args, env = {}) => spawnSync(join(bin, 'fsd-dispatch'), args, { encoding: 'utf8', env: { ...base, ...env } });
  const D = join(st, 'dispatch'); mkdirSync(D);
  return { w, team, bin, st, repo, home, D, base, run,
    state: () => json(join(w, 'state.dump')), calls: () => { try { return readFileSync(join(w, 'calls'), 'utf8').trim().split('\n'); } catch { return []; } },
    put: (f, v) => writeFileSync(join(D, f), typeof v === 'string' ? v : JSON.stringify(v)), get: (f) => json(join(D, f)),
    journal: () => { try { return readFileSync(join(D, 'journal.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)); } catch { return []; } },
    inbox: (a) => { try { return readFileSync(join(st, 'inbox', a), 'utf8').trim().split('\n').map((l) => JSON.parse(l).text); } catch { return []; } },
    fixture: (g = {}) => { const f = join(w, 'fx.json'); writeFileSync(f, JSON.stringify({ sessions: {}, cards: [], messages: [], deadlocks: [], ...g })); return { FSD_DISPATCH_FIXTURE: f }; },
    live: (list) => writeFileSync(join(w, 'state.json'), JSON.stringify({ sessions: list.map((s) => ({ alive: true, cwd: repo, ...s })), calls: [] })),
    stub: () => json(join(w, 'state.json')) };
}
const ok = (r, re) => { assert.equal(r.status, 0, r.stdout + r.stderr); if (re) assert.match(r.stdout, re); return r; };
const issue = (n, o = {}) => ({ number: n, title: `t${n}`, body: '- [ ] a', state: 'OPEN', labels: [{ name: 'size:S' }], comments: [], ...o });
const COL = (await import('./fsd-stages.mjs')).STAGE;
// Uma ação só, executada de verdade; devolve a rodada e o que ficou no diário.
const act = (a, o = {}) => { const x = world({ decide: [].concat(a), ...o }); (o.before || (() => {}))(x); const r = x.run(['round'], { ...x.fixture(o.fx), ...(o.env || {}) }); return { x, r, end: x.journal().at(-1) }; };

// ── A coleta ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test('gather: cards with column, blocked, unsized, PR, head and who already reviewed this head', () => {
  const pr = (number, body, reviews = []) => ({ number, title: 'p', body, state: 'OPEN', isDraft: false, baseRefName: 'develop', headRefName: 'b', headRefOid: 'h1', author: { login: 'app/fsd-stuart' }, reviews, reviewRequests: [], statusCheckRollup: [], mergeable: 'MERGEABLE', mergeCommit: null, url: 'u' });
  const rv = (who, state, oid) => ({ id: `${who}${state}`, author: { login: `fsd-${who}` }, state, commit: oid ? { oid } : null });
  const x = world({ decide: 'dump', board: { 1: COL.devReady, 2: COL.review, 3: COL.backlog, 4: COL.backlog, 5: 'Coluna que não existe', 6: COL.devReady, 7: COL.review },
    issues: { 1: issue(1), 2: issue(2), 3: issue(3, { labels: [] }), 4: issue(4), 5: issue(5), 6: issue(6, { labels: [{ name: 'blocked' }, { name: 'size:M' }] }), 7: issue(7) },
    prs: { 20: pr(20, 'Closes #2', [rv('mel', 'APPROVED', 'h1'), rv('bob', 'APPROVED', 'velho')]), 21: pr(21, 'Closes #7', [rv('mel', 'DISMISSED', 'h1'), rv('bob', 'CHANGES_REQUESTED', 'h1')]) } });
  ok(x.run(['round']), /0 ação\(ões\), 0 feita\(s\)\n/); const c = Object.fromEntries(x.state().cards.map((k) => [k.n, k]));
  assert.deepEqual(c[1], { n: 1, column: 'devReady', blocked: false });
  assert.deepEqual(c[2], { n: 2, column: 'review', blocked: false, pr: 20, head: 'h1', reviewedBy: ['mel'] });   // a do Bob é de outro head
  assert.deepEqual(c[7].reviewedBy, ['bob']);                                                                    // DISMISSED não conta
  assert.deepEqual(c[3], { n: 3, column: 'backlog', blocked: false, unsized: true }); assert.equal(c[4].unsized, undefined);
  assert.equal(c[5], undefined); assert.equal(c[6].blocked, true);
  const s = x.state(); assert.equal(s.paused, false); assert.equal(s.budgetOk, true); assert.equal(s.maxConcurrent, 1); assert.deepEqual(s.messages, []); assert.deepEqual(s.deadlocks, []);
});

test('gather: CI green after the two approvals → the supervisor takes the card to Ready to Merge; --dry, pending CI or one approval do not move it', () => {
  const ci = (over = {}) => ['build', 'test', 'paths', 'shellcheck'].map((name) => ({ workflowName: 'regression', name, status: 'COMPLETED', conclusion: 'SUCCESS', ...(name === 'paths' ? over : {}) }));
  const rv = (who) => ({ id: who, author: { login: `fsd-${who}` }, state: 'APPROVED', commit: { oid: 'h1' }, submittedAt: '2026-11-21T11:00:00Z' });
  const mk = (over, whos = ['mel', 'bob']) => world({ decide: 'dump', board: { 2: COL.review }, issues: { 2: issue(2) }, prs: { 20: { number: 20, title: 'p', body: 'Closes #2', state: 'OPEN', isDraft: false, baseRefName: 'develop', headRefName: 'b', headRefOid: 'h1', author: { login: 'app/fsd-stuart' }, reviews: whos.map(rv), reviewRequests: [], statusCheckRollup: ci(over), mergeable: 'MERGEABLE', mergeCommit: null, url: 'u' } } });
  const at = (x) => json(join(x.st, 'board.json'))[2]; const column = (x) => x.state().cards[0].column;
  let x = mk(); ok(x.run(['round'])); assert.equal(column(x), 'mergeReady'); assert.equal(x.state().cards[0].blocked, false); assert.equal(at(x), COL.mergeReady);
  x = mk(); ok(x.run(['round', '--dry'])); assert.equal(at(x), COL.review);
  x = mk(); const f = join(x.st, 'gh.json'), g = json(f); g.prs[20].reviewDecision = 'REVIEW_REQUIRED'; writeFileSync(f, JSON.stringify(g));   // falta o code owner
  ok(x.run(['round'])); assert.equal(at(x), COL.mergeReady); assert.equal(x.state().cards[0].blocked, true);
  for (const y of [mk({ status: 'IN_PROGRESS', conclusion: '' }), mk({ conclusion: 'FAILURE' }), mk({}, ['mel'])]) { ok(y.run(['round'])); assert.equal(column(y), 'review'); assert.equal(at(y), COL.review); }
});

test('gather: the round records the column changes and the cost of a closed turn; --dry records nothing; a failure there does not stop the round', () => {
  const mk = () => { const x = world({ decide: 'dump', board: { 2: COL.dev }, issues: { 2: issue(2) } }); writeFileSync(join(x.st, 'cost.json'), JSON.stringify({ session: 's', model: 'm', usd: 0.2, ms: 1000 })); return x; };
  const log = (x, f) => { try { return readFileSync(join(x.st, f), 'utf8').trim().split('\n').map((l) => JSON.parse(l)); } catch { return []; } };
  let x = mk(); ok(x.run(['round', '--dry'])); assert.deepEqual([log(x, 'colunas.jsonl'), log(x, 'consumo.jsonl')], [[], []]);
  ok(x.run(['round'])); ok(x.run(['round'])); assert.deepEqual(log(x, 'colunas.jsonl').map((c) => [c.n, c.from, c.to]), [[2, null, 'dev']]); assert.ok(log(x, 'consumo.jsonl').every((c) => c.usd === 0.2 && c.model === 'm'));
  x = mk(); mkdirSync(join(x.st, 'colunas.jsonl')); ok(x.run(['round']), /consumo não registrado: EISDIR/);
});

test('gather: a PullRequest item is not a card; an empty answer of gh and an issue without labels are fine', () => {
  const x = world({ decide: 'dump', gh: 'case "$*" in "issue list"*) echo null; exit 0;; esac', cmds: { 'fsd-board': `echo '[{"column":"${COL.review}","number":9,"type":"PullRequest"},{"column":"${COL.backlog}","number":3,"type":"Issue"}]'` } });
  ok(x.run(['round'])); assert.deepEqual(x.state().cards, [{ n: 3, column: 'backlog', blocked: false, unsized: true }]);
  const y = world({ decide: 'dump', gh: `case "$*" in "issue list"*) echo '[{"number":3}]'; exit 0;; esac`, board: { 3: COL.backlog } });
  ok(y.run(['round'])); assert.equal(y.state().cards[0].unsized, true);
});

test('gather: the board fails → the round fails with the reason; garbage in the board is not an empty board', () => {
  for (const [body, re] of [['echo "quadro fora" >&2; exit 4', /fsd-board list falhou: .*quadro fora/], ['echo lixo', /JSON|lixo/]]) {
    const x = world({ decide: 'dump', cmds: { 'fsd-board': body } }); const r = x.run(['round']);
    assert.notEqual(r.status, 0); assert.match(r.stdout, re); assert.equal(x.state(), undefined);
  }
});

test('gather: PAUSE, and the account usage over the limit, reach decide', () => {
  const p = world({ decide: 'dump' }); writeFileSync(join(p.st, 'PAUSE'), ''); ok(p.run(['round'])); assert.equal(p.state().paused, true);
  const u = world({ decide: 'dump' }); writeFileSync(join(u.st, 'usage.json'), JSON.stringify({ fetchedAt: Date.now(), five_hour: { utilization: 95 } })); ok(u.run(['round'])); assert.equal(u.state().budgetOk, false);
  const b = world({ decide: 'dump', agents: (c) => { delete c.claude_common.usage; } }); const r = b.run(['round']);   // freio ilegível: a rodada falha, não segue sem freio
  assert.notEqual(r.status, 0); assert.match(r.stdout, /sem refreshSeconds\/stopPct/); assert.equal(b.state(), undefined);
});

test('gather: the limit of the end of the day: dispatch.endOfDayAt, else context.restartAbove, else 0', () => {
  const at = (agents) => { const x = world({ decide: 'dump', agents }); ok(x.run(['round'])); return x.state().endOfDayAt; };
  assert.equal(at((c) => { c.dispatch.endOfDayAt = 777; }), 777);
  assert.equal(at((c) => { delete c.dispatch.endOfDayAt; c.claude_common.context.restartAbove = 555; }), 555);
  assert.equal(at((c) => { delete c.dispatch.endOfDayAt; delete c.claude_common.context; }), 0);
  assert.equal(at((c) => { delete c.dispatch.endOfDayAt; delete c.claude_common.context.restartAbove; }), 0);
});

test('gather: without "dispatch" in agents.json the round still runs', () => {
  const x = world({ decide: 'dump', agents: (c) => { delete c.dispatch; } }); ok(x.run(['round'])); assert.equal(x.state().maxConcurrent, 1); assert.equal(x.state().offline, 'byUrgency');
});

test('gather: sessions on, working and off; context from the hook, else from the transcript; end-of-day marks', () => {
  const x = world({ decide: 'dump' });
  x.put('sessions.json', { kevin: { sessionId: 'sk' }, mel: { sessionId: 'sm' }, stuart: { sessionId: 'ss' }, bob: { sessionId: 'sb' } });
  x.live([{ id: 'aa1', name: 'kevin', sessionId: 'sk' }, { id: 'aa2', name: 'mel', sessionId: 'sm' }, { id: 'aa3', name: 'stuart', sessionId: 'ss' }]);
  const hs = join(x.st, 'session-state'); mkdirSync(hs);
  writeFileSync(join(hs, 'kevin.json'), JSON.stringify({ state: 'working', session_id: 'sk', ctx: 1234 }));
  writeFileSync(join(hs, 'mel.json'), JSON.stringify({ state: 'idle', session_id: 'outra', ctx: 9 }));
  const pj = join(x.home, '.claude', 'projects'); mkdirSync(join(pj, 'a'), { recursive: true }); mkdirSync(join(pj, 'b'));
  writeFileSync(join(pj, 'b', 'sm.jsonl'), JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 40, output_tokens: 2 } } }) + '\n');
  x.put('eod.json', { mel: { asks: 1 }, stuart: { gaveUp: true } });
  ok(x.run(['round'])); const s = x.state().sessions;
  assert.deepEqual(s.kevin, { state: 'working', id: 'aa1', sessionId: 'sk', ctx: 1234 });
  assert.deepEqual(s.mel, { state: 'idle', id: 'aa2', sessionId: 'sm', eod: true, ctx: 42 });
  assert.deepEqual(s.stuart, { state: 'idle', id: 'aa3', sessionId: 'ss', eodHold: true });   // sem transcript
  assert.deepEqual(s.bob, { state: 'off', sessionId: 'sb' });
  // a pasta dos transcripts também vem do CLAUDE_CONFIG_DIR; sem a pasta, sem contexto e sem erro
  const cc = join(x.w, 'cc'); mkdirSync(join(cc, 'projects', 'p'), { recursive: true }); writeFileSync(join(cc, 'projects', 'p', 'sm.jsonl'), JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 7 } } }) + '\n');
  ok(x.run(['round'], { CLAUDE_CONFIG_DIR: cc })); assert.equal(x.state().sessions.mel.ctx, 7);
  ok(x.run(['round'], { CLAUDE_CONFIG_DIR: join(x.w, 'nada') })); assert.equal(x.state().sessions.mel.ctx, undefined);
});

test('gather (R25): a live copy that is not the stored conversation is stopped and does not count; --dry only says so', () => {
  const mk = () => { const x = world({ decide: 'dump' }); x.put('sessions.json', { mel: { sessionId: 'certa' } });
    x.live([{ id: 'bad1', name: 'mel', sessionId: 'orfa' }, { id: 'ok1', name: 'mel', sessionId: 'certa' }, { id: 'out1', name: 'alguem', sessionId: 'z' }, { id: 'kev1', name: 'kevin', sessionId: 'sem-gravada' }]); return x; };
  const d = mk(); ok(d.run(['round', '--dry']), /cópia órfã de mel \(bad1\) seria parada/); assert.equal(d.stub().sessions.find((s) => s.id === 'bad1').alive, true);
  const x = mk(); ok(x.run(['round']), /cópia órfã de mel \(bad1\) parada/);
  assert.deepEqual(x.stub().sessions.filter((s) => !s.alive).map((s) => s.id), ['bad1']); assert.equal(x.state().sessions.mel.id, 'ok1');
});

// O caso de 2026-11-24: o daemon aposentou o Stuart ocioso e a linha ficou (blocked, sem pid). Contava como ligada, o turno fazia stop,
// que falha sempre, e o card não saiu por 3 horas (151 falhas).
const DEAD = { id: 'ef62', name: 'stuart', sessionId: 'ss', dead: true, prompts: ['a'], context: [] };
test('gather: a row without pid and status is off, keeps the context the hook saved, and as an orphan is left alone', () => {
  const x = world({ decide: 'dump' }); x.put('sessions.json', { stuart: { sessionId: 'ss' } }); x.live([DEAD]);
  mkdirSync(join(x.st, 'session-state')); writeFileSync(join(x.st, 'session-state', 'stuart.json'), JSON.stringify({ state: 'idle', session_id: 'ss', ctx: 149003 }));
  ok(x.run(['round'])); assert.deepEqual(x.state().sessions.stuart, { state: 'off', sessionId: 'ss', ctx: 149003 });
  x.put('sessions.json', { stuart: { sessionId: 'outra' } }); assert.doesNotMatch(ok(x.run(['round'])).stdout, /órfã/); assert.equal(x.state().sessions.stuart.ctx, undefined);
});
test('turn: a dead row does not block it (no stop); fresh opens a new conversation that reads the handoff and clears the end-of-day mark', () => {
  for (const fresh of [false, true]) {
    const { x, r } = act({ type: 'turn', to: 'stuart', how: 'wake', ...(fresh ? { fresh } : {}), task: { key: 'correcao:#1', kind: 'correcao', n: 1 }, ids: [] }, { issues: { 1: issue(1) },
      before: (w) => { w.put('sessions.json', { stuart: { sessionId: 'ss', active: true } }); w.put('eod.json', { stuart: { asks: 1 }, mel: { asks: 2 } }); w.live([DEAD]); } });
    ok(r, /1 feita/); const all = x.stub(); assert.ok(!all.calls.some((c) => c[0] === 'stop'));
    const s = all.sessions.at(-1); assert.equal(s.copyOf, fresh ? undefined : 'ss'); assert.equal(/Sessão nova/.test(s.prompts.at(-1)), fresh);
    assert.equal(x.get('sessions.json').stuart.sessionId, s.sessionId); assert.deepEqual(x.get('eod.json'), fresh ? { mel: { asks: 2 } } : { stuart: { asks: 1 }, mel: { asks: 2 } });
  }
});

test('gather: an interactive session of the same name is not touched', () => {
  const x = world({ decide: 'dump' }); exe(join(x.w, 'claude'), `echo '[{"id":"i1","kind":"interactive","name":"mel","sessionId":"orfa"}]'`); x.put('sessions.json', { mel: { sessionId: 'certa' } });
  const r = ok(x.run(['round'], { FSD_CLAUDE: join(x.w, 'claude') })); assert.doesNotMatch(r.stdout, /órfã/); assert.equal(x.state().sessions.mel.state, 'off');
});

test('gather (R12): PAUSE.request of a role becomes the PAUSE of the team; --dry leaves it; a failure keeps the request for the next round', () => {
  const mk = () => { const x = world({ decide: 'dump' }); const root = join(x.w, 'root'); for (const r of ['kevin', 'mel', 'stuart', 'bob']) mkdirSync(join(root, r), { recursive: true }); writeFileSync(join(root, 'bob', 'PAUSE.request'), 'x'); return { x, root, req: join(root, 'bob', 'PAUSE.request'), env: { FSD_STATE_ROOT: root } }; };
  const d = mk(); ok(d.x.run(['round', '--dry'], d.env)); assert.ok(existsSync(d.req)); assert.equal(existsSync(join(d.root, 'PAUSE')), false);
  const a = mk(); ok(a.x.run(['round'], a.env), /bob bateu no limite da conta: PAUSE do time/); assert.equal(existsSync(a.req), false); assert.ok(existsSync(join(a.root, 'PAUSE'))); assert.equal(a.x.state().paused, true);
  const f = mk(); symlinkSync(join(f.root, 'nao', 'existe'), join(f.root, 'PAUSE')); ok(f.x.run(['round'], f.env), /pausa pedida por bob falhou: ENOENT/); assert.ok(existsSync(f.req));
});

// O remetente é o dono do arquivo: rodando como fsd-<papel>, todos os arquivos do teste seriam desse papel.
test('gather: messages of the outbox reach decide; a bad one is refused, with or without a known sender', { skip: /^fsd-/.test(userInfo().username) }, () => {
  const x = world({ decide: 'dump' }); const box = (r, f, v) => { mkdirSync(join(x.st, 'outbox', r), { recursive: true }); writeFileSync(join(x.st, 'outbox', r, f), typeof v === 'string' ? v : JSON.stringify(v)); };
  box('mel', '1.json', { to: 'stuart', text: 'oi', urgent: true }); box('mel', '2.json', { to: 'mel', text: 'eu mesma' }); box('mel', '3.json', '{lixo'); box('zeca', '4.json', { to: 'mel', text: 'x' });
  const r = ok(x.run(['round']));
  assert.deepEqual(x.state().messages.map((m) => [m.id, m.from, m.to, m.text, m.urgent]), [['1', 'mel', 'stuart', 'oi', true]]);
  assert.match(r.stdout, /mensagem recusada \(mel\): .*para si mesmo/); assert.match(r.stdout, /mensagem recusada \(\?\): ilegível/); assert.match(r.stdout, /mensagem recusada \(\?\): remetente desconhecido/);
});

const lease = (x, a, f, ref, ago) => { mkdirSync(join(x.st, 'leases'), { recursive: true }); writeFileSync(join(x.st, 'leases', `${a}.json`), JSON.stringify({ agent: a, for: f, what: 'w', ref, since: new Date(T0 - ago * MIN).toISOString(), until: new Date(T0 + 60 * MIN).toISOString() })); };
const quiet = `case "$*" in "api repos/"*) echo '{"updated_at":"2026-11-20T00:00:00Z"}'; exit 0;; esac`;
test('gather: a cycle of waits is a deadlock for decide; a stalled wait tells Kevin once, and again if it comes back', () => {
  const x = world({ decide: 'dump', gh: quiet }); lease(x, 'mel', 'bob', '#5', 120); lease(x, 'bob', 'mel', '#5', 120);
  ok(x.run(['round'])); assert.deepEqual(x.state().deadlocks.map((d) => d.ref), ['#5']);
  const y = world({ decide: 'dump', gh: quiet }); lease(y, 'mel', 'bob', '#6', 120);
  ok(y.run(['round', '--dry'])); assert.deepEqual(y.inbox('kevin'), []); assert.equal(y.get('stalled.json'), undefined);
  ok(y.run(['round'])); ok(y.run(['round'])); assert.equal(y.inbox('kevin').length, 1); assert.match(y.inbox('kevin')[0], /STALLED #6.*\(parado; ninguém em ciclo\)/);
  rmSync(join(y.st, 'leases', 'mel.json')); ok(y.run(['round'])); assert.deepEqual(y.get('stalled.json'), {});
  lease(y, 'mel', 'bob', '#6', 120); ok(y.run(['round'])); assert.equal(y.inbox('kevin').length, 2);
});

// O resultado do juiz (R28).
const judging = (st = 'running', agoMin = 1) => ({ '#5': { at: T0 - agoMin * MIN, state: st } });
const judged = ({ out, done, j = judging(), dry = false, agents }) => { const x = world({ decide: 'dump', agents }); x.put('judging.json', j); mkdirSync(join(x.D, 'judge')); if (out !== undefined) writeFileSync(join(x.D, 'judge', '5.out'), out); if (done !== undefined) writeFileSync(join(x.D, 'judge', '5.done'), done); ok(x.run(dry ? ['round', '--dry'] : ['round'])); return x; };
test('judge result: decided → judged, Kevin told, files gone, never sent again', () => {
  const x = judged({ out: 'fsd-judge: ok', done: '0\n' }); assert.deepEqual(x.get('judged.json'), ['#5']); assert.deepEqual(x.get('judging.json'), {});
  assert.match(x.inbox('kevin')[0], /^#5: o juiz decidiu/); assert.equal(existsSync(join(x.D, 'judge', '5.done')), false); assert.equal(existsSync(join(x.D, 'judge', '5.out')), false); assert.deepEqual(x.state().judged, ['#5']);
  assert.match(judged({ done: '0\n' }).inbox('kevin')[0], /o juiz decidiu/);   // sem o .out
});
test('judge result: author decision → Kevin gets the comment to post, whole even without the marker', () => {
  const a = judged({ out: 'fsd-judge: author decision needed\nresto\n**Deadlock: author decision needed**\ncorpo', done: '0' });
  assert.match(a.inbox('kevin')[0], /^\[urgente\] #5: o juiz pede a decisão do autor.*\n\*\*Deadlock: author decision needed\*\*\ncorpo$/); assert.doesNotMatch(a.inbox('kevin')[0], /resto/);
  const b = judged({ out: 'fsd-judge: author decision needed\nsem marcador XYZ', done: '0' }); assert.match(b.inbox('kevin')[0], /fsd-judge: author decision needed\nsem marcador XYZ$/);
  assert.equal(judged({ out: `fsd-judge: author decision needed\n**Deadlock ${'x'.repeat(6000)}`, done: '0' }).inbox('kevin')[0].length, 4000);
});
test('judge result: failed → Kevin told with the first line, the ref waits 30 min and goes back', () => {
  const x = judged({ out: 'quebrou\nmais', done: '3\n' }); assert.equal(x.get('judging.json')['#5'].state, 'failed'); assert.match(x.inbox('kevin')[0], /\[urgente\] #5: o juiz falhou \(exit 3\): quebrou$/); assert.equal(x.get('judged.json'), undefined); assert.deepEqual(x.state().judged, ['#5']);
  assert.deepEqual(judged({ j: judging('failed', 29) }).get('judging.json'), judging('failed', 29)); assert.deepEqual(judged({ j: judging('failed', 31) }).get('judging.json'), {});
});
test('judge result: a .done still empty or unreadable is not a decision: it waits', () => {
  for (const done of ['', '\n', 'lixo']) { const x = judged({ out: 'a meio', done }); assert.equal(x.get('judged.json'), undefined); assert.deepEqual(x.get('judging.json'), judging()); assert.deepEqual(x.inbox('kevin'), []); assert.ok(existsSync(join(x.D, 'judge', '5.out'))); }
});
test('judge result: still running waits; past twice the deadline it fails and Kevin is told; the deadline comes from the config', () => {
  const none = judged({}); assert.deepEqual(none.get('judging.json'), judging()); assert.deepEqual(none.inbox('kevin'), []);
  const late = judged({ j: judging('running', 21) }); assert.equal(late.get('judging.json')['#5'].state, 'failed'); assert.match(late.inbox('kevin')[0], /o juiz não terminou no prazo/);
  assert.equal(judged({ done: 'lixo', j: judging('running', 21) }).get('judging.json')['#5'].state, 'failed');   // .done ilegível também vence
  const cfg0 = (c) => { c.timing.judge.timeoutMin = 30; }; assert.equal(judged({ j: judging('running', 59), agents: cfg0 }).get('judging.json')['#5'].state, 'running'); assert.equal(judged({ j: judging('running', 61), agents: cfg0 }).get('judging.json')['#5'].state, 'failed');
});
test('judge result: --dry changes nothing', () => {
  const x = judged({ out: 'fsd-judge: ok', done: '0', dry: true }); assert.equal(x.get('judged.json'), undefined); assert.deepEqual(x.get('judging.json'), judging()); assert.ok(existsSync(join(x.D, 'judge', '5.done'))); assert.deepEqual(x.inbox('kevin'), []);
});

// ── As ações ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const msg = (x, id, to, text, o = {}) => { const d = join(x.st, 'outbox', 'mel'); mkdirSync(d, { recursive: true }); const file = join(d, `${id}.json`); writeFileSync(file, '{}'); return { id, file, from: 'mel', to, text, ...o }; };
const withMsgs = (a, ids, cmds) => { const x = world({ decide: [a], cmds, issues: { 5: issue(5) } }); const messages = ids.map((i) => msg(x, i, a.to, `texto ${i}`)); const r = x.run(['round'], x.fixture({ messages })); return { x, r, end: x.journal().at(-1), left: messages.filter((m) => existsSync(m.file)).map((m) => m.id) }; };
test('exec inbox: delivers only the messages of the action and takes them out of the outbox', () => {
  const { x, r, end } = withMsgs({ type: 'inbox', to: 'bob', ids: ['1', '2'] }, ['1', '2', '3'], {}); ok(r, /1 ação\(ões\), 1 feita\(s\)\n/);
  assert.deepEqual(x.inbox('bob'), ['texto 1', 'texto 2']); assert.equal(end.result, '2 na caixa de bob'); assert.ok(existsSync(join(x.st, 'outbox', 'mel', '3.json')));
});
test('exec hold (R5): delivers nothing', () => { const { x, end, left } = withMsgs({ type: 'hold', to: 'bob', ids: ['1'], why: 'PAUSE' }, ['1'], {}); assert.deepEqual(left, ['1']); assert.deepEqual(x.inbox('bob'), []); assert.equal(end.result, '1 esperando bob (PAUSE)'); });
test('exec turn with messages: they go in the prompt and leave the outbox only if the turn opened', () => {
  const a = { type: 'turn', to: 'bob', how: 'wake', ids: ['1'] };
  const y = withMsgs(a, ['1'], { 'fsd-session': 'echo aberto' }); assert.deepEqual(y.left, []); assert.equal(y.end.result, 'aberto'); assert.match(y.x.calls().join('\n'), /fsd-session\|\|turn bob [\s\S]*texto 1/);
  const n = withMsgs(a, ['1'], { 'fsd-session': 'echo "preflight recusou" >&2; exit 1' }); ok(n.r, /1 falharam/); assert.deepEqual(n.left, ['1']); assert.equal(n.end.phase, 'failed'); assert.equal(n.end.error, 'preflight recusou');
});
const task = { type: 'turn', to: 'stuart', how: 'wake', task: { key: 'entrega-codigo:#5', kind: 'entrega-codigo', n: 5 }, ids: [] };
test('exec turn with a task: the card is saved before the call; a refused turn restores the card of before and the task goes back', () => {
  const y = act(task, { cmds: { 'fsd-session': 'echo aberto' }, issues: { 5: issue(5) } }); ok(y.r); assert.equal(y.x.get('tasks.json').stuart.n, 5); assert.match(y.x.calls()[0], /fsd-session\|\|turn stuart/);
  const T = (x) => { const r = spawnSync(process.execPath, ['--input-type=module', '-e', `const T=await import(${JSON.stringify(join(x.bin, 'fsd-task.mjs'))});console.log(JSON.stringify(T.snapshot('stuart')))`], { encoding: 'utf8', env: x.base }); return JSON.parse(r.stdout); };
  assert.match(T(y.x).card, /#5/);
  const x = world({ decide: [task], cmds: { 'fsd-session': 'echo recusado; exit 1' }, issues: { 5: issue(5) } }); const before = T(x);
  ok(x.run(['round'], x.fixture()), /1 falharam/); assert.deepEqual(T(x), before); assert.equal(x.get('tasks.json').stuart, undefined);
  x.put('tasks.json', { stuart: { key: 'k', kind: 'correcao', n: 4, at: T0 } }); ok(x.run(['round'], x.fixture({ sessions: { stuart: { state: 'working' } } }))); assert.equal(x.get('tasks.json').stuart.n, 4);   // devolve a anterior
  const none = act(task, { cmds: { 'fsd-session': 'echo aberto' }, issues: { 5: issue(5, { body: 'sem critério' }) } }); ok(none.r); assert.equal(none.end.phase, 'done');
});

test('exec endofday: marks, asks and counts; a refused turn takes the mark back', () => {
  const a = { type: 'endofday', to: 'mel', id: 'a1' };
  const y = act(a, { cmds: { 'fsd-session': 'exit 0' } }); assert.equal(y.end.result, 'fim do dia pedido'); assert.match(y.x.calls()[0], /turn mel \[fsd-fim-do-dia\]/); assert.ok(existsSync(join(y.x.st, 'session-state', 'mel.eod')));
  assert.deepEqual(y.x.get('eod.json').mel, { sessionId: null, at: T0, asks: 1 });
  const z = act(a, { cmds: { 'fsd-session': 'exit 0' }, before: (x) => { x.put('eod.json', { mel: { asks: 2 } }); x.put('sessions.json', { mel: { sessionId: 'sm' } }); } }); assert.deepEqual(z.x.get('eod.json').mel, { sessionId: 'sm', at: T0, asks: 3 });
  const n = act(a, { cmds: { 'fsd-session': 'echo ocupado >&2; exit 1' } }); assert.equal(n.end.error, 'ocupado'); assert.equal(existsSync(join(n.x.st, 'session-state', 'mel.eod')), false); assert.equal(n.x.get('eod.json'), undefined);
});

// Repositório com o worktree da Mel: sujo (mudança sem commit) e/ou com commit sem push.
const git = (cwd, ...a) => { const r = spawnSync('git', ['-C', cwd, '-c', 'user.name=s', '-c', 'user.email=s@s', ...a], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); };
const wt = (x, { dirty, ahead, off }) => { const p = join(x.w, 'roles-mel', 'wt'); mkdirSync(dirname(p)); git(x.repo, 'init', '-q', '-b', 'develop'); git(x.repo, 'commit', '-q', '--allow-empty', '-m', 'a');
  git(x.w, 'clone', '-q', '--bare', x.repo, join(x.w, 'o.git')); git(x.repo, 'remote', 'add', 'origin', join(x.w, 'o.git')); git(x.repo, 'fetch', '-q', 'origin'); git(x.repo, 'worktree', 'add', '-q', '-b', 'fix/1-a', p);
  if (ahead) git(p, 'commit', '-q', '--allow-empty', '-m', 'b'); if (dirty) writeFileSync(join(p, 'f'), 'x'); if (off) rmSync(p, { recursive: true }); };
const RET = { type: 'retire', to: 'mel', id: 'a1' };
const retire = (s, o = {}) => act(RET, { ...o, cmds: { 'fsd-session': 'echo feito', ...(o.cmds || {}) }, before: (x) => { x.base.FSD_ROLE_HOME_PREFIX = `${x.w}/roles-`; if (s) wt(x, s); x.put('eod.json', { mel: { asks: 1 }, bob: { asks: 1 } }); x.put('tasks.json', { mel: { key: 'k', n: 1, at: T0 }, bob: { key: 'b', n: 2, at: T0 } }); mkdirSync(join(x.st, 'session-state')); writeFileSync(join(x.st, 'session-state', 'mel.eod'), 'x'); (o.more || (() => {}))(x); } });
test('exec retire: nothing left on the disk → retired; the marks and the task of the role are cleared, the others stay', () => {
  const { x, end } = retire({}, {}); assert.equal(end.result, 'aposentado'); assert.deepEqual(x.calls(), ['fsd-session||retire mel']); assert.deepEqual(x.get('eod.json'), { bob: { asks: 1 } }); assert.deepEqual(Object.keys(x.get('tasks.json')), ['bob']); assert.equal(existsSync(join(x.st, 'session-state', 'mel.eod')), false);
  const f = retire({}, { cmds: { 'fsd-session': 'echo "não deu"; exit 1' } }); assert.equal(f.end.error, 'não deu'); assert.deepEqual(Object.keys(f.x.get('eod.json')), ['mel', 'bob']); assert.ok(f.x.get('tasks.json').mel);
});
test('exec retire: work only on the disk → not retired, asked again (up to 3), then Kevin once', () => {
  for (const [s, re] of [[{ dirty: 1 }, /fix\/1-a \(1 mudança\(s\) sem commit\)/], [{ ahead: 1 }, /fix\/1-a \(1 commit\(s\) sem push\)/], [{ dirty: 1, ahead: 1 }, /1 mudança\(s\) sem commit, 1 commit\(s\) sem push/], [{ off: 1 }, /sem acesso para conferir/]]) {
    const { x, end } = retire(s); assert.match(end.result, /^não aposentado: /); assert.match(end.result, re); assert.match(x.calls().join('\n'), /turn mel \[fsd-fim-do-dia\]/); assert.match(x.calls().join('\n'), /Ainda só no disco: /); assert.equal(x.get('eod.json').mel.asks, 2); assert.ok(x.get('tasks.json').mel);
  }
  const no = retire({ dirty: 1 }, { more: (x) => x.put('eod.json', {}) }); assert.equal(no.x.get('eod.json').mel.asks, 1);
  const bad = retire({ dirty: 1 }, { cmds: { 'fsd-session': 'echo ocupada; exit 1' } }); assert.match(bad.end.result, /^não aposentado: .* \(pedido falhou\)$/); assert.doesNotMatch(retire({ dirty: 1 }).end.result, /pedido falhou/);
  const dead = retire({ dirty: 1 }, { cmds: { 'fsd-session': 'kill -9 $$' } }); assert.match(dead.end.result, /\(pedido falhou\)$/);
  const up = retire({ dirty: 1 }, { more: (x) => x.put('eod.json', { mel: { asks: 3 } }) }); assert.deepEqual(up.x.calls(), []); assert.equal(up.x.get('eod.json').mel.gaveUp, true); assert.match(up.x.inbox('kevin')[0], /mel não consegue fechar o dia: fix\/1-a/);
  const again = retire({ dirty: 1 }, { more: (x) => x.put('eod.json', { mel: { asks: 3, gaveUp: true } }) }); assert.deepEqual(again.x.inbox('kevin'), []);
});
const sudo = (x, body) => { exe(join(x.w, 'sudo'), `printf 'sudo|%s|%s\\n' "$FSD_AGENT" "$*" >> ${join(x.w, 'calls')}\n${body}`); };
test('exec retire in the container (R11): the role itself says what is unsaved; an unreadable answer never retires', () => {
  const via = (unsaved) => { const x = world({ decide: [RET], cmds: { 'fsd-session': 'echo feito' } }); sudo(x, `case "$*" in *unsaved*) ${unsaved};; *) echo "[]";; esac`); x.put('eod.json', { mel: { asks: 1 } }); x.run(['round'], { ...x.fixture(), FSD_SESSION_VIA: 'sudo', PATH: `${x.w}:${process.env.PATH}` }); return x; };
  assert.equal(via('echo "[]"').journal().at(-1).result, 'aposentado');
  for (const b of ['echo lixo', 'exit 1']) assert.match(via(b).journal().at(-1).result, /não aposentado: \? \(sem acesso para conferir\)/);
  assert.match(via('echo \'[{"branch":"b","dirty":2,"ahead":0}]\'').calls().find((c) => /unsaved/.test(c)), /sudo\|\|-n -u fsd-mel .*fsd-session-exec unsaved/);
});

test('exec merge: as Kevin; 0, 1 and 3 are answers of the gate, anything else is a failure', () => {
  const m = (code) => act({ type: 'merge', n: 80 }, { cmds: { 'fsd-merge': `echo "resposta ${code}"; exit ${code}` } });
  for (const c of [0, 1, 3]) { const { x, end } = m(c); assert.equal(end.phase, 'done'); assert.equal(end.result, `resposta ${c}`); assert.deepEqual(x.calls(), ['fsd-merge|kevin|80']); }
  for (const c of [2, 4]) { const { r, end } = m(c); ok(r, /1 falharam/); assert.equal(end.phase, 'failed'); assert.equal(end.error, `resposta ${c}`); }
});
const waitFor = (f) => { for (let i = 0; i < 100 && !existsSync(f); i++) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50); return readFileSync(f, 'utf8').trim(); };
test('exec judge: as Kevin, with only the waits of the ref; output and exit are kept, old ones gone, and the next round reads them', () => {
  const x = world({ decide: [{ type: 'judge', ref: '#5' }], cmds: { 'fsd-judge': 'echo "fsd-judge: ok"; cat "$FSD_JUDGE_WAITS_FILE"; exit 0' } });
  lease(x, 'mel', 'bob', '#5', 60); lease(x, 'kevin', 'bob', '#9', 60); mkdirSync(join(x.D, 'judge')); writeFileSync(join(x.D, 'judge', '5.done'), '9');
  ok(x.run(['round'], x.fixture())); assert.equal(x.journal().at(-1).result, 'juiz chamado'); assert.equal(x.get('judging.json')['#5'].state, 'running');
  assert.equal(waitFor(join(x.D, 'judge', '5.done')), '0'); const out = readFileSync(join(x.D, 'judge', '5.out'), 'utf8'); assert.match(out, /"ref":"#5"/); assert.doesNotMatch(out, /#9/); assert.deepEqual(x.calls(), ['fsd-judge|kevin|5']);
  ok(x.run(['round'])); assert.deepEqual(x.get('judged.json'), ['#5']);
});
test('exec judge in the container: by the wrapper, as fsd-kevin', () => {
  const x = world({ decide: [{ type: 'judge', ref: '#5' }] }); sudo(x, 'exit 4'); ok(x.run(['round'], { ...x.fixture(), FSD_SESSION_VIA: 'sudo', PATH: `${x.w}:${process.env.PATH}` }));
  assert.equal(waitFor(join(x.D, 'judge', '5.done')), '4'); assert.match(x.calls()[0], /^sudo\|kevin\|-n -u fsd-kevin \/usr\/local\/sbin\/fsd-session-exec judge 5 .*waits\.json$/);
});
test('exec: an unknown action fails by name; the actions after it still run', () => { const { x, r } = act([{ type: 'nada', to: 'mel' }, { type: 'hold', to: 'bob', ids: [], why: 'y' }]); ok(r, /2 ação\(ões\), 1 feita\(s\), 1 falharam/); assert.deepEqual(x.journal().map((e) => e.phase), ['intent', 'failed', 'intent', 'done']); assert.match(x.journal()[1].error, /ação desconhecida: nada/); });
test('--dry and FSD_DRY print the actions and run none', () => {
  for (const [args, env] of [[['round', '--dry'], {}], [['round'], { FSD_DRY: '1' }]]) { const x = world({ decide: [{ type: 'merge', n: 8 }], cmds: { 'fsd-merge': 'exit 0', 'fsd-admit': 'exit 0' } }); ok(x.run(args, { ...x.fixture(), ...env }), /\[dry\] \{"type":"merge","n":8\}/); assert.deepEqual(x.calls(), []); }
});

// ── admit, pin, status, loop ────────────────────────────────────────────────────────────────────────────────────────────────────
test('admit (R30): every admitEveryMin, on its own clock; its answer goes to the log except "nothing to do"; not in --dry', () => {
  const x = world({ decide: 'dump', cmds: { 'fsd-admit': 'echo "admitido #1"; echo "mais" >&2' } });
  ok(x.run(['round'], { FSD_DRY: '1' })); assert.deepEqual(x.calls(), []);
  ok(x.run(['round']), /fsd-admit: admitido #1 \| mais/); ok(x.run(['round'], { FSD_NOW: String(T0 + 4 * MIN) })); assert.equal(x.calls().length, 1);
  ok(x.run(['round'], { FSD_NOW: String(T0 + 6 * MIN) })); assert.equal(x.calls().length, 2); assert.equal(readFileSync(join(x.D, 'admit.at'), 'utf8'), String(T0 + 6 * MIN));
  x.put('admit.at', 'lixo'); ok(x.run(['round'])); assert.equal(x.calls().length, 3);
  for (const body of ['echo "nada a fazer"', 'exit 0']) { const y = world({ decide: 'dump', cmds: { 'fsd-admit': body } }); assert.doesNotMatch(ok(y.run(['round'])).stdout, /fsd-admit/); }
  const z = world({ decide: 'dump', cmds: { 'fsd-admit': 'exit 0' }, agents: (c) => { delete c.dispatch.admitEveryMin; } }); ok(z.run(['round'])); ok(z.run(['round'], { FSD_NOW: String(T0 + 4 * MIN) })); assert.equal(z.calls().length, 1);
  const e = world({ decide: 'dump', cmds: { 'fsd-admit': 'echo oi' } }); mkdirSync(join(e.D, 'admit.at')); ok(e.run(['round']), /fsd-admit: oi/);   // sem poder gravar a hora, a rodada segue
  const g = world({ decide: 'dump' }); rmSync(join(g.bin, 'fsd-admit')); ok(g.run(['round']));   // comando ausente: a rodada segue
});
test('pin: from FSD_PIN_SHA or from the HEAD of the repo; a bad sha is refused; status shows the pin, tasks and judge', () => {
  const x = world(); ok(x.run(['status'])); assert.equal(JSON.parse(x.run(['status']).stdout).pin, null);
  ok(x.run(['pin'], { FSD_PIN_SHA: 'abcdef1234' }), /cópia fixada abcdef1 em .*abcdef1234.*\nrode: .*fsd-dispatch loop/);
  git(x.repo, 'init', '-q'); git(x.repo, 'commit', '-q', '--allow-empty', '-m', 'a'); ok(x.run(['pin']), /cópia fixada [0-9a-f]{7}/);
  const y = world(); const r = y.run(['pin']); assert.notEqual(r.status, 0); assert.match(r.stdout, /sha inválido/);
  git(y.w, 'init', '-q'); git(y.w, 'commit', '-q', '--allow-empty', '-m', 'a'); ok(y.run(['pin'], { FSD_REPO: '' }), /cópia fixada [0-9a-f]{7}/);   // sem FSD_REPO, o clone em que o team/ mora
  x.put('tasks.json', { mel: { n: 1 } }); x.put('judged.json', ['#1']); x.put('judging.json', { '#2': 1 }); const s = JSON.parse(ok(x.run(['status'])).stdout); assert.match(s.pin.sha, /^[0-9a-f]{40}$/); assert.deepEqual([s.tasks, s.judged, s.judging], [{ mel: { n: 1 } }, ['#1'], { '#2': 1 }]);
});
test('no command or an unknown one: usage, exit 2', () => { const x = world(); for (const a of [[], ['nada']]) { const r = x.run(a); assert.equal(r.status, 2); assert.match(r.stdout, /uso: fsd-dispatch/); } });
const LIVE = { FSD_DISPATCH_LIVE: '1', FSD_DISPATCH_ROUNDS: '1' };
test('loop: only from the pinned copy; the message says which one is in use', () => {
  const x = world({ decide: 'dump' }); const a = x.run(['loop']); assert.equal(a.status, 1); assert.match(a.stdout, /em uso: nenhuma/);
  ok(x.run(['pin'], { FSD_PIN_SHA: 'abcdef1' })); const b = x.run(['loop']); assert.equal(b.status, 1); assert.match(b.stdout, /em uso: .*abcdef1/);
});
test('loop: one at a time; the pid file is freed at the end; a pid file that cannot be written is said', () => {
  const x = world({ decide: 'dump', cmds: { 'fsd-session': 'echo "boot ok"', 'fsd-admit': 'exit 0' }, agents: (c) => { c.dispatch.loopSeconds = 60; } });
  const p = spawn(join(x.bin, 'fsd-dispatch'), ['loop'], { env: { ...x.base, FSD_DISPATCH_LIVE: '1' }, stdio: 'ignore' });
  try {
    const f = join(x.D, 'dispatch.pid'); waitFor(join(x.w, 'state.dump')); const r = x.run(['loop'], LIVE); assert.equal(r.status, 0); assert.match(r.stdout, new RegExp(`já rodando \\(pid ${p.pid}\\)`)); assert.ok(existsSync(f));
  } finally { p.kill('SIGKILL'); }
  const z = world({ decide: 'dump' }); mkdirSync(join(z.D, 'dispatch.pid')); const q = z.run(['loop'], LIVE); assert.equal(q.status, 0); assert.match(q.stdout, /não consegui o pid file/);
  const y = world({ decide: 'dump', cmds: { 'fsd-session': 'exit 0', 'fsd-admit': 'exit 0' } }); ok(y.run(['loop'], LIVE)); assert.equal(existsSync(join(y.D, 'dispatch.pid')), false);
});
test('loop: SIGTERM, SIGINT and SIGHUP end it with 128+n and free the pid file', async () => {
  for (const [sig, n] of [['SIGTERM', 15], ['SIGINT', 2], ['SIGHUP', 1]]) {
    const x = world({ decide: 'dump', cmds: { 'fsd-session': 'exit 0', 'fsd-admit': 'exit 0' } }); const p = spawn(join(x.bin, 'fsd-dispatch'), ['loop'], { env: { ...x.base, FSD_DISPATCH_LIVE: '1' }, stdio: 'ignore' });
    const end = new Promise((r) => p.on('exit', (c) => r(c))); waitFor(join(x.w, 'state.dump')); p.kill(sig); assert.equal(await end, 128 + n, sig); assert.equal(existsSync(join(x.D, 'dispatch.pid')), false);
  }
});
test('loop: boot of the roles before the first round (R32): the first line, stderr, or "no output"; not in --dry nor with a fixture', () => {
  const b = (body, env = {}) => { const x = world({ decide: 'dump', cmds: { 'fsd-session': body, 'fsd-admit': 'exit 0' } }); return { x, r: ok(x.run(['loop'], { ...LIVE, ...env })) }; };
  const a = b('echo "religou mel"; echo mais'); assert.match(a.r.stdout, /^religou mel\n/); assert.doesNotMatch(a.r.stdout, /mais/); assert.match(a.x.calls()[0], /fsd-session\|\|boot/);
  assert.match(b('echo erro >&2').r.stdout, /^erro\n/); assert.match(b('exit 0').r.stdout, /fsd-session boot: sem saída/);
  assert.deepEqual(b('exit 0', { FSD_DRY: '1' }).x.calls(), []);
  const f = world({ decide: 'dump', cmds: { 'fsd-session': 'exit 0' } }); ok(f.run(['loop'], { ...LIVE, ...f.fixture() })); assert.deepEqual(f.calls(), []);
  const g = world({ decide: 'dump', cmds: { 'fsd-admit': 'exit 0' } }); rmSync(join(g.bin, 'fsd-session')); ok(g.run(['loop'], LIVE), /fsd-session boot: sem saída/);
});
test('loop: what the loop before left without an end is said and marked abandoned', () => {
  const x = world({ decide: 'dump', cmds: { 'fsd-session': 'exit 0', 'fsd-admit': 'exit 0' } }); x.put('journal.jsonl', '{"t":1,"id":"a","phase":"intent","action":{"type":"merge","n":1}}\n');
  ok(x.run(['loop'], LIVE), /1 ação\(ões\) do laço anterior ficaram sem fim/); assert.equal(x.journal().at(-1).phase, 'abandoned');
});
test('loop: loopSeconds between rounds (60 without it)', () => {
  const x = world({ decide: 'dump', cmds: { 'fsd-session': 'exit 0', 'fsd-admit': 'exit 0' }, agents: (c) => { c.dispatch.loopSeconds = 0.3; } }); const t = Date.now(); ok(x.run(['loop'], { ...LIVE, FSD_DISPATCH_ROUNDS: '3' })); assert.ok(Date.now() - t >= 600);
  const y = world({ decide: 'dump', cmds: { 'fsd-session': 'exit 0', 'fsd-admit': 'exit 0' }, agents: (c) => { delete c.dispatch.loopSeconds; } });
  const r = spawnSync('timeout', ['3', join(y.bin, 'fsd-dispatch'), 'loop'], { encoding: 'utf8', env: { ...y.base, FSD_DISPATCH_LIVE: '1', FSD_DISPATCH_ROUNDS: '2' } }); assert.equal(r.status, 124);   // ainda esperando a 2ª
});

test('exec: a called command that says nothing, dies or is missing fails with a reason, for every action that calls one', () => {
  const acts = { turn: [{ type: 'turn', to: 'bob', how: 'wake', ids: [] }, 'fsd-session'], task: [task, 'fsd-session'], endofday: [{ type: 'endofday', to: 'mel' }, 'fsd-session'], retire: [RET, 'fsd-session'], merge: [{ type: 'merge', n: 8 }, 'fsd-merge'] };
  for (const [k, [a, cmd]] of Object.entries(acts)) for (const [how, re] of [['exit 9', /^sem saída \(exit 9\)$/], ['kill -9 $$', /^sem saída \(SIGKILL\)$/], [null, /^sem saída \(ENOENT\)$/]]) {
    const { r, end } = act(a, { issues: { 5: issue(5) }, cmds: how ? { [cmd]: how } : {}, before: (x) => { if (!how) rmSync(join(x.bin, cmd)); git(x.repo, 'init', '-q'); } });
    ok(r, /1 falharam/); assert.equal(end.phase, 'failed', k); assert.match(end.error, re, `${k} ${how}`);
  }
});
test('exec merge: every exit code from 0 to 255 is an answer (0, 1, 3) or a failure', () => {
  const x = world({ decide: Array.from({ length: 256 }, (_, n) => ({ type: 'merge', n })), cmds: { 'fsd-merge': 'echo r; exit $1' } }); ok(x.run(['round'], x.fixture()), /256 ação\(ões\), 3 feita\(s\), 253 falharam/);
  assert.deepEqual(x.journal().filter((e) => e.phase === 'done').map((e) => e.action.n), [0, 1, 3]);
});

test('a task with its delivery made does not expire (R44), by the contract of its kind; without it, after the lease, it goes out again', () => {
  for (const [kind, contract] of [['correcao', 'entrega-codigo'], ['revisao', 'revisao']]) for (const made of [true, false]) {
    const x = world({ decide: 'dump' }); x.put('tasks.json', { mel: { key: 'k', kind, n: 1, at: T0 - 121 * MIN } });
    if (made) { const d = join(x.st, 'entregas', contract); mkdirSync(d, { recursive: true }); writeFileSync(join(d, '1-a.json'), '{}'); }
    ok(x.run(['round'], x.fixture({ sessions: { mel: { state: 'idle' } } }))); assert.equal(x.state().sessions.mel.task?.key, made ? 'k' : undefined, `${kind} ${made}`);
  }
});
test('exec: no messages in the state and no ids in the action are the same as none', () => {
  for (const fx of [{}, { messages: undefined }]) { const { end } = act({ type: 'turn', to: 'bob', how: 'wake' }, { fx, cmds: { 'fsd-session': 'echo aberto' } }); assert.equal(end.result, 'aberto'); }
  const { end } = act({ type: 'turn', to: 'bob', how: 'wake' }, { fx: { messages: [{ id: '1', to: 'bob', file: '/nao' }] }, cmds: { 'fsd-session': 'echo aberto' } }); assert.equal(end.result, 'aberto');
});
test('exec retire: without FSD_REPO, the clone the team/ lives in', () => {
  const x = world({ decide: [RET], cmds: { 'fsd-session': 'echo feito' } }); git(x.w, 'init', '-q'); x.run(['round'], { ...x.fixture(), FSD_REPO: '' }); assert.equal(x.journal().at(-1).result, 'aposentado');
});
test('loop: a round that throws anything (Error, text, nothing) is said in one line and the next one runs', () => {
  for (const [what, re] of [["new Error('um\\ndois')", /rodada falhou: um\n/], ["'texto'", /rodada falhou: texto\n/], ['undefined', /rodada falhou: undefined\n/]]) {
    const x = world({ decide: 'dump', cmds: { 'fsd-session': 'exit 0', 'fsd-admit': 'exit 0' }, agents: (c) => { c.dispatch.loopSeconds = 0.01; } });
    writeFileSync(join(x.bin, 'fsd-dispatch.mjs'), `export * from ${JSON.stringify(join(x.bin, 'real-decide.mjs'))};\nexport const decide = () => { throw ${what}; };\n`);
    const r = ok(x.run(['loop'], { ...LIVE, FSD_DISPATCH_ROUNDS: '2' }), re); assert.equal(r.stdout.match(/rodada falhou/g).length, 2); assert.doesNotMatch(r.stdout, /dois/);
  }
});
