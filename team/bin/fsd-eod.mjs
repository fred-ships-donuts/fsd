// fsd-eod.mjs — fim do dia (F3.4, T3.4.2; D12). Perto do limite de contexto o supervisor pede o fechamento (passagem no ai-memory e no
// GitHub, commit e push, #202); a sessão fecha só sem nada do papel só no disco; a próxima tarefa abre uma sessão nova, que lê a passagem.
//   EOD_PROMPT · NEW_DAY_NOTE
//   unsaved(role, { repo })   worktrees do papel (branch.<b>.fsd-agent) com mudança sem commit ou commit sem push
//   ctxOf(transcript)         contexto da última resposta (entrada + cache lido + cache gravado + saída), como o fsd-stats
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const EOD_PROMPT = [
  '[fsd-fim-do-dia] Seu contexto está perto do limite: feche o dia agora, nesta ordem, e termine o turno.',
  '1. Grave a passagem de bastão no ai-memory (memory_handoff_begin): o que fez, o estado do card, o próximo passo.',
  '2. No GitHub, deixe no PR ou issue em andamento um comentário curto com o mesmo estado.',
  '3. Commit e push de tudo o que estiver no disco (git add, git commit, git push ou fsd-pr open). Nada pode ficar só no disco.',
  'Não comece trabalho novo. A próxima tarefa abre uma sessão nova, que lê a sua passagem.',
].join('\n');
export const NEW_DAY_NOTE = '[fsd] Sessão nova (o dia anterior fechou com a passagem de bastão): leia o handoff do ai-memory antes de seguir o cartão.';

const git = (cwd, ...a) => spawnSync('git', ['-C', cwd, ...a], { encoding: 'utf8' });
export function unsaved(role, { repo }) {
  const out = [];
  const wt = git(repo, 'worktree', 'list', '--porcelain').stdout.split('\n\n').map((b) => ({ path: /^worktree (.+)$/m.exec(b)?.[1], branch: /^branch refs\/heads\/(.+)$/m.exec(b)?.[1] })).filter((w) => w.path && w.branch);
  for (const w of wt) {
    if (git(repo, 'config', '--get', `branch.${w.branch}.fsd-agent`).stdout.trim() !== role) continue;
    const dirty = git(w.path, 'status', '--porcelain').stdout.trim().split('\n').filter(Boolean).length;
    const up = git(w.path, 'rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}');
    const ahead = up.status === 0 ? Number(git(w.path, 'rev-list', '--count', '@{u}..HEAD').stdout.trim() || 0) : Number(git(w.path, 'rev-list', '--count', 'HEAD', '--not', '--remotes').stdout.trim() || 0);
    if (dirty || ahead) out.push({ path: w.path, branch: w.branch, dirty, ahead });
  }
  return out;
}
export function ctxOf(transcript) {
  let last = 0;
  try {
    for (const l of readFileSync(transcript, 'utf8').split('\n')) {
      if (!l.includes('"usage"')) continue; let j; try { j = JSON.parse(l); } catch { continue; }
      const u = j.message?.usage; if (j.type === 'assistant' && u) last = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.output_tokens || 0);
    }
  } catch {}
  return last;
}
