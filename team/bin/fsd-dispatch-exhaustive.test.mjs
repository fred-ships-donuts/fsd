// O supervisor, todas as entradas: o decide() sobre o produto inteiro das classes de entrada, contra um oráculo escrito à parte (a partir
// das regras do topo do fsd-dispatch.mjs) e as invariantes; e o laço (arquivos, diário, lease, cópia fixada) em todos os casos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync, symlinkSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { COLUMNS } from './fsd-stages.mjs';
process.env.FSD_STATE = mkdtempSync(join(tmpdir(), 'ex-'));
const { decide, TASK_OF, taskKey, COLUMN_KEYS } = await import('./fsd-dispatch.mjs');
const D = await import('./fsd-dispatch-loop.mjs');
const ROLES = ['kevin', 'mel', 'stuart', 'bob'], COLS = Object.keys(COLUMNS), off = { state: 'off' }, team = (o = {}) => ({ kevin: off, mel: off, stuart: off, bob: off, ...o });

// ── Oráculo: uma tabela por regra, e um passo por vez sobre uma fila de candidatos.
const ORDER = { changes: 0, review: 1, dev: 2, devReady: 3, arch: 4, archReady: 5, backlog: 6 };
const WHO = { changes: [['stuart', 'correcao']], review: [['mel', 'revisao'], ['bob', 'qa']], dev: [['stuart', 'entrega-codigo']], devReady: [['stuart', 'entrega-codigo']], arch: [['mel', 'arquitetura']], archReady: [['mel', 'arquitetura']], backlog: [['kevin', 'triagem']] };
function oracle(i) {
  const s = { sessions: {}, cards: [], messages: [], deadlocks: [], judged: [], offline: 'byUrgency', maxConcurrent: 1, budgetOk: true, ...i };
  const of = (r) => s.sessions[r] ?? off, is = (r, st) => of(r).state === st, id = (r) => (of(r).id ? { id: of(r).id } : {});
  const free = !s.paused && s.budgetOk, day = [], closing = [];
  if (s.endOfDayAt > 0) for (const r of Object.keys(s.sessions).sort()) if (is(r, 'idle') && !of(r).eodHold) {
    if (of(r).eod) day.push({ type: 'retire', to: r, ...id(r) }); else if ((of(r).ctx ?? 0) >= s.endOfDayAt) { day.push({ type: 'endofday', to: r, ...id(r) }); closing.push(r); }
  }
  const used = new Set(day.map((a) => a.to)); let slots = s.maxConcurrent - Object.values(s.sessions).filter((x) => x.state === 'working').length - closing.length;
  const dests = [...new Set(s.messages.map((m) => m.to))].sort(), mail = (r) => s.messages.filter((m) => m.to === r), ids = (r) => mail(r).map((m) => m.id);
  const inbox = dests.filter((r) => is(r, 'working')).map((r) => ({ type: 'inbox', to: r, ids: ids(r) }));
  const open = s.cards.filter((c) => !c.blocked), oneCard = open.some((c) => ['dev', 'changes'].includes(c.column));
  const queue = open.filter((c) => c.column in ORDER && !(c.column === 'devReady' && oneCard) && !(c.column === 'backlog' && !c.unsized))
    .map((c, k) => ({ c, k })).sort((a, b) => ORDER[a.c.column] - ORDER[b.c.column] || a.c.n - b.c.n || a.k - b.k).flatMap(({ c }) => WHO[c.column].filter(([r]) => !(c.column === 'review' && c.reviewedBy?.includes(r))).map(([r, kind]) => ({ c, r, kind, key: `${kind}:#${c.n}` + (c.head ? `@${c.head}` : '') })));
  const turn = (r, more) => { used.add(r); slots--; return { type: 'turn', to: r, how: is(r, 'idle') ? 'resume' : 'wake', ...id(r), ...more, ids: ids(r) }; }, work = [];
  for (const q of queue) if (free && slots > 0 && !used.has(q.r) && !is(q.r, 'working') && of(q.r).task?.key !== q.key) work.push(turn(q.r, { task: { key: q.key, kind: q.kind, n: q.c.n, ...(q.c.head ? { head: q.c.head } : {}) } }));
  const post = [];
  for (const r of dests) if (!is(r, 'working') && !used.has(r)) {
    const call = is(r, 'idle') || s.offline === 'wake' || (s.offline === 'byUrgency' && mail(r).some((m) => m.urgent));
    const why = !call ? 'desligado: entrega no próximo turno (SessionStart)' : !free ? 'PAUSE ou orçamento' : slots <= 0 ? `maxConcurrent ${s.maxConcurrent}` : null;
    post.push(why ? { type: 'hold', to: r, ids: ids(r), why } : turn(r, {}));
  }
  const tail = s.paused ? [] : [...s.cards.filter((c) => c.column === 'mergeReady' && !c.blocked).sort((a, b) => a.n - b.n).map((c) => ({ type: 'merge', n: c.pr ?? c.n })), ...s.deadlocks.filter((d) => !s.judged.includes(d.ref)).map((d) => ({ type: 'judge', ref: d.ref }))];
  return [...day, ...inbox, ...work, ...post, ...tail];
}
function invariants(s, acts) {
  const st = (r) => s.sessions?.[r]?.state ?? 'off', turns = acts.filter((a) => a.type === 'turn'), per = (t) => acts.filter((a) => a.type === t);
  for (const a of turns) assert.notEqual(st(a.to), 'working');
  for (const r of ROLES) assert.ok(acts.filter((a) => a.to === r && ['turn', 'endofday', 'retire'].includes(a.type)).length <= 1);
  if (s.paused || s.budgetOk === false) assert.equal(turns.length, 0); if (s.paused) assert.equal(per('merge').length + per('judge').length, 0);
  const working = Object.values(s.sessions || {}).filter((x) => x.state === 'working').length; if (turns.length) assert.ok(working + per('endofday').length + turns.length <= (s.maxConcurrent ?? 1));
  for (const a of turns) assert.equal(a.how, st(a.to) === 'idle' ? 'resume' : 'wake');
  // nenhuma mensagem em duas ações; só fica sem ação a de quem está fechando o dia
  const moved = acts.flatMap((a) => a.ids || []), all = (s.messages || []).map((m) => m.id); assert.equal(new Set(moved).size, moved.length);
  const closing = new Set([...per('endofday'), ...per('retire')].map((a) => a.to)); assert.deepEqual(all.filter((i) => !moved.includes(i)), (s.messages || []).filter((m) => closing.has(m.to)).map((m) => m.id));
  for (const a of turns.filter((x) => x.task)) { const c = s.cards.find((k) => k.n === a.task.n); assert.ok(c && !c.blocked); assert.notEqual(s.sessions?.[a.to]?.task?.key, a.task.key); }
}
let seen = 0; const types = {};
const check = (s) => { const before = JSON.stringify(s), got = decide(s); assert.equal(JSON.stringify(s), before, 'o decide mudou a entrada'); const want = oracle(s); if (JSON.stringify(got) !== JSON.stringify(want)) assert.deepEqual(got, want, before); invariants(s, got); seen++; for (const a of got) types[a.type] = (types[a.type] || 0) + 1; };
const product = function* (o) { const ks = Object.keys(o); const go = function* (i, acc) { if (i === ks.length) { yield acc; return; } for (const v of o[ks[i]]) yield* go(i + 1, { ...acc, [ks[i]]: v }); }; yield* go(0, {}); };
const B = [false, true], STATES = ['off', 'idle', 'working'], MAX = [0, 1, 2, 4];
const exact = (n) => assert.ok(seen >= n, `${seen} < ${n}`);

test('decide: one card — every column, blocked, unsized, reviewedBy, head × the state and task of its role × freeze × maxConcurrent × another at work', () => {
  seen = 0; for (const c of product({ column: [...COLS, 'desconhecida', null], blocked: [undefined, ...B], unsized: [undefined, true], reviewedBy: [undefined, [], ['mel'], ['bob'], ['mel', 'bob']], head: [undefined, 'h'] }))
    for (const s of product({ st: STATES, task: ['none', 'same', 'other'], paused: B, budgetOk: B, max: MAX, other: B })) {
      const card = { n: 5, ...c }, role = (WHO[c.column] || [['stuart', 'x']])[0];
      const me = { state: s.st, ...(s.st === 'off' ? {} : { id: 'i' }), ...(s.task === 'none' ? {} : { task: { key: s.task === 'same' ? taskKey(card, role[1]) : 'outra' } }) };
      check({ cards: [card], sessions: team({ [role[0]]: me, ...(s.other ? { [role[0] === 'kevin' ? 'mel' : 'kevin']: { state: 'working', id: 'k' } } : {}) }), paused: s.paused, budgetOk: s.budgetOk, maxConcurrent: s.max });
    } exact(100000);
});
test('decide: every pair of columns, both numberings, blocked or not × the state of Stuart and Mel × maxConcurrent', () => {
  seen = 0; for (const s of product({ a: COLS, b: COLS, swap: B, ba: B, bb: B, st: STATES, mel: STATES, max: [1, 2, 4], un: B })) check({ maxConcurrent: s.max, cards: [{ n: s.swap ? 9 : 3, column: s.a, blocked: s.ba, unsized: s.un, pr: 70 }, { n: s.swap ? 3 : 9, column: s.b, blocked: s.bb, unsized: s.un }], sessions: team({ stuart: { state: s.st, id: 's' }, mel: { state: s.mel, id: 'm' } }) });
  exact(30000);
});
test('decide: every trio of columns, in every state of the team that can take a turn', () => { seen = 0; for (const s of product({ a: COLS, b: COLS, c: COLS, max: [1, 2, 4], st: STATES })) check({ maxConcurrent: s.max, cards: [s.a, s.b, s.c].map((column, i) => ({ n: 3 - i, column, unsized: true })), sessions: team({ stuart: { state: s.st, id: 's' } }) }); exact(6000); });
test('decide: messages — every number, urgency, offline policy and state of the destination × freeze × maxConcurrent × with or without a task', () => {
  seen = 0; for (const s of product({ st: [...STATES, 'missing'], urg: [[], [false], [true], [false, true], [false, false, false]], offline: ['byUrgency', 'wait', 'wake', undefined], paused: B, budgetOk: B, max: MAX, card: [null, 'changes', 'devReady'], two: B, other: B })) {
    const sessions = team({ stuart: { state: s.st, id: 's' }, ...(s.other ? { kevin: { state: 'working' } } : {}) }); if (s.st === 'missing') delete sessions.stuart;
    check({ ...(s.offline ? { offline: s.offline } : {}), paused: s.paused, budgetOk: s.budgetOk, maxConcurrent: s.max, sessions, cards: s.card ? [{ n: 1, column: s.card }] : [], messages: [...s.urg.map((urgent, i) => ({ id: `m${i}`, from: 'mel', to: 'stuart', text: 't', urgent })), ...(s.two ? [{ id: 'b', from: 'mel', to: 'bob', text: 't', urgent: true }, { id: 'x', from: 'mel', to: 'ninguem', text: 't' }] : [])] });
  } exact(15000);
});
test('decide: end of the day — every state, mark and context (below, at, above, none) × the limit × freeze × maxConcurrent × message and card', () => {
  seen = 0; for (const s of product({ st: STATES, id: [undefined, 'a'], eod: [undefined, true], hold: [undefined, true], ctx: [undefined, 0, 1, 99, 100, 101], at: [undefined, 0, 1, 100], paused: B, budgetOk: B, max: MAX, m: B, card: B, two: B }))
    check({ endOfDayAt: s.at, paused: s.paused, budgetOk: s.budgetOk, maxConcurrent: s.max, sessions: team({ mel: { state: s.st, id: s.id, eod: s.eod, eodHold: s.hold, ctx: s.ctx }, ...(s.two ? { bob: { state: 'idle', id: 'b', ctx: 500 } } : {}) }), messages: s.m ? [{ id: 'm', to: 'mel', urgent: true }] : [], cards: s.card ? [{ n: 1, column: 'archReady' }, { n: 2, column: 'review' }] : [] });
  exact(40000);
});
test('decide: merge and judge — blocked, with and without PR, order, PAUSE, budget, judged or not', () => {
  seen = 0; for (const s of product({ n: [0, 1, 2, 3], blocked: B, pr: B, paused: [undefined, ...B], budgetOk: B, dead: [[], ['#1'], ['#1', '#2']], judged: [undefined, [], ['#1'], ['#1', '#2']], st: STATES }))
    check({ paused: s.paused, budgetOk: s.budgetOk, deadlocks: s.dead.map((ref) => ({ ref, key: ref })), ...(s.judged ? { judged: s.judged } : {}), sessions: team({ kevin: { state: s.st } }), cards: Array.from({ length: s.n }, (_, i) => ({ n: 9 - i, column: 'mergeReady', blocked: s.blocked && i === 0, ...(s.pr ? { pr: 90 + i } : {}) })) });
  exact(3000);
});
test('decide: 150000 whole random states (fixed seed) agree with the oracle; every kind of action shows up', () => {
  let x = 20261124; const rnd = (n) => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return Math.floor((x / 2 ** 32) * n); }, pick = (a) => a[rnd(a.length)]; seen = 0;
  for (let k = 0; k < 150000; k++) check({ paused: rnd(6) === 0, budgetOk: rnd(6) !== 0, maxConcurrent: rnd(5), offline: pick(['byUrgency', 'wait', 'wake']), endOfDayAt: pick([0, 100]),
    sessions: Object.fromEntries(ROLES.filter(() => rnd(8)).map((r) => [r, { state: pick(STATES), id: pick([undefined, r]), ctx: pick([0, 50, 100, 200]), eod: rnd(4) === 0, eodHold: rnd(5) === 0, task: pick([undefined, { key: 'correcao:#1' }, { key: 'triagem:#2' }]) }])),
    cards: Array.from({ length: rnd(6) }, (_, i) => ({ n: i + 1, column: pick(COLS), blocked: rnd(5) === 0, unsized: rnd(2) === 0, ...(rnd(2) ? { pr: 50 + i, head: pick(['a', 'b']), reviewedBy: ROLES.filter(() => rnd(3) === 0) } : {}) })),
    messages: Array.from({ length: rnd(5) }, (_, i) => ({ id: `m${i}`, from: 'kevin', to: pick(ROLES), text: 't', urgent: rnd(3) === 0 })), deadlocks: Array.from({ length: rnd(3) }, (_, i) => ({ ref: `#${i}` })), judged: rnd(2) ? ['#0'] : [] });
  exact(150000); assert.deepEqual(Object.keys(types).sort(), ['endofday', 'hold', 'inbox', 'judge', 'merge', 'retire', 'turn']);
});
test('decide: nothing, undefined and each field missing are the defaults', () => {
  assert.deepEqual(decide({}), []); assert.deepEqual(decide(undefined), []); assert.deepEqual(decide(null), []);
  const full = { sessions: team({ mel: { state: 'idle', id: 'm' } }), cards: [{ n: 1, column: 'archReady' }], messages: [{ id: 'a', to: 'bob', text: 'x' }], deadlocks: [{ ref: '#1' }], judged: [], maxConcurrent: 1, offline: 'byUrgency', budgetOk: true, paused: false };
  for (const k of Object.keys(full)) { const { [k]: _, ...rest } = full; check(rest); }
  assert.deepEqual([...COLUMN_KEYS], COLS); assert.deepEqual(Object.keys(TASK_OF).sort(), Object.keys(WHO).sort()); for (const [c, l] of Object.entries(TASK_OF)) assert.deepEqual(l.map((t) => [t.role, t.kind]), WHO[c]);
  assert.equal(taskKey({ n: 1 }, 'qa'), 'qa:#1'); assert.equal(taskKey({ n: 1, head: 'h' }, 'qa'), 'qa:#1@h');
});

// ── O laço ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const fresh = () => { process.env.FSD_STATE = mkdtempSync(join(tmpdir(), 'ex-')); return D.dispatchDir(); }, put = (f, v) => { mkdirSync(D.dispatchDir(), { recursive: true }); writeFileSync(join(D.dispatchDir(), f), v); };
const T0 = Date.parse('2026-11-21T12:00:00Z'), MIN = 60000;
test('files: absent, empty, cut and valid, for each one; what is saved is what is read', () => {
  const F = { 'tasks.json': [D.loadTasks, D.saveTasks, {}], 'judged.json': [D.loadJudged, D.saveJudged, []], 'judging.json': [D.loadJudging, D.saveJudging, {}], 'eod.json': [D.loadEod, D.saveEod, {}], 'stalled.json': [D.loadStalled, D.saveStalled, {}] };
  for (const [f, [load, save, empty]] of Object.entries(F)) { fresh(); assert.deepEqual(load(), empty); for (const bad of ['', '{', 'null x']) { put(f, bad); assert.deepEqual(load(), empty, f); } const v = Array.isArray(empty) ? ['#1'] : { a: 1 }; save(v); assert.deepEqual(load(), v); assert.ok(!existsSync(join(D.dispatchDir(), `${f}.${process.pid}.tmp`))); }
});
test('the folder: FSD_STATE, else ~/.config/fsd-agents, also without HOME', () => {
  const { FSD_STATE, HOME } = process.env; try { process.env.FSD_STATE = '/x'; assert.equal(D.dispatchDir(), '/x/dispatch'); delete process.env.FSD_STATE; process.env.HOME = '/h'; assert.equal(D.dispatchDir(), '/h/.config/fsd-agents/dispatch'); delete process.env.HOME; assert.equal(D.dispatchDir(), '.config/fsd-agents/dispatch'); } finally { process.env.FSD_STATE = FSD_STATE; process.env.HOME = HOME; }
});
test('journal: absent, empty and with a cut line, in the middle or at the end: the good lines are kept', () => {
  fresh(); assert.deepEqual(D.readJournal(), []); put('journal.jsonl', ''); assert.deepEqual(D.readJournal(), []);
  for (const t of ['{"id":"a"}\n{"id":', '{"id":\n{"id":"a"}\n', '\n{"id":"a"}\n\n']) { put('journal.jsonl', t); assert.deepEqual(D.readJournal(), [{ id: 'a' }], t); }
});
test('reconcile: every way an intent can end; what has no end becomes abandoned once, even with a cut line', () => {
  for (const end of ['done', 'failed', 'abandoned']) { fresh(); put('journal.jsonl', `{"id":"1","phase":"intent","action":{"n":1}}\n{"id":"1","phase":"${end}"}\n`); assert.deepEqual(D.reconcile(T0), []); }
  fresh(); put('journal.jsonl', '{"id":"1","phase":"intent","action":{"n":1}}\n{"id":"2","phase":"intent","action":{"n":2}}\n{"id":"1","phase":"done"}\n{"id":"3","ph'); assert.deepEqual(D.reconcile(T0), [{ n: 2 }]); assert.deepEqual(D.reconcile(T0), []);
  fresh(); assert.deepEqual(D.reconcile(T0), []);
});
test('lease: before, at and after taskLeaseMin × the state of the role × delivered, with and without cfg', async () => {
  for (const s of product({ age: [0, 119, 120, 121], st: [...STATES, 'missing'], del: [undefined, ...B] })) {
    fresh(); D.saveTasks({ stuart: { key: 'correcao:#1', kind: 'correcao', n: 1, at: T0 } }); const sessions = s.st === 'missing' ? {} : team({ stuart: { state: s.st } }); let saw;
    await D.round({ gather: async () => ({ sessions, cards: [{ n: 1, column: 'changes' }] }), exec: async (a) => { saw = a; }, now: T0 + s.age * MIN, cfg: s.del === undefined ? {} : { delivered: () => s.del } });
    const expired = s.age > 120 && s.st !== 'working' && !s.del;
    // sem a tarefa atribuída (vencida) o card sai de novo; um papel sem sessão no estado não carrega a marca
    assert.equal(!!saw, expired || s.st === 'missing', JSON.stringify(s));
  }
  fresh(); D.saveTasks({ mel: { key: 'k', n: 1, at: 0 } }); await D.round({ gather: async () => ({}), exec: async () => {}, now: T0, cfg: { taskLeaseMin: 1e9 } }); assert.ok(D.loadTasks().mel);
});
test('round: each action × done, failed with Error, with a string and with nothing; the journal and the tasks follow', async () => {
  const S = { turnTask: { cards: [{ n: 1, column: 'changes' }] }, turnMail: { messages: [{ id: 'm', to: 'bob', text: 't', urgent: true }] }, merge: { cards: [{ n: 1, column: 'mergeReady' }] }, judge: { deadlocks: [{ ref: '#7' }] }, inbox: { sessions: team({ bob: { state: 'working' } }), messages: [{ id: 'm', to: 'bob', text: 't' }] }, hold: { messages: [{ id: 'm', to: 'bob', text: 't' }] }, eod: { sessions: team({ bob: { state: 'idle', ctx: 9 } }), endOfDayAt: 9 } };
  for (const [k, g] of Object.entries(S)) for (const prev of [undefined, { key: 'velha', n: 8, at: T0 }]) for (const how of ['value', 'void', 'error', 'string', 'nothing', 'long']) {
    fresh(); if (prev) D.saveTasks({ stuart: prev }); const exec = async () => { if (how === 'value') return 'r'; if (how === 'void') return undefined; throw { error: new Error('e'), string: 's', nothing: undefined, long: new Error('x'.repeat(999)) }[how]; };
    const r = await D.round({ gather: async () => ({ sessions: team(), ...g }), exec, now: T0 }); const fine = how === 'value' || how === 'void', j = D.readJournal();
    assert.deepEqual([r.actions.length, r.done.length, r.skipped.length], [1, +fine, +!fine], k); assert.deepEqual(j.map((e) => e.phase), ['intent', fine ? 'done' : 'failed']); assert.equal(j[0].id, j[1].id);
    if (fine) assert.equal(j[1].result, how === 'value' ? 'r' : null); else assert.equal(j[1].error, { error: 'e', string: 's', nothing: 'undefined', long: 'x'.repeat(300) }[how]);
    assert.deepEqual(D.loadTasks(), k === 'turnTask' && fine ? { stuart: { key: 'correcao:#1', kind: 'correcao', n: 1, at: T0 } } : prev ? { stuart: prev } : {});
    assert.deepEqual(D.loadJudging(), k === 'judge' ? { '#7': { at: T0, state: 'running' } } : {});
  }
});
test('round: gather that throws leaves no trace; what cfg says wins over gather, and gather over the default; judged and judging are not sent again', async () => {
  fresh(); await assert.rejects(D.round({ gather: async () => { throw new Error('g'); }, exec: async () => {} }), /g/); assert.deepEqual(D.readJournal(), []); assert.ok(!existsSync(join(D.dispatchDir(), 'tasks.json')));
  const n = async (gm, cm) => { fresh(); const r = await D.round({ gather: async () => ({ sessions: team(), cards: [{ n: 1, column: 'review' }, { n: 2, column: 'changes' }], ...(gm === undefined ? {} : { maxConcurrent: gm }) }), exec: async () => {}, now: T0, ...(cm === undefined ? {} : { cfg: { maxConcurrent: cm } }) }); return r.actions.length; };
  assert.equal(await n(undefined, undefined), 1); assert.equal(await n(2, undefined), 2); assert.equal(await n(2, 3), 3); assert.equal(await n(2, 0), 0);
  const o = async (go, co) => { fresh(); const r = await D.round({ gather: async () => ({ sessions: team(), messages: [{ id: 'm', to: 'bob', text: 't' }], ...(go ? { offline: go } : {}) }), exec: async () => {}, cfg: co ? { offline: co } : {} }); return r.actions[0].type; };
  assert.equal(await o(), 'hold'); assert.equal(await o('wake'), 'turn'); assert.equal(await o('wake', 'wait'), 'hold');
  for (const f of ['judged', 'judging']) { fresh(); if (f === 'judged') D.saveJudged(['#7']); else D.saveJudging({ '#7': { at: T0, state: 'failed' } }); const r = await D.round({ gather: async () => ({ deadlocks: [{ ref: '#7' }] }), exec: async () => {} }); assert.deepEqual(r.actions, []); }
});
test('pin: good and bad shas; runs only from the pinned path; the folder of pins', () => {
  fresh(); assert.equal(D.currentPin(), null); assert.deepEqual(D.listPins(), []); assert.equal(D.runningPinned('/x'), false); const src = mkdtempSync(join(tmpdir(), 'src-')); mkdirSync(join(src, 'bin')); writeFileSync(join(src, 'bin', 'fsd-dispatch'), 'x');
  for (const bad of ['', 'abc', 'abcdef', 'ABCDEF1', 'abcdef1; rm', '../abcdef1', 'g'.repeat(7), 'a'.repeat(41), undefined, null]) assert.throws(() => D.pinCode(bad, src), /sha inválido/, String(bad));
  for (const good of ['abcdef1', 'a'.repeat(40)]) { const dst = D.pinCode(good, src); assert.equal(D.currentPin().sha, good); assert.equal(D.runningPinned(join(dst, 'bin', 'fsd-dispatch')), true); assert.ok(!existsSync(join(dst, 'contracts'))); }
  const dst = D.currentPin().path; assert.equal(D.runningPinned(join(src, 'bin', 'fsd-dispatch')), false); assert.equal(D.runningPinned('/nao/existe'), false); assert.equal(D.runningPinned(dst), false);
  const ln = join(src, 'link'); symlinkSync(join(dst, 'bin', 'fsd-dispatch'), ln); assert.equal(D.runningPinned(ln), true); assert.deepEqual(D.listPins().sort(), ['a'.repeat(40), 'abcdef1']);
  assert.equal(D.runningPinned(join(dst, 'bin', 'fsd-dispatch').replace('/team/', '/teamX/')), false); assert.equal(D._dir('/a/b'), '/a'); assert.ok(readFileSync(join(dst, 'bin', 'fsd-dispatch'), 'utf8'));
  appendFileSync(join(D.dispatchDir(), 'current.json'), 'lixo'); assert.equal(D.currentPin(), null);
});
