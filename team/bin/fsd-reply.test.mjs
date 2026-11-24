import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { replyPlan } from './fsd-reply.mjs';

const BIN = dirname(fileURLToPath(import.meta.url)), TEAM = join(BIN, '..');
const rv = (login, state) => ({ id: `R_${login}_${state}`, state, author: { login: `app/${login}` }, body: 'x', commit: { oid: 'abc' } });
const PR = (reviews, extra = {}) => ({ number: 7, title: 't', body: 'Closes #1', state: 'OPEN', isDraft: false, baseRefName: 'develop', headRefName: 'feature/1-x', headRefOid: 'abc',
  author: { login: 'app/fsd-stuart' }, reviews, comments: [], reviewRequests: [], mergeable: 'MERGEABLE', mergeCommit: null, statusCheckRollup: [], url: 'u', files: [], diff: '', ...extra });

test('replyPlan: a change request opens the reply and names who asked', () => {
  assert.deepEqual(replyPlan(PR([rv('fsd-bob', 'CHANGES_REQUESTED'), rv('fsd-mel', 'APPROVED')])), { ok: true, reviewers: ['fsd-bob'] });
});
test('replyPlan: no change request, an approved change request or a closed PR are refused with one line', () => {
  for (const p of [PR([]), PR([rv('fsd-bob', 'CHANGES_REQUESTED'), rv('fsd-bob', 'APPROVED')]), PR([rv('fsd-bob', 'CHANGES_REQUESTED')], { state: 'CLOSED' })]) {
    const r = replyPlan(p); assert.equal(r.ok, false); assert.doesNotMatch(r.error, /\n/);
  }
});

function fsdPr(pr, args, input) {
  const d = mkdtempSync(join(tmpdir(), 'reply-')); writeFileSync(join(d, 'gh.json'), JSON.stringify({ issues: {}, prs: { 7: pr } }));
  return spawnSync(join(BIN, 'fsd-pr'), args, { input, encoding: 'utf8', cwd: d, env: { ...process.env, FSD_RUNNER: 'session', FSD_AGENT: 'stuart', FSD_GH: join(TEAM, 'setup', 'fake-gh'), FAKE_GH_STATE: join(d, 'gh.json'), FSD_BOARD_FAKE: join(d, 'board.json'), FSD_STATE: join(d, 'st'), FSD_TEAM: TEAM, FSD_DRY: '1' } });
}
test('fsd-pr reply (FSD_DRY=1) on Changes Requested: comment, review asked again, card to In Review', () => {
  const r = fsdPr(PR([rv('fsd-bob', 'CHANGES_REQUESTED')]), ['reply', '7', '-'], 'Fixed in the description.');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /\[dry\] (?:fake-)?gh pr comment 7 --body-file - <<"Fixed in the description\."/);
  assert.match(r.stdout, /\[dry\] (?:fake-)?gh pr edit 7 --add-reviewer fsd-bob/);
  assert.match(r.stdout, /\[dry\] fsd-board move "?In Review/);
});
test('fsd-pr reply on a PR with no change request: one line on stderr, exit 1, nothing written', () => {
  const r = fsdPr(PR([rv('fsd-bob', 'APPROVED')]), ['reply', '7', '-'], 'hi');
  assert.equal(r.status, 1); assert.equal(r.stderr.trim().split('\n').length, 1); assert.doesNotMatch(r.stdout, /\[dry\]/);
});
