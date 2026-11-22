// fsd-release.mjs — a release no padrão do RELEASE.md (E5, D7). Puro: sem git, rede nem relógio (o CLI fsd-release junta os dados).
//   PRODUCT(path)                         o que entra no produto publicado (o mesmo escopo do job changelog): src/ e package.json
//   bumpOf(commit) · nextVersion({ lastTag, base, commits })   SemVer pelos Conventional Commits que tocam o produto
//   promoteUnreleased(changelog, version, date, repo)          Keep a Changelog: [Unreleased] → [x.y.z] - data, links no fim
//   setPackageVersion(pkgText, version) · releaseBody({ version, notes, checklist, author })
export const PRODUCT = (p) => /^src\//.test(p) || /^package(-lock)?\.json$/.test(p);
const RANK = { none: 0, patch: 1, minor: 2, major: 3 };
export function bumpOf({ subject = '', body = '', files = [] }) {
  if (!files.some(PRODUCT)) return 'none';
  const m = /^([a-z]+)(\([^)]*\))?(!)?:/.exec(subject); if (!m) return 'none';
  if (m[3] || /^BREAKING[ -]CHANGE:/m.test(body)) return 'major';
  if (m[1] === 'feat') return 'minor';
  if (m[1] === 'fix' || m[1] === 'perf') return 'patch';
  return 'none';
}
const parse = (v) => { const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(v || '')); if (!m) throw new Error(`versão inválida: ${v}`); return m.slice(1).map(Number); };
// Sem tag ainda: a primeira release é a versão do package.json (base). Com tag: o maior bump dos commits do produto desde ela.
export function nextVersion({ lastTag, base, commits = [] }) {
  if (!lastTag) return { version: String(base).replace(/^v/, ''), bump: 'first', counted: commits.filter((c) => bumpOf(c) !== 'none').length };
  const bump = commits.map(bumpOf).reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'none');
  const [M, m, p] = parse(lastTag);
  const version = bump === 'major' ? `${M + 1}.0.0` : bump === 'minor' ? `${M}.${m + 1}.0` : bump === 'patch' ? `${M}.${m}.${p + 1}` : null;
  return { version, bump, counted: commits.filter((c) => bumpOf(c) !== 'none').length };
}
export function promoteUnreleased(changelog, version, date, repo) {
  const t = String(changelog);
  const i = t.indexOf('## [Unreleased]'); if (i < 0) throw new Error('CHANGELOG sem "## [Unreleased]"');
  const after = t.indexOf('\n## [', i + 1); const linksAt = t.search(/\n\[Unreleased\]: /);
  const end = after > 0 ? after : linksAt > 0 ? linksAt : t.length;
  const body = t.slice(i + '## [Unreleased]'.length, end).trim();
  if (!body) throw new Error('[Unreleased] vazio: nada para lançar');
  const prev = /\n## \[(\d+\.\d+\.\d+)\]/.exec(t.slice(end))?.[1];
  let out = `${t.slice(0, i)}## [Unreleased]\n\n## [${version}] - ${date}\n\n${body}\n${t.slice(end)}`;
  const link = `[${version}]: https://github.com/${repo}/${prev ? `compare/v${prev}...v${version}` : `releases/tag/v${version}`}`;
  out = out.replace(/\[Unreleased\]: \S+/, `[Unreleased]: https://github.com/${repo}/compare/v${version}...HEAD\n${link}`);
  return { text: out.replace(/\n{3,}/g, '\n\n'), notes: body };
}
export function setPackageVersion(pkgText, version) {
  const j = JSON.parse(pkgText); if (j.version === version) return pkgText;
  return pkgText.replace(/("version"\s*:\s*")[^"]+(")/, `$1${version}$2`);
}
export const CHECKLIST = [
  'CI green on the release branch (build, test, paths, shellcheck)',
  'CHANGELOG section matches what ships (Keep a Changelog)',
  'package.json version = the tag',
  'Release notes reviewed',
  'After merge: signed tag, GitHub Release with SBOM and SHA-256 checksums (no npm publish)',
  'Audit entry recorded; rollback plan in RELEASE.md',
];
export function releaseBody({ version, notes, author, base = 'develop' }) {
  return [`Release v${version}: \`${base}\` → \`main\`. Prepared by the team supervisor; @${author} is the only approver (RELEASE.md).`, '',
    '## Notes', '', notes.trim(), '', '## Checklist', '', ...CHECKLIST.map((c) => `- [ ] ${c}`), ''].join('\n');
}
