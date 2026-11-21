// F3.5: o merge pelo supervisor registra o motivo de cada recusa (T3.5.1); issue de agente fica fora do quadro com aguardando-autor
// e só entra no Backlog com a decisão do autor (T3.5.2, D8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decision, admission, HELD } from './fsd-admit.mjs';
import { REQUIRED_CI } from './fsd-lib.mjs';

const BIN = dirname(fileURLToPath(import.meta.url));
const AUTHOR = 'fredericojacobi';
const c = (login, body) => ({ author: { login }, body });
const iss = (number, comments, held = true) => ({ number, labels: held ? [{ name: HELD }, { name: 'size:S' }] : [{ name: 'size:S' }], comments });

test('decision reads only "Decision (author, …)" and says yes, no or nothing', () => {
  assert.equal(decision('Decision (author, 2026-11-21): aceito, pode entrar'), 'aceitar');
  assert.equal(decision('**Decision (author, 2026-11-21)**: recusado, fora do escopo'), 'recusar');
  assert.equal(decision('Decision (author, 2026-11-21): vou pensar'), null);
  assert.equal(decision('Decision (PM, 2026-11-21): aceito'), null);
  assert.equal(decision('aceito'), null);
});

test('admission: held issue + author decision → admit or close; a bot or the PM deciding does not count; the last author decision wins', () => {
  const acts = admission([
    iss(1, [c(AUTHOR, 'Decision (author, 2026-11-21): aceito')]),
    iss(2, [c(AUTHOR, 'Decision (author, 2026-11-21): recusado')]),
    iss(3, [c('fsd-kevin[bot]', 'Decision (author, 2026-11-21): aceito'), c('app/fsd-kevin', 'Decision (author, x): ok')]),
    iss(4, []),
    iss(5, [c(AUTHOR, 'Decision (author, 2026-11-21): aceito')], false),
    iss(6, [c(AUTHOR, 'Decision (author, 1): aceito'), c(AUTHOR, 'Decision (author, 2): não, descarte')]),
    iss(7, [c('FredericoJacobi', 'Decision (author, 2026-11-21): ok')]),
  ], { author: AUTHOR });
  assert.deepEqual(acts, [{ type: 'admit', n: 1 }, { type: 'close', n: 2, reason: 'not planned' }, { type: 'close', n: 6, reason: 'not planned' }, { type: 'admit', n: 7 }]);
  assert.deepEqual(admission([iss(1, [c(AUTHOR, 'Decision (author, x): aceito')])], { author: '' }), []);
});

test('fsd-admit (dry, fixture) removes the label and puts it in Backlog, or closes', () => {
  const d = mkdtempSync(join(tmpdir(), 'adm-')), f = join(d, 'issues.json');
  writeFileSync(f, JSON.stringify([iss(11, [c(AUTHOR, 'Decision (author, 2026-11-21): aceito')]), iss(12, [c(AUTHOR, 'Decision (author, 2026-11-21): recusado')]), iss(13, [])]));
  const r = spawnSync(join(BIN, 'fsd-admit'), [], { encoding: 'utf8', env: { ...process.env, FSD_DRY: '1', FSD_ADMIT_FIXTURE: f, FSD_AGENT: 'kevin', FSD_AUTHOR: AUTHOR } });
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /\[dry\] gh issue edit 11 --remove-label aguardando-autor/);
  assert.match(r.stdout, /\[dry\] fsd-board move "Backlog \(Kevin\)" 11/);
  assert.match(r.stdout, /\[dry\] gh issue close 12 --reason "not planned"/);
  assert.doesNotMatch(r.stdout, /\b13\b/);
});

const issueNew = (runner) => {
  const d = mkdtempSync(join(tmpdir(), 'iss-')), body = join(d, 'b.md'); writeFileSync(body, '## What\nx\n\n## Acceptance\n- y\n');
  return spawnSync(join(BIN, 'fsd-issue'), ['new', 'Algo novo', '--area', 'process', '--size', 'S', '--force', body], { encoding: 'utf8', env: { ...process.env, FSD_DRY: '1', FSD_AGENT: 'kevin', FSD_RUNNER: runner, FSD_STATE: d } }).stdout;
};
test('fsd-issue new in a session runner: label aguardando-autor and no board; the tmux team is unchanged', () => {
  const s = issueNew('session');
  assert.match(s, /--label area:process,size:S,aguardando-autor/); assert.match(s, /fora do quadro até a decisão do autor/); assert.doesNotMatch(s, /fsd-board move/);
  const t = issueNew('');
  assert.doesNotMatch(t, /aguardando-autor/); assert.match(t, /fsd-board move "Backlog \(Kevin\)"/);
});

const check = (name, conclusion) => ({ name, conclusion, status: 'COMPLETED', workflowName: 'regression' });
const approved = (login) => ({ state: 'APPROVED', author: { login }, commit: { oid: 'abc' } });
const pr = (o = {}) => ({ number: 7, state: 'OPEN', isDraft: false, baseRefName: 'develop', mergeable: 'MERGEABLE', headRefOid: 'abc', body: 'Closes #1', author: { login: 'fsd-stuart[bot]' }, reviews: [approved('fsd-mel[bot]'), approved('fsd-bob[bot]')], statusCheckRollup: REQUIRED_CI.map((n) => check(n, 'SUCCESS')), ...o });
test('T3.5.1: every merge attempt is logged with its reason in merges.jsonl (green merges, any gap refuses)', () => {
  const d = mkdtempSync(join(tmpdir(), 'mrg-'));
  const run = (p) => { const f = join(d, `pr${Math.random()}.json`); writeFileSync(f, JSON.stringify(p)); return spawnSync(process.execPath, [join(BIN, 'fsd-merge'), '7'], { encoding: 'utf8', env: { ...process.env, FSD_DRY: '1', FSD_MERGE_FIXTURE: f, FSD_STATE: d, FSD_AGENT: 'kevin' } }); };
  assert.equal(run(pr()).status, 0);
  assert.equal(run(pr({ reviews: [approved('fsd-mel[bot]')] })).status, 1);
  assert.equal(run(pr({ reviews: [approved('fsd-mel[bot]'), { ...approved('fsd-bob[bot]'), commit: { oid: 'old' } }] })).status, 1);
  assert.equal(run(pr({ mergeable: 'CONFLICTING' })).status, 1);
  assert.equal(run(pr({ statusCheckRollup: REQUIRED_CI.map((n, i) => check(n, i ? 'SUCCESS' : 'FAILURE')) })).status, 1);
  const log = readFileSync(join(d, 'merges.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(log.map((x) => x.code), [0, 1, 1, 1, 1]);
  assert.match(log[0].msg, /seria mesclado/); assert.match(log[1].msg, /1\/2 aprovações/); assert.match(log[2].msg, /1\/2 aprovações/);
  assert.match(log[3].msg, /conflito/); assert.match(log[4].msg, /CI da regressão vermelho/);
  assert.ok(log.every((x) => x.n === 7 && x.by === 'kevin' && x.t));
});
