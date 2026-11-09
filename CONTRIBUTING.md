# Contribuindo com o fsd

Fluxo de trabalho do projeto, seguindo o modelo do GitHub: **issue → branch → pull request → merge**. A `develop` é a branch de integração da equipe e a branch padrão do repositório: todo branch de issue sai dela e todo PR volta para ela. A `main` recebe só o PR `develop → main`, mesclado pelo autor. O desenho do produto fica na [`SPEC.md`](SPEC.md); o que fazer, por quê e em que estado está fica nos issues.

## Papéis

| Papel | Quem | Conta no GitHub | O que faz |
|---|---|---|---|
| Autor | Frederico Jacobi | `fredericojacobi` | Decide o produto e é o único que faz o merge na `main`. |
| Product Manager | Kevin (agente) | `fsd-kevin[bot]` | Mantém issues, milestones, labels e o Project; registra as decisões do autor nos issues; mantém a `SPEC.md`, o `TASKS.md` e este arquivo. Revisa os PRs quanto ao escopo e ao aceite. É o único que mescla na `develop` os PRs aprovados. |
| Arquiteto | Mel (agente) | `fsd-mel[bot]` | Prepara cada issue para o desenvolvimento (comentário **Arquiteto: passagem**) e revisa o código dos PRs. Mantém o `docs/ARQUITETURA.md`. |
| Desenvolvedor | Stuart (agente) | `fsd-stuart[bot]` | Implementa o issue num branch, abre o PR e responde às revisões. |
| QA | Bob (agente) | `fsd-bob[bot]` | Verifica o PR rodando o app real contra o aceite do issue. Aprova ou pede mudanças, e abre issue de bug para o que estiver fora do escopo. Não corrige código. |

Cada agente é um GitHub App com conta própria. Os comentários, as revisões e os commits saem assinados por quem os fez, e por isso não começam com o nome do papel. Duas marcas continuam:
- o título **Arquiteto: passagem** na passagem;
- o prefixo `Decisão (autor, <AAAA-MM-DD>): …` quando o Kevin registra uma decisão do autor.

Ninguém aprova o próprio PR.

## 1. Issue

Todo trabalho começa num issue: uma task, um bug, uma ideia, uma decisão pendente.

- **Corpo**: o que fazer, por quê, como verificar (aceite) e as referências à `SPEC.md`. Uma task fica completa no corpo do issue.
- **Comentários**: a discussão e as decisões. Uma decisão do autor vira um comentário `Decisão (autor, <data>): …`. Se ela muda o desenho, a `SPEC.md` é atualizada no mesmo PR que implementa a mudança, ou num PR de documentação.
- **Labels**:
  - `area:*` diz a parte do produto;
  - `tamanho:P|M|G` dá a estimativa;
  - `backlog` marca o que está fora da fase atual;
  - `decisão` marca o que precisa do autor antes de virar task;
  - `cp*` marca o checkpoint de revisão.
- **Milestone**: a fase, por exemplo [Fase 6 — tasks do nook/](https://github.com/fredericojacobi/fred-ships-donuts/milestone/1). O progresso da fase é o do milestone.

## 2. Project (quadro)

[FSD - Fred Ships Donuts](https://github.com/users/fredericojacobi/projects/3), campo **Status**:

| Coluna | Significa |
|---|---|
| Backlog | Fora da fase atual. |
| Waiting for Architecture | Planejado, esperando o Arquiteto preparar. |
| Architecting | O Arquiteto prepara a passagem, num comentário **Arquiteto: passagem** com o que fazer, os arquivos, os riscos e a verificação. |
| Waiting for Development | Preparado, esperando o desenvolvedor. |
| Developing | Branch aberto, em implementação. |
| Review | PR aberto. O Arquiteto revisa o código, o QA verifica no app real e o PM confere o escopo. Um bloqueio do Arquiteto ou uma falha do QA devolve o issue para Developing. Com o Arquiteto e o QA aprovando, o card vai para Waiting for Release. |
| Waiting for Release | Review terminada: o Arquiteto e o QA aprovaram o head atual do PR, sem pedido de mudança nem conversa aberta. O comentário de aprovação pede **→ Waiting for Release**. O card espera ali o merge ou a publicação. Um commit novo que peça outra rodada, ou um pedido de mudança, devolve o issue para Developing. |
| Done | PR mesclado na `develop`; o issue foi fechado pelo `Closes #N` (a `develop` é a branch padrão). |

## 3. Branch

- Um branch por issue, a partir da `develop` atualizada: `git checkout develop && git pull && git checkout -b feature/6-transaction-core`.
- Git só com os comandos simples: `checkout`, `branch`, `commit`, `pull`, `push` e `merge`. Para trazer a `develop` para o branch: `git pull origin develop` (é um merge). Sem rebase, squash, cherry-pick nem reset.
- Nome: `<tipo>/<número>-<slug>`, com o slug em minúsculas e hífens. Os tipos são:
  - `feature/`: funcionalidade;
  - `fix/`: correção;
  - `docs/`: só documentação;
  - `chore/`: manutenção, sem mudar comportamento.
- As branches antigas (`feat/nook-tasks`, `plan/nook-tasks`) não são renomeadas.
- Os commits citam o issue: `feat(F-40a): núcleo de transação (#6)`.
- Ninguém dá push direto na `develop` nem na `main`, e ninguém faz force-push.

## 4. Pull request

- Um PR por issue, com base na `develop` (`gh pr create --base develop`). O corpo traz `Closes #N`, como foi verificado e os desvios da `SPEC.md` (de preferência nenhum).
- O Arquiteto revisa no PR. A revisão separa **bloqueia** de **melhoria** e é publicada como revisão do PR.
- O QA verifica e publica uma revisão: aprova se tudo passou, ou pede mudanças com o passo a passo para reproduzir.
- O Stuart responde com commits novos, sem force-push.
- O Kevin (PM) mescla na `develop` com `gh pr merge <n> --merge` (merge comum). O merge fecha o issue, e o card vai para Done. Nenhum outro agente roda `gh pr merge`.
- Mudanças só de documentação (`SPEC.md`, `TASKS.md`, `CONTRIBUTING.md`, `docs/`) também entram por PR.

Regras da `develop`:
- o merge é um **merge comum** (merge commit), sem squash nem rebase: assim um branch que saiu de outro continua reconhecendo os commits já mesclados e não dá conflito à toa;
- precisa de **1 aprovação de outro agente**, nunca do autor do PR;
- um push novo derruba as aprovações, e a aprovação tem que vir depois do último push. Depois de uma correção, quem aprovou aprova de novo;
- todas as conversas da revisão precisam estar resolvidas, sem nenhum pedido de mudança em aberto;
- só o Kevin mescla, e só por PR. Ninguém dá push direto.

A `main` é do autor e é protegida pelo ruleset `ProtMain`:
- ela recebe só o PR `develop → main`, e só o autor o mescla;
- o merge é um **merge comum** (merge commit), sem squash nem rebase;
- precisa de **1 aprovação**, de alguém que não é o autor do PR, vinda depois do último push;
- todas as conversas da revisão precisam estar resolvidas;
- ninguém dá push direto nem apaga a `main`.

## 5. Verificação

Os testes automatizados foram removidos por decisão do autor (`SPEC.md` 11). Cada issue traz em "Como verificar (aceite)" a verificação manual. O PR relata o que foi rodado e o que saiu.

A verificação do PR é do QA (Bob):
- **Ambiente próprio:** ele baixa o branch do PR num worktree só dele, compila e roda o fsd num tmux de 80x24, com `HOME` e pastas temporárias, sem tocar na janela nem nos arquivos do autor.
- **O que confere:** cada item do aceite, mais os casos de borda óbvios da passagem. Anota o comando, o esperado e o obtido.
- **Resultado:**
  - tudo passou: aprova o PR com a lista do que rodou;
  - falhou no escopo do PR: pede mudanças e o issue volta para Developing;
  - bug fora do escopo: abre um issue `bug` com passos, esperado, obtido e ambiente (commit, versão do Node, terminal).
- **Fora do QA:** o cabeçalho (a rosquinha) é conferido pelo autor; o QA não faz testes visuais dele.

## 6. Coordenação entre as sessões

- Toda mensagem entre as sessões cita o commit ou o PR de onde ler.
- Hashes são copiados do `git`, nunca escritos de memória.
- O autor decide pelo Kevin, que registra a decisão no issue. Dúvida técnica vai ao Mel; o que sobrar vai ao Kevin, que pergunta ao autor.
- O que é oficial (decisão, passagem, revisão, resultado de QA, bug) fica num comentário ou numa revisão no GitHub. Mensagem direta entre as sessões serve só para conversa rápida.

### O time trabalha sozinho

Ninguém espera o autor nem uma sessão humana para seguir.
- **Esperar:** quem espera outro agente ou o GitHub (aprovação, merge, PR novo, comentário) arma um `Monitor` com um laço sobre o `gh` e segue quando ele avisar.
- **Passagem nos dois canais:** cada passagem tem o registro oficial no GitHub (comentário, revisão, PR) e um `SendMessage` para quem segue, citando o link. Quem recebe começa sem esperar outra pessoa.
  - O Stuart abre ou atualiza um PR → avisa a Mel, o Bob e o Kevin.
  - A Mel revisa → com bloqueio, pede mudanças e avisa o Stuart; aprovado, avisa o Kevin.
  - O Bob verifica → se falhou, pede mudanças e avisa o Stuart; se passou, aprova e avisa o Kevin; um bug fora do escopo vira issue, e ele avisa o Kevin.
  - O Kevin mescla na `develop` → avisa o Stuart (próximo issue liberado), a Mel e o Bob.
  - A Mel publica a passagem de um issue → avisa o Kevin e o Stuart.
- **Dúvidas:**
  - técnica (do Stuart ou do Bob): vai à Mel;
  - de escopo ou de aceite: vai ao Kevin;
  - de produto: vai ao Kevin, que a registra no issue com a label `decisão` e a recomendação dele. Ele é o único que leva a dúvida ao autor.
  - Ninguém fica parado esperando a resposta: segue com o que não depende dela. Só uma decisão do autor desbloqueia uma dúvida de produto, e ninguém inventa a decisão.
- **Ação bloqueada** (permissão, modo automático, App sem acesso): tente outro caminho legítimo. Se não houver, registre no issue ou no PR e siga com o resto.
- **Só com o autor:** o merge na `main`, as decisões de produto e as ações destrutivas.
