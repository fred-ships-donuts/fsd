# Phased run after confirmation

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines (body, without this header block)
- Source: docs/spec/product/craving.md#expected-result — the goal the CLI serves

## Behavior

### 6.9 Execução depois da confirmação (fases)

Ao confirmar o resumo, a CLI não sai gravando: monta um **plano** (o que fazer com cada skill, já com as escolhas de conflito) e o executa em fases, mostradas na tela com o estado de cada uma (pendente, em andamento, concluída, falhou). Vale para o fluxo Instalar e, com as mesmas fases, para o Apagar (6.8), o `update skill` (5.3) e o `link skill` (5.4).

| Fase | O que faz | Altera o que o usuário vê? |
|---|---|---|
| 1. Verificar | Só lê. Relê registro e disco (podem ter mudado desde o resumo), recalcula os conflitos e compara com as escolhas do usuário; confere permissão de escrita nos destinos e que o catálogo está válido; recupera sobras de uma execução anterior (abaixo). | Não |
| 2. Preparar | Abre o diário da execução (abaixo), cria a estrutura base que faltar (4.2) e copia cada skill para uma pasta de preparo `<destino>.fsd-new-<id>`. | Só diretórios novos e pastas de preparo |
| 3. Aplicar | Por skill: desloca o que existe (versão anterior ou original substituída) para a área de apoio, renomeia a pasta de preparo para o destino e cria o link. | Sim |
| 4. Registrar | Grava o `installed.json` de uma vez (todas as skills da execução) e, no fluxo Instalar, o `config.json`, ambos de forma atômica. É o **ponto de não retorno**. | Sim |
| 5. Concluir | Descarta a área de apoio e o diário e mostra o resultado. Uma falha aqui é só aviso: o resultado já vale. | Não |

Regras:

1. **Falha em qualquer fase 1 a 4 desfaz a execução inteira** (não só a skill que falhou): remove o que foi criado, devolve o que foi deslocado e apaga o diário. Exit 1, com a fase, a skill e o motivo. Depois da fase 4 nada é desfeito.
2. **Verificar muda o plano?** Se a releitura achar um conflito que o usuário não decidiu (algo apareceu desde o resumo), a CLI não grava nada e volta ao resumo com o aviso `state changed since the summary`. Em `update skill` e `link skill`, que não têm resumo, é erro com exit 1.
3. **Diário da execução.** Antes da primeira alteração, a CLI cria `.fsd/cache/run-<id>/` com `journal.json` (cada caminho criado e cada caminho deslocado, com o endereço do apoio) e a área de apoio onde ficam os deslocados. Cada alteração é anotada no diário *antes* de ser feita. Esse diretório é da execução: criado sob demanda (inclusive por `update skill` e `link skill`, que não criam a estrutura base) e removido na fase 5 (ou no desfazer); se não existia `.fsd/cache`, ele é removido também.
4. **Recuperação.** Na fase 1 de qualquer execução, se houver `run-<id>/` de uma execução que não está viva (o `id` guarda o pid e a hora de início), a CLI desfaz pelo diário (devolve o deslocado, remove o criado, apaga o `run-<id>/`) e avisa `recovered an interrupted run`. Antes de tudo, no escopo de projeto, a execução toma `.fsd/cache/lock` (`O_EXCL`, `{pid, startedAt}`; a mesma trava dos comandos `task new` e `task step`, 5.5) e a solta no fim, depois do desfazer ou do Concluir; com a trava de um processo vivo, termina com `another fsd run is in progress` e exit 1. Se a execução anterior ainda está viva, esta termina com `another fsd run is in progress` e exit 1; nada é alterado. A checagem de execução viva vem **antes** de qualquer recuperação: com uma viva, nem as mortas são desfeitas (o código anterior à F-38 podia desfazer as mortas e só então parar).
5. **Cancelar durante as fases.** `ctrl+c` (ou `SIGINT`/`SIGTERM`) não corta uma operação no meio: marca o cancelamento, a operação atual termina, a CLI desfaz as anteriores e sai com `cancelled (changes undone)` e exit 130. Um segundo `ctrl+c` durante o desfazer é ignorado. Depois da fase 4, o cancelamento só pula a fase 5 (a próxima execução limpa o apoio).
6. **A tela de execução** lista as fases e, na fase 3, cada skill com seu estado. A barra do rodapé não conta as fases (os passos 1 a 7 já estão concluídos). Falha mostra a fase, o motivo e `undone`.
7. **Nada fora do plano.** A execução só escreve nos caminhos do plano, no diário e no `installed.json`/`config.json`. Verificar falha se o plano apontar para fora de `<raiz>/.fsd`, `<raiz>/nook` ou `<raiz>/.claude/skills`.
8. **Ponto de injeção de falha** (seção 9): cada operação (copiar, mover, criar link, gravar registro, gravar config) passa por um conjunto de operações que os testes substituem para forçar a falha em qualquer fase.

## Inputs

None

## Outputs and messages

None

## Edge cases

None

## Acceptance

None — the criteria stay in SPEC §12 until #56.
