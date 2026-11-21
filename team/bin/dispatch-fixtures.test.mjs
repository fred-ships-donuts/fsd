// F1.9: os casos do histórico em team/docs/dispatch-fixtures/. Cada gatilho conhecido tem um caso; todo estado e toda ação do
// classify()/act() do fsd-watch estão no catálogo; cada transição real do quadro está em TRANSITIONS ou tem a divergência explicada;
// e os casos que já têm função pura são reproduzidos aqui (os outros, pelo decide() na F3.6).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cardColumn } from './fsd-column.mjs';
import { STAGE, COLUMNS, TRANSITIONS, ownersOf } from './fsd-stages.mjs';
import { uiDialog } from './fsd-dialogs.mjs';
import { resetTime, shouldAlert } from './fsd-alert.mjs';
import { contextAction } from './fsd-context.mjs';
import { over } from './fsd-usage.mjs';
import { findStalls, findPause, findOldNotices } from './fsd-progress.mjs';

const BIN = dirname(fileURLToPath(import.meta.url));
const DIR = join(BIN, '..', 'docs', 'dispatch-fixtures');
const load = (f) => JSON.parse(readFileSync(join(DIR, f), 'utf8'));
const AREAS = ['watch', 'loops', 'columns', 'notices'];
const { triggers } = load('triggers.json');
const cases = AREAS.flatMap((a) => load(`${a}.json`).cases.map((c) => ({ ...c, area: a })));
const ms = (t) => Date.parse(t);

test('every known trigger has a case; every case points at a trigger of its area; ids are unique', () => {
  const byId = new Map(triggers.map((t) => [t.id, t]));
  assert.equal(byId.size, triggers.length);
  for (const t of triggers) assert.ok(cases.some((c) => c.trigger === t.id), `sem caso: ${t.id}`);
  for (const c of cases) { assert.ok(byId.has(c.trigger), `${c.id}: gatilho ${c.trigger}`); assert.equal(byId.get(c.trigger).area, c.area, c.id); }
  assert.equal(new Set(cases.map((c) => c.id)).size, cases.length);
  for (const c of cases) for (const e of c.evidence) assert.ok(e.source && e.at && e.line, c.id);
});

test('the catalog covers every state of classify() and every action of act() in fsd-watch', () => {
  const src = readFileSync(join(BIN, 'fsd-watch'), 'utf8');
  const fn = (name) => { const i = src.indexOf(`function ${name}(`); return src.slice(i, src.indexOf('\n}\n', i)); };
  const states = [...fn('classify').matchAll(/state: '([^']+)'/g)].map((m) => m[1]);
  const watchTriggers = new Set(triggers.filter((t) => t.area === 'watch').map((t) => t.trigger));
  for (const s of states) assert.ok(watchTriggers.has(s), `estado sem gatilho no catálogo: ${s}`);
  const acts = [...new Set([...fn('act').matchAll(/r\.act === '(\w+)'/g)].map((m) => m[1]))];
  assert.ok(acts.length >= 6, acts.join());
  const expected = new Set(cases.filter((c) => c.area === 'watch').map((c) => c.expect.act));
  for (const a of acts) assert.ok(expected.has(a), `ação sem caso: ${a}`);
});

test('every recorded board transition is in TRANSITIONS or has an explained divergence', () => {
  const h = load('board-history.json');
  const key = Object.fromEntries(Object.entries(COLUMNS).map(([k, c]) => [c.base, k]));
  const allowed = (t) => TRANSITIONS.some((x) => (x.from === 'any' || x.from === key[t.from]) && x.to === key[t.to]);
  const id = (t) => `${t.kind}|${t.from}|${t.to}|${t.by}`;
  assert.equal(h.transitions.reduce((s, t) => s + t.count, 0), h.events);
  for (const t of h.transitions) {
    if (allowed(t)) continue;
    const d = h.divergences[id(t)];
    assert.ok(d, `transição real sem explicação: ${id(t)} (${t.first})`);
    assert.ok(['legado', 'manual', 'cardColumn', 'fsd-issue', 'anomalia'].includes(d.category) && d.reason.length > 20, id(t));
  }
  for (const k of Object.keys(h.divergences)) assert.ok(h.transitions.some((t) => id(t) === k), `divergência sem transição: ${k}`);
});

const REPLAY = {
  cardColumn: (i, e) => assert.equal(cardColumn(i.pr, { pulled: !!i.pulled }), e.column ? STAGE[e.column] : null),
  ownersOf: (i, e) => assert.deepEqual(ownersOf(i.column), e.owners),
  uiDialog: (i, e) => assert.deepEqual(uiDialog(i.pane.join('\n')), e.dialog ?? null),
  resetTime: (i, e) => assert.equal(resetTime(i.pane.join('\n')), e.reset),
  shouldAlert: (i, e) => assert.equal(shouldAlert({ ...i.mem }, i.agent, i.state), e.alert),
  contextAction: (i, e) => assert.equal(contextAction(i), e.act),
  over: (i, e) => assert.deepEqual(over(i.cache, i.stopPct), e.over),
  findStalls: (i, e) => assert.deepEqual(findStalls({ cards: i.cards.map((c) => ({ ...c, movedAt: ms(c.movedAt) })), now: ms(i.now), stallMin: i.stallMin }).map((x) => x.key), e.keys),
  findPause: (i, e) => assert.deepEqual(findPause({ pauseAt: ms(i.pauseAt), now: ms(i.now), pauseMin: i.pauseMin }).map((x) => x.key), e.keys),
  findOldNotices: (i, e) => assert.deepEqual(findOldNotices({ inboxes: i.inboxes, now: ms(i.now), inboxMin: i.inboxMin }).map((x) => x.key), e.keys),
};
for (const c of cases.filter((x) => x.replay)) {
  test(`replay ${c.id} (${c.trigger}) with ${c.replay}`, () => { assert.ok(REPLAY[c.replay], c.replay); REPLAY[c.replay](c.input, c.expect); });
}

// F3.6 (T3.6.1): cada gatilho gravado gera no decide() a ação equivalente à do vigia, ou a divergência fica explicada.
import { decide } from './fsd-dispatch.mjs';
const { replay } = load('decide-replay.json');
test('F3.6: every trigger has exactly one decide() replay or an explained divergence', () => {
  assert.deepEqual(replay.map((r) => r.trigger).sort(), triggers.map((t) => t.id).sort());
  for (const r of replay) {
    assert.ok(!!r.decide !== !!r.divergence, r.trigger);
    if (r.divergence) assert.ok(['substituido', 'fim-do-dia', 'lease', 'permanece'].includes(r.divergence.category) && r.divergence.where && r.divergence.reason.length > 20, r.trigger);
    else assert.ok(r.note.length > 20, r.trigger);
  }
});
const strip = (acts) => acts.map((a) => (a.task ? { ...a, task: { kind: a.task.kind, n: a.task.n } } : a));
for (const r of replay.filter((x) => x.decide)) {
  test(`F3.6 replay ${r.trigger} in decide()`, () => assert.deepEqual(strip(decide(r.decide.state)), r.decide.expect));
}
