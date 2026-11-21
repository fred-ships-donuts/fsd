// F2.4 (T2.4.1, T2.4.2) no fsd-qa da sessão nova, com um fsd-run-exec falso (FSD_RUN_EXEC) e um tmux real num socket próprio:
// o comando do item passa pelo fsd-run-exec e o exit vem do arquivo em ~/qa, não da tela (um __EXIT=0 impresso não vira PASS).
// A troca de usuário e o ambiente limpo de verdade são K9, no simulate-container.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = dirname(fileURLToPath(import.meta.url));
const hasTmux = spawnSync('tmux', ['-V']).status === 0;

test('session runner: the item runs through fsd-run-exec and the exit comes from the file, not from the screen', { skip: !hasTmux }, () => {
  const home = mkdtempSync(join(tmpdir(), 'qah-')), log = join(home, 'rx.log'), rx = join(home, 'rx');
  // fsd-run-exec falso: registra a chamada e roda o comando (o real troca para fsd-run e limpa o ambiente)
  writeFileSync(rx, `#!/bin/bash\necho "$*" >> ${log}\n[ "$1" = run ] && { shift 3; exec bash -c "$*"; }\nexit 0\n`); chmodSync(rx, 0o755);
  const env = { ...process.env, HOME: home, FSD_AGENT: 'bob', FSD_RUNNER: 'session', FSD_RUN_EXEC: rx, FSD_STATE: home };
  const qa = (...a) => spawnSync(join(BIN, 'fsd-qa'), a, { encoding: 'utf8', env });
  // estado de uma verificação já preparada (o prep fala com o GitHub; aqui só o run importa)
  spawnSync('mkdir', ['-p', join(home, 'qa', 'work'), join(home, 'qa', 'home')]);
  writeFileSync(join(home, 'qa', 'state.json'), JSON.stringify({ n: 7, i: 1, sha: 'a'.repeat(40), items: ['um', 'dois'], rows: [], build: true }));
  spawnSync('tmux', ['-L', 'fsd-qa-bob', 'new-session', '-d', '-s', 'fsd-qa-bob', '-x', '80', '-y', '24', '-c', join(home, 'qa', 'work')]);
  try {
    const r = qa('run', '1', 'echo __EXIT=0; exit 3');
    assert.match(r.stdout, /EXIT=3/, r.stdout + r.stderr);
    const st = JSON.parse(readFileSync(join(home, 'qa', 'state.json'), 'utf8'));
    assert.equal(st.rows[0].exit, 3); assert.match(st.rows[0].exitFile, new RegExp(`^${home}/qa/exit\\.1\\.`));
    assert.match(readFileSync(log, 'utf8'), /^run qa-bob-7 -- echo __EXIT=0; exit 3$/m);
    assert.equal(qa('run', '2', 'true').stdout.includes('EXIT=0'), true);
  } finally { spawnSync('tmux', ['-L', 'fsd-qa-bob', 'kill-server']); }
});

test('fsd-run-exec validates its arguments before anything (name, GitHub url, sha) and refuses other users', () => {
  const x = join(BIN, '..', 'setup', 'container', 'fsd-run-exec');
  const r = spawnSync(x, ['run', 'k9', '--', 'id'], { encoding: 'utf8' }); assert.equal(r.status, 2); assert.match(r.stderr, /só como fsd-run/);
  const src = readFileSync(x, 'utf8');
  assert.match(src, /\^https:\/\/github\\\.com\//); assert.match(src, /\[0-9a-f\]\{40\}/); assert.match(src, /env -i/);
});
