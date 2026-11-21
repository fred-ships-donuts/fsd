# Contratos de entrega (F3.7)

Cada tarefa do time termina com uma entrega em JSON, validada por `fsd-entrega <arquivo.json> [--aceite N]`. O supervisor só
avança o card com uma entrega válida gravada em `$FSD_STATE/entregas/<kind>/`. Uma entrega inválida não é gravada. O agente
recebe a lista de erros e o comando para rodar de novo. A validação não gasta token.

## Tipos

| Contrato | Papel | Tarefa do `decide()` | Rastreia o aceite |
|---|---|---|---|
| `triagem` | Kevin | Backlog | não |
| `arquitetura` | Mel | `arquitetura` (Ready for Architecture) | não; escreve o aceite numerado |
| `revisao` | Mel | `revisao` (In Review) | sim |
| `entrega-codigo` | Stuart | `entrega-codigo` e `correcao` | sim |
| `qa` | Bob | `qa` (In Review) | sim |
| `veredito` | juiz | impasse | não; é o `JUDGE_SCHEMA` do `fsd-judge.mjs` |
| `mensagem` | todos | `fsd-diga` | não |

## Regras

- **Schema:** cada `<kind>.schema.json` segue um subconjunto do JSON Schema, validado por `bin/fsd-contract.mjs` sem dependência:
  `type`, `required`, `properties`, `additionalProperties`, `enum`, `const`, `minLength`, `maxLength`, `minimum`, `pattern`,
  `items`, `minItems` e `uniqueItems`. Um campo desconhecido é erro.
- **Definition of Done:** `x-dod` lista o que é "pronto" para o tipo. A entrega traz `dod: { <item>: true }` para cada item, e
  um item faltando ou `false` invalida a entrega.
- **Rastreabilidade:** com `x-trace`, a entrega cita em `acceptance[].item` cada item numerado do aceite do card, de 1 a N
  (`--aceite N`), sem faltar nenhum e sem inventar item. Assim aceite → commit → teste → resultado de QA fica ligado.
- **Exemplos:** `examples/<kind>/` tem um `valid.json` e pelo menos dois `invalid-*.json`, no formato
  `{ "_why": "<trecho do erro esperado>", "data": {…} }`. O `bin/fsd-contract.test.mjs` confere todos.

## Nos comandos do time (T3.7.3 e T3.7.6)

Na sessão nova (`FSD_RUNNER=session`), três comandos exigem `--entrega <arquivo.json>`:

| Comando | Contrato | O que precisa bater com a entrega |
|---|---|---|
| `fsd-pr open` | `entrega-codigo` | card, branch e HEAD. O número do PR o comando preenche ao criar |
| `fsd-review post <n> approve\|changes` | `revisao` | PR, head da revisão e veredito |
| `fsd-qa finish` | `qa` | PR, head e veredito (pass/fail) |

Sem a entrega, ou com ela inválida, nada é publicado. A entrega válida fica gravada como no `fsd-entrega`.
`fsd-entrega modelo <kind>` imprime um exemplo que já valida, para usar como ponto de partida.

O hook `Stop` só deixa terminar o turno de uma tarefa com a entrega válida dela, gravada depois do início da tarefa. Ele bloqueia
no máximo 3 vezes; depois disso o turno termina e o Kevin é avisado.
