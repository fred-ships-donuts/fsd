# fsd init

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines (body, without this header block)
- Source: docs/spec/product/craving.md#expected-result — the goal the CLI serves

## Behavior

### 5.1 `fsd init`

- Não aceita argumentos. Qualquer argumento é erro de uso (exit 1).
- Em terminal com TTY, abre o assistente (seção 6).
- Sem TTY (CI, pipe), não abre nada: `fsd init requires an interactive terminal` e exit 1. TTY é um terminal interativo, com teclado e tela; o menu não funciona sem ele.
- Antes de abrir o menu, aplica o auto-update da CLI se estiver ligado (7).

## Inputs

None

## Outputs and messages

None

## Edge cases

None

## Acceptance

None — the criteria stay in SPEC §12 until #56.
