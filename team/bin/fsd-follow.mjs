// fsd-follow.mjs — o checkout principal acompanha a origin/develop (#173). Sem efeitos ao importar; testado em fsd-follow.test.mjs.
//   checkoutState(repo)       { state: 'ok'|'behind'|'other-branch'|'dirty'|'error', behind, branch, msg }  só lê
//   followDevelop(repo)       state + se for 'behind' (em develop, árvore limpa): git merge --ff-only origin/develop → { ...state, moved: true }
// Nunca mexe em outro branch nem em árvore suja; sem commits locais próprios o ff-only também recusa sozinho. Quem chama faz o fetch antes.
import { spawnSync } from 'node:child_process';

const git = (repo, args) => { const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', timeout: 60000 }); return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim().split('\n')[0].slice(0, 200) }; };

export function checkoutState(repo) {
  const br = git(repo, ['symbolic-ref', '--short', '-q', 'HEAD']);
  if (!br.ok) return { state: 'other-branch', branch: '(detached)', behind: 0, msg: 'checkout principal fora da develop (HEAD solto): não atualizo' };
  if (br.out !== 'develop') return { state: 'other-branch', branch: br.out, behind: 0, msg: `checkout principal em ${br.out}, não na develop: não atualizo` };
  const n = git(repo, ['rev-list', '--count', 'HEAD..origin/develop']);
  if (!n.ok) return { state: 'error', branch: 'develop', behind: 0, msg: `checkout principal: não consegui comparar com origin/develop (${n.err})` };
  const behind = Number(n.out);
  if (!behind) return { state: 'ok', branch: 'develop', behind: 0, msg: '' };
  const dirty = git(repo, ['status', '--porcelain', '-uno']);
  if (!dirty.ok || dirty.out) return { state: 'dirty', branch: 'develop', behind, msg: `checkout principal atrás da develop (${behind} commits) com mudanças locais: não atualizo` };
  return { state: 'behind', branch: 'develop', behind, msg: `checkout principal atrás da develop (${behind} commits)` };
}

export function followDevelop(repo) {
  const s = checkoutState(repo);
  if (s.state !== 'behind') return s;
  const m = git(repo, ['merge', '--ff-only', '-q', 'origin/develop']);
  if (!m.ok) return { ...s, state: 'error', msg: `checkout principal: ff-only recusado (${m.err})` };
  return { ...s, state: 'ok', moved: true, msg: `checkout principal avançou ${s.behind} commits até origin/develop` };
}
