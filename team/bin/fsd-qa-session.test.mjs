// F2.4 (T2.4.1, T2.4.2) no fsd-qa da sessão nova, com um fsd-run-exec falso (FSD_RUN_EXEC) e um tmux real num socket próprio:
// o comando do item passa pelo fsd-run-exec e o exit vem do painel morto, não da tela (um __EXIT=0 impresso não vira PASS); R16: sem shell do Bob.
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

test('session runner (R16): each item runs in its own window, the exit comes from the file in ~/qa, and no Bob shell is left to type into', { skip: !hasTmux }, () => {
  const home = mkdtempSync(join(tmpdir(), 'qah-')), log = join(home, 'rx.log'), rx = join(home, 'rx');
  // fsd-run-exec falso: registra a chamada e roda o comando (o real troca para fsd-run e limpa o ambiente)
  writeFileSync(rx, `#!/bin/bash\necho "$*" >> ${log}\n[ "$1" = run ] && { shift 3; exec bash -c "$*"; }\nexit 0\n`); chmodSync(rx, 0o755);
  const sock = `fsd-qa-r16-${process.pid}`;   // socket próprio: o fsd-dry-cycles usa o fsd-qa-bob em paralelo
  const env = { ...process.env, HOME: home, FSD_AGENT: 'bob', FSD_RUNNER: 'session', FSD_RUN_EXEC: rx, FSD_STATE: home, FSD_QA_TMUX: sock };
  const qa = (...a) => spawnSync(join(BIN, 'fsd-qa'), a, { encoding: 'utf8', env });
  const tm = (...a) => spawnSync('tmux', ['-L', sock, ...a], { encoding: 'utf8' });
  // estado de uma verificação já preparada (o prep fala com o GitHub; aqui só o run importa); a sessão como o prep a abre
  spawnSync('mkdir', ['-p', join(home, 'qa', 'work'), join(home, 'qa', 'home')]);
  writeFileSync(join(home, 'qa', 'state.json'), JSON.stringify({ n: 7, i: 1, sha: 'a'.repeat(40), items: ['um', 'dois', 'tres'], rows: [], build: true }));
  tm('new-session', '-d', '-s', sock, '-x', '80', '-y', '24', '-c', join(home, 'qa', 'work'), 'sleep infinity');
  try {
    const r = qa('run', '1', 'echo __EXIT=0; exit 3');
    assert.match(r.stdout, /EXIT=3/, r.stdout + r.stderr); assert.match(r.stdout, /__EXIT=0|\[item 1\]/);
    const st = JSON.parse(readFileSync(join(home, 'qa', 'state.json'), 'utf8'));
    assert.equal(st.rows[0].exit, 3); assert.match(st.win, /^item1-/); assert.match(st.exitFile, new RegExp(`^${home}/qa/exit\\.1\\.`));
    assert.match(readFileSync(log, 'utf8'), /^run qa-bob-7 -- echo __EXIT=0; exit 3$/m);
    // O item acabou: nada de teclas (antes, o painel voltava ao shell do Bob, fora do sandbox).
    const k = qa('key', '--text', 'id > ' + join(home, 'pwned')); assert.equal(k.status, 1); assert.match(k.stdout, /nenhum item rodando/);
    // Nenhum painel com shell: só o sleep da sessão e as janelas mortas dos itens.
    const cmds = tm('list-panes', '-a', '-F', '#{pane_current_command} #{pane_dead}').stdout.trim().split('\n');
    assert.equal(cmds.some((l) => /^(bash|sh|zsh) 0$/.test(l)), false, cmds.join('|'));
    assert.equal(qa('run', '2', 'true').stdout.includes('EXIT=0'), true);
    // Validação R21: o corpo do item por arquivo, com aspas, $, operadores e várias linhas, vai inteiro para o fsd-run-exec.
    const f = join(home, 'item2.sh'); writeFileSync(f, "X=\"a b\" && echo \"$X\" | tr a-z A-Z\nX\nexit 4\n");
    const fr = qa('run', '2', '--file', f); assert.match(fr.stdout, /A B/, fr.stdout + fr.stderr); assert.match(fr.stdout, /EXIT=4/);
    assert.match(readFileSync(log, 'utf8'), /^run qa-bob-7 -- X="a b" && echo "\$X" \| tr a-z A-Z$/m);
    // Um item interativo segue vivo e recebe as teclas; quando sai, o exit vem do painel.
    const i3 = qa('run', '3', 'read x; exit 5'); assert.match(i3.stdout, /TELA INTERATIVA/);
    const e = qa('key', '--text', 'ok'); assert.equal(e.status, 0); const done = qa('key', 'Enter'); assert.match(done.stdout, /EXIT=5/, done.stdout);
  } finally { tm('kill-server'); }
});

test('fsd-run-exec validates its arguments before anything (name, GitHub url, sha) and refuses other users', () => {
  const x = join(BIN, '..', 'setup', 'container', 'fsd-run-exec');
  const r = spawnSync(x, ['run', 'k9', '--', 'id'], { encoding: 'utf8' }); assert.equal(r.status, 2); assert.match(r.stderr, /só como fsd-run/);
  const src = readFileSync(x, 'utf8');
  assert.match(src, /\^https:\/\/github\\\.com\//); assert.match(src, /\[0-9a-f\]\{40\}/); assert.match(src, /env -i/);
});
