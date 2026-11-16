import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkoutState, followDevelop } from './fsd-follow.mjs';

const g = (d, ...a) => { const r = spawnSync('git', ['-C', d, ...a], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
// origin com develop; clone no branch develop; o origin avança N commits.
function setup(ahead = 1) {
  const root = mkdtempSync(join(tmpdir(), 'fsd-follow-')); const o = join(root, 'o'); const c = join(root, 'c');
  g(root, 'init', '-q', '-b', 'develop', o); g(o, 'config', 'user.email', 'a@a'); g(o, 'config', 'user.name', 'a');
  writeFileSync(join(o, 'f'), '0'); g(o, 'add', '.'); g(o, 'commit', '-qm', 'c0');
  g(root, 'clone', '-q', o, c); g(c, 'config', 'user.email', 'a@a'); g(c, 'config', 'user.name', 'a');
  for (let i = 1; i <= ahead; i++) { writeFileSync(join(o, 'f'), String(i)); g(o, 'commit', '-qam', `c${i}`); }
  g(c, 'fetch', '-q', 'origin');
  return { o, c };
}

test('em dia: nada a fazer', () => { const { c } = setup(0); assert.equal(checkoutState(c).state, 'ok'); });
test('atrás, em develop e limpo: avança por ff-only', () => {
  const { c } = setup(2); assert.equal(checkoutState(c).state, 'behind'); assert.equal(checkoutState(c).behind, 2);
  const r = followDevelop(c); assert.equal(r.moved, true); assert.equal(g(c, 'rev-parse', 'HEAD'), g(c, 'rev-parse', 'origin/develop'));
});
test('mudança local: não toca em nada e diz o motivo', () => {
  const { c } = setup(); writeFileSync(join(c, 'f'), 'local'); const before = g(c, 'rev-parse', 'HEAD');
  const r = followDevelop(c); assert.equal(r.state, 'dirty'); assert.match(r.msg, /mudanças locais/); assert.equal(g(c, 'rev-parse', 'HEAD'), before); assert.equal(g(c, 'status', '--porcelain', '-uno'), 'M f');
});
test('outro branch: não toca em nada', () => {
  const { c } = setup(); g(c, 'checkout', '-q', '-b', 'feature/x'); const before = g(c, 'rev-parse', 'HEAD');
  const r = followDevelop(c); assert.equal(r.state, 'other-branch'); assert.match(r.msg, /feature\/x/); assert.equal(g(c, 'rev-parse', 'HEAD'), before);
});
test('develop local com commit próprio (divergiu): ff-only recusa e não muda nada', () => {
  const { c } = setup(); writeFileSync(join(c, 'g'), 'x'); g(c, 'add', '.'); g(c, 'commit', '-qm', 'local'); const before = g(c, 'rev-parse', 'HEAD');
  const r = followDevelop(c); assert.equal(r.state, 'error'); assert.equal(g(c, 'rev-parse', 'HEAD'), before);
});
