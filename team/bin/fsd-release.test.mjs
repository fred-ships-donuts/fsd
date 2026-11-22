// E5 (F5.2): a próxima versão pelos commits do produto (T5.2.1), a seção do CHANGELOG e a versão do package.json (T5.2.2) e o PR de
// release com notas, versão, checklist e o autor como revisor (T5.2.3, dry).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bumpOf, nextVersion, promoteUnreleased, setPackageVersion, releaseBody, CHECKLIST } from './fsd-release.mjs';

const BIN = dirname(fileURLToPath(import.meta.url));
const c = (subject, files = ['src/cli/x.ts'], body = '') => ({ subject, files, body });

test('T5.2.1: bump per commit — only what ships counts', () => {
  assert.equal(bumpOf(c('feat: x')), 'minor'); assert.equal(bumpOf(c('fix(cli): x')), 'patch'); assert.equal(bumpOf(c('perf: x')), 'patch');
  assert.equal(bumpOf(c('feat!: drop --old')), 'major'); assert.equal(bumpOf(c('fix: x', ['src/a.ts'], 'BREAKING CHANGE: exit code 2 is now 3')), 'major');
  assert.equal(bumpOf(c('feat: team tool', ['team/bin/fsd-x'])), 'none'); assert.equal(bumpOf(c('docs: x')), 'none'); assert.equal(bumpOf(c('chore: deps', ['package.json'])), 'none');
  assert.equal(bumpOf(c('fix: lock', ['package-lock.json'])), 'patch');
});

test('T5.2.1: next version from the last tag (examples)', () => {
  const v = (lastTag, commits) => nextVersion({ lastTag, base: '1.0.0', commits }).version;
  assert.equal(v(null, [c('feat: a')]), '1.0.0');   // primeira release: a do package.json
  assert.equal(v('v1.0.0', [c('fix: a'), c('feat: b')]), '1.1.0');
  assert.equal(v('v1.2.3', [c('fix: a')]), '1.2.4');
  assert.equal(v('v1.2.3', [c('fix: a'), c('feat!: b')]), '2.0.0');
  assert.equal(v('v1.2.3', [c('feat: tooling', ['team/bin/x'])]), null);
});

const CL = `# Changelog\n\nIntro.\n\n## [Unreleased]\n\n### Added\n\n- New thing. ([#9](x))\n\n## [1.0.0] - 2026-11-22\n\n### Added\n\n- First.\n\n[Unreleased]: https://github.com/o/r/compare/v1.0.0...HEAD\n[1.0.0]: https://github.com/o/r/releases/tag/v1.0.0\n`;
test('T5.2.2: Unreleased becomes the version section; the links move; the package version is set', () => {
  const { text, notes } = promoteUnreleased(CL, '1.1.0', '2026-12-01', 'o/r');
  assert.equal(notes, '### Added\n\n- New thing. ([#9](x))');
  assert.match(text, /## \[Unreleased\]\n\n## \[1\.1\.0\] - 2026-12-01\n\n### Added\n\n- New thing\. \(\[#9\]\(x\)\)\n\n## \[1\.0\.0\] - 2026-11-22/);
  assert.match(text, /\[Unreleased\]: https:\/\/github\.com\/o\/r\/compare\/v1\.1\.0\.\.\.HEAD\n\[1\.1\.0\]: https:\/\/github\.com\/o\/r\/compare\/v1\.0\.0\.\.\.v1\.1\.0\n\[1\.0\.0\]/);
  assert.throws(() => promoteUnreleased(text, '1.2.0', 'd', 'o/r'), /vazio/);
  const first = promoteUnreleased('# C\n\n## [Unreleased]\n\n- A.\n\n[Unreleased]: https://github.com/o/r/commits/develop\n', '1.0.0', '2026-11-22', 'o/r').text;
  assert.match(first, /\[1\.0\.0\]: https:\/\/github\.com\/o\/r\/releases\/tag\/v1\.0\.0/);
  assert.equal(JSON.parse(setPackageVersion('{\n  "name": "x",\n  "version": "1.0.0"\n}\n', '1.1.0')).version, '1.1.0');
});

test('T5.2.3: the release PR body has the notes, the version, every checklist item and the author as the only approver', () => {
  const b = releaseBody({ version: '1.1.0', notes: '### Added\n\n- X.', author: 'someone' });
  assert.match(b, /^Release v1\.1\.0: `develop` → `main`\. .*@someone is the only approver/); assert.match(b, /## Notes\n\n### Added\n\n- X\./);
  for (const item of CHECKLIST) assert.ok(b.includes(`- [ ] ${item}`), item);
});

const sh = (cwd, ...a) => { const r = spawnSync('git', ['-C', cwd, ...a], { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
test('fsd-release plan / prepare --dry on a real repository with a tag', () => {
  const d = mkdtempSync(join(tmpdir(), 'rel-'));
  sh(d, 'init', '-q', '-b', 'develop'); writeFileSync(join(d, 'package.json'), '{\n  "name": "x",\n  "version": "1.0.0"\n}\n'); writeFileSync(join(d, 'CHANGELOG.md'), CL.replace('## [Unreleased]\n\n### Added\n\n- New thing. ([#9](x))\n\n', '## [Unreleased]\n\n'));
  mkdirSync(join(d, 'src')); writeFileSync(join(d, 'src', 'a.ts'), '1'); sh(d, 'add', '-A'); sh(d, 'commit', '-qm', 'feat: one'); sh(d, 'tag', 'v1.0.0');
  const run = (...a) => spawnSync(join(BIN, 'fsd-release'), a, { encoding: 'utf8', env: { ...process.env, FSD_REPO: d, FSD_RELEASE_REF: 'HEAD', FSD_NOW: String(Date.parse('2026-12-01')) } });
  assert.match(run('plan').stdout, /nada a lançar desde v1\.0\.0/);
  mkdirSync(join(d, 'team')); writeFileSync(join(d, 'team', 't'), '1'); sh(d, 'add', '-A'); sh(d, 'commit', '-qm', 'feat: tooling only');
  assert.match(run('plan').stdout, /nada a lançar/);
  writeFileSync(join(d, 'src', 'a.ts'), '2'); sh(d, 'add', '-A'); sh(d, 'commit', '-qm', 'fix: a bug');
  writeFileSync(join(d, 'CHANGELOG.md'), CL.replace('## [1.0.0]', '## [1.0.0]')); sh(d, 'add', '-A'); sh(d, 'commit', '-qm', 'docs: changelog');
  assert.deepEqual(JSON.parse(run('plan', '--json').stdout).version, '1.0.1');
  const p = run('prepare', '--dry'); assert.equal(p.status, 0, p.stderr);
  assert.match(p.stdout, /\[dry\] branch release\/v1\.0\.1 .*CHANGELOG \[1\.0\.1\] - 2026-12-01; package\.json 1\.0\.1/);
  assert.match(p.stdout, /gh pr create --base main --head release\/v1\.0\.1 --title "release: v1\.0\.1" --reviewer /);
  assert.equal(run('nada').status, 2);
});
