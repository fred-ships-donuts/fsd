// F4.5–F4.8: ciclos dry de cada papel na sessão nova (FSD_RUNNER=session), com os comandos de verdade contra um GitHub falso
// (setup/fake-gh pelo FSD_GH) e o quadro num JSON (FSD_BOARD_FAKE). 0 token, sem rede. Cada teste confere o estado final: o que ficou
// no issue/PR, a coluna do card, a caixa de quem foi avisado e a entrega gravada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = dirname(fileURLToPath(import.meta.url)), TEAM = join(BIN, '..');
const HEAD = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const ISSUE = { number: 12, title: 'fsd-merge checks the CI', body: '## What\nGate the merge on CI.\n\n## Acceptance\n1. Green CI merges\n2. Red CI refuses\n', state: 'OPEN', labels: [{ name: 'size:M' }], comments: [] };
const PR = { number: 220, title: 'feat: fsd-merge checks the CI', body: 'Closes #12', state: 'OPEN', isDraft: false, baseRefName: 'develop', headRefName: 'feature/12-ci', headRefOid: HEAD,
  author: { login: 'fsd-stuart' }, files: [{ path: 'team/bin/fsd-merge', additions: 10, deletions: 2 }], diff: 'diff --git a/team/bin/fsd-merge b/team/bin/fsd-merge\n+gate\n',
  reviews: [], comments: [], reviewRequests: [], mergeable: 'MERGEABLE', mergeCommit: null, statusCheckRollup: [], url: 'https://github.com/fake/fsd/pull/220' };

function world({ issues = { 12: ISSUE }, prs = {} } = {}) {
  const d = mkdtempSync(join(tmpdir(), 'dry-'));
  writeFileSync(join(d, 'gh.json'), JSON.stringify({ issues: structuredClone(issues), prs: structuredClone(prs) }));
  return { d, env: { FSD_RUNNER: 'session', FSD_GH: join(TEAM, 'setup', 'fake-gh'), FAKE_GH_STATE: join(d, 'gh.json'), FSD_BOARD_FAKE: join(d, 'board.json'), FSD_STATE: join(d, 'st'), FSD_TEAM: TEAM, FSD_DRY: '' } };
}
const as = (w, role, cmd, args, input) => spawnSync(join(BIN, cmd), args, { input, encoding: 'utf8', cwd: w.d, env: { ...process.env, ...w.env, FSD_AGENT: role } });
const gh = (w) => JSON.parse(readFileSync(w.env.FAKE_GH_STATE, 'utf8'));
const board = (w) => { try { return JSON.parse(readFileSync(w.env.FSD_BOARD_FAKE, 'utf8')); } catch { return {}; } };
// A caixa de um papel: o que o supervisor já entregou (inbox/<papel>) mais o que ele entregaria agora (o outbox de quem falou, F3.3).
const deliver = (w) => spawnSync(process.execPath, ['-e', `const M=await import(${JSON.stringify(join(BIN, 'fsd-messenger.mjs'))}); for (const m of M.collect({uidToRole:null}).messages) M.deliver(m);`], { env: { ...process.env, ...w.env }, encoding: 'utf8' });
const readAll = (p) => { if (!existsSync(p)) return ''; try { return readdirSync(p).map((f) => readAll(join(p, f))).join('\n'); } catch { return readFileSync(p, 'utf8'); } };
const inbox = (w, role) => { deliver(w); return readAll(join(w.env.FSD_STATE, 'inbox', role)); };
const entregas = (w, kind) => { try { return readdirSync(join(w.env.FSD_STATE, 'entregas', kind)); } catch { return []; } };
const file = (w, name, data) => { const f = join(w.d, name); writeFileSync(f, typeof data === 'string' ? data : JSON.stringify(data)); return f; };
const example = (kind) => JSON.parse(readFileSync(join(TEAM, 'contracts', 'examples', kind, 'valid.json'), 'utf8'));

test('F4.5 Mel: card to Ready for Development, with the plan on the card first', () => {
  const w = world();
  const s = as(w, 'mel', 'fsd-arq', ['start', '12']); assert.equal(s.status, 0, s.stdout + s.stderr);
  assert.equal(board(w)['12'], 'Architecting (Mel)');
  const h = file(w, 'h.md', '**What to do:** gate the merge\n**Files:** team/bin/fsd-merge\n**Verification:** fsd-merge.test.mjs\n');
  const no = as(w, 'mel', 'fsd-arq', ['publish', '12', h]);
  assert.equal(no.status, 1); assert.match(no.stdout + no.stderr, /falta --entrega/); assert.equal(gh(w).issues['12'].comments.length, 0); assert.equal(board(w)['12'], 'Architecting (Mel)');
  const e = file(w, 'arq.json', example('arquitetura'));
  const ok = as(w, 'mel', 'fsd-arq', ['publish', '12', h, '--entrega', e]); assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  const [c] = gh(w).issues['12'].comments;
  assert.equal(c.author.login, 'fsd-mel'); assert.match(c.body, /^\*\*Architect handoff\*\*\n\n\*\*Plan:\*\* mergeGate puro/);
  assert.equal(board(w)['12'], 'Ready for Development (Stuart)'); assert.match(inbox(w, 'stuart'), /#12/); assert.equal(entregas(w, 'arquitetura').length, 1);
});

for (const [kind, state, verdict] of [['approve', 'APPROVED', 'approve'], ['changes', 'CHANGES_REQUESTED', 'changes']]) {
  test(`F4.5 Mel: review that ${kind === 'approve' ? 'approves' : 'asks for changes'}, pinned to the commit read`, () => {
    const w = world({ prs: { 220: PR } });
    const s = as(w, 'mel', 'fsd-review', ['start', '220']); assert.equal(s.status, 0, s.stdout + s.stderr); assert.match(s.stdout, /team\/bin\/fsd-merge \+10 -2/);
    assert.match(as(w, 'mel', 'fsd-review', ['diff', '220']).stdout, /\+gate/);
    const body = file(w, 'r.md', kind === 'approve' ? 'Looks right.' : 'Add the red-CI test.');
    const e = file(w, 'rev.json', { ...example('revisao'), pr: 220, head: HEAD.slice(0, 7), verdict, acceptance: [{ item: 1, status: 'ok' }, { item: 2, status: kind === 'approve' ? 'ok' : 'falha' }] });
    const p = as(w, 'mel', 'fsd-review', ['post', '220', kind, body, '--entrega', e]); assert.equal(p.status, 0, p.stdout + p.stderr);
    const [r] = gh(w).prs['220'].reviews;
    assert.equal(r.state, state); assert.equal(r.author.login, 'fsd-mel'); assert.equal(r.commit.oid, HEAD); assert.equal(entregas(w, 'revisao').length, 1);
  });
}

test('F4.5 Mel: a review is refused when the PR moved after start', () => {
  const w = world({ prs: { 220: PR } }); as(w, 'mel', 'fsd-review', ['start', '220']);
  const g = gh(w); g.prs['220'].headRefOid = 'f'.repeat(40); writeFileSync(w.env.FAKE_GH_STATE, JSON.stringify(g));
  const e = file(w, 'rev.json', { ...example('revisao'), pr: 220, head: HEAD.slice(0, 7), acceptance: [{ item: 1, status: 'ok' }, { item: 2, status: 'ok' }] });
  const p = as(w, 'mel', 'fsd-review', ['post', '220', 'approve', file(w, 'r.md', 'ok'), '--entrega', e]);
  assert.equal(p.status, 1); assert.match(p.stdout + p.stderr, /commit novo/); assert.equal(gh(w).prs['220'].reviews.length, 0);
});

test('F4.5 Mel: a technical doubt from Stuart reaches Mel, and her answer reaches Stuart', () => {
  const w = world();
  const q = as(w, 'stuart', 'fsd-duvida', ['tecnica', 'o mergeGate fica no fsd-lib?']); assert.equal(q.status, 0, q.stdout + q.stderr);
  assert.match(inbox(w, 'mel'), /mergeGate fica no fsd-lib/);
  const a = as(w, 'mel', 'fsd-diga', ['stuart', 'sim, puro, no fsd-lib']); assert.equal(a.status, 0, a.stdout + a.stderr);
  assert.match(inbox(w, 'stuart'), /sim, puro, no fsd-lib/);
});
