# TASKS — fsd (Fred Ships Donuts CLI)

Fonte da verdade: `SPEC.md`. Cada task cita as seções que a definem. Marque `[x]` ao concluir. A ordem é uma sugestão; as dependências estão em "Depende de".

## Estado atual do código (ponto de partida)

O código ainda é o rascunho antigo e está defasado em relação à `SPEC.md`; as tasks abaixo o substituem.

- `src/cli/` (`cli.ts`, `index.ts`, `prompts.ts`, `skills.ts`, `commands/{install,list,uninstall,update}.ts` e testes) usa Clack e `.fsd.json` por skill. Compila e passa 18 testes.
- `package.json`: nome `fred-ship-donuts`, dois `bin` (`fred-ships-donuts` e `fsd`) apontando para `dist/cli/index.js`, dependências `@clack/prompts` e `commander`, script `dev` em `src/cli/index.ts`.
- Catálogo já migrado e commitado em `src/skills/_i18n/` (`fsd-csharp-code-standard`, `fsd-ui-approval`). Ainda existe a cópia antiga `src/skills/fsd-padroes-codigo-csharp/`.
- `docs/` tem `FSD_CONCEPT.md`, `FSD_DOUGH.md`, `GLOSSARY.md`, `FSD-ARCHITECTURE.md` e `FSD-IMPLEMENTATION-STRATEGY.md`. A `graft/` na raiz é ignorada pelo git e **não deve ser apagada**.
- Nenhuma task foi executada.

**Regra de estrutura:** ao fim da F-1.2, todas as demais tasks (F-2 a F-25) são atualizadas para a nova estrutura de diretórios (`nook/` + `.fsd/`, com `nook/cookbook/` no lugar de `nook/recipes/`). Até lá, os caminhos `~/.fsd` e `./.fsd` das tasks da Fase 1 em diante são provisórios.

## Fase 0 — Documentação e estrutura

- [ ] **F-1.1 Analisar os docs do projeto** (`docs/`)
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

- [ ] **F-1.2 Pivô, alinhamento e correções dos docs** (`docs/`)
  Executa as mudanças em `docs/`, `SPEC.md` e `TASKS.md` a partir do relatório da F-1.1 e das decisões do autor. É o único ponto em que esses arquivos são alterados.
  Entregáveis:
  1. **Documento pivô:** criar em `docs/` um documento com índice para os demais (o que cada um cobre e em que ordem ler).
  2. **Alinhar tudo ao `docs/FSD-ARCHITECTURE.md`:** esse doc tem conceitos novos que os demais não refletem. Tomá-lo como referência e atualizar o que divergir dele nos outros docs de `docs/`, na `SPEC.md` e **em todas as demais tasks do `TASKS.md` (F-2 a F-25)**, incluindo a troca da árvore de diretórios da F-2 pela estrutura `nook/` + `.fsd/` do `FSD-ARCHITECTURE.md` (a árvore original da F-2, só com `.fsd/`, deixa de valer). Pontos já identificados nele: `Oven` e `Display` (camadas novas na cadeia User → CLI → Kitchen → Bench → Oven → Recipe → Baker → Skill → Donuts → Display → Fridge); `Craft` (metadado descritivo de um Baker, sem execução); `Context`; a separação do workspace do usuário em `nook/` (`kitchen/`, `bench/`, `cookbook/`, `bakers/`, `display/`, `fridge/`) do diretório de sistema `.fsd/` (`oven/`, `cache/`, `logs/`); e o ciclo por `status` (`in_progress` no `bench`, `done` no `display`, arquivado no `fridge`). Registrar as mudanças feitas e as que dependem de decisão do autor.
  3. **Correções de docs (decididas pelo autor, executar junto do passo 2):**
      - **Nomes de arquivo com `-`:** todos os docs usam `-` como separador, nunca `_`. Renomear `FSD_CONCEPT.md` → `FSD-CONCEPT.md` e `FSD_DOUGH.md` → `FSD-DOUGH.md` (e qualquer outro doc novo segue a regra); corrigir todos os links entre os docs, a `SPEC.md` e o `TASKS.md` para os nomes novos.
      - **Typos** em `FSD-IMPLEMENTATION-STRATEGY.md` ("The objective is to more than just…", "preserve before ;", "identity establish", "becaming", ponto e vírgula faltando em "CLI implementation", "Should be a life style.") e demais erros encontrados na leitura.
      - **`GLOSSARY.md` conforme o `FSD-ARCHITECTURE.md`:** acrescentar `Display`, `Donuts` e `nook/`; alinhar `Oven` ("execution coordination layer"), `Artifact` → `Donuts (Artifacts)`, `Bench` e `Fridge`. Remover o conceito `Ingredient` e substituí-lo por `Cookbook` (ver o item abaixo).
      - **`FSD-ARCHITECTURE.md`:** `Bench` e `Fridge` **não** guardam logs nem estado de execução. O `Bench` guarda as tarefas, e o `status` de cada uma fica no próprio arquivo da tarefa. Remover dessas duas seções as responsabilidades de logs e estado (logs e estado de execução ficam em `.fsd/logs` e `.fsd/oven`).
      - **`Cookbook` no lugar de `Ingredient`:** o conceito `Ingredient` deixa de existir. `Cookbook` é o diretório `nook/cookbook/`, que contém as `Recipes` (workflows declarativos) e substitui `nook/recipes/`. Acrescentá-lo ao `GLOSSARY.md`, ao `FSD-ARCHITECTURE.md` (árvore de diretórios e camadas) e à árvore da F-2; remover `Ingredient` do glossário. Decisão pendente do autor: se `Recipe` continua como conceito do glossário (parece que sim, dentro do `Cookbook`).
  Depende de: F-1.1.

- [ ] **F-2 Organização de diretórios do framework FSD em um projeto** (`nook/` + `.fsd/`)
  Definir e documentar a estrutura de diretórios que o framework FSD cria e usa quando está em uso em um dado projeto. A estrutura é a do `docs/FSD-ARCHITECTURE.md` (seção "Directory Structure"), que substitui a proposta anterior baseada só em `.fsd/`. A mudança é aplicada na F-1.2; esta task detalha e documenta o resultado.

  ```text
  my-project/
  ├── nook/                  # Workspace do usuário
  │   ├── kitchen/           # Configuração, regras e contexto do projeto
  │   ├── bench/             # Tasks ativas (status: in_progress)
  │   ├── cookbook/          # Livro de receitas: contém as recipes (workflows declarativos)
  │   ├── bakers/            # Agentes de IA especializados (e craft)
  │   ├── display/           # Donuts prontos (status: done)
  │   └── fridge/            # Arquivo morto (cold storage)
  │
  └── .fsd/                  # Sistema interno e estado de execução
      ├── oven/              # Orquestração da execução
      ├── cache/             # Caches internos
      └── logs/              # Logs de execução
  ```

  Entregáveis:
  1. **Documento da estrutura** em `docs/`, com a função de cada diretório, o formato dos arquivos e o ciclo de vida de uma task por `status` (`nook/bench` → `nook/display` → `nook/fridge`), ligado ao índice pivô da F-1.2.
  2. **Conciliação com a `SPEC.md` 4.2:** hoje o `.fsd/` da CLI guarda `installed.json` (global e projeto) e `~/.fsd/config.json`. Com a nova estrutura, `.fsd/` é o diretório de sistema (`oven`, `cache`, `logs`) e `nook/kitchen/` guarda configuração, regras e contexto. Decidir onde ficam `installed.json` e as preferências da CLI (`theme`, `symbols`, `autoUpdate`, `updateSkills`), no escopo global e no de projeto.
  3. **Decisões em aberto** para o autor: o que `fsd init` cria (todos os diretórios ou sob demanda), o que entra no `.gitignore` (por exemplo `.fsd/cache`, `.fsd/logs`), formato das tasks (`.md` ou `.yaml`) e o formato do campo `status`.
  4. **Impacto nas tasks:** se `fsd init` ou o assistente passam a criar essa estrutura, e quais tasks e seções da spec mudam.
  Depende de: F-1.2.

## Fase 0.5 — Preparação técnica

- [ ] **F-3 Pacote e dependências** (SPEC 2, 10)
  `package.json`: nome `fred-ships-donuts`, `bin` só `fsd` → `./dist/cli/fsd.js`, `engines.node >=22`, `files: ["dist","src/skills"]`. Dependências: `commander`, `ink`, `react`. Dev: `@types/react`, `tsx`, `ink-testing-library`. Remover `@clack/prompts`. `tsconfig.json` com `jsx: react-jsx`. Script `dev` rodando `src/cli/fsd.ts`.
  Depende de: decisão do nome do pacote (resolvida: `fred-ships-donuts`).
- [ ] **F-4 Limpar o repositório** (SPEC 13)
  A migração do catálogo para `src/skills/_i18n/` já está commitada. Apagar `src/skills/fsd-padroes-codigo-csharp/` (cópia antiga) e decidir o `SKILL.md` roteador em `_i18n/fsd-csharp-code-standard/` (pendência do autor). **Não** apagar a pasta `graft/` (ignorada pelo git, fora do escopo).

## Fase 1 — Núcleo (sem UI)

- [ ] **F-5 `fsdDir.ts`** (SPEC 4.2): caminhos `~/.fsd` e `./.fsd`, criação sob demanda, gravação atômica (arquivo temporário + rename). Testes. Depende de: F-2.
- [ ] **F-6 `registry.ts`** (SPEC 4.3, 4.4): ler/gravar `installed.json`, registrar/remover, calcular estado (`not installed`, `up to date`, `outdated`, `missing`). Arquivo ausente ou ilegível = `not installed`. Testes. Depende de: F-2, F-5.
- [ ] **F-7 `config.ts`** (SPEC 8.2): `theme`, `symbols`, `autoUpdate`, `updateSkills`, `lastUpdateCheck`; padrões para arquivo ausente, ilegível ou `schema` desconhecido. Testes. Depende de: F-2, F-5.
- [ ] **F-8 Ajustar `skills.ts`** (SPEC 3, 4.4): remover `.fsd.json` por skill e a decisão "instalada" pela pasta; manter catálogo `_i18n`, frontmatter, semver com pré-release e cópia sem `evals/` e `README.md`. Atualizar testes. Depende de: F-4.
- [ ] **F-9 `actions/install.ts`** (SPEC 6.2): `install`, `upgrade`, `skip (up to date)`, `missing`, conflito fora do registro (sobrescrever só com autorização), substituição completa, bit de execução, registro gravado só após a cópia. Testes com `HOME`/`cwd` temporários. Depende de: F-6, F-8.
- [ ] **F-10 `actions/uninstall.ts`** (SPEC 6.8): remove pasta do `path` registrado e a entrada; `missing` só limpa a entrada; nunca apaga o que não está no registro. Testes. Depende de: F-6.
- [ ] **F-11 `selfUpdate.ts`** (SPEC 7): consulta ao npm (timeout 2 s), decisão de checar como função pura (`autoUpdate`, 24 h, instalação global vs `npx`), atualização da CLI. Testes sem rede. Depende de: F-7.

## Fase 2 — Comandos

- [ ] **F-12 `fsd.ts` com commander** (SPEC 5): `-h/--help` (e sem argumentos, exit 0), `-v/--version`, `init`, `update`, `update skill [nome]`, atalhos `-u`/`-s` em todas as combinações, erros de uso com exit 1, import dinâmico de `ui/` só em `init`, shebang. Testes de binário (saída e exit codes). Depende de: F-3.
- [ ] **F-13 `commands/update.ts`** (SPEC 5.2, 5.3, 7): `fsd update` (CLI, ignora limite de 24 h, `npx` = nada a atualizar), `fsd update skill [nome]` (global + projeto, erros `is not installed` / `not found in catalog`), `updateSkills` disparando novo processo `fsd update skill` na versão nova. Testes. Depende de: F-9, F-11, F-12.
- [ ] **F-14 `commands/init.ts`** (SPEC 5.1): valida argumentos e TTY (`fsd init requires an interactive terminal`, exit 1), aplica auto-update, abre o assistente. Depende de: F-11, F-12, F-18, F-19, F-20.

## Fase 3 — Assistente (Ink)

- [ ] **F-15 `progress.ts`** (SPEC 6.4): lista de passos dos fluxos Instalar (8 ou 7 sem idioma) e Apagar (3) e cálculo da barra, funções puras. Testes.
- [ ] **F-16 `theme.ts`** (SPEC 6.5): 4 temas e conjuntos de símbolos como contexto React, `NO_COLOR`. Depende de: pendências de layout do autor (paletas, símbolos).
- [ ] **F-17 `Header`/`Footer`/`App`** (SPEC 6.1): cabeçalho, rodapé com dica de teclas e barra, navegação (`enter`, `esc`, `ctrl+c` = exit 130, nada gravado antes do resumo). Depende de: F-15, F-16 e do logotipo/cabeçalho definido pelo autor (SPEC 6.7).
- [ ] **F-18 Menu** (SPEC 6.2): Instalar, Apagar, Sair (sem "Atualizar"). Depende de: F-17.
- [ ] **F-19 Passos do fluxo Instalar** (SPEC 6.2): escopo, serviço de IA, skills (com estado), idioma condicional, atualização (`autoUpdate` e `updateSkills`), tema, símbolos, resumo com conflitos e resultado. Grava `config.json` ao confirmar. Depende de: F-6, F-7, F-9, F-17.
- [ ] **F-20 Fluxo Apagar** (SPEC 6.8): escopo, skills do registro, resumo. Depende de: F-10, F-17.
- [ ] **F-21 Testes do assistente** (SPEC 11): `ink-testing-library` nos componentes; validação final manual em terminal real. Depende de: F-17, F-18, F-19, F-20.

## Fase 4 — Fechamento

- [ ] **F-22 Testes do catálogo** (SPEC 11): `name` igual ao diretório, `metadata.version` válida e igual entre idiomas. Depende de: F-4, F-8.
- [ ] **F-23 Critérios de aceitação** (SPEC 12): percorrer todos os itens da seção 12 (a quantidade vem da spec vigente) e registrar o resultado. Depende de: F-13, F-14, F-21, F-22.
- [ ] **F-24 Empacotamento** (SPEC 10): bit de execução em `dist/cli/fsd.js`, `npm pack --dry-run` contendo `dist/` e `src/skills/_i18n/`, teste de `npx -p fred-ships-donuts fsd init`. Depende de: F-3, F-12.
- [ ] **F-25 README**: uso (`fsd init`, `fsd update`, `fsd update skill`, atalhos `-u`/`-s`, `-h`, `-v`). Depende de: F-12, F-13, F-14.

## Pendências do autor que bloqueiam tasks

- Logotipo e itens do cabeçalho, conjuntos de símbolos, largura mínima, paletas dos temas (SPEC 6.7): F-16, F-17.
- Apagar ou manter o `SKILL.md` roteador e a cópia antiga `fsd-padroes-codigo-csharp/`: F-4.
- Decisões em aberto da F-2 (o que `fsd init` cria, `.gitignore`, formato das tasks e do `status`; onde ficam `installed.json` e as preferências da CLI): F-5, F-6, F-7.
- Revisar as decisões marcadas em SPEC 13 ("Revisar"): afetam F-13 e F-19.
