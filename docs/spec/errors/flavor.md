# Errors and exit codes

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines (body, without this header block)
- Source: docs/spec/product/craving.md#expected-result — the goal the CLI serves

## Behavior

### 8.1 Erros e códigos de saída

| Situação | Mensagem | Exit |
|---|---|---|
| `fsd init` com argumentos | erro de uso do commander | 1 |
| `fsd init` sem TTY | `fsd init requires an interactive terminal` | 1 |
| Comando ou opção desconhecidos | erro do commander + `fsd --help` | 1 |
| Estado mudou depois do resumo (conflito novo) | `state changed since the summary` (nada gravado) | 1 |
| Outra execução do fsd em andamento | `another fsd run is in progress` | 1 |
| Execução anterior interrompida encontrada | `recovered an interrupted run` (aviso; segue) | — |
| Falha em uma fase | `<ação> failed and was undone (<fase>: <motivo>)`, `<ação>` = `install`, `upgrade`, `remove` ou `enable` | 1 |
| Cancelado durante as fases | `cancelled (changes undone)` | 130 |
| `fsd update skill <nome>` não instalada | `skill <nome> is not installed` | 1 |
| `fsd update skill <nome>` fora do catálogo | `skill <nome> not found in catalog` | 1 |
| `fsd update skill` ou `fsd link skill` com conflito e sem `--force` | `skill <nome>: <caminho> exists and is not managed by fsd (use --force to replace)` | 1 |
| `fsd link skill <nome>` não instalada | `skill <nome> is not installed` | 1 |
| `-f` / `--force` fora de `update skill` e `link skill`; atalhos agrupados (`-usf`) | erro de uso | 1 |
| `fsd update` sem rede | mensagem de falha da consulta ao npm | 1 |
| `fsd update` via `npx` | `nothing to update (not installed globally)` | 0 |
| Skill sem versão válida no catálogo | `skill x: missing or invalid 'metadata.version' in SKILL.md` | 1 |
| Já existe skill de mesmo nome fora do registro e o usuário não escolheu substituir | `skip <nome> (folder exists and is not managed by fsd)` | 0 |
| `installed.json` ou `config.json` ilegível | segue com os padrões / `not installed`, sem erro | 0 |
| Cancelado no assistente (`ctrl+c`) | `cancelled` | 130 |
| Falha de I/O (permissão, disco) | mensagem do Node + caminho | 1 |
| Sucesso, incluindo `skip` | — | 0 |

## Inputs

None

## Outputs and messages

None

## Edge cases

None

## Acceptance

None
