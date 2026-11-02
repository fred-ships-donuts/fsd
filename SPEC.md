# SPEC — fsd (Fred Ships Donuts CLI)

CLI para instalar, atualizar e remover as skills do Claude Code criadas por Frederico Jacobi.

## 1. Objetivo

Dado um catálogo de skills versionado neste repositório (`src/skills/`), permitir que qualquer máquina instale uma ou mais skills em `~/.fsd/skills` (global) ou `./.fsd/skills` (projeto) com um único comando, e manter um registro próprio do que foi instalado.

A CLI tem **um único binário, `fsd`**, com poucos comandos:

- `fsd init` abre o assistente interativo, onde se instala e apaga skills e se escolhe escopo, idioma, tema e atualização.
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

Os caminhos são calculados só a partir de `os.homedir()` e do `cwd`: a CLI não procura nem lê outros diretórios para decidir onde `.fsd/` e `nook/` ficam. No escopo de projeto, `.fsd/installed.json` e `nook/` são versionáveis junto com o repositório, a critério do usuário; a CLI não mexe no `.gitignore`.

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
| comando ou opção desconhecidos | Mensagem de erro do commander, indicação de `fsd --help` e exit 1. |

Não existem `list`, `install` nem `uninstall`: o que faziam está no assistente (6.2 e 6.8). `fsd -h` lista `init`, `update`, `update skill` e `link skill`, com os atalhos.

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

- **Cabeçalho**: na tela inicial, o emoji 🍩 em blocos de quadrante, com metade do maior tamanho que a janela permite (a origem é uma grade de 192 × 96 sub-pixels, reduzida em `donutArt.ts`; o VTE não mostra imagens), o nome em letras de bloco engrossadas (traço com uma coluna a mais), numa linha só (`FRED SHIPS DONUTS`, a rosquinha mantém o formato redondo inteiro, e as letras seguem a altura visível dela, com precisão de meia linha; a rosquinha encolhe até frase e rosquinha caberem lado a lado), a versão da CLI (a de `package.json`), o escopo e o passo atual nos passos, o link do projeto e o autor (6.7). Só a tela inicial mostra o 🍩 grande; nos passos, o cabeçalho é uma linha. Para o terminal de 112 × 35 (110 colunas úteis, descontado o padding da raiz), o cabeçalho ocupa a largura toda e tem 14 linhas. A rosquinha é uma elipse de 14 linhas que ocupa cerca de 30% da largura da tela (34 colunas); a rosquinha fica à esquerda e as palavras à direita dela, junto da moldura. O tamanho é fixo, independente do terminal. A frase fica à direita, uma palavra por linha, centralizada na altura da rosquinha. Sem cor, volta o logotipo de uma linha.
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
8. A estrutura base (4.2) é criada pelo assistente na fase Preparar (6.9), depois da confirmação do resumo. `actions/install.ts` **não** a cria (só o destino da skill e o `installed.json`), para que `fsd update skill` nunca a crie.
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

1. ~~**Logotipo e itens do cabeçalho**~~: decidido. O emoji 🍩 em tamanho grande, gerado uma vez a partir da fonte Noto Color Emoji e guardado em `emojiDonut.ts` (a CLI não depende da fonte em tempo de execução); `F S D`, escopo e passo, link e autor. O destino (`~/.fsd/skills`) saiu do cabeçalho.
2. **Posição do idioma**: confirmar que o passo de idioma fica logo após o passo 2.
3. **Símbolos**: o conjunto Unicode único atual é provisório; falta decidir se há alternativa para terminais sem Unicode.
4. **Largura do terminal**: comportamento em terminais estreitos (o logotipo pode ser omitido abaixo de uma largura mínima).
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

```
src/
  cli/
    fsd.ts              # bin `fsd`: shebang e definição dos comandos (commander); só importa ui/ dentro de `init`, via import dinâmico
    commands/
      link.ts           # `fsd link skill [nome]`
      init.ts           # valida TTY, aplica auto-update e abre o assistente
      update.ts         # `fsd update` (CLI) e `fsd update skill [nome]`
    args.ts             # tradução dos atalhos -u, -s e -f para os comandos longos (puro)
    link.ts             # link simbólico .claude/skills/<nome> -> .fsd/skills/<nome>
    skills.ts           # catálogo: listSkills(), readSkill(), skillsTarget(project), copySkill()
    fsdDir.ts           # ~/.fsd e ./.fsd (e nook/): estrutura base, leitura e gravação atômica
    registry.ts         # installed.json: registrar, consultar, remover entradas e estado (4.4)
    config.ts           # config.json: tema, autoUpdate, lastUpdateCheck
    run.ts              # motor de fases (6.9): verificar, preparar, aplicar, registrar, concluir
    recovery.ts         # diário da execução, desfazer e recuperação de execução morta
    ops.ts              # operações de arquivo injetáveis (copiar, mover, link, gravar)
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

- `run.ts` executa os planos das `actions/` em fases e recebe, opcionalmente, as operações que podem falhar (copiar, mover, criar o link, gravar registro e config) como parâmetro, com as reais por padrão. Os testes de rollback injetam a falha por esse ponto, sem depender de permissões do sistema de arquivos.
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
- **Atalhos**: `-u`, `-s` e `-f` equivalem a `update`, `skill` e `--force`, como argumentos separados e **na ordem** `-u -s -f` (`fsd -u`, `fsd -u -s [nome]`, `fsd -u -s -f [nome]`, `fsd update -s [nome]`, `fsd -u skill [nome]`, `fsd update skill -f`, `fsd link -s -f [nome]`); `fsd -s` sozinho, `-f` sem `skill`, atalho misturado com outro comando, atalhos fora de ordem (`-s -u`, `-f -s`) e agrupados (`-us`, `-usf`) saem com 1.
- **`update skill`**: com `HOME` e `cwd` temporários, todas as skills, uma só, nome não instalado, nome fora do catálogo, em dia (`skip`) e `missing`; conflito sem `--force` (original intacta, mensagem, exit 1, demais skills processadas), com `--force` e com `-f` (original substituída, link nosso), `--force` sem conflito (nada muda) e skill com `linked: false` (só a pasta é atualizada, o link não é tocado).
- **`link skill`**: sem `nome` e com `nome`; skill `linked: false` com caminho livre (cria o link e grava `linked: true`), com original no lugar sem `--force` (nada muda, exit 1) e com `--force`/`-f` (substitui); já ligada (`skip`); nome não instalado; os dois escopos.
- **Passo Conflitos**: aparece só com conflito e muda o total de passos; as três escolhas (`keep`, `unlinked`, `replace`) por conflito, o padrão `keep`, e a escolha `unlinked` indisponível quando a original está em `.fsd/skills/<nome>`; em cada uma, a árvore resultante e o registro (`linked: false` quando for o caso); o `Apagar` de uma skill `unlinked` não toca a original.
- **Interrupção**: com o assistente (`ink-testing-library`), `ctrl+c` em **cada** passo do fluxo Instalar, inclusive no resumo antes do `enter`, e conferir que o disco ficou idêntico; em seguida, instalar normalmente no mesmo `HOME`/`cwd` e conferir a árvore exata (regra 10): sem erro, sem sobras, sem pasta ou link duplicado e sem link faltando; repetir a instalação e conferir que nada muda.
- **Rollback**: falha injetada (6.2 regra 9 e seção 9) em cada passo (copiar, criar o link, registrar) em instalação nova, `upgrade` e `replace`: nada da tentativa permanece, a versão anterior e a original voltam byte a byte, e não sobra pasta de apoio. **Estes testes não dependem de permissões nem de plataforma e não são pulados** em root, em outro usuário ou no Windows; só se pula um teste quando nem a fixture temporária pode ser criada.
- **Fases (6.9)**: falha injetada em cada fase 1 a 4 desfaz a execução inteira (inclusive as skills que já tinham sido aplicadas), e depois da fase 4 nada é desfeito; estado que muda entre o resumo e a fase Verificar; `ctrl+c`/`SIGTERM` entre operações; `Apagar` e `update skill` pelas mesmas fases; o `fsd init` ao abrir e o `lastUpdateCheck` em memória não criam arquivo algum.
- **Recuperação (regra 11 e 6.9)**: criar à mão um `run-<id>/` com diário de uma execução morta (e outro de uma execução viva) e conferir a recuperação ou o `another fsd run is in progress`. Em ambos os casos a pasta de preparo `*.fsd-new-*` da execução morta também some, e a tentativa seguinte não vê falso conflito.
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

**Pendente (itens do autor)**

- **Revisão desta spec (conflito, `--force`, interrupção, testes):** ver a seção "Pontos para a revisão" no `TASKS.md`.
- **Layout** (hoje provisório na implementação): logotipo e cabeçalho, posição do idioma, largura mínima do terminal e paleta final (6.7).
- **Utilidade do tema**: será definida pelo autor depois; a spec não assume nenhuma.
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
