# Baker definitions in nook/bakers/

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines (body, without this header block)
- Source: docs/spec/product/craving.md#expected-result — the goal the CLI serves; the user defines who does the work

## Behavior

Decisão do autor (PM, 2026-11-15). Só no escopo de projeto (`<cwd>/nook/bakers/`); o escopo global não tem `nook/`.

**Arquivo.** Um Baker é `nook/bakers/<name>.md`. `<name>` é um slug (regra de `docs/spec/task-files/flavor.md#45-tasks-no-nook`) e é o id que uma Recipe (#21) usa. Quem escreve é o usuário; a CLI não cria, edita nem valida esses arquivos nesta versão, e nada executa um Baker.

**Formato.** Markdown com frontmatter YAML. O corpo Markdown é opcional e livre, só para pessoas: nada o lê.

**Baker inválido.** É informado com o motivo e ignorado por inteiro (nunca usado em parte) quando: o YAML não é lido; falta um campo obrigatório ou ele tem o tipo errado; o nome do arquivo não é um slug válido (maiúsculas incluídas); `name` difere do nome do arquivo sem `.md`. Essa última regra é o que garante que o `name` é único.

**Resolução das skills.** Cada nome em `skills` é procurado em `.fsd/installed.json`, que é a fonte da verdade (`docs/spec/state/flavor.md#43-registro-installedjson`), primeiro no escopo de projeto e depois no global. Nunca se varre `.fsd/skills/` (isso corrige o texto do issue #22, que citava essa pasta). Usam-se os estados de `docs/spec/state/flavor.md#44-estado-de-uma-skill`. Uma skill `not installed` ou `missing` não invalida o Baker: é informada como não instalada, com o comando que resolve (`fsd init`, fluxo Instalar). `installed.json` ausente ou ilegível: toda skill é `not installed`.

**Instalação não cria Baker.** `nook/bakers/` continua vazio (`docs/spec/state/flavor.md`, linhas 35 e 37, e A6 12.20).

## Inputs

Pasta `<cwd>/nook/bakers/`; nome do arquivo `<name>.md` (slug). Campos do frontmatter, nomes exatos em minúsculas:

| Campo | Tipo | Obrigatório |
|---|---|---|
| `name` | texto não vazio, igual ao nome do arquivo sem `.md` | sim |
| `responsibilities` | lista de textos curtos não vazios, ao menos um | sim |
| `craft` | texto curto não vazio, só descritivo (metadado) | sim |
| `skills` | lista de nomes de skills do catálogo; ausente = nenhuma | não |

Exemplo completo, `nook/bakers/backend-engineer.md` (a Recipe do #21 reusa este Baker):

```markdown
---
name: backend-engineer
responsibilities:
  - Implement the steps of a task in the backend code
  - Keep each step small and checked before it is closed
craft: Node and TypeScript services, careful with errors and exit codes
skills:
  - fsd-nook-tasks
  - fsd-step
---
Notes for people; nothing reads this body.
```

## Outputs and messages

Não existe comando, então não há código de saída. Textos (en / pt-BR), `<arquivo>` é o nome com `.md`:

- `Baker <arquivo> is invalid: <reason>` / `Baker <arquivo> é inválido: <motivo>`
- `<reason>`: `name "<x>" differs from the file name` / `name "<x>" difere do nome do arquivo`; `missing field <campo>` / `falta o campo <campo>`; `field <campo> has the wrong type` / `o campo <campo> tem o tipo errado`; `invalid file name` / `nome de arquivo inválido`; `invalid YAML: <parser>` / `YAML inválido: <parser>`.
- `Baker <name>: skill <skill> is not installed (run fsd init, Install flow)` / `Baker <name>: a skill <skill> não está instalada (rode fsd init, fluxo Instalar)`

## Edge cases

- Chave desconhecida no frontmatter: ignorada, sem erro (compatível com o futuro).
- `Backend.md`, ou qualquer nome com maiúscula ou fora do slug: inválido, também em sistemas de arquivos que não distinguem caixa.
- Arquivo que não termina em `.md`, e subpastas: ignorados.
- `responsibilities` vazia, ou com item vazio: inválido (`field responsibilities has the wrong type`).
- Skill em `skills` com estado `outdated`: resolvida normalmente, sem aviso.
- Duas skills iguais na lista: aceitas, sem erro.

## Acceptance

### A1 Um Baker válido é aceito

Criar `nook/bakers/backend-engineer.md` com o exemplo acima e as duas skills instaladas: nenhum erro, nenhuma nota de skill.

### A2 `name` diferente do nome do arquivo invalida o Baker

Trocar `name` para `backend` no arquivo `backend-engineer.md`: sai `Baker backend-engineer.md is invalid: name "backend" differs from the file name` e o Baker é ignorado.

### A3 Campo obrigatório ausente invalida o Baker

Remover `craft`: sai `Baker backend-engineer.md is invalid: missing field craft`.

### A4 Uma skill instalada é resolvida

Com `fsd-step` em `.fsd/installed.json` (projeto ou global), ela é resolvida sem nota.

### A5 Skill fora do `installed.json` não invalida o Baker

Remover `fsd-step` do registro: o Baker continua válido e sai `Baker backend-engineer: skill fsd-step is not installed (run fsd init, Install flow)`.

### A6 O fluxo Instalar não cria Baker

Confirmar o fluxo Instalar em um projeto vazio e rodar `ls -A nook/bakers`: não lista nada.
