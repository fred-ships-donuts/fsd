---
name: fsd-pm-issue
description: Criar e manter issues do fsd e registrar as decisões do time. Use ao criar issue ou registrar uma decisão.
---

# Issues do fsd (em inglês)
A documentação escala pelo tamanho. **S** (uma mudança pequena, um arquivo ou poucos): só `## What` e `## Acceptance`, e o issue vai direto para Ready for Development, sem passagem. **M** e **L**: o corpo completo abaixo; M recebe uma passagem curta e L a completa.

Corpo de uma task M ou L, num arquivo ou na entrada padrão:
```
## What
<one or two sentences>

## Why
<the problem it solves, with a link to the spec in docs/spec/ (SPEC §x)>

## Acceptance
1. <reproducible manual step>  →  <what must appear>

## References
- docs/spec/<area>/ (SPEC §x) · related issues
```
- Criar: `fsd-issue new "<tipo>: <title>" --area <a> --size S|M|L --milestone "<phase>" [--to "Ready for Architecture"] <arquivo|->`. Ele confere as seções, recusa duplicado provável (`--force` se não for) e põe no quadro.
- Nunca pergunte ao autor. Decidir: `fsd-issue decide <n> "<decision>"` (a decisão e o porquê, em inglês; tira a label `decision`).
- O aceite tem que ser verificável por quem não leu a conversa, um item por linha numerada.
- Labels: `area:cli|nook|process|release|ui`, `size:S|M|L`, `decision`, `bug`. Milestone = a fase. Coluna inicial: Backlog, ou `--to "Ready for Architecture"` quando já pode ir ao Mel (ela é avisada).
