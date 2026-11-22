// F4.4: o juiz continua -p curto, chamado pelo supervisor no impasse; as fixtures de team/docs/judge-fixtures passam sem claude nem
// GitHub (FSD_JUDGE_FIXTURE + FSD_JUDGE_META, com FSD_DRY): o veredito de confiança alta comenta e avisa; os outros casos vão ao autor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = dirname(fileURLToPath(import.meta.url)); const FX = join(BIN, '..', 'docs', 'judge-fixtures');
function judge(fixture, { lock, judged, labels = [] } = {}) {
  const st = mkdtempSync(join(tmpdir(), 'jst-')), js = mkdtempSync(join(tmpdir(), 'jjs-')), meta = join(st, 'meta.json');
  writeFileSync(meta, JSON.stringify({ kind: 'pr', title: 'Deadlock on #91', state: 'OPEN', labels, url: 'https://github.com/x/y/pull/91' }));
  if (lock) writeFileSync(join(js, 'judge.lock'), JSON.stringify({ ref: '#91', pid: process.pid, since: new Date().toISOString() }));
  if (judged) { mkdirSync(join(js, 'judged')); writeFileSync(join(js, 'judged', '91.json'), '{}'); }
  const r = spawnSync(join(BIN, 'fsd-judge'), ['91'], { encoding: 'utf8', env: { ...process.env, FSD_AGENT: 'kevin', FSD_DRY: '1', FSD_STATE: st, FSD_JUDGE_STATE: js, FSD_JUDGE_META: meta, FSD_JUDGE_FIXTURE: join(FX, fixture) } });
  const lines = (r.stdout || '').split('\n').filter((l) => !l.startsWith('[dry] claude '));   // a 1ª linha em dry é o argv do claude
  return { ...r, stdout: lines.join('\n'), js };
}
const AUTHOR = {
  'low.json': 'low confidence', 'overrides-author.json': 'overrides an author decision', 'owner-author.json': 'reserved matter', 'reserved-flag.json': 'reserved matter',
  'reserved-39.json': 'reserved matter', 'reserved-main-word.json': 'reserved matter', 'not-json.txt': 'invalid JSON', 'missing-confidence.json': 'invalid JSON',
};

test('high.json: verdict JSON on line 1, the Decision (judge) comment and the continue/wait notices; nothing written in dry', () => {
  const r = judge('high.json'); assert.equal(r.status, 0, r.stdout + r.stderr);
  const [first, ...rest] = r.stdout.split('\n'); assert.equal(JSON.parse(first).confidence, 'high');
  assert.match(rest.join('\n'), /\*\*Decision \(judge, \d{4}-\d{2}-\d{2}\)\*\*/); assert.match(rest.join('\n'), /continues:/);
  assert.equal(existsSync(join(r.js, 'judged')), false);
});
for (const [f, why] of Object.entries(AUTHOR)) {
  test(`${f}: author decision needed (${why}), nothing applied`, () => {
    const r = judge(f); assert.equal(r.status, 0); assert.match(r.stdout.split('\n')[0], new RegExp(`author decision needed \\(${why.replace(/[()]/g, '\\$&')}\\)`));
    assert.match(r.stdout, /\*\*Deadlock: author decision needed\*\*/); assert.doesNotMatch(r.stdout, /Decision \(judge/);
  });
}
test('a fixture that does not exist → judge error; a lock held → refused; a second deadlock → author', () => {
  assert.match(judge('nao-existe.json').stdout, /author decision needed \(judge error\)/);
  const l = judge('high.json', { lock: true }); assert.equal(l.status, 1); assert.match(l.stdout, /a judge is running for #91/);
  assert.match(judge('high.json', { judged: true }).stdout, /author decision needed \(second deadlock\)/);
});
test('a ref with the decision label is reserved for the author', () => assert.match(judge('high.json', { labels: [{ name: 'decision' }] }).stdout, /author decision needed \(reserved matter\)/));
test('every documented fixture is exercised here', () => {
  const files = readdirSync(FX).filter((f) => f !== 'README.md').sort();
  assert.deepEqual(files, ['high.json', ...Object.keys(AUTHOR)].sort());
});
test('FSD_JUDGE_META only with FSD_DRY', () => {
  const r = spawnSync(join(BIN, 'fsd-judge'), ['91'], { encoding: 'utf8', env: { ...process.env, FSD_AGENT: 'kevin', FSD_DRY: '', FSD_JUDGE_META: '/x', FSD_JUDGE_STATE: mkdtempSync(join(tmpdir(), 'j-')) } });
  assert.equal(r.status, 2); assert.match(r.stdout, /só vale com FSD_DRY/);
});
