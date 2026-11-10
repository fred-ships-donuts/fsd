# Tasks in nook/

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines (body, without this header block)
- Source: docs/spec/product/craving.md#expected-result — the goal the CLI serves

## Behavior

### 4.5 Tasks no `nook/`

Uma task é uma **pasta** com um plano em Markdown e passos curtos em YAML. Tasks existem só no escopo de projeto (`<cwd>/nook/`); o escopo global não tem tasks. Quem executa o trabalho é o agente (Claude Code), guiado pela skill `fsd-nook-tasks` (3); a CLI só cria, lê, muda o status e move os arquivos.

```text
nook/bench/login-oauth/
  plan.md            # spec e plano da task; status da task no frontmatter
  01-schema.yaml     # passo curto, com status próprio
  02-endpoint.yaml
```

**Título.** Todo caractere de controle (C0, `\x00`–`\x1f`, inclusive `\t`, `\r` e `\n`, e o DEL `\x7f`) no título de uma task ou de um passo vira espaço, os espaços repetidos viram um só e as pontas são aparadas, antes do slug e da gravação (`normalizeTitle` em `core/slug.ts`, usada por `task new` e `task step add`). Assim, o `# <título>` do `plan.md` fica numa linha só, e nenhuma sequência de terminal chega aos arquivos. Na leitura, um `title` escrito à mão como número ou booleano (`title: 2026`) vale como texto e não é regravado.

**Nome vindo do argumento.** O `<task>` dos comandos é entrada não confiável (vem do agente). O `core/` só aceita um nome que seja um slug válido (`isSlug`: `^[a-z0-9]+(-[a-z0-9]+)*$`, até 60 caracteres); qualquer outro valor, como `../x`, `a/b` ou `.`, nunca vira caminho e é tratado como task inexistente (`task <x> not found`). Isso vale para todo chamador (`readTask`, `locateTask`, `findTask`), não só para `commands/`.

**Nome (slug).** A pasta tem o nome do slug do título: letras sem decomposição trocadas por um mapa pequeno (`ß→ss`, `æ→ae`, `ø→o`, `ł→l`, `đ→d`, `œ→oe`, `þ→th`, e as maiúsculas correspondentes), `normalize('NFD')`, marcas (`\p{M}`) removidas, minúsculas, qualquer sequência fora de `[a-z0-9]` vira um `-`, sem `-` nas pontas, e no máximo 60 caracteres (cortado no último `-` antes do limite, por causa dos caminhos longos no Windows). `"Straße"` vira `strasse`. Um slug que é nome reservado do Windows (`con`, `nul`, `aux`, `prn`, `com1`…`com9`, `lpt1`…`lpt9`) é erro. `"Login OAuth"` vira `login-oauth`. O slug é único em todo o `nook/`: se já existe em `bench/`, `rack/` ou `fridge/`, é erro, e a mensagem mostra o slug, porque títulos diferentes podem gerar o mesmo slug. Um título que gera slug vazio (por exemplo, todo em escrita não latina) é erro, e a mensagem sugere um título com letras latinas.

**`plan.md`.** Frontmatter YAML seguido do corpo livre (spec e plano):

```markdown
---
title: Login OAuth
status: in_progress
createdAt: 2026-11-07T12:00:00.000Z
updatedAt: 2026-11-07T12:00:00.000Z
---

# Login OAuth
```

| `status` da task | Pasta |
|---|---|
| `in_progress` | `nook/bench/<slug>/` |
| `done` | `nook/rack/<slug>/` |
| `archived` | `nook/fridge/<slug>/` |

A pasta e o `status` sempre combinam, e a CLI muda os dois juntos (5.5). Uma task cuja pasta não bate com o `status` aparece como `invalid` no `fsd task list`.

**Passo `NN-<slug>.yaml`.** `NN` tem pelo menos dois dígitos e é sequencial a partir de `01` (o próximo é o maior existente mais um; números vagos não são reaproveitados; depois do `99` vem `100`). Os passos são ordenados pelo número, não pelo nome. O `<slug>` vem do título do passo, pela regra acima. Só contam como passo os arquivos que casam com `^\d{2,}-[a-z0-9-]+\.yaml$`; os demais arquivos da pasta (anotações, `foo.yaml`, `1-x.yaml`, temporários) são ignorados. Dois arquivos com o mesmo número (`01-a.yaml` e `01-b.yaml`, ou `01-a.yaml` e `001-b.yaml`) deixam a task `invalid` (`step number 01 is used by more than one file`), e um passo de número zero (`00-x.yaml`) também (`step numbers start at 01`). Um `plan.md` ou passo que seja link simbólico deixa a task `invalid` (`<arquivo>: is a symbolic link`, no formato `<arquivo>: <motivo>` dos demais): a gravação troca o arquivo por um novo e transformaria o link num arquivo comum. Ao regravar, o arquivo novo recebe a permissão (modo) do original. Em `bench/`, `rack/` e `fridge/`, contam como task: toda pasta (uma pasta com nome que não é slug fica `invalid`), toda pasta que é link simbólico (`invalid`, `<slug>: is a symbolic link`) e todo arquivo comum **cujo nome é um slug** (`invalid`, `<slug>: is not a folder`). Essas entradas aparecem no `list`, não são lidas e, quando o nome é um slug, fazem o `task new` recusar o nome (`already exists`). Um arquivo solto cujo nome não é slug (`README.md`, `notas.txt`) é ignorado, como os arquivos soltos dentro da pasta da task.

```yaml
title: Criar o schema
status: pending
description: |
  Tabela users_oauth com provider, subject e user_id.
updatedAt: 2026-11-07T12:00:00.000Z
```

`status` do passo: `pending`, `in_progress`, `done` ou `skipped` (o passo deixou de fazer sentido; conta como fechado para o `task done`). `description` é opcional. `title` é texto não vazio e `status` precisa ser um desses valores; um campo obrigatório faltando ou fora do tipo deixa a task `invalid`, com o motivo. Um passo ilegível invalida a task inteira: `task done` sai com `task <task> is invalid: <motivo>`, não com `open steps`.

**Preservação.** A CLI só lê e grava os campos acima, e só grava quando algo mudou. Os demais campos e os comentários do YAML são preservados (o conteúdo, não necessariamente a formatação byte a byte dos nós não tocados). No `plan.md`, o parse é só do bloco entre os `---`, e o corpo fica com os bytes exatos (inclusive CRLF). O YAML é 1.2 core: `createdAt` sem aspas continua texto, e um título `no` não vira booleano. Linhas longas não são dobradas. O frontmatter é o bloco no início do arquivo entre duas linhas `---` (com BOM e CRLF aceitos); sem ele, a task é `invalid`. Ao regravar, o fim de linha do arquivo (LF ou CRLF) é mantido, e mudar um valor mantém o comentário da mesma linha (`status: pending # nota`). Frontmatter ou YAML ilegível (inclusive um bloco que não é um mapa): a task aparece como `invalid` no `list`, e os comandos que a alteram saem com exit 1, sem mexer em nada.

**Edição concorrente.** O usuário e o agente podem editar o mesmo arquivo. Antes de renomear o temporário por cima, a CLI relê o arquivo e compara com o que leu no começo. Se mudou, refaz a leitura e a mudança uma vez; se mudou de novo, sai com `<arquivo> changed while writing, try again` (exit 1, com o caminho relativo do arquivo). Os temporários ficam na mesma pasta com nome oculto (`.plan.md.<pid>.tmp`), e a listagem e a leitura dos passos ignoram arquivos que começam com `.`.

**Ciclo.** `bench` (`in_progress`) → `fsd task done` → `rack` (`done`) → `fsd task archive` → `fridge` (`archived`). Não há volta nesta versão. Os passos só mudam enquanto a task está no `bench`.

**Diretórios e raiz do projeto.** O `cwd` decide o projeto, e a CLI não procura diretórios acima (4.2). Para um agente não criar `src/nook/` sem querer, `fsd task new` exige que o `cwd` já tenha `nook/` ou `.fsd/`; sem nenhum dos dois, sai `no nook/ or .fsd/ here: run from the project root` (exit 1). Os demais comandos de task exigem `nook/` (sem ele, o mesmo erro; o `list` sem `nook/` sai vazio, com exit 0). `fsd task new` cria `nook/bench/` se faltar, e `done` e `archive` criam `nook/rack/` e `nook/fridge/`. Nenhum comando de task cria a estrutura base (4.2). O único efeito em `.fsd/` é o diário de `done`/`archive` (6.9), que cria `.fsd/cache/` se faltar.

## Inputs

None

## Outputs and messages

None

## Edge cases

None

## Acceptance

None — the criteria stay in SPEC §12 until #56.
