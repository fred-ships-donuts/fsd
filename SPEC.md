# SPEC — fsd (Fred Ships Donuts CLI)

CLI para instalar, atualizar e remover as skills do Claude Code criadas por Frederico Jacobi.

> §1–§8 moved: see `docs/spec/MAP.md`.

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
- **Layout**: o cabeçalho (rosquinha, nome, 35% da altura, 80 × 24 como partida) está decidido em 6.10; a posição do idioma, os símbolos e a paleta foram decididos em 2026-11-09 (6.7). A estética das letras de 2 e 4 linhas e a definição da rosquinha de 6 linhas seguem em evolução.
- **Próximas fatias do `nook/`** (fora da Fase 6 e da v1, decidido em 2026-11-09): na ordem Kitchen (#20), Cookbook (#21) e Bakers (#22). O Oven continua conceitual, sem estado em `.fsd/oven/`, e `fsd task archive` é o único caminho do `rack` ao `fridge` (#23).
- ~~**Revisar**~~: confirmado em 2026-11-09 (#17): `update skill` cobre os escopos global e projeto (o de projeto só se existir `./.fsd/installed.json`); `updateSkills` vem desligado por padrão; não há `fsd init --no-update`; `fsd update` ignora o limite de 24 h.
- **Publicação da v1** (#12, decidido em 2026-11-09): no fim da Fase 6. Antes dela, uma task de preparo confere o pacote com `npm pack` e instala e roda o tarball (via `npx` e global) num `HOME` temporário.

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
