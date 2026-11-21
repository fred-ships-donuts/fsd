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

## Fora desta parte

- T3.7.3: o `fsd-review post`, o `fsd-qa verdict` e o `fsd-pr open` passam a gerar o JSON do contrato.
- T3.7.6: o hook `Stop` ligado ao contrato.
