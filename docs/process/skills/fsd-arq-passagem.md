# fsd-arq-passagem (Mel)

Texto proposto da skill. A cadeia está em [`CONTRIBUTING.md`](../../../CONTRIBUTING.md#11-a-cadeia-de-documentos).

## O que consome e produz

Consome o issue (Flavor, itens `A1…`). Produz a passagem do Arquiteto, um comentário em inglês no issue, conforme o `size:`.

## size:S

Não há passagem. O issue já está em Ready for Development; não publique nada.

## size:M: passagem curta

Um comentário com três seções:

- `**What to do:**` passos numerados.
- `**Files:**` arquivos e o que muda em cada um.
- `**Verification:**` como conferir cada item de `## Acceptance`, citando `A1…`.

## size:L: TECH REVIEW + PLAN

Um comentário com dois títulos, exatamente `## TECH REVIEW` e `## PLAN`, nesta ordem.

- `## TECH REVIEW` ([`rise.md`](../../templates/rise.md)): `Feasible`, `Risks`, `Discarded alternatives`, `Open questions`.
- `## PLAN` ([`tray.md`](../../templates/tray.md)): `Delivery order`, `Files touched`, `Out of scope`. Os contratos exatos vão nas linhas de entrega do PLAN e no `Do` do TASK.

Cada documento tem `Source:` apontando para um título exato do anterior (o PLAN para o TECH REVIEW, este para o issue). Limites de linhas em [`docs/templates/README.md`](../../templates/README.md). Seção vazia se escreve `None`; nunca apague o título.

## Publicação

`fsd-arq publish` ainda confere as seis seções antigas (`What to do / Files / Contracts / Risks / Out of scope / Verification`). Até a Mel ajustar a checagem para aceitar `## TECH REVIEW` e `## PLAN` (e a passagem curta do size:M), mantenha o formato antigo. A primeira entrega nos documentos novos é a seguinte ao merge deste texto.
