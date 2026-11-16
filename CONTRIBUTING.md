# Contribuindo com o fsd

Fluxo de trabalho do projeto, seguindo o modelo do GitHub: **issue → branch → pull request → merge**. A `develop` é a branch de integração da equipe e a branch padrão do repositório: todo branch de issue sai dela e todo PR volta para ela. A `main` recebe só o PR `develop → main`, mesclado pelo autor. O desenho do produto fica na [`docs/spec/MAP.md`](docs/spec/MAP.md); o que fazer, por quê e em que estado está fica nos issues.

## Papéis

| Papel | Quem | Conta no GitHub | O que faz |
|---|---|---|---|
| Autor | Frederico Jacobi | `fredericojacobi` | Dono do produto e o único que faz o merge na `main`. Os agentes não interagem com ele: o que ele escreve por conta própria no GitHub vale, e o Kevin decide no lugar dele. |
| Product Manager | Kevin (agente) | `fsd-kevin[bot]` | Mantém issues, milestones, labels e o Project; decide produto, escopo e aceite e registra a decisão no issue; mantém `docs/spec/`, `docs/DECISIONS.md` e este arquivo. Revisa os PRs quanto ao escopo e ao aceite e mescla os PRs de agentes prontos e parados. |
| Arquiteto | Mel (agente) | `fsd-mel[bot]` | Prepara cada issue para o desenvolvimento (comentário **Arquiteto: passagem**) e revisa o código dos PRs. Mantém o `docs/ARQUITETURA.md`. |
| Desenvolvedor | Stuart (agente) | `fsd-stuart[bot]` | Implementa o issue num branch, abre o PR e responde às revisões. |
| QA | Bob (agente) | `fsd-bob[bot]` | Verifica o PR rodando o app real contra o aceite do issue. Aprova ou pede mudanças, e abre issue de bug para o que estiver fora do escopo. Não corrige código. |

Cada agente é um GitHub App com conta própria. Os comentários, as revisões e os commits saem assinados por quem os fez, e por isso não começam com o nome do papel. Duas marcas continuam:
- o título **Arquiteto: passagem** na passagem;
- o prefixo `Decision (PM, <YYYY-MM-DD>): …` quando o Kevin registra uma decisão (`fsd-issue decide`).

Ninguém aprova o próprio PR.

## 1. Issue

Todo trabalho começa num issue: uma task, um bug, uma ideia, uma decisão pendente.

- **Corpo**: o que fazer, por quê, como verificar (aceite) e as referências à `docs/spec/MAP.md`. Uma task fica completa no corpo do issue.
- **Comentários**: a discussão e as decisões. Uma decisão vira um comentário `Decision (PM, <data>): …`, por `fsd-issue decide`. Se ela muda o desenho, a `docs/spec/` (ou `docs/DECISIONS.md`) é atualizada no mesmo PR que implementa a mudança, ou num PR de documentação.
- **Labels**:
  - `area:*` diz a parte do produto;
  - `size:S|M|L` dá a estimativa;
  - `decision` marca o que precisa de uma decisão do Kevin antes de virar task (#39 e #40 são reservadas pelo autor e ficam no Backlog, intocadas);
  - `bug` marca um defeito.
- **Milestone**: a fase, por exemplo [Fase 6 — tasks do nook/](https://github.com/fredericojacobi/fred-ships-donuts/milestone/1). O progresso da fase é o do milestone.

### 1.1 A cadeia de documentos

Cada entrega percorre documentos em cadeia, na medida do tamanho do issue. Os nomes das etapas estão no [`docs/GLOSSARY.md`](docs/GLOSSARY.md) e ficam sem tradução. Os modelos, os exemplos, os limites de tamanho e a regra de `Source:` estão em [`docs/templates/README.md`](docs/templates/README.md); aqui só se aponta para eles.

| Etapa | Quem | Modelo | Exemplo |
|---|---|---|---|
| Craving (ideia) | Kevin | [`craving.md`](docs/templates/craving.md) | [`examples/craving.md`](docs/templates/examples/craving.md) |
| Flavor (o issue: What + Acceptance) | Kevin | [`flavor.md`](docs/templates/flavor.md) | [`examples/flavor.md`](docs/templates/examples/flavor.md) |
| Rise (TECH REVIEW) | Mel | [`rise.md`](docs/templates/rise.md) | [`examples/rise.md`](docs/templates/examples/rise.md) |
| Tray (PLAN) | Mel | [`tray.md`](docs/templates/tray.md) | [`examples/tray.md`](docs/templates/examples/tray.md) |
| Step (TASK) | Stuart | [`step.md`](docs/templates/step.md) | [`examples/step.md`](docs/templates/examples/step.md) |
| Taste (QA REVIEW) | Bob | [`taste.md`](docs/templates/taste.md) | [`examples/taste.md`](docs/templates/examples/taste.md) |

Todo issue leva uma label `size:`, e ela diz quanto da cadeia a entrega usa:

- **size:L**: os seis documentos (Craving, Flavor, Rise, Tray, Step, Taste). A passagem do Arquiteto é um comentário com dois títulos, `## TECH REVIEW` e depois `## PLAN`.
- **size:M**: o issue (What + Acceptance), uma passagem curta do Arquiteto (`What to do`, `Files`, `Verification`) e um Taste.
- **size:S**: o issue (What + Acceptance) e um Taste. Não há passagem: o issue vai direto para Ready for Development (Stuart).

O relatório da seção 5 segue o Taste em todos os tamanhos: `Result` (`pass` ou `fail`) e uma linha por item de aceite do issue, numerados `A1…`, com o comando, o esperado e o obtido.

As skills do time que produzem e consomem esses documentos ficam em `team/agents/<agente>/claude/skills/` (as de processo e de projeto) e em `team/common/skills/` (as técnicas, ligadas por link em cada agente que as usa). Não há cópia em outro lugar: a fonte é a própria skill. O mapa completo está em `team/README.md`. Elas são escritas em inglês, com nome no padrão oficial (gerúndio); o prefixo `fsd-` fica reservado às skills que o produto entrega.

## 2. Project (quadro)

[FSD - Fred Ships Donuts](https://github.com/users/fredericojacobi/projects/3), campo **Status**:

*Ready* é a fila que o papel puxa; *-ing* é alguém trabalhando. Entre parênteses, o responsável pela coluna. Os comandos `fsd-*` movem o card e aceitam o nome com ou sem o responsável.

| Coluna | Significa |
|---|---|
| Backlog (Kevin) | Fora da fase atual. |
| Ready for Architecture (Mel) | Planejado, na fila do Arquiteto. |
| Architecting (Mel) | O Arquiteto prepara a passagem, num comentário **Arquiteto: passagem** com o que fazer, os arquivos, os riscos e a verificação. |
| Ready for Development (Stuart) | Preparado, na fila do desenvolvedor. |
| Developing (Stuart) | Branch aberto, em implementação de trabalho **novo**. |
| In Review (Mel, Bob) | PR aberto. A revisão pede **2 aprovações** quaisquer entre os colegas (Arquiteto, QA, PM), em paralelo. Um pedido de mudança leva o issue para Changes Requested. |
| Changes Requested (Stuart) | A revisão pediu mudanças: o autor corrige antes de qualquer card novo. O `fsd-pr open` com a correção devolve o issue para In Review. |
| Ready to Merge (Kevin) | O PR tem 2 aprovações no último commit e nenhum pedido de mudança: espera o merge, feito pelo autor do PR com `fsd-merge <n>`. |
| Done | PR mesclado na `develop`; o issue foi fechado pelo `Closes #N` (a `develop` é a branch padrão). |

## 3. Branch

- Um branch por trabalho, num worktree próprio criado a partir da `develop` por `fsd-dev start <n>` (com tarefa: grava o issue no branch) ou `fsd-dev start - <slug>` (sem tarefa). Ninguém troca de branch na pasta principal.
- Git só com os comandos simples: `checkout`, `branch`, `commit`, `pull`, `push` e `merge`. Sem rebase, squash, cherry-pick nem `reset --hard`.
- **Um commit por contexto:** cada commit é assertivo, sucinto e independente, e faz sentido sozinho. Código e a documentação que o acompanha vão no mesmo commit. Um PR pode ter quantos commits precisar (por exemplo, quando o trabalho se divide em etapas ou momentos diferentes), sem limite; o que não pode é um commit por alteração mínima do mesmo contexto. Nada de `wip`, `fix typo` ou `checkpoint`: junte esses no commit do contexto antes do push.
- **Um card por vez:** o `fsd-dev start` recusa com outro card em Developing ou Changes Requested. Pedido de mudança: card → Changes Requested → `fsd-pr open` com a correção → In Review; esperar revisão não impede o próximo card. Impedimento real leva a label `blocked` e um comentário `Blocked by #<m>: <o que destrava>`.
- Branch mesclado há mais de 1 h some sozinho (worktree, branch local e remoto): o `fsd-cleanup` faz isso, nenhum agente apaga branch.
- `fsd-dev sync` (traz a `develop` para o branch, por merge) só quando o PR está em conflito. O último passo do desenvolvedor é o PR aberto sem conflito com a `develop` (o `fsd-pr open` recusa um branch em conflito; revisão e QA recusam PR em conflito); o conflito que surge depois de outro merge também é dele.
- Nome: `<tipo>/<número>-<slug>` com tarefa (`feature/6-transaction-core`) e `<tipo>/<slug>` sem (`chore/docs-cleanup`), com o slug em minúsculas e hífens. O tipo é um dos tipos de commit (abaixo) ou `feature`; o `fsd-dev start` usa `feature` por padrão e `--fix`, `--docs` ou `--chore`.
- As branches antigas (`feat/nook-tasks`, `plan/nook-tasks`) não são renomeadas.
- **Mensagens de commit:** [Conventional Commits](https://www.conventionalcommits.org/), `<tipo>[(escopo)][!]: <resumo>`; com tarefa, o cabeçalho termina com o issue: `fix: wizard exits 1 after a failed run (#76)`. A regra completa (tipos, tamanhos, `!` e `BREAKING CHANGE:`) é a do `commitlint.config.mjs`, a única fonte: o `fsd-pr open` confere os commits novos antes do push e o CI (`.github/workflows/commits.yml`) confere os do PR; os dois recusam o que foge dela.
- Ninguém dá push direto na `develop` nem na `main`, e ninguém faz force-push.

## 4. Pull request

- Um PR por trabalho, com base na `develop` (`fsd-pr open`). Com tarefa, o corpo traz `Closes #N`; sempre traz como foi verificado e os desvios da `docs/spec/MAP.md` (de preferência nenhum).
- O Arquiteto revisa no PR. A revisão separa **bloqueia** de **melhoria** e é publicada como revisão do PR.
- O QA verifica e publica uma revisão: aprova se tudo passou, ou pede mudanças com o passo a passo para reproduzir.
- O Stuart responde com um commit novo por rodada de correção, sem force-push.
- Com 2 aprovações, o autor do PR mescla na `develop` com `fsd-merge <n>` (merge comum). O merge fecha o issue, e o card vai para Done. PR de agente pronto e parado há 10 minutos, o Kevin mescla com `fsd-merge --ready`.
- Mudanças só de documentação (`CONTRIBUTING.md`, `docs/`) também entram por PR.

Regras da `develop`:
- o merge é um **merge comum** (merge commit), sem squash nem rebase: assim um branch que saiu de outro continua reconhecendo os commits já mesclados e não dá conflito à toa;
- precisa de **2 aprovações** de colegas, nunca do autor do PR;
- um push novo derruba as aprovações, e a aprovação tem que vir depois do último push. Depois de uma correção, quem aprovou aprova de novo;
- todas as conversas da revisão precisam estar resolvidas, sem nenhum pedido de mudança em aberto;
- entra só por PR, via `fsd-merge`. Ninguém dá push direto, e nenhum branch é apagado.

A `main` é do autor e é protegida pelo ruleset `ProtMain`:
- ela recebe só o PR `develop → main`, e só o autor o mescla;
- o merge é um **merge comum** (merge commit), sem squash nem rebase;
- precisa de **1 aprovação**, de alguém que não é o autor do PR, vinda depois do último push;
- todas as conversas da revisão precisam estar resolvidas;
- ninguém dá push direto nem apaga a `main`.

### Changelog

O `CHANGELOG.md` (raiz, em inglês) segue o [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) e o [SemVer](https://semver.org/spec/v2.0.0.html), e vai no pacote npm.
- **Quem e quando:** quem faz o PR (o dev) escreve a linha no mesmo PR, em `## [Unreleased]`, para todo `feat`, `fix` ou mudança incompatível (`!`) que mexe no produto (`src/cli/`, `src/skills/`, `package.json`).
- **Como:** uma linha para quem usa a CLI, não o cabeçalho do commit, no grupo certo (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`, nessa ordem), terminando com os links do PR e do issue: `([#108](https://github.com/fred-ships-donuts/fsd/pull/108), [#103](https://github.com/fred-ships-donuts/fsd/issues/103))`. Mudança incompatível começa com **BREAKING** e traz a nota de migração.
- **O que fica de fora:** `team/`, só docs, CI e refactors sem efeito visível. Esses PRs levam o label `no-changelog`, posto por quem abre o PR ou pelo Kevin.
- **CI:** o check `changelog` falha um PR `feat`/`fix`/`!` que mexe em `src/cli/`, `src/skills/` ou `package.json`, não toca o `CHANGELOG.md` e não tem o label `no-changelog`. Ele só confere que o arquivo foi tocado; o texto é revisado pela Mel e pelo Bob.
- **Release (Kevin):** renomeia `## [Unreleased]` para `## [x.y.z] - AAAA-MM-DD`, abre um `Unreleased` novo e vazio, atualiza os links de comparação no fim, sobe o `version` do `package.json`, cria a tag `vX.Y.Z` e publica a Release com o texto da seção: `gh release create vX.Y.Z --notes-file <arquivo>`.

## 5. Verificação

Testes unitários são regra do projeto para o que é relevante (`docs/ARQUITETURA.md#tests`): o PR traz os testes do comportamento que mudou, e `npm test` passa. Cada issue traz em "Como verificar (aceite)" a verificação manual. O PR relata o que foi rodado e o que saiu.

A verificação do PR é do QA (Bob):
- **Ambiente próprio:** ele baixa o branch do PR num worktree só dele, compila e roda o fsd num tmux de 80x24, com `HOME` e pastas temporárias, sem tocar na janela nem nos arquivos do autor.
- **O que confere:** cada item do aceite, mais os casos de borda óbvios da passagem. Anota o comando, o esperado e o obtido.
- **Resultado:**
  - tudo passou: aprova o PR com a lista do que rodou;
  - falhou no escopo do PR: pede mudanças e o issue vai para Changes Requested (Stuart);
  - bug fora do escopo: abre um issue `bug` com passos, esperado, obtido e ambiente (commit, versão do Node, terminal).
- **Fora do QA:** o cabeçalho (a rosquinha) é conferido pelo autor; o QA não faz testes visuais dele.

**Antes de um PR que move ou renomeia arquivos**, rode `npm run check:paths` (`team/setup/check-paths`). Ele confere os links Markdown e âncoras, os caminhos dos scripts do time e da instalação, os links simbólicos e os caminhos do produto (`package.json`, `tsconfig.json`, imports de `src/`). Cada problema sai como `arquivo:linha`, e a saída é 1 se houver algum. Corrija a referência no mesmo PR.

## 6. Coordenação entre as sessões

- Toda mensagem entre as sessões cita o commit ou o PR de onde ler.
- Hashes são copiados do `git`, nunca escritos de memória.
- Nenhum agente pergunta, avisa, menciona ou espera o autor, por nenhum meio. Dúvida técnica: o Mel decide. Produto, escopo e aceite: o Kevin decide e registra no issue.
- O que é oficial (decisão, passagem, revisão, resultado de QA, bug) fica num comentário ou numa revisão no GitHub. Mensagem direta entre as sessões serve só para conversa rápida.

### O time trabalha sozinho

Ninguém espera o autor nem uma sessão humana para seguir.
- **Esperar:** quem não tem trabalho ou espera outro agente arma um `Monitor` com `fsd-wait any`, que acorda a sessão com a próxima coisa do seu papel. Antes, Mel, Stuart e Bob avisam o Kevin com `fsd-notify kevin "parado: …; fila: …; esperando: …"`, e ele responde com `pegue #N` ou `aguarde`.
- **Passagem:** o registro oficial fica no GitHub (comentário, revisão, PR). Os comandos `fsd-*` já movem o card e avisam quem segue; para falar com alguém fora deles, `fsd-notify <agente>`. Não avise duas vezes.
- **Dúvidas:**
  - técnica (do Stuart ou do Bob): vai à Mel, que decide;
  - de produto, escopo ou aceite: vai ao Kevin, que decide (ouvindo a Mel quando toca o desenho) e registra com `fsd-issue decide`.
  - Ninguém fica parado esperando a resposta: segue com o que não depende dela.
- **Ação bloqueada** (permissão, modo automático, App sem acesso): tente outro caminho legítimo. Se não houver, registre no issue ou no PR e siga com o resto.
- **Só do autor:** o merge na `main` e as ações destrutivas.
