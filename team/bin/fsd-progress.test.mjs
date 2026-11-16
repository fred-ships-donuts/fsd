import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PR_FIELDS, findStalls, findPause, findOldNotices, buildCards } from './fsd-progress.mjs';

const BIN = new URL('.', import.meta.url).pathname;
const NOW = Date.parse('2026-11-16T12:00:00Z');
const ago = (m) => new Date(NOW - m * 60000).toISOString();
const card = (n, column, m, extra = {}) => ({ n, column, movedAt: ago(m), blocked: false, ...extra });

test('findStalls reports only the oldest quiet card, with its owner', () => {
  const r = findStalls({ now: NOW, stallMin: 20, cards: [card(1, 'Ready for Development (Stuart)', 30), card(2, 'In Review (Mel, Bob)', 90), card(3, 'Developing (Stuart)', 5)] });
  assert.equal(r.length, 1);
  assert.equal(r[0].key, 'stall:#2');
  assert.equal(r[0].line, 'parado: #2 em In Review há 90 min, dono: mel/bob');
});
test('findStalls names column and owner of a Ready for Development card', () => {
  const [f] = findStalls({ now: NOW, stallMin: 20, cards: [card(7, 'Ready for Development (Stuart)', 25)] });
  assert.equal(f.line, 'parado: #7 em Ready for Development há 25 min, dono: stuart');
});
test('findStalls: recent movement, Backlog, Done and blocked are ignored; the limit is inclusive', () => {
  const cards = [card(1, 'Developing (Stuart)', 19), card(2, 'Backlog (Kevin)', 999), card(3, 'Done', 999), card(4, 'Developing (Stuart)', 999, { blocked: true })];
  assert.deepEqual(findStalls({ now: NOW, stallMin: 20, cards }), []);
  assert.equal(findStalls({ now: NOW, stallMin: 20, cards: [card(5, 'Developing (Stuart)', 20)] }).length, 1);
});
test('findStalls: a movement changes sig', () => {
  const a = findStalls({ now: NOW, stallMin: 20, cards: [card(1, 'Developing', 30)] })[0];
  const b = findStalls({ now: NOW, stallMin: 20, cards: [card(1, 'Developing', 25)] })[0];
  assert.notEqual(a.sig, b.sig);
});
test('findPause and findOldNotices thresholds and lines', () => {
  assert.deepEqual(findPause({ now: NOW, pauseMin: 120, pauseAt: ago(119) }), []);
  assert.deepEqual(findPause({ now: NOW, pauseMin: 120, pauseAt: null }), []);
  const [p] = findPause({ now: NOW, pauseMin: 120, pauseAt: ago(130), path: '/x/PAUSE' });
  assert.equal(p.line, 'PAUSE ligado há 130 min (/x/PAUSE); o arquivo fica, é do autor');
  const r = findOldNotices({ now: NOW, inboxMin: 15, inboxes: { mel: [{ t: ago(40) }, { t: ago(2) }], bob: [{ t: ago(5) }], stuart: [] } });
  assert.deepEqual(r.map((f) => f.line), ['aviso parado há 40 min na caixa de mel (2 na fila)']);
});
test('buildCards takes the latest of board, issue, PR and last commit', () => {
  const closes = (b) => [...b.matchAll(/Closes #(\d+)/g)].map((m) => Number(m[1]));
  const cards = buildCards({
    closes,
    board: [{ column: 'In Review (Mel, Bob)', number: 5, updatedAt: ago(100) }, { column: 'Backlog (Kevin)', number: 6, updatedAt: ago(1) }, { column: 'Done', number: 7, updatedAt: ago(1) }],
    issues: [{ number: 5, updatedAt: ago(90), labels: [{ name: 'blocked' }] }, { number: 6, updatedAt: ago(1), labels: [] }],
    prs: [{ number: 50, body: 'Closes #5', updatedAt: ago(60), commits: [{ committedDate: ago(10) }] }],
  });
  assert.equal(cards.length, 1);
  assert.equal(Date.parse(cards[0].movedAt) === undefined, false);
  assert.equal(cards[0].movedAt, NOW - 10 * 60000);
  assert.equal(cards[0].blocked, true);
});

// CLI: estado isolado, fixture no lugar da leitura, fsd-notify de verdade (sem sessão tmux → cai na caixa de entrada do Kevin).
function run(args, fx, dir, extra = {}) {
  const f = join(dir, 'fx.json'); writeFileSync(f, JSON.stringify(fx));
  return spawnSync(join(BIN, 'fsd-progress'), [...args, '--fixture', f], { encoding: 'utf8', env: { PATH: process.env.PATH, HOME: dir, FSD_STATE: dir, FSD_AGENT: 'kevin', FSD_TMUX_SOCKET: 'fsd-progress-test-none', ...extra } });
}
const inbox = (dir) => (existsSync(join(dir, 'inbox/kevin')) ? readFileSync(join(dir, 'inbox/kevin'), 'utf8').trim().split('\n') : []);

test('CLI: stalled card → one line in Kevin\'s inbox from "vigia"; recent movement → none; repeat → none', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prog-'));
  const stale = { now: new Date(NOW).toISOString(), cards: [card(9, 'Ready for Development (Stuart)', 45)] };
  const r1 = run(['--now'], stale, dir);
  assert.equal(r1.status, 0, r1.stderr);
  assert.match(r1.stdout, /parado: #9 em Ready for Development há 45 min, dono: stuart/);
  const lines = inbox(dir); assert.equal(lines.length, 1);
  assert.equal(JSON.parse(lines[0]).from, 'vigia');
  run(['--now'], stale, dir); assert.equal(inbox(dir).length, 1);
  const dir2 = mkdtempSync(join(tmpdir(), 'prog-'));
  run(['--now'], { now: stale.now, cards: [card(9, 'Ready for Development (Stuart)', 3)] }, dir2); assert.equal(inbox(dir2).length, 0);
});
test('CLI: --dry prints, sends and persists nothing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prog-'));
  const r = run(['--dry'], { now: new Date(NOW).toISOString(), cards: [card(9, 'Developing (Stuart)', 45)] }, dir);
  assert.match(r.stdout, /parado: #9/);
  assert.equal(inbox(dir).length, 0);
  assert.equal(existsSync(join(dir, 'progress.json')), false);
});
test('CLI: old PAUSE and old notice each give one line; PAUSE stays', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prog-'));
  writeFileSync(join(dir, 'PAUSE'), '');
  const r = run(['--now'], { now: new Date(NOW).toISOString(), cards: [], pauseAt: ago(500), inboxes: { mel: [{ t: ago(60) }] } }, dir);
  assert.match(r.stdout, /PAUSE ligado há 500 min/); assert.match(r.stdout, /caixa de mel/);
  assert.equal(existsSync(join(dir, 'PAUSE')), true);
});
test('CLI never writes to GitHub', () => {
  for (const f of ['fsd-progress', 'fsd-progress.mjs']) assert.doesNotMatch(readFileSync(join(BIN, f), 'utf8'), /ghw|issue comment|-X (POST|PATCH)/);
});

test('a lista de PRs não pede commits (limite de 500.000 nós do GraphQL, #194)', () => {
  assert.ok(!PR_FIELDS.split(',').includes('commits'));
  assert.match(readFileSync(BIN + 'fsd-progress', 'utf8'), /\['pr', 'list', '--state', 'open', '--json', PR_FIELDS/);
});
