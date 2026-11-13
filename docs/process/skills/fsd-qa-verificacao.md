# fsd-qa-verificacao (Bob)

Texto proposto da skill. A cadeia está em [`CONTRIBUTING.md`](../../../CONTRIBUTING.md#11-a-cadeia-de-documentos).

## O que consome e produz

Consome o issue (itens `A1…` de `## Acceptance`) e, se houver, a passagem. Produz o relatório de verificação, que é o Taste ([`taste.md`](../../templates/taste.md)), em todos os tamanhos (`size:S`, `M` e `L`). Em inglês no GitHub.

## Relatório

- `Source:` aponta para um item de aceite do issue (`A1…`), nunca um "see SPEC" genérico.
- `## Result`: `pass` ou `fail`.
- `## Checked`: uma linha por item de aceite, `A1 — pass/fail — how it was checked`, com o comando, o esperado e o obtido.
- `## Failures`: a saída exata de cada falha.
- `## Covered by code review`: o que não dá para disparar no binário real, com `file:line`.
- Seção vazia se escreve `None`. Limite de 50 linhas ([`docs/templates/README.md`](../../templates/README.md)).

O ambiente e o resultado (aprovar, pedir mudanças, abrir `bug`) seguem a seção 5 do [`CONTRIBUTING.md`](../../../CONTRIBUTING.md#5-verificação).
