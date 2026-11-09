---
name: fsd-nook-tasks
description: >
  **WORKFLOW SKILL** — Trabalha as tasks do `nook/` de um projeto (bench, rack, fridge) pelos comandos
  `fsd task`: encontra as tasks, lê o `plan.md`, propõe os passos, cria cada um e leva cada passo por
  start e done, para os arquivos de status ficarem coerentes. Nunca edita um `status` nem move uma pasta
  à mão, e nunca arquiva.
  USE FOR: o usuário pede uma task, ou pede para continuar, planejar ou concluir uma; o projeto tem uma pasta
  `nook/bench/` com tasks.
  DO NOT USE FOR: criar a task em si (isso é `fsd task new`, rodado pelo usuário); arquivar uma task; editar
  arquivos da task à mão; qualquer coisa fora do escopo de projeto.
  Triggers: "task", "tasks", "trabalhar na task", "próximo passo da task", "planejar a task", "concluir a task",
  "nook/bench", "bench".
license: UNLICENSED
metadata:
  author: Frederico Jacobi
  version: "1.0.0-alpha.1"
---

# fsd-nook-tasks — trabalhar as tasks do `nook/` com `fsd task`

A CLI é dona dos arquivos da task: ela muda o `plan.md`, os arquivos de passo e a pasta juntos. Esta skill só a chama.

## Fluxo

1. **Onde.** Rode todo comando na raiz do projeto: o diretório atual decide o projeto, e o fsd nunca procura para
   cima. Tasks existem só no escopo de projeto.
2. **Achar as tasks.** Rode `fsd task list --json` e leia o resultado (`schema: 1`, `tasks[]` com `slug`, `status`,
   `dir`, `steps` e, quando algo está errado, `invalid`). Nunca leia as colunas do texto. Uma task com `invalid` é
   relatada ao usuário com o motivo; não mexa nela.
3. **Erros.** Todo erro do `fsd task` termina com o comando que o resolve, entre parênteses: `(run: …)`. Rode-o e
   repita o comando que falhou. `<file> changed while writing, try again`, `another fsd run is in progress` e
   `… is in use by another program` querem dizer: rode o mesmo comando de novo (o segundo, quando a outra execução
   terminar).
4. **Repita sem medo.** Os comandos são idempotentes (`step <NN> already <status>`, `task <t> already done`, exit
   0); depois de um timeout ou de uma dúvida, rode o comando de novo.
5. **Planejar.** Leia `nook/bench/<slug>/plan.md`, proponha os passos ao usuário e, com o combinado, crie cada um
   com `fsd task step add <task> "<title>" [--description <text>]`. Um título que começa com `-` vai depois de `--`:
   `fsd task step add <task> -- "-x"`.
6. **Trabalhar.** Rode `fsd task step start <task> <n>` antes de cada passo e `fsd task step done <task> <n>` depois.
   Use `fsd task step skip <task> <n>` quando um passo deixou de fazer sentido (conta como fechado). `<n>` é `1` ou
   `01`.
7. **Concluir.** Peça a confirmação do usuário **antes** de `fsd task done <task>`; confirmado, rode-o.
   **Nunca rode `fsd task archive`**: só o usuário arquiva.

## Nunca

- Editar o `status` do `plan.md` ou de um arquivo de passo, nem mover pastas de task à mão: a CLI muda os dois juntos.
- Ler o texto de `fsd task list` em vez do `--json`.
- Rodar `fsd task archive`.
