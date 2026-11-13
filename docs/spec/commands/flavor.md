# Commands

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines (body, without this header block)
- Source: docs/spec/product/craving.md#expected-result — the goal the CLI serves

## Behavior

Um único binário, `fsd`, implementado com `commander`.

| Chamada | Resultado |
|---|---|
| `fsd` (sem argumentos) | Mostra a ajuda e sai com 0. |
| `fsd -h`, `fsd --help` | A mesma ajuda, exit 0. |
| `fsd -v`, `fsd --version` | Imprime a versão de `package.json` e sai com 0. |
| `fsd init` | Abre o assistente (5.1). |
| `fsd update`, `fsd -u` | Atualiza a CLI (5.2). |
| `fsd update skill [nome]`, `fsd update -s [nome]`, `fsd -u -s [nome]` | Atualiza as skills instaladas (5.3). |
| `fsd update skill [nome] --force`, `fsd update skill [nome] -f`, `fsd -u -s -f [nome]` | Como a anterior, e substitui a original quando há conflito de skill de mesmo nome (5.3). |
| `fsd link skill [nome]`, `fsd link -s [nome]` | Cria o link das skills instaladas sem link (5.4). |
| `fsd link skill [nome] --force`, `fsd link skill [nome] -f`, `fsd link -s -f [nome]` | Como a anterior, e substitui a original que ocupa o lugar do link (5.4). |
| `fsd task new "<título>" [--json]`, `fsd task list [--all] [--json]`, `fsd task done <task>`, `fsd task archive <task>` | Cria, lista e move as tasks do `nook/` (5.5). |
| `fsd task step add <task> "<título>" [--description <texto>] [--json]`, `fsd task step start <task> <n>`, `fsd task step done <task> <n>`, `fsd task step skip <task> <n>` | Cria e muda o status dos passos de uma task (5.5). |
| comando ou opção desconhecidos | Mensagem de erro do commander, indicação de `fsd --help` e exit 1. |

Não existem `list`, `install` nem `uninstall` de skills: o que faziam está no assistente (6.2 e 6.8). `fsd -h` lista `init`, `update`, `update skill`, `link skill` e `task`, com os atalhos. Os atalhos `-u`, `-s` e `-f` não valem em `fsd task`.

**Atalhos `-u`, `-s` e `-f`.** `-u` (`--update`) equivale ao comando `update`, `-s` (`--skill`, com `nome` opcional) equivale a `skill`, e `-f` é a forma curta de `--force`, opção de `update skill` e `link skill`. Os atalhos são opções da raiz que o `fsd.ts` traduz para os comandos antes de despachar:

- Cada atalho tem o efeito da palavra que representa, então as formas se misturam: `fsd update skill [nome]`, `fsd update -s [nome]`, `fsd -u skill [nome]` e `fsd -u -s [nome]` fazem a mesma coisa.
- `-s` só faz sentido dentro de `update` ou `link`; `fsd -s` sozinho é erro de uso (exit 1).
- `-f` só faz sentido em `update skill` ou `link skill`; `fsd -f`, `fsd update -f` e `fsd -u -f` (sem `skill`) são erro de uso (exit 1).
- Cada atalho é um argumento **separado** e eles vêm **nessa ordem**: `-u`, depois `-s`, depois `-f` (`fsd -u -s -f [nome]`; qualquer subconjunto que faça sentido, como `fsd -u -s [nome]`). Fora de ordem (`fsd -s -u`, `fsd -f -s`) e agrupados (`-us`, `-usf`, `-sf`) são erro de uso (exit 1). Em `fsd link`, a ordem é `-s`, depois `-f`.
- Misturar atalho com outro comando (`fsd -u init`) é erro de uso (exit 1).
- O resultado, as mensagens e os exit codes são idênticos aos da forma longa.

## Inputs

None

## Outputs and messages

None

## Edge cases

None

## Acceptance

### A1 12.1 `fsd -v` e `fsd --version` imprimem a versão de `package.json` e saem com 0; `fsd`, `fsd -h` e `fsd --help` mostram a mesma ajuda e saem com 0; comando desconhecido sai com 1.
