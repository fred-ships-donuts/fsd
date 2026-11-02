# HANDOFF — fsd (Fred Ships Donuts CLI)

Estado em 2026-11-01. Leia nesta ordem: este arquivo, `TASKS.md`, `SPEC.md`, `docs/FSD-INDEX.md`.

## Onde o projeto está

- Pasta: `/media/fredericojacobi/Projects/projetos/fred-ships-donuts/`. Branch `main`, remoto `origin` por **SSH** (`git@github.com:fredericojacobi/fred-ships-donuts.git`, chave `~/.ssh/id_ed25519`).
- Commits sem `Co-Authored-By` (regra do `~/.claude/CLAUDE.md`).
- **Todas as tasks F-1.1 a F-35 foram executadas** e estão marcadas em `TASKS.md` (a Fase 5, F-26 a F-35, veio de uma revisão da spec; ver `SPEC.md` 6.9). `npm test` passa (101 testes).
- O pacote ainda **não foi publicado** no npm.

## O que existe

- Docs em `docs/`, com índice em `FSD-INDEX.md`. A estrutura de diretórios do framework está em `FSD-DIRECTORY-STRUCTURE.md`: `nook/` (`kitchen/`, `bench/`, `cookbook/`, `bakers/`, `rack/`, `fridge/`) e `.fsd/` (`oven/`, `cache/`, `logs/`).
- CLI em `src/cli/`: `fsd.ts` (commander), `args.ts` (atalhos `-u`/`-s`), `commands/{init,update}.ts`, `fsdDir.ts`, `registry.ts`, `config.ts`, `selfUpdate.ts`, `skills.ts`, `actions/{install,uninstall}.ts` e o assistente em Ink (`ui/`).
- Catálogo em `src/skills/_i18n/` (`fsd-csharp-code-standard`, `fsd-ui-approval`). A cópia antiga foi apagada. A pasta `graft/` é ignorada pelo git e **não** é apagada.

## Decisões do autor

- Binário único `fsd`: `init`, `update`, `update skill [nome]`, `-h`, `-v`; atalhos `-u` (= `update`) e `-s` (= `skill`), misturáveis. Não usar o termo "alias".
- O menu não tem "Atualizar": `Instalar` já atualiza skills desatualizadas. Skill em dia vira `skip`; pasta fora do registro é conflito e o resumo pergunta se sobrescreve.
- `fsd init` cria a estrutura base **ao confirmar o fluxo Instalar**: `nook/kitchen`, `nook/bakers`, `.fsd/oven|cache|logs` (em `~` no global). `fsd update skill` nunca a cria.
- As skills são instaladas em `.fsd/skills/<nome>` (`~/.fsd/skills` e `./.fsd/skills`), e cada uma ganha um link simbólico em `.claude/skills/<nome>` (global e local) para o Claude Code enxergá-la. Falha ao criar o link desfaz a instalação da skill (tudo ou nada, o que foi deslocado volta). Skill de mesmo nome já existente (pasta em `.fsd/skills` fora do registro ou algo em `.claude/skills/<nome>`) é conflito: o resumo avisa e pergunta se substitui a original; o padrão é manter a original e pular a nossa.
- Sem escolha de símbolos (conjunto Unicode único). Voltar no assistente é com `←`. No passo Skills tudo começa marcado, e a seleção altera o total de passos (o idioma só entra se alguma skill escolhida tem mais de um idioma).
- `installed.json` (global e projeto) e `config.json` (só global) ficam em `.fsd/`.
- A ferramenta é agnóstica a serviços de agentes: sem campo `agent` e sem passo de serviço de IA.
- `Cookbook` = `nook/cookbook/` (contém as `Recipes`); `Ingredient` e `Adapter` saíram do vocabulário. `Display` virou `Rack` (`nook/rack/`).
- `Bench` e `Fridge` não guardam logs nem estado; o `status` fica no arquivo da tarefa.
- Nomes de docs usam `-`, nunca `_`.
- Depois do `enter` no resumo, a execução roda em fases (Verificar, Preparar, Aplicar, Registrar, Concluir), com diário em `.fsd/cache/run-<id>/`; falha ou `ctrl+c` desfaz a execução inteira, e processo morto é recuperado na execução seguinte (pelo pid). Ver SPEC 6.9.
- Conflito de skill de mesmo nome: passo próprio no assistente, com `keep` (padrão), `unlinked` (instala sem link, `linked: false`) e `replace`. `fsd link skill [nome] [-f]` liga depois; `fsd update skill [-f]` com original no caminho dá exit 1 sem `--force`.
- Atalhos como argumentos separados e nessa ordem: `-u -s -f`. Agrupados ou fora de ordem são erro.
- `fsd init` ao abrir não cria arquivo: o `lastUpdateCheck` fica em memória e é gravado com as preferências ao confirmar (ou na hora, só se o `config.json` já existir).

## Em aberto

Decisões do autor:
- **Layout provisório (SPEC 6.7):** logotipo (`🍩 F S D`), paletas dos 4 temas e largura mínima (40 colunas) são placeholders meus. Utilidade do tema também.
- **Skill `fsd-csharp-code-standard`:** o conteúdo mudou e o `metadata.version` **não foi subido**; sem isso o `Instalar` não faz `upgrade` de quem já a instalou (SPEC 3).
- Formato das tasks (`.md` ou `.yaml`) e do campo `status`; o que entra no `.gitignore` (`.fsd/cache`, `.fsd/logs`?); quem move uma task de `rack` para `fridge`; formato das recipes; destino do `Dough` no projeto do usuário.
- Comentários da árvore de diretórios nos docs ficaram desalinhados após a troca para `rack`.

Decisões minhas a confirmar (SPEC 13, "Revisar"): remoção do passo "Serviço de IA"; `update skill` cobre global e projeto; `updateSkills` desligado por padrão; sem `fsd init --no-update`; `fsd update` ignora o limite de 24 h.

## Não verificado

- Consulta e instalação reais no npm (pacote não publicado).
- Sessão completa do assistente em terminal real por uma pessoa; houve uma instalação completa em pseudo-terminal e os testes com `ink-testing-library`.
- Matar o processo em momentos além de "antes de mover a cópia" e "antes de criar o link" (os dois cobertos com SIGKILL real).
- O `spawn` real de `fsd update skill` pelo `fsd update` com `updateSkills` ligado (testado com dependências simuladas).

## Como rodar

```bash
cd /media/fredericojacobi/Projects/projetos/fred-ships-donuts
npm test                         # tsc + node --test dist (101 testes)
npm run dev -- --help            # src/cli/fsd.ts via tsx
node dist/cli/fsd.js init        # assistente (precisa de terminal)
```

Para testar sem sujar `~/.claude`, use `HOME=$(mktemp -d)`.
