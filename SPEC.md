# SPEC — fsd (Fred Ships Donuts CLI)

CLI para instalar, atualizar e remover as skills do Claude Code criadas por Frederico Jacobi.

## 1. Objetivo

Dado um catálogo de skills versionado neste repositório (`src/skills/`), permitir que qualquer máquina instale uma ou mais skills em `~/.claude/skills` (global) ou `./.claude/skills` (projeto) com um único comando, e manter um registro próprio do que foi instalado.

A CLI tem **um único binário, `fsd`**, com poucos comandos:

- `fsd init` abre o assistente interativo, onde se instala e apaga skills e se escolhe escopo, idioma, tema, símbolos e atualização.
- `fsd update` atualiza a própria CLI; `fsd update skill [nome]` atualiza as skills instaladas.
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

Exemplos: `_i18n/fsd-csharp-code-standard/{en,pt-BR}`, `_i18n/fsd-ui-approval/{en,pt-BR}`. Os idiomas de uma skill são as subpastas de `_i18n/<nome>/` que contêm `SKILL.md`. Diretórios soltos em `src/skills/` (fora de `_i18n/`) **não fazem parte do catálogo** e são ignorados pela CLI.

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
| Global | `~/.claude/skills/<nome>` | escolha "Global" no passo Escopo |
| Projeto | `<cwd>/.claude/skills/<nome>` | escolha "Local" no passo Escopo |

`~` é o `os.homedir()` (no Windows, `%USERPROFILE%`). `<cwd>` é o diretório de onde o comando foi executado; a CLI não procura a raiz do git.

### 4.2 Estrutura de diretórios da CLI

Segue `docs/FSD-ARCHITECTURE.md`. Em cada escopo há um diretório de sistema `.fsd/` e um workspace `nook/`, no mesmo nível do `.claude` do escopo:

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

Os caminhos são calculados só a partir de `os.homedir()` e do `cwd`: a CLI não procura nem lê o `.claude/` para decidir onde `.fsd/` e `nook/` ficam. No escopo de projeto, `.fsd/installed.json` e `nook/` são versionáveis junto com o repositório, a critério do usuário; a CLI não mexe no `.gitignore`.

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
      "path": "/home/fulano/.claude/skills/fsd-csharp-code-standard",
      "installedAt": "2026-10-31T12:00:00.000Z",
      "updatedAt": "2026-10-31T12:00:00.000Z"
    }
  }
}
```

**O registro é a fonte da verdade.** A CLI sabe o que instalou e onde olhando o `installed.json`, e não procurando em `.claude/`. O estado exibido nos passos de skills, a atualização e o `Apagar` nunca varrem o diretório do Claude: leem o registro e agem no `path` gravado (absoluto, definido na instalação).

### 4.4 Estado de uma skill

O estado vem da comparação entre a versão registrada e o `metadata.version` do catálogo, pela precedência do semver 2.0.0 (seção 11 da especificação em semver.org): `1.0.0-alpha.2 < 1.0.0-alpha.10 < 1.0.0-beta < 1.0.0`. O comparador é implementado em `skills.ts`, sem dependência extra; metadados de build (`+...`) são ignorados.

| Estado | Condição |
|---|---|
| `not installed` | não consta em `installed.json` |
| `up to date` | versão registrada >= catálogo |
| `outdated` | versão registrada < catálogo |
| `missing` | consta em `installed.json` mas a pasta do `path` gravado não existe mais (foi apagada à mão) |

`missing` é resolvido por `Instalar` (reinstala e atualiza o registro) ou por `Apagar` (só limpa a entrada). Se `installed.json` estiver ausente ou ilegível, o estado de todas as skills é `not installed`; nada é descoberto nem apagado no diretório do Claude.

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
| comando ou opção desconhecidos | Mensagem de erro do commander, indicação de `fsd --help` e exit 1. |

Não existem `list`, `install` nem `uninstall`: o que faziam está no assistente (6.2 e 6.8). `fsd -h` lista `init`, `update` e `update skill`, com os atalhos.

**Atalhos `-u` e `-s`.** `-u` (`--update`) equivale ao comando `update`, e `-s` (`--skill`, com `nome` opcional) equivale a `skill`. Os atalhos são opções da raiz que o `fsd.ts` traduz para os comandos antes de despachar:

- Cada atalho tem o efeito da palavra que representa, então as formas se misturam: `fsd update skill [nome]`, `fsd update -s [nome]`, `fsd -u skill [nome]` e `fsd -u -s [nome]` fazem a mesma coisa.
- `-s` só faz sentido dentro de `update`; `fsd -s` sozinho é erro de uso (exit 1).
- `-u` e `-s` podem vir combinados (`fsd -us [nome]`) e em qualquer ordem (`fsd -s [nome] -u`).
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
- Lê o `installed.json` do escopo global e, se existir, o do projeto (`<cwd>/.fsd/`). Age no `path` e no idioma gravados; não varre `.claude/`.
- Uma skill registrada com versão menor que a do catálogo recebe `upgrade` (mesmas regras de 6.2). Em dia vira `skip (up to date)`. `missing` é reinstalada.
- Não instala skills novas (isso é o `Instalar` do assistente).
- `nome` que não consta em nenhum registro: `skill <nome> is not installed`, exit 1. `nome` que não existe mais no catálogo: `skill <nome> not found in catalog`, exit 1.
- Não abre o assistente, não exige TTY e imprime uma linha de resultado por skill. Exit 0, ou 1 se houve falha.

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

- **Cabeçalho**: logotipo, nome da CLI, versão da CLI (a de `package.json`) e outros itens ainda a definir (6.7). Aparece em todas as telas.
- **Corpo**: um passo por tela.
- **Rodapé**: barra de progresso (6.4) e a dica de teclas do passo (ex.: `↑↓ mover · espaço marcar · enter confirmar · esc voltar`).

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
| 1 | Escopo | Global (`~/.claude/skills`) ou local (`./.claude/skills`) | |
| 2 | Skills | `Selecionar todas` ou escolha individual | Cada item mostra nome, versão, idiomas disponíveis e o estado no escopo (4.4). |
| 3 | Idioma | Idiomas das skills escolhidas | **Condicional**: só aparece se alguma skill escolhida tem mais de um idioma. |
| 4 | Atualização | Duas opções: atualizar a CLI ao abrir `fsd init` (`autoUpdate`) e fazer o `fsd update` atualizar também as skills (`updateSkills`) | Seção 7. |
| 5 | Tema | Dracula, Apple Lisa, Windows 98, Dark Night | O usuário escolhe as cores; pré-visualização na própria tela. |
| 6 | Símbolos | Conjunto de símbolos usado na interface | Conjuntos a definir (6.7). |
| 7 | Resumo | Tudo que foi escolhido + confirmar e instalar | Último passo. Ao confirmar, cria a estrutura base (4.2), executa a instalação e mostra o resultado de cada skill. |

Regras da instalação, aplicadas ao confirmar o resumo:

1. "Já instalada" significa constar no `installed.json` do escopo. Se consta: com a versão do catálogo maior, instala por cima (`upgrade`); igual ou menor, `skip (up to date)`, sem erro.
2. Estado `missing` (consta no registro, pasta apagada à mão): reinstala e atualiza o registro.
3. Se **não** consta no registro mas a pasta `<destino>/<nome>/` já existe (criada por outros meios), é um **conflito**. O resumo lista cada conflito e pergunta se sobrescreve; o padrão é não (`skip` com aviso). Essa é a única checagem no sistema de arquivos do Claude, feita no momento de gravar.
4. Instalar por cima remove a pasta registrada e copia de novo (substituição completa, sem merge, para não deixar arquivos órfãos).
5. Cria o diretório de destino se não existir. Preserva o bit de execução dos scripts (`scripts/*.py`).
6. Registra a skill em `.fsd/installed.json` do escopo (idioma, versão, caminho e datas). Nada é gravado dentro da pasta da skill. O registro só é gravado depois da cópia ter dado certo.
7. Skill com um único idioma pula o passo de idioma (3) e instala esse idioma.
8. A estrutura base (4.2) é criada pelo assistente ao confirmar o resumo, antes de chamar as ações de instalação. `actions/install.ts` **não** cria a estrutura base (só o destino da skill e o `installed.json`), para que `fsd update skill` nunca a crie.

Navegação: `enter` avança, `esc` volta ao passo anterior mantendo as escolhas, `ctrl+c` cancela sem escrever nada (exit 130). Nada é gravado em disco antes da confirmação no resumo.

Implementação: cada passo é um componente Ink em `.tsx`; `useInput` trata as teclas, e cabeçalho e rodapé são componentes comuns a todas as telas.

### 6.3 Resultado

Depois de confirmar o resumo, cada skill mostra uma linha de resultado (`install`, `upgrade`, `remove` ou `skip`, com versão, idioma e destino), no estilo do tema escolhido. A CLI termina com exit 0, ou 1 se houve falha de I/O. A confirmação do fluxo Instalar também grava as preferências (8.2).

### 6.4 Barra de progresso do rodapé

- No fluxo Instalar a barra representa os passos 1 a 7 (o menu não conta); no fluxo Apagar (6.8), os passos 1 a 3. Cada passo concluído preenche sua fração: `passos concluídos / total de passos`.
- Se o passo 3 (idioma) não se aplica, o total do fluxo Instalar passa de 7 para 6 e a barra é recalculada.
- A barra fica **cheia ao concluir o último passo** (o resumo). Em um passo ainda em andamento ela mostra só os passos já concluídos.
- Voltar com `esc` diminui a barra.
- Com `NO_COLOR` ou terminal sem cor, a barra usa só os símbolos do conjunto escolhido, sem cor.

### 6.5 Temas e símbolos

- Um tema define as cores da interface: cabeçalho, título do passo, item em foco, item marcado, dica de teclas, barra de progresso (parte cheia e vazia), sucesso, aviso e erro.
- Temas iniciais: **Dracula**, **Apple Lisa**, **Windows 98**, **Dark Night**. A paleta exata de cada um fica para a implementação.
- Os símbolos (marcador de seleção, setas, preenchimento da barra, moldura) formam um conjunto escolhível independente do tema.
- Tema e símbolos escolhidos valem para o restante da execução e entram no resumo. Eles são persistidos (8.2) e valem desde as primeiras telas nas execuções seguintes.
- A utilidade do tema além da aparência será definida depois pelo autor; a spec não assume nenhuma.

### 6.6 Entrada sem terminal

O assistente nunca abre sem TTY (`fsd init`). Ver 5.1.

### 6.7 Pendências do layout

1. **Logotipo e itens do cabeçalho**: desenho do logotipo e quais "outras" informações entram (ex.: destino atual, link, autor).
2. **Posição do idioma**: confirmar que o passo de idioma fica logo após o passo 2.
3. **Opções de símbolos**: quais conjuntos existem (ex.: Unicode, ASCII, Nerd Font) e se há detecção automática de terminal sem Unicode.
4. **Largura do terminal**: comportamento em terminais estreitos (o logotipo pode ser omitido abaixo de uma largura mínima).
5. **Paletas dos temas**: cores exatas de Dracula, Apple Lisa, Windows 98 e Dark Night.

### 6.8 Fluxo Apagar

| # | Passo | Conteúdo | Observação |
|---|---|---|---|
| 1 | Escopo | Global ou local | |
| 2 | Skills | Skills que constam no `installed.json` do escopo, com versão, idioma e estado (`missing` incluído) | Lê só o registro; nada é descoberto em `.claude/`. Escolha individual ou `Selecionar todas`. |
| 3 | Resumo | Skills a apagar + confirmar | Último passo. Ao confirmar, apaga. |

- Remove a pasta registrada (campo `path`) e a entrada do registro. Skill `missing`: só limpa a entrada.
- Nunca apaga pastas que o usuário criou por outros meios; só o que está no registro.
- Se o escopo não tem nenhuma skill registrada, mostra `nothing installed` e volta ao menu.
- Não altera `config.json`.

## 7. Atualização da CLI

"Atualização" aqui é a da **própria CLI**. A das skills é o `Instalar` do assistente e o `fsd update skill` (5.3).

Há dois gatilhos:

- **`fsd update`** (5.2): atualiza a CLI quando o usuário manda, sempre.
- **`fsd init`**: atualiza a CLI automaticamente antes de abrir o menu, se `autoUpdate` estiver ligado. Para não atualizar ao usar `fsd init`, o usuário desliga `autoUpdate` (passo 4 do assistente, 8.2).

Regras comuns:

- `autoUpdate: true | false` e `updateSkills: true | false` ficam na configuração (8.2). Padrões sugeridos no passo 4: `autoUpdate` ligado e `updateSkills` desligado.
- A CLI consulta o registro do npm pela última versão publicada de si mesma. Se houver versão maior que a instalada, atualiza.
- No auto-update (`fsd init`), a consulta é limitada: timeout curto (2 s), no máximo uma vez a cada 24 h (a hora da última checagem fica na configuração), e qualquer falha de rede é ignorada em silêncio. Nunca bloqueia nem quebra o assistente. No `fsd update` explícito não há limite de 24 h, e a falha de rede é reportada com exit 1.
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
| `fsd update skill <nome>` não instalada | `skill <nome> is not installed` | 1 |
| `fsd update skill <nome>` fora do catálogo | `skill <nome> not found in catalog` | 1 |
| `fsd update` sem rede | mensagem de falha da consulta ao npm | 1 |
| `fsd update` via `npx` | `nothing to update (not installed globally)` | 0 |
| Skill sem versão válida no catálogo | `skill x: missing or invalid 'metadata.version' in SKILL.md` | 1 |
| Pasta existe fora do registro e o usuário não autorizou sobrescrever | `skip <nome> (folder exists and is not managed by fsd)` | 0 |
| `installed.json` ou `config.json` ilegível | segue com os padrões / `not installed`, sem erro | 0 |
| Cancelado no assistente (`ctrl+c`) | `cancelled` | 130 |
| Falha de I/O (permissão, disco) | mensagem do Node + caminho | 1 |
| Sucesso, incluindo `skip` | — | 0 |


### 8.2 Configuração persistida

As preferências do assistente ficam em `~/.fsd/config.json`. É uma configuração do usuário: **não existe `config.json` no escopo de projeto**.

```json
{
  "schema": 1,
  "theme": "dracula",
  "symbols": "unicode",
  "autoUpdate": true,
  "updateSkills": false,
  "lastUpdateCheck": "2026-10-31T12:00:00.000Z"
}
```

- Escopo e seleção de skills **não** são persistidos; só tema, símbolos, `autoUpdate` e `updateSkills` (mais o `lastUpdateCheck`).
- O arquivo é lido ao abrir a CLI: tema e símbolos gravados valem já no cabeçalho e no menu, e os passos 4 a 6 vêm pré-selecionados com os valores gravados.
- É gravado só quando o usuário confirma o resumo do fluxo Instalar, junto com a instalação. Cancelar e o fluxo Apagar não gravam nada.
- Arquivo ausente, ilegível ou com `schema` desconhecido: a CLI usa os padrões, sem erro, e o sobrescreve na próxima confirmação.

## 9. Estrutura do código

```
src/
  cli/
    fsd.ts              # bin `fsd`: shebang e definição dos comandos (commander); só importa ui/ dentro de `init`, via import dinâmico
    commands/
      init.ts           # valida TTY, aplica auto-update e abre o assistente
      update.ts         # `fsd update` (CLI) e `fsd update skill [nome]`
    skills.ts           # catálogo: listSkills(), readSkill(), skillsTarget(project), copySkill()
    fsdDir.ts           # ~/.fsd e ./.fsd (e nook/): estrutura base, leitura e gravação atômica
    registry.ts         # installed.json: registrar, consultar, remover entradas e estado (4.4)
    config.ts           # config.json: tema, símbolos, autoUpdate, lastUpdateCheck
    selfUpdate.ts       # verificação e atualização da própria CLI (7)
    actions/
      install.ts        # regras de instalação e upgrade (6.2), sem UI; usado pelo assistente e por `update skill`
      uninstall.ts      # regras de remoção (6.8), sem UI
    ui/                 # assistente (6), em Ink + TSX
      App.tsx
      Header.tsx
      Footer.tsx
      steps/*.tsx
      theme.ts          # temas e símbolos (contexto React)
      progress.ts       # lista de passos e cálculo da barra (funções puras)
  skills/               # catálogo (conteúdo, não é código)
    _i18n/<nome>/<lang>/
```

- A lógica de catálogo fica em `skills.ts`, a de registro e configuração em `registry.ts`/`config.ts`, e as regras de instalar e apagar em `actions/`. Os componentes só chamam essas funções, para a lógica ser testável sem terminal.
- O cálculo da barra e a lista de passos são funções puras (`progress.ts`), separadas da renderização.
- `fsd.ts` importa `ui/` só dentro de `fsd init` (import dinâmico), então `fsd -v`, `fsd -h` e `fsd update` não pagam o custo do React.

## 10. Empacotamento

- Nome do pacote npm: **`fred-ships-donuts`**.
- `package.json`: `bin` é `{ "fsd": "./dist/cli/fsd.js" }`, `files: ["dist", "src/skills"]`, `engines.node` é `>=22`.
- `ink` e `react` ficam em `dependencies`; `@types/react`, `tsx` e `ink-testing-library` em `devDependencies`. `commander` fica em `dependencies`; `@clack/prompts` sai.
- `tsconfig.json` com `jsx: react-jsx`; `tsc` compila os `.tsx` para `dist/`.
- `tsc` não copia `.md`/`.py`, por isso o catálogo é lido de `src/skills` e não de `dist`.
- `dist/cli/fsd.js` precisa do bit de execução e do shebang.
- Antes de publicar, conferir o conteúdo com `npm pack --dry-run`: precisa conter `dist/` e `src/skills/_i18n/`.
- O pacote se chama `fred-ships-donuts` e o comando é `fsd`. Como o nome do binário difere do nome do pacote, o `npx` não o escolhe sozinho: o uso é `npx -p fred-ships-donuts fsd init`.
- Distribuição por npm: `npx -p fred-ships-donuts fsd init` ou instalação global (`npm i -g fred-ships-donuts`); as versões novas chegam por `fsd update`, pelo auto-update do `fsd init` (7) ou reinstalando.

## 11. Testes

- **Unitários** (`node:test`): `listSkills`, `skillsTarget`, leitura de frontmatter, comparação de versões, filtro de `evals/` e `README.md`.
- **Registro e configuração**: `registry.ts` e `config.ts` (arquivo ausente, ilegível e de `schema` desconhecido; gravação atômica; estados `not installed`, `up to date`, `outdated`, `missing`).
- **Ações**: `actions/install.ts` e `actions/uninstall.ts` com `HOME` e `cwd` apontando para diretórios temporários, conferindo a árvore resultante em instalação, reinstalação, `upgrade`, conflito (com e sem autorização), escopo de projeto e remoção.
- **Auto-update**: a decisão de checar (autoUpdate, intervalo de 24 h, instalação global vs `npx`) como função pura, sem rede.
- **Atalhos**: `-u` e `-s` equivalem a `update` e `skill`, em todas as combinações (`fsd -u`, `fsd -u -s [nome]`, `fsd update -s [nome]`, `fsd -u skill [nome]`, `-us`, `-su`); `fsd -s` sozinho e atalho misturado com outro comando saem com 1.
- **`update skill`**: com `HOME` e `cwd` temporários, todas as skills, uma só, nome não instalado, nome fora do catálogo, em dia (`skip`) e `missing`.
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
7. No escopo de projeto, o assistente escreve só em `./.claude/skills`, `./.fsd` e `./nook`, e não toca em `~/.claude`, `~/.fsd` nem `~/nook`, exceto o `config.json` (8.2).
8. Instalar uma skill registrada com versão menor que a do catálogo faz `upgrade` e mantém o registro coerente.
9. `Apagar` remove apenas as skills escolhidas e as entradas delas no registro.
10. Uma pasta em `.claude/skills` que não consta no registro nunca é alterada sem autorização no resumo, e nunca é removida pelo `Apagar`.
11. Apagar a pasta de uma skill à mão faz o assistente mostrar `missing`; instalar a restaura e `Apagar` limpa a entrada.
12. No assistente, `ctrl+c` não grava nada em `~/.fsd` nem em `.claude`; `esc` volta ao passo anterior mantendo as escolhas.
13. A barra de progresso chega a 100% somente ao concluir o resumo, e usa 6 passos no fluxo Instalar quando o idioma não se aplica.
14. Tema, símbolos e auto-update escolhidos aparecem pré-selecionados e valem desde as primeiras telas na execução seguinte.
15. Com `autoUpdate: false`, `fsd init` não faz nenhuma consulta de rede; `fsd update` continua atualizando a CLI.
16. `fsd -u` equivale a `fsd update`, e `fsd -u -s [nome]` a `fsd update skill [nome]`; `fsd -s` sozinho sai com 1.
17. `fsd update skill` atualiza todas as skills desatualizadas; `fsd update skill <nome>` atualiza só aquela; ambos saem com 0 quando tudo está em dia.
18. Com `updateSkills: true`, `fsd update` atualiza a CLI e depois as skills usando a versão nova da CLI.
19. O menu do assistente não tem "Atualizar": `Instalar` atualiza as skills desatualizadas.
20. Confirmar o fluxo Instalar cria `nook/kitchen`, `nook/bakers`, `.fsd/oven`, `.fsd/cache` e `.fsd/logs` no escopo escolhido (em `~` no global); cancelar, `fsd init` ao abrir e o fluxo Apagar não criam nada.

## 13. Decisões e pendências

**Decidido**

- **Distribuição**: npm, pacote `fred-ships-donuts`, comando `fsd`; o catálogo vai dentro do pacote. Uso via `npx -p fred-ships-donuts fsd init`.
- **Comandos**: binário único `fsd` com `init`, `update`, `update skill [nome]`, `-h`/`--help` e `-v`/`--version`, em `commander`. Atalhos: `-u` = `update`, `-u -s [nome]` = `update skill [nome]`. `fsd` sem argumentos mostra a ajuda. Instalar e apagar só no assistente.
- **Atualizações**: `fsd update` atualiza a CLI; `fsd update skill [nome]` atualiza as skills; `fsd init` atualiza a CLI se `autoUpdate` estiver ligado; `updateSkills` faz o `fsd update` atualizar também as skills. `Instalar` já atualiza skills desatualizadas.
- **Catálogo**: único formato `_i18n/<nome>/<lang>/`; a CLI pergunta o idioma.
- **Versão**: `metadata.version` no frontmatter, semver com pré-release.
- **Arquivos instalados**: sem `evals/` nem `README.md`.
- **Dados da CLI**: em `.fsd/` (global `~/.fsd`, projeto `./.fsd`), com `oven/`, `cache/` e `logs/`; a CLI é agnóstica a serviços de agentes (não há campo nem passo de agente); `fsd init` cria a estrutura base (4.2) ao confirmar o fluxo Instalar; `installed.json` é a fonte da verdade e a CLI não varre o diretório do Claude.
- **Preferências**: `~/.fsd/config.json` com tema, símbolos, `autoUpdate` e `updateSkills`.
- **Troca do Clack pelo Ink**: o rascunho antigo usava `@clack/prompts`, que não oferece tela fixa com cabeçalho, rodapé e barra de progresso em todas as telas (apêndice A); por isso a interface foi reescrita em Ink.
- **Catálogo**: a cópia antiga `fsd-padroes-codigo-csharp/` foi apagada; só vale `_i18n/`.
- **Interface**: Ink 8 com React >= 19.3, escrita em TSX (`jsx: react-jsx`), desenvolvida com `tsx`; fixa Node >= 22.
- **Assistente**: menu (Instalar, Apagar, Sair); fluxo Instalar com escopo, skills, idioma (condicional), auto-update, tema, símbolos e resumo; fluxo Apagar com escopo, skills e resumo; barra de progresso no rodapé.

**Pendente (itens do autor)**

- **Layout** (hoje provisório na implementação): logotipo e cabeçalho, posição do idioma, conjuntos de símbolos, largura mínima do terminal e paletas dos temas (6.7).
- **Utilidade do tema**: será definida pelo autor depois; a spec não assume nenhuma.
- **Revisar (decisões minhas)**: `update skill` cobre os escopos global e projeto (o de projeto só se existir `./.fsd/installed.json`); `updateSkills` vem desligado por padrão e é configurado no passo 4; não há flag para pular o auto-update, só a opção salva (se quiser `fsd init --no-update`, acrescentar); `fsd update` ignora o limite de 24 h.

## Apêndice A — Bibliotecas de interface avaliadas

O assistente precisa de cabeçalho e rodapé presentes em todas as telas, barra de progresso, menu, seleção múltipla com "todas", voltar com `esc`, temas com cores próprias e símbolos intercambiáveis. Dados verificados no registro do npm em 2026-10-31.

| Opção | Versão | Node | Modelo | Atende o layout | Pontos de atenção |
|---|---|---|---|---|---|
| **Ink** (escolhida) | 8.0.0 | >= 22 | Tela completa com componentes React e layout flexbox | Cabeçalho, corpo e rodapé fixos são naturais; `useInput` cobre `esc`/setas; temas e símbolos viram contexto React | Exige `react >= 19.3` como peer; 23 dependências; Node >= 22 |
| @opentui/core | 0.8.0 | >= 26.4 (ou Bun >= 1.3.14) | Núcleo de renderização em Zig | Atende, com bom desempenho | Pré-1.0 com lançamentos frequentes; restringe quem consegue rodar a CLI |
| @clack/core | 1.5.1 | >= 20.12 | Prompts de baixo nível com `render` customizável | Cabeçalho, rodapé e tema desenhados em cada `render`; `esc` e voltar à mão | Sem tela fixa nem layout |
| @inquirer/core | 12.0.6 | >= 20.17 | Prompts customizados com hooks e tema | Cabeçalho e rodapé via conteúdo extra do prompt; voltar é manual | Sem tela fixa; tema próprio, não de cores livres |
| terminal-kit | 3.1.4 | >= 16.13 | API imperativa de terminal | Atende com muito código manual de layout | Estilo antigo, pouco tipado para TypeScript |
| blessed / neo-blessed | 0.1.81 / 0.2.0 | — | Widgets de tela completa | Atenderia | Sem manutenção; descartada |
| enquirer | 2.4.1 | — | Prompts simples | Não atende | Sem manutenção desde 2023; descartada |
| Sem biblioteca (`node:readline` + ANSI) | — | qualquer | Renderização própria | Atende, com controle total | Todo o código de teclado, redesenho e largura de caracteres fica conosco |

O Ink cobre o layout pronto (tela completa, componentes, cabeçalho e rodapé fixos). O Claude Code também é construído sobre ele. O custo é o Node >= 22 e o React.

Fontes: registro do npm (`npm view`) para versões e `engines`; comparação Ink x OpenTUI em <https://blog.openreplay.com/opentui-alternative-ink/> e <https://betterstack.com/community/guides/scaling-nodejs/opentui-react/>.
