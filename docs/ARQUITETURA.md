# Arquitetura do código

Como o código de `src/cli/` está dividido, por que, e onde entra cada coisa nova. (`docs/FSD-ARCHITECTURE.md` descreve o produto; a seção "Code layout" abaixo tem a árvore de arquivos.)

## Camadas

```
fsd.ts ──► commands/ ──┐
                       ├──► engine/ ──► plan/ ──► core/
ui/ ────► wizard/ ─────┘
```

| Camada | Responsabilidade | Pode importar |
|---|---|---|
| `core/` | Domínio e disco: escopos e caminhos, catálogo, registro, configuração, conflitos, leitura do diário, formato dos arquivos de task, versões, npm. Só lê, exceto as gravações atômicas de um arquivo (JSON e texto) de `core/fs.ts` e o arquivo de trava de `core/lock.ts` (`.fsd/cache/lock`, `O_EXCL`). | `node:` e bibliotecas puras de formato de dados, cada uma isolada num único módulo (hoje: `yaml`, só em `core/taskFiles.ts`) |
| `plan/` | Planejadores: leem o disco e devolvem um `Plan` com o que fazer e o resultado de cada skill. **Nunca escrevem.** | `core/` |
| `engine/` | Executa um `Plan` em fases (6.9), com diário, desfazer e recuperação. Toda mudança com mais de uma operação passa por aqui; uma gravação de um arquivo só usa `core/fs.ts`. | `core/`, `plan/` |
| `commands/` | Um arquivo por comando da CLI: valida a entrada, chama planejador e motor, imprime e devolve o exit code. | `core/`, `plan/`, `engine/` |
| `wizard/` | Regras do assistente sem React: passos, escolhas, o que as telas mostram, executar depois do resumo. | `core/`, `plan/`, `engine/` |
| `ui/` | Só apresentação, em Ink: telas, componentes, cabeçalho, arte em células, escrita no terminal. | `wizard/`; de `core/`, `plan/` e `engine/` só tipos e o que é de exibição (`version`, `phases`, `formatResult`) |
| `fsd.ts` | Ponto de entrada: atalhos (`args.ts`), commander e exit code. Nenhuma regra. | `commands/` |

Regras:

1. **Dependência só para baixo.** Nada de `core/`, `plan/`, `engine/` ou `wizard/` importa React, Ink ou commander. `ui/` não importa de `commands/` (os códigos de saída estão em `exitCodes.ts`, compartilhado).
2. **Ler e escrever separados.** Quem decide (`plan/`) não escreve. Escrever é com o `engine/` (várias operações, com desfazer) ou com as gravações atômicas de `core/fs.ts` (um arquivo). O que uma camada precisa saber do disco para decidir e o motor precisa conferir na fase Verificar (os conflitos, o diário de execuções mortas) fica em `core/`, para os dois usarem a mesma resposta.
3. **Uma regra, um lugar.** Texto de resultado (`formatResult`), escopos com registro (`installedScopes`), "este caminho é um link para aquele" (`isLinkTo`), códigos de saída e os textos da interface (`ui/labels.ts`) existem uma vez só.
4. **Dependências injetáveis nas bordas.** O motor recebe `Ops` (as operações de arquivo) e `now`; os comandos recebem `Io`, `Env` e as dependências de rede/npm, com as reais por padrão.

## Por dentro de cada camada

**`core/`**: `scope.ts` (onde ficam `.fsd/`, `nook/` e o cache de cada escopo), `fs.ts` (consultas ao disco, `writeJsonAtomic`, `writeTextAtomic` e `updateTextFile`, que compara o conteúdo antes de gravar), `semver.ts`, `catalog.ts`, `registry.ts`, `config.ts`, `claudeLink.ts`, `conflicts.ts`, `gitignore.ts` (as linhas de `.fsd/cache/` e `.fsd/logs/` que faltam no `.gitignore` do projeto e o texto com elas, puro), `runJournal.ts` (formato do diário e quais execuções estão mortas), `selfUpdate.ts`, `package.ts` (raiz, nome e versão do pacote), `slug.ts` (nome de task e de passo a partir do título), `taskFiles.ts` (formato do `plan.md` e dos passos, puro, o único que importa `yaml`) e `nook.ts` (tasks do `nook/`: localizar, ler e validar, só leitura).

**`plan/`**: `types.ts` (o `Plan`, seus itens e `emptyPlan`/`addItem`), `install.ts`, `uninstall.ts`, `link.ts`, `task.ts` (`task done|archive`: decide a mudança de pasta e o novo `plan.md`, ou a recusa, puro).

**`engine/`**: `transactionRun.ts` é o núcleo genérico de uma execução (trava do projeto, `core/lock.ts`, e recuperação de execuções mortas, diário, `SIGINT`/`SIGTERM`, ponto de não retorno, Concluir, desfazer e eventos de fase); cada cliente dá a sua fase Verificar e o trabalho entre ela e o `commit`, com as próprias fases, e decide o que grava (o das skills grava o `installed.json`, o das tasks nunca). `run.ts` é o cliente das skills, com as cinco fases; `taskRun.ts` é o cliente de `task done|archive`, com a fase `apply` (regrava o `plan.md`, cria a pasta de destino e move a task); `verify.ts` é a fase Verificar das skills; `transaction.ts` é a classe `Transaction`, que grava no diário (`schema: 2`, uma lista ordenada de ações) **antes** de cada mudança (`created` ao copiar, ao trazer uma cópia de preparo com `moveIn` e ao ligar; `createdDir` nas pastas criadas; `moved` ao mover uma pasta real com `relocate`; `displaced` ao deslocar; `restore` ao regravar um arquivo de texto com cópia de segurança e o conteúdo esperado) e marca o ponto de não retorno (`commit`); `recovery.ts` desfaz pelo diário, da última ação para a primeira, com cada desfazer podendo rodar de novo sem estragar nada, converte o diário antigo e não toca num diário de `schema` mais novo; `ops.ts` são as operações reais.

**`commands/`**: `init.ts`, `update.ts`, `link.ts`, `task.ts` (`fsd task …`: mensagens, `--json` do `list` e exit code); `guards.ts` (as checagens comuns aos comandos que gravam fora do motor: `withTaskLock`, que toma a trava do projeto e recusa quando há outra execução em andamento). Exceção ao motor, como o `config.json`: `task new` e `task step add|start|done|skip` gravam um único arquivo por `core/fs.ts` (`createTextFile`, `updateTextFile`), sem diário, dentro da trava do projeto (recusam quando há outra execução em andamento); `skillPlans.ts` é o que `update skill` e `link skill` têm em comum (escopos, rodar um plano por escopo, relatório e exit code); `io.ts` é a saída.

**`wizard/`**: `choices.ts` (o que o usuário escolheu e o estado inicial), `steps.ts` (passos e progresso, puro), `queries.ts` (linhas do catálogo, instaladas, idiomas, conflitos), `execute.ts` (montar o pedido e as preferências, planejar e executar).

**`ui/`**:
- `run.ts` monta o Ink no terminal (tamanho como propriedade, resize síncrono, escritor de quadros).
- `App.tsx` guarda o estado e a navegação entre telas; não desenha os passos.
- `screens/`: `Menu`, `Step` (corpo de cada passo e o resumo), `Running`, `Result`.
- `components/`: `Header`, `Footer`, `Title`, `Pick`, `Conflicts`.
- `hero/`: o cabeçalho grande do menu; `layout.ts` decide o que cabe (puro) e `Hero.tsx` compõe e anima.
- `art/`: as figuras como grades de células, sem React: `donut.ts` (o mapa 22 × 9 feito à mão), `words.ts` (a fonte de 3 linhas), `snow.ts` (os granulados), `sextant.ts`, `cell.ts`.
- `terminal/`: `frameWriter.ts` (diff de linhas, uma escrita por quadro) e `useTerminalSize.ts`.
- `layout.ts` (linhas que o cabeçalho e o rodapé ocupam), `labels.ts` (textos), `theme.ts` (paletas e símbolos).

## Onde entra algo novo

- **Um comando novo**: `commands/<nome>.ts` com a função que devolve o exit code, e uma linha em `fsd.ts`. Se ele muda o disco, um planejador em `plan/` e `runPlan` do motor.
- **Uma regra nova de instalação**: no planejador (`plan/`), nunca no comando nem na tela.
- **Um passo novo no assistente**: `StepId` e `stepsFor` em `wizard/steps.ts`, o título em `ui/labels.ts`, o corpo em `ui/screens/Step.tsx`.
- **Uma mudança visual do cabeçalho**: `ui/art/` (pixels e cores) ou `ui/hero/` (layout); nada fora de `ui/` muda.
- **Gravar texto no motor**: `Transaction.writeTextFiles` (par de `writeJsonFiles`: copia o original para `backup-<n>`, registra um `restore` e só então grava por `Ops.writeText`, com `expected`). Uma mudança do arquivo no meio vira `Stop('changed')` em `runTransaction`. O Instalar usa para o `.gitignore` do projeto (`Plan.textFiles`, na fase Aplicar); `verifyPlan` só aceita `<raiz>/.gitignore` fora de `.fsd/` e `nook/`.
- **Uma operação de arquivo nova no motor**: em `Ops` (`engine/ops.ts`), uma ação nova em `core/runJournal.ts` e um método na `Transaction` que a registre no diário antes de fazê-la; o desfazer em `engine/recovery.ts`, idempotente.
- **Uma execução nova com desfazer** (como `task done`): um cliente de `engine/transactionRun.ts`, com o seu `verify` e o seu `work`.

## Fora de `src/`

Raiz: `README.md`, `CONTRIBUTING.md` e os arquivos do npm e do TypeScript. Documentos do produto em `docs/` (índice em `docs/FSD-INDEX.md`); as tarefas vivem nas issues e no quadro do GitHub. Não há versionamento físico de arquivos (decisão do autor de 2026-11-07): o histórico é o git. Testes: ver [Tests](#tests). `graft/` é gerado e ignorado pelo git.

## Code layout

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
      lock.ts           # a trava do projeto `.fsd/cache/lock` (`O_EXCL`, pid): `acquireLock()`
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

## Tests

Os testes foram removidos do projeto por decisão do autor (2026-11-07). Em 2026-11-09 (#13) voltam só os do `engine/`, com `node:test` e sem dependência nova: fases, desfazer, recuperação e diário v1 → v2 (itens **Rollback**, **Fases** e **Recuperação** abaixo). Eles entram com a F-40a (#6). O resto da lista continua como referência caso os outros testes voltem.

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

Critério de aceitação (antigo SPEC 12.27): Os testes de rollback rodam e passam em qualquer usuário (inclusive root) e plataforma, sem depender de permissões do sistema de arquivos.
