# Contribuindo com o fsd

Fluxo de trabalho do projeto, seguindo o modelo do GitHub: **issue → branch → pull request → merge**. O desenho do produto fica na [`SPEC.md`](SPEC.md); o que fazer, por quê e em que estado está fica nos issues.

## Papéis

| Papel | Quem | O que faz |
|---|---|---|
| Autor | Frederico Jacobi | Decide o produto, aprova e faz o merge dos PRs na `main`. |
| Product Manager | sessão do Claude | Mantém issues, milestones, labels e o Project; registra as decisões do autor nos issues; mantém a `SPEC.md`. |
| Arquiteto | sessão do Claude | Prepara cada issue para o desenvolvimento e revisa os PRs. |
| Desenvolvedor | sessão do Claude (Node Typescript Developer) | Implementa o issue num branch e abre o PR. |

Todos usam a conta do autor no GitHub. Por isso cada comentário ou revisão feito em nome de um papel começa com o nome dele, por exemplo **Arquiteto:** ou **Decisão (autor, 2026-11-07):**.

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
| Review | PR aberto; o Arquiteto revisa no PR. Um bloqueio devolve o issue para Developing. |
| Done | PR mesclado na `main`; o issue foi fechado pelo `Closes #N`. |

## 3. Branch

- Um branch por issue, a partir da `main`: `<número>-<slug>`, por exemplo `6-transaction-core`.
- Os commits citam o issue: `feat(F-40a): núcleo de transação (#6)`.
- Ninguém dá push na `main`, nem force-push.

## 4. Pull request

- Um PR por issue, com base na `main`. O corpo traz `Closes #N`, como foi verificado e os desvios da `SPEC.md` (de preferência nenhum).
- O Arquiteto revisa no PR. A revisão separa **bloqueia** de **melhoria** e é publicada como revisão do PR.
- O autor aprova e faz o merge. O merge fecha o issue e o card vai para Done.
- Mudanças só de documentação (`SPEC.md`, `TASKS.md`, `docs/`) também entram por PR.

## 5. Verificação

Os testes automatizados foram removidos por decisão do autor (`SPEC.md` 11). Cada issue traz em "Como verificar (aceite)" a verificação manual. O PR relata o que foi rodado e o que saiu.

## 6. Coordenação entre as sessões

- Toda mensagem entre as sessões cita o commit ou o PR de onde ler.
- Hashes são copiados do `git`, nunca escritos de memória.
- O autor decide pela sessão do Product Manager, que registra a decisão no issue.
