# Casos do histórico para o despachador (F1.9)

Casos de teste tirados do que o time já viveu: as ações do vigia, as mudanças de coluna do quadro e os avisos. Servem a dois
momentos:

- **Hoje:** `team/bin/dispatch-fixtures.test.mjs` (no `npm test`) reproduz os casos que já têm uma função pura
  (`cardColumn`, `ownersOf`, `uiDialog`, `resetTime`, `shouldAlert`, `contextAction`, `over`, `findStalls`, `findPause`,
  `findOldNotices`) e confere a cobertura do catálogo.
- **F3.6:** o `decide()` do `fsd-dispatch` reproduz todos os casos. Cada gatilho gravado tem de gerar a ação equivalente à
  do vigia, ou a divergência fica explicada.

## Arquivos

| Arquivo | O que tem |
|---|---|
| `triggers.json` | O catálogo: cada gatilho conhecido (`id`, área, gatilho, ação, onde está no código) |
| `watch.json` | O vigia (`classify()`/`act()` do `fsd-watch`): sessão, painel, contexto, PAUSE, cooldown |
| `loops.json` | Os laços: uso da conta, limpeza, revive e os achados do `fsd-progress` |
| `columns.json` | A coluna de um card com PR (`cardColumn`) |
| `notices.json` | Os avisos: dono da fila, pedido ao autor, alerta |
| `decide-replay.json` | F3.6: cada gatilho reproduzido no `decide()` (22, executados no teste) ou com a divergência explicada (17: substituído, fim do dia, lease ou permanece no laço) |
| `board-history.json` | As transições reais do quadro (299 eventos, 49 tipos), com as divergências explicadas |
| `collect-board-history.mjs` | Regera o `board-history.json` pelo GitHub, só leitura, sem perder as divergências |

## Forma de um caso

```json
{ "id": "c-changes", "trigger": "C.changes", "evidence": [{ "source": "github board #193", "at": "…", "line": "…" }],
  "input": { … }, "expect": { … }, "replay": "cardColumn" }
```

- **`evidence`:** de onde o caso veio (linha do `watch.log`, issue, transição do quadro). Fica vazio quando o gatilho existe no
  código e nunca apareceu no histórico gravado.
- **`replay`:** `null` quando nenhuma função pura reproduz o caso hoje. Os casos do painel do vigia leem o tmux, então só o
  `decide()` vai reproduzi-los.

## O que o teste exige

- Todo gatilho do catálogo tem pelo menos um caso.
- Todo estado do `classify()` e toda ação do `act()` do `fsd-watch` estão no catálogo. Um estado novo no vigia sem caso falha o
  `npm test`.
- Toda transição real do quadro está em `TRANSITIONS` (`fsd-stages.mjs`) ou tem uma divergência com categoria:
  - `legado`: o fluxo ou as colunas antigas;
  - `manual`: decisão do Kevin, da Mel ou do autor;
  - `cardColumn`: uma regra automática;
  - `fsd-issue`: entrada direta numa fila;
  - `anomalia`: comportamento errado registrado.

## Fontes

O `watch.log` do host tem só o começo (2026-11-09): o resto do histórico do vigia não foi guardado. Os casos de 2026-11-16 vêm
das issues de incidente:
- #188: PR sem checks;
- #193: uso e contexto;
- #197: revive;
- #212: vigias de teste;
- #214: endpoint de uso.

As colunas vêm do próprio GitHub (`ProjectV2ItemStatusChangedEvent`).
