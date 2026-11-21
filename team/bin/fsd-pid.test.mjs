// F1.8: pid file com identidade (pid + starttime + boot_id), estado do vigia no $FSD_STATE e revive só no estado real (#212).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { identity, recordAlive, parsePid, takePidFile, freePidFile, readPidFile, startTime } from './fsd-pid.mjs';
import { reviveRefused } from './fsd-revive.mjs';

const BIN = dirname(fileURLToPath(import.meta.url));
const child = () => spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
const linux = existsSync('/proc/self/stat');

test('a live process with its own identity is alive; the same pid with another starttime or boot is not', { skip: !linux }, async () => {
  const c = child(); try {
    const me = identity(c.pid);
    assert.ok(me.start && me.boot);
    assert.equal(recordAlive(me), true);
    assert.equal(recordAlive({ ...me, start: String(Number(me.start) + 1) }), false);   // pid reaproveitado
    assert.equal(recordAlive({ ...me, boot: '00000000-0000-0000-0000-000000000000' }), false);   // outro boot
    assert.equal(recordAlive(parsePid(String(c.pid))), true);   // arquivo antigo: só kill -0
  } finally { c.kill('SIGKILL'); }
  await new Promise((r) => c.on('exit', r));
  assert.equal(recordAlive(identity(c.pid)), false);
});

test('startTime reads field 22 even when the name has spaces and parentheses', { skip: !linux }, () => {
  const stat = readFileSync('/proc/self/stat', 'utf8'); const f = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
  assert.equal(startTime(process.pid), f[19]);
  assert.equal(startTime(2 ** 30), null);
});

test('takePidFile: a live holder keeps it; a reused pid (right number, wrong starttime) is taken over', { skip: !linux }, async () => {
  const d = mkdtempSync(join(tmpdir(), 'pid-')), f = join(d, 'watch.pid'); const c = child();
  try {
    writeFileSync(f, JSON.stringify(identity(c.pid)));
    assert.deepEqual(takePidFile(f), { ok: false, pid: c.pid });
    writeFileSync(f, JSON.stringify({ ...identity(c.pid), start: '1' }));
    assert.deepEqual(takePidFile(f), { ok: true });
    assert.deepEqual(readPidFile(f), identity());
    freePidFile(f); assert.equal(existsSync(f), false);
    writeFileSync(f, 'garbage'); assert.deepEqual(takePidFile(f), { ok: true });
  } finally { c.kill('SIGKILL'); }
});

test('two watchers with different FSD_STATE keep their own round state, never /tmp/fsd-watch-state.json', () => {
  const run = (d) => spawnSync(join(BIN, 'fsd-watch'), [], { env: { ...process.env, FSD_STATE: d, FSD_DRY: '1', FSD_TMUX_SOCKET: `fsd-pid-test-${process.pid}` }, encoding: 'utf8', timeout: 60000 });
  const a = mkdtempSync(join(tmpdir(), 'wa-')), b = mkdtempSync(join(tmpdir(), 'wb-'));
  writeFileSync(join(a, 'watch-state.json'), JSON.stringify({ marker: 'A' })); writeFileSync(join(b, 'watch-state.json'), JSON.stringify({ marker: 'B' }));
  assert.equal(run(a).status, 0); assert.equal(run(b).status, 0);
  assert.equal(JSON.parse(readFileSync(join(a, 'watch-state.json'), 'utf8')).marker, 'A');
  assert.equal(JSON.parse(readFileSync(join(b, 'watch-state.json'), 'utf8')).marker, 'B');
  let shared = ''; try { shared = readFileSync(join(tmpdir(), 'fsd-watch-state.json'), 'utf8'); } catch {}
  assert.doesNotMatch(shared, /"marker"/);
  assert.doesNotMatch(readFileSync(join(BIN, 'fsd-watch'), 'utf8'), /tmpdir\(\), 'fsd-watch-state/);
});

test('fsd-revive starts no loop with FSD_DRY or with a state under the tmpdir', () => {
  const keep = { cmd: process.env.FSD_REVIVE_CMD, dry: process.env.FSD_DRY };
  delete process.env.FSD_REVIVE_CMD; delete process.env.FSD_DRY;
  try {
    assert.match(reviveRefused(mkdtempSync(join(tmpdir(), 'rv-'))), /estado de teste/);
    assert.equal(reviveRefused(join(homedir(), '.config', 'fsd-agents')), null);
    process.env.FSD_DRY = '1';
    assert.equal(reviveRefused(join(homedir(), '.config', 'fsd-agents')), 'FSD_DRY');
  } finally {
    if (keep.cmd === undefined) delete process.env.FSD_REVIVE_CMD; else process.env.FSD_REVIVE_CMD = keep.cmd;
    if (keep.dry === undefined) delete process.env.FSD_DRY; else process.env.FSD_DRY = keep.dry;
  }
});
