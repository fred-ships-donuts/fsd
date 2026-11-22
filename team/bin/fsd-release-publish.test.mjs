// E5 (F5.3): o PR de release só entra com o autor aprovando o head e o CI verde; a tag assinada verifica (T5.3.1); os assets batem
// com os checksums e o SBOM é válido (T5.3.2); a auditoria é encadeada e acusa adulteração (T5.3.3); o rollback ensaia em dry (T5.3.4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { releaseGate, signTag, verifyTag, buildAssets, checksums, sha256File, validSbom, auditAppend, auditVerify, sectionOf } from './fsd-release.mjs';

const BIN = dirname(fileURLToPath(import.meta.url));
const green = () => 'green';
const pr = (o = {}) => ({ number: 300, state: 'OPEN', baseRefName: 'main', headRefName: 'release/v1.0.0', headRefOid: 'abc', mergeable: 'MERGEABLE', reviews: [{ state: 'APPROVED', author: { login: 'theauthor' }, commit: { oid: 'abc' } }], ...o });

test('T5.3.1 gate: author approval on the head and green CI; anything missing refuses with the reason', () => {
  assert.deepEqual(releaseGate(pr(), { author: 'theauthor', ciState: green }), []);
  assert.match(releaseGate(pr({ reviews: [{ state: 'APPROVED', author: { login: 'fsd-mel' }, commit: { oid: 'abc' } }] }), { author: 'theauthor', ciState: green }).join(), /sem a aprovação do autor/);
  assert.match(releaseGate(pr({ reviews: [{ state: 'APPROVED', author: { login: 'theauthor' }, commit: { oid: 'old' } }] }), { author: 'theauthor', ciState: green }).join(), /no head/);
  assert.match(releaseGate(pr({ reviews: [{ state: 'APPROVED', author: { login: 'theauthor' }, commit: { oid: 'abc' } }, { state: 'CHANGES_REQUESTED', author: { login: 'theauthor' }, commit: { oid: 'abc' } }] }), { author: 'theauthor', ciState: green }).join(), /sem a aprovação/);
  assert.match(releaseGate(pr(), { author: 'theauthor', ciState: () => 'pending' }).join(), /CI pending/);
  assert.match(releaseGate(pr({ baseRefName: 'develop', headRefName: 'feat/x' }), { author: 'theauthor', ciState: green }).join(), /base develop.*head feat\/x/);
});

const hasSsh = spawnSync('ssh-keygen', ['-?']).status !== 127;
test('T5.3.1: the SSH-signed tag verifies against the allowed signers; an unsigned or foreign tag does not', { skip: !hasSsh }, () => {
  const d = mkdtempSync(join(tmpdir(), 'tag-')); const env = { GIT_AUTHOR_NAME: 'r', GIT_AUTHOR_EMAIL: 'release@fsd', GIT_COMMITTER_NAME: 'r', GIT_COMMITTER_EMAIL: 'release@fsd' };
  const g = (...a) => { const r = spawnSync('git', ['-C', d, ...a], { encoding: 'utf8', env: { ...process.env, ...env } }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
  g('init', '-q'); writeFileSync(join(d, 'a'), '1'); g('add', 'a'); g('commit', '-qm', 'release: v1.0.0');
  for (const k of ['key', 'other']) spawnSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-C', 'release@fsd', '-f', join(d, k)]);
  const allowed = join(d, 'allowed'); writeFileSync(allowed, `release@fsd namespaces="git" ${readFileSync(join(d, 'key.pub'), 'utf8')}`);
  process.env.GIT_COMMITTER_EMAIL = 'release@fsd'; process.env.GIT_COMMITTER_NAME = 'r';
  signTag({ repo: d, tag: 'v1.0.0', sha: 'HEAD', key: join(d, 'key'), message: 'fsd v1.0.0' });
  const ok = verifyTag({ repo: d, tag: 'v1.0.0', allowedSigners: allowed }); assert.equal(ok.ok, true, ok.out); assert.match(ok.out, /Good "git" signature/);
  g('tag', '-a', 'v1.0.1', '-m', 'unsigned'); assert.equal(verifyTag({ repo: d, tag: 'v1.0.1', allowedSigners: allowed }).ok, false);
  signTag({ repo: d, tag: 'v1.0.2', sha: 'HEAD', key: join(d, 'other'), message: 'foreign' }); assert.equal(verifyTag({ repo: d, tag: 'v1.0.2', allowedSigners: allowed }).ok, false);
});

test('T5.3.2: assets of a package (npm pack, CycloneDX SBOM, SHA256SUMS) match their checksums; no npm publish', () => {
  const d = mkdtempSync(join(tmpdir(), 'pkg-')); writeFileSync(join(d, 'package.json'), JSON.stringify({ name: 'tiny', version: '1.2.3', files: ['index.js'] })); writeFileSync(join(d, 'index.js'), 'export default 1\n');
  spawnSync('npm', ['install', '--package-lock-only', '--silent'], { cwd: d });
  const a = buildAssets({ repo: d, out: join(d, 'out') });
  const sums = readFileSync(a.sums, 'utf8'); assert.equal(sums, checksums([a.tgz, a.sbom]));
  for (const line of sums.trim().split('\n')) { const [h, name] = line.split(/\s+/); assert.equal(sha256File(join(d, 'out', name)), h); }
  assert.deepEqual(validSbom(JSON.parse(readFileSync(a.sbom, 'utf8')), { name: 'tiny', version: '1.2.3' }), []);
  assert.match(validSbom({ bomFormat: 'X' }, { name: 'tiny', version: '1' }).join(), /CycloneDX/);
  assert.doesNotMatch(readFileSync(join(BIN, 'fsd-release'), 'utf8'), /npm publish/);
});

test('T5.3.3: the audit is a hash chain; editing an entry breaks it', () => {
  const f = join(mkdtempSync(join(tmpdir(), 'aud-')), 'releases.jsonl');
  auditAppend(f, { event: 'release', tag: 'v1.0.0', sha: 'a' }); auditAppend(f, { event: 'release', tag: 'v1.1.0', sha: 'b' }); auditAppend(f, { event: 'rollback', tag: 'v1.1.0', fix: 'v1.1.1' });
  assert.deepEqual(auditVerify(f), { ok: true, entries: 3 });
  writeFileSync(f, readFileSync(f, 'utf8').replace('"sha":"a"', '"sha":"z"'));
  assert.deepEqual(auditVerify(f), { ok: false, at: 1 });
});

test('the release notes are the version section of the CHANGELOG', () => {
  assert.equal(sectionOf('## [Unreleased]\n\n## [1.1.0] - d\n\n### Fixed\n\n- A.\n\n## [1.0.0] - d\n\n- B.\n', '1.1.0'), '### Fixed\n\n- A.');
});

test('publish --dry with an approved, green PR; refusal without approval; rollback --dry; audit verify', () => {
  const d = mkdtempSync(join(tmpdir(), 'pub-')); const fx = join(d, 'pr.json');
  const ci = ['build', 'test', 'paths', 'shellcheck'].map((name) => ({ name, status: 'COMPLETED', conclusion: 'SUCCESS', workflowName: 'regression' }));
  const author = JSON.parse(readFileSync(join(BIN, '..', 'agents.json'), 'utf8')).author;
  const run = (args, p) => { writeFileSync(fx, JSON.stringify(p)); return spawnSync(join(BIN, 'fsd-release'), args, { encoding: 'utf8', env: { ...process.env, FSD_RELEASE_FIXTURE: fx, FSD_STATE: d } }); };
  const ok = run(['publish', '300', '--dry'], pr({ statusCheckRollup: ci, reviews: [{ state: 'APPROVED', author: { login: author }, commit: { oid: 'abc' } }] }));
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  for (const step of ['gh pr merge 300 --merge --match-head-commit abc', 'git tag -s v1.0.0', 'git push origin v1.0.0', 'npm sbom (CycloneDX), SHA256SUMS', 'gh release create v1.0.0 --verify-tag']) assert.ok(ok.stdout.includes(step), step);
  const no = run(['publish', '300', '--dry'], pr({ statusCheckRollup: ci, reviews: [] })); assert.equal(no.status, 1); assert.match(no.stdout, /sem a aprovação do autor/);
  const rb = spawnSync(join(BIN, 'fsd-release'), ['rollback', 'v1.1.0', 'v1.1.1', '--dry'], { encoding: 'utf8' });
  assert.match(rb.stdout, /gh release edit v1\.1\.0 --prerelease .*Superseded by v1\.1\.1/); assert.match(rb.stdout, /a tag não é movida nem apagada/);
  auditAppend(join(d, 'releases.jsonl'), { event: 'release', tag: 'v1.0.0' });
  assert.equal(spawnSync(join(BIN, 'fsd-release'), ['audit', 'verify'], { encoding: 'utf8', env: { ...process.env, FSD_STATE: d } }).status, 0);
});
