import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isLoop, under, findLoops, killLoops } from './fsd-loops.mjs';

test('isLoop e under', () => {
  assert.ok(isLoop(['node', '/x/team/bin/fsd-watch', '--fix', '--loop']));
  assert.ok(isLoop(['node', 'fsd-cleanup', '--loop']));
  assert.ok(!isLoop(['node', 'fsd-watch']));
  assert.ok(!isLoop(['node', 'fsd-qa', '--loop']));
  assert.ok(under('/tmp/a/b', '/tmp/a') && !under('/tmp/ab', '/tmp/a'));
});

test('encerra só o laço com FSD_STATE sob o diretório; ignora sem FSD_STATE e o de fora', async () => {
  const base = mkdtempSync(join(tmpdir(), 'fsd-loops-')), other = mkdtempSync(join(tmpdir(), 'fsd-loops-'));
  const run = (state) => { const env = { ...process.env }; delete env.FSD_STATE; if (state) env.FSD_STATE = state; return spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)', 'fsd-cleanup', '--loop'], { env, stdio: 'ignore' }); };
  const mine = run(base), none = run(null), out = run(other);
  await new Promise((r) => setTimeout(r, 300));
  try {
    assert.deepEqual(findLoops({ dir: base }).map((l) => l.pid), [mine.pid]);
    assert.equal(findLoops({ dir: base, olderThanMin: 60 }).length, 0);
    assert.equal(killLoops({ dir: base, dry: true }).length, 1);
    assert.equal(mine.exitCode, null);
    killLoops({ dir: base });
    await new Promise((r) => mine.once('exit', r));
    assert.equal(none.exitCode, null); assert.equal(out.exitCode, null);
  } finally { for (const p of [mine, none, out]) p.kill('SIGKILL'); }
});
