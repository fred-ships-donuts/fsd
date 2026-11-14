---
name: fsd-dev-entrega
description: Levar um issue do fsd da passagem do Arquiteto até o PR mesclado. Use ao começar um issue, abrir o PR, corrigir uma revisão ou mesclar.
---

# Do issue ao merge (em inglês no GitHub)
1. `fsd-dev start <n>`: card → Developing, cria o worktree `feature/<n>-<slug>` a partir da develop (`--fix` para correção) e mostra o issue com a passagem. Lacuna na passagem? Pergunte ao Mel no issue antes de codar.
2. Trabalhe só dentro do worktree que ele mostrou. Implemente só o escopo; `npm run build` sem erros.
3. Verifique à mão cada item de "Acceptance" rodando o fsd de verdade. Depois, o commit.
4. `fsd-pr open "<tipo>: <title>" -C <worktree> --verified - <<'X'` + o que rodou e o que saiu + `X` (desvio da SPEC: `--dev "<texto>"`). Ele faz o push, abre o PR, move o card e avisa os revisores.
5. Pedido de mudança: `fsd-review read <n>` mostra o que pediram. Corrija tudo e rode `fsd-pr open -C <worktree> --reply - <<'X'` + a resposta a cada ponto + `X` (push, responde, avisa; acrescente `--verified <arquivo>` só se rodou algo novo).
6. Só com conflito (nunca para deixar a branch em dia): `fsd-dev sync -C <worktree>` (traz a develop por merge) e `fsd-pr open -C <worktree> --reply -` explicando.
7. Com 2 aprovações: `fsd-merge <n>`.
8. Toda entrega (PR aberto, rodada de correções, merge) termina em `fsd-restart`, mesmo que agora só falte esperar. A sessão nova vê a fila; sem trabalho, avisa o Kevin (`fsd-notify kevin "parado: …"`) e arma o `Monitor` com `fsd-wait any`.
