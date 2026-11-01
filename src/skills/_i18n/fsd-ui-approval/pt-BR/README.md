# fsd-ui-approval — Aprovação de UI/UX contra o checklist de interface

Aprova, ou reprova, a interface já desenvolvida de uma tela: confere a implementação rodando num browser real
contra o checklist de interface (12 grupos, 66 itens, 20 bloqueantes), com status e prova em cada item, e
entrega o veredito e as pendências. Uma skill, dois agents, quatro fases.

> **Versão:** 1.0.0-alpha.1 · **Licença:** UNLICENSED · **Autor:** Frederico Jacobi.
> A fonte de verdade de comportamento é o [`SKILL.md`](SKILL.md).

## O que caracteriza esta skill

| | |
|---|---|
| **Quem e quando** | o **Dev**, com a tela implementada e a Validation do `pd-workflow` aprovada, antes do handoff |
| **Entrada** | a URL de uma instância em pé, a tela, os perfis, o Work Item e o documento de comportamento do protótipo (`fsd-extracao-comportamento-prototipo`) |
| **Régua** | o [checklist de interface](references/checklist.md): os 66 itens, todos obrigatórios |
| **Prova** | OK é o que foi visto na tela; o que só o código mostra é OK (código), com o motivo; sem prova, Não verificado |
| **Veredito** | calculado por [`scripts/consolidar.py`](scripts/consolidar.py), nunca escrito por um agent |
| **Auditoria** | um segundo agent tenta derrubar os status favoráveis e só consegue piorá-los |
| **Orquestração** | a thread principal resolve o escopo, despacha, roda o script e fala com o humano |
| **Saída** | `docs/aprovacao-ui/<tela>/` no projeto frontend: `itens.json`, `auditoria.json`, `relatorio.md`, `evidencias/` |
| **Escreve só em** | `[UI_DIR]`. Não publica na plataforma, não altera código, não toca o protótipo, não versiona |

## Como usar

**Aprovar uma tela:**

```
/fsd-ui-approval aprovar a UI da tela Dados Base › Navios em http://localhost:4200, perfis Administradora e Operador
```

**Reinspecionar** depois de corrigir as falhas:

```
/fsd-ui-approval reinspecionar a tela Dados Base › Navios
```

Sem `[UI_DIR]` preenchido, a skill começa pela inspeção; com `itens.json` completo e sem auditoria, pela
auditoria; com `relatorio.md` com falhas, pela reinspeção.

## Fluxo

```
PREFLIGHT   tela · app · perfis · massa · fonte do esperado · driver
FASE 0      Contexto      thread              escopo · [UI_DIR] · o que já está em disco
FASE 1      Inspeção      fsd-ui-inspector     itens.json (66 status com prova) + evidencias/   → Gate 1
FASE 2      Auditoria     fsd-ui-auditor       auditoria.json (confirmado · rebaixado · insuficiente)
FASE 3      Consolidação  consolidar.py       relatorio.md · veredito                          → Gate 2
```

## Veredito

| Veredito | Quando |
|---|---|
| **REPROVADO** | qualquer item bloqueante com Falha |
| **NÃO CONCLUÍDO** | nenhum bloqueante com Falha, mas algum bloqueante Não verificado |
| **APROVADO COM PENDÊNCIAS** | nenhum bloqueante adverso; algum não bloqueante com Falha ou Não verificado |
| **APROVADO** | nenhum item com Falha ou Não verificado |

Detalhes, e o que cada status exige de evidência, em
[status-e-veredito.md](references/status-e-veredito.md).

## Instalação

```
fsd-ui-approval/                 → .claude/skills/fsd-ui-approval/
fsd-ui-approval/agents/*.md      → .claude/agents/        (os dois agents são artefatos separados da skill)
```

Requisitos: Playwright MCP (headless e isolado) ou `playwright-cli`; Python 3.

## Estrutura

```
fsd-ui-approval/
├── SKILL.md
├── README.md
├── agents/
│   ├── fsd-ui-inspector.md
│   └── fsd-ui-auditor.md
├── references/
│   ├── checklist.md              # os 66 itens: fonte dos IDs, dos bloqueantes e dos critérios
│   ├── status-e-veredito.md
│   └── inspecao.md
├── scripts/consolidar.py
├── templates/itens.example.json
└── evals/evals.json
```

## Escopo

Não extrai o comportamento do protótipo, não valida build nem testes, não faz QA por persona, não gera E2E,
não corrige código e não audita a qualidade técnica do código front. Cada um tem a sua skill
(`fsd-extracao-comportamento-prototipo`, `pd-workflow`, `pd-qa-validation`, `pd-workflow-qa`,
`pd-frontend-audit-eval`).
