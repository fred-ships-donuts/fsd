# fsd update and fsd update skill

- Stage: Flavor
- Owner: PM + Architect
- Size limit: 120 lines (body, without this header block)
- Source: docs/spec/product/craving.md#expected-result — the goal the CLI serves

## Behavior

### 5.2 `fsd update`

- Atualiza a **própria CLI**, sem abrir o assistente e sem exigir TTY.
- Funciona independentemente da opção `autoUpdate` (essa opção só vale para o `fsd init`, ver 7).
- Se a CLI não estiver instalada globalmente (execução via `npx`), informa que não há o que atualizar e sai com 0 (7).
- Se a opção `updateSkills` (7, 8.2) estiver ligada, depois de atualizar a CLI atualiza também as skills, como `fsd update skill`. Como o catálogo vive dentro do pacote, essa etapa roda na **versão nova** da CLI (novo processo `fsd update skill`), nunca no processo antigo.

### 5.3 `fsd update skill [nome]`

- Sem `nome`, atualiza todas as skills instaladas; com `nome`, só aquela.
- Lê o `installed.json` do escopo global e, se existir, o do projeto (`<cwd>/.fsd/`). Age no `path` e no idioma gravados; não varre `.fsd/skills/`.
- Uma skill registrada com versão menor que a do catálogo recebe `upgrade` (mesmas regras de 6.2). Em dia vira `skip (up to date)`. `missing` é reinstalada.
- Não instala skills novas (isso é o `Instalar` do assistente).
- **Conflito.** Se, no caminho do link (`.claude/skills/<nome>`) de uma skill registrada com link, existir algo que não é o link da nossa skill, a skill está em conflito. Como o comando não é interativo, **sem `--force` a original é mantida**: a skill não é tocada, sai `skill <nome>: <caminho> exists and is not managed by fsd (use --force to replace)` e o comando termina com **exit 1** depois de processar as demais skills.
- **`--force` / `-f`.** Resolve os conflitos escolhendo **substituir**: a original é trocada pela nossa e o link é criado (tudo ou nada, 6.2 regra 9). Vale para uma skill (`fsd update skill <nome> -f`) ou para todas as que estão em conflito (`fsd update skill -f`), sem pedir confirmação; cada original substituída aparece na saída (`install <nome> ... replaced the original`). **Só resolve conflito**: não reinstala skill em dia e não tem efeito onde não há conflito.
- Skill registrada com `linked: false` (4.3) não tem conflito aqui: o `update skill` atualiza só a pasta de `.fsd/skills` e nunca mexe no link. Para ligá-la, use `fsd link skill` (5.4).

## Inputs

None

## Outputs and messages

None

## Edge cases

None

## Acceptance

None — the criteria stay in SPEC §12 until #56.
