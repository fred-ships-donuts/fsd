// fsd-qa-guard.mjs — recusa o fsd-watch --fix e o fsd-cleanup rodando de um worktree de QA contra o estado ou o tmux reais (#169).
// Worktree de QA = o código mora sob /tmp/fsd-qa-<agente>/ (workspace do fsd-qa) ou sob .claude/worktrees/. O vigia real roda da pasta principal.
// qaRefusal → texto de uma linha (stderr, exit 2) ou null. Só lê o ambiente; não escreve nada.
import { realpathSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const real = (p) => { try { return realpathSync(p); } catch { return resolve(p); } };
export const inQaWorktree = (dir) => { const d = real(dir) + sep; return d.includes(`${sep}.claude${sep}worktrees${sep}`) || /^\/tmp\/fsd-qa-[^/]+\//.test(d); };

// needTmux: o fsd-cleanup não usa tmux, só confere o estado.
export function qaRefusal({ repoDir, env = process.env, needTmux = true }) {
  if (!inQaWorktree(repoDir)) return null;
  const realState = real(join(env.HOME || '', '.config', 'fsd-agents'));
  if (!env.FSD_STATE || real(env.FSD_STATE) === realState) return `recusado: rodando de um worktree de QA (${repoDir}) com o FSD_STATE real; defina FSD_STATE para uma pasta privada.`;
  if (needTmux && (!env.FSD_TMUX_SOCKET || env.FSD_TMUX_SOCKET === 'default')) return `recusado: rodando de um worktree de QA (${repoDir}) no tmux padrão; defina FSD_TMUX_SOCKET para um socket privado.`;
  return null;
}

export function refuseIfQa(opts) { const m = qaRefusal(opts); if (m) { console.error(m); process.exit(2); } }
