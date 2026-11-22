# Evals por papel (F4.9)

Cada comportamento de um papel do time nativo (estudo §4.1) tem pelo menos um cenário fixo. O executor `team/bin/fsd-eval`:
1. monta a situação num estado de teste: o card, o aceite do issue e as mensagens na caixa;
2. sobe a sessão do papel pelo `fsd-session`, com o cartão da tarefa;
3. coleta a transcrição, a entrega e as mensagens;
4. julga o resultado.

## Arquivos

| Arquivo | O que é |
|---|---|
| `catalog.json` | Os comportamentos, por papel (`comum` vale para todos), e os cenários que cobrem cada um. Para a revisão do autor |
| `<pasta>/<id>.json` | Um cenário: `setup` (tarefa, issue, mensagens, prompt), `expect` (o que deve e o que não pode acontecer) e `play` |

## GitHub falso

O executor monta um GitHub em JSON (`team/setup/fake-gh`, pelo `FSD_GH`) com o issue do cenário (`setup.issue`, com `labels`) e os PRs
(`setup.prs`), e o quadro num JSON (`FSD_BOARD_FAKE`). Assim os comandos de verdade rodam (`fsd-arq publish --entrega`, `fsd-issue
triage --entrega`, `fsd-qa prep`); as escritas seguem só impressas (`FSD_DRY`). Nenhuma eval toca o GitHub, nem no modo `--real`.

## O que o executor confere

- **Entrega:** a entrega válida do tipo esperado para o card, gravada pelo `fsd-entrega`; ou nenhuma (`noDelivery`), quando o certo era
  perguntar antes.
- **Comandos:** os que tinham de aparecer (`commands.must`) e os que não podem (`commands.mustNot`).
- **Ferramentas:** as obrigatórias (`tools.must`) e o limite de cada uma (`tools.max`), por exemplo até 4 subagentes.
- **Mensagens:** as que saíram pelo `fsd-diga`/`fsd-duvida` e para quem (`messages`).
- **Auditoria** (`fsd-audit`): os desvios encontrados têm de ser exatamente os de `expect.audit`; por padrão, nenhum.

## Modos

- **Sem token (padrão):** o `stub-claude` executa o `play`, o roteiro de ouro, e grava a transcrição no formato do Claude Code. Isso
  prova o executor e os cenários, não o modelo. Roda no `npm test` (`team/bin/fsd-eval.test.mjs`), que também confere que um roteiro
  ruim é reprovado com o motivo.
- **`--real` (M, gasta cota):** a sessão de verdade do papel, no ambiente isolado da E2 (`FSD_SESSION_VIA=sudo`). O `play` é ignorado.

## Nota

`fsd-eval run [<papel>|<arquivo.json>…]` mostra cada cenário e a nota por papel, e sai com 0 só se todo papel chegar a
`catalog.json → minRatio` (80%, D13). `fsd-eval catalog` lista os comportamentos e marca os que ainda não têm cenário.

Os comportamentos do juiz são cobertos pelas fixtures em `team/docs/judge-fixtures/`.
