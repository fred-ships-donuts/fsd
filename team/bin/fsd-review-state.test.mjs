// Na sessão nova o fsd-review e o fsd-trash guardam o que é do papel fora do /tmp, que é de todos os usuários.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const BIN = dirname(fileURLToPath(import.meta.url));
test('fsd-review in a role session keeps its state in the folder of the role', () => {
  const d = mkdtempSync(join(tmpdir(), 'rv-')), pr = { number: 7, title: 'p', body: 'Closes #1', state: 'OPEN', isDraft: false, baseRefName: 'develop', headRefName: 'b', headRefOid: 'a'.repeat(40), author: { login: 'app/fsd-stuart' }, reviews: [], reviewRequests: [], statusCheckRollup: [], mergeable: 'MERGEABLE', mergeCommit: null, url: 'u', files: [] };
  writeFileSync(join(d, 'gh.json'), JSON.stringify({ issues: {}, prs: { 7: pr } })); writeFileSync(join(d, 'board.json'), '{}');
  const r = spawnSync(join(BIN, 'fsd-review'), ['start', '7'], { encoding: 'utf8', env: { ...process.env, FSD_AGENT: 'mel', FSD_RUNNER: 'session', FSD_STATE: d, FSD_REPO: d, FSD_GH: join(BIN, '..', 'setup', 'fake-gh'), FAKE_GH_STATE: join(d, 'gh.json'), FSD_BOARD_FAKE: join(d, 'board.json') } });
  assert.ok(existsSync(join(d, 'review', 'review-7.json')), r.stdout + r.stderr);
});
test('fsd-trash in a role session moves to the home of the role; FSD_TRASH_DIR still wins', () => {
  const h = mkdtempSync(join(tmpdir(), 'tr-')), run = (env) => { const f = join(h, `f${Math.random()}`); writeFileSync(f, 'x'); const r = spawnSync(join(BIN, 'fsd-trash'), [f], { encoding: 'utf8', env: { ...process.env, HOME: h, FSD_AGENT: 'mel', FSD_REPO: join(h, 'repo'), FSD_RUNNER: 'session', ...env } }); assert.equal(r.status, 0, r.stderr); };
  mkdirSync(join(h, 'repo')); run({}); assert.equal(readdirSync(join(h, '.cache', 'fsd-trash', 'mel')).length, 1);
  run({ FSD_TRASH_DIR: join(h, 'lixo') }); assert.equal(readdirSync(join(h, 'lixo', 'mel')).length, 1); assert.equal(readdirSync(join(h, '.cache', 'fsd-trash', 'mel')).length, 1);
});
