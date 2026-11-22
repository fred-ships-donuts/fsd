// F4.7 (U): a verificação depois de cada edição do Stuart. O plano de cada arquivo (tsc, node --check, o teste dele) e, num repositório
// de verdade com o tsc do projeto, uma edição com erro de tipo recebe o erro do hook; a corrigida passa em silêncio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, symlinkSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { plan, verify, sandboxed } from './fsd-verify-hook.mjs';

const BIN = dirname(fileURLToPath(import.meta.url)), REPO = join(BIN, '..', '..');
const has = (set) => (p) => set.has(p);

test('plan: tsc + sibling test for a .ts, node --check + test for a .mjs, nothing for docs or outside a package', () => {
  const ex = has(new Set(['/r/package.json', '/r/tsconfig.json', '/r/tsconfig.test.json', '/r/node_modules/.bin/tsc', '/r/src/a.test.ts', '/r/team/bin/x.test.mjs']));
  assert.deepEqual(plan('/r/src/a.ts', { exists: ex }).steps.map((s) => s.name), ['tsc -p tsconfig.json', 'teste src/a.test.ts']);
  assert.deepEqual(plan('/r/src/a.test.ts', { exists: ex }).steps.map((s) => s.name), ['tsc -p tsconfig.test.json', 'teste src/a.test.ts']);
  assert.deepEqual(plan('/r/team/bin/x.mjs', { exists: ex }).steps.map((s) => s.name), ['node --check', 'teste team/bin/x.test.mjs']);
  assert.equal(plan('/r/README.md', { exists: ex }), null); assert.equal(plan('/elsewhere/a.ts', { exists: () => false }), null);
  assert.equal(verify({ tool_name: 'Read', tool_input: { file_path: '/r/src/a.ts' } }, { exists: ex, run: () => assert.fail('não roda') }), '');
});

test('a failing step becomes decision:block with the error; all green prints nothing', () => {
  const ex = has(new Set(['/r/package.json', '/r/tsconfig.json', '/r/node_modules/.bin/tsc']));
  const out = JSON.parse(verify({ tool_name: 'Edit', tool_input: { file_path: '/r/src/a.ts' } }, { exists: ex, run: () => ({ ok: false, out: "src/a.ts(1,7): error TS2322: Type 'string' is not assignable to type 'number'." }) }));
  assert.equal(out.decision, 'block'); assert.match(out.reason, /src\/a\.ts falhou[\s\S]*TS2322/);
  assert.equal(verify({ tool_name: 'Write', tool_input: { file_path: '/r/src/a.ts' } }, { exists: ex, run: () => ({ ok: true, out: '' }) }), '');
});

const tsc = join(REPO, 'node_modules', '.bin', 'tsc');
const bwrapOk = spawnSync('bwrap', ['--dev-bind', '/', '/', 'true']).status === 0;
test('F4.7 dry: an edit with a type error gets the hook error at once; the fixed edit passes', { skip: !existsSync(tsc) || !bwrapOk }, () => {
  const r = mkdtempSync(join(tmpdir(), 'vh-'));
  writeFileSync(join(r, 'package.json'), '{"type":"module"}'); symlinkSync(join(REPO, 'node_modules'), join(r, 'node_modules'));
  writeFileSync(join(r, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, module: 'nodenext', target: 'es2022', noEmit: true }, include: ['*.ts'] }));
  const f = join(r, 'a.ts'); const hook = (env) => spawnSync(join(BIN, 'fsd-verify-hook'), { input: JSON.stringify({ hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: { file_path: f } }), encoding: 'utf8', env: { ...process.env, ...env } });
  writeFileSync(f, "export const n: number = 'x';\n");
  const bad = hook({ FSD_RUNNER: 'session' }); assert.equal(bad.status, 0);
  const j = JSON.parse(bad.stdout); assert.equal(j.decision, 'block'); assert.match(j.reason, /TS2322/);
  assert.equal(hook({ FSD_RUNNER: '' }).stdout, '');   // o time no tmux não muda
  writeFileSync(f, 'export const n: number = 1;\n'); assert.equal(hook({ FSD_RUNNER: 'session' }).stdout, '');
});

test('the hook is wired only in the Stuart session profile', () => {
  const p = (r) => JSON.parse(readFileSync(join(BIN, '..', 'agents', r, 'claude', 'settings.session.json'), 'utf8'));
  assert.ok(p('stuart').hooks.PostToolUse.some((h) => h.hooks.some((x) => x.command.endsWith('fsd-verify-hook'))));
  for (const r of ['mel', 'bob', 'kevin']) assert.ok(!JSON.stringify(p(r)).includes('fsd-verify-hook'));
});

test('validation R15: the steps run in a bwrap that masks the credential; the agent test never leaks it (with or without bwrap)', () => {
  const ex = (f) => f.endsWith('.credentials.json');
  const w = sandboxed({ cmd: 'node', args: ['--test', 'a.test.mjs'] }, { home: '/h', exists: ex });
  assert.equal(w.cmd, 'bwrap'); assert.deepEqual(w.args.slice(0, 7), ['--die-with-parent', '--dev-bind', '/', '/', '--ro-bind', '/dev/null', '/h/.claude/.credentials.json']);
  assert.deepEqual(w.args.slice(-3), ['node', '--test', 'a.test.mjs']);
  const h = mkdtempSync(join(tmpdir(), 'vhs-')); const r = join(h, 'r'); spawnSync('mkdir', ['-p', join(h, '.claude'), r]);
  writeFileSync(join(h, '.claude', '.credentials.json'), 'SEGREDO-DA-ASSINATURA\n'); writeFileSync(join(r, 'package.json'), '{"type":"module"}');
  writeFileSync(join(r, 'a.test.mjs'), "import { test } from 'node:test'; import { readFileSync } from 'node:fs';\ntest('leak', () => { throw new Error('VAZOU[' + readFileSync(process.env.HOME + '/.claude/.credentials.json', 'utf8') + ']'); });\n");
  const o = spawnSync(join(BIN, 'fsd-verify-hook'), { input: JSON.stringify({ hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: { file_path: join(r, 'a.test.mjs') } }), encoding: 'utf8', env: { ...process.env, HOME: h, FSD_RUNNER: 'session' } });
  assert.doesNotMatch(o.stdout, /SEGREDO-DA-ASSINATURA/);
  assert.match(o.stdout, bwrapOk ? /EACCES|permission denied/ : /não rodou/);
});
