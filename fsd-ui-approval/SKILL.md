---
name: fsd-ui-approval
description: >
  Análise visual e comportamental da UI/UX de uma tela já desenvolvida. Cruza o protótipo (dados mock, quando
  houver) com a implementação do frontend rodando contra a API real, cenário a cenário, registra cada
  divergência e aprova ou reprova a interface contra um checklist de 66 itens (20 bloqueantes), com status e
  prova por item. O veredito sai de um script, nunca do julgamento de um agent. Use para aprovar a UI/UX de
  uma tela entregue, comparar protótipo vs implementação, fazer análise visual ou comportamental, ou
  reinspecionar após correções. Não serve para escrever um documento de comportamento do protótipo, build/lint/testes, QA funcional, automação E2E, corrigir código nem revisar
  qualidade de código. Triggers: "aprovar a ui", "aprovação de interface", "checklist de interface",
  "protótipo vs implementação", "análise visual da tela", "análise comportamental", "reinspecionar a tela".
compatibility: Requer o app e a API real em execução, Playwright MCP ou playwright-cli, e Python 3. Dois agents (agents/*.md) devem estar instalados em .claude/agents/.
license: UNLICENSED
metadata:
  author: Frederico Jacobi
  version: "1.0.0-alpha.2"
---

# fsd-ui-approval — Análise visual e comportamental: protótipo × implementação

Uma skill, dois agents, quatro fases. A tela entra; saem as divergências entre protótipo e implementação, os
66 itens do checklist com status e prova, o veredito e as pendências com próximo passo.

**A análise é visual e comportamental, e é um cruzamento.** Visual: o que a tela mostra (estrutura, layout,
espaçamento, tipografia, cor, ícones, textos). Comportamental: o que ela faz quando alguém interage (estados,
feedback, transições, teclado, navegação, perfis, erros). O protótipo, quando existe, e a implementação
passam pelos **mesmos cenários** e são postos lado a lado; cada diferença é uma divergência, classificada
como `defeito`, `intencional` (o PRD ou a costura determina) ou `lacuna-do-prototipo`. Sem protótipo não há
cruzamento: a implementação é analisada contra o Work Item e o checklist.

**É do Dev, e fecha a tela.** Vem depois da implementação e da Validation do `pd-workflow`, antes do handoff.
A pergunta é: **a interface entregue cumpre o checklist, em todos os 66 itens, com prova?** Não é "o código
bate com a spec" (Validation) nem "uma persona consegue usar" (`pd-qa-validation`): é a conferência
sistemática de estados, formulários, feedback, navegação, tabelas, responsividade, consistência,
acessibilidade, movimento, microcopy e fluxo, **e da fidelidade ao protótipo**.

## Regras

0. **A API é real, e é isso que faz a validação valer.** A aplicação é exercitada contra a **API real, em
   pé**. Nenhuma resposta é simulada, interceptada, abortada ou forjada, e nenhum servidor falso faz as vezes
   dela. Os estados são provocados pela aplicação real: filtros reais, entrada inválida real, sessões reais,
   dados reais na `massa`. Offline, limitação de rede, mídia, viewport e idioma são permitidos, porque não
   tocam no tráfego. Com a API fora do ar, a validação não começa. Estado que a API real não produz é OK
   (código) com o motivo, ou Não verificado, nunca um OK simulado

1. **Cruze, não compare de memória.** Com protótipo, os dois lados são observados **no mesmo cenário**, na
   mesma largura e no mesmo estado, e cada divergência é registrada com a evidência dos dois lados. A
   divergência é classificada como `defeito` (a implementação se afasta do protótipo sem motivo),
   `intencional` (o PRD ou a costura determina: anotada, não é Falha) ou `lacuna-do-prototipo` (o protótipo
   não define: cai no checklist). O protótipo roda com dados mock e a implementação com dados reais da API real: diferença no conteúdo dos dados (nomes, números, datas, quantidades) nunca é divergência; o que os dados moldam (estrutura, formato, estados, comportamento) é. Diferença visual conta tanto quanto a comportamental. Sem protótipo,
   registre `prototipo: nenhum`: nada é cruzado, e a matriz de cenários roda só na implementação

2. **O checklist é a régua, e é inteiro.** Os 66 itens recebem status em toda aprovação
   ([checklist.md](references/checklist.md)). Item sem status invalida a consolidação. Não corte item por
   "não parecer relevante": a única saída é N/A com a justificativa da coluna "N/A só quando"

3. **Status sem prova não vale.** OK é o que foi **visto na tela**, com o caminho e os valores medidos. O
   que só o código mostra é OK (código), com o motivo. Sem evidência, é Não verificado, nunca um palpite
   ([status-e-veredito.md](references/status-e-veredito.md))

4. **O veredito sai do script.** `scripts/consolidar.py` calcula: bloqueante com Falha reprova; bloqueante
   Não verificado deixa a consolidação não concluída. Nem a thread principal nem um agent escreve ou suaviza
   o veredito, e nenhum reclassifica item bloqueante

5. **A auditoria só piora.** O `fsd-ui-auditor` pode rebaixar um status favorável; nada promove um status.
   Para um item melhorar, a implementação muda e o item é reinspecionado

6. **A thread principal orquestra.** Inspecionar e auditar no browser são dos subagents. Você resolve o
   escopo, despacha, confere o relatório, roda o script e fala com o humano. Abrir o browser "só para
   conferir" estoura o contexto e contamina a independência da auditoria

7. **A fonte está no disco, não no briefing.** O briefing passa **caminhos**, não conteúdo colado. Cada fase
   escreve em `[UI_DIR]` e a seguinte lê de lá

8. **Subagent que parou, ou relatório sem seção obrigatória, é bloqueio:** leve ao humano o que ele relatou
   e pare. Não redispare o mesmo briefing. Parou por insumo que só o humano tem, a resposta entra no
   briefing e você redispara **uma** vez

9. **Pergunte em bloco, e por último.** Antes: o Work Item e o documento de comportamento do protótipo (quando houver) já
   respondem? Só então pergunte, tudo numa mensagem

10. **Nada sai para fora.** A skill escreve só em `[UI_DIR]`. Não publica na plataforma, não altera código da
   aplicação, não toca o protótipo e não versiona por iniciativa própria

11. **Achado vazio é resultado legítimo.** Tela sem falha é uma boa tela. Nunca peça um número de falhas

## A pipeline

```
   ┌─────────────────────────────────────────────────────────────────────────────────────┐
   │ PREFLIGHT · confirmação de dados · tela, app, API, protótipo, perfis, massa, driver │
   └────────────────────────────────┬────────────────────────────────────────────────────┘
                                    ▼
   FASE 0  CONTEXTO     thread principal  → escopo fechado · [UI_DIR] · o que já está em disco
   FASE 1  INSPEÇÃO     fsd-ui-inspector   → cruzamento.md (cenários · divergências) + itens.json (66 status
                                               com prova) + evidencias/ (protótipo × implementação)
           GATE 1       cobertura: 66/66 · cenários cruzados · Não verificado e N/A de item bloqueante
                        levados ao humano
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
├── cruzamento.md                    # Fase 1 — matriz de cenários e, com protótipo, o cruzamento e o registro de divergências
├── itens.json                       # Fase 1 — meta + os 66 itens (pode vir em partes: itens-g1-6.json…)
├── auditoria.json                   # Fase 2
├── relatorio.md                     # Fase 3 — gerado pelo script
└── evidencias/<id>-<slug>.png       # Fase 1 e 2; cruzamento: <cenário>-prototipo.png / <cenário>-implementacao.png
```

A pasta `docs/aprovacao-ui/` fica no projeto frontend, ao lado de `docs/comportamento-prototipo/` (quando existe). Crie
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

Levante, e pergunte **em bloco** só o que faltar. A **confirmação de dados** abaixo é obrigatória: é sempre
perguntada, nunca presumida, e nada começa sem um sim explícito.

| Insumo | O que é | Se faltar |
|---|---|---|
| **Confirmação de dados (obrigatória)** | o usuário confirma, explicitamente, que **(1)** a implementação é validada contra a **API real, em pé, com dados reais**, e que **(2)** o protótipo, se houver, roda com **dados mock**. Pergunte: _"A implementação será validada contra a API real com dados reais, e o protótipo roda com dados mock. Confirma?"_ | **sempre pergunte**, mesmo que todo o resto já se saiba. Sem um sim explícito, ou se a resposta contradiz algum dos dois pontos, não despache nada: nenhuma fase começa |
| **Tela** | tela, componente ou fluxo, e o caminho de navegação até ele | pergunte |
| **App** | URL de uma instância **já em pé**. A skill não a sobe | pergunte |
| **API** | URL da **API real** com a qual o app conversa, já em pé e alcançável. **Nada é simulado.** A skill não a sobe | pergunte; com a API fora do ar ou inalcançável, pare: nada pode ser validado |
| **Perfis** | os perfis a inspecionar e **onde está** a credencial de cada um (variável de ambiente), nunca o valor | um perfil só se o sistema tem um; senão pergunte |
| **Massa** | os dados que podem ser gravados e apagados na inspeção, ou `nenhuma` | `nenhuma`: ações que gravam ou apagam são lidas pelo código |
| **Protótipo** | link ou arquivo do protótipo navegável e o ponto de entrada até a tela. **Opcional**: sem ele, não há cruzamento | tem protótipo no Work Item: peça o link. Não existe: registre `prototipo: nenhum` e siga |
| **Fonte do esperado** | Work Item (PRD, costura) e, **opcional**, `docs/comportamento-prototipo/<tela>.md` ([formato](references/inspecao.md#o-documento-de-comportamento-do-protótipo)) | sem o documento, nada se pergunta: com protótipo, o cruzamento visual e comportamental segue observando o protótipo direto; sem protótipo, a fonte é o Work Item e o checklist |
| **Escopo excluído** | o que o usuário tirou da aprovação (por exemplo, 404) | nenhum |

## Workflow

0. **Preflight** (acima).
1. **Fase 0 — Contexto** ([inspecao.md](references/inspecao.md)): feche o escopo; resolva `[UI_DIR]`; leia a
   listagem do que já existe nele. `itens.json` completo e sem `auditoria.json` ⇒ comece pela Fase 2;
   `relatorio.md` existente com falhas ⇒ modo [reinspecionar](#modo-reinspecionar). Nada em disco ⇒ Fase 1.
2. **Fase 1 — Inspeção**: despache o `fsd-ui-inspector` com o briefing abaixo. Ele monta a matriz de
   cenários ([inspecao.md](references/inspecao.md#cruzar-protótipo--implementação)), cruza protótipo e
   implementação cenário a cenário, grava `cruzamento.md`, percorre os 66 itens (ou os `grupos` pedidos),
   grava `itens.json` e as capturas, e valida o próprio arquivo com `consolidar.py --parcial`. Toda
   divergência `defeito` vira Falha no item do checklist que ela quebra (8.4 e o específico). **Gate 1:**
   confira no relatório a cobertura (66 de 66 e os cenários cruzados), e leve ao humano, em
   bloco, os itens bloqueantes N/A e Não verificado cuja causa o humano resolve (credencial, massa, ambiente).
   Ofereça rodar de novo só aqueles itens.
3. **Fase 2 — Auditoria**: despache o `fsd-ui-auditor` com o `itens.json` completo. Ele reabre os itens
   bloqueantes favoráveis e uma amostra dos demais e grava `auditoria.json`.
4. **Fase 3 — Consolidação**: rode o script (abaixo). Apresente o veredito e as pendências no **Gate 2**.

```bash
python3 <skill>/scripts/consolidar.py --itens <UI_DIR>/itens.json [<UI_DIR>/outros.json …] \
    --auditoria <UI_DIR>/auditoria.json --out <UI_DIR>/relatorio.md
```

Exit `0` ⇒ aprovado (com ou sem pendências). Exit `1` ⇒ reprovado ou não concluído. Exit `2` ⇒ entrada
inválida: o JSON de erro lista cada item. Devolva ao `fsd-ui-inspector` **uma** vez com a lista de erros; se
persistir, é bloqueio (Regra 8).

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
| 0 | `Dados confirmados: sim · Tela: … · perfis X · fonte do esperado: PRD sim/não · protótipo doc sim/não · app: <URL> · em disco: <o que>` |
| 1 | `Cenários cruzados X/Y · divergências: defeito X · intencional X · lacuna-do-prototipo X · Itens X/66 · OK X · OK (código) X · N/A X · Falha X · Não verificado X · bloqueantes adversos X` |
| 2 | `Auditados X · confirmados X · rebaixados X · insuficientes X` |
| 3 | `Veredito: … · bloqueantes com Falha X · bloqueantes Não verificado X · pendências não bloqueantes X` |

## Subagentes

| Subagent | Quando | Recebe | Devolve |
|---|---|---|---|
| `fsd-ui-inspector` | Fase 1, um por tela (ou por metade de grupos), em sequência | `ui_dir`, `tela`, `app`, `driver`, `perfis` (perfil → onde está a credencial), `massa`, `api`, `fontes` (caminhos: Work Item, documento de comportamento do protótipo se houver), `prototipo` (link ou arquivo, ou `nenhum`), `excluido`, `grupos` (opcional), `itens` (opcional, só IDs, na reinspeção), `referências`, `template` | `cruzamento.md`, `itens.json` e capturas escritos + cenários cruzados, divergências por classe, contagem por status, bloqueantes adversos, perguntas ao humano |
| `fsd-ui-auditor` | Fase 2, um só | `ui_dir`, `itens` (caminho do `itens.json` completo), `app`, `api`, `prototipo`, `driver`, `perfis`, `massa`, `referências` | `auditoria.json` escrito + contagem por parecer e a lista dos rebaixados |

Os subagents leem as referências **da skill instalada**: o briefing passa os caminhos de
`references/checklist.md`, `references/status-e-veredito.md` e `references/inspecao.md`. Nenhum agent
escreve o veredito, roda `git` ou publica na plataforma.

### Briefing do `fsd-ui-inspector`

```
ui_dir: docs/aprovacao-ui/<tela>/
tela: <nome e caminho de navegação>
app: <URL>
api: <URL da API real>
driver: mcp | cli
perfis: <perfil → variável de ambiente>
massa: <dados de teste liberados | nenhuma>
fontes: <caminho do PRD/costura> · <docs/comportamento-prototipo/<tela>.md | ausente>
prototipo: <link ou arquivo do protótipo navegável + ponto de entrada | nenhum>
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
python3 <skill>/scripts/consolidar.py --itens <UI_DIR>/itens.json <UI_DIR>/itens-reinspecao-01.json \
    --out <UI_DIR>/relatorio.md
```

Rode o auditor de novo sobre os itens reinspecionados que ficaram favoráveis. Mudança grande (tela
refeita) ⇒ inspeção completa, não reinspeção.

## Knowledge Verification Chain

Em ordem estrita: **1.** O Work Item (PRD, costura) · **2.** O documento de comportamento do protótipo, quando houver ·
**3.** O protótipo observado, só para leitura, no mesmo cenário · **4.** A tela real, com evidência ·
**5.** O checklist · **6.** _"Não tenho certeza de X — verifique"_.

Comportamento que o checklist exige e nenhuma fonte define é **Falha com `origem: prototipo`**, nunca
aprovação. O PRD prevalece sobre o protótipo: divergência que ele determina é `intencional`.

## Context Loading

| Fase | Carregar | Descarregar |
|---|---|---|
| Preflight | a listagem de `[UI_DIR]` | — |
| Fase 1 | o relatório do `fsd-ui-inspector` | o `cruzamento.md`, o `itens.json` e as capturas |
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


- **`pd-workflow`** — vem antes: dono do Work Item, da costura e da Validation. As pendências bloqueantes
  voltam ao Dev por ele, como fix tasks, e a reinspeção é desta skill
- **`pd-qa-validation`** — complementar: o QA real-user por persona, no local. Esta skill confere a interface
  contra o checklist; aquela confere se a pessoa consegue usar a feature
- **`pd-workflow-qa`** — complementar: gera a automação E2E, que não é feita aqui
- **`pd-frontend-audit-eval`** — complementar: audita o código front em 14 dimensões. Esta skill audita a
  interface em execução

## Fora do escopo

- **Build, lint e testes**: não são validados aqui (é a Validation do `pd-workflow`); vêm antes desta skill.
  As pendências bloqueantes voltam ao Dev como fix tasks, e a reinspeção é desta skill.
- **QA funcional**: não coberto (é `pd-qa-validation`). Esta skill confere a interface contra o checklist; o
  QA funcional confere se a pessoa consegue usar a feature.
- **Automação E2E**: não é gerada aqui (é `pd-workflow-qa`).
- **Código front**: a qualidade técnica dele não é auditada aqui (é `pd-frontend-audit-eval`). Esta skill
  audita a interface em execução.
- **Crítica do protótipo**: o protótipo é a referência, não o objeto. Falha dele é `lacuna-do-prototipo`,
  julgada pelo checklist, não redesenhada aqui.

## Output Behavior

Conversacional, não robótico. Interagir em pt-br. A qualquer momento o humano precisa saber até onde a
aprovação foi e o que falta. Ao encerrar, diga: o veredito, as contagens, as pendências bloqueantes com o
próximo passo, onde está o `relatorio.md`, e que **nada foi commitado nem publicado**. Reprovado ou não
concluído: o próximo passo é corrigir (via `pd-workflow`) ou destravar o item, e depois reinspecionar. Com
protótipo, dê também as divergências por classe e as mais visíveis, e diga quais cenários não foram cruzados.
