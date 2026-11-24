// fsd-board de verdade contra um GitHub falso (fetch trocado por --import): list, move e rename, com todas as respostas e falhas; e o
// quadro falso (FSD_BOARD_FAKE). Nada daqui toca a rede.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, cpSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STAGE } from './fsd-stages.mjs';
const BIN = dirname(fileURLToPath(import.meta.url)), ALL = Object.values(STAGE);
const FETCH = `import { readFileSync, writeFileSync } from 'node:fs'; const F = process.env.FAKE_GQL;
globalThis.fetch = async (url, o) => { const s = JSON.parse(readFileSync(F, 'utf8')); const { query: q, variables: v } = JSON.parse(o.body); const save = () => writeFileSync(F, JSON.stringify(s));
  const kind = /projectV2\\(number/.test(q) ? 'project' : /items\\(first/.test(q) ? 'items' : /issueOrPullRequest/.test(q) ? 'find' : /addProjectV2ItemById/.test(q) ? 'add' : /updateProjectV2ItemFieldValue/.test(q) ? 'set' : /updateProjectV2Field\\(/.test(q) ? 'field' : '?';
  s.calls.push({ kind, auth: o.headers.Authorization, v, url }); const f = s.fail?.[kind]; save(); if (f === 'throw') throw new Error('fetch failed'); if (f) return { ok: f.status < 300, status: f.status, json: async () => f.body };
  const data = { project: () => ({ organization: s.noOrg ? null : { projectV2: s.noProject ? null : { id: 'P', field: { id: 'F', options: s.options } } } }),
    items: () => { const size = s.page || 100, at = Number(v.a || 0); const nodes = s.items.slice(at, at + size); return { node: { items: { pageInfo: { hasNextPage: at + size < s.items.length, endCursor: String(at + size) }, nodes } } }; },
    find: () => ({ repository: s.noRepo ? null : { issueOrPullRequest: s.missing?.includes(v.n) ? null : { id: 'C' + v.n } } }), add: () => ({ addProjectV2ItemById: { item: { id: 'I' + v.c } } }), set: () => ({ ok: 1 }),
    field: () => { const old = s.options; s.options = v.o.map((x, i) => ({ id: x.id || 'new' + i, name: x.name, color: x.color, description: x.description })); for (const it of s.items) if (it.status) { const n = s.options.find((x) => x.id === it.status.optionId); if (n) it.status.name = n.name; } if (s.break === 'lose') s.items.forEach((it) => { it.status = null; }); if (s.break === 'ids') s.options = s.options.map((x, i) => ({ ...x, id: i ? x.id : 'troca' })); if (s.break === 'names') s.options[0].name = 'zzz'; if (s.break === 'move') s.items[0].status = { name: s.options[1].name, optionId: s.options[1].id }; save(); return {}; } }[kind]();
  return { ok: true, status: 200, json: async () => ({ data }) }; };`;
const opt = (name, i) => ({ id: `o${i}`, name, color: 'BLUE', description: i ? 'd' : null });
const item = (n, col, i, o = {}) => ({ id: `i${n}`, updatedAt: 'u', status: col ? { name: col, optionId: `o${i}` } : null, content: { __typename: 'Issue', number: n, title: `título ${n} ${'x'.repeat(60)}`, state: 'OPEN' }, ...o });
function world(state = {}, { agents = () => {}, cmds = {} } = {}) {
  const w = mkdtempSync(join(tmpdir(), 'board-')), bin = join(w, 'team', 'bin'); mkdirSync(join(w, 'home'));
  cpSync(BIN, bin, { recursive: true, filter: (s) => !s.endsWith('.test.mjs') }); const cfg = JSON.parse(readFileSync(join(BIN, '..', 'agents.json'), 'utf8')); agents(cfg); writeFileSync(join(w, 'team', 'agents.json'), JSON.stringify(cfg));
  const exe = (c, b) => writeFileSync(join(bin, c), `#!/bin/sh\nprintf '%s|%s\\n' "${c}" "$*" >> ${w}/calls\n${b}\n`, { mode: 0o755 });
  for (const [c, b] of Object.entries({ 'fsd-token': 'echo tok-$1-$2', 'fsd-token-file': 'echo file-$1', 'fsd-notify': 'echo stuart', ...cmds })) exe(c, b);
  writeFileSync(join(w, 'fetch.mjs'), FETCH); writeFileSync(join(w, 'gql.json'), JSON.stringify({ options: ALL.map(opt), items: [], calls: [], ...state }));
  const run = (args, env = {}) => spawnSync(join(bin, 'fsd-board'), args, { encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: `--import ${join(w, 'fetch.mjs')}`, FAKE_GQL: join(w, 'gql.json'), FSD_AGENT: 'kevin', FSD_RUNNER: '', FSD_DRY: '', FSD_BOARD_FAKE: '', FSD_STATE: join(w, 'st'), HOME: join(w, 'home'), ...env } });
  return { w, run, gql: () => JSON.parse(readFileSync(join(w, 'gql.json'), 'utf8')), calls: () => { try { return readFileSync(join(w, 'calls'), 'utf8').trim().split('\n'); } catch { return []; } } };
}
const ok = (r) => { assert.equal(r.status, 0, r.stdout + r.stderr); return r.stdout; };
const bad = (r, code, re) => { assert.equal(r.status, code, r.stdout + r.stderr); assert.match(r.stderr, re); };
const C = (k) => ({ name: STAGE[k], i: ALL.indexOf(STAGE[k]) }), put = (n, k, o) => item(n, C(k).name, C(k).i, o);
test('list --json: every item with its column, of all pages; empty fields are null', () => {
  const x = world({ page: 2, items: [put(1, 'devReady'), put(2, 'done'), put(3, 'review', { content: { __typename: 'PullRequest', number: 3, title: 't' } }), item(4, null), { id: 'd', status: null, content: { __typename: 'DraftIssue', title: 'r' } }, { id: 'e', updatedAt: null, status: null, content: null }] });
  assert.deepEqual(JSON.parse(ok(x.run(['list', '--json']))).map((i) => [i.column, i.number, i.type, i.updatedAt]), [[STAGE.devReady, 1, 'Issue', 'u'], [STAGE.done, 2, 'Issue', 'u'], [STAGE.review, 3, 'PullRequest', 'u'], [null, 4, 'Issue', 'u'], [null, null, 'DraftIssue', null], [null, null, null, null]]);
  assert.deepEqual(x.gql().calls.map((c) => [c.kind, c.v.a ?? null]), [['project', null], ['items', null], ['items', '2'], ['items', '4']]); assert.ok(x.gql().calls.every((c) => c.url === 'https://api.github.com/graphql'));
  assert.equal(ok(world().run(['list', '--json'])), '[]\n');
});
test('list: the columns with something (Done only counted), one column, with titles, PR and draft', () => {
  const s = { items: [put(1, 'devReady'), put(2, 'devReady'), put(3, 'done'), put(4, 'review', { content: { __typename: 'PullRequest', number: 4, title: 'abc' } }), put(5, 'review', { content: null })] };
  assert.equal(ok(world(s).run(['list'])), `${STAGE.devReady} (2): #1 #2\n${STAGE.review} (2): PR#4 #-\n${STAGE.done} (1)\n`);
  for (const a of ['devReady', STAGE.devReady, 'Ready for Development']) assert.equal(ok(world(s).run(['list', a])), `${STAGE.devReady} (2): #1 #2\n`);
  assert.equal(ok(world(s).run(['list', 'done'])), `${STAGE.done} (1): #3\n`); assert.equal(ok(world(s).run(['list', 'backlog'])), `${STAGE.backlog} (0): \n`);
  assert.equal(ok(world(s).run(['list', 'review', '-t'])), `${STAGE.review} (2): PR#4 abc ; #- \n`); assert.equal(ok(world(s).run(['list', 'devReady', '-t'])).match(/#1 (.*?) ;/)[1].length, 50);
  bad(world(s).run(['list', 'nada']), 2, /coluna "nada" não existe\. Colunas: Backlog/);
});
test('identity: in the tmux team the token of FSD_AGENT; in a native session the file of the Unix user, with or without FSD_AGENT; one call per scope', () => {
  const a = world({ page: 1, items: [put(1, 'dev'), put(2, 'dev')] }); ok(a.run(['list'])); assert.deepEqual(a.calls(), ['fsd-token|kevin org']); assert.ok(a.gql().calls.every((c) => c.auth === 'Bearer tok-kevin-org'));
  for (const FSD_AGENT of ['', 'mel', 'ninguem']) { const b = world(); ok(b.run(['list'], { FSD_RUNNER: 'session', FSD_AGENT })); assert.deepEqual(b.calls(), ['fsd-token-file|org']); assert.equal(b.gql().calls[0].auth, 'Bearer file-org'); }
  for (const FSD_AGENT of ['', 'ninguem']) bad(world().run(['list'], { FSD_AGENT }), 2, /rode dentro de uma sessão/);
  const m = world({}); ok(m.run(['move', 'dev', '7', '--quiet'])); assert.deepEqual(m.calls(), ['fsd-token|kevin org', 'fsd-token|kevin']); const n = world({}); ok(n.run(['move', 'dev', '7', '--quiet'], { FSD_RUNNER: 'session', FSD_AGENT: '' })); assert.deepEqual(n.calls(), ['fsd-token-file|org', 'fsd-token-file|']);
  assert.equal(m.gql().calls.find((c) => c.kind === 'find').auth, 'Bearer tok-kevin-');
});
test('failures: token, network, HTTP, GraphQL errors, no org and no project: exit and reason, never an empty list', () => {
  bad(world({}, { cmds: { 'fsd-token': 'echo "sem chave" >&2; exit 4' } }).run(['list']), 4, /sem chave/); bad(world({}, { cmds: { 'fsd-token': 'exit 4' } }).run(['list']), 4, /fsd-board: \S/);
  for (const kind of ['project', 'items']) {
    const f = (v) => world({ fail: { [kind]: v } }).run(['list', '--json']);
    bad(f('throw'), 4, /fetch failed/); bad(f({ status: 502, body: { message: 'Bad gateway' } }), 1, /GitHub 502: Bad gateway/); bad(f({ status: 200, body: { errors: [{ message: 'a' }, { message: 'b' }] } }), 1, /GitHub 200: a; b/); assert.equal(f('throw').stdout, '');
  }
  bad(world({ noOrg: true }).run(['list']), 1, /quadro .*não encontrado/); bad(world({ noProject: true }).run(['list']), 1, /quadro .*não encontrado/);
});
test('move: both orders, many cards, tells the owner unless quiet or Done; dry and bad arguments call nothing', () => {
  for (const a of [['devReady', '7'], ['7', 'devReady'], [STAGE.devReady, '7']]) { const x = world(); assert.equal(ok(x.run(['move', ...a])), `#7 → ${STAGE.devReady} | avisados: stuart\n`); const s = x.gql().calls.find((c) => c.kind === 'set').v; assert.deepEqual([s.p, s.i, s.f, s.o], ['P', 'IC7', 'F', `o${C('devReady').i}`]); assert.match(x.calls().at(-1), /^fsd-notify\|stuart #7 → /); }
  const m = world(); assert.equal(ok(m.run(['move', 'review', '7', '8', '--quiet'])), `#7,#8 → ${STAGE.review}\n`); assert.ok(!m.calls().some((c) => /notify/.test(c))); assert.equal(m.gql().calls.filter((c) => c.kind === 'set').length, 2);
  const d = world(); assert.equal(ok(d.run(['move', 'done', '7'])), '#7 → Done\n'); assert.ok(!d.calls().some((c) => /notify/.test(c)));
  for (const b of ['echo "ninguém recebeu"', 'exit 1', 'true']) assert.equal(ok(world({}, { cmds: { 'fsd-notify': b } }).run(['move', 'devReady', '7'])), `#7 → ${STAGE.devReady}\n`);
  const y = world(); assert.equal(ok(y.run(['move', 'dev', '7', '--quiet'], { FSD_DRY: '1' })), '[dry] fsd-board move dev 7\n'); assert.deepEqual(y.gql().calls, []);
  for (const a of [[], ['dev'], ['7'], ['7', '8'], ['dev', 'x'], ['dev', '7', 'x'], ['', '7']]) { const z = world(); const r = z.run(['move', ...a]); assert.equal(r.status, 2, JSON.stringify(a) + r.stdout); assert.equal(z.gql().calls.filter((c) => c.kind === 'set').length, 0); }
  bad(world().run(['move', 'nada', '7']), 2, /coluna "nada" não existe/); bad(world({ missing: [8] }).run(['move', 'dev', '7', '8']), 1, /#8 não existe em/); bad(world({ noRepo: true }).run(['move', 'dev', '7']), 1, /#7 não existe/);
  for (const kind of ['find', 'add', 'set']) bad(world({ fail: { [kind]: { status: 403, body: { message: 'não pode' } } } }).run(['move', 'dev', '7']), 1, /GitHub 403: não pode/);
});
test('move with a column the board still calls by the old name: the owner told is the one of the stage', () => { const x = world({ options: [{ id: 'z', name: 'Ready for Development' }] }); assert.match(ok(x.run(['move', 'devReady', '7'])), /#7 → Ready for Development/); });
test('rename: nothing to do, dry, renames and creates keeping ids; the state before is saved', () => {
  assert.match(ok(world().run(['rename'])), /já com os nomes/);
  const old = [...ALL.map(opt)]; old[C('devReady').i] = { ...old[C('devReady').i], name: 'Ready for Development' }; old.splice(C('changes').i, 1);
  const st = () => ({ options: old.map((o) => ({ ...o })), items: [item(1, 'Ready for Development', C('devReady').i), item(2, null), { id: 'x', status: null, content: null }] });
  for (const [a, e] of [[['rename', '--dry'], {}], [['rename'], { FSD_DRY: '1' }]]) { const x = world(st()); const o = ok(x.run(a, e)); assert.match(o, /\[dry\] Ready for Development → /); assert.match(o, /\[dry\] \+ Changes Requested.*depois de /); assert.ok(!x.gql().calls.some((c) => c.kind === 'field')); }
  const x = world(st()); assert.match(ok(x.run(['rename'])), /1 coluna\(s\) renomeada\(s\), 1 criada\(s\); 3 cards conferidos/); assert.deepEqual(x.gql().options.map((o) => o.name), ALL); assert.equal(x.gql().options[C('devReady').i].id, `o${C('devReady').i}`);
  const f = readdirSync(join(x.w, 'st')).find((n) => /^board-rename/.test(n)); assert.equal(JSON.parse(readFileSync(join(x.w, 'st', f), 'utf8')).items.length, 3);
  const h = world(st()); ok(h.run(['rename'], { FSD_STATE: '' })); assert.ok(readdirSync(join(h.w, 'home', '.config', 'fsd-agents')).some((n) => /^board-rename/.test(n)));
  const first = world({ options: ALL.map(opt).slice(1), items: [] }); assert.match(ok(first.run(['rename'])), /\+ Backlog.*coluna nova, depois de /); const none = world({ options: [], items: [] }); assert.match(ok(none.run(['rename', '--dry'])), /depois de nada/);
});
test('rename: what does not check out (ids, names, counts, cards without column) stops with the file of before', () => {
  const mk = (b) => { const o = ALL.map(opt); o[1] = { ...o[1], name: 'Ready for Architecture' }; return world({ break: b, options: o, items: [item(1, ALL[0], 0), item(2, null)] }); };
  for (const [b, re] of [['ids', /ids MUDARAM/], ['names', /nomes diferentes/], ['move', /contagem diferente: 2/], ['lose', /contagem diferente: 1/]]) bad(mk(b).run(['rename']), 4, re);
});
test('no command and an unknown one: usage', () => { for (const a of [[], ['nada']]) bad(world().run(a), 2, /uso: fsd-board list/); });
test('board not configured: nothing is read; a move still tells the owner, except quiet, dry, without column or without owner', () => {
  const x = (args, env = {}, cmds) => { const w = world({}, { agents: (c) => { c.board = {}; }, cmds }); const r = w.run(args, env); bad(r, 2, /quadro ainda não configurado/); return w.calls(); };
  for (const k of ['owner', 'number', 'repo']) bad(world({}, { agents: (c) => { delete c.board[k]; } }).run(['list']), 2, /não configurado/); bad(world({}, { agents: (c) => { delete c.board; } }).run(['list']), 2, /não configurado/);
  assert.deepEqual(x(['list']), []); assert.deepEqual(x(['move', 'devReady', '7']), ['fsd-notify|stuart #7 → devReady']); assert.equal(x(['move', 'devReady', '7'], {}, { 'fsd-notify': 'exit 1' }).length, 1);
  assert.deepEqual(x(['move', 'devReady', '7', '--quiet']), []); assert.deepEqual(x(['move', 'devReady', '7'], { FSD_DRY: '1' }), []); assert.deepEqual(x(['move', '7']), []); assert.deepEqual(x(['move', 'done', '7']), []);
});
test('fake board: list, one column, json, move in both orders, errors; absent or broken file is an empty board', () => {
  const w = world(); const f = join(w.w, 'b.json'); const r = (a, e) => w.run(a, { FSD_BOARD_FAKE: f, ...e });
  assert.equal(ok(r(['list', '--json'])), '[]\n'); writeFileSync(f, 'lixo'); assert.equal(ok(r(['list'])), ''); writeFileSync(f, '{}');
  assert.match(ok(r(['move', '7', 'devReady'])), /^#7 → Ready for Development.*\| avisados: stuart/); assert.equal(ok(r(['move', 'dev', '9'])), `#9 → ${STAGE.dev}\n`); assert.equal(ok(r(['move', 'review', '7', '8', '--quiet'])), `#7,#8 → ${STAGE.review}\n`); assert.equal(ok(r(['move', 'done', '9'])), '#9 → Done\n');
  assert.match(ok(r(['list'])), /In Review.*\(2\): #7 #8/); assert.match(ok(r(['list', 'backlog'])), /Backlog.*\(0\)/); assert.equal(JSON.parse(ok(r(['list', '--json']))).length, 3);
  for (const a of [['move'], ['move', 'dev'], ['move', 'dev', 'x']]) bad(r(a), 2, /uso: fsd-board move/); bad(r(['move', 'nada', '7']), 2, /não existe/); bad(r(['rename']), 2, /fake\): só list e move/);
  const q = world({}, { cmds: { 'fsd-notify': 'exit 1' } }); assert.match(ok(q.run(['move', 'devReady', '7'], { FSD_BOARD_FAKE: f })), /^#7 → Ready for Development \(Stuart\)\n$/); const n = world({}, { cmds: { 'fsd-notify': 'echo "ninguém recebeu"' } }); assert.doesNotMatch(ok(n.run(['move', 'devReady', '7'], { FSD_BOARD_FAKE: f })), /avisados/); assert.ok(existsSync(f));
});
