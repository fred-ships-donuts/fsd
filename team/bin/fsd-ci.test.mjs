import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ciState, ready, REQUIRED_CI } from './fsd-lib.mjs';

const check = (name, conclusion, status = 'COMPLETED') => ({ name, conclusion, status, workflowName: 'regression' });
const all = (conclusion) => REQUIRED_CI.map((n) => check(n, conclusion));
const approved = (login) => ({ state: 'APPROVED', author: { login }, commit: { oid: 'abc' } });
const pr = (rollup) => ({ state: 'OPEN', isDraft: false, baseRefName: 'develop', mergeable: 'MERGEABLE', headRefOid: 'abc', author: { login: 'fsd-stuart[bot]' }, reviews: [approved('fsd-mel[bot]'), approved('fsd-bob[bot]')], statusCheckRollup: rollup });

test('ciState: green only when every required job succeeded', () => {
  assert.equal(ciState({ statusCheckRollup: all('SUCCESS') }), 'green');
});

test('ciState: a failed job is red even while others are pending', () => {
  assert.equal(ciState({ statusCheckRollup: [check('build', 'FAILURE'), check('test', '', 'IN_PROGRESS')] }), 'red');
});

test('ciState: pending when a job is running or missing, and with no checks yet', () => {
  assert.equal(ciState({ statusCheckRollup: [...all('SUCCESS').slice(1), check('build', '', 'IN_PROGRESS')] }), 'pending');
  assert.equal(ciState({ statusCheckRollup: all('SUCCESS').slice(1) }), 'pending');
  assert.equal(ciState({ statusCheckRollup: [] }), 'pending');
  assert.equal(ciState({}), 'pending');
});

test('ciState: checks of other workflows do not count', () => {
  const other = REQUIRED_CI.map((n) => ({ ...check(n, 'SUCCESS'), workflowName: 'other' }));
  assert.equal(ciState({ statusCheckRollup: other }), 'pending');
});

test('ready: 2 approvals need green CI', () => {
  assert.equal(ready(pr(all('SUCCESS'))), true);
  assert.equal(ready(pr(all('FAILURE'))), false);
  assert.equal(ready(pr([])), false);
  assert.equal(ready(pr(all('SUCCESS').slice(1))), false);
});
