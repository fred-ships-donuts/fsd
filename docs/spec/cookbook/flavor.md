# Recipes in nook/cookbook/

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines (body, without this header block)
- Source: docs/spec/product/craving.md#expected-result — the goal the CLI serves; the user declares workflows the agent follows

## Behavior

Decisão do autor (PM, 2026-11-15). Só no escopo de projeto (`<cwd>/nook/cookbook/`); o escopo global não tem `nook/`.

**Arquivo.** Uma Recipe é `nook/cookbook/<name>.md`. `<name>` é um slug (regra de `docs/spec/task-files/flavor.md#45-tasks-no-nook`) igual ao campo `name`. Se `name` difere do nome do arquivo, a Recipe é informada como inválida e ignorada, como um Baker (`docs/spec/bakers/flavor.md`). Quem escreve é o usuário; a CLI não cria, edita nem valida Recipes nesta versão, e nada as executa (o Oven é conceitual, #23): o agente as segue.

**Formato.** Markdown com frontmatter YAML. A ordem da lista `steps` é a ordem de execução. O corpo Markdown é opcional e livre, só para pessoas: nada o lê.

**Ordem de validação** (para as mensagens serem reproduzíveis): o YAML é lido; campos obrigatórios e tipos; `name` igual ao nome do arquivo; os Bakers dos passos, na ordem dos passos (a primeira falha é informada, com o número do passo); por fim as skills (avisos, todos).

**Baker ausente.** Um passo cujo `baker` não tem arquivo válido em `nook/bakers/` (ausente ou inválido pelas regras de `docs/spec/bakers/flavor.md`) invalida a Recipe inteira: é informada com o número do passo e o nome do Baker, e não é seguida. Um Baker nunca cita uma Recipe, então não há ciclo e nenhuma checagem de ciclo.

**Skill ausente.** Uma skill `not installed` ou `missing` é só um aviso com o comando que a instala (`fsd init`, fluxo Instalar); a Recipe continua válida. A resolução é a do Bakers flavor: `.fsd/installed.json`, primeiro o escopo de projeto, depois o global. Uma skill de um passo que o Baker não lista em `skills` é aceita: a Recipe decide.

**Dough.** A Dough não tem arquivo no projeto do usuário. `docs/FSD-DOUGH.md` guarda os princípios do próprio fsd e fica na documentação do fsd, sem ser copiado; os princípios do projeto são `nook/kitchen/rules.md` (`docs/spec/kitchen/flavor.md`).

**Instalação não cria Recipe.** `nook/cookbook/` não é criada pelo `init` (`docs/spec/state/flavor.md`, linha 37, e `docs/FSD-DIRECTORY-STRUCTURE.md`).

## Inputs

Pasta `<cwd>/nook/cookbook/`; arquivo `<name>.md` (slug). Campos, nomes exatos em minúsculas; chaves desconhecidas são ignoradas, como nos Bakers:

| Campo | Tipo | Obrigatório |
|---|---|---|
| `name` | slug, igual ao nome do arquivo sem `.md` | sim |
| `description` | uma frase, texto não vazio | sim |
| `steps` | lista ordenada, ao menos um passo | sim |
| `steps[].title` | texto não vazio | sim |
| `steps[].baker` | `name` de um Baker (slug, nunca um caminho) | sim |
| `steps[].skills` | lista de nomes de skills do catálogo | não |
| `steps[].instruction` | texto do que fazer | não |

Exemplo completo, `nook/cookbook/ship-feature.md`, com o Baker `backend-engineer` do Bakers flavor (mesmo nome, mesmas skills):

```markdown
---
name: ship-feature
description: Plan a task, build it and verify it.
steps:
  - title: Plan the task
    baker: backend-engineer
    instruction: Read the plan and propose short steps.
  - title: Verify the result
    baker: backend-engineer
    skills:
      - fsd-taste
---
Notes for people; nothing reads this body.
```

## Outputs and messages

Não existe comando, então não há código de saída. Textos (en / pt-BR), `<arquivo>` com `.md`:

- `Recipe <arquivo> is invalid: <reason>` / `Recipe <arquivo> é inválida: <motivo>`
- `<reason>`: `name "<x>" differs from the file name` / `name "<x>" difere do nome do arquivo`; `missing field <campo>` / `falta o campo <campo>`; `field <campo> has the wrong type` / `o campo <campo> tem o tipo errado`; `invalid file name` / `nome de arquivo inválido`; `invalid YAML: <parser>` / `YAML inválido: <parser>`; `step <n>: Baker <baker> not found or invalid` / `passo <n>: Baker <baker> ausente ou inválido`.
- `Recipe <name>: skill <skill> is not installed (run fsd init, Install flow)` / `Recipe <name>: a skill <skill> não está instalada (rode fsd init, fluxo Instalar)`

## Edge cases

- `steps` vazio ou ausente: inválida (`field steps has the wrong type` / `missing field steps`).
- Títulos de passo repetidos: permitidos; a ordem é a identidade.
- Passo sem `skills`: válido.
- Passo sem `title` ou sem `baker`: inválida, com o campo (`missing field steps[<n>].baker`).
- Nome com maiúscula ou fora do slug: inválida (`invalid file name`).
- Arquivo que não termina em `.md`, e subpastas: ignorados.
- Skill `outdated`: resolvida sem aviso.

## Acceptance

### A1 Uma Recipe válida é aceita

Criar o Baker `backend-engineer` do Bakers flavor e `nook/cookbook/ship-feature.md` com o exemplo, com as skills instaladas: nenhum erro e nenhum aviso.

### A2 `name` diferente do nome do arquivo invalida a Recipe

Trocar `name` para `ship` no arquivo `ship-feature.md`: sai `Recipe ship-feature.md is invalid: name "ship" differs from the file name` e a Recipe é ignorada.

### A3 `steps` vazio ou ausente invalida a Recipe

Remover `steps`: sai `Recipe ship-feature.md is invalid: missing field steps`. Com `steps: []`, sai `field steps has the wrong type`.

### A4 Um passo com Baker inexistente invalida a Recipe inteira

Trocar o `baker` do passo 2 para `nobody`: sai `Recipe ship-feature.md is invalid: step 2: Baker nobody not found or invalid` e nada é seguido.

### A5 Um Baker que existe mas é inválido tem o mesmo resultado

Trocar o `name` de `backend-engineer.md` para `backend`: o passo 1 informa `step 1: Baker backend-engineer not found or invalid`.

### A6 Uma skill não instalada é só aviso

Tirar `fsd-taste` do `installed.json`: sai `Recipe ship-feature: skill fsd-taste is not installed (run fsd init, Install flow)` e a Recipe continua válida.

### A7 O fluxo Instalar não cria `nook/cookbook/`

Confirmar o fluxo Instalar em um projeto vazio e rodar `ls -A nook`: lista `kitchen` e `bakers`, e não `cookbook`.
