// fsd-session.mjs — ciclo de vida da sessão de cada papel (F3.2, T3.2.1). Cada papel tem uma conversa: $FSD_STATE/dispatch/sessions.json
// ({ <papel>: { sessionId, active } }) guarda o id da sessão atual dela.
// Como o claude 2.1.322 se comporta (F0.2, fase0.md): o --bg escolhe o id (ignora --session-id) e o imprime ("backgrounded · <id>");
// --resume com flags cria uma cópia que leva o histórico, com id novo; sem flags, a sessão sobe com as opções que ela guardou na home
// do papel. Aqui todo turno passa as flags fixas do root (o papel não muda o próprio perfil, F4.1), então cada turno é uma cópia com a
// conversa inteira e o id novo é gravado. A sessão ligada (ociosa ou trabalhando) também gera cópia: ociosa → stop antes; trabalhando →
// a tarefa espera o fim do turno.
//   status({ agents, stored, hookState })   { <papel>: { state: 'working'|'idle'|'off', id?, sessionId? } } para o decide()
//   planStart / planTurn / planStop / planBoot   o argv das chamadas ao claude (puro); o executor roda e lê o id da saída
//   bgId(saída)   o id curto que o --bg imprimiu
// Estado: ligado = a sessão do papel aparece no `claude agents --json` (pelo sessionId); working/idle = o hook (fsd-session-hook).
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = join(new URL('.', import.meta.url).pathname, '..');
const CFG = JSON.parse(readFileSync(join(ROOT, 'agents.json'), 'utf8'));
export const ROLES = Object.keys(CFG.agents);
const stDir = () => join(process.env.FSD_STATE || join(process.env.HOME || '', '.config', 'fsd-agents'), 'dispatch');
export const loadStored = () => { try { return JSON.parse(readFileSync(join(stDir(), 'sessions.json'), 'utf8')); } catch { return {}; } };
export function saveStored(s) { mkdirSync(stDir(), { recursive: true }); const f = join(stDir(), 'sessions.json'), tmp = `${f}.${process.pid}.tmp`; writeFileSync(tmp, JSON.stringify(s, null, 1) + '\n'); renameSync(tmp, f); }

// No container (E2, FSD_SESSION_VIA=sudo) o supervisor roda como fsd-dispatch e fala com a sessão de cada papel só pelo wrapper
// fsd-session-exec, como o papel: o supervisor nativo do claude é por uid. Validação R2: o gather do fsd-dispatch e o fsd-session usam
// o mesmo liveAgents(), senão o supervisor via só as sessões do próprio uid (nenhuma) e todo papel ficava off.
export const via = () => process.env.FSD_SESSION_VIA === 'sudo';
export const sx = (role, ...args) => spawnSync('sudo', ['-n', '-u', `fsd-${role}`, '/usr/local/sbin/fsd-session-exec', ...args], { encoding: 'utf8' });
export function liveAgents({ claude = process.env.FSD_CLAUDE || 'claude', cwd } = {}) {
  // Sem a lista não dá para dizer que um papel está desligado: "nenhuma sessão" por engano abriria uma cópia de quem trabalha.
  const parse = (r, who) => {
    let v; if (r.status === 0) { try { v = JSON.parse(r.stdout || '[]'); } catch {} }
    if (!Array.isArray(v)) throw new Error(`não consegui ler as sessões${who}: ${(r.stderr || r.stdout || r.error?.code || `exit ${r.status}`).trim().split('\n')[0].slice(0, 160)}`);
    return v;
  };
  return via() ? ROLES.flatMap((r) => parse(sx(r, 'agents'), ` de ${r}`)) : parse(spawnSync(claude, ['agents', '--json'], { encoding: 'utf8', ...(cwd ? { cwd } : {}) }), '');
}

export const stopSession = (role, id, { claude = process.env.FSD_CLAUDE || 'claude' } = {}) => (via() ? sx(role, 'stop', id) : spawnSync(claude, ['stop', id], { encoding: 'utf8' }));

export function status({ agents = [], stored = {}, hookState = () => null }) {
  const out = {};
  for (const r of ROLES) {
    const sid = stored[r]?.sessionId; const live = sid && agents.find((a) => a.sessionId === sid && a.kind === 'background');
    if (!live) { out[r] = { state: 'off', ...(sid ? { sessionId: sid } : {}) }; continue; }
    out[r] = { state: hookState(r)?.state === 'working' ? 'working' : 'idle', id: live.id, sessionId: sid };
  }
  return out;
}
// Flags fixas da sessão do papel (estudo §4, peça 3). O modo e os settings do perfil entram na E4 (F4.1); aqui ficam configuráveis.
// Flags da sessão do papel (T4.1.2; iguais às do fsd-session-exec): bypass (D6), só os settings do perfil, do root (hooks do time + o
// papel, com worktree.bgIsolation "none" e o bloco env), nenhuma outra fonte de settings.
export const profileSettings = (role) => `/etc/fsd/profiles/${role}/settings.json`;
export function baseArgs(role, { settings = profileSettings(role) } = {}) {
  return ['--bg', '--name', role, '--permission-mode', 'bypassPermissions', '--setting-sources', 'local', '--settings', settings, '--append-system-prompt-file', settings.replace(/settings\.json$/, 'system.md')];
}
export function planStart(role, prompt, { stored = {}, opts } = {}) {
  const sid = stored[role]?.sessionId;
  return [{ argv: [...baseArgs(role, opts), ...(sid ? ['--resume', sid] : []), prompt], sessionId: '$OUT', ...(sid ? { from: sid } : {}) }];
}
export const bgId = (out) => /backgrounded · ([0-9a-f]{6,16})/.exec(String(out || ''))?.[1] || null;
// turn: ocioso → stop + resume (a conversa segue na cópia, sem a sessão antiga ligada); desligado → resume/start; trabalhando → recusa.
export function planTurn(role, prompt, { st, stored = {}, opts } = {}) {
  if (st?.state === 'working') return { refused: `${role} está trabalhando: --resume criaria uma cópia; a tarefa espera o fim do turno` };
  const stop = st?.state === 'idle' && st.id ? [{ argv: ['stop', st.id] }] : [];
  return { steps: [...stop, ...planStart(role, prompt, { stored, opts })] };
}
export const planStop = (role, { st }) => (st?.id ? [{ argv: ['stop', st.id] }] : []);
// Depois de um reinício (respawn --all só pega sessões vivas): cada papel ativo, desligado e interrompido no meio de um turno volta pelo id,
// com um aviso. Quem estava ocioso espera: a próxima tarefa já retoma a conversa, e religar à toa relê o contexto inteiro (custa).
export function planBoot({ stored = {}, st = {}, opts, interrupted = () => true } = {}) {
  return ROLES.filter((r) => stored[r]?.active && st[r]?.state === 'off' && stored[r].sessionId && interrupted(r))
    .map((r) => ({ role: r, steps: planStart(r, '[fsd] Sessão religada depois de um reinício do container. Siga o cartão da tarefa e a caixa; nada novo chegou.', { stored, opts }) }));
}
