# Contribuindo com o fsd

Fluxo de trabalho do projeto, seguindo o modelo do GitHub: **issue → branch → pull request → merge**. O desenho do produto fica na [`SPEC.md`](SPEC.md); o que fazer, por quê e em que estado está fica nos issues.

## Papéis

| Papel | Quem | Conta no GitHub | O que faz |
|---|---|---|---|
| Autor | Frederico Jacobi | `fredericojacobi` | Decide o produto e é o único que faz o merge na `main`. |
| Product Manager | Kevin (agente) | `fsd-kevin[bot]` | Mantém issues, milestones, labels e o Project; registra as decisões do autor nos issues; mantém a `SPEC.md`, o `TASKS.md` e este arquivo. Revisa os PRs quanto ao escopo e ao aceite. |
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
| Done | PR mesclado na `main`; o issue foi fechado pelo `Closes #N`. |

## 3. Branch

- Um branch por issue, a partir da `main`: `<número>-<slug>`, por exemplo `6-transaction-core`.
- Os commits citam o issue: `feat(F-40a): núcleo de transação (#6)`.
- Ninguém dá push na `main`, nem force-push.

## 4. Pull request

- Um PR por issue, com base na `main`. O corpo traz `Closes #N`, como foi verificado e os desvios da `SPEC.md` (de preferência nenhum).
- O Arquiteto revisa no PR. A revisão separa **bloqueia** de **melhoria** e é publicada como revisão do PR.
- O QA verifica e publica uma revisão: aprova se tudo passou, ou pede mudanças com o passo a passo para reproduzir.
- O Stuart responde com commits novos, sem force-push.
- O autor faz o merge. O merge fecha o issue e o card vai para Done.

A `main` é protegida pelo ruleset `ProtMain`:
- o merge é só por **squash**, com histórico linear;
- precisa de **1 aprovação**, de alguém que não é o autor do PR;
- um push novo derruba as aprovações, e a aprovação tem que vir depois do último push. Depois de uma correção, quem aprovou aprova de novo;
- todas as conversas da revisão precisam estar resolvidas;
- ninguém dá push direto nem apaga a `main`; só o autor faz o merge.
- Mudanças só de documentação (`SPEC.md`, `TASKS.md`, `docs/`) também entram por PR.

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
