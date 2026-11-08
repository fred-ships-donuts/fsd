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

Primeira fatia do framework `nook/`, decidida pelo autor em 2026-11-07. Spec: SPEC 1, 3, 4.2 (`.gitignore`), 4.5, 5, 5.5, 9, 12 (critérios 34 a 38) e 13. O agente executa o trabalho pelas skills, e a CLI só organiza os arquivos. Os testes foram removidos do projeto (SPEC 11), então cada task fecha com a verificação manual indicada, rodando o binário num projeto temporário. Os detalhes foram decididos pelo autor depois das revisões (SPEC 13). Revisada pelo Arquiteto e pelo Node Typescript Developer (2026-11-07).

Ordem: F-36 → F-37 → F-38 → F-39 → F-40a → F-40b → F-42 → F-43 → F-44; a F-42 pode correr em paralelo logo depois da F-40a. Tamanho (P < 2 h, M = meio dia, G = 1 dia ou mais): F-36 P, F-37 M/G, F-38 M, F-39 M, F-40a G, F-40b M, F-42 M, F-43 P, F-44 P.

- [ ] **F-36 Dependência `yaml` e `core/slug.ts`** (SPEC 2, 4.5): `yaml` (eemeli/yaml) nas dependências de runtime (atualizar a tabela da SPEC 2); `slug(título)` com o mapa `ß→ss`, `æ→ae`, `ø→o`, `ł→l`, `đ→d`, `œ→oe`, `þ→th` (e maiúsculas) antes de `normalize('NFD')`, `\p{M}` removido, `[a-z0-9-]`, sem `-` nas pontas, limite de 60, e vazio como erro. Verificação: `"Login OAuth"` → `login-oauth`, `"Ação/Rápida!"` → `acao-rapida`, `"Straße Øl"` → `strasse-ol`, `"!!!"` e `"日本"` → erro, `"con"` → erro, um título de 100 letras → até 60, cortado no último `-`. Depende de: nada.
- [ ] **F-37 `core/nook.ts` e `core/taskFiles.ts`** (SPEC 4.5): `nook.ts` (só leitura): caminhos `nook/{bench,rack,fridge}` a partir do `cwd` (via `core/scope.ts`), localizar uma task por slug nos três diretórios, modelo da task com os passos em ordem (ignorando arquivos que começam com `.`) e o estado `invalid` com motivo (YAML ilegível, `status` desconhecido, pasta × status divergentes), além da guarda de raiz (`nook/` ou `.fsd/` no `cwd`). `taskFiles.ts`: frontmatter separado à mão (`/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/`; sem match = `invalid`) e regravado como cabeça + `doc.toString({ lineWidth: 0 })` + fechamento + corpo intacto, com o fim de linha detectado reaplicado; `parseDocument` não lança: `doc.errors.length > 0` ou `!isMap(doc.contents)` = `invalid`; YAML 1.2 core (não ativar o 1.1); mudar um valor com `doc.get(chave, true)` e `n.value = …` quando for escalar, para manter o comentário da linha, ou `doc.set` quando faltar; gravar só se mudou; validar `title` (texto não vazio) e `status` (enum). Passos pelo padrão estrito `^\d{2,}-[a-z0-9-]+\.yaml$`, ordenados pelo número. `nook.ts` fica só de leitura; as transformações dos arquivos (mudar um campo, montar um passo) são funções puras em `taskFiles.ts`. `core/fs.ts` ganha `writeTextAtomic(file, content, { expected? })`, com temporário oculto (`.<basename>.<pid>.tmp`) e, com `expected`, releitura e comparação do **conteúdo** (não do mtime) logo antes do rename, e `updateTextFile(file, transform, { retries: 1 })`, que lê, aplica a transformação, grava com `expected` e, se o arquivo mudou, repete uma vez antes de lançar `FileChangedError` (genérica: a F-42 também pode usar). `commands/` traduz o erro para a mensagem (uma nova tentativa; depois, `<arquivo> changed while writing, try again`; é a mesma ideia do snapshot do `plan.md` na F-40b). Próximo número de passo (maior + 1, com pelo menos dois dígitos). Se quiser quebrar: F-37a (leitura e validação) e F-37b (gravação de campo e próximo número). Depende de: F-36.
- [ ] **F-38 `fsd task new` e `fsd task list`** (SPEC 5.5, critérios 34, 37 e 39): `commands/task.ts`; `new` exige `nook/` ou `.fsd/` no `cwd`, cria `nook/bench/` se faltar e o `plan.md` (frontmatter + `# <título>`), com erro mostrando o slug quando ele se repete em qualquer diretório; `list [--all] [--json]` (o JSON é o contrato com o agente: `{"schema": 1, "tasks": [{slug, status, dir, steps: {total, done, skipped, pending, inProgress}, invalid?}]}`, com `steps: null` nas inválidas e `tasks: []` sem `nook/`) com `done/total` (`skipped` conta como fechado) e `invalid` sem derrubar a listagem, e vazia sem `nook/`. `new` checa a trava do motor por `commands/guards.ts`, que usa `liveRun(cacheDir)` de `core/runJournal.ts` (só leitura; o `recoverRuns` passa a usá-la também), sem arquivo de trava. Fiação no commander junto (`fsd.ts`, sem carregar `ui/`): `task`, `task new` e `task list`; em `args.ts`, a primeira linha de `normalizeArgs` é `if (raw[0] === 'task') return { args: raw }` (antes até do passthrough de `-h`/`-v`, que também casaria dentro de um título); `program.enablePositionalOptions()` para as opções `-u -s -f` da raiz não consumirem argumentos de `task`, conferindo que `fsd update skill -f` continua igual; `fsd -h` lista `task`; `fsd task` sem subcomando = ajuda com exit 1; `now` injetável para as datas. Erros com o comando que resolve no fim (SPEC 5.5, tabela), aqui e nas F-39 e F-40b. Verificação manual: criar, repetir (exit 1, com `(run: fsd task list --all)`), `list --json` com uma task válida e uma inválida, rodar de uma subpasta sem `nook/` (exit 1), listar com e sem `--all`, corromper um `plan.md` e listar, `fsd -h`, `fsd task -h`, `fsd task new` sem título, `fsd task new -- "-f"`, `fsd update skill -f` como antes. Depende de: F-37.
- [ ] **F-39 `fsd task step add|start|done|skip`** (SPEC 5.5, critério 35): fiação de `task step` no commander junto; só para task no `bench`; `<n>` validado como inteiro ≥ 1; `add` com `--description` opcional e `status: pending`; `start`, `done` e `skip` gravam só `status` e `updatedAt` por `writeTextAtomic`, sem o motor, mas recusam com execução viva (`another fsd run is in progress`, pela mesma guarda de `commands/guards.ts`; erro sem stack trace); status repetido = `already <status>` e exit 0; `<n>` aceita `1` e `01`. Registrar em `docs/ARQUITETURA.md` essa exceção (gravação de arquivo único fora do motor, como o config). Verificação manual: adicionar três passos, apagar o `02` à mão e adicionar outro (sai `04`), comentário no YAML preservado após `done`, `skip` fechando um passo para o `task done`. Depende de: F-37, F-38.
- [ ] **F-40a Núcleo de transação genérico, sem mudar o comportamento** (SPEC 6.9, 9). Achados dos dois revisores no código atual: (a) `Transaction.move` registra o destino em `created`, e o undo faz `rm -rf` dele, então desfazer o movimento de uma pasta real **apagaria a task** (no install não há problema porque a origem é uma cópia de staging); (b) o undo segue uma ordem fixa por tipo (`created`, `displaced`, `restore`), não a ordem dos acontecimentos; (c) `register()` sempre grava o `installed.json`, o que faria o `installedScopes()` passar a ver o projeto como instalado (5.3); (d) `verifyPlan` só conhece skills e só aceita caminhos em `.fsd/`, `nook/` e `.fsd/skills/`; (e) `writeJsonFiles` faz backup em `backup-<basename>`, então dois arquivos de mesmo nome colidem; (f) a mensagem "install failed and was undone" está fixa. Entregáveis: 1) extrair de `engine/run.ts` o núcleo `engine/transactionRun.ts` (trava/`recoverRuns`, diário, SIGINT/SIGTERM, commit, desfazer, eventos de fase), com verificar e aplicar como funções, e `run.ts` das skills como cliente dele; 2) o diário como **uma lista ordenada** de ações `{kind, …}`, com `schema: 2`, cada uma com o seu undo, desfeita do fim para o começo; todo undo pode rodar de novo sem estragar nada (a recuperação pode rodar duas vezes); um diário sem `schema` é o formato antigo e é convertido ao ler na ordem `[...restore, ...displaced, ...created]`, o que dá, percorrido ao contrário, o mesmo resultado do undo antigo; 3) dois nomes no lugar do `move` genérico: `Transaction.moveIn(from, to)` (origem em staging; grava `created`, e o undo apaga) e `Transaction.relocate(from, to)` (origem real; grava `moved`, e o undo move de volta só se `to` existe e `from` não), e `writeFiles` de texto com backup pelo índice da ação (`backup-<n>`); `Ops.writeText` e `core/fs.ts` `writeTextAtomic`, com o `writeJsonAtomic` passando a usá-lo; 4) o registro de skills só é gravado quando o plano tem item de skill; 5) a mensagem de falha vem do plano (`label`). Verificação manual: instalar, fazer upgrade, apagar e ligar skills como antes, e uma falha injetada no install desfazendo tudo. Depende de: nada (pode começar em paralelo com a F-37).
- [ ] **F-40b `fsd task done|archive`** (SPEC 5.5, critérios 36 e 39): `plan/task.ts` com as transições como funções puras (estado + comando → erro ou operações), com resultado próprio (não força o `ActionResult` de skill); `engine/taskRun.ts` como cliente do núcleo; a verificação, já com a trava, confere que a origem existe, que o `plan.md` é o mesmo do planejamento (senão para com `changed`), que os passos estão fechados, que o destino **não existe** e que origem e destino são graváveis; aplicar: regravar o `plan.md` na origem e depois `relocate` para `rack/` ou `fridge/`, criando o diretório; `EPERM`/`EBUSY` no movimento = mensagem de pasta em uso; `done` recusa passos abertos (lista os números) e task `invalid`; `archive` só sai do `rack`; repetição sem erro: `done` numa task já no `rack` com `status: done` e `archive` numa já no `fridge` com `status: archived` saem `already done`/`already archived` com exit 0, sem rodar o motor (estado incoerente e `archive` vindo do `bench` continuam erro); `commands/task.ts` imprime `moved <task> to nook/rack`. Verificação manual: `done` com passo aberto (exit 1, nada muda, com `(run: fsd task step done …)`); `done` e `archive` repetidos (exit 0); `done` e `archive` válidos; destino já existente (exit 1); falha injetada antes e **depois** do movimento, deixando a task inteira onde estava; `.fsd/installed.json` intocado. Depende de: F-39, F-40a.
- [ ] **F-42 `.gitignore` no Instalar** (SPEC 4.2, critério 38): `core/gitignore.ts` calcula as linhas que faltam (`.fsd/cache/`, `.fsd/logs/`, comparação por linha ignorando espaços nas pontas e o BOM, quebra de linha antes quando o arquivo não termina em uma, e o CRLF existente mantido); a gravação entra no Plan do Instalar no escopo de projeto (fase Aplicar, por `writeTextFiles` com backup, desfeita junto); `verifyPlan` passa a aceitar `<cwd>/.gitignore`, que fica fora de `.fsd/` e `nook/` (hoje a verificação o recusaria); o escopo global não toca nada; o resumo do assistente mostra quando o `.gitignore` vai mudar. Verificação manual: projeto sem `.gitignore`, com um `.gitignore` sem as linhas e sem `\n` final, com as linhas já presentes (nada muda), e a instalação global. Depende de: F-40a (`writeFiles` de texto e a verificação do caminho).
- [ ] **F-43 Skill `fsd-nook-tasks`** (SPEC 3, 4.5): `src/skills/_i18n/fsd-nook-tasks/{en,pt-BR}/SKILL.md` com `metadata.version` `1.0.0-alpha.1`; quando usar (o usuário pede uma task, ou existe `nook/bench/`); fluxo: usar `fsd task list --json` (nunca ler as colunas do texto), seguir o comando sugerido no fim dos erros, repetir sem medo depois de um timeout (os comandos são idempotentes), ler o `plan.md`, propor os passos e criá-los com `fsd task step add`, `start` antes e `done` depois de cada passo (`skip` quando um passo deixou de fazer sentido), títulos começando com `-` depois de `--`, rodar da raiz do projeto, nunca editar o `status` nem mover pastas à mão, pedir confirmação antes de `fsd task done` e nunca rodar `archive`. Verificação: o catálogo lista a skill nos dois idiomas, e o Instalar a instala e cria o link. Depende de: F-39 (os comandos que a skill chama), e de preferência F-40b.
- [ ] **F-44 Documentação** (docs): README (`fsd task`, a skill, o `.gitignore`); `docs/FSD-DIRECTORY-STRUCTURE.md` (fechar em "Open decisions" o formato das tasks, o `status`, o `.gitignore` e quem move `rack → fridge`; acrescentar o layout da pasta de task); `docs/GLOSSARY.md` (termo `Step`, um passo `.yaml` de uma task); `docs/FSD-ARCHITECTURE.md` (Bench e Oven: nesta versão o agente executa e o Oven não guarda estado); `HANDOFF.md`. Depende de: F-36 a F-43 (sem F-41, absorvida pela F-38 e pela F-39).

## Pontos para a revisão da spec

**Decididos pelo autor:** `unlinked` sem link (proposta A); ligar depois com `fsd link skill [nome]` (com `-f`/`--force`); passo separado para os conflitos; exit 1 no conflito sem `--force`; `--force` sem nome vale para todos, sem confirmação; `--force` só resolve conflito; a regra 11 entra; testes de rollback sem `skip` por permissão (falha injetada); atalhos como argumentos separados `-u -s -f`, não agrupados.

**Decididos na revisão (fases, SPEC 6.9):** a falha desfaz a execução inteira; a área de trabalho `.fsd/cache/run-<id>/` é criada sob demanda por qualquer operação e removida ao fim; execução morta reconhecida pelo pid; `lastUpdateCheck` em memória e gravado na fase Registrar; atalhos na ordem `-u -s -f` (fora de ordem é erro); `-s` e `-f` valem em `fsd link`, `-u` não.

**Decididos pelo autor (tasks do `nook/`, 2026-11-07):** o agente executa pelas skills, e a CLI só organiza; task = pasta com `plan.md` e passos `NN-<slug>.yaml`; nome = slug do título; a CLI move bench → rack → fridge; a primeira fatia é esse ciclo; o `.gitignore` recebe só `.fsd/cache/` e `.fsd/logs/`.

**Decididos pelo autor (detalhes da Fase 6, depois das revisões do Arquiteto e do Node Typescript Developer):** os comandos propostos; `skipped` com `task step skip` (sem `remove`); `task done` sem `--force`; só no escopo de projeto; `task new` fora da raiz só dá erro (sem `--init`); sem `reopen`; a dependência `yaml`; slug com mapa pequeno (`ß→ss`…`þ→th`); a skill pede confirmação antes do `done` e nunca arquiva; os passos fora do assistente.

**Decididos depois (2026-11-07, Arquiteto e Node Typescript Developer, aplicados por mim):** `task list --json` no envelope `{"schema": 1, "tasks": [...]}` com `steps` detalhado (inclusive `skipped`); a mensagem de edição concorrente é `<arquivo> changed while writing, try again`; slug também com `þ→th`; diário `schema: 2`, `moveIn`/`relocate`, `liveRun()` + `commands/guards.ts`, `updateTextFile` comparando conteúdo.

**Em aberto:** nenhum. A Fase 6 está pronta para implementação.

**Próximos passos (fora da Fase 6):** `--json` em `task new` e `task step add`, devolvendo o caminho criado; arquivo de trava `O_EXCL` se a janela entre checar e gravar virar problema; as próximas fatias do `nook/` (SPEC 13).

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
