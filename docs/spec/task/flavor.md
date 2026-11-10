# fsd task

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines (body, without this header block)
- Source: docs/spec/product/craving.md#expected-result — the goal the CLI serves

## Behavior

### 5.5 `fsd task`

Comandos não interativos (não exigem TTY) sobre as tasks de `<cwd>/nook/` (4.5). Servem ao usuário e ao agente, que os chama pela skill `fsd-nook-tasks`. `<task>` é o slug, e `<n>` é o número do passo (`1` e `01` valem o mesmo). As mensagens saem em inglês; erro sai em stderr com exit 1 e não altera nada.

| Comando | Efeito | Saída de sucesso |
|---|---|---|
| `task new "<título>" [--json]` | Cria `nook/bench/<slug>/plan.md` com `status: in_progress`, as datas e o título como `#`. | `created nook/bench/<slug>/plan.md`; com `--json`, o objeto `{"schema": 1, "task": "<slug>", "path": "nook/bench/<slug>/plan.md"}` no lugar da linha |
| `task list [--all] [--json]` | Lista as tasks do `bench` e do `rack` (com `--all`, também do `fridge`), uma por linha, em colunas alinhadas: slug, status e passos fechados/total. A ordem é `bench`, `rack`, `fridge` e, dentro de cada um, por slug. Sem `nook/`, a lista é vazia (exit 0). | linhas `<slug>  <status>  <fechados>/<total>` |
| `task step add <task> "<título>" [--description <texto>] [--json]` | Cria o próximo `NN-<slug>.yaml` com `status: pending`. | `created nook/bench/<task>/<NN>-<slug>.yaml`; com `--json`, o objeto `{"schema": 1, "task": "<task>", "step": <n>, "path": "nook/bench/<task>/<NN>-<slug>.yaml"}` no lugar da linha |
| `task step start <task> <n>` | Passo para `in_progress`. | `step <NN> in_progress` |
| `task step done <task> <n>` | Passo para `done`. | `step <NN> done` |
| `task step skip <task> <n>` | Passo para `skipped` (fechado sem ser feito). | `step <NN> skipped` |
| `task done <task>` | Exige todos os passos fechados (`done` ou `skipped`; uma task sem passos vale). Grava `status: done` e move a pasta para `nook/rack/`. | `moved <task> to nook/rack` |
| `task archive <task>` | Só para task no `rack`. Grava `status: archived` e move para `nook/fridge/`. | `moved <task> to nook/fridge` |

**Saída para o agente (`--json`).** `task list --json` imprime em stdout um único objeto JSON, no mesmo filtro e ordem do texto:

```json
{
  "schema": 1,
  "tasks": [
    { "slug": "login-oauth", "status": "in_progress", "dir": "bench",
      "steps": { "total": 3, "done": 1, "skipped": 1, "pending": 0, "inProgress": 1 } },
    { "slug": "quebrada", "status": null, "dir": "bench", "steps": null,
      "invalid": "plan.md: frontmatter is not a map" }
  ]
}
```

`dir` é `bench`, `rack` ou `fridge`. Numa task inválida, `invalid` traz o motivo (`<arquivo>: <motivo>`). `status` sai `null` quando o `plan.md` não pôde ser lido, e `steps` sai `null` quando o `plan.md` ou algum passo não pôde ser lido (inclusive uma pasta de task que não pode ser listada). Uma task inválida só por pasta × status divergentes traz `status` e `steps` preenchidos, além de `invalid`. Sem `nook/`, sai `{"schema": 1, "tasks": []}`. Esse formato é o contrato com o agente: dentro do mesmo `schema`, só ganha campos; mudar ou tirar um campo sobe o `schema`. A saída em texto pode mudar livremente. `task new --json` e `task step add --json` imprimem, no lugar da linha `created …`, um objeto com `schema: 1`, `task` (o slug) e `path` (o mesmo texto que a linha imprime depois de `created `, relativo à raiz do projeto, com `/`); o `step add` traz também `step`, o número do passo como inteiro (`1`, não `"01"`). Valem as mesmas regras do `list`: dentro do mesmo `schema`, só ganha campos. Com `--json`, um erro continua sendo texto no `stderr`, exit 1 e `stdout` vazio. Os demais comandos de task (`step start|done|skip`, `done`, `archive`) não têm `--json` nesta versão; a skill lê o exit code e a linha de sucesso.

**Erros que dizem o próximo passo.** Todo erro de `task` termina com o comando que resolve, entre parênteses, para o agente corrigir sozinho:

| Erro (exit 1) | Fim da mensagem |
|---|---|
| `task <slug> already exists in nook/<dir>` | `(run: fsd task list --all)` |
| `title produces an empty name (use latin letters)` | (sem comando) |
| `<slug> is a reserved name` | (sem comando) |
| `no nook/ or .fsd/ here: run from the project root` | (sem comando: a mensagem já diz o que fazer) |
| `task <task> not found` | `(run: fsd task list --all)` |
| `task <task> is not in nook/bench: it is in nook/<dir>` (passos e `done`) | `(run: fsd task new "<novo título>")` quando está no `rack` ou no `fridge` |
| `task <task> is not in nook/rack: it is in nook/bench` (`archive`) | `(run: fsd task done <task>)` |
| `step <n> not found in task <task>` | `(run: fsd task list)` |
| `invalid step number <n>: use a whole number from 1` | (sem comando) |
| `task <task> has open steps: 01, 03` (`done`) | `(run: fsd task step done <task> 01)`, com o primeiro passo aberto |
| `task <task> is invalid: <motivo>` | `(fix <arquivo> and run again)` |
| `<arquivo> changed while writing, try again` | (sem comando: repetir o mesmo) |
| `another fsd run is in progress` | (sem comando: repetir quando terminar) |
| `task <task> is in use by another program, close it and try again` | (sem comando) |

Repetir um comando não é erro, porque o agente às vezes repete um comando depois de um timeout. Mudar o status de um passo que já tem esse status sai `step <NN> already <status>` com exit 0 e nada é gravado. `task done` numa task que já está no `rack` com `status: done` sai `task <task> already done` com exit 0, e `task archive` numa task que já está no `fridge` com `status: archived` sai `task <task> already archived` com exit 0; nada é gravado e o motor nem roda. Continuam erro o estado incoerente (pasta × status, que é `invalid`) e o `archive` de uma task que ainda está no `bench`. `<n>` é um número inteiro ≥ 1, comparado pelo valor (`1` = `01`). Um título que começa com `-` vai depois de `--` (`fsd task new -- "-x"`). `fsd task` e `fsd task step` sem subcomando mostram a ajuda com exit 1. As opções da raiz (`-u`, `-s`, `-f`) não são lidas dentro de `task`: `fsd task new x -f` é erro de uso do subcomando (opção desconhecida, exit 1, nada criado), nunca o `--force` da raiz. Em `new`, o `createdAt` e o `updatedAt` são o mesmo instante.

**Gravação.** Os comandos `new` e `step` gravam um único arquivo por `core/fs.ts` (`updateTextFile`, que relê e compara o conteúdo antes do rename, 4.5), sem o motor e sem diário. Antes de checar e gravar, porém, tomam a trava do projeto, `.fsd/cache/lock` (criada com `O_EXCL`, com o pid e a hora de início, e apagada no fim, também em caso de erro; 6.9): se outra execução está em andamento (a trava é de um processo vivo, ou há um `run-<id>/` vivo, por exemplo de um `task done` de outro processo), saem com `another fsd run is in progress` e exit 1, sem gravar nada. Quem segura a trava só a segura em volta da checagem e da gravação. `task done` e `task archive` mudam o `plan.md` e movem a pasta, então rodam pelo núcleo de transação do motor (6.9, 9): uma falha ou `ctrl+c` deixa a task onde estava, com o status de antes, e valem a trava e a recuperação. A checagem "passos fechados" e o snapshot do `plan.md` são refeitos na verificação, já com a trava. Como a trava é tomada antes de calcular o `NN` e de gravar, dois `task step add` **simultâneos** na mesma task não calculam o mesmo número: um grava e o outro sai com `another fsd run is in progress`; e um `step` não cai mais entre a verificação e o `commit` de um `task done`. Uma trava de um processo que morreu é retomada (relê o arquivo e só apaga se for o mesmo; a corrida residual entre a releitura e o apagar é aceita); nunca se espera pela trava. A ordem é: regravar o `plan.md` ainda na origem e só depois mover a pasta. Desfazer um movimento move de volta, e o diário é desfeito do fim para o começo. A verificação também garante que o destino (`rack/<slug>` ou `fridge/<slug>`) não existe: no Linux, renomear uma pasta sobre uma pasta vazia a substitui em silêncio. Uma task não grava nem cria o `installed.json`. Se o sistema recusar o movimento porque um programa mantém a pasta aberta (`EPERM`/`EBUSY`, comum no Windows), a task fica onde estava e sai `task <task> is in use by another program, close it and try again` (exit 1).

## Inputs

None

## Outputs and messages

None

## Edge cases

None

## Acceptance

None — the criteria stay in SPEC §12 until #56.
