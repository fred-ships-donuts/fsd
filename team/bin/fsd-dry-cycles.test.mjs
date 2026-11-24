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

// F4.6 Bob: QA na sessão nova. O fsd-run-exec é falso aqui (registra e roda o comando; a troca de usuário real é o K9); o tmux é real.
// No sandbox de um papel o tmux existe, mas o socket é bloqueado: só conta o tmux que abre um terminal. No CI, existir basta (não pula).
const tmuxUp = () => { const s = `probe-${process.pid}`, up = spawnSync('tmux', ['-L', s, 'new-session', '-d', 'sleep 5']).status === 0; if (up) spawnSync('tmux', ['-L', s, 'kill-server']); return up; };
const hasTmux = spawnSync('tmux', ['-V']).status === 0 && (!!process.env.CI || tmuxUp());
let bobN = 0;
function bobWorld() {
  const w = world({ prs: { 220: PR } }); const rx = join(w.d, 'rx');
  writeFileSync(rx, `#!/bin/bash\necho "$*" >> ${w.d}/rx.log\ncase "$1" in run) shift 3; exec bash -c "$*" ;; *) exit 0 ;; esac\n`); spawnSync('chmod', ['755', rx]);
  // Socket do tmux próprio (FSD_QA_TMUX): outros testes rodam o fsd-qa do Bob em paralelo e derrubariam o fsd-qa-bob no meio.
  w.env = { ...w.env, HOME: w.d, FSD_RUN_EXEC: rx, FSD_QA_TMUX: `fsd-qa-dry-${process.pid}-${++bobN}` }; return w;
}
const qa = (w, ...a) => as(w, 'bob', 'fsd-qa', a);
for (const [name, second, verdict, state] of [['PASS', 'true', 'pass', 'APPROVED'], ['FAIL', 'exit 1', 'fail', 'CHANGES_REQUESTED']]) {
  test(`F4.6 Bob: QA ${name} from the exit file, review pinned to the commit`, { skip: !hasTmux }, () => {
    const w = bobWorld();
    try {
      const p = qa(w, 'prep', '220'); assert.equal(p.status, 0, p.stdout + p.stderr); assert.match(p.stdout, /2 itens/);
      assert.match(readFileSync(join(w.d, 'rx.log'), 'utf8'), new RegExp(`^prep qa-bob-220 https://github.com/.*\\.git ${HEAD}$`, 'm'));
      assert.match(qa(w, 'run', '1', 'echo um').stdout, /EXIT=0/);
      assert.match(qa(w, 'run', '2', second).stdout, verdict === 'pass' ? /EXIT=0/ : /EXIT=1/);
      if (verdict === 'pass') assert.equal(qa(w, 'verdict', '--all-pass').status, 0);
      else {
        assert.equal(qa(w, 'verdict', '1', 'PASS').status, 0);
        assert.match(qa(w, 'verdict', '2', 'FAIL', 'refuses red CI').stdout, /1ª falha guardada/);
        qa(w, 'run', '2', second); assert.equal(qa(w, 'verdict', '2', 'FAIL', 'refuses red CI').status, 0);
      }
      const no = qa(w, 'finish'); assert.equal(no.status, 1); assert.match(no.stdout + no.stderr, /falta --entrega/); assert.equal(gh(w).prs['220'].reviews.length, 0);
      const e = file(w, 'qa.json', { ...example('qa'), pr: 220, head: HEAD.slice(0, 7), verdict, acceptance: [{ item: 1, command: 'echo um', exit: 0, result: 'pass' }, { item: 2, command: second, exit: verdict === 'pass' ? 0 : 1, result: verdict }] });
      const f = qa(w, 'finish', '--entrega', e); assert.equal(f.status, 0, f.stdout + f.stderr);
      const [r] = gh(w).prs['220'].reviews;
      assert.equal(r.state, state); assert.equal(r.author.login, 'fsd-bob'); assert.equal(r.commit.oid, HEAD);
      if (verdict === 'fail') assert.match(r.body, /## Steps to reproduce\n2\. `exit 1`/); else assert.doesNotMatch(r.body, /Steps to reproduce/);
      assert.equal(entregas(w, 'qa').length, 1);
    } finally { spawnSync('tmux', ['-L', w.env.FSD_QA_TMUX, 'kill-server']); }
  });
}

// F4.7 Stuart: o card na sessão nova (worktree na home, um card por vez), uma mensagem da Mel no meio do trabalho entregue no
// PostToolUse seguinte e o erro de tipo devolvido pelo fsd-verify-hook (o teste dele, em fsd-verify-hook.test.mjs, roda o tsc).
function gitWorld() {
  const w = world(); const g = (cwd, ...a) => spawnSync('git', a, { cwd, encoding: 'utf8' });
  const bare = join(w.d, 'origin.git'), repo = join(w.d, 'repo'); g(w.d, 'init', '-q', '--bare', bare); g(w.d, 'clone', '-q', bare, repo);
  writeFileSync(join(repo, 'a'), '1'); g(repo, 'add', 'a'); g(repo, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init'); g(repo, 'push', '-q', 'origin', 'HEAD:develop');
  w.env = { ...w.env, HOME: w.d, FSD_REPO: repo }; return w;
}
test('F4.7 Stuart: the card starts in a worktree in his home; a second card is refused while the first is open', () => {
  const w = gitWorld(); const g = gh(w); g.issues['13'] = { ...ISSUE, number: 13, title: 'other card' }; writeFileSync(w.env.FAKE_GH_STATE, JSON.stringify(g));
  writeFileSync(w.env.FSD_BOARD_FAKE, JSON.stringify({ 12: 'Ready for Development (Stuart)', 13: 'Ready for Development (Stuart)' }));
  const s = as(w, 'stuart', 'fsd-dev', ['start', '12']); assert.equal(s.status, 0, s.stdout + s.stderr);
  assert.ok(existsSync(join(w.d, 'wt', 'feature-12-fsd-merge-checks-the-ci', 'a'))); assert.equal(board(w)['12'], 'Developing (Stuart)');
  const two = as(w, 'stuart', 'fsd-dev', ['start', '13']); assert.equal(two.status, 1); assert.match(two.stdout + two.stderr, /already has #12/); assert.equal(board(w)['13'], 'Ready for Development (Stuart)');
});

test('F4.7 Stuart: a message from Mel during the work reaches him at the next tool call', () => {
  const w = world();
  assert.equal(as(w, 'mel', 'fsd-diga', ['stuart', 'use o mergeGate do fsd-lib']).status, 0); deliver(w);
  const h = spawnSync(join(BIN, 'fsd-session-hook'), { input: JSON.stringify({ hook_event_name: 'PostToolUse', session_id: 's', tool_name: 'Bash', tool_input: { command: 'npm test' } }), encoding: 'utf8', env: { ...process.env, ...w.env, FSD_AGENT: 'stuart' } });
  assert.equal(h.status, 0, h.stderr); assert.match(h.stdout, /mel: use o mergeGate do fsd-lib/);
  const again = spawnSync(join(BIN, 'fsd-session-hook'), { input: JSON.stringify({ hook_event_name: 'PostToolUse', session_id: 's', tool_name: 'Bash', tool_input: { command: 'ls' } }), encoding: 'utf8', env: { ...process.env, ...w.env, FSD_AGENT: 'stuart' } });
  assert.doesNotMatch(again.stdout, /mergeGate/);   // entregue uma vez só
});

// F4.8 Kevin: triagem pela entrega (tamanho, coluna, decisão registrada; recusa fecha; decisão do autor vira Deadlock), resposta a um
// "parado:" e nenhum merge na sessão nova (o deny e o guard: fsd-native-guard.test.mjs).
const triage = (over) => ({ ...example('triagem'), ...over });
test('F4.8 Kevin: triage accepts, sizes and moves the card; an invalid delivery changes nothing', () => {
  const w = world({ issues: { 12: { ...ISSUE, labels: [{ name: 'size:L' }] } } });
  const bad = as(w, 'kevin', 'fsd-issue', ['triage', '12', '--entrega', file(w, 't0.json', triage({ card: 13 }))]);
  assert.equal(bad.status, 1); assert.match(bad.stdout + bad.stderr, /\$\.card/); assert.equal(gh(w).issues['12'].comments.length, 0); assert.deepEqual(board(w), {});
  assert.equal(as(w, 'mel', 'fsd-issue', ['triage', '12', '--entrega', file(w, 't1.json', triage())]).status, 1);   // só o kevin
  const ok = as(w, 'kevin', 'fsd-issue', ['triage', '12', '--entrega', file(w, 't.json', triage())]); assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  const i = gh(w).issues['12'];
  assert.deepEqual(i.labels.map((l) => l.name), ['size:S']); assert.match(i.comments[0].body, /^Decision \(PM, \d{4}-\d\d-\d\d\): Bug com reprodução/);
  assert.equal(board(w)['12'], 'Ready for Development (Stuart)'); assert.match(inbox(w, 'stuart'), /#12/); assert.equal(entregas(w, 'triagem').length, 1);
});

test('F4.8 Kevin: declined and duplicate close the issue; an author decision becomes a deadlock with the decision label', () => {
  for (const [decision, re] of [['recusar', /declined/], ['duplicado', /duplicate/]]) {
    const w = world(); assert.equal(as(w, 'kevin', 'fsd-issue', ['triage', '12', '--entrega', file(w, 't.json', triage({ decision }))]).status, 0);
    const i = gh(w).issues['12']; assert.equal(i.state, 'CLOSED'); assert.match(i.comments[0].body, re); assert.deepEqual(board(w), {});
  }
  const w = world(); assert.equal(as(w, 'kevin', 'fsd-issue', ['triage', '12', '--entrega', file(w, 't.json', triage({ decision: 'decisao-do-autor' }))]).status, 0);
  const i = gh(w).issues['12']; assert.equal(i.state, 'OPEN'); assert.ok(i.labels.some((l) => l.name === 'decision')); assert.match(i.comments[0].body, /^Deadlock: author decision needed/);
});

test('F4.8 Kevin: a "parado:" from Stuart reaches Kevin, and the answer reaches Stuart', () => {
  const w = world();
  assert.equal(as(w, 'stuart', 'fsd-diga', ['kevin', 'parado: #220 entregue; fila: vazia']).status, 0);
  assert.match(inbox(w, 'kevin'), /"from":\s*"stuart"[\s\S]*parado: #220 entregue|parado: #220 entregue[\s\S]*"from":\s*"stuart"/);
  assert.equal(as(w, 'kevin', 'fsd-diga', ['stuart', 'pegue #13']).status, 0);
  assert.match(inbox(w, 'stuart'), /pegue #13/);
});
