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
// A seção [x.y.z] de um CHANGELOG (para as notas da GitHub Release).
export function sectionOf(changelog, version) {
  const t = String(changelog); const i = t.indexOf(`## [${version}]`); if (i < 0) throw new Error(`CHANGELOG sem [${version}]`);
  const body = t.slice(t.indexOf('\n', i) + 1); const j = body.search(/\n## \[|\n\[Unreleased\]: /);
  return (j >= 0 ? body.slice(0, j) : body).trim();
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

// ── F5.3: merge e tag assinada, assets da GitHub Release, auditoria. Estas funções fazem E/S (git, npm, arquivos).
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, basename } from 'node:path';
// O PR de release só entra com: base main, head release/v*, aprovação do autor no head (a última revisão dele) e o CI verde.
export function releaseGate(pr, { author, ciState }) {
  const fail = [];
  if (pr.state !== 'OPEN') fail.push(`PR ${pr.state}`);
  if (pr.baseRefName !== 'main') fail.push(`base ${pr.baseRefName} (tem de ser main)`);
  if (!/^release\/v\d+\.\d+\.\d+$/.test(pr.headRefName || '')) fail.push(`head ${pr.headRefName} (tem de ser release/vX.Y.Z)`);
  const mine = (pr.reviews || []).filter((r) => String(r.author?.login || '').toLowerCase() === String(author).toLowerCase() && r.state !== 'COMMENTED');
  const last = mine.at(-1);
  if (!last || last.state !== 'APPROVED' || (last.commit?.oid && last.commit.oid !== pr.headRefOid)) fail.push(`sem a aprovação do autor (${author}) no head`);
  const ci = ciState(pr); if (ci !== 'green') fail.push(`CI ${ci}`);
  if (pr.mergeable === 'CONFLICTING') fail.push('conflito com a main');
  return fail;
}
const git = (repo, args, env = {}) => spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
// Tag assinada por chave SSH (D7, T5.3.1). key = a chave privada (no container, a do broker); allowedSigners verifica.
export function signTag({ repo, tag, sha, key, message }) {
  const r = git(repo, ['-c', 'gpg.format=ssh', '-c', `user.signingkey=${key}`, 'tag', '-s', tag, '-m', message, sha]);
  if (r.status !== 0) throw new Error(`git tag -s: ${(r.stderr || '').trim().split('\n')[0]}`);
}
export function verifyTag({ repo, tag, allowedSigners }) {
  const r = git(repo, ['-c', 'gpg.format=ssh', '-c', `gpg.ssh.allowedSignersFile=${allowedSigners}`, 'tag', '-v', tag]);
  return { ok: r.status === 0, out: `${r.stdout}${r.stderr}`.trim() };
}
export const sha256File = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
export const checksums = (files) => files.map((f) => `${sha256File(f)}  ${basename(f)}`).join('\n') + '\n';
export function validSbom(sbom, { name, version }) {
  const why = [];
  if (sbom?.bomFormat !== 'CycloneDX') why.push('bomFormat não é CycloneDX');
  if (!/^1\.\d+$/.test(String(sbom?.specVersion || ''))) why.push('specVersion inválida');
  // O npm sbom põe em component.name o nome da pasta; o pacote está no bom-ref e no purl (pkg:npm/<nome>@<versão>).
  const c = sbom?.metadata?.component; const purl = `pkg:npm/${String(name).replace(/^@/, '%40')}@${version}`;
  if (c?.version !== version || (c?.['bom-ref'] !== `${name}@${version}` && c?.purl !== purl)) why.push(`metadata.component ≠ ${name}@${version}`);
  return why;
}
// Assets: o tarball do npm pack (sem publish), o SBOM CycloneDX e o SHA256SUMS dos dois.
export function buildAssets({ repo, out }) {
  mkdirSync(out, { recursive: true });
  const pkg = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));
  const pack = spawnSync('npm', ['pack', '--silent', '--pack-destination', out], { cwd: repo, encoding: 'utf8' });
  if (pack.status !== 0) throw new Error(`npm pack: ${(pack.stderr || '').trim().split('\n')[0]}`);
  const tgz = join(out, pack.stdout.trim().split('\n').at(-1));
  const sb = spawnSync('npm', ['sbom', '--sbom-format', 'cyclonedx', '--sbom-type', 'application'], { cwd: repo, encoding: 'utf8', maxBuffer: 64 << 20 });
  if (sb.status !== 0) throw new Error(`npm sbom: ${(sb.stderr || '').trim().split('\n')[0]}`);
  const sbom = join(out, `${pkg.name}-${pkg.version}.cdx.json`); writeFileSync(sbom, sb.stdout);
  const why = validSbom(JSON.parse(sb.stdout), pkg); if (why.length) throw new Error(`SBOM: ${why.join('; ')}`);
  const sums = join(out, 'SHA256SUMS'); writeFileSync(sums, checksums([tgz, sbom]));
  return { tgz, sbom, sums };
}
// Auditoria (T5.3.3): uma linha por evento, cada uma com o hash da anterior; mexer numa linha quebra a cadeia.
const lineHash = (l) => createHash('sha256').update(l).digest('hex');
export function auditAppend(file, entry) {
  const lines = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean) : [];
  const prev = lines.length ? lineHash(lines.at(-1)) : 'genesis';
  const line = JSON.stringify({ ...entry, prev });
  appendFileSync(file, line + '\n', { mode: 0o600 }); return line;
}
export function auditVerify(file) {
  const lines = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean) : [];
  let prev = 'genesis';
  for (let i = 0; i < lines.length; i++) { let j; try { j = JSON.parse(lines[i]); } catch { return { ok: false, at: i }; } if (j.prev !== prev) return { ok: false, at: i }; prev = lineHash(lines[i]); }
  return { ok: true, entries: lines.length };
}
