// F1.7: o juiz não tem git no argv, nega segredos por --settings, responde por --json-schema e, no prazo, recebe SIGINT
// (depois SIGTERM). A sessão é um claude falso: um node que registra o sinal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { judgeArgs, judgeSettings, JUDGE_SCHEMA, answerOf, runSession } from './fsd-judge.mjs';

const val = (args, flag) => args[args.indexOf(flag) + 1];

test('argv: no git rule at all, no open Bash glob, only gh view/diff', () => {
  const a = judgeArgs({ stateDir: '/home/u/.config/fsd-agents' });
  const allowed = a.slice(a.indexOf('--allowedTools') + 1, a.indexOf('--disallowedTools'));
  assert.deepEqual(allowed.filter((x) => x.startsWith('Bash')), ['Bash(gh pr view:*)', 'Bash(gh pr diff:*)', 'Bash(gh issue view:*)']);
  assert.ok(!allowed.some((x) => /\bgit\b|Bash\(\*|Bash$/.test(x)), allowed.join(' '));
  assert.ok(!a.some((x) => /--output\b/.test(x) && x !== '--output-format'));
  assert.equal(val(a, '--permission-mode'), 'dontAsk');
  assert.equal(val(a, '--output-format'), 'json');
});

test('--settings denies the team state, credentials and secret files; git, curl, cat too', () => {
  const s = JSON.parse(val(judgeArgs({ stateDir: '/srv/fsd/state/' }), '--settings'));
  for (const r of ['Read(//srv/fsd/state/**)', 'Read(~/.config/fsd-agents/**)', 'Read(~/.config/gh/**)', 'Read(~/.ssh/**)', 'Read(**/*.pem)', 'Read(**/.env)', 'Bash(git:*)', 'Bash(curl:*)', 'Bash(cat:*)', 'Write', 'Edit'])
    assert.ok(s.permissions.deny.includes(r), r);
  assert.equal(s.disableAllHooks, true);
  assert.deepEqual(judgeSettings('/x'), judgeSettings('/x/'));
});

test('--json-schema is the judge-prompt contract: every field required, agents and owners closed', () => {
  const sc = JSON.parse(val(judgeArgs({ stateDir: '/x' }), '--json-schema'));
  assert.deepEqual(sc, JUDGE_SCHEMA);
  assert.deepEqual(sc.required.sort(), ['confidence', 'facts', 'overrides_author', 'reserved', 'rule', 'verdict']);
  assert.deepEqual(sc.properties.verdict.properties.continue.properties.agent.enum, ['mel', 'kevin', 'stuart', 'bob']);
  assert.deepEqual(sc.properties.rule.properties.owner.enum, ['mel', 'kevin', 'author']);
});

test('answerOf: structured_output, else result, else the raw text; is_error → null', () => {
  assert.deepEqual(answerOf(JSON.stringify({ result: '', structured_output: { confidence: 'high' } })), { confidence: 'high' });
  assert.equal(answerOf(JSON.stringify({ result: '{"a":1}' })), '{"a":1}');
  assert.equal(answerOf(JSON.stringify({ is_error: true, result: 'x' })), null);
  assert.equal(answerOf('```json\n{"a":1}\n```'), '```json\n{"a":1}\n```');
});

const fake = (body) => { const d = mkdtempSync(join(tmpdir(), 'judge-')); const f = join(d, 'claude.mjs'); writeFileSync(f, body); return { d, f, log: join(d, 'log') }; };

test('timeout: the session gets SIGINT first and ends there', async () => {
  const c = fake(`import { appendFileSync } from 'node:fs'; process.on('SIGINT', () => { appendFileSync(process.env.LOG, 'SIGINT\\n'); process.exit(130); }); process.on('SIGTERM', () => { appendFileSync(process.env.LOG, 'SIGTERM\\n'); process.exit(143); }); setInterval(() => {}, 1000);`);
  const r = await runSession({ bin: process.execPath, args: [c.f], env: { ...process.env, LOG: c.log }, timeoutMs: 300, graceMs: 2000 });
  assert.equal(r.timedOut, true); assert.deepEqual(r.signals, ['SIGINT']); assert.equal(r.status, 130);
  assert.equal(readFileSync(c.log, 'utf8'), 'SIGINT\n');
});

test('timeout: a session that ignores SIGINT gets SIGTERM after the grace', async () => {
  const c = fake(`import { appendFileSync } from 'node:fs'; process.on('SIGINT', () => appendFileSync(process.env.LOG, 'SIGINT\\n')); process.on('SIGTERM', () => { appendFileSync(process.env.LOG, 'SIGTERM\\n'); process.exit(143); }); setInterval(() => {}, 1000);`);
  const r = await runSession({ bin: process.execPath, args: [c.f], env: { ...process.env, LOG: c.log }, timeoutMs: 200, graceMs: 300 });
  assert.deepEqual(r.signals, ['SIGINT', 'SIGTERM']);
  assert.equal(readFileSync(c.log, 'utf8'), 'SIGINT\nSIGTERM\n');
});

test('in time: stdout and status come back, no signal, the prompt arrives on stdin', async () => {
  const c = fake(`let i = ''; process.stdin.on('data', (b) => (i += b)); process.stdin.on('end', () => { process.stdout.write(JSON.stringify({ result: '', structured_output: { got: i } })); });`);
  const r = await runSession({ bin: process.execPath, args: [c.f], input: 'the prompt', env: process.env, timeoutMs: 5000 });
  assert.equal(r.status, 0); assert.deepEqual(r.signals, []); assert.equal(r.timedOut, false);
  assert.deepEqual(answerOf(r.stdout), { got: 'the prompt' });
});
