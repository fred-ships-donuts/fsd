---
name: fsd-ui-approval
description: >
  **WORKFLOW SKILL** — Aprova, ou reprova, a UI/UX **já desenvolvida** de uma tela, componente ou fluxo,
  conferindo a implementação rodando num browser real contra o checklist de interface: 12 grupos, 66 itens,
  20 bloqueantes, todos obrigatórios, cada um com status e prova (OK, OK (código), N/A, Falha, Não
  verificado). A régua é o checklist e a fonte do esperado é o Work Item e o documento de comportamento do
  protótipo (`fsd-extracao-comportamento-prototipo`). Uma skill, dois agents, quatro fases: preflight e
  contexto na thread principal; `fsd-ui-inspector` inspeciona a tela e escreve os status com evidência;
  `fsd-ui-auditor` tenta derrubar os status favoráveis, e só consegue piorá-los; `scripts/consolidar.py`
  valida as evidências, calcula o veredito (aprovado, aprovado com pendências, não concluído, reprovado) e
  escreve o relatório. O veredito sai do script, nunca do julgamento de um agent. Não corrige código, não
  publica nada, não versiona por iniciativa própria.
  USE FOR: aprovar a UI/UX de uma tela entregue; fechar o desenvolvimento de tela com a conferência de
  interface; reinspecionar depois de corrigir as falhas; conferir a implementação contra o protótipo e o
  checklist de interface.
  DO NOT USE FOR: extrair o comportamento do protótipo (é `fsd-extracao-comportamento-prototipo`); validar
  build, lint e testes (é a Validation do `pd-workflow`); QA funcional por persona (é `pd-qa-validation`);
  automação E2E (é `pd-workflow-qa`); corrigir as falhas (é `pd-workflow`); auditar a qualidade técnica do
  código front (é `pd-frontend-audit-eval`); desenhar ou criticar o protótipo.
  Triggers: "aprovar a ui", "aprovar o ux", "aprovação de interface", "checklist de interface", "conferir a
  tela contra o checklist", "reinspecionar a tela", "ui approval", "approve ui", "review ui against
  checklist".
license: UNLICENSED
metadata:
  author: Frederico Jacobi Powered By Softdesign
  version: "1.0.0-alpha.1"
---

# fsd-ui-approval — Aprovação de UI/UX contra o checklist de interface

Uma skill, dois agents, quatro fases. A tela entra; saem os 66 itens com status e prova, o veredito e as
pendências com próximo passo.

**É do Dev, e fecha a tela.** Vem depois da implementação e da Validation do `pd-workflow`, antes do handoff.
A pergunta é: **a interface entregue cumpre o checklist, em todos os 66 itens, com prova?** Não é "o código
bate com a spec" (Validation) nem "uma persona consegue usar" (`pd-qa-validation`): é a conferência
sistemática de estados, formulários, feedback, navegação, tabelas, responsividade, consistência,
acessibilidade, movimento, microcopy e fluxo.

## Regras

1. **O checklist é a régua, e é inteiro.** Os 66 itens recebem status em toda aprovação
   ([checklist.md](references/checklist.md)). Item sem status invalida a consolidação. Não corte item por
   "não parecer relevante": a única saída é N/A com a justificativa da coluna "N/A só quando"

2. **Status sem prova não vale.** OK é o que foi **visto na tela**, com o caminho e os valores medidos. O
   que só o código mostra é OK (código), com o motivo. Sem evidência, é Não verificado, nunca um palpite
   ([status-e-veredito.md](references/status-e-veredito.md))

3. **O veredito sai do script.** `scripts/consolidar.py` calcula: bloqueante com Falha reprova; bloqueante
   Não verificado deixa a consolidação não concluída. Nem a thread principal nem um agent escreve ou suaviza
   o veredito, e nenhum reclassifica item bloqueante

4. **A auditoria só piora.** O `fsd-ui-auditor` pode rebaixar um status favorável; nada promove um status.
   Para um item melhorar, a implementação muda e o item é reinspecionado

5. **A thread principal orquestra.** Inspecionar e auditar no browser são dos subagents. Você resolve o
   escopo, despacha, confere o relatório, roda o script e fala com o humano. Abrir o browser "só para
   conferir" estoura o contexto e contamina a independência da auditoria

6. **A fonte está no disco, não no briefing.** O briefing passa **caminhos**, não conteúdo colado. Cada fase
   escreve em `[UI_DIR]` e a seguinte lê de lá

7. **Subagent que parou, ou relatório sem seção obrigatória, é bloqueio:** leve ao humano o que ele relatou
   e pare. Não redispare o mesmo briefing. Parou por insumo que só o humano tem, a resposta entra no
   briefing e você redispara **uma** vez

8. **Pergunte em bloco, e por último.** Antes: o Work Item, o `PROJECT.md` e o documento do protótipo já
   respondem? Só então pergunte, tudo numa mensagem

9. **Nada sai para fora.** A skill escreve só em `[UI_DIR]`. Não publica na plataforma, não altera código da
   aplicação, não toca o protótipo (`CLAUDE_DESIGN_READONLY`) e não versiona por iniciativa própria
   (`AI_GIT_POLICY`)

10. **Achado vazio é resultado legítimo.** Tela sem falha é uma boa tela. Nunca peça um número de falhas

## A pipeline

```
   ┌──────────────────────────────────────────────────────────────────┐
   │ PREFLIGHT · tela, app, perfis, massa, fonte do esperado, driver  │
   └────────────────────────────────┬─────────────────────────────────┘
                                    ▼
   FASE 0  CONTEXTO     thread principal  → escopo fechado · [UI_DIR] · o que já está em disco
   FASE 1  INSPEÇÃO     fsd-ui-inspector   → itens.json (66 status com prova) + evidencias/
           GATE 1       cobertura: 66/66 · Não verificado e N/A de item bloqueante levados ao humano
   FASE 2  AUDITORIA    fsd-ui-auditor     → auditoria.json (confirmado · rebaixado · insuficiente)
   FASE 3  CONSOLIDAÇÃO scripts/consolidar.py → relatorio.md · veredito
           ⛔ GATE 2    humano recebe o veredito e as pendências
```

**Um browser, uma sessão por vez.** Inspetor e auditor rodam **em sequência**, e o auditor só depois de o
`itens.json` existir completo. Uma tela, um `fsd-ui-inspector`; tela grande divide por grupos (`grupos`
`1-6` e depois `7-12`), cada metade num subagent, em sequência.

## Project Structure

```
[UI_DIR]/                            # docs/aprovacao-ui/<tela>/ no projeto frontend
├── itens.json                       # Fase 1 — meta + os 66 itens (pode vir em partes: itens-g1-6.json…)
├── auditoria.json                   # Fase 2
├── relatorio.md                     # Fase 3 — gerado pelo script
└── evidencias/<id>-<slug>.png       # Fase 1 e 2
```

A pasta `docs/aprovacao-ui/` fica no projeto frontend, ao lado de `docs/comportamento-prototipo/`. Crie
`[UI_DIR]` se não existir. O `relatorio.md` é um relatório de status: descreve o que foi observado naquela
inspeção. Esta skill e o checklist, que são documentação de referência, descrevem só o estado atual.

## Pré-requisitos — sondas no início da sessão

**1. Os dois agents.** `fsd-ui-inspector` e `fsd-ui-auditor`. Faltando algum, **bloqueie** e diga como
instalar: copiar `agents/*.md` desta skill para `.claude/agents/` do projeto (ou do usuário). Instalar a
skill não instala os agents. Sem eles, inspecionar na thread principal estoura o contexto e a auditoria
deixa de ser independente

**2. Um driver de browser** para a Fase 1 e a Fase 2 ([inspecao.md](references/inspecao.md#driver-de-browser)):
Playwright MCP (`browser_*`), `playwright-cli` como fallback. Nenhum dos dois: pare e diga como configurar

**3. Python 3** para `scripts/consolidar.py` (só biblioteca padrão)

## Preflight — antes de despachar qualquer fase

Levante, e pergunte **em bloco** só o que faltar:

| Insumo | O que é | Se faltar |
|---|---|---|
| **Tela** | tela, componente ou fluxo, e o caminho de navegação até ele | pergunte |
| **App** | URL de uma instância **já em pé**. A skill não a sobe | pergunte |
| **Perfis** | os perfis a inspecionar e **onde está** a credencial de cada um (variável de ambiente), nunca o valor | um perfil só se o sistema tem um; senão pergunte |
| **Massa** | os dados que podem ser gravados e apagados na inspeção, ou `nenhuma` | `nenhuma`: ações que gravam ou apagam são lidas pelo código |
| **Fonte do esperado** | Work Item (PRD, costura), `docs/comportamento-prototipo/<tela>.md`, link do protótipo | sem documento do protótipo e com protótipo no Work Item, peça a extração; o item 8.4 depende dela |
| **Escopo excluído** | o que o usuário tirou da aprovação (por exemplo, 404) | nenhum |
| **Banco** | a aplicação consulta banco? Se sim, `SQL_AUTORIZACAO_CODIGO` vale: confirme que a instância é a autorizada pelo usuário | pergunte antes de abrir a tela |

## Workflow

0. **Preflight** (acima).
1. **Fase 0 — Contexto** ([inspecao.md](references/inspecao.md)): feche o escopo; resolva `[UI_DIR]`; leia a
   listagem do que já existe nele. `itens.json` completo e sem `auditoria.json` ⇒ comece pela Fase 2;
   `relatorio.md` existente com falhas ⇒ modo [reinspecionar](#modo-reinspecionar). Nada em disco ⇒ Fase 1.
2. **Fase 1 — Inspeção**: despache o `fsd-ui-inspector` com o briefing abaixo. Ele inspeciona os 66 itens
   (ou os `grupos` pedidos), grava `itens.json` e as capturas, e valida o próprio arquivo com
   `consolidar.py --parcial`. **Gate 1:** confira no relatório a cobertura (66 de 66), e leve ao humano, em
   bloco, os itens bloqueantes N/A e Não verificado cuja causa o humano resolve (credencial, massa, ambiente).
   Ofereça rodar de novo só aqueles itens.
3. **Fase 2 — Auditoria**: despache o `fsd-ui-auditor` com o `itens.json` completo. Ele reabre os itens
   bloqueantes favoráveis e uma amostra dos demais e grava `auditoria.json`.
4. **Fase 3 — Consolidação**: rode o script (abaixo). Apresente o veredito e as pendências no **Gate 2**.

```bash
python <skill>/scripts/consolidar.py --itens <UI_DIR>/itens.json [<UI_DIR>/outros.json …] \
    --auditoria <UI_DIR>/auditoria.json --out <UI_DIR>/relatorio.md
```

Exit `0` ⇒ aprovado (com ou sem pendências). Exit `1` ⇒ reprovado ou não concluído. Exit `2` ⇒ entrada
inválida: o JSON de erro lista cada item. Devolva ao `fsd-ui-inspector` **uma** vez com a lista de erros; se
persistir, é bloqueio (Regra 7).

Ao fim de **cada** fase, anuncie:

```
✓ Fase X concluída — <nome>
  Artefatos: <caminhos em [UI_DIR]>
  <linha de contagem>
  Gate X: ABERTO | BLOQUEADO (<motivo>)
  → Próximo: Fase Y — <nome>  |  AGUARDANDO VOCÊ: <o que falta>
```

| Fase | Linha de contagem |
|---|---|
| 0 | `Tela: … · perfis X · fonte do esperado: PRD sim/não · protótipo doc sim/não · app: <URL> · em disco: <o que>` |
| 1 | `Itens X/66 · OK X · OK (código) X · N/A X · Falha X · Não verificado X · bloqueantes adversos X` |
| 2 | `Auditados X · confirmados X · rebaixados X · insuficientes X` |
| 3 | `Veredito: … · bloqueantes com Falha X · bloqueantes Não verificado X · pendências não bloqueantes X` |

## Subagentes

| Subagent | Quando | Recebe | Devolve |
|---|---|---|---|
| `fsd-ui-inspector` | Fase 1, um por tela (ou por metade de grupos), em sequência | `ui_dir`, `tela`, `app`, `driver`, `perfis` (perfil → onde está a credencial), `massa`, `fontes` (caminhos: Work Item, documento do protótipo), `excluido`, `grupos` (opcional), `itens` (opcional, só IDs, na reinspeção), `referências`, `template` | `itens.json` e capturas escritos + contagem por status, bloqueantes adversos, perguntas ao humano |
| `fsd-ui-auditor` | Fase 2, um só | `ui_dir`, `itens` (caminho do `itens.json` completo), `app`, `driver`, `perfis`, `massa`, `referências` | `auditoria.json` escrito + contagem por parecer e a lista dos rebaixados |

Os subagents leem as referências **da skill instalada**: o briefing passa os caminhos de
`references/checklist.md`, `references/status-e-veredito.md` e `references/inspecao.md`. Nenhum agent
escreve o veredito, roda `git` ou publica na plataforma.

### Briefing do `fsd-ui-inspector`

```
ui_dir: docs/aprovacao-ui/<tela>/
tela: <nome e caminho de navegação>
app: <URL>
driver: mcp | cli
perfis: <perfil → variável de ambiente>
massa: <dados de teste liberados | nenhuma>
fontes: <caminho do PRD/costura> · <docs/comportamento-prototipo/<tela>.md | ausente>
excluido: <o que o usuário tirou do escopo | nenhum>
grupos: 1-12
referências: <skill>/references/checklist.md · status-e-veredito.md · inspecao.md
template: <skill>/templates/itens.example.json
```

## Modo reinspecionar

Depois que o Dev corrigiu as falhas, ou quando o código mudou. Reinspecione **os itens que não estavam OK**
(Falha, Não verificado, OK (código)) **mais os itens que a mudança toca** (pergunte ao humano ou leia o
diff). Despache o `fsd-ui-inspector` com `itens: [IDs]`: ele grava um `itens-reinspecao-NN.json` só com esses.
A consolidação junta os arquivos, e o último vence por `id`:

```bash
python <skill>/scripts/consolidar.py --itens <UI_DIR>/itens.json <UI_DIR>/itens-reinspecao-01.json \
    --out <UI_DIR>/relatorio.md
```

Rode o auditor de novo sobre os itens reinspecionados que ficaram favoráveis. Mudança grande (tela
refeita) ⇒ inspeção completa, não reinspeção.

## Knowledge Verification Chain

Em ordem estrita: **1.** O Work Item (PRD, costura) · **2.** O documento de comportamento do protótipo ·
**3.** A tela real, com evidência · **4.** O checklist · **5.** _"Não tenho certeza de X — verifique"_.

Comportamento que o checklist exige e nenhuma fonte define é **Falha com `origem: prototipo`**, nunca
aprovação.

## Context Loading

| Fase | Carregar | Descarregar |
|---|---|---|
| Preflight | a listagem de `[UI_DIR]` | — |
| Fase 1 | o relatório do `fsd-ui-inspector` | o `itens.json` e as capturas |
| Fase 2 | o relatório do `fsd-ui-auditor` | o `auditoria.json` |
| Fase 3 | a saída JSON do script e as pendências | o `relatorio.md` cru |

**Você imprime, não lê:** o que um subagent escreveu em `[UI_DIR]` não volta ao seu contexto. O relatório
dele e a saída do script bastam para o gate.

## Commands

| Trigger (pt-br / en) | Referência |
|---|---|
| O checklist de interface / The checklist | [checklist.md](references/checklist.md) |
| Status, evidência e veredito / Status & verdict | [status-e-veredito.md](references/status-e-veredito.md) |
| Como inspecionar / How to inspect | [inspecao.md](references/inspecao.md) |
| Consolidar e calcular o veredito / Consolidate | [consolidar.py](scripts/consolidar.py) |
| Formato do `itens.json` / Items format | [itens.example.json](templates/itens.example.json) |

## Skill Integrations

- **`fsd-extracao-comportamento-prototipo`** — vem antes: produz `docs/comportamento-prototipo/<tela>.md`, a
  fonte do esperado dos itens 8.2 a 8.4 e 12.1. Esta skill não extrai, só confere
- **`pd-workflow`** — vem antes: dono do Work Item, da costura e da Validation. As pendências bloqueantes
  voltam ao Dev por ele, como fix tasks, e a reinspeção é desta skill
- **`pd-qa-validation`** — complementar: o QA real-user por persona, no local. Esta skill confere a interface
  contra o checklist; aquela confere se a pessoa consegue usar a feature
- **`pd-frontend-audit-eval`** — complementar: audita o código front em 14 dimensões. Esta skill audita a
  interface em execução

## Output Behavior

Conversacional, não robótico. Interagir em pt-br. A qualquer momento o humano precisa saber até onde a
aprovação foi e o que falta. Ao encerrar, diga: o veredito, as contagens, as pendências bloqueantes com o
próximo passo, onde está o `relatorio.md`, e que **nada foi commitado nem publicado**. Reprovado ou não
concluído: o próximo passo é corrigir (via `pd-workflow`) ou destravar o item, e depois reinspecionar.
