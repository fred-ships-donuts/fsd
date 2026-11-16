// fsd-reload.mjs — código velho em processo longo (#133, S2 de #124). Sem efeitos ao importar; as partes puras têm teste.
//   fingerprint(files)        hash do conjunto de arquivos (realpath, mtime, tamanho); arquivo ausente conta como "missing", nunca lança
//   parses(file)              .json → JSON.parse; o resto → node --check pela entrada padrão, como módulo ESM (fsd-watch/fsd-cleanup não têm extensão)
//   settingsHash(root)        sha256 de claude-settings.json + redirects.json: a mesma conta no fsd-agent (que grava) e no fsd-watch (que compara)
//   reexecIfChanged(...)      'same' | 'reloaded' (não volta: o processo sai 0 e o filho assume) | 'broken' (segue com o código antigo)
//   safeToRestart(...)        a sessão está parada no prompt, sem nada rodando, sem diálogo nem limite de uso?
//   node fsd-reload.mjs hash <team>   imprime settingsHash (para o fsd-agent, sem sha256sum)
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const sha = (x) => createHash('sha256').update(x).digest('hex');

export function fingerprint(files) {
  const rows = files.map((f) => {
    try { const st = statSync(f); return `${realpathSync(f)}:${st.mtimeMs}:${st.size}`; } catch { return `${f}:missing`; }
  });
  return sha(rows.sort().join('\n'));
}

export function parses(file) {
  let text; try { text = readFileSync(file, 'utf8'); } catch { return false; }
  if (file.endsWith('.json')) { try { JSON.parse(text); return true; } catch { return false; } }
  return spawnSync(process.execPath, ['--check', '--input-type=module'], { input: text, encoding: 'utf8' }).status === 0;
}

export function settingsHash(root) {
  return sha(Buffer.concat(['claude-settings.json', 'redirects.json'].map((f) => readFileSync(join(root, f)))));
}

let lastBadFp = null;   // a mesma mudança quebrada avisa uma vez só, não a cada rodada
export function reexecIfChanged({ files, startFp, script, args = [], log, beforeExit = () => {} }) {
  const fp = fingerprint(files);
  if (fp === startFp) return 'same';
  const bad = files.find((f) => !parses(f));
  if (bad) {
    if (fp !== lastBadFp) { lastBadFp = fp; log(`${bad} não compila; sigo com o código antigo`); }
    return 'broken';
  }
  log('fonte mudou, reexecutando');
  beforeExit();
  const tty = Boolean(process.stdout.isTTY);
  spawn(process.execPath, [script, ...args], { stdio: tty ? 'inherit' : 'ignore', detached: true, env: process.env }).unref();
  process.exit(0);
}

const SHELLS = ['bash', 'zsh', 'sh'];
const DIALOG = /Do you want|❯ 1\.|Press Enter to continue|Do you trust|trust this folder/i;
const LIMIT = /usage limit|hit your limit|limit will reset|resets? at/i;
export function safeToRestart({ pane = '', paneCommand = '', tools = [] }) {
  if (/esc to interrupt/.test(pane)) return false;
  if (tools.length) return false;
  if (SHELLS.includes(String(paneCommand).trim())) return false;
  return !DIALOG.test(pane) && !LIMIT.test(pane);
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === 'hash') {
  console.log(settingsHash(process.argv[3] || dirname(dirname(fileURLToPath(import.meta.url)))));
}
