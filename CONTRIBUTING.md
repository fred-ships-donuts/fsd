# Contribuindo com o fsd

Fluxo de trabalho do projeto, seguindo o modelo do GitHub: **issue → branch → pull request → merge**. A `develop` é a branch de integração da equipe e a branch padrão do repositório: todo branch de issue sai dela e todo PR volta para ela. A `main` recebe só o PR `develop → main`, mesclado pelo autor. O desenho do produto fica na [`SPEC.md`](SPEC.md); o que fazer, por quê e em que estado está fica nos issues.

## Papéis

| Papel | Quem | Conta no GitHub | O que faz |
|---|---|---|---|
| Autor | Frederico Jacobi | `fredericojacobi` | Dono do produto e o único que faz o merge na `main`. Os agentes não interagem com ele: o que ele escreve por conta própria no GitHub vale, e o Kevin decide no lugar dele. |
| Product Manager | Kevin (agente) | `fsd-kevin[bot]` | Mantém issues, milestones, labels e o Project; decide produto, escopo e aceite e registra a decisão no issue; mantém a `SPEC.md`, o `TASKS.md` e este arquivo. Revisa os PRs quanto ao escopo e ao aceite e mescla os PRs de agentes prontos e parados. |
| Arquiteto | Mel (agente) | `fsd-mel[bot]` | Prepara cada issue para o desenvolvimento (comentário **Arquiteto: passagem**) e revisa o código dos PRs. Mantém o `docs/ARQUITETURA.md`. |
| Desenvolvedor | Stuart (agente) | `fsd-stuart[bot]` | Implementa o issue num branch, abre o PR e responde às revisões. |
| QA | Bob (agente) | `fsd-bob[bot]` | Verifica o PR rodando o app real contra o aceite do issue. Aprova ou pede mudanças, e abre issue de bug para o que estiver fora do escopo. Não corrige código. |

Cada agente é um GitHub App com conta própria. Os comentários, as revisões e os commits saem assinados por quem os fez, e por isso não começam com o nome do papel. Duas marcas continuam:
- o título **Arquiteto: passagem** na passagem;
- o prefixo `Decision (PM, <YYYY-MM-DD>): …` quando o Kevin registra uma decisão (`fsd-issue decide`).

Ninguém aprova o próprio PR.

## 1. Issue

Todo trabalho começa num issue: uma task, um bug, uma ideia, uma decisão pendente.

- **Corpo**: o que fazer, por quê, como verificar (aceite) e as referências à `SPEC.md`. Uma task fica completa no corpo do issue.
- **Comentários**: a discussão e as decisões. Uma decisão vira um comentário `Decision (PM, <data>): …`, por `fsd-issue decide`. Se ela muda o desenho, a `SPEC.md` é atualizada no mesmo PR que implementa a mudança, ou num PR de documentação.
- **Labels**:
  - `area:*` diz a parte do produto;
  - `size:S|M|L` dá a estimativa;
  - `decision` marca o que precisa de uma decisão do Kevin antes de virar task (#39 e #40 são reservadas pelo autor e ficam no Backlog, intocadas);
  - `bug` marca um defeito.
- **Milestone**: a fase, por exemplo [Fase 6 — tasks do nook/](https://github.com/fredericojacobi/fred-ships-donuts/milestone/1). O progresso da fase é o do milestone.

## 2. Project (quadro)

[FSD - Fred Ships Donuts](https://github.com/users/fredericojacobi/projects/3), campo **Status**:

*Ready* é a fila que o papel puxa; *-ing* é alguém trabalhando. Os comandos `fsd-*` movem o card.

| Coluna | Significa |
|---|---|
| Backlog | Fora da fase atual. |
| Ready for Architecture | Planejado, na fila do Arquiteto. |
| Architecting | O Arquiteto prepara a passagem, num comentário **Arquiteto: passagem** com o que fazer, os arquivos, os riscos e a verificação. |
| Ready for Development | Preparado, na fila do desenvolvedor. |
| Developing | Branch aberto, em implementação. |
| In Review | PR aberto. A revisão pede **2 aprovações** quaisquer entre os colegas (Arquiteto, QA, PM), em paralelo. Um pedido de mudança devolve o issue para Developing. |
| Ready to Merge | O PR tem 2 aprovações no último commit e nenhum pedido de mudança: espera o merge, feito pelo autor do PR com `fsd-merge <n>`. |
| Done | PR mesclado na `develop`; o issue foi fechado pelo `Closes #N` (a `develop` é a branch padrão). |

## 3. Branch

- Um branch por issue, num worktree próprio criado a partir da `develop` por `fsd-dev start <n>` (ou `fsd-dev start - <slug> --docs` para documentação). Ninguém troca de branch na pasta principal.
- Git só com os comandos simples: `checkout`, `branch`, `commit`, `pull`, `push` e `merge`. Sem rebase, squash, cherry-pick nem `reset --hard`.
- **Poucos commits:** 1 commit por PR e 1 por rodada de correção. Antes do push, os commits locais são juntados num só com `git reset --soft <base>` seguido de um commit; nada de `wip`, `fix typo` ou `checkpoint`. O `fsd-pr open` recusa o push com mais de 1 commit novo e mostra o comando para juntar.
- `fsd-dev sync` (traz a `develop` para o branch, por merge) só quando o PR está em conflito.
- Nome: `<tipo>/<número>-<slug>`, com o slug em minúsculas e hífens, por exemplo `feature/6-transaction-core`. Os tipos são:
  - `feature/`: funcionalidade;
  - `fix/`: correção;
  - `docs/`: só documentação;
  - `chore/`: manutenção, sem mudar comportamento.
- As branches antigas (`feat/nook-tasks`, `plan/nook-tasks`) não são renomeadas.
- Os commits citam o issue: `feat(F-40a): núcleo de transação (#6)`.
- Ninguém dá push direto na `develop` nem na `main`, e ninguém faz force-push.

## 4. Pull request

- Um PR por issue, com base na `develop` (`fsd-pr open`). O corpo traz `Closes #N`, como foi verificado e os desvios da `SPEC.md` (de preferência nenhum).
- O Arquiteto revisa no PR. A revisão separa **bloqueia** de **melhoria** e é publicada como revisão do PR.
- O QA verifica e publica uma revisão: aprova se tudo passou, ou pede mudanças com o passo a passo para reproduzir.
- O Stuart responde com um commit novo por rodada de correção, sem force-push.
- Com 2 aprovações, o autor do PR mescla na `develop` com `fsd-merge <n>` (merge comum). O merge fecha o issue, e o card vai para Done. PR de agente pronto e parado há 10 minutos, o Kevin mescla com `fsd-merge --ready`.
- Mudanças só de documentação (`SPEC.md`, `TASKS.md`, `CONTRIBUTING.md`, `docs/`) também entram por PR.

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

## 5. Verificação

Os testes automatizados foram removidos por decisão do autor (`SPEC.md` 11); voltam só os do `engine/`, com a F-40a (#13). Cada issue traz em "Como verificar (aceite)" a verificação manual. O PR relata o que foi rodado e o que saiu.

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
