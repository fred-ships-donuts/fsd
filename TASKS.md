# TASKS — fsd (Fred Ships Donuts CLI)

Fonte da verdade: `SPEC.md`. Cada task cita as seções que a definem. Marque `[x]` ao concluir. A ordem é uma sugestão; as dependências estão em "Depende de".

## Estado atual do código (ponto de partida)

O código ainda é o rascunho antigo e está defasado em relação à `SPEC.md`; as tasks abaixo o substituem.

- `src/cli/` (`cli.ts`, `index.ts`, `prompts.ts`, `skills.ts`, `commands/{install,list,uninstall,update}.ts` e testes) usa Clack e `.fsd.json` por skill. Compila e passa 18 testes.
- `package.json`: nome `fred-ship-donuts`, dois `bin` (`fred-ships-donuts` e `fsd`) apontando para `dist/cli/index.js`, dependências `@clack/prompts` e `commander`, script `dev` em `src/cli/index.ts`.
- Catálogo já migrado e commitado em `src/skills/_i18n/` (`fsd-csharp-code-standard`, `fsd-ui-approval`). Ainda existe a cópia antiga `src/skills/fsd-padroes-codigo-csharp/`.
- `docs/` tem `FSD-INDEX.md`, `FSD-CONCEPT.md`, `FSD-DOUGH.md`, `FSD-ARCHITECTURE.md`, `FSD-DIRECTORY-STRUCTURE.md`, `FSD-IMPLEMENTATION-STRATEGY.md` e `GLOSSARY.md`. A `graft/` na raiz é ignorada pelo git e **não deve ser apagada**.
- Executadas: F-1.1 a F-25. Layout (cabeçalho, paletas) está **provisório** (ver F-23).

**Regra de estrutura:** ao fim da F-1.2, todas as demais tasks (F-2 a F-25) são atualizadas para a nova estrutura de diretórios (`nook/` + `.fsd/`, com `nook/cookbook/` no lugar de `nook/recipes/`). Até lá, os caminhos `~/.fsd` e `./.fsd` das tasks da Fase 1 em diante são provisórios.

## Fase 0 — Documentação e estrutura

- [x] **F-1.1 Analisar os docs do projeto** (`docs/`)
  Ler e analisar todos os documentos de `docs/`, que são de extrema importância para a vida do projeto: `FSD_CONCEPT.md`, `GLOSSARY.md`, `FSD-ARCHITECTURE.md`, `FSD-IMPLEMENTATION-STRATEGY.md` e `FSD_DOUGH.md` (os nomes com `_` mudam na F-1.2). Somente leitura e relatório: nada em `docs/`, na `SPEC.md` ou nas demais tasks é alterado nesta task.
  Entregáveis:
  1. **Resumo e vocabulário:** resumo de cada doc e os conceitos do projeto.
  2. **Glossário cruzado:** tabela com cada termo do `GLOSSARY.md` e onde aparece na `SPEC.md`, no código e no catálogo de skills; termos que a spec usa com outro nome e termos dos docs que a spec ignora.
  3. **Matriz de rastreabilidade:** cada requisito dos docs ligado à seção da `SPEC.md` e à task F-N que o cumpre; o que não tiver ligação vira lacuna e proposta de task nova.
  4. **Decisões em conflito:** para cada divergência entre docs e spec, "o doc diz X, a spec diz Y, sugiro Z porque…", com uma recomendação.
  5. **Impacto na arquitetura do código:** se `FSD-ARCHITECTURE.md` e `FSD-IMPLEMENTATION-STRATEGY.md` pedem estrutura diferente da seção 9 da spec, e se a ordem das fases do `TASKS.md` bate com a estratégia.
  6. **Perguntas em aberto:** o que os docs deixam ambíguo e só o autor pode decidir, separado do que pode ser decidido sem ele.
  7. **Mapa de dependência entre os docs:** qual doc é fonte de qual, repetições e qual manter como fonte da verdade.
  8. **Proposta de ajustes prontos:** diff da `SPEC.md` e do `TASKS.md` com as mudanças sugeridas, para o autor conferir antes da F-1.2.
  Depende de: nada.

- [x] **F-1.2 Pivô, alinhamento e correções dos docs** (`docs/`)
  Executa as mudanças em `docs/`, `SPEC.md` e `TASKS.md` a partir do relatório da F-1.1 e das decisões do autor. É o único ponto em que esses arquivos são alterados.
  Entregáveis:
  1. **Documento pivô:** criar em `docs/` um documento com índice para os demais (o que cada um cobre e em que ordem ler).
  2. **Alinhar tudo ao `docs/FSD-ARCHITECTURE.md`:** esse doc tem conceitos novos que os demais não refletem. Tomá-lo como referência e atualizar o que divergir dele nos outros docs de `docs/`, na `SPEC.md` e **em todas as demais tasks do `TASKS.md` (F-2 a F-25)**, incluindo a troca da árvore de diretórios da F-2 pela estrutura `nook/` + `.fsd/` do `FSD-ARCHITECTURE.md` (a árvore original da F-2, só com `.fsd/`, deixa de valer). Pontos já identificados nele: `Oven` e `Rack` (camadas novas na cadeia User → CLI → Kitchen → Bench → Oven → Recipe → Baker → Skill → Donuts → Rack → Fridge); `Craft` (metadado descritivo de um Baker, sem execução); `Context`; a separação do workspace do usuário em `nook/` (`kitchen/`, `bench/`, `cookbook/`, `bakers/`, `rack/`, `fridge/`) do diretório de sistema `.fsd/` (`oven/`, `cache/`, `logs/`); e o ciclo por `status` (`in_progress` no `bench`, `done` no `rack`, arquivado no `fridge`). Registrar as mudanças feitas e as que dependem de decisão do autor.
  3. **Correções de docs (decididas pelo autor, executar junto do passo 2):**
      - **Nomes de arquivo com `-`:** todos os docs usam `-` como separador, nunca `_`. Renomear `FSD_CONCEPT.md` → `FSD-CONCEPT.md` e `FSD_DOUGH.md` → `FSD-DOUGH.md` (e qualquer outro doc novo segue a regra); corrigir todos os links entre os docs, a `SPEC.md` e o `TASKS.md` para os nomes novos.
      - **Typos** em `FSD-IMPLEMENTATION-STRATEGY.md` ("The objective is to more than just…", "preserve before ;", "identity establish", "becaming", ponto e vírgula faltando em "CLI implementation", "Should be a life style.") e demais erros encontrados na leitura.
      - **`GLOSSARY.md` conforme o `FSD-ARCHITECTURE.md`:** acrescentar `Rack`, `Donuts` e `nook/`; alinhar `Oven` ("execution coordination layer"), `Artifact` → `Donuts (Artifacts)`, `Bench` e `Fridge`. Remover o conceito `Ingredient` e substituí-lo por `Cookbook` (ver o item abaixo).
      - **`FSD-ARCHITECTURE.md`:** `Bench` e `Fridge` **não** guardam logs nem estado de execução. O `Bench` guarda as tarefas, e o `status` de cada uma fica no próprio arquivo da tarefa. Remover dessas duas seções as responsabilidades de logs e estado (logs e estado de execução ficam em `.fsd/logs` e `.fsd/oven`).
      - **`Cookbook` no lugar de `Ingredient`:** o conceito `Ingredient` deixa de existir. `Cookbook` é o diretório `nook/cookbook/`, que contém as `Recipes` (workflows declarativos) e substitui `nook/recipes/`. Acrescentá-lo ao `GLOSSARY.md`, ao `FSD-ARCHITECTURE.md` (árvore de diretórios e camadas) e à árvore da F-2; remover `Ingredient` do glossário. Decisão pendente do autor: se `Recipe` continua como conceito do glossário (parece que sim, dentro do `Cookbook`).
  Depende de: F-1.1.

- [x] **F-2 Organização de diretórios do framework FSD em um projeto** (`nook/` + `.fsd/`)
  Definir e documentar a estrutura de diretórios que o framework FSD cria e usa quando está em uso em um dado projeto. A estrutura é a do `docs/FSD-ARCHITECTURE.md` (seção "Directory Structure"), que substitui a proposta anterior baseada só em `.fsd/`. A mudança é aplicada na F-1.2; esta task detalha e documenta o resultado.

  ```text
  my-project/
  ├── nook/                  # Workspace do usuário
  │   ├── kitchen/           # Configuração, regras e contexto do projeto
  │   ├── bench/             # Tasks ativas (status: in_progress)
  │   ├── cookbook/          # Livro de receitas: contém as recipes (workflows declarativos)
  │   ├── bakers/            # Agentes de IA especializados (e craft)
  │   ├── rack/           # Donuts prontos (status: done)
  │   └── fridge/            # Arquivo morto (cold storage)
  │
  └── .fsd/                  # Sistema interno e estado de execução
      ├── oven/              # Orquestração da execução
      ├── cache/             # Caches internos
      └── logs/              # Logs de execução
  ```

  Entregáveis:
  1. **Documento da estrutura** em `docs/`, com a função de cada diretório, o formato dos arquivos e o ciclo de vida de uma task por `status` (`nook/bench` → `nook/rack` → `nook/fridge`), ligado ao índice pivô da F-1.2.
  2. **Conciliação com a `SPEC.md` 4.2:** hoje o `.fsd/` da CLI guarda `installed.json` (global e projeto) e `~/.fsd/config.json`. Com a nova estrutura, `.fsd/` é o diretório de sistema (`oven`, `cache`, `logs`) e `nook/kitchen/` guarda configuração, regras e contexto. **Decidido:** `installed.json` (global e projeto) e `config.json` (só global, com `theme`, `autoUpdate`, `updateSkills`) ficam em `.fsd/`, não em `nook/kitchen/`. Falta atualizar a SPEC 4.2 e as tasks já ajustadas se o documento da estrutura divergir.
  3. **Decisões em aberto** para o autor: ~~o que `fsd init` cria~~ (decidido: ver abaixo), o que entra no `.gitignore` (por exemplo `.fsd/cache`, `.fsd/logs`), formato das tasks (`.md` ou `.yaml`) e o formato do campo `status`.
     **Decidido pelo autor:** ao confirmar o fluxo Instalar (não ao abrir o `init`), a CLI cria uma estrutura base, em `~` no escopo global: `nook/` com `kitchen/` e `bakers/`, e `.fsd/` completo, com `oven/`, `cache/` e `logs/`. `bench/`, `cookbook/`, `rack/` e `fridge/` não são criados pelo `init`.
  4. **Impacto nas tasks:** se `fsd init` ou o assistente passam a criar essa estrutura, e quais tasks e seções da spec mudam.
  Depende de: F-1.2.

## Fase 0.5 — Preparação técnica

- [x] **F-3 Pacote e dependências** (SPEC 2, 10)
  `package.json`: nome `fred-ships-donuts`, `bin` só `fsd` → `./dist/cli/fsd.js`, `engines.node >=22`, `files: ["dist","src/skills"]`. Dependências: `commander`, `ink`, `react`. Dev: `@types/react`, `tsx`, `ink-testing-library`. Remover `@clack/prompts`. `tsconfig.json` com `jsx: react-jsx`. Script `dev` rodando `src/cli/fsd.ts`.
  Depende de: decisão do nome do pacote (resolvida: `fred-ships-donuts`).
- [x] **F-4 Limpar o repositório** (SPEC 13)
  A migração do catálogo para `src/skills/_i18n/` já está commitada. Apagar `src/skills/fsd-padroes-codigo-csharp/` (cópia antiga) e decidir o `SKILL.md` roteador em `_i18n/fsd-csharp-code-standard/` (pendência do autor). **Não** apagar a pasta `graft/` (ignorada pelo git, fora do escopo).

## Fase 1 — Núcleo (sem UI)

- [x] **F-5 `fsdDir.ts`** (SPEC 4.2): caminhos `~/.fsd` e `./.fsd`, criação da estrutura base (`nook/kitchen`, `nook/bakers`, `.fsd/oven|cache|logs`) e dos arquivos sob demanda, gravação atômica (arquivo temporário + rename). Testes. Depende de: F-2.
- [x] **F-6 `registry.ts`** (SPEC 4.3, 4.4): ler/gravar `installed.json`, registrar/remover, calcular estado (`not installed`, `up to date`, `outdated`, `missing`). Arquivo ausente ou ilegível = `not installed`. Testes. Depende de: F-2, F-5.
- [x] **F-7 `config.ts`** (SPEC 8.2): `theme`, `autoUpdate`, `updateSkills`, `lastUpdateCheck`; padrões para arquivo ausente, ilegível ou `schema` desconhecido. Testes. Depende de: F-2, F-5.
- [x] **F-8 Ajustar `skills.ts`** (SPEC 3, 4.4): remover `.fsd.json` por skill e a decisão "instalada" pela pasta; manter catálogo `_i18n`, frontmatter, semver com pré-release e cópia sem `evals/` e `README.md`. Atualizar testes. Depende de: F-4.
- [x] **F-9 `actions/install.ts`** (SPEC 6.2): `install`, `upgrade`, `skip (up to date)`, `missing`, link simbólico em `.claude/skills/<nome>`, instalação tudo ou nada (falha desfaz a tentativa e devolve o que foi deslocado), conflito de skill de mesmo nome (substituir só com escolha explícita no resumo), substituição completa, bit de execução, registro gravado só após a cópia. **Não** cria a estrutura base (`nook/`, `.fsd/oven|cache|logs`): isso é do assistente (F-19), para o `update skill` não criá-la. Testes com `HOME`/`cwd` temporários. Depende de: F-6, F-8.
- [x] **F-10 `actions/uninstall.ts`** (SPEC 6.8): remove pasta do `path` registrado e a entrada; `missing` só limpa a entrada; nunca apaga o que não está no registro. Testes. Depende de: F-6.
- [x] **F-11 `selfUpdate.ts`** (SPEC 7): consulta ao npm (timeout 2 s), decisão de checar como função pura (`autoUpdate`, 24 h, instalação global vs `npx`), atualização da CLI. Testes sem rede. Depende de: F-7.

## Fase 2 — Comandos

- [x] **F-12 `fsd.ts` com commander** (SPEC 5): `-h/--help` (e sem argumentos, exit 0), `-v/--version`, `init`, `update`, `update skill [nome]`, atalhos `-u`/`-s` em todas as combinações, erros de uso com exit 1, import dinâmico de `ui/` só em `init`, shebang. Testes de binário (saída e exit codes). Depende de: F-3.
- [x] **F-13 `commands/update.ts`** (SPEC 5.2, 5.3, 7): `fsd update` (CLI, ignora limite de 24 h, `npx` = nada a atualizar), `fsd update skill [nome]` (global + projeto, erros `is not installed` / `not found in catalog`), `updateSkills` disparando novo processo `fsd update skill` na versão nova. Testes. Depende de: F-9, F-11, F-12.
- [x] **F-14 `commands/init.ts`** (SPEC 5.1): valida argumentos e TTY (`fsd init requires an interactive terminal`, exit 1), aplica auto-update e abre o assistente (a estrutura base é criada ao confirmar o fluxo Instalar, F-19). Depende de: F-11, F-12, F-18, F-19, F-20.

## Fase 3 — Assistente (Ink)

- [x] **F-15 `progress.ts`** (SPEC 6.4): lista de passos dos fluxos Instalar (6 ou 5 sem idioma) e Apagar (3) e cálculo da barra, funções puras. Testes.
- [x] **F-16 `theme.ts`** (SPEC 6.5): 4 temas e o conjunto de símbolos como contexto React, `NO_COLOR`. Depende de: pendências de layout do autor (paletas).
- [x] **F-17 `Header`/`Footer`/`App`** (SPEC 6.1): cabeçalho, rodapé com dica de teclas e barra, navegação (`enter`, `←`, `ctrl+c` = exit 130, nada gravado antes do resumo). Depende de: F-15, F-16 e do logotipo/cabeçalho definido pelo autor (SPEC 6.7).
- [x] **F-18 Menu** (SPEC 6.2): Instalar, Apagar, Sair (sem "Atualizar"). Depende de: F-17.
- [x] **F-19 Passos do fluxo Instalar** (SPEC 6.2): escopo, skills (com estado), idioma condicional, atualização (`autoUpdate` e `updateSkills`), tema, resumo com conflitos e resultado. Ao confirmar, cria a estrutura base (SPEC 4.2: `nook/kitchen`, `nook/bakers`, `.fsd/oven|cache|logs`; em `~` no escopo global), instala e grava `config.json`. Depende de: F-6, F-7, F-9, F-17.
- [x] **F-20 Fluxo Apagar** (SPEC 6.8): escopo, skills do registro, resumo. Depende de: F-10, F-17.
- [x] **F-21 Testes do assistente** (SPEC 11): `ink-testing-library` nos componentes; validação final manual em terminal real. Depende de: F-17, F-18, F-19, F-20.

## Fase 4 — Fechamento

- [x] **F-22 Testes do catálogo** (SPEC 11): `name` igual ao diretório, `metadata.version` válida e igual entre idiomas. Depende de: F-4, F-8.
- [x] **F-23 Critérios de aceitação** (SPEC 12): percorrer todos os itens da seção 12 (a quantidade vem da spec vigente) e registrar o resultado. Depende de: F-13, F-14, F-21, F-22.
- [x] **F-24 Empacotamento** (SPEC 10): bit de execução em `dist/cli/fsd.js`, `npm pack --dry-run` contendo `dist/` e `src/skills/_i18n/`, teste de `npx -p fred-ships-donuts fsd init`. Depende de: F-3, F-12.
- [x] **F-25 README**: uso (`fsd init`, `fsd update`, `fsd update skill`, atalhos `-u`/`-s`, `-h`, `-v`). Depende de: F-12, F-13, F-14.

## Fase 5 — Conflito, `--force`, `link`, interrupção e testes de falha (novas, em revisão da spec)

Mudanças pedidas depois da entrega das F-1 a F-25. Spec: SPEC 4.3, 5, 5.3, 5.4, 6.2 (regras 3, 9, 10 e 11), 6.4, 8.1, 9, 11 e 12 (critérios 21 a 30). Implementadas depois da revisão da spec (ver `HANDOFF.md`).

- [x] **F-26 Conflito: três escolhas e o passo Conflitos** (SPEC 6.2 regra 3, 6.4, 4.3): `keep` (padrão), `unlinked` e `replace`. Estende `actions/install.ts` (escolha por conflito no lugar de `overwriteConflict`), `registry.ts` (campo `linked`), `uninstall.ts` (não toca a original de uma skill `unlinked`), `progress.ts` (passo condicional Conflitos; total 7, 6 ou 5) e o assistente (passo novo, escolha por conflito, resumo mostrando as escolhas). Testes. Depende de: F-9, F-10, F-15, F-19.
- [x] **F-27 `--force` / `-f` em `update skill`** (SPEC 5, 5.3, 8.1): opção do commander; atalho `-f` em `args.ts` como argumento separado e na ordem `-u -s -f` (fora de ordem e agrupados são erro); conflito sem `--force` = mensagem e exit 1; com `--force` substitui; `linked: false` fica fora. Testes de `args`, de `update skill` e do binário. Depende de: F-26, F-12, F-13.
- [x] **F-28 `fsd link skill [nome]`** (SPEC 5.4): comando novo com `--force`/`-f` e `-s`; liga skills sem link, grava `linked: true`, conflito sem `--force` = exit 1. Testes. Depende de: F-26, F-27.
- [x] **F-29 Interrupção antes de confirmar** (SPEC 6.2 regra 10, critério 26): testes do assistente com `ctrl+c` em cada passo e instalação normal logo em seguida, conferindo a árvore exata (sem sobras, sem duplicatas, sem link faltando) e repetindo a instalação sem mudar nada. Depende de: F-21, F-26.
- [x] **F-30 Testes de rollback sem depender de permissões** (SPEC 6.9 regra 8, 9, 11, critério 27): trocar os testes baseados em `chmod` por falhas injetadas no motor de fases (F-32), sem `skip` em root, outro usuário ou Windows; instalação nova, `upgrade` e `replace`, com a original voltando byte a byte. Depende de: F-32.
- [x] **F-32 Motor de execução em fases** (SPEC 6.9, 4.2, critérios 31 e 32): `run.ts` com o plano, as fases Verificar, Preparar, Aplicar, Registrar e Concluir, o diário em `.fsd/cache/run-<id>/`, desfazer (execução inteira), recuperação de execução morta, trava contra duas execuções, cancelamento entre operações (`ctrl+c`/`SIGTERM`) e operações injetáveis. Migra `actions/install.ts` e `uninstall.ts` para produzir planos; `update skill` e `link skill` usam o mesmo motor. Testes por fase. Depende de: F-9, F-10, F-26.
- [x] **F-33 Tela de execução** (SPEC 6.9 regras 5 e 6): fases e skills com estado na tela, falha com fase e motivo, cancelamento, volta ao resumo quando o estado mudou. Testes com `ink-testing-library`. Depende de: F-32, F-19, F-20.
- [x] **F-34 `lastUpdateCheck` sem arquivo ao abrir** (SPEC 7, critério 33): o auto-update do `fsd init` guarda a hora em memória e a entrega à fase Registrar; só grava na hora se o `config.json` já existir. Teste de que `fsd init` ao abrir não cria nada. Depende de: F-32, F-14.
- [x] **F-35 Documentação**: README (`--force`/`-f`, `link skill`, conflito, fases), HANDOFF e glossário se surgir termo novo. Depende de: F-26 a F-34.

## Fase 6 — Tasks do `nook/` (bench → rack → fridge)

Primeira fatia do framework `nook/`, decidida pelo autor em 2026-11-07. Spec: SPEC 1, 3, 4.2 (`.gitignore`), 4.5, 5, 5.5, 9, 12 (critérios 34 a 38) e 13. O agente executa o trabalho pelas skills, e a CLI só organiza os arquivos. Os testes foram removidos do projeto (SPEC 11), então cada task fecha com a verificação manual indicada, rodando o binário num projeto temporário. Antes de começar, resolver os itens "Revisar (tasks do `nook/`)" da SPEC 13.

- [ ] **F-36 Dependência `yaml` e `core/slug.ts`** (SPEC 2, 4.5): `yaml` (eemeli/yaml) nas dependências de runtime (atualizar a tabela da SPEC 2); `slug(título)` com acentos removidos, `[a-z0-9-]`, sem `-` nas pontas, e vazio como erro. Verificação: `"Login OAuth"` → `login-oauth`, `"Ação/Rápida!"` → `acao-rapida`, `"!!!"` → erro. Depende de: nada.
- [ ] **F-37 `core/nook.ts`** (SPEC 4.5): caminhos `nook/{bench,rack,fridge}` a partir do `cwd` (via `core/scope.ts`); localizar uma task por slug nos três diretórios; ler o `plan.md` (frontmatter com o `Document` do `yaml`, corpo intacto) e os passos `NN-*.yaml` em ordem; estado `invalid` com motivo (YAML ilegível, `status` desconhecido, pasta × status divergentes); gravar um campo preservando o resto, por gravação atômica (`core/fs.ts`); próximo número de passo (maior + 1). Só leitura, salvo a gravação atômica, como o resto de `core/`. Depende de: F-36.
- [ ] **F-38 `fsd task new` e `fsd task list`** (SPEC 5.5, critérios 34 e 37): `commands/task.ts`; `new` cria `nook/bench/` se faltar e o `plan.md` (frontmatter + `# <título>`), com erro para slug repetido em qualquer diretório; `list [--all]` com `done/total` e `invalid` sem derrubar a listagem, e vazia sem `nook/`. Verificação manual: criar, repetir (exit 1), listar com e sem `--all`, corromper um `plan.md` e listar. Depende de: F-37.
- [ ] **F-39 `fsd task step add|start|done`** (SPEC 5.5, critério 35): só para task no `bench`; `add` com `--description` opcional e `status: pending`; `start` e `done` gravam só `status` e `updatedAt`; status repetido = `already <status>` e exit 0; `<n>` aceita `1` e `01`. Verificação manual: adicionar três passos, apagar o `02` à mão e adicionar outro (sai `04`), comentário no YAML preservado após `done`. Depende de: F-37, F-38.
- [ ] **F-40 `fsd task done|archive` pelo motor de fases** (SPEC 5.5, 6.9, critério 36): `plan/task.ts` monta um Plan com duas operações (gravar o `plan.md` com o status novo, mover a pasta para `rack`/`fridge`, criando o diretório de destino); estender `plan/types.ts` e `engine/` para esse item sem mudar o comportamento das skills; `done` recusa passos abertos (lista os números); `archive` só do `rack`; trava e recuperação do motor valem. Verificação manual: `done` com passo aberto (exit 1, nada muda), `done` e `archive` válidos, e uma falha injetada pelas operações substituíveis deixando a task onde estava. Depende de: F-37, F-39.
- [ ] **F-41 commander e ajuda** (SPEC 5, 5.5): `task` e `task step` em `fsd.ts`, sem carregar `ui/`; `fsd -h` lista `task`; os atalhos `-u -s -f` não se aplicam a `task` (`args.ts` deixa passar sem traduzir); argumentos faltando = erro de uso do commander (exit 1). Verificação: `fsd -h`, `fsd task -h`, `fsd task new` sem título. Depende de: F-38, F-39, F-40.
- [ ] **F-42 `.gitignore` no Instalar** (SPEC 4.2, critério 38): `core/gitignore.ts` calcula as linhas que faltam (`.fsd/cache/`, `.fsd/logs/`, comparação por linha exata); a gravação entra no Plan do Instalar no escopo de projeto (fase Aplicar, desfeita junto); o escopo global não toca nada; o resumo do assistente mostra quando o `.gitignore` vai mudar. Verificação manual: projeto sem `.gitignore`, com um `.gitignore` sem as linhas, com as linhas já presentes (nada muda), e a instalação global. Depende de: nada (usa o motor existente).
- [ ] **F-43 Skill `fsd-nook-tasks`** (SPEC 3, 4.5): `src/skills/_i18n/fsd-nook-tasks/{en,pt-BR}/SKILL.md` com `metadata.version` `1.0.0-alpha.1`; quando usar (o usuário pede uma task, ou existe `nook/bench/`); fluxo: ler o `plan.md`, propor os passos e criá-los com `fsd task step add`, `start` antes e `done` depois de cada passo, nunca editar o `status` nem mover pastas à mão, pedir confirmação antes de `fsd task done` e nunca rodar `archive`. Verificação: o catálogo lista a skill nos dois idiomas, e o Instalar a instala e cria o link. Depende de: F-41.
- [ ] **F-44 Documentação** (docs): README (`fsd task`, a skill, o `.gitignore`); `docs/FSD-DIRECTORY-STRUCTURE.md` (fechar em "Open decisions" o formato das tasks, o `status`, o `.gitignore` e quem move `rack → fridge`; acrescentar o layout da pasta de task); `docs/GLOSSARY.md` (termo `Step`, um passo `.yaml` de uma task); `docs/FSD-ARCHITECTURE.md` (Bench e Oven: nesta versão o agente executa e o Oven não guarda estado); `HANDOFF.md`. Depende de: F-36 a F-43.

## Pontos para a revisão da spec

**Decididos pelo autor:** `unlinked` sem link (proposta A); ligar depois com `fsd link skill [nome]` (com `-f`/`--force`); passo separado para os conflitos; exit 1 no conflito sem `--force`; `--force` sem nome vale para todos, sem confirmação; `--force` só resolve conflito; a regra 11 entra; testes de rollback sem `skip` por permissão (falha injetada); atalhos como argumentos separados `-u -s -f`, não agrupados.

**Decididos na revisão (fases, SPEC 6.9):** a falha desfaz a execução inteira; a área de trabalho `.fsd/cache/run-<id>/` é criada sob demanda por qualquer operação e removida ao fim; execução morta reconhecida pelo pid; `lastUpdateCheck` em memória e gravado na fase Registrar; atalhos na ordem `-u -s -f` (fora de ordem é erro); `-s` e `-f` valem em `fsd link`, `-u` não.

**Decididos pelo autor (tasks do `nook/`, 2026-11-07):** o agente executa pelas skills, e a CLI só organiza; task = pasta com `plan.md` e passos `NN-<slug>.yaml`; nome = slug do título; a CLI move bench → rack → fridge; a primeira fatia é esse ciclo; o `.gitignore` recebe só `.fsd/cache/` e `.fsd/logs/`.

**Em aberto (Fase 6, propostas minhas, ver SPEC 13 "Revisar (tasks do `nook/`)"):** nomes dos comandos; status dos passos; `task done` sem `--force`; só no escopo de projeto; sem `reopen`; a dependência `yaml`; o que a skill pode fazer sozinha; os passos fora do assistente. Também a revisão do `Arquiteto`.

## Contratos entre tasks

Interfaces que, depois de fechadas, não devem mudar sem revisar as tasks dependentes. Os nomes são indicativos; vale o comportamento.

- **F-5 `fsdDir.ts`:** resolve os caminhos de um escopo (`~` ou `cwd`): `.fsd/`, `nook/`, `installed.json`, `config.json`. Tem uma gravação atômica de JSON e uma função de criar a estrutura base, idempotente. Só a F-19 chama essa função.
- **F-6 `registry.ts`:** ler nunca lança erro (arquivo ausente ou ilegível = registro vazio). Estados fixos: `not installed`, `up to date`, `outdated`, `missing`. Registrar e remover entradas.
- **F-7 `config.ts`:** ler nunca lança erro e devolve os padrões quando o arquivo é ausente, ilegível ou de `schema` desconhecido.
- **F-8 `skills.ts`:** listar, ler e copiar skills do catálogo `_i18n`. A comparação de versões segue a precedência de semver (SPEC 4.4).
- **F-9 e F-10 `actions/`:** sem UI, sem estrutura base. Devolvem um resultado por skill (nome, ação `install`/`upgrade`/`skip`/`remove`, versão, idioma, destino) que serve tanto ao assistente quanto ao `update skill`. O registro só é gravado depois da cópia.
- **F-12 e `commands/`:** cada comando é uma função que recebe os argumentos e devolve o exit code; `fsd.ts` só roteia.
- **F-15 `progress.ts`:** funções puras; entra o fluxo e se o passo de idioma se aplica, sai a lista de passos e o total.
- **F-17 `App`:** cada passo é um componente que recebe as escolhas atuais e os callbacks de avançar e voltar; a navegação (`enter`, `←`, `ctrl+c`) fica no `App`, não nos passos.

## Pendências do autor que bloqueiam tasks

- Logotipo e itens do cabeçalho, largura mínima, paletas dos temas (SPEC 6.7): F-16, F-17.
- Apagar ou manter o `SKILL.md` roteador e a cópia antiga `fsd-padroes-codigo-csharp/`: F-4.
- ~~Decisões em aberto da F-2 (`.gitignore`, formato das tasks e do `status`)~~: decididas em 2026-11-07 (SPEC 4.2 e 4.5, Fase 6). `installed.json` e preferências: em `.fsd/`.
- Revisar as decisões marcadas em SPEC 13 ("Revisar"): afetam F-13 e F-19.

## Resultado da F-23 (critérios de aceitação, SPEC 12)

Verificado por testes automáticos (`npm test`, 61 testes) e por uma execução do assistente em pseudo-terminal:

- Cobertos por teste: 1, 2, 4 (árvore sem `evals/`/`README.md`, registro), 5, 6 (via idioma), 7, 8, 9, 10, 11, 12, 13, 16, 17, 19, 20.
- 3: a lista de skills vem de `listSkills()`, mesma fonte dos testes do catálogo.
- 14 e 15: `readConfig`/`shouldCheck` testados; o pré-seleção na UI usa `readConfig()`, sem teste de interface.
- 18: o encadeamento é testado com dependências simuladas; o `spawn` real de `fsd update skill` não foi exercitado.

**Não verificado:** consulta e instalação reais no npm (o pacote ainda não foi publicado), e a validação manual completa do assistente em um terminal real. Layout provisório, a confirmar pelo autor: logotipo (`🍩 F S D`), paletas dos 4 temas e largura mínima (40 colunas).
