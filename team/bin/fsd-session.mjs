// fsd-session.mjs — ciclo de vida da sessão de cada papel (F3.2, T3.2.1). Cada papel tem uma conversa fixa: um uuid guardado em
// $FSD_STATE/dispatch/sessions.json ({ <papel>: { sessionId, active } }), passado com --session-id na primeira vez e retomado com
// --resume depois. Assim religar, depois de ocioso, desligado ou de um reinício do container, é sempre a mesma conversa.
//   status({ agents, stored, hookState })   { <papel>: { state: 'working'|'idle'|'off', id?, sessionId? } } para o decide()
//   planStart / planTurn / planStop / planBoot   o argv das chamadas ao claude (puro); o executor roda
// Estado: ligado = a sessão do papel aparece no `claude agents --json` (pelo sessionId); working/idle = o hook (fsd-session-hook).
// Regra: nunca --resume numa sessão trabalhando (cria cópia, E-cópia): a tarefa espera o fim do turno.
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(new URL('.', import.meta.url).pathname, '..');
const CFG = JSON.parse(readFileSync(join(ROOT, 'agents.json'), 'utf8'));
export const ROLES = Object.keys(CFG.agents);
const stDir = () => join(process.env.FSD_STATE || join(process.env.HOME || '', '.config', 'fsd-agents'), 'dispatch');
export const loadStored = () => { try { return JSON.parse(readFileSync(join(stDir(), 'sessions.json'), 'utf8')); } catch { return {}; } };
export function saveStored(s) { mkdirSync(stDir(), { recursive: true }); const f = join(stDir(), 'sessions.json'), tmp = `${f}.${process.pid}.tmp`; writeFileSync(tmp, JSON.stringify(s, null, 1) + '\n'); renameSync(tmp, f); }

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
  return ['--bg', '--name', role, '--permission-mode', 'bypassPermissions', '--setting-sources', 'local', '--settings', settings];
}
export function planStart(role, prompt, { stored = {}, opts } = {}) {
  const sid = stored[role]?.sessionId;
  return sid ? [{ argv: [...baseArgs(role, opts), '--resume', sid, prompt], sessionId: sid }] : [{ argv: [...baseArgs(role, opts), '--session-id', '$NEW', prompt], sessionId: '$NEW' }];
}
// turn: ocioso → stop + resume (mesma conversa, sem cópia); desligado → resume/start; trabalhando → recusa.
export function planTurn(role, prompt, { st, stored = {}, opts } = {}) {
  if (st?.state === 'working') return { refused: `${role} está trabalhando: --resume criaria uma cópia; a tarefa espera o fim do turno` };
  const stop = st?.state === 'idle' && st.id ? [{ argv: ['stop', st.id] }] : [];
  return { steps: [...stop, ...planStart(role, prompt, { stored, opts })] };
}
export const planStop = (role, { st }) => (st?.id ? [{ argv: ['stop', st.id] }] : []);
// Depois de um reinício (respawn --all só pega sessões vivas): cada papel ativo que não está ligado volta pelo id, com um aviso.
export function planBoot({ stored = {}, st = {}, opts } = {}) {
  return ROLES.filter((r) => stored[r]?.active && st[r]?.state === 'off' && stored[r].sessionId)
    .map((r) => ({ role: r, steps: planStart(r, '[fsd] Sessão religada depois de um reinício do container. Siga o cartão da tarefa e a caixa; nada novo chegou.', { stored, opts }) }));
}
export const newSessionId = () => randomUUID();
