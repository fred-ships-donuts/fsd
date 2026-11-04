# fsd-ui-approval

Agent Skill para Claude Code: **análise visual e comportamental da UI/UX** de uma tela já desenvolvida. Cruza o
protótipo (dados mock, quando houver) com a implementação do frontend rodando contra a **API real**, cenário a
cenário, registra cada divergência e aprova ou reprova a interface contra um checklist de 66 itens (20
bloqueantes), com status e prova por item. O veredito sai de um script, nunca do julgamento de um agent.

## Estrutura

```
fsd-ui-approval/
├── SKILL.md
├── README.md
├── agents/        # fsd-ui-inspector e fsd-ui-auditor (artefatos separados)
├── references/    # checklist, status e veredito, inspeção
├── scripts/       # consolidar.py
├── templates/     # itens.example.json
└── evals/
```

## Instalação

A skill e os dois agents (instalar a skill não instala os agents). Rode na raiz deste repositório. `TARGET` é a
pasta `.claude/` do seu projeto (ou `~/.claude` para todos os projetos):

```bash
TARGET=/caminho/do/seu/projeto/.claude              # ou: TARGET=~/.claude
mkdir -p "$TARGET/skills" "$TARGET/agents"
cp -r fsd-ui-approval "$TARGET/skills/"
cp fsd-ui-approval/agents/*.md "$TARGET/agents/"
```

## Requisitos

- A aplicação **e a API real em pé**. Nada é simulado nem mockado do lado da implementação.
- Um driver de browser: Playwright MCP (preferido) ou `playwright-cli`. Claude in Chrome só como último recurso.
- Python 3 (só biblioteca padrão) para `scripts/`.
- Opcional: um protótipo navegável e, também opcional, o documento de comportamento dele
  `docs/comportamento-prototipo/<tela>.md` (formato em `references/inspecao.md`). Sem o documento, o protótipo é
  observado direto.

A skill cita skills complementares que não fazem parte deste repositório (`pd-workflow`, `pd-qa-validation`,
`pd-workflow-qa`, `pd-frontend-audit-eval`).

## Uso

```
/fsd-ui-approval aprovar a UI da tela Navios em http://localhost:4200
/fsd-ui-approval comparar o protótipo com a implementação da tela Navios
```

Veja [`fsd-ui-approval/README.md`](fsd-ui-approval/README.md) para o fluxo, os vereditos e a estrutura.

## Licença

Nenhuma declarada (`UNLICENSED`): todos os direitos reservados até que uma licença seja adicionada.
