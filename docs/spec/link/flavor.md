# fsd link skill

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines (body, without this header block)
- Source: docs/spec/product/craving.md#expected-result — the goal the CLI serves

## Behavior

### 5.4 `fsd link skill [nome]`

- Cria o link `.claude/skills/<nome>` → `.fsd/skills/<nome>` das skills instaladas **sem link** (registradas com `linked: false`, ou com o link apagado à mão). Sem `nome`, trata todas as que estão nessa situação; com `nome`, só aquela. Lê o registro global e, se existir, o do projeto, como o `update skill`; não abre o assistente nem exige TTY.
- Se o caminho do link está livre, cria o link e grava `linked: true`. Se há uma original no lugar (conflito), **sem `--force`** nada é alterado, sai `skill <nome>: <caminho> exists and is not managed by fsd (use --force to replace)` e o exit é 1.
- Com `--force` / `-f`, a original é substituída pelo link, tudo ou nada (a original só some depois do sucesso, 6.2 regra 9), e o registro passa a `linked: true`.
- Skill já com link correto: `skip (already linked)`. `nome` não instalado: `skill <nome> is not installed`, exit 1.
- Não cria a estrutura base nem instala skills: só trabalha sobre o que o registro já tem.

## Inputs

None

## Outputs and messages

None

## Edge cases

None

## Acceptance

### A1 12.28 `fsd link skill [nome]` cria o link das skills sem link e grava `linked: true`; com original no lugar, só substitui com `--force`/`-f` (exit 1 sem ele).
