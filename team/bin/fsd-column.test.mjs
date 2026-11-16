import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardColumn, prFromGh, prFromGraphQL } from './fsd-column.mjs';
import { STAGE } from './fsd-lib.mjs';

const H = 'head1', OLD = 'old0';
const rv = (author, state, commit = H) => ({ author, state, commit });
const pr = (o = {}) => ({ state: 'OPEN', isDraft: false, headRefOid: H, mergeable: 'MERGEABLE', author: 'fsd-stuart[bot]', reviews: [], reviewRequests: [], checks: 'SUCCESS', ...o });
const two = [rv('fsd-mel[bot]', 'APPROVED'), rv('fsd-bob[bot]', 'APPROVED')];

test('new PR → In Review', () => assert.equal(cardColumn(pr()), STAGE.review));
test('change request on the head → Changes Requested', () => assert.equal(cardColumn(pr({ reviews: [rv('fsd-bob[bot]', 'CHANGES_REQUESTED')] })), STAGE.changes));
test('conflict → Changes Requested', () => assert.equal(cardColumn(pr({ mergeable: 'CONFLICTING' })), STAGE.changes));
test('Stuart pulled it → Developing', () => {
  assert.equal(cardColumn(pr({ reviews: [rv('fsd-bob[bot]', 'CHANGES_REQUESTED')] }), { pulled: true }), STAGE.dev);
  assert.equal(cardColumn(pr({ mergeable: 'CONFLICTING' }), { pulled: true }), STAGE.dev);
});
test('new push (review on an old commit) → In Review', () => assert.equal(cardColumn(pr({ reviews: [rv('fsd-bob[bot]', 'CHANGES_REQUESTED', OLD)] })), STAGE.review));
test('re-review request after a change request → In Review', () => assert.equal(cardColumn(pr({ reviews: [rv('fsd-bob[bot]', 'CHANGES_REQUESTED')], reviewRequests: ['fsd-bob'] })), STAGE.review));
test('2 approvals + no conflict + SUCCESS → Ready to Merge', () => assert.equal(cardColumn(pr({ reviews: two })), STAGE.mergeReady));
test('2 approvals + FAILURE or PENDING → In Review', () => {
  assert.equal(cardColumn(pr({ reviews: two, checks: 'FAILURE' })), STAGE.review);
  assert.equal(cardColumn(pr({ reviews: two, checks: 'PENDING' })), STAGE.review);
});
test('2 approvals + mergeable UNKNOWN → In Review', () => assert.equal(cardColumn(pr({ reviews: two, mergeable: 'UNKNOWN' })), STAGE.review));
test('merged → Done', () => assert.equal(cardColumn(pr({ state: 'MERGED' })), STAGE.done));
test('draft and closed → null', () => { assert.equal(cardColumn(pr({ isDraft: true })), null); assert.equal(cardColumn(pr({ state: 'CLOSED' })), null); });
test('NONE checks count as green', () => assert.equal(cardColumn(pr({ reviews: two, checks: 'NONE' })), STAGE.mergeReady));
test("the author's own approval does not count", () => assert.equal(cardColumn(pr({ reviews: [rv('fsd-stuart[bot]', 'APPROVED'), rv('fsd-mel[bot]', 'APPROVED')] })), STAGE.review));
test('an approval on an old commit does not count', () => assert.equal(cardColumn(pr({ reviews: [rv('fsd-mel[bot]', 'APPROVED', OLD), rv('fsd-bob[bot]', 'APPROVED')] })), STAGE.review));

test('prFromGraphQL and prFromGh give the same shape for the same PR', () => {
  const gql = { number: 1, state: 'OPEN', isDraft: false, headRefOid: H, mergeable: 'MERGEABLE', body: 'Closes #5', author: { login: 'fsd-stuart[bot]' },
    reviews: { nodes: [{ author: { login: 'fsd-bob[bot]' }, state: 'CHANGES_REQUESTED', commit: { oid: H } }] },
    reviewRequests: { nodes: [{ requestedReviewer: { login: 'fsd-mel' } }] },
    commits: { nodes: [{ commit: { statusCheckRollup: { state: 'SUCCESS' } } }] } };
  const gh = { state: 'OPEN', isDraft: false, headRefOid: H, mergeable: 'MERGEABLE', body: 'Closes #5', author: { login: 'fsd-stuart[bot]' },
    reviews: [{ author: { login: 'fsd-bob[bot]' }, state: 'CHANGES_REQUESTED', commit: { oid: H } }],
    reviewRequests: [{ login: 'fsd-mel' }], statusCheckRollup: [{ conclusion: 'SUCCESS', status: 'COMPLETED' }] };
  assert.deepEqual(prFromGraphQL(gql), prFromGh(gh));
});
test('check rollups map to SUCCESS / FAILURE / PENDING / NONE', () => {
  const c = (l) => prFromGh({ statusCheckRollup: l }).checks;
  assert.equal(c(null), 'NONE'); assert.equal(c([]), 'NONE');
  assert.equal(c([{ conclusion: 'SUCCESS' }, { state: 'ERROR' }]), 'FAILURE');
  assert.equal(c([{ conclusion: 'SUCCESS' }, { state: 'EXPECTED' }]), 'PENDING');
  assert.equal(prFromGraphQL({ commits: { nodes: [{ commit: { statusCheckRollup: { state: 'ERROR' } } }] } }).checks, 'FAILURE');
});
