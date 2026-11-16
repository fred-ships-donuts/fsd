// fsd-timing.mjs — os tempos do time: a única leitura de agents.json → timing, com o timing do agents.local.json desta
// instalação por cima (merge campo a campo, fsd-local.mjs). Sem valores padrão: campo faltando é erro de configuração,
// não um número escondido. Variável de ambiente, quando existe, passa por cima de tudo (ver ENV).
//   import { timing, waitSeconds } from './fsd-timing.mjs'     timing().watch.loopSeconds · waitSeconds('todo')
//   node fsd-timing.mjs <campo…>                                um valor por linha (para os scripts bash), ex.: stop.waitSeconds
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { localConfig, merge } from './fsd-local.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REQUIRED = ['wait.default', 'wait.retries', 'waits.expireMin', 'deadlock.cycleMin', 'deadlock.stallMin', 'judge.timeoutMin', 'readyGraceMin', 'watch.loopSeconds', 'watch.idleMin', 'watch.silentMin',
  'watch.toolGraceMin', 'watch.toolDefaultMin', 'watch.cooldownMin', 'stop.pollSeconds', 'stop.waitSeconds', 'cleanup.loopSeconds', 'cleanup.mergedMin',
  'progress.everyMin', 'progress.stallMin', 'progress.pauseMin', 'progress.inboxMin'];
// Atalhos antigos, para um teste ou uma sessão só: valem mais que o agents.json.
const ENV = { 'wait.default': 'FSD_WAIT_SECONDS', readyGraceMin: 'FSD_READY_GRACE', 'stop.waitSeconds': 'FSD_STOP_WAIT' };
// Casos do fsd-wait com intervalo próprio (sem valor, vale wait.default).
export const WAIT_CASES = ['ready', 'todo', 'mine', 'column', 'pr'];
const get = (o, path) => path.split('.').reduce((v, k) => v?.[k], o);
const set = (o, path, v) => { const ks = path.split('.'); const last = ks.pop(); ks.reduce((x, k) => (x[k] ??= {}), o)[last] = v; };

// Sinal de vida: o fsd-context-guard grava aqui um arquivo por ferramenta em andamento; o fsd-watch lê.
export const liveDir = (agent) => join(tmpdir(), 'fsd-live', String(agent));
// Hash de claude-settings.json + redirects.json com que a sessão subiu. FORA de liveDir: o fsd-watch lê tudo ali como registro de ferramenta.
export const settingsHashFile = (agent) => join(tmpdir(), 'fsd-live-hash', String(agent));

let cache, localError = null;
// Quem lê o timing são processos sempre ligados (vigia, fsd-cleanup, fsd-wait dos Monitors): um agents.local.json com
// erro não pode derrubá-los. O ajuste local que não é JSON válido, ou que deixa um campo obrigatório inválido, é
// ignorado com aviso (stderr, e timingLocalError() para o vigia mostrar): vale o agents.json, a configuração do time.
// Campo faltando no próprio agents.json continua sendo erro.
export const timingLocalError = () => (timing(), localError);
export function timing() {
  if (cache) return cache;
  const base = JSON.parse(readFileSync(join(HERE, '..', 'agents.json'), 'utf8')).timing || {};
  const build = (loc) => {
    const t = structuredClone(merge(base, loc));
    for (const [k, e] of Object.entries(ENV)) if (Number(process.env[e]) > 0) set(t, k, Number(process.env[e]));
    return [t, REQUIRED.filter((k) => !(Number(get(t, k)) > 0))];
  };
  let loc; try { loc = localConfig().timing; } catch (e) { localError = e.message; }
  let [t, missing] = build(loc);
  if (missing.length && loc !== undefined) {
    const [t0, m0] = build(undefined);
    if (!m0.length) { localError = `agents.local.json → timing deixa inválido: ${missing.join(', ')}`; [t, missing] = [t0, m0]; }
  }
  if (missing.length) throw new Error(`agents.json → timing sem ${missing.join(', ')}`);
  if (localError) process.stderr.write(`fsd-timing: ${localError}; vale o agents.json\n`);
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
