// T4.9.5: quais papéis pedem uma rodada de evals, pelo que o diff muda.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const F = join(dirname(fileURLToPath(import.meta.url)), '..', 'setup', 'evals-needed');
test('evals-needed: role files name the role, shared rules name everyone, code and docs name nobody; it warns and never fails', () => {
  const d = mkdtempSync(join(tmpdir(), 'ev-')); const g = (...a) => { const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-C', d, ...a], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); };
  const put = (f) => { mkdirSync(dirname(join(d, f)), { recursive: true }); writeFileSync(join(d, f), f); };
  const run = (env = {}) => { const r = spawnSync(process.execPath, [F, 'base'], { cwd: d, encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: '', ...env } }); assert.equal(r.status, 0, r.stderr); return r.stdout; };
  g('init', '-q'); put('x'); g('add', '.'); g('commit', '-qm', 'a'); assert.match(run(), /não li o diff com base/); g('branch', 'base');
  put('src/a.ts'); put('team/bin/fsd-x'); put('team/agents/fred/claude/a'); g('add', '.'); g('commit', '-qm', 'b'); assert.match(run({ GITHUB_ACTIONS: 'true' }), /^evals-needed: nenhuma/);
  put('team/agents/bob/claude/skills/s/SKILL.md'); put('team/agents/mel/claude/CLAUDE.md'); g('add', '.'); g('commit', '-qm', 'c'); assert.match(run({ GITHUB_ACTIONS: 'true' }), /^::warning::A configuração de mel, bob mudou: rode fsd-eval run mel bob --real/);
  put('team/common/team.md'); g('add', '.'); g('commit', '-qm', 'd'); assert.match(run(), /^A configuração de kevin, mel, stuart, bob mudou/);
  assert.ok(readFileSync(F, 'utf8').startsWith('#!/usr/bin/env node'));
});
