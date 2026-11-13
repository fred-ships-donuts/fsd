# fsd-pm-issue (Kevin)

Texto proposto da skill. A cadeia está em [`CONTRIBUTING.md`](../../../CONTRIBUTING.md#11-a-cadeia-de-documentos).

## O que produz

O issue, que é o Flavor ([`flavor.md`](../../templates/flavor.md)): `## What`, `## Why`, `## Acceptance`, `## References`. Em inglês no GitHub.

## Regras

1. Todo issue leva uma label `size:S|M|L`, na criação. Sem `size:` o issue não sai do Backlog.
2. Os itens de `## Acceptance` são numerados `A1`, `A2`, … Cada um traz o comando e a linha esperada, para o Taste mapear uma linha do relatório a cada item.
3. O tamanho decide o caminho:
   - `size:L`: Craving (se for ideia solta) → Flavor → Rise + Tray → Step → Taste. O card vai para Ready for Architecture.
   - `size:M`: Flavor → passagem curta (`What to do`, `Files`, `Verification`) → Taste. O card vai para Ready for Architecture.
   - `size:S`: Flavor → Taste. Sem passagem: o card vai direto para Ready for Development.
4. Mudou o tamanho depois da passagem? Troque a label e registre com `fsd-issue decide`.
5. Respeite os limites de linhas e a regra de `Source:` de [`docs/templates/README.md`](../../templates/README.md).
