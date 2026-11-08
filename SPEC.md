# SPEC — fsd (Fred Ships Donuts CLI)

CLI para instalar, atualizar e remover as skills do Claude Code criadas por Frederico Jacobi.

## 1. Objetivo

Dado um catálogo de skills versionado neste repositório (`src/skills/`), permitir que qualquer máquina instale uma ou mais skills em `~/.fsd/skills` (global) ou `./.fsd/skills` (projeto) com um único comando, e manter um registro próprio do que foi instalado.

A CLI tem **um único binário, `fsd`**, com poucos comandos:

- `fsd init` abre o assistente interativo, onde se instala e apaga skills e se escolhe escopo, idioma, tema e atualização.
- `fsd update` atualiza a própria CLI; `fsd update skill [nome]` atualiza as skills instaladas.
- `fsd task ...` cria e acompanha as tasks do projeto em `nook/` (bench → rack → fridge, 4.5 e 5.5).
- `fsd -h`/`--help` mostra a ajuda (também mostrada quando `fsd` é chamado sem argumentos) e `fsd -v`/`--version` mostra a versão.

Instalar e apagar skills só existe dentro do assistente: não há `fsd install` nem `fsd uninstall`.

### Fora de escopo (v1)

- Criar/editar skills (o autoramento continua manual).
- Instalar skills de terceiros ou de repositórios arbitrários.
- Publicar skills em um registry próprio.

## 2. Stack

| Item | Decisão |
|---|---|
| Linguagem | TypeScript (ESM, `module: nodenext`, `strict`) |
| React com TSX | Componentes em arquivos `.tsx`; `jsx: react-jsx` no `tsconfig.json` (sem `import React` em cada arquivo); `@types/react` em dev |
| Execução em desenvolvimento | `tsx` (`npm run dev` roda `src/cli/fsd.ts` direto, sem compilar); o build de produção é `tsc` → `dist/` |
| Runtime | Node >= 22 (exigência do Ink 8) |
| Parser de CLI | `commander`: comandos `init`, `update` e `update skill`, ajuda gerada e erros de uso padronizados. A versão usa `-v` (não o `-V` padrão do commander) |
| Interface interativa | Ink 8 (React para terminal); ver apêndice A |
| Dependências de runtime | `commander`, `ink`, `react` (>= 19.3) |
| Binário | Um só: `fsd` → `dist/cli/fsd.js` |

## 3. Catálogo de skills

O catálogo fica em `src/skills/_i18n/`. Há um único formato: uma árvore completa por idioma.

```
src/skills/_i18n/<nome>/<lang>/SKILL.md   # + references/, scripts/, templates/, agents/
```

Exemplos: `_i18n/fsd-csharp-code-standard/{en,pt-BR}`, `_i18n/fsd-ui-approval/{en,pt-BR}`, `_i18n/fsd-nook-tasks/{en,pt-BR}`. A `fsd-nook-tasks` ensina o agente a trabalhar com as tasks do `nook/` (4.5): ler o `plan.md`, quebrar o plano em passos com `fsd task step add`, marcar cada passo com `start`/`done` pelos comandos (nunca editar o `status` nem mover pastas à mão), e **pedir a confirmação do usuário antes de `fsd task done`**. `archive` fica só com o usuário. Os idiomas de uma skill são as subpastas de `_i18n/<nome>/` que contêm `SKILL.md`. Diretórios soltos em `src/skills/` (fora de `_i18n/`) **não fazem parte do catálogo** e são ignorados pela CLI.

Regras:

- O identificador da skill é o nome do diretório `_i18n/<nome>`; ele deve ser igual ao `name` do frontmatter de todos os `SKILL.md` das suas variantes. A skill é instalada como `<destino>/<nome>/`, qualquer que seja o idioma escolhido.
- Todo `SKILL.md` tem frontmatter com `name`, `description` e **`metadata.version`** (semver 2.0.0, aceita pré-release: `1.0.0`, `1.0.0-alpha.2`). Skill sem `metadata.version` válido é erro de catálogo.

  ```yaml
  ---
  name: fsd-ui-approval
  description: ...
  metadata:
    author: Frederico Jacobi
    version: "1.0.0-alpha.2"
  ---
  ```
- Todas as variantes de idioma de uma skill têm o mesmo `metadata.version`.
- Skill com um único idioma é válida: a pergunta de idioma é pulada e esse idioma é instalado.
- Diretórios de `_i18n/` sem nenhuma variante com `SKILL.md` são ignorados pelo `list` e pelo `install` (e reprovados pelo teste do catálogo).
- O catálogo é lido do próprio pacote (resolvido relativo ao módulo, via `import.meta.url`), nunca do `cwd`.
- **Não são copiados** para o destino: `evals/` e `README.md` (em qualquer nível da skill). Todo o resto (`references/`, `scripts/`, `templates/`, `agents/`) é copiado como está.
- Mudar o conteúdo de uma skill **exige subir o `metadata.version`**, senão a instalação não enxerga a mudança e não faz `upgrade`.

## 4. Destinos, registro e estado

### 4.1 Destinos das skills

| Escopo | Caminho | Quando |
|---|---|---|
| Global | `~/.fsd/skills/<nome>` | escolha "Global" no passo Escopo |
| Projeto | `<cwd>/.fsd/skills/<nome>` | escolha "Local" no passo Escopo |

Para o Claude Code enxergar a skill, a CLI cria um **link simbólico** `<raiz>/.claude/skills/<nome>` → `<raiz>/.fsd/skills/<nome>` (no Windows, junction). Se já existe uma skill de mesmo nome nesse caminho (e não é um link para a nossa), é um **conflito** (regra 3 da instalação). O `Apagar` remove o link só quando ele aponta para a skill registrada. **Falhar ao criar o link falha a instalação daquela skill e desfaz tudo o que a tentativa fez** (regra 9).

`~` é o `os.homedir()` (no Windows, `%USERPROFILE%`). `<cwd>` é o diretório de onde o comando foi executado; a CLI não procura a raiz do git.

### 4.2 Estrutura de diretórios da CLI

Segue `docs/FSD-ARCHITECTURE.md`. Em cada escopo há um diretório de sistema `.fsd/` e um workspace `nook/`, na raiz do escopo. As skills ficam dentro de `.fsd/`, em `.fsd/skills/`:

| Escopo | Raiz | Conteúdo |
|---|---|---|
| Global | `~` | `~/.fsd/` e `~/nook/` |
| Projeto | `<cwd>` | `<cwd>/.fsd/` e `<cwd>/nook/` |

| Diretório | Conteúdo |
|---|---|
| `.fsd/installed.json` | skills instaladas no escopo (4.3) |
| `~/.fsd/config.json` | preferências (8.2); só no escopo global |
| `.fsd/oven/`, `.fsd/cache/`, `.fsd/logs/` | sistema interno da CLI, criados vazios |
| `nook/kitchen/`, `nook/bakers/` | workspace do usuário, criados vazios |

**Estrutura base.** Ao confirmar o resumo do fluxo Instalar (como uma instalação de software qualquer), a CLI cria, no escopo escolhido e se ainda não existirem, `nook/kitchen/`, `nook/bakers/`, `.fsd/oven/`, `.fsd/cache/` e `.fsd/logs/`. Os demais diretórios de `nook/` (`bench/`, `cookbook/`, `rack/`, `fridge/`) não são criados. Cancelar não cria nada, e o fluxo Apagar não cria nem remove a estrutura. `fsd init` ao abrir não grava nada.

Os caminhos são calculados só a partir de `os.homedir()` e do `cwd`: a CLI não procura nem lê outros diretórios para decidir onde `.fsd/` e `nook/` ficam. No escopo de projeto, `.fsd/installed.json`, `.fsd/oven/` e `nook/` são versionáveis junto com o repositório, a critério do usuário.

**`.gitignore`.** No escopo de projeto, junto com a estrutura base (ao confirmar o fluxo Instalar), a CLI garante que `<cwd>/.gitignore` tenha as linhas `.fsd/cache/` e `.fsd/logs/`: acrescenta ao fim só as que faltam (comparação por linha exata, sem interpretar padrões) e cria o arquivo se ele não existir. Nada mais do arquivo é alterado, e uma segunda instalação não muda nada. O escopo global nunca toca em `.gitignore`. A gravação entra na fase Aplicar (6.9), com backup (gravação de texto, não de JSON), e é desfeita junto com o resto. Se o arquivo não termina em quebra de linha, uma quebra vem antes das linhas acrescentadas; o fim de linha existente (LF ou CRLF) é mantido; a comparação ignora espaços nas pontas e o BOM. A verificação do plano passa a aceitar esse caminho, que fica fora de `.fsd/` e de `nook/`.

Toda gravação em `.fsd/` é atômica (escreve em arquivo temporário e renomeia).

### 4.3 Registro `installed.json`

```json
{
  "schema": 1,
  "skills": {
    "fsd-csharp-code-standard": {
      "scope": "global",
      "lang": "pt-BR",
      "version": "1.0.0-alpha.2",
      "path": "/home/fulano/.fsd/skills/fsd-csharp-code-standard",
      "installedAt": "2026-10-31T12:00:00.000Z",
      "updatedAt": "2026-10-31T12:00:00.000Z"
    }
  }
}
```

Campo opcional `"linked": false`: a skill foi instalada em `.fsd/skills/<nome>` **sem** o link em `.claude/skills/<nome>`, porque lá já existe uma original que o usuário quis manter (6.2, regra 3). Ausente equivale a `true`.

**O registro é a fonte da verdade.** A CLI sabe o que instalou e onde olhando o `installed.json`, e não procurando em `.fsd/skills/`. O estado exibido nos passos de skills, a atualização e o `Apagar` nunca varrem o diretório do Claude: leem o registro e agem no `path` gravado (absoluto, definido na instalação).

### 4.4 Estado de uma skill

O estado vem da comparação entre a versão registrada e o `metadata.version` do catálogo, pela precedência do semver 2.0.0 (seção 11 da especificação em semver.org): `1.0.0-alpha.2 < 1.0.0-alpha.10 < 1.0.0-beta < 1.0.0`. O comparador é implementado em `skills.ts`, sem dependência extra; metadados de build (`+...`) são ignorados.

| Estado | Condição |
|---|---|
| `not installed` | não consta em `installed.json` |
| `up to date` | versão registrada >= catálogo |
| `outdated` | versão registrada < catálogo |
| `missing` | consta em `installed.json` mas a pasta do `path` gravado não existe mais (foi apagada à mão) |

`missing` é resolvido por `Instalar` (reinstala e atualiza o registro) ou por `Apagar` (só limpa a entrada). Se `installed.json` estiver ausente ou ilegível, o estado de todas as skills é `not installed`; nada é descoberto nem apagado no diretório do Claude.

### 4.5 Tasks no `nook/`

Uma task é uma **pasta** com um plano em Markdown e passos curtos em YAML. Tasks existem só no escopo de projeto (`<cwd>/nook/`); o escopo global não tem tasks. Quem executa o trabalho é o agente (Claude Code), guiado pela skill `fsd-nook-tasks` (3); a CLI só cria, lê, muda o status e move os arquivos.

```text
nook/bench/login-oauth/
  plan.md            # spec e plano da task; status da task no frontmatter
  01-schema.yaml     # passo curto, com status próprio
  02-endpoint.yaml
```

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

**Passo `NN-<slug>.yaml`.** `NN` tem pelo menos dois dígitos e é sequencial a partir de `01` (o próximo é o maior existente mais um; números vagos não são reaproveitados; depois do `99` vem `100`). Os passos são ordenados pelo número, não pelo nome. O `<slug>` vem do título do passo, pela regra acima. Só contam como passo os arquivos que casam com `^\d{2,}-[a-z0-9-]+\.yaml$`; os demais arquivos da pasta (anotações, `foo.yaml`, `1-x.yaml`, temporários) são ignorados.

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

## 5. Comandos

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
| `fsd task new "<título>"`, `fsd task list [--all] [--json]`, `fsd task done <task>`, `fsd task archive <task>` | Cria, lista e move as tasks do `nook/` (5.5). |
| `fsd task step add <task> "<título>" [--description <texto>]`, `fsd task step start <task> <n>`, `fsd task step done <task> <n>`, `fsd task step skip <task> <n>` | Cria e muda o status dos passos de uma task (5.5). |
| comando ou opção desconhecidos | Mensagem de erro do commander, indicação de `fsd --help` e exit 1. |

Não existem `list`, `install` nem `uninstall` de skills: o que faziam está no assistente (6.2 e 6.8). `fsd -h` lista `init`, `update`, `update skill`, `link skill` e `task`, com os atalhos. Os atalhos `-u`, `-s` e `-f` não valem em `fsd task`.

**Atalhos `-u`, `-s` e `-f`.** `-u` (`--update`) equivale ao comando `update`, `-s` (`--skill`, com `nome` opcional) equivale a `skill`, e `-f` é a forma curta de `--force`, opção de `update skill` e `link skill`. Os atalhos são opções da raiz que o `fsd.ts` traduz para os comandos antes de despachar:

- Cada atalho tem o efeito da palavra que representa, então as formas se misturam: `fsd update skill [nome]`, `fsd update -s [nome]`, `fsd -u skill [nome]` e `fsd -u -s [nome]` fazem a mesma coisa.
- `-s` só faz sentido dentro de `update` ou `link`; `fsd -s` sozinho é erro de uso (exit 1).
- `-f` só faz sentido em `update skill` ou `link skill`; `fsd -f`, `fsd update -f` e `fsd -u -f` (sem `skill`) são erro de uso (exit 1).
- Cada atalho é um argumento **separado** e eles vêm **nessa ordem**: `-u`, depois `-s`, depois `-f` (`fsd -u -s -f [nome]`; qualquer subconjunto que faça sentido, como `fsd -u -s [nome]`). Fora de ordem (`fsd -s -u`, `fsd -f -s`) e agrupados (`-us`, `-usf`, `-sf`) são erro de uso (exit 1). Em `fsd link`, a ordem é `-s`, depois `-f`.
- Misturar atalho com outro comando (`fsd -u init`) é erro de uso (exit 1).
- O resultado, as mensagens e os exit codes são idênticos aos da forma longa.

### 5.1 `fsd init`

- Não aceita argumentos. Qualquer argumento é erro de uso (exit 1).
- Em terminal com TTY, abre o assistente (seção 6).
- Sem TTY (CI, pipe), não abre nada: `fsd init requires an interactive terminal` e exit 1. TTY é um terminal interativo, com teclado e tela; o menu não funciona sem ele.
- Antes de abrir o menu, aplica o auto-update da CLI se estiver ligado (7).

### 5.2 `fsd update`

- Atualiza a **própria CLI**, sem abrir o assistente e sem exigir TTY.
- Funciona independentemente da opção `autoUpdate` (essa opção só vale para o `fsd init`, ver 7).
- Se a CLI não estiver instalada globalmente (execução via `npx`), informa que não há o que atualizar e sai com 0 (7).
- Se a opção `updateSkills` (7, 8.2) estiver ligada, depois de atualizar a CLI atualiza também as skills, como `fsd update skill`. Como o catálogo vive dentro do pacote, essa etapa roda na **versão nova** da CLI (novo processo `fsd update skill`), nunca no processo antigo.

### 5.3 `fsd update skill [nome]`

- Sem `nome`, atualiza todas as skills instaladas; com `nome`, só aquela.
- Lê o `installed.json` do escopo global e, se existir, o do projeto (`<cwd>/.fsd/`). Age no `path` e no idioma gravados; não varre `.fsd/skills/`.
- Uma skill registrada com versão menor que a do catálogo recebe `upgrade` (mesmas regras de 6.2). Em dia vira `skip (up to date)`. `missing` é reinstalada.
- Não instala skills novas (isso é o `Instalar` do assistente).
- **Conflito.** Se, no caminho do link (`.claude/skills/<nome>`) de uma skill registrada com link, existir algo que não é o link da nossa skill, a skill está em conflito. Como o comando não é interativo, **sem `--force` a original é mantida**: a skill não é tocada, sai `skill <nome>: <caminho> exists and is not managed by fsd (use --force to replace)` e o comando termina com **exit 1** depois de processar as demais skills.
- **`--force` / `-f`.** Resolve os conflitos escolhendo **substituir**: a original é trocada pela nossa e o link é criado (tudo ou nada, 6.2 regra 9). Vale para uma skill (`fsd update skill <nome> -f`) ou para todas as que estão em conflito (`fsd update skill -f`), sem pedir confirmação; cada original substituída aparece na saída (`install <nome> ... replaced the original`). **Só resolve conflito**: não reinstala skill em dia e não tem efeito onde não há conflito.
- Skill registrada com `linked: false` (4.3) não tem conflito aqui: o `update skill` atualiza só a pasta de `.fsd/skills` e nunca mexe no link. Para ligá-la, use `fsd link skill` (5.4).

### 5.4 `fsd link skill [nome]`

- Cria o link `.claude/skills/<nome>` → `.fsd/skills/<nome>` das skills instaladas **sem link** (registradas com `linked: false`, ou com o link apagado à mão). Sem `nome`, trata todas as que estão nessa situação; com `nome`, só aquela. Lê o registro global e, se existir, o do projeto, como o `update skill`; não abre o assistente nem exige TTY.
- Se o caminho do link está livre, cria o link e grava `linked: true`. Se há uma original no lugar (conflito), **sem `--force`** nada é alterado, sai `skill <nome>: <caminho> exists and is not managed by fsd (use --force to replace)` e o exit é 1.
- Com `--force` / `-f`, a original é substituída pelo link, tudo ou nada (a original só some depois do sucesso, 6.2 regra 9), e o registro passa a `linked: true`.
- Skill já com link correto: `skip (already linked)`. `nome` não instalado: `skill <nome> is not installed`, exit 1.
- Não cria a estrutura base nem instala skills: só trabalha sobre o que o registro já tem.

### 5.5 `fsd task`

Comandos não interativos (não exigem TTY) sobre as tasks de `<cwd>/nook/` (4.5). Servem ao usuário e ao agente, que os chama pela skill `fsd-nook-tasks`. `<task>` é o slug, e `<n>` é o número do passo (`1` e `01` valem o mesmo). As mensagens saem em inglês; erro sai em stderr com exit 1 e não altera nada.

| Comando | Efeito | Saída de sucesso |
|---|---|---|
| `task new "<título>"` | Cria `nook/bench/<slug>/plan.md` com `status: in_progress`, as datas e o título como `#`. | `created nook/bench/<slug>/plan.md` |
| `task list [--all] [--json]` | Lista as tasks do `bench` e do `rack` (com `--all`, também do `fridge`), uma por linha, em colunas alinhadas: slug, status e passos fechados/total. A ordem é `bench`, `rack`, `fridge` e, dentro de cada um, por slug. Sem `nook/`, a lista é vazia (exit 0). | linhas `<slug>  <status>  <fechados>/<total>` |
| `task step add <task> "<título>" [--description <texto>]` | Cria o próximo `NN-<slug>.yaml` com `status: pending`. | `created nook/bench/<task>/<NN>-<slug>.yaml` |
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

`dir` é `bench`, `rack` ou `fridge`. Numa task inválida, `invalid` traz o motivo, e `status` e `steps` saem `null` quando não puderam ser lidos. Sem `nook/`, sai `{"schema": 1, "tasks": []}`. Esse formato é o contrato com o agente: dentro do mesmo `schema`, só ganha campos; mudar ou tirar um campo sobe o `schema`. A saída em texto pode mudar livremente. Os demais comandos de task não têm `--json` nesta versão (próximo passo: `task new` e `task step add` devolvendo o caminho criado); a skill lê o exit code e a linha de sucesso.

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
| `task <task> has open steps: 01, 03` (`done`) | `(run: fsd task step done <task> 01)`, com o primeiro passo aberto |
| `task <task> is invalid: <motivo>` | `(fix <arquivo> and run again)` |
| `<arquivo> changed while writing, try again` | (sem comando: repetir o mesmo) |
| `another fsd run is in progress` | (sem comando: repetir quando terminar) |
| `task <task> is in use by another program, close it and try again` | (sem comando) |

Repetir um comando não é erro, porque o agente às vezes repete um comando depois de um timeout. Mudar o status de um passo que já tem esse status sai `step <NN> already <status>` com exit 0 e nada é gravado. `task done` numa task que já está no `rack` com `status: done` sai `task <task> already done` com exit 0, e `task archive` numa task que já está no `fridge` com `status: archived` sai `task <task> already archived` com exit 0; nada é gravado e o motor nem roda. Continuam erro o estado incoerente (pasta × status, que é `invalid`) e o `archive` de uma task que ainda está no `bench`. `<n>` é um número inteiro ≥ 1, comparado pelo valor (`1` = `01`). Um título que começa com `-` vai depois de `--` (`fsd task new -- "-x"`). `fsd task` e `fsd task step` sem subcomando mostram a ajuda com exit 1. As opções da raiz (`-u`, `-s`, `-f`) não são lidas dentro de `task`: `fsd task new x -f` é erro de uso do subcomando (opção desconhecida, exit 1, nada criado), nunca o `--force` da raiz. Em `new`, o `createdAt` e o `updatedAt` são o mesmo instante.

**Gravação.** Os comandos `new` e `step` gravam um único arquivo por `core/fs.ts` (`updateTextFile`, que relê e compara o conteúdo antes do rename, 4.5), sem o motor e sem diário. Antes de gravar, porém, checam a trava do motor (sem criar arquivo de trava): se houver uma execução viva no escopo (por exemplo, um `task done` de outro processo), saem com `another fsd run is in progress`. `task done` e `task archive` mudam o `plan.md` e movem a pasta, então rodam pelo núcleo de transação do motor (6.9, 9): uma falha ou `ctrl+c` deixa a task onde estava, com o status de antes, e valem a trava e a recuperação. A checagem "passos fechados" e o snapshot do `plan.md` são refeitos na verificação, já com a trava. Checar a trava e depois gravar não é atômico: um `step` pode cair entre o planejamento de um `task done` e a sua verificação. Isso é aceito nesta versão porque a verificação do `done` relê os passos e o `plan.md` e para se algo mudou, o `list` ignora os temporários, e o erro sai sem stack trace. A ordem é: regravar o `plan.md` ainda na origem e só depois mover a pasta. Desfazer um movimento move de volta, e o diário é desfeito do fim para o começo. A verificação também garante que o destino (`rack/<slug>` ou `fridge/<slug>`) não existe: no Linux, renomear uma pasta sobre uma pasta vazia a substitui em silêncio. Uma task não grava nem cria o `installed.json`. Se o sistema recusar o movimento porque um programa mantém a pasta aberta (`EPERM`/`EBUSY`, comum no Windows), a task fica onde estava e sai `task <task> is in use by another program, close it and try again` (exit 1).

## 6. Assistente interativo

### 6.1 Estrutura de toda tela

```
┌─ cabeçalho ─────────────────────────────────────────────┐
│  <logotipo>                                             │
│  <nome da CLI>  v<versão>   <outros itens do cabeçalho> │
└─────────────────────────────────────────────────────────┘

  <título do passo>
  <conteúdo do passo: menu, lista, seleção ou resumo>

  [██████░░░░░░░░░░░░░░░░░░]  passo 3 de 7        <rodapé>
```

- **Cabeçalho**: na tela inicial, o emoji 🍩 em blocos de caractere e o nome `FRED` / `SHIPS` / `DONUTS` em letras de pixel, empilhados à direita da rosquinha, dentro de uma moldura que ocupa a largura da janela e no máximo 35% da altura (o conteúdo fica alinhado à esquerda). Tudo acompanha o tamanho da janela, com o 80 × 24 como tamanho de partida; as regras, os tamanhos e a origem das imagens estão em 6.10. Nos passos, o cabeçalho é uma moldura pequena (ou uma linha, em janela baixa) com o nome da CLI, a versão (a de `package.json`), o escopo e o passo atual. Sem cor, volta o logotipo de uma linha.
- **Corpo**: um passo por tela. O assistente ocupa o terminal inteiro (largura e altura, acompanhando redimensionamento) e roda na tela alternativa do terminal; ao sair, o terminal volta ao que era antes.
- **Rodapé**: barra de progresso (6.4) e a dica de teclas do passo (ex.: `↑↓ mover · espaço marcar · enter confirmar · ← voltar`).

### 6.2 Fluxos e passos

O menu (passo 0) escolhe o fluxo. Fora da contagem da barra. `Sair` encerra com 0.

| Menu | Efeito |
|---|---|
| `Instalar` | Fluxo de instalação (abaixo). Também atualiza as skills: uma skill registrada com versão menor que a do catálogo é instalada por cima. Não há item "Atualizar" no menu. |
| `Apagar` | Fluxo de remoção (6.8). |
| `Sair` | Encerra com 0. |

**Fluxo Instalar**

| # | Passo | Conteúdo | Observação |
|---|---|---|---|
| 1 | Escopo | Global (`~/.fsd/skills`) ou local (`./.fsd/skills`) | |
| 2 | Skills | `Selecionar todas` ou escolha individual | **Começa com todas marcadas.** Marcar ou desmarcar muda o total de passos (o idioma só entra se alguma escolhida tem mais de um idioma). Cada item mostra nome, versão, idiomas disponíveis e o estado no escopo (4.4). |
| 3 | Idioma | Idiomas das skills escolhidas | **Condicional**: só aparece se alguma skill escolhida tem mais de um idioma. |
| 4 | Conflitos | Para cada skill escolhida que tem uma de mesmo nome que não é nossa (regra 3), os caminhos em conflito e a escolha entre as três opções | **Condicional**: só aparece se houver conflito no escopo escolhido. |
| 5 | Atualização | Duas opções: atualizar a CLI ao abrir `fsd init` (`autoUpdate`) e fazer o `fsd update` atualizar também as skills (`updateSkills`) | Seção 7. |
| 6 | Tema | Donut (padrão), Morango, Chocolate ao leite, Granulado | O usuário escolhe as cores; a pré-visualização aparece na própria tela. |
| 7 | Resumo | Tudo que foi escolhido + confirmar e instalar | Último passo. Ao confirmar, cria a estrutura base (4.2), executa a instalação e mostra o resultado de cada skill. |

Regras da instalação, aplicadas ao confirmar o resumo:

1. "Já instalada" significa constar no `installed.json` do escopo. Se consta: com a versão do catálogo maior, instala por cima (`upgrade`); igual ou menor, `skip (up to date)`, sem erro.
2. Estado `missing` (consta no registro, pasta apagada à mão): reinstala e atualiza o registro.
3. Se já existe uma skill de mesmo nome que não é nossa, é um **conflito**: uma pasta em `.fsd/skills/<nome>` que não consta no registro, ou qualquer coisa em `.claude/skills/<nome>` que não seja o link para a nossa. O passo **Conflitos** (4) avisa de cada conflito, mostra os caminhos e pede uma escolha por conflito:
   - **Manter a original e pular a nossa** (`keep`, **padrão**): nada é alterado; resultado `skip` com aviso.
   - **Instalar a nossa e manter a original** (`unlinked`): a nossa é instalada em `.fsd/skills/<nome>` e registrada com `linked: false`, **sem** criar o link; o Claude Code continua carregando a original. O usuário liga a nossa depois com `fsd link skill <nome>` (5.4). Só existe quando a original está em `.claude/skills/<nome>`; se a original é uma pasta em `.fsd/skills/<nome>`, o caminho é o mesmo da nossa e restam `keep` e `replace`.
   - **Substituir a original pela nossa** (`replace`): a original é trocada pela nossa e o link é criado. A original só é apagada depois que a skill inteira deu certo (regra 9).
   O resumo mostra a escolha feita em cada conflito. Essas são as únicas checagens fora do registro, feitas no momento de gravar.
4. Instalar por cima remove a pasta registrada e copia de novo (substituição completa, sem merge, para não deixar arquivos órfãos).
5. Cria o diretório de destino se não existir. Preserva o bit de execução dos scripts (`scripts/*.py`).
6. Registra a skill em `.fsd/installed.json` do escopo (idioma, versão, caminho e datas). Nada é gravado dentro da pasta da skill. O registro é o último passo, gravado só depois da cópia e do link (quando há link) terem dado certo.
7. Skill com um único idioma pula o passo de idioma (3) e instala esse idioma. Sem conflito algum, o passo Conflitos (4) também é pulado.
8. A estrutura base (4.2) é criada pelo assistente na fase Preparar (6.9), depois da confirmação do resumo. `plan/install.ts` **não** a cria (só o destino da skill e o `installed.json`), para que `fsd update skill` nunca a crie.
9. **Tudo ou nada:** a execução depois da confirmação acontece em fases (6.9). Se qualquer fase falhar, a CLI desfaz tudo o que a tentativa fez e devolve o que deslocou, reporta `install failed and was undone (<motivo>)` e sai com exit 1.
10. **Interrupção antes de confirmar.** Enquanto o resumo não é confirmado, nada é gravado: `ctrl+c` em qualquer passo (inclusive na tela do resumo, antes do `enter`) sai com 130 e deixa o disco idêntico ao de antes (sem `nook/`, `.fsd/`, `.claude/` nem `config.json` novos). Uma instalação feita logo em seguida, no fluxo normal, termina sem erro e sem sobras: uma pasta por skill em `.fsd/skills`, um único link por skill em `.claude/skills` apontando para ela, uma entrada por skill no registro, sem arquivos temporários nem cópias duplicadas, e as demais execuções (`skip (up to date)`) não mudam nada.
11. **Interrupção durante a execução.** `ctrl+c` durante as fases desfaz a tentativa e sai com 130; se o processo morrer sem poder desfazer (kill, queda de energia), a próxima execução recupera pelo diário da execução, antes de qualquer outra coisa (6.9).

Navegação: `enter` avança, `←` (seta para a esquerda) volta ao passo anterior mantendo as escolhas, `ctrl+c` cancela sem escrever nada (exit 130). Nada é gravado em disco antes da confirmação no resumo.

Implementação: cada passo é um componente Ink em `.tsx`; `useInput` trata as teclas, e cabeçalho e rodapé são componentes comuns a todas as telas.

### 6.3 Resultado

Depois de confirmar o resumo, cada skill mostra uma linha de resultado (`install`, `upgrade`, `remove` ou `skip`, com versão, idioma e destino; o resultado de `unlinked` é `install` com a nota `original kept, not linked`), na paleta da CLI. A CLI termina com exit 0, ou 1 se houve falha de I/O. A confirmação do fluxo Instalar também grava as preferências (8.2).

### 6.4 Barra de progresso do rodapé

- No fluxo Instalar a barra representa os passos 1 a 7 (o menu não conta); no fluxo Apagar (6.8), os passos 1 a 3. Cada passo concluído preenche sua fração: `passos concluídos / total de passos`.
- Os passos 3 (idioma) e 4 (conflitos) são condicionais. Cada um que não se aplica tira 1 do total (7, 6 ou 5) e a barra é recalculada. Mudar a seleção de skills ou o escopo muda o total.
- A barra fica **cheia ao concluir o último passo** (o resumo). Em um passo ainda em andamento ela mostra só os passos já concluídos.
- Voltar com `←` diminui a barra.
- Com `NO_COLOR` ou terminal sem cor, a barra usa só os símbolos, sem cor.

### 6.5 Temas

- Um tema define as cores da interface: cabeçalho, título do passo, item em foco, item marcado, dica de teclas, barra de progresso (parte cheia e vazia), sucesso, aviso e erro.
- Temas: **Donut** (padrão, cores do emoji 🍩 na fonte Noto Color Emoji: cobertura de chocolate, massa dourada e laranja, cobertura rosa, granulado azul e vermelho), **Morango**, **Chocolate ao leite** e **Granulado**. As três últimas são alternativas à Donut para comparação; os valores estão em `docs/PALETAS-DONUT.md`.
- O passo **Tema** do fluxo Instalar (6) escolhe o tema e mostra a pré-visualização na própria tela. O tema gravado é o que vale desde a abertura da CLI.
- O campo `theme` do `config.json` (8.2) guarda o nome do tema. Um valor desconhecido cai no Donut.
- Os símbolos (marcador de seleção, setas, preenchimento da barra) são um conjunto único, Unicode; não há escolha de símbolos.
- A utilidade do tema além da aparência será definida depois pelo autor; a spec não assume nenhuma.

### 6.6 Entrada sem terminal

O assistente nunca abre sem TTY (`fsd init`). Ver 5.1.

### 6.7 Pendências do layout

1. ~~**Logotipo e itens do cabeçalho**~~: decidido, e descrito por inteiro em 6.10 (a rosquinha, o nome, o layout responsivo e os testes). O emoji 🍩 é gerado uma vez a partir da fonte Noto Color Emoji e guardado em `emojiDonut.ts` (a CLI não depende da fonte em tempo de execução). O destino (`~/.fsd/skills`) saiu do cabeçalho.
2. **Posição do idioma**: confirmar que o passo de idioma fica logo após o passo 2.
3. **Símbolos**: o conjunto Unicode único atual é provisório; falta decidir se há alternativa para terminais sem Unicode.
4. ~~**Largura do terminal**~~: decidido em 6.10 e 6.11: o cabeçalho segue a janela a partir de 17 linhas e 18 colunas (os mínimos exatos estão em 6.10; abaixo deles, o cabeçalho de uma linha), e o corpo corta o que não cabe em vez de comprimir.
5. **Paleta final**: escolher entre Donut, Morango, Chocolate ao leite e Granulado (6.5).

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

### 6.9 Execução depois da confirmação (fases)

Ao confirmar o resumo, a CLI não sai gravando: monta um **plano** (o que fazer com cada skill, já com as escolhas de conflito) e o executa em fases, mostradas na tela com o estado de cada uma (pendente, em andamento, concluída, falhou). Vale para o fluxo Instalar e, com as mesmas fases, para o Apagar (6.8), o `update skill` (5.3) e o `link skill` (5.4).

| Fase | O que faz | Altera o que o usuário vê? |
|---|---|---|
| 1. Verificar | Só lê. Relê registro e disco (podem ter mudado desde o resumo), recalcula os conflitos e compara com as escolhas do usuário; confere permissão de escrita nos destinos e que o catálogo está válido; recupera sobras de uma execução anterior (abaixo). | Não |
| 2. Preparar | Abre o diário da execução (abaixo), cria a estrutura base que faltar (4.2) e copia cada skill para uma pasta de preparo `<destino>.fsd-new-<id>`. | Só diretórios novos e pastas de preparo |
| 3. Aplicar | Por skill: desloca o que existe (versão anterior ou original substituída) para a área de apoio, renomeia a pasta de preparo para o destino e cria o link. | Sim |
| 4. Registrar | Grava o `installed.json` de uma vez (todas as skills da execução) e, no fluxo Instalar, o `config.json`, ambos de forma atômica. É o **ponto de não retorno**. | Sim |
| 5. Concluir | Descarta a área de apoio e o diário e mostra o resultado. Uma falha aqui é só aviso: o resultado já vale. | Não |

Regras:

1. **Falha em qualquer fase 1 a 4 desfaz a execução inteira** (não só a skill que falhou): remove o que foi criado, devolve o que foi deslocado e apaga o diário. Exit 1, com a fase, a skill e o motivo. Depois da fase 4 nada é desfeito.
2. **Verificar muda o plano?** Se a releitura achar um conflito que o usuário não decidiu (algo apareceu desde o resumo), a CLI não grava nada e volta ao resumo com o aviso `state changed since the summary`. Em `update skill` e `link skill`, que não têm resumo, é erro com exit 1.
3. **Diário da execução.** Antes da primeira alteração, a CLI cria `.fsd/cache/run-<id>/` com `journal.json` (cada caminho criado e cada caminho deslocado, com o endereço do apoio) e a área de apoio onde ficam os deslocados. Cada alteração é anotada no diário *antes* de ser feita. Esse diretório é da execução: criado sob demanda (inclusive por `update skill` e `link skill`, que não criam a estrutura base) e removido na fase 5 (ou no desfazer); se não existia `.fsd/cache`, ele é removido também.
4. **Recuperação.** Na fase 1 de qualquer execução, se houver `run-<id>/` de uma execução que não está viva (o `id` guarda o pid e a hora de início), a CLI desfaz pelo diário (devolve o deslocado, remove o criado, apaga o `run-<id>/`) e avisa `recovered an interrupted run`. Se a execução anterior ainda está viva, esta termina com `another fsd run is in progress` e exit 1; nada é alterado.
5. **Cancelar durante as fases.** `ctrl+c` (ou `SIGINT`/`SIGTERM`) não corta uma operação no meio: marca o cancelamento, a operação atual termina, a CLI desfaz as anteriores e sai com `cancelled (changes undone)` e exit 130. Um segundo `ctrl+c` durante o desfazer é ignorado. Depois da fase 4, o cancelamento só pula a fase 5 (a próxima execução limpa o apoio).
6. **A tela de execução** lista as fases e, na fase 3, cada skill com seu estado. A barra do rodapé não conta as fases (os passos 1 a 7 já estão concluídos). Falha mostra a fase, o motivo e `undone`.
7. **Nada fora do plano.** A execução só escreve nos caminhos do plano, no diário e no `installed.json`/`config.json`. Verificar falha se o plano apontar para fora de `<raiz>/.fsd`, `<raiz>/nook` ou `<raiz>/.claude/skills`.
8. **Ponto de injeção de falha** (seção 9): cada operação (copiar, mover, criar link, gravar registro, gravar config) passa por um conjunto de operações que os testes substituem para forçar a falha em qualquer fase.

### 6.10 A rosquinha e o nome no cabeçalho

O cabeçalho da tela inicial (6.1) é a rosquinha 🍩 e o nome `FRED` / `SHIPS` / `DONUTS`. Esta seção é a referência de como ele é feito e do que ficou decidido; a versão aprovada pelo autor está no backup `~/Backups/fred-ships-donuts-responsive-FINAL-2026-11-02`.

**Regras do autor**

- O conteúdo da moldura fica alinhado à esquerda.
- A moldura (o conteúdo mais a borda de 2 linhas) ocupa **no máximo 35% da altura da janela**.
- As três palavras, **na vertical**, são o mínimo que o cabeçalho tem de mostrar e têm de ficar legíveis: quando brigam com o teto de 35%, elas vencem.
- O tamanho de partida é **80 × 24**.
- A rosquinha adotada é a do backup `…-responsive-FINAL` (o autor a chamou de perfeita); o limite nos tamanhos pequenos é o que um terminal de blocos consegue desenhar (abaixo).

**A origem da rosquinha**

- `emojiDonut.ts` guarda o emoji 🍩 da fonte Noto Color Emoji como uma grade de 192 × 96 sub-pixels, gerada uma vez; a CLI não lê a fonte em tempo de execução.
- O terminal do autor (gnome-terminal, VTE 0.76) não anuncia sixel (resposta a DA1 `61;1;21;22`) e não tem protocolo gráfico, então a rosquinha é sempre **blocos de caractere** com duas cores por célula. O emoji de uma linha parece perfeito porque o terminal o desenha com pixels de verdade; a rosquinha de blocos não alcança isso.

**O algoritmo** (`donutArt.ts`)

1. O emoji é recortado pela caixa dos seus pixels opacos (`BOX`) e encaixado inteiro na grade: nada é cortado e nenhuma máscara é imposta (o topo de chocolate, a lateral dourada e o confeito do topo ficam como no ícone). Máscaras de elipse e de superelipse foram testadas e descartadas (a elipse afina as pontas, a superelipse fica quadrada).
2. As colunas seguem a proporção do emoji: `emojiCols(linhas)` = 12 (5 linhas), 15 (6), 22 (9), 25 (10), 30 (12), 35 (14), 65 (26).
3. Cada célula é uma grade de 8 × 8 amostras (`SUB`), cada uma a média de área da fonte; uma amostra com menos de 70% de opacidade (`OPAQUE_SHARE`) é transparente. Limiares menores criam fiapos nas bordas.
4. `fit` escolhe, por célula, o bloco e as duas cores que melhor representam as amostras. Candidatos: os 15 quadrantes, os oitavos inferiores `▁▂▃▅▆▇`, os oitavos à esquerda `▏▎▍▋▊▉` e `▔`. O custo é a dispersão das cores em torno da média, de cada lado, mais 15 000 por amostra do lado errado da transparência. O fundo só fica transparente quando metade ou mais das amostras de trás é transparente; uma célula de cor única vira `█`.
5. Lascas soltas de um oitavo na vertical (`▏` `▕`), sem nada acima nem abaixo, são apagadas.
6. Um bloco de primeiro plano nunca fica sem cor (o terminal usaria a cor padrão); só o fundo pode ficar transparente.
7. O desenho é guardado em cache por tamanho (64 entradas), porque arrastar a janela passa por um tamanho a cada passo.

**Versão no código (não confirmada como a boa: o autor a rejeitou no fim da sessão de 2026-11-02, e a versão boa está por identificar).** É a do backup `…-responsive-FINAL`, que ele havia chamado de perfeita: quadrantes e oitavos, sem mais nada, em todos os tamanhos (a impressão digital sha256 do 35 × 14 está nos testes). Erro de cor contra o emoji (menor é melhor) e sobreposição da silhueta, medidos nesta versão:

| Linhas | Erro | Silhueta |
|---|---|---|
| 5 | 920 | 0,933 |
| 6 | 802 | 0,943 |
| 7 | 670 | 0,951 |
| 8 | 591 | 0,954 |
| 9 | 527 | 0,963 |
| 10 | 439 | 0,968 |

Em 6 linhas são 15 × 6 células, no máximo uns 30 × 12 pixels de cor: o serrilhado é do meio (blocos), não do algoritmo. Só uma imagem real ou mais linhas resolveriam; a segunda passa do teto de 35%.

**Tentativa descartada: sextantes.** Até 9 linhas, os 60 sextantes de 2 × 3 pixels (U+1FB00…) como candidatos, mais uma penalização de 3 vezes para perder cor onde a imagem tem cor (um pontinho do fundo no meio do chocolate), baixaram o erro (6 linhas: 737; 8: 433; 9: 387) e deixaram o furo e os confeitos mais nítidos, mas o autor voltou à versão do backup. O código e o teste dessa versão estão guardados fora do projeto (`scratchpad/parked/donutArt.with-sextants.ts` e `donutQuality.with-sextants.test.ts`). Também foram testados e descartados o preenchimento de amostras transparentes isoladas e a cor dominante da amostra em vez da média (as manchas cinza-arroxeadas, de um granulado misturado ao chocolate dentro da mesma célula, continuam: vêm de a célula ter só duas cores).

**O nome** (`wordArt.ts`, `shadowFont.ts`, `pixelFont.ts`)

As palavras só são desenhadas em tamanhos que têm letras nítidas; a fonte `ANSI Shadow` (a do banner do GSD) só é nítida no seu tamanho de 6 linhas e, espremida em 3, 4 ou 5, vira papa (a perna do `R` e a barra do `E` se fundem, sobram fiapos sob as letras). Por isso há uma fonte para cada tamanho:

| Linhas por palavra | Fonte | Células por palavra (`FRED` / `SHIPS` / `DONUTS`) |
|---|---|---|
| 6 | `ANSI Shadow` no tamanho nativo (`shadowFont.ts`, reamostrada por `wordArt.ts`); sombra de `╗ ║ ╝` como faixa cheia | 32 / 35 / 53 |
| 4 | fonte de pixels em quadrantes: letras de 10 × 7 pixels, curvas e diagonais, sombra de 2 pixels à direita e 1 abaixo; a sombra não é desenhada dentro do vazio da própria letra | 24 / 28 / 36 |
| 2 | fonte de pixels em sextantes (2 × 3 por célula): letras de 8 × 5 pixels, hastes de 2 pixels, **sem sombra** (ela pesava tanto quanto a letra e virava um xadrez cinza) e uma linha de pixels de folga entre as palavras | 20 / 24 / 30 |

Cores: corpo `#f5e6c8` (bege claro); sombra `#9c9076` em 6 linhas e `#6a624e` em 4 (escura o bastante para o corpo ser o que o olho lê); a moldura usa a cor de cabeçalho do tema.

**O layout** (`heroLayout` em `Chrome.tsx`)

- A moldura toma a largura da janela menos 2 (o padding da raiz); `heroShareRows(linhas)` = `floor(linhas × 0,35) − 2` é o máximo de linhas de conteúdo dentro dos 35%, e `HERO_RESERVED_ROWS = 11` é o que o menu ocupa abaixo do conteúdo da moldura (borda 2, margem 1, título 2, três opções, rodapé 3).
- Ordem de escolha: (1) as maiores palavras (6, 4 ou 2 linhas) que cabem dentro dos 35%, com a maior rosquinha ao lado (até 26 linhas, no máximo a altura permitida); (2) as mesmas palavras sozinhas, se a rosquinha não cabe na largura; (3) passando dos 35% só o necessário, as palavras de 2 linhas (6 linhas de conteúdo) com a rosquinha não mais alta que elas; (4) essas palavras sozinhas; (5) só a rosquinha, a maior dentro dos 35%; (6) o cabeçalho de uma linha.
- Com 6 a 11 linhas de conteúdo dentro dos 35% as palavras têm 2 linhas, de 12 a 17 têm 4, e de 18 em diante têm 6; o teto manda, mesmo com espaço sobrando na janela.
- Menores janelas: as palavras (de 2 linhas) cabem a partir de 17 linhas e 36 colunas (com a rosquinha, a partir de 51 colunas); só a rosquinha, a partir de 20 linhas e 18 colunas; abaixo disso, o cabeçalho de uma linha.

| Janela | Palavras (linhas) | Rosquinha (linhas × colunas) | Moldura |
|---|---|---|---|
| 80 × 24 | 2 | 6 × 15 | 8 linhas (33%) |
| 100 × 28 | 2 | 7 × 17 | 9 (32%) |
| 120 × 30 | 2 | 8 × 20 | 10 (33%) |
| 120 × 35 | 2 | 10 × 25 | 12 (34%) |
| 120 × 40 | 4 | 12 × 30 | 14 (35%) |
| 150 × 60 | 6 | 19 × 47 | 21 (35%) |
| 80 × 20 | 2 | 6 × 15 | 8 (40%, passa do teto: as palavras vencem) |
| 80 × 17 | 2 | 6 × 15 | 8 (47%) |
| 80 × 16 | uma linha | — | — |
| 38 × 40 | 2 | — (sem espaço) | 8 |
| 20 × 40 | — | 5 × 12 | 7 |

**Arquivos** (histórico: removidos na reorganização de 2026-11-07, ver 6.12 e 9): `Chrome.tsx` (layout e desenho), `donutArt.ts`, `emojiDonut.ts`, `wordArt.ts`, `shadowFont.ts`, `pixelFont.ts`, `sextant.ts` (só as letras de 2 linhas usam os sextantes).

**Testes**

- `donutQuality.test.ts`: contra o próprio emoji, em todas as alturas de 5 a 40 linhas (erro abaixo da curva `7200 / linhas^1,15`, sobreposição da silhueta acima de um piso, sem queda de mais de 10% ao subir uma linha), limites próprios em 8 tamanhos (erro máximo 870, 640, 475, 375, 340, 255, 190 e 148 em 6, 8, 10, 12, 14, 18, 22 e 28 linhas), larguras de metade ao dobro da proporção, proporção, sem corte, furo no meio, cores, sem células soltas e a impressão digital do 35 × 14.
- `heroLayout.test.ts`: em toda janela de 20 a 200 colunas por 10 a 60 linhas, nada passa da janela, a proporção do emoji se mantém, a moldura tem no máximo 35% (a única exceção são as palavras de 2 linhas, e então a moldura é só as palavras), as palavras aparecem onde cabem e nunca encolhem quando a janela cresce (exceto quando a rosquinha entra ao lado); o 80 × 24 como caso explícito.
- `pixelFont.test.ts`: cada letra do nome nos tamanhos de 2 e 4 linhas, só blocos de quadrante (4 linhas) e de sextante (2 linhas), numeração dos sextantes como no Unicode, o vazio de um `O` sem sombra, a linha de folga vazia e o contraste da sombra.

### 6.11 Redesenho e janelas pequenas

- **Redesenho** (`ui/terminal/frameWriter.ts`, instalado por `ui/run.ts`): o Ink apaga o quadro anterior linha por linha e escreve o novo em pedaços, o que depois de um redimensionamento mostra tela em branco ou quadro rasgado. O escritor troca isso por um diff de linhas contra o quadro anterior, com posição absoluta de cada linha, em **uma única escrita** entre BSU e ESU (DEC 2026) quando o terminal é conhecido por respeitá-los (VTE 0.68 ou mais novo, kitty, ghostty, iTerm2, WezTerm, alacritty…; nunca no tmux; `FSD_SYNC=1` ou `0` força). No resize (ou no primeiro quadro) todas as linhas são reescritas, cada uma apagando o resto da linha, e o fim da tela é apagado; **a tela nunca é apagada antes de pintar**, então o terminal que ignora BSU também não mostra tela em branco. O cursor fica na última linha. O apagamento de linhas que o Ink faz sozinho ao estreitar a janela é descartado (ele apagaria o que o diff acha que está na tela) e o quadro seguinte é escrito inteiro.
- **Resize** (`ui/run.ts`): o tamanho entra no `App` como propriedade e um ouvinte de `resize` registrado antes do Ink chama `rerender` de forma síncrona, ignorando eventos de mesmo tamanho; sai um quadro só, já no tamanho novo.
- **Janelas baixas e estreitas**: cabeçalho e rodapé não encolhem; o corpo corta o que não cabe (`overflowY` oculto, com o conteúdo interno sem encolher) em vez de comprimir as linhas umas sobre as outras. Abaixo de 20 linhas o cabeçalho dos passos vira uma linha, abaixo de 12 o rodapé perde a barra de progresso, o texto longo é cortado com `…` e as listas rolam para manter a linha focada visível (`listRows`).
- **Desempenho**: `NODE_ENV=production` por `env.ts` (o React em modo de desenvolvimento é bem mais lento); o cabeçalho tem um só tamanho (6.12), então a rosquinha é desenhada uma vez e as figuras só são recompostas quando a janela muda.
- **Verificado** no gnome-terminal real (VTE 0.76): 80 passos de redimensionamento (974 × 682 → 1374 × 784 → 700 × 380 e de volta), com a janela à esquerda e à direita do monitor, sem nenhuma amostra em branco. O arrasto foi com `wmctrl` (em passos); **não foi verificado** o arrasto com o mouse nem outros terminais, e o arrasto não foi repetido depois da troca do layout para o teto de 35% e as fontes de 2 e 4 linhas.
- **Sextantes**: vêm de uma fonte reserva (Noto Sans Symbols2) no gnome-terminal; em outra fonte ou terminal podem sair desalinhados. Só as letras de 2 linhas dependem deles.
- **Testes**: `frameWriter.test.ts` (diff, uma escrita, BSU/ESU, passagem de sequências que não são quadro, apagamento do Ink), `App.test.tsx` ("wizard in small windows": de 100 × 30 a 24 × 5, mais a rolagem da lista) e `resize.test.ts` (o programa de verdade num tmux: nenhum quadro maior que a janela, e o que sobra na tela depois de cada resize).

### 6.12 O cabeçalho definitivo (2026-11-07)

Substitui o que 6.10 e 6.11 dizem sobre tamanhos e moldura; o resto deles é histórico.

- **Um só tamanho, o do 80 × 24, em qualquer janela.** Nada escala com a janela: a rosquinha é sempre a de 22 × 9 células e as três palavras (`FRED`, `SHIPS`, `DONUTS`), empilhadas, são sempre as de 3 linhas cada (9 linhas de conteúdo). Janela estreita demais para os dois: só as palavras; nem elas: só a rosquinha; nem isso (ou menos de 9 linhas livres acima do menu): o cabeçalho de uma linha.
- **Sem moldura.** O cabeçalho do menu e a caixa das telas de passos não têm borda (a azul `#90C0E0` saiu); o título dessas telas continua no azul da paleta. O cabeçalho do menu ocupa 9 linhas, o das telas de passos 2 a 3.
- **A rosquinha é um mapa de pixels feito à mão** (`src/cli/ui/art/donut.ts`, `DONUT_MAP_22X9`: 44 × 27 pixels, 1 pixel = 1 sextante, paleta fixa de 9 cores, o preto é o fundo do terminal). Cada grupo de 2 × 3 pixels usa no máximo 2 cores (limite da célula). Só muda por ordem explícita do autor.
- **As palavras** são a fonte de pixels de 3 linhas de `src/cli/ui/art/words.ts`: letras de 8 pixels de altura (9 com a sombra), hastes de 3 e barras de 2, sombra de 1 pixel à direita e embaixo na cobertura `#875B4F`; numa célula com corpo, sombra e vazio, o vazio toma a cor da sombra. Cores: corpo na massa `#F5B03E`, sombra na cobertura `#875B4F` (a paleta da rosquinha, `docs/PALETAS-DONUT.md`). Por todo o cabeçalho (de uma borda à outra, sobre o fundo, as letras e a rosquinha) **caem granulados** (bastões de 3 pixels, em diagonal ou deitados, rosa, azul, vermelho, rosa claro e amarelo, cada um com movimento próprio: velocidade, deriva para um lado, balanço em curva ou em zigue-zague e giro, `src/cli/ui/art/snow.ts`), como neve; sobre a letra e a rosquinha só aparecem onde a célula cabe (duas cores no máximo), nas partes cheias.
- **Versões: só git.** O versionamento físico (pastas SemVer, `save.sh`, `logos/`, `words/`, `header/`) e a trava dos trechos congelados (`check-frozen.mjs`) foram abolidos em 2026-11-07; existe só o arquivo em uso, e o histórico é o do git.
- **Código antigo do cabeçalho** (a reamostragem do emoji, `emojiDonut.ts`, e as fontes de 6, 4 e 2 linhas) foi removido na reorganização de 2026-11-07, assim como os testes.

## 7. Atualização da CLI

"Atualização" aqui é a da **própria CLI**. A das skills é o `Instalar` do assistente e o `fsd update skill` (5.3).

Há dois gatilhos:

- **`fsd update`** (5.2): atualiza a CLI quando o usuário manda, sempre.
- **`fsd init`**: atualiza a CLI automaticamente antes de abrir o menu, se `autoUpdate` estiver ligado. Para não atualizar ao usar `fsd init`, o usuário desliga `autoUpdate` (passo 4 do assistente, 8.2).

Regras comuns:

- `autoUpdate: true | false` e `updateSkills: true | false` ficam na configuração (8.2). Padrões sugeridos no passo 4: `autoUpdate` ligado e `updateSkills` desligado.
- A CLI consulta o registro do npm pela última versão publicada de si mesma. Se houver versão maior que a instalada, atualiza.
- No auto-update (`fsd init`), a consulta é limitada: timeout curto (2 s), no máximo uma vez a cada 24 h (a hora da última checagem fica na configuração), e qualquer falha de rede é ignorada em silêncio. Nunca bloqueia nem quebra o assistente. A hora da checagem (`lastUpdateCheck`) **não é gravada na hora**: o `fsd init` a mantém em memória e a grava na fase Registrar junto com o `config.json`, se o usuário confirmar o Instalar, ou de imediato apenas se o `config.json` já existir. Assim o `fsd init` ao abrir nunca cria arquivo (4.2); se o usuário não confirmar nada em uma primeira execução, a próxima volta a consultar o npm. No `fsd update` explícito não há limite de 24 h, e a falha de rede é reportada com exit 1.
- Só atualiza quando a CLI está instalada globalmente (`npm i -g`). Rodando via `npx`, não faz nada, pois `npx -p fred-ships-donuts@latest fsd` já traz a versão nova.
- Com `autoUpdate` desligado, `fsd init` não consulta o registro. `fsd -v`, `fsd -h` e `fsd update skill` nunca consultam.
- Após atualizar no `fsd init`, a execução atual continua com a versão antiga e avisa que a nova vale a partir da próxima.

## 8. Erros, saída e configuração

### 8.1 Erros e códigos de saída

| Situação | Mensagem | Exit |
|---|---|---|
| `fsd init` com argumentos | erro de uso do commander | 1 |
| `fsd init` sem TTY | `fsd init requires an interactive terminal` | 1 |
| Comando ou opção desconhecidos | erro do commander + `fsd --help` | 1 |
| Estado mudou depois do resumo (conflito novo) | `state changed since the summary` (nada gravado) | 1 |
| Outra execução do fsd em andamento | `another fsd run is in progress` | 1 |
| Execução anterior interrompida encontrada | `recovered an interrupted run` (aviso; segue) | — |
| Falha em uma fase | `install failed and was undone (<fase>: <motivo>)` | 1 |
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


### 8.2 Configuração persistida

As preferências do assistente ficam em `~/.fsd/config.json`. É uma configuração do usuário: **não existe `config.json` no escopo de projeto**.

```json
{
  "schema": 1,
  "theme": "donut",
  "autoUpdate": true,
  "updateSkills": false,
  "lastUpdateCheck": "2026-10-31T12:00:00.000Z"
}
```

- Escopo e seleção de skills **não** são persistidos; só tema, `autoUpdate` e `updateSkills` (mais o `lastUpdateCheck`).
- O arquivo é lido ao abrir a CLI: o tema gravado vale já no cabeçalho e no menu, e os passos Atualização e Tema vêm pré-selecionados com os valores gravados.
- É gravado só quando o usuário confirma o resumo do fluxo Instalar, junto com a instalação. Cancelar e o fluxo Apagar não gravam nada.
- Arquivo ausente, ilegível ou com `schema` desconhecido: a CLI usa os padrões, sem erro, e o sobrescreve na próxima confirmação.

## 9. Estrutura do código

Camadas, de dentro para fora. Cada uma só importa das que estão acima dela na lista; nada de `core/` a `wizard/` conhece React, Ink ou commander. O detalhe (o que mora onde e por quê) está em `docs/ARQUITETURA.md`.

```
src/
  cli/
    fsd.ts              # bin `fsd`: liga os comandos ao commander e define o exit code; só carrega ui/ dentro de `init`, por import dinâmico
    env.ts              # NODE_ENV=production antes de qualquer import (o React em modo de desenvolvimento é lento)
    args.ts             # tradução dos atalhos -u, -s e -f para os comandos longos (puro)
    exitCodes.ts        # 0, 1 e 130
    core/               # domínio e disco: só lê (a gravação atômica de JSON é a exceção, usada pelo config e pelo motor)
      package.ts        # raiz, nome e versão do pacote
      scope.ts          # escopos global e projeto, caminhos (.fsd/, nook/), estrutura base, escopos com registro
      fs.ts             # consultas ao disco (lstat, link aponta para, ancestrais que faltam) e gravação atômica
      semver.ts         # comparação e validação de versões
      catalog.ts        # catálogo src/skills/_i18n: listSkills(), findSkill(), frontmatter, filtro de cópia
      registry.ts       # installed.json: leitura e estado de uma skill (4.4)
      config.ts         # config.json: tema, autoUpdate, updateSkills, lastUpdateCheck
      claudeLink.ts     # caminho do link .claude/skills/<nome> e destino padrão da skill
      conflicts.ts      # skills de mesmo nome que não são nossas (6.2 regra 3)
      runJournal.ts     # o diário de uma execução (`schema: 2`), as execuções mortas e `liveRun()` (só leitura)
      selfUpdate.ts     # verificação e atualização da própria CLI (7)
      slug.ts           # slug de títulos de task e de passo (4.5)
      nook.ts           # tasks do nook/ (só leitura): caminhos, localizar por slug, modelo da task, validar pasta × status (4.5)
      taskFiles.ts      # formato dos arquivos de task: parse e serialize do frontmatter do plan.md e dos passos .yaml, preservando o resto (4.5)
      gitignore.ts      # linhas que faltam no .gitignore do projeto (4.2)
    plan/               # planejadores: leem o disco e montam um Plan; nunca escrevem
      types.ts          # Plan, PlanItem, ActionResult, formatResult
      install.ts        # instalação e upgrade (6.2)
      uninstall.ts      # remoção (6.8)
      link.ts           # `fsd link skill` (5.4)
      task.ts           # transições de task como funções puras: estado + comando → erro ou operações (5.5)
    engine/             # execução de um Plan em fases (6.9)
      transactionRun.ts # núcleo genérico: trava, diário, SIGINT/SIGTERM, commit, desfazer e eventos de fase; recebe verificar e aplicar como funções
      run.ts            # as fases Verificar, Preparar, Aplicar, Registrar e Concluir das skills, cliente do transactionRun
      taskRun.ts        # `task done`/`archive`, cliente do transactionRun (sem registro de skills)
      verify.ts         # a fase Verificar (só leitura)
      transaction.ts    # cada mudança registrada no diário antes de ser feita
      recovery.ts       # desfazer pelo diário e recuperar execuções mortas
      ops.ts            # operações de arquivo (copiar, mover, link, gravar), substituíveis
    commands/           # um arquivo por comando
      init.ts           # valida TTY, aplica auto-update e abre o assistente
      update.ts         # `fsd update` (CLI) e `fsd update skill [nome]`
      link.ts           # `fsd link skill [nome]`
      task.ts           # `fsd task …` e `fsd task step …` (5.5)
      skillPlans.ts     # o que `update skill` e `link skill` compartilham: escopos, execução e relatório
      io.ts             # saída padrão e de erro
      guards.ts         # recusas compartilhadas, como `another fsd run is in progress` fora do motor (5.5)
    wizard/             # regras do assistente, sem React
      choices.ts        # o que o usuário escolheu
      steps.ts          # passos de cada fluxo e progresso (6.2, 6.4)
      queries.ts        # o que as telas mostram: catálogo, instaladas, idiomas, conflitos
      execute.ts        # planejar e executar depois da confirmação do resumo
    ui/                 # assistente (6), em Ink + TSX
      run.ts            # monta o assistente no terminal: tamanho, resize síncrono, escritor de quadros
      App.tsx           # estado e navegação entre as telas
      screens/          # Menu, Step (corpo de cada passo e o resumo), Running, Result
      components/       # Header, Footer, Title, Pick (lista com rolagem), Conflicts
      hero/             # o cabeçalho grande do menu: layout.ts (puro) e Hero.tsx (desenho e granulados)
      art/              # figuras em células, sem React: donut.ts, words.ts, snow.ts, sextant.ts, cell.ts
      terminal/         # frameWriter.ts (6.11) e useTerminalSize.ts
      layout.ts         # linhas que cabeçalho e rodapé ocupam nos passos
      labels.ts         # textos dos passos, fases e escolhas de conflito
      theme.ts          # temas e símbolos (contexto React)
  skills/               # catálogo (conteúdo, não é código)
    _i18n/<nome>/<lang>/
```

- `engine/run.ts` executa os planos de `plan/` em fases e recebe, opcionalmente, as operações que podem falhar (copiar, mover, criar o link, gravar registro e config) como parâmetro, com as reais por padrão. Uma falha pode ser injetada por esse ponto, sem depender de permissões do sistema de arquivos.
- A lógica de catálogo fica em `core/catalog.ts`, a de registro e configuração em `core/registry.ts`/`core/config.ts`, e as regras de instalar, apagar e ligar em `plan/`. Os comandos (`commands/`) e o assistente (`wizard/` e `ui/`) só consomem essas camadas, sem duplicar regra.
- A lista de passos e o progresso são funções puras (`wizard/steps.ts`), separadas da renderização.
- `fsd.ts` importa `ui/` só dentro de `fsd init` (import dinâmico), então `fsd -v`, `fsd -h` e `fsd update` não pagam o custo do React.

## 10. Empacotamento

- Nome do pacote npm: **`fred-ships-donuts`**.
- `package.json`: `bin` é `{ "fsd": "./dist/cli/fsd.js" }`, `files: ["dist", "src/skills"]`, `engines.node` é `>=22`.
- `ink` e `react` ficam em `dependencies`; `@types/react` e `tsx` em `devDependencies`. `commander` fica em `dependencies`; `@clack/prompts` sai.
- `tsconfig.json` com `jsx: react-jsx`; `tsc` compila os `.tsx` para `dist/`.
- `tsc` não copia `.md`/`.py`, por isso o catálogo é lido de `src/skills` e não de `dist`.
- `dist/cli/fsd.js` precisa do bit de execução e do shebang.
- Antes de publicar, conferir o conteúdo com `npm pack --dry-run`: precisa conter `dist/` e `src/skills/_i18n/`.
- O pacote se chama `fred-ships-donuts` e o comando é `fsd`. Como o nome do binário difere do nome do pacote, o `npx` não o escolhe sozinho: o uso é `npx -p fred-ships-donuts fsd init`.
- Distribuição por npm: `npx -p fred-ships-donuts fsd init` ou instalação global (`npm i -g fred-ships-donuts`); as versões novas chegam por `fsd update`, pelo auto-update do `fsd init` (7) ou reinstalando.

## 11. Testes

Os testes foram removidos do projeto por decisão do autor (2026-11-07). Esta seção fica como a lista do que cobrir caso eles voltem.

- **Unitários** (`node:test`): `listSkills`, `skillsTarget`, leitura de frontmatter, comparação de versões, filtro de `evals/` e `README.md`.
- **Registro e configuração**: `registry.ts` e `config.ts` (arquivo ausente, ilegível e de `schema` desconhecido; gravação atômica; estados `not installed`, `up to date`, `outdated`, `missing`).
- **Ações**: `plan/install.ts` e `plan/uninstall.ts` com `HOME` e `cwd` apontando para diretórios temporários, conferindo a árvore resultante em instalação, reinstalação, `upgrade`, conflito (com e sem autorização), escopo de projeto e remoção.
- **Auto-update**: a decisão de checar (autoUpdate, intervalo de 24 h, instalação global vs `npx`) como função pura, sem rede.
- **Atalhos**: `-u`, `-s` e `-f` equivalem a `update`, `skill` e `--force`, como argumentos separados e **na ordem** `-u -s -f` (`fsd -u`, `fsd -u -s [nome]`, `fsd -u -s -f [nome]`, `fsd update -s [nome]`, `fsd -u skill [nome]`, `fsd update skill -f`, `fsd link -s -f [nome]`); `fsd -s` sozinho, `-f` sem `skill`, atalho misturado com outro comando, atalhos fora de ordem (`-s -u`, `-f -s`) e agrupados (`-us`, `-usf`) saem com 1.
- **`update skill`**: com `HOME` e `cwd` temporários, todas as skills, uma só, nome não instalado, nome fora do catálogo, em dia (`skip`) e `missing`; conflito sem `--force` (original intacta, mensagem, exit 1, demais skills processadas), com `--force` e com `-f` (original substituída, link nosso), `--force` sem conflito (nada muda) e skill com `linked: false` (só a pasta é atualizada, o link não é tocado).
- **`link skill`**: sem `nome` e com `nome`; skill `linked: false` com caminho livre (cria o link e grava `linked: true`), com original no lugar sem `--force` (nada muda, exit 1) e com `--force`/`-f` (substitui); já ligada (`skip`); nome não instalado; os dois escopos.
- **Passo Conflitos**: aparece só com conflito e muda o total de passos; as três escolhas (`keep`, `unlinked`, `replace`) por conflito, o padrão `keep`, e a escolha `unlinked` indisponível quando a original está em `.fsd/skills/<nome>`; em cada uma, a árvore resultante e o registro (`linked: false` quando for o caso); o `Apagar` de uma skill `unlinked` não toca a original.
- **Interrupção**: com o assistente (`ink-testing-library`), `ctrl+c` em **cada** passo do fluxo Instalar, inclusive no resumo antes do `enter`, e conferir que o disco ficou idêntico; em seguida, instalar normalmente no mesmo `HOME`/`cwd` e conferir a árvore exata (regra 10): sem erro, sem sobras, sem pasta ou link duplicado e sem link faltando; repetir a instalação e conferir que nada muda.
- **Rollback**: falha injetada (6.2 regra 9 e seção 9) em cada passo (copiar, criar o link, registrar) em instalação nova, `upgrade` e `replace`: nada da tentativa permanece, a versão anterior e a original voltam byte a byte, e não sobra pasta de apoio. **Estes testes não dependem de permissões nem de plataforma e não são pulados** em root, em outro usuário ou no Windows; só se pula um teste quando nem a fixture temporária pode ser criada.
- **Fases (6.9)**: falha injetada em cada fase 1 a 4 desfaz a execução inteira (inclusive as skills que já tinham sido aplicadas), e depois da fase 4 nada é desfeito; estado que muda entre o resumo e a fase Verificar; `ctrl+c`/`SIGTERM` entre operações; `Apagar` e `update skill` pelas mesmas fases; o `fsd init` ao abrir e o `lastUpdateCheck` em memória não criam arquivo algum.
- **Recuperação (regra 11 e 6.9)**: criar à mão um `run-<id>/` com diário de uma execução morta (e outro de uma execução viva) e conferir a recuperação ou o `another fsd run is in progress`. Em ambos os casos a pasta de preparo `*.fsd-new-*` da execução morta também some, e a tentativa seguinte não vê falso conflito.
- **Cabeçalho (6.10 e 6.11)**: qualidade da rosquinha contra o emoji em todas as alturas, layout do cabeçalho em todas as janelas de 20 a 200 colunas por 10 a 60 linhas (teto de 35%), fontes de pixel do nome, escritor de quadros, assistente em janelas pequenas e redimensionamento do programa real num tmux; a lista completa está em 6.10 e 6.11.
- **Assistente**: o cálculo da barra e a lista de passos dos dois fluxos (com e sem o passo de idioma) como funções puras. Os componentes podem ser testados com `ink-testing-library`. A validação final é manual, em um terminal real.
- **Binário**: executar `fsd`, `fsd -h`, `fsd --help`, `fsd -v`, `fsd --version`, `fsd foo`, `fsd init x` e `fsd init` sem TTY e conferir saída e exit code.
- **Catálogo**: cada skill tem `SKILL.md` com `name` igual ao diretório e `metadata.version` semver válido (pré-release incluído); toda variante de idioma de uma mesma skill tem o mesmo `name` e o mesmo `metadata.version`.

## 12. Critérios de aceitação

1. `fsd -v` e `fsd --version` imprimem a versão de `package.json` e saem com 0; `fsd`, `fsd -h` e `fsd --help` mostram a mesma ajuda e saem com 0; comando desconhecido sai com 1.
2. `fsd init` com argumento sai com 1; sem TTY sai com 1 e não escreve nada.
3. O passo Skills do assistente mostra exatamente as skills de `src/skills/_i18n/` que têm ao menos uma variante com `SKILL.md`, com o estado de cada uma.
4. Instalar todas as skills em um `HOME` vazio cria cada uma com a árvore idêntica à do catálogo no idioma escolhido (menos `evals/` e `README.md`), em `<destino>/<name>/`, e as registra no `installed.json`.
5. Instalar de novo uma skill já em dia não altera nada e termina com exit 0 (`skip (up to date)`).
6. Escolher `en` em uma skill com idiomas instala só a árvore `en`.
7. No escopo de projeto, o assistente escreve só em `./.fsd` (incluindo `./.fsd/skills`), `./.claude/skills` (apenas os links) e `./nook`, e não toca em `~/.claude`, `~/.fsd` nem `~/nook`, exceto o `config.json` (8.2).
8. Instalar uma skill registrada com versão menor que a do catálogo faz `upgrade` e mantém o registro coerente.
9. `Apagar` remove apenas as skills escolhidas e as entradas delas no registro.
10. Uma skill de mesmo nome que não é nossa (pasta em `.fsd/skills` fora do registro, ou qualquer coisa em `.claude/skills/<nome>`) nunca é alterada sem que o usuário escolha substituir no resumo, e nunca é removida pelo `Apagar`.
11. Apagar a pasta de uma skill à mão faz o assistente mostrar `missing`; instalar a restaura e `Apagar` limpa a entrada.
12. No assistente, `ctrl+c` não grava nada em `~/.fsd`; `←` volta ao passo anterior mantendo as escolhas.
13. A barra de progresso chega a 100% somente ao concluir o resumo, e usa 5 passos no fluxo Instalar quando nem o idioma nem os conflitos se aplicam (6 se só um deles se aplica, 7 se os dois).
14. Tema e auto-update escolhidos aparecem pré-selecionados e valem desde as primeiras telas na execução seguinte.
15. Com `autoUpdate: false`, `fsd init` não faz nenhuma consulta de rede; `fsd update` continua atualizando a CLI.
16. `fsd -u` equivale a `fsd update`, e `fsd -u -s [nome]` a `fsd update skill [nome]`; `fsd -s` sozinho sai com 1.
17. `fsd update skill` atualiza todas as skills desatualizadas; `fsd update skill <nome>` atualiza só aquela; ambos saem com 0 quando tudo está em dia.
18. Com `updateSkills: true`, `fsd update` atualiza a CLI e depois as skills usando a versão nova da CLI.
19. O menu do assistente não tem "Atualizar": `Instalar` atualiza as skills desatualizadas.
20. Confirmar o fluxo Instalar cria `nook/kitchen`, `nook/bakers`, `.fsd/oven`, `.fsd/cache` e `.fsd/logs` no escopo escolhido (em `~` no global); cancelar, `fsd init` ao abrir e o fluxo Apagar não criam nada.
21. Cada skill instalada tem o link `.claude/skills/<nome>` → `.fsd/skills/<nome>`; o `Apagar` remove o link junto com a pasta.
22. Se copiar, criar o link ou registrar falhar, nada da tentativa permanece: pasta nova, link e entrada somem, e o que foi deslocado (versão anterior ou original) volta ao lugar. Exit 1.
23. Em conflito de skill de mesmo nome, o passo Conflitos oferece `keep` (padrão), `unlinked` e `replace`; com `keep` nada muda no disco; com `replace` a original some só depois do sucesso e o link é o nosso.
24. Com `unlinked`, a original continua intacta e carregada pelo Claude Code, a nossa existe em `.fsd/skills/<nome>` com `linked: false` e sem link, e o `Apagar` da nossa não toca a original.
25. `fsd update skill` não substitui original sem `--force`/`-f` (exit 1, original intacta); com a opção, substitui e liga; `-f` fora de `update skill`/`link skill`, atalhos fora de ordem e atalhos agrupados saem com 1.
26. `ctrl+c` em qualquer passo antes de confirmar o resumo não grava nada, e uma instalação logo em seguida termina sem erro, sem pasta ou link duplicado e sem link faltando.
27. Os testes de rollback rodam e passam em qualquer usuário (inclusive root) e plataforma, sem depender de permissões do sistema de arquivos.
28. `fsd link skill [nome]` cria o link das skills sem link e grava `linked: true`; com original no lugar, só substitui com `--force`/`-f` (exit 1 sem ele).
29. O passo Conflitos só aparece quando há conflito, e o total de passos acompanha escolhas de escopo e de skills (7, 6 ou 5).
30. Depois de uma morte no meio da execução (sobras `*.fsd-new-*`/`*.fsd-old-*`), a instalação seguinte recupera sem falso conflito.
31. Depois do `enter` no resumo, a execução passa pelas fases Verificar, Preparar, Aplicar, Registrar e Concluir, visíveis na tela; falha em qualquer uma das quatro primeiras deixa o disco como estava antes da confirmação, e as skills já aplicadas na mesma execução também são desfeitas.
32. `ctrl+c` durante as fases desfaz e sai com 130; um processo morto no meio é recuperado pelo diário na execução seguinte; duas execuções ao mesmo tempo não se atropelam.
33. `fsd init` ao abrir, com `autoUpdate` ligado e CLI instalada globalmente, não cria nenhum arquivo ou diretório.
34. `fsd task new "Login OAuth"` cria `nook/bench/login-oauth/plan.md` com `status: in_progress`; repetir o título (ou um slug que já existe no `rack` ou no `fridge`) sai com exit 1 sem alterar nada.
35. `fsd task step add` numera os passos `01`, `02`, … e nunca reaproveita um número; `start`, `done` e `skip` mudam só o `status` e o `updatedAt`, preservando os outros campos e os comentários do YAML; uma edição do arquivo por outro processo durante o comando não se perde.
36. `fsd task done` só move para `nook/rack/` com todos os passos fechados (`done` ou `skipped`), e `fsd task archive` só move do `rack` para o `fridge`; em ambos, a pasta e o `status` sempre combinam, e uma falha injetada em qualquer ponto (inclusive depois do movimento) deixa a task onde estava, inteira e com o status de antes.
37. `fsd task list` mostra as tasks do `bench` e do `rack` com os passos `done/total`; com `--all`, também as do `fridge`; uma task ilegível ou com pasta e status divergentes aparece como `invalid` e não derruba a listagem.
38. Ao confirmar o Instalar no escopo de projeto, o `.gitignore` passa a ter `.fsd/cache/` e `.fsd/logs/` sem duplicar linhas nem alterar o resto; no escopo global, nenhum `.gitignore` é tocado.
39. `fsd task list --json` imprime `{"schema": 1, "tasks": [...]}`, com `slug`, `status`, `dir`, `steps` (`total`, `done`, `skipped`, `pending`, `inProgress`) e, nas inválidas, `invalid`; cada erro de `fsd task` termina com o comando que resolve, quando há um; repetir `task done`, `task archive` ou uma mudança de passo já feita sai com exit 0 sem gravar nada.

## 13. Decisões e pendências

**Decidido**

- **Distribuição**: npm, pacote `fred-ships-donuts`, comando `fsd`; o catálogo vai dentro do pacote. Uso via `npx -p fred-ships-donuts fsd init`.
- **Comandos**: binário único `fsd` com `init`, `update`, `update skill [nome]`, `-h`/`--help` e `-v`/`--version`, em `commander`. Atalhos: `-u` = `update`, `-u -s [nome]` = `update skill [nome]`. `fsd` sem argumentos mostra a ajuda. Instalar e apagar só no assistente.
- **Atualizações**: `fsd update` atualiza a CLI; `fsd update skill [nome]` atualiza as skills; `fsd init` atualiza a CLI se `autoUpdate` estiver ligado; `updateSkills` faz o `fsd update` atualizar também as skills. `Instalar` já atualiza skills desatualizadas.
- **Catálogo**: único formato `_i18n/<nome>/<lang>/`; a CLI pergunta o idioma.
- **Versão**: `metadata.version` no frontmatter, semver com pré-release.
- **Arquivos instalados**: sem `evals/` nem `README.md`.
- **Dados da CLI**: em `.fsd/` (global `~/.fsd`, projeto `./.fsd`), com `oven/`, `cache/` e `logs/`; a CLI é agnóstica a serviços de agentes (não há campo nem passo de agente); `fsd init` cria a estrutura base (4.2) ao confirmar o fluxo Instalar; `installed.json` é a fonte da verdade e a CLI não varre o diretório do Claude.
- **Preferências**: `~/.fsd/config.json` com tema, `autoUpdate` e `updateSkills`.
- **Troca do Clack pelo Ink**: o rascunho antigo usava `@clack/prompts`, que não oferece tela fixa com cabeçalho, rodapé e barra de progresso em todas as telas (apêndice A); por isso a interface foi reescrita em Ink.
- **Destino das skills**: `.fsd/skills/<nome>` em ambos os escopos (`~/.fsd/skills` e `./.fsd/skills`); a CLI cria links simbólicos `.claude/skills/<nome>` para elas. Falha no link desfaz a instalação da skill; skill de mesmo nome é conflito, com escolha entre substituir e manter a original.
- **Interface**: sem escolha de símbolos (conjunto único); voltar com `←`; no passo Skills tudo começa marcado, e a seleção altera o total de passos.
- **Catálogo**: a cópia antiga `fsd-padroes-codigo-csharp/` foi apagada; só vale `_i18n/`.
- **Interface**: Ink 8 com React >= 19.3, escrita em TSX (`jsx: react-jsx`), desenvolvida com `tsx`; fixa Node >= 22.
- **Assistente**: menu (Instalar, Apagar, Sair); fluxo Instalar com escopo, skills, idioma (condicional), auto-update, tema e resumo; fluxo Apagar com escopo, skills e resumo; barra de progresso no rodapé.
- **Tasks do `nook/` (2026-11-07)**: o agente executa o trabalho pelas skills, e a CLI só organiza os arquivos (o Oven continua conceitual nesta versão). Cada task é uma pasta com `plan.md` (spec e plano, `status` no frontmatter) e passos `NN-<slug>.yaml` com `status` próprio. O nome é o slug do título, único no `nook/`. Comandos da CLI movem as tasks entre bench → rack → fridge. O `.gitignore` do projeto recebe só `.fsd/cache/` e `.fsd/logs/`. A primeira fatia do framework `nook/` é esse ciclo (4.5, 5.5).
- **Tasks do `nook/`, detalhes (decididos pelo autor em 2026-11-07, depois das revisões do Arquiteto e do Node Typescript Developer)**: comandos `fsd task new|list|done|archive` e `fsd task step add|start|done|skip`; status dos passos `pending | in_progress | done | skipped`, e um passo que deixou de fazer sentido é fechado com `task step skip` (não há `remove`); `task done` exige os passos fechados, sem `--force`; tasks só no escopo de projeto; `task new` fora da raiz do projeto (sem `nook/` nem `.fsd/` no `cwd`) só dá erro, sem `--init`; sem volta `rack → bench` (sem `reopen`; um bug achado depois vira task nova); dependência `yaml` (eemeli/yaml); slug com mapa pequeno para `ß`, `æ`, `ø`, `ł`, `đ`, `œ`, `þ`; a skill `fsd-nook-tasks` pede confirmação antes do `done` e nunca arquiva; os passos não aparecem no assistente.

**Pendente (itens do autor)**

- **Revisão desta spec (conflito, `--force`, interrupção, testes):** ver a seção "Pontos para a revisão" no `TASKS.md`.
- **Layout**: o cabeçalho (rosquinha, nome, 35% da altura, 80 × 24 como partida) está decidido em 6.10; pendem a posição do idioma, os símbolos Unicode e a paleta final (6.7). A estética das letras de 2 e 4 linhas e a definição da rosquinha de 6 linhas seguem em evolução.
- **Utilidade do tema**: será definida pelo autor depois; a spec não assume nenhuma.
- **Próximas fatias do `nook/`**: Kitchen (contexto e regras que a skill carrega), Cookbook (formato das recipes), Bakers (formato e craft), quem leva a task do `rack` ao `fridge` além do comando, e se o Oven passa a ter estado em `.fsd/oven/`.
- **Revisar (decisões minhas)**: `update skill` cobre os escopos global e projeto (o de projeto só se existir `./.fsd/installed.json`); `updateSkills` vem desligado por padrão e é configurado no passo 4; não há flag para pular o auto-update, só a opção salva (se quiser `fsd init --no-update`, acrescentar); `fsd update` ignora o limite de 24 h.

## Apêndice A — Bibliotecas de interface avaliadas

O assistente precisa de cabeçalho e rodapé presentes em todas as telas, barra de progresso, menu, seleção múltipla com "todas", voltar com `←`, temas com cores próprias. Dados verificados no registro do npm em 2026-10-31.

| Opção | Versão | Node | Modelo | Atende o layout | Pontos de atenção |
|---|---|---|---|---|---|
| **Ink** (escolhida) | 8.0.0 | >= 22 | Tela completa com componentes React e layout flexbox | Cabeçalho, corpo e rodapé fixos são naturais; `useInput` cobre as setas; temas e símbolos viram contexto React | Exige `react >= 19.3` como peer; 23 dependências; Node >= 22 |
| @opentui/core | 0.8.0 | >= 26.4 (ou Bun >= 1.3.14) | Núcleo de renderização em Zig | Atende, com bom desempenho | Pré-1.0 com lançamentos frequentes; restringe quem consegue rodar a CLI |
| @clack/core | 1.5.1 | >= 20.12 | Prompts de baixo nível com `render` customizável | Cabeçalho, rodapé e tema desenhados em cada `render`; `esc` e voltar à mão | Sem tela fixa nem layout |
| @inquirer/core | 12.0.6 | >= 20.17 | Prompts customizados com hooks e tema | Cabeçalho e rodapé via conteúdo extra do prompt; voltar é manual | Sem tela fixa; tema próprio, não de cores livres |
| terminal-kit | 3.1.4 | >= 16.13 | API imperativa de terminal | Atende com muito código manual de layout | Estilo antigo, pouco tipado para TypeScript |
| blessed / neo-blessed | 0.1.81 / 0.2.0 | — | Widgets de tela completa | Atenderia | Sem manutenção; descartada |
| enquirer | 2.4.1 | — | Prompts simples | Não atende | Sem manutenção desde 2023; descartada |
| Sem biblioteca (`node:readline` + ANSI) | — | qualquer | Renderização própria | Atende, com controle total | Todo o código de teclado, redesenho e largura de caracteres fica conosco |

O Ink cobre o layout pronto (tela completa, componentes, cabeçalho e rodapé fixos). O Claude Code também é construído sobre ele. O custo é o Node >= 22 e o React.

Fontes: registro do npm (`npm view`) para versões e `engines`; comparação Ink x OpenTUI em <https://blog.openreplay.com/opentui-alternative-ink/> e <https://betterstack.com/community/guides/scaling-nodejs/opentui-react/>.
