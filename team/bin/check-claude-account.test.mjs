import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHECK = join(dirname(fileURLToPath(import.meta.url)), '..', 'setup', 'check-claude-account');
const SECRET = 'sk-ant-oat01-NOT-A-REAL-TOKEN';
function run(account, want) {
  const home = mkdtempSync(join(tmpdir(), 'claude-acc-'));
  if (account) writeFileSync(join(home, '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: account, organizationName: 'Org X' }, accessToken: SECRET }));
  const env = { ...process.env, HOME: home }; delete env.FSD_CLAUDE_ACCOUNT; if (want) env.FSD_CLAUDE_ACCOUNT = want;
  const r = spawnSync(process.execPath, [CHECK], { encoding: 'utf8', env });
  assert.doesNotMatch(r.stdout + r.stderr, /sk-ant|NOT-A-REAL/);   // só o e-mail, nunca o token
  return r;
}
test('another account fails with /logout then /login', () => {
  const r = run('work@corp.example', 'me@home.example');
  assert.equal(r.status, 1); assert.match(r.stdout, /work@corp\.example.*\/logout.*\/login com me@home\.example/);
});
test('the expected account passes (case-insensitive)', () => assert.equal(run('Me@Home.example', 'me@home.example').status, 0));
test('without FSD_CLAUDE_ACCOUNT it shows the account and organization and passes', () => {
  const r = run('me@home.example', ''); assert.equal(r.status, 0); assert.match(r.stdout, /me@home\.example \(Org X\)/);
});
test('no login: exit 2', () => assert.equal(run(null, 'me@home.example').status, 2));
