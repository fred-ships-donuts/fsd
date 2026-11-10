# Wizard Apagar flow

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines (body, without this header block)
- Source: docs/spec/product/craving.md#expected-result — the goal the CLI serves

## Behavior

### 6.8 Fluxo Apagar

| # | Passo | Conteúdo | Observação |
|---|---|---|---|
| 1 | Escopo | Global ou local | |
| 2 | Skills | Skills que constam no `installed.json` do escopo, com versão, idioma e estado (`missing` incluído) | Lê só o registro; nada é descoberto em `.fsd/skills/`. Escolha individual ou `Selecionar todas`. |
| 3 | Resumo | Skills a apagar + confirmar | Último passo. Ao confirmar, apaga. |

- Remove a pasta registrada (campo `path`) e a entrada do registro. Skill `missing`: só limpa a entrada.
- Nunca apaga pastas que o usuário criou por outros meios; só o que está no registro.
- Se o escopo não tem nenhuma skill registrada, mostra `nothing installed` e volta ao menu.
- Não altera `config.json`.
- A remoção segue as fases de 6.9: Verificar; Preparar (diário); Aplicar (move a pasta registrada e o nosso link para a área de apoio); Registrar (tira as entradas do `installed.json`); Concluir (apaga o apoio). Falha antes de Registrar devolve tudo.

## Inputs

None

## Outputs and messages

None

## Edge cases

None

## Acceptance

None — the criteria stay in SPEC §12 until #56.
