// fsd-conflict.mjs — regra do conflito com a develop (#154): o PR do desenvolvedor só está pronto quando abre sem conflito, e revisão e QA
// não gastam rodada em PR em conflito. Funções puras, sem git nem gh.
//   conflictFiles(saída)      saída de `git merge-tree --write-tree --name-only <develop> HEAD` → arquivos em conflito
//   refuseConflicting(pr, o)  pr = { number, mergeable } → mensagem de recusa ou '' (mergeable UNKNOWN não recusa: ainda calculando)
export function conflictFiles(out) {
  // 1ª linha: a árvore resultante; depois um nome por linha; uma linha em branco; depois as mensagens do merge.
  const lines = String(out ?? '').split('\n').slice(1);
  const end = lines.findIndex((l) => l === '');
  return [...new Set((end < 0 ? lines : lines.slice(0, end)).filter(Boolean))];
}

export function refuseConflicting(pr, who) {
  if (pr.mergeable !== 'CONFLICTING') return '';
  return `#${pr.number} está em conflito com a develop: ${who} não começa nem publica nada. O card volta para a fila do desenvolvedor ("PR em conflito", fsd-dev sync -C <worktree>); espere o commit novo.`;
}
