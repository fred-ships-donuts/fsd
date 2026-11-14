# Decisions

Decisions that came from `SPEC.md` §13 "Decididos" (#56). Text is verbatim, in Portuguese. Entries already described in a Flavor link to it; the Flavor is the current behavior, this file keeps when and why it was decided. New decisions are added at the top of their date with `fsd-issue decide`.

## 2026-11-07

- **Tasks do `nook/` (2026-11-07)**: o agente executa o trabalho pelas skills, e a CLI só organiza os arquivos (o Oven continua conceitual nesta versão). Cada task é uma pasta com `plan.md` (spec e plano, `status` no frontmatter) e passos `NN-<slug>.yaml` com `status` próprio. O nome é o slug do título, único no `nook/`. Comandos da CLI movem as tasks entre bench → rack → fridge. O `.gitignore` do projeto recebe só `.fsd/cache/` e `.fsd/logs/`. A primeira fatia do framework `nook/` é esse ciclo (4.5, 5.5).
- **Tasks do `nook/`, detalhes (decididos pelo autor em 2026-11-07, depois das revisões do Arquiteto e do Node Typescript Developer)**: comandos `fsd task new|list|done|archive` e `fsd task step add|start|done|skip`; status dos passos `pending | in_progress | done | skipped`, e um passo que deixou de fazer sentido é fechado com `task step skip` (não há `remove`); `task done` exige os passos fechados, sem `--force`; tasks só no escopo de projeto; `task new` fora da raiz do projeto (sem `nook/` nem `.fsd/` no `cwd`) só dá erro, sem `--init`; sem volta `rack → bench` (sem `reopen`; um bug achado depois vira task nova); dependência `yaml` (eemeli/yaml); slug com mapa pequeno para `ß`, `æ`, `ø`, `ł`, `đ`, `œ`, `þ`; a skill `fsd-nook-tasks` pede confirmação antes do `done` e nunca arquiva; os passos não aparecem no assistente.

## Before 2026-11-07

- **Distribuição**: npm, pacote `fred-ships-donuts`, comando `fsd`; o catálogo vai dentro do pacote. Uso via `npx -p fred-ships-donuts fsd init`. Ver `docs/spec/packaging/flavor.md`.
- **Comandos**: binário único `fsd` com `init`, `update`, `update skill [nome]`, `-h`/`--help` e `-v`/`--version`, em `commander`. Atalhos: `-u` = `update`, `-u -s [nome]` = `update skill [nome]`. `fsd` sem argumentos mostra a ajuda. Instalar e apagar só no assistente. Ver `docs/spec/commands/flavor.md`.
- **Atualizações**: `fsd update` atualiza a CLI; `fsd update skill [nome]` atualiza as skills; `fsd init` atualiza a CLI se `autoUpdate` estiver ligado; `updateSkills` faz o `fsd update` atualizar também as skills. `Instalar` já atualiza skills desatualizadas. Ver `docs/spec/update/flavor.md`.
- **Catálogo**: único formato `_i18n/<nome>/<lang>/`; a CLI pergunta o idioma. Ver `docs/spec/catalog/flavor.md`.
- **Versão**: `metadata.version` no frontmatter, semver com pré-release. Ver `docs/spec/catalog/flavor.md`.
- **Arquivos instalados**: sem `evals/` nem `README.md`. Ver `docs/spec/catalog/flavor.md`.
- **Dados da CLI**: em `.fsd/` (global `~/.fsd`, projeto `./.fsd`), com `oven/`, `cache/` e `logs/`; a CLI é agnóstica a serviços de agentes (não há campo nem passo de agente); `fsd init` cria a estrutura base (4.2) ao confirmar o fluxo Instalar; `installed.json` é a fonte da verdade e a CLI não varre o diretório do Claude. Ver `docs/spec/state/flavor.md`.
- **Preferências**: `~/.fsd/config.json` com tema, `autoUpdate` e `updateSkills`. Ver `docs/spec/config/flavor.md`.
- **Troca do Clack pelo Ink**: o rascunho antigo usava `@clack/prompts`, que não oferece tela fixa com cabeçalho, rodapé e barra de progresso em todas as telas (apêndice A); por isso a interface foi reescrita em Ink. Ver `docs/spec/wizard-screen/rise.md`.
- **Destino das skills**: `.fsd/skills/<nome>` em ambos os escopos (`~/.fsd/skills` e `./.fsd/skills`); a CLI cria links simbólicos `.claude/skills/<nome>` para elas. Falha no link desfaz a instalação da skill; skill de mesmo nome é conflito, com escolha entre substituir e manter a original. Ver `docs/spec/state/flavor.md`.
- **Interface**: sem escolha de símbolos (conjunto único); voltar com `←`; no passo Skills tudo começa marcado, e a seleção altera o total de passos. Ver `docs/spec/wizard-screen/flavor.md`.
- **Catálogo**: a cópia antiga `fsd-padroes-codigo-csharp/` foi apagada; só vale `_i18n/`.
- **Interface**: Ink 8 com React >= 19.3, escrita em TSX (`jsx: react-jsx`), desenvolvida com `tsx`; fixa Node >= 22. Ver `docs/spec/wizard-screen/flavor.md`. Ver `docs/spec/stack/rise.md`.
- **Assistente**: menu (Instalar, Apagar, Sair); fluxo Instalar com escopo, skills, idioma (condicional), auto-update, tema e resumo; fluxo Apagar com escopo, skills e resumo; barra de progresso no rodapé. Ver `docs/spec/wizard/flavor.md`.

## Pending (not decisions)

The "Pendente" items of the old §13 are tracked outside this file:

- Review of the spec (conflict, `--force`, interruption, tests): all decided; the record is in the git history of the removed `TASKS.md`, section "Pontos para a revisão da spec".
- Layout of the header and wizard screens: see `docs/spec/wizard-header/flavor.md` and `docs/spec/wizard-screen/flavor.md`.
- Next `nook/` slices (Kitchen #20, Cookbook #21, Bakers #22; `task archive` as the only path from `rack` to `fridge` #23): issues #20–#23.
- `update skill` scopes, `updateSkills` default, `fsd update` and the 24 h limit: issue #17.
- Publishing v1: issue #12.
