// fsd-merge por inteiro: o portão sobre o produto das condições contra um oráculo, e o comando de verdade com um gh falso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, cpSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const BIN = dirname(fileURLToPath(import.meta.url)); process.env.FSD_STATE = mkdtempSync(join(tmpdir(), 'mg-'));
const { mergeGate, ready, readyIdle, ciState, REQUIRED_CI } = await import('./fsd-lib.mjs');
const ck = (name, conclusion = 'SUCCESS', status = 'COMPLETED', workflowName = 'regression') => ({ name, conclusion, status, workflowName }), green = REQUIRED_CI.map((n) => ck(n));
const rv = (who, state = 'APPROVED', oid = 'h', bot = true, o = {}) => ({ id: who + state + oid, state, author: { login: `fsd-${who}`, bot }, commit: oid === null ? null : { oid }, submittedAt: '2026-01-01T00:00:00Z', ...o });
const pr = (o = {}) => ({ number: 7, state: 'OPEN', isDraft: false, baseRefName: 'develop', headRefName: 'b', headRefOid: 'h', mergeable: 'MERGEABLE', body: 'Closes #1', author: { login: 'app/fsd-stuart' }, reviews: [rv('mel'), rv('bob')], reviewRequests: [], statusCheckRollup: green, ...o });
const product = function* (o) { const ks = Object.keys(o); const go = function* (i, a) { if (i === ks.length) { yield a; return; } for (const v of o[ks[i]]) yield* go(i + 1, { ...a, [ks[i]]: v }); }; yield* go(0, {}); };
test('gate: the whole product of state, draft, base, conflict, author, each review of Mel, Bob and Kevin, and CI — against an oracle', () => {
  const R = { none: [], ok: [['APPROVED', 'h']], old: [['APPROVED', 'velho']], ch: [['CHANGES_REQUESTED', 'h']], dis: [['APPROVED', 'h'], ['DISMISSED', 'h']], back: [['CHANGES_REQUESTED', 'h'], ['APPROVED', 'h']], com: [['APPROVED', 'h'], ['COMMENTED', 'h']], turn: [['APPROVED', 'h'], ['CHANGES_REQUESTED', 'h']], human: [['APPROVED', 'h', false]], nocommit: [['APPROVED', null]] };
  const good = (k) => ['ok', 'back', 'com'].includes(k), asks = (k) => ['ch', 'turn'].includes(k); let n = 0, pass = 0;
  for (const c of product({ state: ['OPEN', 'MERGED', 'CLOSED'], draft: [false, true], base: ['develop', 'main'], merge: ['MERGEABLE', 'CONFLICTING', 'UNKNOWN'], author: ['stuart', 'mel', 'humano'], mel: Object.keys(R), bob: Object.keys(R), kevin: ['none', 'ok', 'ch'], ci: ['green', 'red', 'pending'] })) {
    const reviews = ['mel', 'bob', 'kevin'].flatMap((w) => R[c[w]].map(([s, o, b]) => rv(w, s, o, b ?? true))); const p = pr({ state: c.state, isDraft: c.draft, baseRefName: c.base, mergeable: c.merge, author: { login: c.author === 'humano' ? 'humano' : `app/fsd-${c.author}` }, reviews, statusCheckRollup: c.ci === 'green' ? green : c.ci === 'red' ? [ck('build', 'FAILURE'), ...green.slice(1)] : green.slice(1) });
    const by = ['mel', 'bob', 'kevin'].filter((w) => w !== c.author && good(c[w])), must = c.author === 'stuart' ? ['mel', 'bob'] : [], others = ['mel', 'bob', 'kevin'].filter((w) => w !== c.author);
    const may = c.state === 'OPEN' && !c.draft && c.base === 'develop' && c.merge !== 'CONFLICTING' && by.length >= 2 && must.every((m) => by.includes(m)) && !others.some((w) => asks(c[w])) && c.ci === 'green';
    const g = mergeGate(p); n++; pass += may; if ((g.fail.length === 0) !== may || ready(p) !== may || g.calculating !== (c.merge === 'UNKNOWN')) assert.fail(`${JSON.stringify(c)} → ${JSON.stringify(g)} ready ${ready(p)}, esperado ${may}`);
  }
  assert.equal(n, 3 * 2 * 2 * 3 * 3 * 10 * 10 * 3 * 3); assert.ok(pass > 50);
});
test('CI: every conclusion and status of each required job, missing, of another workflow, and none', () => {
  for (const k of REQUIRED_CI) { const o = green.filter((c) => c.name !== k);
    for (const x of ['FAILURE', 'CANCELLED', 'TIMED_OUT', 'ACTION_REQUIRED', 'STARTUP_FAILURE', 'ERROR']) for (const s of ['COMPLETED', 'IN_PROGRESS']) assert.equal(ciState({ statusCheckRollup: [...o, ck(k, x, s)] }), 'red');
    for (const [x, s] of [['SUCCESS', 'IN_PROGRESS'], ['', 'QUEUED'], ['NEUTRAL', 'COMPLETED'], ['SKIPPED', 'COMPLETED'], [null, 'COMPLETED']]) assert.equal(ciState({ statusCheckRollup: [...o, ck(k, x, s)] }), 'pending');
    assert.equal(ciState({ statusCheckRollup: o }), 'pending'); assert.equal(ciState({ statusCheckRollup: [...o, ck(k, 'SUCCESS', 'COMPLETED', 'outro')] }), 'pending'); }
  assert.equal(ciState({ statusCheckRollup: green }), 'green'); for (const v of [undefined, null, []]) assert.equal(ciState({ statusCheckRollup: v }), 'pending');
});
test('gate: the text of every refusal', () => {
  const t = (o) => mergeGate(pr(o)).fail.join(' | '); assert.match(t({ state: 'CLOSED' }), /^estado CLOSED$/); assert.match(t({ isDraft: true }), /^draft$/); assert.match(t({ baseRefName: 'main' }), /^base main/); assert.match(t({ mergeable: 'CONFLICTING' }), /^conflito/);
  assert.match(t({ reviews: [rv('mel'), rv('bob', 'APPROVED', 'x')] }), /1\/2 aprovações atuais \(antigas: fsd-bob\) \| falta a aprovação de bob/); assert.match(t({ reviews: [] }), /0\/2 aprovações atuais \| falta a aprovação de mel, bob/); assert.match(t({ reviews: [rv('mel'), rv('bob'), rv('kevin', 'CHANGES_REQUESTED')] }), /^mudanças pedidas por fsd-kevin$/);
  assert.match(t({ statusCheckRollup: [] }), /CI da regressão pendente/); assert.match(t({ statusCheckRollup: [ck('build', 'ERROR')] }), /vermelho/); for (const reviews of [undefined, null]) assert.match(t({ reviews, author: null }), /0\/2/);
});
test('readyIdle: only of agents, only after the grace of the second approval, or now', () => {
  const at = (m) => new Date(Date.now() - m * 60000).toISOString(), two = (a, b) => ({ reviews: [rv('mel', 'APPROVED', 'h', true, { submittedAt: at(a) }), rv('bob', 'APPROVED', 'h', true, { submittedAt: at(b) })] });
  assert.equal(readyIdle(pr(two(60, 11)), false), true); assert.equal(readyIdle(pr(two(60, 9)), false), false); assert.equal(readyIdle(pr(two(9, 60)), false), false); assert.equal(readyIdle(pr(two(1, 1)), true), true); assert.equal(readyIdle(pr({ ...two(60, 60), isDraft: true }), true), false);
  assert.equal(readyIdle(pr({ author: { login: 'humano' } }), true), false); assert.equal(readyIdle(pr({ reviews: [rv('mel', 'APPROVED', 'h', true, { submittedAt: undefined }), rv('bob', 'APPROVED', 'h', true, { submittedAt: undefined })] }), false), true); assert.equal(readyIdle(pr(two(60, 60))), true);
});
// O comando: gh falso (os PRs, um por chamada, e o merge), numa cópia do team/.
function cmd({ prs, merge = 'exit 0', moved = false, list, notify = 'echo ok', move = 'echo movido' } = {}) {
  const w = mkdtempSync(join(tmpdir(), 'mc-')), bin = join(w, 'team', 'bin'), repo = join(w, 'repo'); mkdirSync(join(w, 'st'));
  cpSync(BIN, bin, { recursive: true, filter: (s) => !s.endsWith('.test.mjs') }); cpSync(join(BIN, '..', 'agents.json'), join(w, 'team', 'agents.json'));
  const exe = (f, b) => writeFileSync(f, `#!/bin/sh\n${b}\n`, { mode: 0o755 }); prs.forEach((p, i) => writeFileSync(join(w, `pr${i}`), JSON.stringify(p))); if (list) writeFileSync(join(w, 'list'), JSON.stringify(list));
  const gh = `echo "$*" >> ${w}/calls\ncase "$1 $2" in "pr view") n=$(cat ${w}/n 2>/dev/null || echo 0); f=${w}/pr$n; [ -f $f ] || f=${w}/pr$((n-1)); [ -f ${w}/pr$((n+1)) ] && echo $((n+1)) > ${w}/n; cat $f;; "pr list") cat ${w}/list;; "pr merge") ${merge};; "api graphql") echo '{"data":{"repository":{}}}';; esac`;
  exe(join(bin, 'gh'), gh); exe(join(bin, 'fsd-notify'), `echo "notify $*" >> ${w}/calls; ${notify}`); exe(join(bin, 'fsd-board'), `echo "board $*" >> ${w}/calls; ${move}`); exe(join(w, 'sleep'), `echo "sleep $*" >> ${w}/calls`);
  const g = (...a) => spawnSync('git', ['-c', 'user.name=s', '-c', 'user.email=s@s', ...a], { encoding: 'utf8' }); g('init', '-q', '-b', 'develop', join(w, 'up')); g('-C', join(w, 'up'), 'commit', '-q', '--allow-empty', '-m', 'a'); g('clone', '-q', join(w, 'up'), repo); if (moved) g('-C', join(w, 'up'), 'commit', '-q', '--allow-empty', '-m', 'b');
  const run = (a, env = {}) => spawnSync(join(bin, 'fsd-merge'), a, { encoding: 'utf8', env: { ...process.env, FSD_GH: '', FSD_DRY: '', FSD_MERGE_FIXTURE: '', FSD_AGENT: 'kevin', FSD_RUNNER: '', FSD_STATE: join(w, 'st'), FSD_STATE_ROOT: '', FSD_REPO: repo, HOME: w, PATH: `${w}:${process.env.PATH}`, ...env } });
  return { w, run, calls: () => { try { return readFileSync(join(w, 'calls'), 'utf8').trim().split('\n'); } catch { return []; } }, log: () => { try { return readFileSync(join(w, 'st', 'merges.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)); } catch { return []; } } };
}
const bots = [rv('mel', 'APPROVED', 'h', undefined, { author: { login: 'fsd-mel[bot]' } }), rv('bob', 'APPROVED', 'h', undefined, { author: { login: 'app/fsd-bob' } })], P = (o) => pr({ reviews: bots, ...o });
const out = (r, code, re) => { assert.equal(r.status, code, r.stdout + r.stderr); assert.match(r.stdout, re); return r.stdout; };
test('merge: locked on the checked commit, as a merge commit, card moved, author told, attempt recorded', () => {
  const x = cmd({ prs: [P()] }); out(x.run(['7']), 0, /^#7 mesclado na develop \| .*movido|#7 mesclado na develop/); assert.ok(x.calls().includes('pr merge 7 --merge --match-head-commit h')); assert.ok(x.calls().some((c) => /^board move Done 1/.test(c))); assert.ok(x.calls().some((c) => /^notify stuart PR #7 mesclado/.test(c)));
  assert.deepEqual([x.log()[0].n, x.log()[0].code, x.log()[0].by], [7, 0, 'kevin']); const y = cmd({ prs: [P()], moved: true }); out(y.run(['7'], { FSD_AGENT: '' }), 0, /mesclado na develop/); assert.equal(y.log()[0].by, null);
});
test('merge: refused by the rule, by GitHub, already merged by someone, calculating to the end; --check never merges nor records', () => {
  const r = cmd({ prs: [P({ isDraft: true })] }); out(r.run(['7']), 1, /^#7 não pode entrar: draft/); assert.equal(r.log()[0].code, 1); assert.ok(!r.calls().some((c) => /^pr merge/.test(c)));
  const g = cmd({ prs: [P()], merge: 'echo "recusado pelo ruleset" >&2; exit 1' }); out(g.run(['7']), 4, /#7 merge recusado: .*recusado pelo ruleset/); assert.equal(g.log()[0].code, 4);
  const m = cmd({ prs: [P(), P({ state: 'MERGED' })], merge: 'exit 1' }); out(m.run(['7']), 0, /#7 já mesclado/);
  const u = cmd({ prs: [P({ mergeable: 'UNKNOWN' })] }); out(u.run(['7']), 3, /ainda calculando/); assert.equal(u.calls().filter((c) => c === 'sleep 2').length, 6); const u2 = cmd({ prs: [P({ mergeable: 'UNKNOWN' }), P()] }); out(u2.run(['7']), 0, /mesclado/); assert.equal(u2.calls().filter((c) => c === 'sleep 2').length, 1);
  const uc = cmd({ prs: [P({ mergeable: 'UNKNOWN', state: 'CLOSED' })] }); out(uc.run(['7']), 1, /estado CLOSED/);
  const c = cmd({ prs: [P()] }); out(c.run(['7', '--check']), 0, /pronto para merge \(fsd-mel,fsd-bob\)/); assert.deepEqual(c.log(), []); out(cmd({ prs: [P()] }).run(['7', '--now']), 0, /mesclado/);
});
test('merge: the record that cannot be written does not stop the merge; dry goes nowhere; usage', () => {
  const x = cmd({ prs: [P()] }); mkdirSync(join(x.w, 'st', 'merges.jsonl')); out(x.run(['7']), 0, /mesclado/); const d = cmd({ prs: [P()] }); out(d.run(['7'], { FSD_DRY: '1' }), 0, /\[dry\] gh pr merge 7 --merge/); assert.ok(!d.calls().some((c) => /^pr merge/.test(c)));
  for (const a of [[], ['x'], ['7x'], ['7', '--nada'], ['7', '--ready']]) out(cmd({ prs: [P()] }).run(a), 2, /uso: fsd-merge/); out(cmd({ prs: [P()] }).run(['7'], { FSD_MERGE_FIXTURE: '/x' }), 2, /só vale com FSD_DRY=1/);
});
test('--ready: the idle ones of agents, stops at a GitHub refusal, keeps the worst code, counts the ones of the author', () => {
  const two = [P({ number: 7 }), P({ number: 8 })], human = P({ number: 9, author: { login: 'humano' } });
  const none = cmd({ prs: [P()], list: [] }); out(none.run(['--ready']), 0, /^nada pronto parado\n$/); out(cmd({ prs: [P()], list: [human] }).run(['--ready']), 0, /nada pronto parado \(\+1 do autor: fsd-merge <n>\)/);
  const a = cmd({ prs: [P()], list: [...two, human] }); const o = out(a.run(['--ready']), 0, /#7 mesclado/); assert.match(o, /#8 mesclado/); assert.match(o, /\(\+1 do autor: só por número\)/); assert.equal(a.calls().filter((c) => /^pr merge/.test(c)).length, 2);
  const s = cmd({ prs: [P()], list: two, merge: 'exit 1' }); out(s.run(['--ready']), 4, /parei: merge recusado/); assert.equal(s.calls().filter((c) => /^pr merge/.test(c)).length, 1);
  const c = cmd({ prs: [P()], list: two }); out(c.run(['--ready', '--check']), 0, /#8 pronto/); assert.ok(!c.calls().some((k) => /^pr merge/.test(k))); out(cmd({ prs: [P({ isDraft: true })], list: two }).run(['--ready', '--now']), 1, /não pode entrar/);
});
