// fsd-merge: o portão de merge (mergeGate) exige o CI da regressão verde, e o comando recusa CI vermelho ou pendente.
// O comando roda com FSD_DRY=1 e FSD_MERGE_FIXTURE (o PR vem de um arquivo, sem gh nem rede).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { mergeGate, REQUIRED_CI } from './fsd-lib.mjs';

const BIN = dirname(fileURLToPath(import.meta.url));
const check = (name, conclusion, status = 'COMPLETED') => ({ name, conclusion, status, workflowName: 'regression' });
const ci = (conclusion) => REQUIRED_CI.map((n) => check(n, conclusion));
const approved = (login) => ({ state: 'APPROVED', author: { login }, commit: { oid: 'abc' } });
const pr = (over = {}) => ({ number: 7, state: 'OPEN', isDraft: false, baseRefName: 'develop', mergeable: 'MERGEABLE', headRefOid: 'abc', body: 'Closes #1', author: { login: 'fsd-stuart[bot]' }, reviews: [approved('fsd-mel[bot]'), approved('fsd-bob[bot]')], statusCheckRollup: ci('SUCCESS'), ...over });

function merge(p, ...args) {
  const d = mkdtempSync(join(tmpdir(), 'fsd-merge-'));
  const f = join(d, 'pr.json'); writeFileSync(f, JSON.stringify(p));
  const r = spawnSync(process.execPath, [join(BIN, 'fsd-merge'), String(p.number), ...args], { encoding: 'utf8', env: { ...process.env, FSD_DRY: '1', FSD_MERGE_FIXTURE: f, FSD_STATE: d } });
  return { code: r.status, out: r.stdout + r.stderr };
}

test('mergeGate: green CI, 2 current approvals and no conflict can merge', () => {
  assert.deepEqual(mergeGate(pr()).fail, []);
});

test('mergeGate: red CI is refused', () => {
  const g = mergeGate(pr({ statusCheckRollup: [check('build', 'FAILURE'), ...ci('SUCCESS').slice(1)] }));
  assert.equal(g.fail.length, 1); assert.match(g.fail[0], /CI da regressão vermelho/);
});

test('mergeGate: pending or missing CI is refused', () => {
  assert.match(mergeGate(pr({ statusCheckRollup: [] })).fail.join(), /CI da regressão pendente/);
  assert.match(mergeGate(pr({ statusCheckRollup: [check('test', '', 'IN_PROGRESS'), ...ci('SUCCESS').slice(1)] })).fail.join(), /pendente/);
});

test('mergeGate: the other rules still hold', () => {
  assert.match(mergeGate(pr({ reviews: [approved('fsd-mel[bot]')] })).fail.join(), /1\/2 aprovações/);
  assert.match(mergeGate(pr({ mergeable: 'CONFLICTING' })).fail.join(), /conflito/);
  assert.match(mergeGate(pr({ baseRefName: 'main' })).fail.join(), /base main/);
  assert.equal(mergeGate(pr({ mergeable: 'UNKNOWN' })).calculating, true);
});

test('fsd-merge <n>: green merges (dry), red and pending exit 1 with the reason', () => {
  const ok = merge(pr());
  assert.equal(ok.code, 0, ok.out); assert.match(ok.out, /seria mesclado/);
  const red = merge(pr({ statusCheckRollup: [check('paths', 'FAILURE'), ...ci('SUCCESS').filter((c) => c.name !== 'paths')] }));
  assert.equal(red.code, 1, red.out); assert.match(red.out, /CI da regressão vermelho/);
  const pend = merge(pr({ statusCheckRollup: [] }));
  assert.equal(pend.code, 1, pend.out); assert.match(pend.out, /CI da regressão pendente/);
});

test('fsd-merge <n> --check: reports ready without merging', () => {
  const r = merge(pr(), '--check');
  assert.equal(r.code, 0, r.out); assert.match(r.out, /pronto para merge/);
});

test('fsd-merge: the fixture only works with FSD_DRY=1', () => {
  const d = mkdtempSync(join(tmpdir(), 'fsd-merge-')); const f = join(d, 'pr.json'); writeFileSync(f, JSON.stringify(pr()));
  const r = spawnSync(process.execPath, [join(BIN, 'fsd-merge'), '7'], { encoding: 'utf8', env: { ...process.env, FSD_DRY: '', FSD_MERGE_FIXTURE: f } });
  assert.equal(r.status, 2);
});
