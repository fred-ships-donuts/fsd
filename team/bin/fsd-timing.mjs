// fsd-timing.mjs — os tempos do time: a única leitura de agents.json → timing. Sem valores padrão: campo faltando é
// erro de configuração, não um número escondido. Variável de ambiente, quando existe, passa por cima (ver ENV).
//   import { timing, waitSeconds } from './fsd-timing.mjs'     timing().watch.loopSeconds · waitSeconds('todo')
//   node fsd-timing.mjs <campo…>                                um valor por linha (para os scripts bash), ex.: stop.waitSeconds
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REQUIRED = ['wait.default', 'wait.retries', 'waits.expireMin', 'deadlock.cycleMin', 'deadlock.stallMin', 'judge.timeoutMin', 'readyGraceMin', 'watch.loopSeconds', 'watch.idleMin', 'watch.silentMin',
  'watch.toolGraceMin', 'watch.toolDefaultMin', 'watch.cooldownMin', 'stop.pollSeconds', 'stop.waitSeconds', 'cleanup.loopSeconds', 'cleanup.mergedMin'];
// Atalhos antigos, para um teste ou uma sessão só: valem mais que o agents.json.
const ENV = { 'wait.default': 'FSD_WAIT_SECONDS', readyGraceMin: 'FSD_READY_GRACE', 'stop.waitSeconds': 'FSD_STOP_WAIT' };
// Casos do fsd-wait com intervalo próprio (sem valor, vale wait.default).
export const WAIT_CASES = ['ready', 'todo', 'mine', 'column', 'pr'];
const get = (o, path) => path.split('.').reduce((v, k) => v?.[k], o);
const set = (o, path, v) => { const ks = path.split('.'); const last = ks.pop(); ks.reduce((x, k) => (x[k] ??= {}), o)[last] = v; };

// Sinal de vida: o fsd-context-guard grava aqui um arquivo por ferramenta em andamento; o fsd-watch lê.
export const liveDir = (agent) => join(tmpdir(), 'fsd-live', String(agent));

let cache;
export function timing() {
  if (cache) return cache;
  const t = structuredClone(JSON.parse(readFileSync(join(HERE, '..', 'agents.json'), 'utf8')).timing || {});
  for (const [k, e] of Object.entries(ENV)) if (Number(process.env[e]) > 0) set(t, k, Number(process.env[e]));
  const missing = REQUIRED.filter((k) => !(Number(get(t, k)) > 0));
  if (missing.length) throw new Error(`agents.json → timing sem ${missing.join(', ')}`);
  return (cache = t);
}
// Intervalo de um caso do fsd-wait, em segundos. FSD_WAIT_SECONDS vale para todos os casos.
export function waitSeconds(kase) {
  const t = timing();
  if (Number(process.env.FSD_WAIT_SECONDS) > 0) return Number(process.env.FSD_WAIT_SECONDS);
  return Number(t.wait[kase]) > 0 ? Number(t.wait[kase]) : Number(t.wait.default);
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const t = timing(); for (const k of process.argv.slice(2)) { const v = get(t, k); if (v === undefined) throw new Error(`timing sem ${k}`); console.log(v); } }
  catch (e) { console.error(`fsd-timing: ${e.message}`); process.exit(2); }
}
